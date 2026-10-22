"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/form-field";
import { createUser, resetPassword, setUserActive, setUserRoles, type UserActionState } from "./actions";

type RoleOption = { code: string; name: string };

function Result({ state }: { state: UserActionState }) {
  if (!state?.message) return null;
  return (
    <div role="status" className={`rounded-md px-3 py-2 text-left text-sm ${state.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
      {state.message}
      {state.tempPassword && (
        <div className="mt-2">
          <code className="rounded bg-white px-2 py-1 font-mono text-base font-bold tracking-wider text-slate-900">{state.tempPassword}</code>
          <p className="mt-1 text-xs">Password ini hanya tampil sekali. Pengguna wajib menggantinya saat login pertama.</p>
        </div>
      )}
    </div>
  );
}

function RoleCheckboxes({ options, selected = [] }: { options: RoleOption[]; selected?: string[] }) {
  return (
    <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <legend className="mb-1.5 text-sm font-medium">Role</legend>
      {options.map((r) => (
        <label key={r.code} className="flex min-h-11 items-center gap-2 rounded-md border bg-white px-3 text-sm">
          <input type="checkbox" name="roles" value={r.code} defaultChecked={selected.includes(r.code)} className="size-4" />
          {r.name}
        </label>
      ))}
    </fieldset>
  );
}

export function CreateUserForm({ roleOptions }: { roleOptions: RoleOption[] }) {
  const [state, action, pending] = useActionState(createUser, undefined);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tambah Pengguna</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField name="loginId" label="ID login (NIK)" required errors={state?.errors?.loginId} />
            <FormField name="displayName" label="Nama" required errors={state?.errors?.displayName} />
            <FormField name="email" label="Email (opsional)" type="email" errors={state?.errors?.email} />
          </div>
          <RoleCheckboxes options={roleOptions} selected={["EMPLOYEE"]} />
          {state?.errors?.roles && <p className="text-sm text-destructive">{state.errors.roles[0]}</p>}
          <Result state={state} />
          <Button type="submit" disabled={pending}>
            {pending ? "Menyimpan…" : "Buat Akun"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function UserRowActions({
  user,
  roleOptions,
  isSelf,
}: {
  user: { id: string; loginId: string; isActive: boolean; roles: string[] };
  roleOptions: RoleOption[];
  isSelf: boolean;
}) {
  const [state, setState] = useState<UserActionState>();
  const [pending, startTransition] = useTransition();
  const [roleState, roleAction, rolePending] = useActionState(setUserRoles, undefined);

  const run = (fn: () => Promise<UserActionState>, confirmText: string) => {
    if (!window.confirm(confirmText)) return;
    startTransition(async () => setState(await fn()));
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <details className="relative">
          <summary className="inline-flex h-9 cursor-pointer items-center rounded-md border px-3 text-sm">Role</summary>
          <form action={roleAction} className="absolute right-0 z-10 mt-1 w-80 space-y-3 rounded-lg border bg-slate-50 p-3 text-left shadow-lg">
            <input type="hidden" name="userId" value={user.id} />
            <RoleCheckboxes options={roleOptions} selected={user.roles} />
            <Result state={roleState} />
            <Button type="submit" size="sm" disabled={rolePending}>
              Simpan role
            </Button>
          </form>
        </details>
        {!isSelf && (
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => resetPassword(user.id), `Reset password "${user.loginId}"? Pengguna akan keluar dari semua perangkat.`)}
            >
              Reset password
            </Button>
            <Button
              variant={user.isActive ? "destructive" : "outline"}
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => setUserActive(user.id, !user.isActive),
                  user.isActive ? `Nonaktifkan "${user.loginId}"? Pengguna tidak bisa login lagi.` : `Aktifkan kembali "${user.loginId}"?`,
                )
              }
            >
              {user.isActive ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </>
        )}
      </div>
      <Result state={state} />
    </div>
  );
}
