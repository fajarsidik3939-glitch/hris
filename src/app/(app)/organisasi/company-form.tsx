"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { submitKeepingValues } from "@/lib/form";
import { saveCompany } from "./actions";

export function CompanyForm({ initial }: { initial: { name: string; legalName: string; address: string } }) {
  const [state, action, pending] = useActionState(saveCompany, undefined);
  return (
    <form method="post" onSubmit={submitKeepingValues(action)} className="max-w-xl space-y-4 rounded-lg border bg-white p-4">
      <FormField name="name" label="Nama perusahaan" defaultValue={initial.name} required errors={state?.errors?.name} />
      <FormField name="legalName" label="Nama badan hukum (opsional)" defaultValue={initial.legalName} errors={state?.errors?.legalName} />
      <FormField name="address" label="Alamat (opsional)" defaultValue={initial.address} errors={state?.errors?.address} />
      {state?.message && (
        <p role="status" className={state.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </Button>
    </form>
  );
}
