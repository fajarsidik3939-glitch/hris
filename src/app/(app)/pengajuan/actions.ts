"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { initialSteps } from "@/lib/approval";
import { addDays, correctionTimes, wibDate } from "@/lib/attendance";
import { countLeaveDays } from "@/lib/leave";
import { correctionSchema, leaveSchema } from "@/lib/validators";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { requirePermission, requireUser } from "@/server/auth";
import { cancelApprovalRequest, notifyApprovers } from "@/server/approval";
import { leaveBalance, lockEmployee } from "@/server/leave";
import { loadShiftResolvers } from "@/server/schedule";
import { LEAVE_BUCKET, removeObject, uploadObject } from "@/server/storage";

export type CorrectionState = { message?: string; errors?: Record<string, string[] | undefined> } | undefined;

const MAX_BACK_DAYS = 31;

export async function submitCorrection(_: CorrectionState, formData: FormData): Promise<CorrectionState> {
  const { user } = await requirePermission("attendance.correction.request");
  if (!user.employee) return { message: "Akun Anda belum terhubung ke data karyawan." };
  const parsed = correctionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const { workDate, clockIn, clockOut, reason } = parsed.data;

  const today = wibDate(new Date());
  if (workDate > today) return { errors: { workDate: ["Tanggal tidak boleh di masa depan."] } };
  if (workDate < addDays(today, -MAX_BACK_DAYS)) return { errors: { workDate: [`Koreksi maksimal ${MAX_BACK_DAYS} hari ke belakang.`] } };
  const { inAt, outAt } = correctionTimes(workDate, clockIn, clockOut);
  const now = new Date();
  if (inAt && inAt > now) return { errors: { clockIn: ["Jam masuk tidak boleh di masa depan."] } };
  if (outAt && outAt > now) return { errors: { clockOut: ["Jam pulang tidak boleh di masa depan."] } };

  const employeeId = user.employee.id;
  const [emp, pending, record] = await Promise.all([
    db.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { managerId: true, fullName: true } }),
    db.attendanceCorrection.count({ where: { employeeId, workDate: new Date(workDate), status: "PENDING" } }),
    db.attendanceRecord.findUnique({ where: { employeeId_workDate: { employeeId, workDate: new Date(workDate) } }, select: { id: true, clockInAt: true, clockOutAt: true } }),
  ]);
  if (pending) return { errors: { workDate: ["Sudah ada koreksi yang menunggu persetujuan untuk tanggal ini."] } };
  // Bandingkan dengan jam yang sudah tercatat juga (mis. hanya jam masuk dikoreksi, jam pulang tetap).
  const effectiveIn = inAt ?? record?.clockInAt ?? null;
  const effectiveOut = outAt ?? record?.clockOutAt ?? null;
  if (effectiveIn && effectiveOut && effectiveOut <= effectiveIn) {
    return { errors: { [outAt ? "clockOut" : "clockIn"]: ["Jam pulang harus setelah jam masuk (termasuk jam yang sudah tercatat)."] } };
  }

  const { currentStep, steps } = initialSteps(employeeId, emp.managerId);
  await db.$transaction(async (tx) => {
    const req = await tx.approvalRequest.create({ data: { kind: "CORRECTION", requesterEmployeeId: employeeId, currentStep, steps: { create: steps } } });
    await tx.attendanceCorrection.create({
      data: { employeeId, workDate: new Date(workDate), attendanceRecordId: record?.id ?? null, requestedClockIn: inAt, requestedClockOut: outAt, reason, approvalRequestId: req.id },
    });
    await writeAudit({ actorUserId: user.id, action: "correction.submit", entityType: "approval_request", entityId: req.id, after: { workDate, clockIn, clockOut }, reason }, tx);
    await notifyApprovers(tx, req.id, "Koreksi absensi menunggu persetujuan", `${emp.fullName} — ${workDate}`);
  });
  revalidatePath("/pengajuan");
  redirect("/pengajuan");
}

/** Pemohon membatalkan pengajuan (koreksi/cuti). */
export async function cancelRequest(requestId: string): Promise<string | null> {
  const user = await requireUser();
  if (!z.uuid().safeParse(requestId).success) return "Data tidak valid.";
  const error = await cancelApprovalRequest(user, requestId, wibDate(new Date()));
  revalidatePath("/pengajuan");
  return error;
}

export type LeaveState = { message?: string; errors?: Record<string, string[] | undefined> } | undefined;

const ATTACHMENT_MAX = 2 * 1024 * 1024;
const MAX_RANGE_DAYS = 31;

/** Jenis berkas dari isi (bukan dari nama/klaim browser): JPEG, PNG, atau PDF. */
function sniff(b: Uint8Array): { type: string; ext: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: "image/jpeg", ext: "jpg" };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { type: "image/png", ext: "png" };
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return { type: "application/pdf", ext: "pdf" };
  return null;
}

