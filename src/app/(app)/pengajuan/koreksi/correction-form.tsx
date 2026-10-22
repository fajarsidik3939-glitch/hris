"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { submitKeepingValues } from "@/lib/form";
import { submitCorrection } from "../actions";

export function CorrectionForm({ date, max }: { date: string; max: string }) {
  const [state, action, pending] = useActionState(submitCorrection, undefined);
  const e = state?.errors;
  return (
    <form method="post" onSubmit={submitKeepingValues(action)} className="space-y-4 rounded-lg border bg-white p-4">
      <FormField name="workDate" label="Tanggal kerja" type="date" defaultValue={date} max={max} required errors={e?.workDate} />
      <div className="grid grid-cols-2 gap-3">
        <FormField name="clockIn" label="Jam masuk seharusnya" type="time" errors={e?.clockIn} />
        <FormField name="clockOut" label="Jam pulang seharusnya" type="time" errors={e?.clockOut} />
      </div>
      <p className="text-xs text-muted-foreground">Kosongkan jam yang sudah benar. Jam pulang lebih awal dari jam masuk = keesokan hari (shift malam).</p>
      <FormField name="reason" label="Alasan (min. 10 karakter)" required errors={e?.reason} />
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Mengirim…" : "KIRIM PENGAJUAN"}
      </Button>
    </form>
  );
}
