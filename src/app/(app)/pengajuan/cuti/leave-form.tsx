"use client";

import { useActionState, useState } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { submitKeepingValues } from "@/lib/form";
import { submitLeave } from "../actions";

type T = { id: string; name: string; halfDay: boolean; attachment: boolean; max: number | null; deducts: boolean };

export function LeaveForm({ types, today }: { types: T[]; today: string }) {
  const [state, action, pending] = useActionState(submitLeave, undefined);
  const [typeId, setTypeId] = useState("");
  const type = types.find((t) => t.id === typeId);
  const e = state?.errors;
  return (
    <form method="post" encType="multipart/form-data" onSubmit={submitKeepingValues(action)} className="space-y-4 rounded-lg border bg-white p-4">
      <div className="space-y-1.5">
        <Label htmlFor="leaveTypeId">Jenis</Label>
        <select
          id="leaveTypeId"
          name="leaveTypeId"
          required
          value={typeId}
          onChange={(ev) => setTypeId(ev.target.value)}
          aria-invalid={e?.leaveTypeId ? true : undefined}
          className="h-11 w-full rounded-md border bg-white px-3 text-base md:text-sm"
        >
          <option value="">— Pilih —</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        {e?.leaveTypeId && <p className="text-sm text-destructive">{e.leaveTypeId[0]}</p>}
        {type && (
          <p className="text-xs text-muted-foreground">
            {type.deducts ? "Memotong saldo cuti." : "Tidak memotong saldo."}
            {type.max && ` Maks. ${type.max} hari.`}
            {type.attachment && " Wajib lampiran."}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField name="startDate" label="Mulai" type="date" defaultValue={today} required errors={e?.startDate} />
        <FormField name="endDate" label="Sampai" type="date" defaultValue={today} required errors={e?.endDate} />
      </div>
      {type?.halfDay && (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="halfDay" className="size-4" /> Setengah hari (tanggal mulai = sampai)
          {e?.halfDay && <span className="text-destructive">{e.halfDay[0]}</span>}
        </label>
      )}
      <FormField name="reason" label="Alasan" required errors={e?.reason} />
      <div className="space-y-1.5">
        <Label htmlFor="attachment">Lampiran {type?.attachment ? "(wajib)" : "(opsional)"} — foto/PDF, maks. 2 MB</Label>
        <input id="attachment" name="attachment" type="file" accept="image/jpeg,image/png,application/pdf" required={type?.attachment} className="block w-full text-sm" />
        {e?.attachment && <p className="text-sm text-destructive">{e.attachment[0]}</p>}
      </div>
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" className="h-11 w-full" disabled={pending}>
        {pending ? "Mengirim…" : "KIRIM PENGAJUAN"}
      </Button>
    </form>
  );
}
