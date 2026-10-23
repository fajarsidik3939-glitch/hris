import "server-only";
import type { AttendanceRecord, Shift } from "@/generated/prisma/client";
import { addDays, dayStatus, scheduleFor, type DayStatus } from "@/lib/attendance";
import { db } from "./db";
import { loadShiftResolvers } from "./schedule";

const iso = (d: Date) => d.toISOString().slice(0, 10);

type RecapEmployee = { id: string; branchId: string; workDays: number[]; defaultShift: Shift | null; hireDate: Date };
export type LeaveOnDay = { halfDay: boolean; name: string };
export type AttendanceDay<E> = {
  e: E;
  date: string;
  status: DayStatus;
  record: (AttendanceRecord & { shift: { code: string } | null }) | null;
  leave: LeaveOnDay | null;
  shiftCode: string | null;
};

/** Cuti/izin disetujui per karyawan × tanggal dalam rentang. */
async function approvedLeaves(employeeIds: string[], from: string, to: string) {
  const leaves = await db.leaveRequest.findMany({
    where: { employeeId: { in: employeeIds }, status: "APPROVED", startDate: { lte: new Date(to) }, endDate: { gte: new Date(from) } },
    select: { employeeId: true, startDate: true, endDate: true, halfDay: true, leaveType: { select: { name: true } } },
  });
  const map = new Map<string, LeaveOnDay>();
  for (const l of leaves) for (let d = iso(l.startDate); d <= iso(l.endDate); d = addDays(d, 1)) map.set(`${l.employeeId}:${d}`, { halfDay: l.halfDay, name: l.leaveType.name });
  return map;
}

/**
 * Status kehadiran per karyawan × tanggal (§5.6) — satu sumber untuk halaman Kehadiran, ekspor, dan dashboard.
 * Tanggal sebelum tanggal masuk karyawan dilewati. Empat query untuk seluruh rentang.
 */
export async function attendanceDays<E extends RecapEmployee>(employees: E[], from: string, to: string, now = new Date()): Promise<AttendanceDay<E>[]> {
  const ids = employees.map((e) => e.id);
  const [resolvers, records, leaves] = await Promise.all([
    loadShiftResolvers(employees, from, to),
    db.attendanceRecord.findMany({ where: { employeeId: { in: ids }, workDate: { gte: new Date(from), lte: new Date(to) } }, include: { shift: { select: { code: true } } } }),
    approvedLeaves(ids, from, to),
  ]);
  const rec = new Map(records.map((r) => [`${r.employeeId}:${iso(r.workDate)}`, r]));
  const out: AttendanceDay<E>[] = [];
  for (const e of employees) {
    for (let d = from < iso(e.hireDate) ? iso(e.hireDate) : from; d <= to; d = addDays(d, 1)) {
      const record = rec.get(`${e.id}:${d}`) ?? null;
      const shift = resolvers.get(e.id)!(d);
      const schedule = record?.scheduledStart && record.scheduledEnd ? { start: record.scheduledStart, end: record.scheduledEnd } : shift ? scheduleFor(d, shift) : null;
      const leave = leaves.get(`${e.id}:${d}`) ?? null;
      out.push({ e, date: d, status: dayStatus(now, d, schedule, record, leave), record, leave, shiftCode: record?.shift?.code ?? shift?.code ?? null });
    }
  }
  return out;
}

/** Jumlah per status + total menit untuk sekumpulan hari (rekap bulanan / ekspor payroll). */
export function summarize(days: AttendanceDay<unknown>[]) {
  const count: Record<DayStatus, number> = { HADIR: 0, TERLAMBAT: 0, BELUM_CLOCK_OUT: 0, TIDAK_HADIR: 0, BELUM_ABSEN: 0, LIBUR: 0, CUTI: 0 };
  let workMinutes = 0;
  let lateMinutes = 0;
  let earlyLeaveMinutes = 0;
  for (const d of days) {
    count[d.status]++;
    workMinutes += d.record?.workMinutes ?? 0;
    lateMinutes += d.record?.lateMinutes ?? 0;
    earlyLeaveMinutes += d.record?.earlyLeaveMinutes ?? 0;
  }
  return { count, scheduled: days.length - count.LIBUR, workMinutes, lateMinutes, earlyLeaveMinutes };
}

/** Bulan "YYYY-MM" → rentang tanggal sampai hari ini (bulan berjalan tidak dihitung ke depan). */
export function monthRange(month: string, today: string) {
  const first = `${month}-01`;
  const lastOfMonth = addDays(addDays(first, 32).slice(0, 8) + "01", -1);
  return { first, last: lastOfMonth < today ? lastOfMonth : today, started: first <= today };
}
