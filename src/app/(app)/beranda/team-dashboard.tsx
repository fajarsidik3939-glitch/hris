import Link from "next/link";
import { wibDate } from "@/lib/attendance";
import { employeeScopeWhere } from "@/lib/scope";
import type { CurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { attendanceDays } from "@/server/recap";
import type { Scope } from "@/lib/permissions";

/** Ringkasan hari ini untuk HR (semua) atau atasan (tim/departemen); angka dari sumber rekap yang sama dengan Kehadiran. */
export async function TeamDashboard({ user, scope }: { user: CurrentUser; scope: Scope }) {
  const today = wibDate(new Date());
  const scoped = employeeScopeWhere(user, scope);
  const me = user.employee?.id;
  const monthStart = new Date(`${today.slice(0, 7)}-01`);

  const employees = await db.employee.findMany({
    where: { AND: [scoped, { status: "ACTIVE" }] },
    select: { id: true, branchId: true, workDays: true, defaultShift: true, hireDate: true, branch: { select: { name: true } } },
  });
  const [days, pendingHr, pendingManager, joined, left] = await Promise.all([
    attendanceDays(employees, today, today),
    user.permissions.has("approval.hr") ? db.approvalRequest.count({ where: { status: "PENDING", currentStep: 2, ...(me ? { NOT: { requesterEmployeeId: me } } : {}) } }) : 0,
    user.permissions.has("approval.manager") && me
      ? db.approvalRequest.count({ where: { status: "PENDING", currentStep: 1, steps: { some: { stepNo: 1, approverEmployeeId: me, decision: "PENDING" } } } })
      : 0,
    scope === "ALL" ? db.employee.count({ where: { hireDate: { gte: monthStart } } }) : null,
    scope === "ALL" ? db.employee.count({ where: { status: "INACTIVE", endDate: { gte: monthStart } } }) : null,
  ]);

  const n = (pred: (s: string) => boolean) => days.filter((d) => pred(d.status)).length;
  const present = n((s) => s === "HADIR" || s === "TERLAMBAT" || s === "BELUM_CLOCK_OUT");
  const stats = [
    ["Karyawan aktif", employees.length, "text-slate-900"],
    ["Hadir hari ini", present, "text-green-700"],
    ["Terlambat", n((s) => s === "TERLAMBAT"), "text-amber-700"],
    ["Belum absen", n((s) => s === "BELUM_ABSEN"), "text-slate-700"],
    ["Tidak hadir", n((s) => s === "TIDAK_HADIR"), "text-red-700"],
    ["Cuti/izin", n((s) => s === "CUTI"), "text-sky-700"],
  ] as const;

  // Per cabang: hadir dibanding yang dijadwalkan kerja (tanpa libur/cuti).
  const byBranch = new Map<string, { name: string; present: number; expected: number }>();
  for (const d of days) {
    if (d.status === "LIBUR" || d.status === "CUTI") continue;
    const b = byBranch.get(d.e.branchId) ?? { name: d.e.branch.name, present: 0, expected: 0 };
    b.expected++;
    if (d.status === "HADIR" || d.status === "TERLAMBAT" || d.status === "BELUM_CLOCK_OUT") b.present++;
    byBranch.set(d.e.branchId, b);
  }
  const pending = pendingHr + pendingManager;
  // Sama dengan filter "Luar radius" di halaman Kehadiran (per absensi, tanggal kerja hari ini).
  const outside = days.filter((d) => d.record?.clockInLabel === "OUT_OF_RADIUS" || d.record?.clockOutLabel === "OUT_OF_RADIUS").length;

  return (
    <section className="space-y-3" aria-label="Ringkasan kehadiran">
      <h2 className="font-semibold">{scope === "ALL" ? "Ringkasan perusahaan hari ini" : "Ringkasan tim hari ini"}</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([label, value, cls]) => (
          <Link key={label} href="/kehadiran" className="rounded-lg border bg-white p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${cls}`}>{value}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[1.6fr_1fr]">
        <div className="space-y-2 rounded-lg border bg-white p-4 text-sm">
          <b>Kehadiran per cabang</b>
          {byBranch.size === 0 && <p className="text-muted-foreground">Tidak ada jadwal kerja hari ini.</p>}
          {[...byBranch.values()].map((b) => (
            <div key={b.name} className="flex items-center gap-2">
              <span className="w-24 shrink-0 truncate">{b.name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${b.present} dari ${b.expected} hadir`}>
                <div className="h-full bg-primary" style={{ width: `${b.expected ? (b.present / b.expected) * 100 : 0}%` }} />
              </div>
              <span className="w-14 text-right">
                {b.present}/{b.expected}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-2 rounded-lg border bg-white p-4 text-sm">
          <b>Perlu tindakan</b>
          <Link href="/approval" className="flex justify-between">
            <span>Approval menunggu Anda</span>
            <span className={pending ? "font-bold text-amber-700" : ""}>{pending}</span>
          </Link>
          <Link href="/kehadiran?label=OUT_OF_RADIUS" className="flex justify-between">
            <span>Absen luar radius hari ini</span>
            <span className={outside ? "font-bold text-amber-700" : ""}>{outside}</span>
          </Link>
          {joined !== null && (
            <p className="flex justify-between text-muted-foreground">
              <span>Karyawan masuk / keluar bulan ini</span>
              <span>
                {joined} / {left}
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
