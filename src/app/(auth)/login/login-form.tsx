"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-xl">Masuk ke HRIS</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <FormField name="loginId" label="ID Karyawan / Email" autoComplete="username" required errors={state?.errors?.loginId} />
          <FormField name="password" label="Password" type="password" autoComplete="current-password" required errors={state?.errors?.password} />
          {state?.message && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.message}
            </p>
          )}
          <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
            {pending ? "Memeriksa…" : "MASUK"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">Lupa password? Hubungi HR atau admin.</p>
        </form>
      </CardContent>
    </Card>
  );
}
