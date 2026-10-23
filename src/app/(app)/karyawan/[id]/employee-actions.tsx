"use client";

import { useActionState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { adjustLeaveBalance, createEmployeeAccount, deactivateEmployee, reactivateEmployee } from "../actions";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border bg-white p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function AccountForm({
  employeeId,
  loginId,
  existing,
  canCreate,
  roleOptions,
}: {
  employeeId: string;
  loginId: string;
  existing: string | null;
  canCreate: boolean;
  roleOptions: { code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(createEmployeeAccount, undefined);
  return (
    <Panel title="Akun login">
      {state?.ok ? (
        <div role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.message}
          <div className="mt-2">
            <code className="rounded bg-white px-2 py-1 font-mono text-base font-bold tracking-wider text-slate-900">{state.tempPassword}</code>
          </div>
          <p className="mt-1 text-xs">Password ini hanya tampil sekali. Karyawan wajib menggantinya saat login pertama.</p>
        </div>
      ) : existing ? (
        <p className="text-sm">
          ID login: <b>{existing}</b>. Reset password atau ubah role dilakukan Super Admin di menu Pengguna.
        </p>
      ) : !canCreate ? (
        <p className="text-sm text-muted-foreground">Karyawan nonaktif tidak bisa dibuatkan akun.</p>
      ) : (
        <form action={action} className="space-y-3">
          <input type="hidden" name="employeeId" value={employeeId} />
          <p className="text-sm text-muted-foreground">
            Karyawan belum punya akun. ID login akan memakai NIK: <b>{loginId}</b>
          </p>
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1.5 text-sm font-medium">Role</legend>
            {roleOptions.map((r) => (
              <label key={r.code} className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm">
                <input type="checkbox" name="roles" value={r.code} defaultChecked={r.code === "EMPLOYEE"} className="size-4" />
                {r.name}
              </label>
            ))}
          </fieldset>
          {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
          <Button type="submit" disabled={pending}>
            {pending ? "Membuat…" : "Buat akun login"}
          </Button>
        </form>
      )}
    </Panel>
  );
}

export function DeactivateForm({ employeeId, subordinates }: { employeeId: string; subordinates: number }) {
  const [state, action, pending] = useActionState(deactivateEmployee, undefined);
  return (
    <Panel title="Nonaktifkan karyawan">
      <form
        action={action}
        onSubmit={(e) => {
          if (!window.confirm("Nonaktifkan karyawan ini? Akun loginnya juga akan dinonaktifkan.")) e.preventDefault();
        }}
        className="space-y-3"
      >
        <input type="hidden" name="employeeId" value={employeeId} />
        {subordinates > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Karyawan ini masih atasan dari {subordinates} orang. Ganti atasan mereka setelah ini.
          </p>
        )}
        <FormField name="endDate" label="Tanggal keluar" type="date" required errors={state?.errors?.endDate} />
        <FormField name="reason" label="Alasan" required errors={state?.errors?.reason} />
        {state?.message && <p className={state.ok ? "text-sm text-green-700" : "text-sm text-destructive"}>{state.message}</p>}
        <Button type="submit" variant="destructive" disabled={pending}>
          {pending ? "Memproses…" : "Nonaktifkan"}
        </Button>
      </form>
    </Panel>
  );
}

export function ReactivateButton({ employeeId }: { employeeId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Panel title="Karyawan nonaktif">
      <p className="text-sm text-muted-foreground">Aktifkan kembali jika karyawan kembali bekerja. Akun loginnya ikut diaktifkan.</p>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (window.confirm("Aktifkan kembali karyawan ini?")) startTransition(() => reactivateEmployee(employeeId));
        }}
      >
        Aktifkan kembali
      </Button>
    </Panel>
  );
}

export function AdjustLeaveForm({ employeeId, types }: { employeeId: string; types: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(adjustLeaveBalance, undefined);
  return (
    <Panel title="Penyesuaian saldo (HR Manager)">
      <form action={action} className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <input type="hidden" name="employeeId" value={employeeId} />
        <select name="leaveTypeId" aria-label="Jenis cuti" className="h-11 rounded-md border bg-white px-2 text-sm sm:col-span-2">
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <FormField name="note" label="Alasan" required errors={state?.errors?.note} />
        <FormField name="days" label="Hari (+/−)" type="number" step="0.5" required errors={state?.errors?.days} />
        {state?.message && <p className={state.ok ? "text-sm text-green-700 sm:col-span-2" : "text-sm text-destructive sm:col-span-2"}>{state.message}</p>}
        <Button type="submit" disabled={pending} className="sm:col-span-2" onClick={(e) => !window.confirm("Simpan penyesuaian saldo?") && e.preventDefault()}>
          {pending ? "Menyimpan…" : "Simpan penyesuaian"}
        </Button>
      </form>
    </Panel>
  );
}
