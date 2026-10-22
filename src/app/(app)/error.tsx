"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-lg border bg-white p-6 text-center">
      <h1 className="font-bold">Terjadi kesalahan</h1>
      <p className="mt-1 text-sm text-muted-foreground">Halaman gagal dimuat. Periksa koneksi internet lalu coba lagi.</p>
      <button onClick={reset} className="mt-4 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
        Coba lagi
      </button>
    </div>
  );
}
