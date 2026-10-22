import Link from "next/link";
import { formatDateLong } from "@/lib/format";
import { requirePermission } from "@/server/auth";
import { currentAttendance } from "@/server/attendance-status";
import { ClockFlow } from "./clock-flow";

export const metadata = { title: "Absen — HRIS" };

export default async function AbsenPage() {
  const { user } = await requirePermission("attendance.clock");
  if (!user.employee) {
    return <Notice text="Akun Anda belum terhubung ke data karyawan. Hubungi HR agar akun dihubungkan." />;
  }
  const { employee, recent, nextAction } = await currentAttendance(user.employee.id);
  if (employee?.attendanceMethod === "FINGERPRINT") {
    return <Notice text="Metode absen Anda adalah fingerprint. Silakan absen di mesin fingerprint." />;
  }

  return (
    <div className="mx-auto max-w-md space-y-3">
      <div>
        <h1 className="text-xl font-bold">{nextAction === "IN" ? "Clock In" : "Clock Out"}</h1>
        <p className="text-sm text-muted-foreground">{formatDateLong(new Date())}</p>
      </div>
      <ClockFlow
        action={nextAction}
        clockInAt={recent?.clockInAt?.toISOString() ?? null}
        clockOutAt={recent?.clockOutAt?.toISOString() ?? null}
      />
      <p className="text-xs text-muted-foreground">
        Lokasi hanya diambil saat absen. Foto dan lokasi disimpan privat dan hanya dapat dilihat Anda, atasan, dan HR.
      </p>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="mx-auto max-w-md rounded-lg border bg-white p-6 text-center">
      <p className="text-sm">{text}</p>
      <Link href="/beranda" className="mt-4 inline-block text-sm font-semibold text-primary">
        Kembali ke Beranda
      </Link>
    </div>
  );
}
