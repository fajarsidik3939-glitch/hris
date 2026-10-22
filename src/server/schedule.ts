import "server-only";
import type { Shift } from "@/generated/prisma/client";
import { shiftResolver } from "@/lib/attendance";
import { db } from "./db";

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Penentu shift per tanggal untuk sekumpulan karyawan dalam rentang [from, to] (tanggal WIB "YYYY-MM-DD").
 * Tiga query untuk semua karyawan sekaligus (bukan per karyawan).
 */
export async function loadShiftResolvers(
  employees: { id: string; branchId: string; workDays: number[]; defaultShift: Shift | null }[],
  from: string,
  to: string,
) {
  const ids = employees.map((e) => e.id);
  const [overrides, holidays] = await Promise.all([
    db.employeeSchedule.findMany({ where: { employeeId: { in: ids }, workDate: { gte: new Date(from), lte: new Date(to) } }, include: { shift: true } }),
    db.holiday.findMany({ where: { date: { gte: new Date(from), lte: new Date(to) } }, select: { date: true, branchId: true } }),
  ]);
  const byEmployee = new Map<string, Map<string, Shift | null>>();
  for (const o of overrides) {
    if (!byEmployee.has(o.employeeId)) byEmployee.set(o.employeeId, new Map());
    byEmployee.get(o.employeeId)!.set(iso(o.workDate), o.shift);
  }
  return new Map(
    employees.map((e) => [
      e.id,
      shiftResolver({
        defaultShift: e.defaultShift,
        workDays: e.workDays,
        holidays: new Set(holidays.filter((h) => !h.branchId || h.branchId === e.branchId).map((h) => iso(h.date))),
        overrides: byEmployee.get(e.id) ?? new Map(),
      }),
    ]),
  );
}
