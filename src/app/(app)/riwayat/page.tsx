import Link from "next/link";
import { LocationBadge } from "@/components/location-badge";
import { addDays, wibDate } from "@/lib/attendance";
import { formatDateOnly } from "@/lib/format";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Riwayat Absensi — HRIS" };

const time = (d: Date | null) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : "--:--");

// shortcut: hanya 31 hari terakhir milik sendiri; filter bulan & rekap ada di M4 (Kehadiran).
export default async function RiwayatPage() {
  const { user } = await requirePermission("attendance.clock");
  const records = user.employee
    ? await db.attendanceRecord.findMany({
        where: { employeeId: user.employee.id, workDate: { gte: new Date(addDays(wibDate(new Date()), -30)) } },
        orderBy: { workDate: "desc" },
        include: { events: { where: { photoPath: { not: null } }, orderBy: { occurredAt: "asc" }, select: { id: true, type: true } } },
      })
    : [];

  return (
    <div className="mx-auto max-w-md space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Riwayat Absensi</h1>
          <p className="text-sm text-muted-foreground">31 hari terakhir</p>
        </div>
        <Link href="/pengajuan/koreksi" className="text-sm font-semibold text-primary">
          Lupa absen sehari penuh?
        </Link>
      </div>
      {records.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Belum ada absensi.</p>}
      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id} className={`rounded-lg border bg-white p-3 ${r.clockInAt && !r.clockOutAt && r.workDate.toISOString().slice(0, 10) < wibDate(new Date()) ? "border-red-300" : ""}`}>
            <div className="flex justify-between gap-2">
              <b>{formatDateOnly(r.workDate)}</b>
              <span>
                {time(r.clockInAt)} – {time(r.clockOutAt)}
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
              <LocationBadge label={r.clockInLabel} />
              {r.clockOutLabel && r.clockOutLabel !== r.clockInLabel && <LocationBadge label={r.clockOutLabel} />}
              {r.lateMinutes > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">Terlambat {r.lateMinutes}m</span>}
              {!r.clockOutAt && r.workDate.toISOString().slice(0, 10) < wibDate(new Date()) && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800">✕ Belum clock-out</span>
              )}
              {r.clockOutAt && <span className="ml-auto text-muted-foreground">{Math.floor(r.workMinutes / 60)}j {r.workMinutes % 60}m</span>}
              {r.hasCorrection && <span className="text-muted-foreground">· dikoreksi</span>}
            </div>
            <Link href={`/pengajuan/koreksi?tanggal=${r.workDate.toISOString().slice(0, 10)}`} className="mt-1 inline-block text-xs font-semibold text-primary">
              Ajukan koreksi
            </Link>
            {r.events.length > 0 && (
              <div className="mt-1.5 flex gap-3 text-xs">
                {r.events.map((e) => (
                  <a key={e.id} href={`/api/attendance/photo/${e.id}`} target="_blank" rel="noopener" className="text-primary underline">
                    Foto {e.type === "IN" ? "masuk" : "pulang"}
                  </a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
