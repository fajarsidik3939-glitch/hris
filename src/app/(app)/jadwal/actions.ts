"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { addDays } from "@/lib/attendance";
import { scheduleAssignSchema } from "@/lib/validators";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";

export type ScheduleState = { ok?: boolean; message?: string } | undefined;

const MAX_DAYS = 62;

/** Tetapkan shift / libur / kembali ke default untuk banyak karyawan × rentang tanggal sekaligus. */
export async function assignSchedule(_: ScheduleState, formData: FormData): Promise<ScheduleState> {
  const { user } = await requirePermission("schedule.manage");
  const parsed = scheduleAssignSchema.safeParse({
    employeeIds: formData.getAll("employeeIds"),
    from: formData.get("from"),
    to: formData.get("to"),
    shiftId: formData.get("shiftId") ?? "",
  });
  if (!parsed.success) return { message: Object.values(z.flattenError(parsed.error).fieldErrors).flat()[0] ?? "Data tidak valid." };
  const { employeeIds, from, to, shiftId } = parsed.data;
  if (to < from) return { message: "Tanggal selesai tidak boleh sebelum tanggal mulai." };

  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  if (dates.length > MAX_DAYS) return { message: `Rentang maksimal ${MAX_DAYS} hari.` };

  const active = await db.employee.count({ where: { id: { in: employeeIds }, status: "ACTIVE" } });
  if (active !== employeeIds.length) return { message: "Ada karyawan nonaktif atau tidak dikenal di pilihan." };
  if (shiftId && shiftId !== "OFF" && !(await db.shift.findFirst({ where: { id: shiftId, isActive: true } }))) {
    return { message: "Shift tidak ditemukan atau nonaktif." };
  }

  // Satu jadwal per karyawan per tanggal (unik di DB): hapus lalu tulis ulang dalam satu transaksi.
  await db.$transaction(async (tx) => {
    await tx.employeeSchedule.deleteMany({ where: { employeeId: { in: employeeIds }, workDate: { gte: new Date(from), lte: new Date(to) } } });
    if (shiftId) {
      await tx.employeeSchedule.createMany({
        data: employeeIds.flatMap((employeeId) => dates.map((d) => ({ employeeId, workDate: new Date(d), shiftId: shiftId === "OFF" ? null : shiftId }))),
      });
    }
    await writeAudit(
      { actorUserId: user.id, action: "schedule.assign", entityType: "employee_schedule", after: { employeeIds, from, to, shift: shiftId || "DEFAULT" } },
      tx,
    );
  });
  revalidatePath("/jadwal");
  const what = shiftId === "OFF" ? "libur" : shiftId ? "shift baru" : "shift default";
  return { ok: true, message: `Jadwal ${employeeIds.length} karyawan × ${dates.length} hari diubah ke ${what}.` };
}
