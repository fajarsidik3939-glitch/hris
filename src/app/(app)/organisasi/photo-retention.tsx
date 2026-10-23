"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { purgeOldPhotos } from "./actions";

export function PhotoRetention({ months, eligible }: { months: number; eligible: number }) {
  const [state, action, pending] = useActionState(purgeOldPhotos, undefined);
  return (
    <form action={action} className="max-w-xl space-y-2 rounded-lg border bg-white p-4 text-sm">
      <h2 className="font-semibold">Retensi foto absensi</h2>
      <p className="text-muted-foreground">
        Foto selfie disimpan {months} bulan (UU PDP: data seminimal mungkin). Saat ini <b>{eligible}</b> foto melewati batas. Jam, lokasi, dan label absensi
        tetap tersimpan; hanya fotonya yang dihapus permanen.
      </p>
      {state?.message && <p className={state.ok ? "text-green-700" : "text-destructive"}>{state.message}</p>}
      <Button type="submit" variant="outline" disabled={pending || eligible === 0} onClick={(e) => !window.confirm(`Hapus permanen ${eligible} foto lama?`) && e.preventDefault()}>
        {pending ? "Menghapus…" : "Hapus foto lama"}
      </Button>
    </form>
  );
}