export async function submitLeave(_: LeaveState, formData: FormData): Promise<LeaveState> {
  const { user } = await requirePermission("leave.request");
  if (!user.employee) return { message: "Akun Anda belum terhubung ke data karyawan." };
  const parsed = leaveSchema.safeParse({
    leaveTypeId: formData.get("leaveTypeId"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    halfDay: formData.get("halfDay") ?? undefined,
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const { leaveTypeId, startDate, endDate, halfDay, reason } = parsed.data;
  const employeeId = user.employee.id;
  const today = wibDate(new Date());

  if (endDate < startDate) return { errors: { endDate: ["Tanggal selesai tidak boleh sebelum tanggal mulai."] } };
  if (addDays(startDate, MAX_RANGE_DAYS - 1) < endDate) return { errors: { endDate: [`Maksimal ${MAX_RANGE_DAYS} hari kalender per pengajuan.`] } };
  if (startDate < addDays(today, -MAX_BACK_DAYS)) return { errors: { startDate: [`Maksimal ${MAX_BACK_DAYS} hari ke belakang.`] } };

  const [type, emp] = await Promise.all([
    db.leaveType.findFirst({ where: { id: leaveTypeId, isActive: true } }),
    db.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { id: true, branchId: true, workDays: true, defaultShift: true, managerId: true, fullName: true, hireDate: true } }),
  ]);
  if (!type) return { errors: { leaveTypeId: ["Jenis cuti tidak ditemukan."] } };
  if (halfDay && (!type.allowHalfDay || startDate !== endDate)) return { errors: { halfDay: ["Setengah hari hanya untuk satu tanggal dan jenis yang mengizinkan."] } };

  const shiftOn = (await loadShiftResolvers([emp], startDate, endDate)).get(employeeId)!;
  const days = countLeaveDays(startDate, endDate, halfDay, (d) => Boolean(shiftOn(d)));
  if (days === 0) return { errors: { endDate: ["Tidak ada hari kerja di rentang ini (libur/off)."] } };
  if (type.maxDaysPerRequest && days > type.maxDaysPerRequest) return { errors: { endDate: [`${type.name} maksimal ${type.maxDaysPerRequest} hari per pengajuan.`] } };

  const clash = await db.leaveRequest.findFirst({
    where: { employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: new Date(endDate) }, endDate: { gte: new Date(startDate) } },
    select: { id: true },
  });
  if (clash) return { errors: { startDate: ["Tanggal ini bertumpuk dengan pengajuan cuti/izin Anda yang lain."] } };

  const file = formData.get("attachment");
  let attachment: { bytes: Uint8Array<ArrayBuffer>; kind: { type: string; ext: string } } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > ATTACHMENT_MAX) return { errors: { attachment: ["Lampiran maksimal 2 MB."] } };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniff(bytes);
    if (!kind) return { errors: { attachment: ["Lampiran harus foto (JPG/PNG) atau PDF."] } };
    attachment = { bytes, kind };
  }
  if (type.requiresAttachment && !attachment) return { errors: { attachment: [`${type.name} wajib melampirkan surat/bukti.`] } };

  const attachmentPath = attachment ? `${employeeId}/${randomUUID()}.${attachment.kind.ext}` : null;
  if (attachment) {
    try {
      await uploadObject(LEAVE_BUCKET, attachmentPath!, attachment.bytes, attachment.kind.type);
    } catch {
      return { message: "Lampiran gagal diunggah. Periksa internet lalu coba lagi." };
    }
  }

  const { currentStep, steps } = initialSteps(employeeId, emp.managerId);
  try {
    const error = await db.$transaction(async (tx) => {
      if (type.deductsBalance) {
        await lockEmployee(tx, employeeId);
        const b = await leaveBalance(employeeId, type.id, emp.hireDate, tx);
        if (!b.period) return "Anda belum berhak cuti tahunan (belum genap 12 bulan bekerja).";
        if (b.available < days) return `Saldo tidak cukup: tersedia ${b.available} hari, diminta ${days} hari.`;
      }
      const req = await tx.approvalRequest.create({ data: { kind: "LEAVE", requesterEmployeeId: employeeId, currentStep, steps: { create: steps } } });
      await tx.leaveRequest.create({
        data: { employeeId, leaveTypeId: type.id, startDate: new Date(startDate), endDate: new Date(endDate), halfDay, days, reason, attachmentPath, approvalRequestId: req.id },
      });
      await writeAudit({ actorUserId: user.id, action: "leave.submit", entityType: "approval_request", entityId: req.id, after: { type: type.code, startDate, endDate, days, halfDay } }, tx);
      await notifyApprovers(tx, req.id, `${type.name} menunggu persetujuan`, `${emp.fullName} — ${startDate}${endDate !== startDate ? ` s/d ${endDate}` : ""} (${days} hari)`);
      return null;
    });
    if (error) {
      if (attachmentPath) await removeObject(LEAVE_BUCKET, attachmentPath);
      return { errors: { leaveTypeId: [error] } };
    }
  } catch (e) {
    if (attachmentPath) await removeObject(LEAVE_BUCKET, attachmentPath);
    throw e;
  }
  revalidatePath("/pengajuan");
  redirect("/pengajuan");
}
