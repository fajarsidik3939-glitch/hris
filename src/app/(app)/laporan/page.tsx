import { forbidden } from "next/navigation";
import { wibDate } from "@/lib/attendance";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { ReportForm } from "./report-form";

export const metadata = { title: "Laporan & Ekspor — HRIS" };

export default async function LaporanPage() {
  const user = await requireUser();
  if (!user.permissions.has("attendance.export")) forbidden();
  const [branches, departments] = await Promise.all([
    db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Laporan & Ekspor</h1>
        <p className="text-sm text-muted-foreground">
          Unduh Excel/CSV untuk payroll atau arsip. Isi laporan mengikuti hak akses Anda
          {user.permissions.get("attendance.export") === "ALL" ? " (semua karyawan)" : " (tim/departemen Anda)"}. Setiap unduhan tercatat di audit log.
        </p>
      </div>
      <ReportForm today={wibDate(new Date())} branches={branches} departments={departments} canLeave={user.permissions.has("leave.read")} />
    </div>
  );
}
