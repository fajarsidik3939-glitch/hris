import "server-only";
import { db } from "./db";
import { numberSetting } from "./settings";

/** Status absensi karyawan saat ini: record dalam batas durasi shift (sama dengan aturan API clock). */
export async function currentAttendance(employeeId: string) {
  const maxShiftHours = await numberSetting("attendance.max_shift_hours", 20);
  const [employee, recent] = await Promise.all([
    db.employee.findUnique({
      where: { id: employeeId },
      select: { attendanceMethod: true, workType: true, defaultShift: { select: { name: true, startMinute: true, endMinute: true } }, branch: { select: { name: true } } },
    }),
    db.attendanceRecord.findFirst({
      where: { employeeId, clockInAt: { gte: new Date(Date.now() - maxShiftHours * 3600_000) } },
      orderBy: { clockInAt: "desc" },
      select: { workDate: true, clockInAt: true, clockOutAt: true, clockInLabel: true, clockOutLabel: true, lateMinutes: true, workMinutes: true },
    }),
  ]);
  return { employee, recent, nextAction: recent ? ("OUT" as const) : ("IN" as const) };
}
