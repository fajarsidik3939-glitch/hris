import Link from "next/link";
import { LocationBadge } from "@/components/location-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { minuteToTime } from "@/lib/attendance";
import { formatDateLong } from "@/lib/format";
import { requireUser } from "@/server/auth";
import { attendanceContext } from "@/server/attendance-status";
import { leaveSummary } from "@/server/leave";
import { TeamDashboard } from "./team-dashboard";

export const metadata = { title: "Beranda — HRIS" };

const time = (d: Date | null | undefined) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : "--:--");

export default async function BerandaPage() {
  const user = await requireUser();
  const canClock = user.permissions.has("attendance.clock") && user.employee;
  const status = canClock ? await attendanceContext(user.employee!.id) : null;
  const selfie = status && status.employee?.attendanceMethod !== "FINGERPRINT";
  const r = status?.current;
  const leave = user.employee && user.permissions.has("leave.request") ? await leaveSummary(user.employee.id) : [];
  const teamScope = user.permissions.get("attendance.read");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Halo, {user.displayName}</h1>
        <p className="text-sm text-muted-foreground">{formatDateLong(new Date())}</p>
      </div>

      {teamScope && teamScope !== "OWN" && <TeamDashboard user={user} scope={teamScope} />}

      {status && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {status.todayShift ? (
              <p className="text-sm">
                <b>{status.todayShift.name}</b> {minuteToTime(status.todayShift.startMinute)}–{minuteToTime(status.todayShift.endMinute)} · {status.employee.branch.name}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Hari ini tidak ada jadwal kerja · {status.employee.branch.name}</p>
            )}
            {selfie ? (
              <Link
                href="/absen"
                className="flex h-24 w-full flex-col items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground shadow-lg"
              >
                {status.nextAction === "IN" ? "CLOCK IN" : "CLOCK OUT"}
                <span className="text-xs font-medium opacity-90">{r ? (r.clockOutAt ? "Sudah pulang · tap untuk perbarui jam pulang" : "Sudah clock-in") : "Belum absen"}</span>
              </Link>
            ) : (
              <p className="rounded-md bg-slate-50 p-3 text-sm">Metode absen Anda fingerprint. Silakan absen di mesin.</p>
            )}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Masuk</p>
                <p className="font-bold">{time(r?.clockInAt)}</p>
                <LocationBadge label={r?.clockInLabel ?? null} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pulang</p>
                <p className="font-bold">{time(r?.clockOutAt)}</p>
                <LocationBadge label={r?.clockOutLabel ?? null} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Durasi</p>
                <p className="font-bold">{r?.clockOutAt ? `${Math.floor(r.workMinutes / 60)}j ${r.workMinutes % 60}m` : "–"}</p>
              </div>
            </div>
            {r && r.lateMinutes > 0 && <p className="text-sm text-amber-700">Terlambat {r.lateMinutes} menit.</p>}
          </CardContent>
        </Card>
      )}

      {leave.map((l) => (
        <Link key={l.type.id} href="/pengajuan/cuti" className="flex items-center justify-between rounded-lg border bg-white p-4 text-sm">
          <span>Sisa {l.type.name.toLowerCase()}</span>
          <b>{l.period ? `${l.available} hari` : "belum berhak"}</b>
        </Link>
      ))}

      {!status && !(teamScope && teamScope !== "OWN") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selamat datang di HRIS</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {user.permissions.has("attendance.clock") ? "Akun Anda belum terhubung ke data karyawan. Hubungi HR agar bisa absen." : "Gunakan menu untuk mengelola data."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
