"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { initialSteps } from "@/lib/approval";
import { addDays, correctionTimes, wibDate } from "@/lib/attendance";
import { correctionSchema } from "@/lib/validators";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";
import { notifyApprovers } from "@/server/approval";

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

/** Pemohon membatalkan pengajuan yang masih menunggu. */
export async function cancelRequest(requestId: string) {
  const { user } = await requirePermission("attendance.correction.request");
  if (!z.uuid().safeParse(requestId).success || !user.employee) return;
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM approval_requests WHERE id = ${requestId}::uuid FOR UPDATE`;
    const req = await tx.approvalRequest.findUnique({ where: { id: requestId }, include: { correction: true } });
    if (!req || req.requesterEmployeeId !== user.employee!.id || req.status !== "PENDING") return;
    await tx.approvalRequest.update({ where: { id: req.id }, data: { status: "CANCELLED", decidedAt: new Date() } });
    if (req.correction) await tx.attendanceCorrection.update({ where: { id: req.correction.id }, data: { status: "CANCELLED" } });
    await writeAudit({ actorUserId: user.id, action: "approval.cancel", entityType: "approval_request", entityId: req.id }, tx);
  });
  revalidatePath("/pengajuan");
}
