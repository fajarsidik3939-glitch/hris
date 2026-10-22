"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { changePassword } from "../actions";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Ganti Password</CardTitle>
        {forced && <CardDescription>Anda memakai password sementara. Buat password baru untuk melanjutkan.</CardDescription>}
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <FormField name="currentPassword" label={forced ? "Password sementara" : "Password lama"} type="password" autoComplete="current-password" required errors={state?.errors?.currentPassword} />
          <FormField name="newPassword" label="Password baru (min. 8 karakter, huruf + angka)" type="password" autoComplete="new-password" required errors={state?.errors?.newPassword} />
          <FormField name="confirmPassword" label="Ulangi password baru" type="password" autoComplete="new-password" required errors={state?.errors?.confirmPassword} />
          <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
            {pending ? "Menyimpan…" : "SIMPAN PASSWORD"}
          </Button>
          {!forced && (
            <Button asChild variant="ghost" className="w-full">
              <Link href="/beranda">Batal</Link>
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
