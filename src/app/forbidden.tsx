import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-extrabold text-slate-300">403</p>
      <h1 className="text-lg font-bold">Anda tidak punya akses ke halaman ini</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Jika menurut Anda ini keliru, hubungi HR atau admin.</p>
      <Link href="/beranda" className="mt-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
        Kembali ke Beranda
      </Link>
    </main>
  );
}
