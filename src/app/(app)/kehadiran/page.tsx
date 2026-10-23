import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { LocationBadge } from "@/components/location-badge";
import { Button } from "@/components/ui/button";
import { DAY_STATUS, wibDate, type DayStatus } from "@/lib/attendance";
import { employeeScopeWhere } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { attendanceDays, monthRange, summarize } from "@/server/recap";
import { PhotoButton } from "./photo-button";

export const metadata = { title: "Kehadiran — HRIS" };

const PAGE_SIZE = 20;
const time = (d: Date | null) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : "--:--");
const STATUS_STYLE: Record<DayStatus, string> = {
  HADIR: "bg-green-100 text-green-800",
  TERLAMBAT: "bg-amber-100 text-amber-800",
  BELUM_CLOCK_OUT: "bg-red-100 text-red-800",
  TIDAK_HADIR: "bg-red-100 text-red-800",
  BELUM_ABSEN: "bg-slate-100 text-slate-700",
  LIBUR: "bg-slate-100 text-slate-500",
  CUTI: "bg-sky-100 text-sky-800",
};

export default async function KehadiranPage({ searchParams }: PageProps<"/kehadiran">) {
  const { user, scope } = await requirePermission("attendance.read");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const today = wibDate(new Date());
  const view = str("view") === "bulanan" ? "bulanan" : "harian";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(str("tanggal")) && str("tanggal") <= today ? str("tanggal") : today;
  const month = /^\d{4}-\d{2}$/.test(str("bulan")) ? str("bulan") : today.slice(0, 7);
  const branch = str("cabang");
  const dept = str("dept");

  const where: Prisma.EmployeeWhereInput = {
    AND: [employeeScopeWhere(user, scope), { status: "ACTIVE" }, branch ? { branchId: branch } : {}, dept ? { departmentId: dept } : {}],
  };
  const [employees, branches, departments] = await Promise.all([
    db.employee.findMany({
      where,
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true, branchId: true, workDays: true, defaultShift: true, hireDate: true, branch: { select: { name: true } } },
    }),
    db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const filters = (
    <form className="flex flex-wrap gap-2" role="search">
      <input type="hidden" name="view" value={view} />
      {view === "harian" ? (
        <input type="date" name="tanggal" defaultValue={date} max={today} aria-label="Tanggal" className="h-10 rounded-md border bg-white px-2 text-sm" />
      ) : (
        <input type="month" name="bulan" defaultValue={month} aria-label="Bulan" className="h-10 rounded-md border bg-white px-2 text-sm" />
      )}
      <select name="cabang" defaultValue={branch} aria-label="Cabang" className="h-10 rounded-md border bg-white px-2 text-sm">
        <option value="">Semua cabang</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <select name="dept" defaultValue={dept} aria-label="Departemen" className="h-10 rounded-md border bg-white px-2 text-sm">
        <option value="">Semua departemen</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>
      {view === "harian" && (
        <>
          <select name="status" defaultValue={str("status")} aria-label="Status" className="h-10 rounded-md border bg-white px-2 text-sm">
            <option value="">Semua status</option>
            {Object.entries(DAY_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="label" defaultValue={str("label")} aria-label="Label lokasi" className="h-10 rounded-md border bg-white px-2 text-sm">
            <option value="">Semua lokasi</option>
            <option value="OUT_OF_RADIUS">Luar radius</option>
            <option value="LOW_ACCURACY">Akurasi rendah</option>
            <option value="IN_RADIUS">Dalam radius</option>
            <option value="FIELD">Lapangan</option>
          </select>
        </>
      )}
      <Button type="submit" variant="outline" className="h-10">
        Terapkan
      </Button>
    </form>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Kehadiran</h1>
        <nav className="flex gap-1 rounded-md border bg-white p-1 text-sm" aria-label="Tampilan">
          {(["harian", "bulanan"] as const).map((v) => (
            <Link key={v} href={`/kehadiran?view=${v}`} aria-current={view === v ? "page" : undefined} className={cn("rounded px-3 py-1.5", view === v && "bg-primary text-primary-foreground")}>
              {v === "harian" ? "Harian" : "Rekap bulanan"}
            </Link>
          ))}
        </nav>
      </div>
      {filters}
      {view === "harian" ? (
        <Daily user={user} employees={employees} date={date} statusFilter={str("status")} labelFilter={str("label")} page={Math.max(1, Number(str("hal")) || 1)} sp={sp} />
      ) : (
        <Monthly employees={employees} month={month} today={today} />
      )}
    </div>
  );
}

type Emp = Awaited<ReturnType<typeof db.employee.findMany<{ select: { id: true; fullName: true; employeeCode: true; branchId: true; workDays: true; defaultShift: true; hireDate: true; branch: { select: { name: true } } } }>>>;

async function Daily({ user, employees, date, statusFilter, labelFilter, page, sp }: { user: { permissions: Map<string, unknown> }; employees: Emp; date: string; statusFilter: string; labelFilter: string; page: number; sp: Record<string, string | string[] | undefined> }) {
  const days = await attendanceDays(employees, date, date);
  const events = await db.attendanceEvent.findMany({
    where: { attendanceRecordId: { in: days.flatMap((d) => (d.record ? [d.record.id] : [])) }, source: "SELFIE" },
    orderBy: { occurredAt: "asc" },
    include: { workLocation: { select: { name: true } } },
  });
  const canPhoto = user.permissions.has("attendance.photo.read");

  const rows = days
    .map((d) => ({ e: d.e, r: d.record, leave: d.leave, shiftCode: d.shiftCode, status: d.status }))
    .filter((x) => (!statusFilter || x.status === statusFilter) && (!labelFilter || x.r?.clockInLabel === labelFilter || x.r?.clockOutLabel === labelFilter));

  const counts = Object.fromEntries(Object.keys(DAY_STATUS).map((k) => [k, rows.filter((x) => x.status === k).length]));
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pageHref = (p: number) => `/kehadiran?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => typeof v === "string")) as Record<string, string>), hal: String(p) })}`;

  const eventCell = (r: (typeof days)[number]["record"], type: "IN" | "OUT") => {
    if (!r) return <span className="text-muted-foreground">--:--</span>;
    const ev = events.findLast((x) => x.attendanceRecordId === r.id && x.type === type);
    const at = type === "IN" ? r.clockInAt : r.clockOutAt;
    return (
      <div className="space-y-0.5">
        <div>{time(at)}</div>
        {ev && <LocationBadge label={ev.locationLabel} distanceM={ev.distanceM} />}
        {ev?.photoPath && canPhoto && (
          <PhotoButton
            eventId={ev.id}
            caption={`${type === "IN" ? "Masuk" : "Pulang"} ${time(ev.occurredAt)} · ${ev.distanceM != null ? `${ev.distanceM.toLocaleString("id-ID")} m dari ${ev.workLocation?.name ?? "lokasi kerja"}` : "tanpa lokasi"} · akurasi ±${ev.accuracyM ?? "?"} m`}
            lat={ev.latitude ? Number(ev.latitude) : null}
            lng={ev.longitude ? Number(ev.longitude) : null}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 text-sm">
        {Object.entries(DAY_STATUS).map(([k, v]) => (
          <span key={k} className={cn("rounded-full px-3 py-1 font-semibold", STATUS_STYLE[k as DayStatus])}>
            {v}: {counts[k]}
          </span>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Tidak ada data untuk filter ini.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Karyawan</th>
                <th className="p-2">Cabang</th>
                <th className="p-2">Shift</th>
                <th className="p-2">Masuk</th>
                <th className="p-2">Pulang</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(({ e, r, leave, shiftCode, status }) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">
                    <div className="font-medium">{e.fullName}</div>
                    <div className="text-xs text-muted-foreground">{e.employeeCode}</div>
                  </td>
                  <td className="p-2">{e.branch.name}</td>
                  <td className="p-2">{shiftCode ?? "—"}</td>
                  <td className="p-2">{eventCell(r, "IN")}</td>
                  <td className="p-2">{eventCell(r, "OUT")}</td>
                  <td className="p-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", STATUS_STYLE[status])}>
                      {DAY_STATUS[status]}
                      {status === "TERLAMBAT" && ` ${r!.lateMinutes}m`}
                    </span>
                    {leave && <div className="mt-1 text-xs text-muted-foreground">{leave.name}{leave.halfDay && " (½ hari)"}</div>}
                    {r?.hasCorrection && <div className="mt-1 text-xs text-muted-foreground">Dikoreksi</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Halaman">
          <span className="text-muted-foreground">
            Halaman {page} dari {pages} · {rows.length} karyawan
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page - 1)}>‹ Sebelumnya</Link>
              </Button>
            )}
            {page < pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page + 1)}>Berikutnya ›</Link>
              </Button>
            )}
          </div>
        </nav>
      )}
    </>
  );
}

