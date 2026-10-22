import "server-only";
import { addDays, decideAction, resolveWorkDate, wibDate } from "@/lib/attendance";
import { db } from "./db";
import { loadShiftResolvers } from "./schedule";
import { numberSetting } from "./settings";

/**
 * Konteks absensi karyawan pada `now`: dipakai API clock dan halaman (Beranda/Absen),
 * agar label tombol selalu sama dengan keputusan server.
 */
export async function attendanceContext(employeeId: string, now = new Date()) {
  const today = wibDate(now);
  const maxShiftHours = await numberSetting("attendance.max_shift_hours", 20);
  const [employee, recent] = await Promise.all([
    db.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: {
        status: true,
        workType: true,
        attendanceMethod: true,
        branchId: true,
        workDays: true,
        defaultShift: true,
        branch: { select: { name: true } },
      },
    }),
    db.attendanceRecord.findFirst({
      where: { employeeId, clockInAt: { gte: new Date(now.getTime() - maxShiftHours * 3600_000) } },
      orderBy: { clockInAt: "desc" },
    }),
  ]);
  const shiftOn = (await loadShiftResolvers([{ id: employeeId, ...employee }], addDays(today, -1), today)).get(employeeId)!;
  const resolved = resolveWorkDate(now, shiftOn);
  const action = decideAction(
    now,
    recent?.clockInAt ? { workDate: recent.workDate.toISOString().slice(0, 10), clockInAt: recent.clockInAt, clockOutAt: recent.clockOutAt } : null,
    resolved.workDate,
  );
  // Absensi yang ditampilkan: yang sedang berjalan/hari ini; record lama yang sudah selesai tidak ditampilkan lagi.
  const current = action === "IN" ? null : recent;
  return { employee, recent, current, resolved, action, todayShift: shiftOn(today), nextAction: action === "IN" ? ("IN" as const) : ("OUT" as const) };
}
