"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { decide } from "./actions";

export function DecideForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(decide, undefined);
  const [rejecting, setRejecting] = useState(false);
  if (state?.ok) return <p className="text-sm font-semibold text-green-700">{state.message}</p>;
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="requestId" value={requestId} />
      {rejecting && (
        <label className="block space-y-1">
          <span className="text-xs font-medium">Alasan penolakan (wajib)</span>
          <input name="comment" required minLength={3} autoFocus className="h-10 w-full rounded-md border px-2" />
        </label>
      )}
      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <div className="flex gap-2">
        {rejecting ? (
          <>
            <Button type="submit" name="decision" value="reject" variant="destructive" disabled={pending}>
              Kirim penolakan
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              Batal
            </Button>
          </>
        ) : (
          <>
            <Button type="button" variant="outline" className="border-red-300 text-red-700" onClick={() => setRejecting(true)}>
              Tolak
            </Button>
            <Button type="submit" name="decision" value="approve" disabled={pending} onClick={(e) => !window.confirm("Setujui pengajuan ini?") && e.preventDefault()}>
              {pending ? "Memproses…" : "Setujui"}
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
