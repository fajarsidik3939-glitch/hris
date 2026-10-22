import { wibDate } from "@/lib/attendance";
import { formatDateOnly } from "@/lib/format";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { CorrectionForm } from "./correction-form";

export const metadata = { title: "Ajukan Koreksi — HRIS" };

const time = (d: Date | null | undefined) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":") : "");

export default async function KoreksiPage({ searchParams }: PageProps<"/pengajuan/koreksi">) {
  const { user } = await requirePermission("attendance.correction.request");
  const raw = (await searchParams).tanggal;
  const today = wibDate(new Date());
  const date = typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw) && raw <= today ? raw : today;
  const record = user.employee
    ? await db.attendanceRecord.findUnique({ where: { employeeId_workDate: { employeeId: user.employee.id, workDate: new Date(date) } }, select: { clockInAt: true, clockOutAt: true } })
    : null;

  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-bold">Ajukan Koreksi Absensi</h1>
      <p className="text-sm text-muted-foreground">
        Untuk lupa clock-in/clock-out atau jam yang salah. Disetujui atasan langsung, lalu HR. Data absensi asli tetap tersimpan.
      </p>
      {record && (
        <p className="rounded-md bg-slate-50 p-3 text-sm">
          Tercatat {formatDateOnly(new Date(date))}: masuk <b>{time(record.clockInAt) || "--:--"}</b>, pulang <b>{time(record.clockOutAt) || "--:--"}</b>
        </p>
      )}
      <CorrectionForm date={date} max={today} />
    </div>
  );
}
