import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLong } from "@/lib/format";
import { requireUser } from "@/server/auth";

export const metadata = { title: "Beranda — HRIS" };

export default async function BerandaPage() {
  const user = await requireUser();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold">Halo, {user.displayName}</h1>
        <p className="text-sm text-muted-foreground">{formatDateLong(new Date())}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Selamat datang di HRIS</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Fitur absensi, cuti, dan data karyawan akan muncul di sini sesuai tahap pengembangan.
        </CardContent>
      </Card>
    </div>
  );
}
