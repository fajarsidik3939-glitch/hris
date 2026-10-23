"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { processAnnualLeave } from "./actions";

export function AnnualLeaveButton() {
  const [state, action, pending] = useActionState(processAnnualLeave, undefined);
  return (
    <form action={action} className="space-y-2 rounded-lg border bg-white p-4 text-sm">
      <h2 className="font-semibold">Saldo cuti tahunan</h2>
      <p className="text-muted-foreground">
        Memberi hak cuti periode berjalan ke karyawan aktif yang sudah genap 12 bulan bekerja (dihitung dari tanggal masuk). Aman ditekan berulang;
        yang sudah mendapat hak tidak diberi dua kali. Jalankan rutin, mis. tiap awal bulan.
      </p>
      {state?.message && <p className={state.ok ? "text-green-700" : "text-destructive"}>{state.message}</p>}
      <Button type="submit" disabled={pending} onClick={(e) => !window.confirm("Proses saldo cuti tahunan sekarang?") && e.preventDefault()}>
        {pending ? "Memproses…" : "Proses saldo tahunan"}
      </Button>
    </form>
  );
}
