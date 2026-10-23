import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { canDecide } from "@/lib/approval";
import { computeRecord, scheduleFor } from "@/lib/attendance";
import type { CurrentUser } from "./auth";
import { writeAudit } from "./audit";
import { db } from "./db";
import { leaveBalance, lockEmployee } from "./leave";
import { loadShiftResolvers } from "./schedule";

type Tx = Prisma.TransactionClient;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** ID akun aktif yang punya permission tertentu (mis. semua HR untuk tahap HR). */
export async function userIdsWithPermission(code: string, tx: Tx | typeof db = db) {
  const users = await tx.user.findMany({
    where: { isActive: true, roles: { some: { role: { permissions: { some: { permission: { code } } } } } } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

/** Notifikasi in-app; `dedupeKey` + userId unik → kejadian yang sama tidak membuat notifikasi dobel. */
export async function notify(tx: Tx, userIds: (string | null | undefined)[], n: { type: string; title: string; body?: string; link: string; key: string }) {
  const ids = [...new Set(userIds.filter((x): x is string => Boolean(x)))];
  if (!ids.length) return;
  await tx.notification.createMany({
    data: ids.map((userId) => ({ userId, type: n.type, title: n.title, body: n.body, link: n.link, dedupeKey: `${n.key}:${userId}` })),
    skipDuplicates: true,
  });
}

/** Beri tahu penyetuju langkah aktif: atasan (tahap 1) atau semua HR (tahap 2), kecuali pemohon sendiri. */
export async function notifyApprovers(tx: Tx, requestId: string, title: string, body: string) {
  const req = await tx.approvalRequest.findUniqueOrThrow({
    where: { id: requestId },
    include: { steps: { include: { approver: { select: { userId: true } } } }, requester: { select: { userId: true } } },
  });
  const step = req.steps.find((s) => s.stepNo === req.currentStep)!;
  const targets = step.approverType === "MANAGER" ? [step.approver?.userId] : await userIdsWithPermission("approval.hr", tx);
  await notify(tx, targets.filter((id) => id !== req.requester.userId), { type: "approval.pending", title, body, link: "/approval", key: `approval:${req.id}:step${req.currentStep}` });
}

/** Terapkan koreksi yang sudah disetujui final: event CORRECTION + hitung ulang record. Data asli tidak diubah. */
async function applyCorrection(tx: Tx, correctionId: string, actorUserId: string) {
  const c = await tx.attendanceCorrection.findUniqueOrThrow({ where: { id: correctionId } });
  const workDate = iso(c.workDate);
  let record = await tx.attendanceRecord.findUnique({ where: { employeeId_workDate: { employeeId: c.employeeId, workDate: c.workDate } } });
  const before = record ? { clockInAt: record.clockInAt, clockOutAt: record.clockOutAt, lateMinutes: record.lateMinutes, workMinutes: record.workMinutes } : null;

  if (!record) {
    const emp = await tx.employee.findUniqueOrThrow({ where: { id: c.employeeId }, select: { id: true, branchId: true, workDays: true, defaultShift: true } });
    const shift = (await loadShiftResolvers([emp], workDate, workDate)).get(emp.id)!(workDate);
    const s = shift ? scheduleFor(workDate, shift) : null;
    record = await tx.attendanceRecord.create({
      data: { employeeId: c.employeeId, workDate: c.workDate, shiftId: shift?.id ?? null, scheduledStart: s?.start ?? null, scheduledEnd: s?.end ?? null },
    });
  }
  const tolerance = record.shiftId ? (await tx.shift.findUnique({ where: { id: record.shiftId }, select: { lateToleranceMin: true } }))?.lateToleranceMin ?? 0 : 0;
  const clockInAt = c.requestedClockIn ?? record.clockInAt;
  const clockOutAt = c.requestedClockOut ?? record.clockOutAt;
  const schedule = record.scheduledStart && record.scheduledEnd ? { start: record.scheduledStart, end: record.scheduledEnd } : null;

  for (const [type, at] of [["IN", c.requestedClockIn], ["OUT", c.requestedClockOut]] as const) {
    if (at) await tx.attendanceEvent.create({ data: { attendanceRecordId: record.id, employeeId: c.employeeId, type, source: "CORRECTION", occurredAt: at } });
  }
  const after = { clockInAt, clockOutAt, ...computeRecord(clockInAt, clockOutAt, schedule, tolerance) };
  await tx.attendanceRecord.update({ where: { id: record.id }, data: { ...after, hasCorrection: true } });
  await tx.attendanceCorrection.update({ where: { id: c.id }, data: { attendanceRecordId: record.id } });
  await writeAudit(
    { actorUserId, action: "attendance.correction_apply", entityType: "attendance_record", entityId: record.id, before: before ? JSON.parse(JSON.stringify(before)) : undefined, after: JSON.parse(JSON.stringify(after)), reason: c.reason },
    tx,
  );
}

/** Setujui/tolak langkah aktif. Baris pengajuan dikunci agar dua penyetuju tidak memproses bersamaan. */
export async function decideRequest(user: CurrentUser, requestId: string, approve: boolean, comment: string | null): Promise<string | null> {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM approval_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
    const req = await tx.approvalRequest.findUnique({
      where: { id: requestId },
      include: {
        steps: true,
        correction: true,
        leave: { include: { leaveType: true } },
        requester: { select: { userId: true, fullName: true, hireDate: true } },
      },
    });
    if (!req) return "Pengajuan tidak ditemukan.";
    const step = req.steps.find((s) => s.stepNo === req.currentStep);
    if (!step || !canDecide({ userId: user.id, employeeId: user.employee?.id ?? null, permissions: user.permissions }, req, step)) {
      return "Pengajuan ini sudah diputuskan atau bukan giliran Anda.";
    }
    if (!approve && !comment) return "Alasan penolakan wajib diisi.";

    const now = new Date();
    const final = !approve || step.stepNo === 2;
    const leave = req.leave;
    // Cuti berpotongan saldo: cek ulang saldo (baris karyawan dikunci) sebelum disetujui final.
    if (approve && final && leave?.leaveType.deductsBalance) {
      await lockEmployee(tx, req.requesterEmployeeId);
      const b = await leaveBalance(req.requesterEmployeeId, leave.leaveTypeId, req.requester.hireDate, tx, leave.id);
      if (!b.period || b.available < Number(leave.days)) return `Saldo ${leave.leaveType.name} tidak cukup (tersedia ${b.available} hari, diminta ${Number(leave.days)}).`;
      await tx.leaveTransaction.create({
        data: { employeeId: req.requesterEmployeeId, leaveTypeId: leave.leaveTypeId, periodYear: b.period.year, days: -Number(leave.days), kind: "USE", leaveRequestId: leave.id, createdBy: user.id },
      });
    }
    await tx.approvalStep.update({ where: { id: step.id }, data: { decision: approve ? "APPROVED" : "REJECTED", decidedBy: user.id, comment, decidedAt: now } });
    const status = !approve ? "REJECTED" : "APPROVED";
    if (final) {
      await tx.approvalRequest.update({ where: { id: req.id }, data: { status, decidedAt: now } });
      if (req.correction) await tx.attendanceCorrection.update({ where: { id: req.correction.id }, data: { status } });
      if (leave) await tx.leaveRequest.update({ where: { id: leave.id }, data: { status } });
      if (approve && req.correction) await applyCorrection(tx, req.correction.id, user.id);
      await notify(tx, [req.requester.userId], {
        type: `approval.${status.toLowerCase()}`,
        title: approve ? "Pengajuan disetujui" : "Pengajuan ditolak",
        body: approve ? (leave ? `${leave.leaveType.name} ${leave.days} hari disetujui.` : "Koreksi absensi Anda sudah diterapkan.") : `Alasan: ${comment}`,
        link: "/pengajuan",
        key: `approval:${req.id}:final`,
      });
    } else {
      await tx.approvalRequest.update({ where: { id: req.id }, data: { currentStep: 2 } });
      await notifyApprovers(tx, req.id, `${leave ? leave.leaveType.name : "Koreksi absensi"} menunggu persetujuan HR`, `${req.requester.fullName} — disetujui atasan`);
    }
    await writeAudit(
      { actorUserId: user.id, action: `approval.${approve ? "approve" : "reject"}`, entityType: "approval_request", entityId: req.id, after: { step: step.stepNo, final, status: final ? status : "PENDING" }, reason: comment },
      tx,
    );
    return null;
  });
}

/**
 * Pemohon membatalkan pengajuan: yang menunggu kapan saja; cuti yang sudah disetujui hanya sebelum tanggal mulai
 * (saldo dikembalikan lewat transaksi REVERSAL).
 */
export async function cancelApprovalRequest(user: CurrentUser, requestId: string, today: string): Promise<string | null> {
  if (!user.employee) return "Akun tidak terhubung ke data karyawan.";
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM approval_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
    const req = await tx.approvalRequest.findUnique({ where: { id: requestId }, include: { correction: true, leave: { include: { transactions: true } } } });
    if (!req || req.requesterEmployeeId !== user.employee!.id) return "Pengajuan tidak ditemukan.";
    const approvedLeave = req.status === "APPROVED" && req.leave;
    if (req.status !== "PENDING" && !approvedLeave) return "Pengajuan ini tidak bisa dibatalkan.";
    if (approvedLeave && iso(req.leave!.startDate) <= today) return "Cuti yang sudah dimulai tidak bisa dibatalkan. Hubungi HR.";

    await tx.approvalRequest.update({ where: { id: req.id }, data: { status: "CANCELLED", decidedAt: new Date() } });
    if (req.correction) await tx.attendanceCorrection.update({ where: { id: req.correction.id }, data: { status: "CANCELLED" } });
    if (req.leave) {
      await tx.leaveRequest.update({ where: { id: req.leave.id }, data: { status: "CANCELLED" } });
      const use = req.leave.transactions.find((t) => t.kind === "USE");
      if (use) {
        await tx.leaveTransaction.create({
          data: { employeeId: use.employeeId, leaveTypeId: use.leaveTypeId, periodYear: use.periodYear, days: -Number(use.days), kind: "REVERSAL", leaveRequestId: req.leave.id, createdBy: user.id, note: "Dibatalkan pemohon" },
        });
      }
    }
    await writeAudit({ actorUserId: user.id, action: "approval.cancel", entityType: "approval_request", entityId: req.id, after: { wasApproved: Boolean(approvedLeave) } }, tx);
    return null;
  });
}
