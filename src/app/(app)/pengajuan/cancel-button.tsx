"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelRequest } from "./actions";

export function CancelButton({ requestId, label = "Batalkan" }: { requestId: string; label?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => window.confirm("Batalkan pengajuan ini?") && start(async () => setError(await cancelRequest(requestId)))}
      >
        {pending ? "Membatalkan…" : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
