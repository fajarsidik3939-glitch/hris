import { wibDate } from "@/lib/attendance";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { leaveSummary } from "@/server/leave";
import { LeaveForm } from "./leave-form";

export const metadata = { title: "Ajukan Cuti/Izin — HRIS" };

export default async function CutiPage() {
  const { user } = await requirePermission("leave.request");
  const [types, summary] = await Promise.all([
    db.leaveType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    user.employee ? leaveSummary(user.employee.id) : [],
  ]);
  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-xl font-bold">Ajukan Cuti / Izin</h1>
      {summary.map((s) => (
        <p key={s.type.id} className="rounded-md bg-blue-50 p-3 text-sm">
          {s.type.name}: tersedia <b>{s.available} hari</b>
          {s.pending > 0 && ` (${s.pending} hari menunggu persetujuan)`}
          {!s.period && " — belum berhak (belum genap 12 bulan bekerja)"}
        </p>
      ))}
      <LeaveForm
        today={wibDate(new Date())}
        types={types.map((t) => ({ id: t.id, name: t.name, halfDay: t.allowHalfDay, attachment: t.requiresAttachment, max: t.maxDaysPerRequest, deducts: t.deductsBalance }))}
      />
      <p className="text-xs text-muted-foreground">Jumlah hari dihitung otomatis dari jadwal kerja Anda (hari libur & off tidak dihitung). Disetujui atasan langsung, lalu HR.</p>
    </div>
  );
}
