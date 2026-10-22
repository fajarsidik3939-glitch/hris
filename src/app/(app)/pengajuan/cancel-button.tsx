"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelRequest } from "./actions";

export function CancelButton({ requestId }: { requestId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => window.confirm("Batalkan pengajuan ini?") && start(() => cancelRequest(requestId))}>
      {pending ? "Membatalkan…" : "Batalkan"}
    </Button>
  );
}