async function Monthly({ employees, month, today }: { employees: Emp; month: string; today: string }) {
  const { first, last, started } = monthRange(month, today);
  if (!started) return <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Bulan ini belum dimulai.</p>;

  const days = await attendanceDays(employees, first, last);
  const rows = employees.map((e) => {
    const s = summarize(days.filter((d) => d.e.id === e.id));
    return { e, c: s.count, minutes: s.workMinutes, late: s.lateMinutes };
  });

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <p className="p-2 text-xs text-muted-foreground">
        {first} s/d {last} · status dihitung dari jadwal, hari libur, dan absensi
      </p>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-2">Karyawan</th>
            <th className="p-2 text-right">Hadir</th>
            <th className="p-2 text-right">Terlambat</th>
            <th className="p-2 text-right">Tidak hadir</th>
            <th className="p-2 text-right">Belum clock-out</th>
            <th className="p-2 text-right">Cuti/Izin</th>
            <th className="p-2 text-right">Libur</th>
            <th className="p-2 text-right">Total terlambat</th>
            <th className="p-2 text-right">Total jam kerja</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ e, c, minutes, late }) => (
            <tr key={e.id} className="border-t">
              <td className="p-2 whitespace-nowrap">
                <div className="font-medium">{e.fullName}</div>
                <div className="text-xs text-muted-foreground">{e.employeeCode}</div>
              </td>
              <td className="p-2 text-right">{c.HADIR + c.TERLAMBAT}</td>
              <td className="p-2 text-right">{c.TERLAMBAT}</td>
              <td className={cn("p-2 text-right", c.TIDAK_HADIR > 0 && "font-bold text-red-700")}>{c.TIDAK_HADIR}</td>
              <td className="p-2 text-right">{c.BELUM_CLOCK_OUT}</td>
              <td className="p-2 text-right">{c.CUTI}</td>
              <td className="p-2 text-right">{c.LIBUR}</td>
              <td className="p-2 text-right">{late} m</td>
              <td className="p-2 text-right">
                {Math.floor(minutes / 60)}j {minutes % 60}m
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
