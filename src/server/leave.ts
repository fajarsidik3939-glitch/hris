import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { wibDate } from "@/lib/attendance";
import { currentLeavePeriod } from "@/lib/leave";
import { db } from "./db";
import { numberSetting } from "./settings";

type Tx = Prisma.TransactionClient | typeof db;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Kunci baris karyawan sampai transaksi selesai: hitung & potong saldo tidak bisa balapan. */
export const lockEmployee = (tx: Prisma.TransactionClient, employeeId: string) => tx.$queryRaw`SELECT id FROM employees WHERE id = ${employeeId}::uuid FOR UPDATE`;

/**
 * Saldo jenis cuti berpotongan saldo pada periode hak saat ini.
 * tersedia = saldo buku besar − hari pengajuan yang masih menunggu (agar tidak bisa mengajukan melebihi saldo).
 */
export async function leaveBalance(employeeId: string, leaveTypeId: string, hireDate: Date, tx: Tx = db, excludeRequestId?: string) {
  const period = currentLeavePeriod(iso(hireDate), wibDate(new Date()));
  if (!period) return { period: null, balance: 0, pending: 0, available: 0 };
  const [sum, pending] = await Promise.all([
    tx.leaveTransaction.aggregate({ where: { employeeId, leaveTypeId, periodYear: period.year }, _sum: { days: true } }),
    tx.leaveRequest.aggregate({
      where: { employeeId, leaveTypeId, status: "PENDING", ...(excludeRequestId ? { NOT: { id: excludeRequestId } } : {}) },
      _sum: { days: true },
    }),
  ]);
  const balance = Number(sum._sum.days ?? 0);
  const pend = Number(pending._sum.days ?? 0);
  return { period, balance, pending: pend, available: balance - pend };
}

/** Saldo semua jenis cuti berpotongan saldo untuk satu karyawan (Beranda, profil, form). */
export async function leaveSummary(employeeId: string) {
  const [emp, types] = await Promise.all([
    db.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { hireDate: true } }),
    db.leaveType.findMany({ where: { deductsBalance: true, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return Promise.all(types.map(async (t) => ({ type: t, ...(await leaveBalance(employeeId, t.id, emp.hireDate)) })));
}

/**
 * Berikan hak cuti tahunan periode berjalan ke semua karyawan aktif yang sudah genap 12 bulan.
 * Aman diulang: hak per karyawan × jenis × periode unik di DB (dilewati bila sudah ada).
 */
export async function grantAnnualLeave(actorUserId: string) {
  const [days, types, employees] = await Promise.all([
    numberSetting("leave.annual_days", 12),
    db.leaveType.findMany({ where: { deductsBalance: true, isActive: true }, select: { id: true } }),
    db.employee.findMany({ where: { status: "ACTIVE" }, select: { id: true, hireDate: true } }),
  ]);
  const today = wibDate(new Date());
  const data = employees.flatMap((e) => {
    const period = currentLeavePeriod(iso(e.hireDate), today);
    return period ? types.map((t) => ({ employeeId: e.id, leaveTypeId: t.id, periodYear: period.year, days, kind: "GRANT" as const, createdBy: actorUserId, note: `Hak tahunan periode ${period.start} s/d ${period.end}` })) : [];
  });
  const created = data.length ? await db.leaveTransaction.createMany({ data, skipDuplicates: true }) : { count: 0 };
  return { granted: created.count, eligible: data.length };
}
