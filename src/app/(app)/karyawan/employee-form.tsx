"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { Label } from "@/components/ui/label";
import { submitKeepingValues } from "@/lib/form";
import { ATTENDANCE_METHODS, EMPLOYMENT_TYPES, WEEKDAYS, WORK_TYPES } from "@/lib/org";
import { saveEmployee } from "./actions";

type Option = { value: string; label: string };
export type EmployeeFormValues = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  branchId: string;
  departmentId: string;
  positionId: string;
  managerId: string;
  hireDate: string;
  employmentType: string;
  workType: string;
  attendanceMethod: string;
  fingerprintUserId: string;
  defaultShiftId: string;
  workDays: number[];
};

function Select({ name, label, options, value, errors, required }: { name: string; label: string; options: Option[]; value: string; errors?: string[]; required?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={value}
        required={required}
        aria-invalid={errors ? true : undefined}
        aria-describedby={errors ? `${name}-error` : undefined}
        className="h-11 w-full rounded-md border bg-white px-3 text-base md:text-sm"
      >
        <option value="">{required ? "— Pilih —" : "— Tidak ada —"}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {errors && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {errors[0]}
        </p>
      )}
    </div>
  );
}

const toOptions = (obj: Record<string, string>) => Object.entries(obj).map(([value, label]) => ({ value, label }));

export function EmployeeForm({
  initial,
  branches,
  departments,
  positions,
  managers,
  shifts,
}: {
  initial: EmployeeFormValues;
  branches: Option[];
  departments: Option[];
  positions: Option[];
  managers: Option[];
  shifts: Option[];
}) {
  const [state, action, pending] = useActionState(saveEmployee, undefined);
  const e = state?.errors;
  return (
    <form method="post" onSubmit={submitKeepingValues(action)} className="space-y-6">
      <input type="hidden" name="id" value={initial.id} />
      <fieldset className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Profil</legend>
        <FormField name="employeeCode" label="NIK karyawan" defaultValue={initial.employeeCode} required errors={e?.employeeCode} />
        <FormField name="fullName" label="Nama lengkap" defaultValue={initial.fullName} required errors={e?.fullName} />
        <FormField name="email" label="Email (opsional)" type="email" defaultValue={initial.email} errors={e?.email} />
        <FormField name="phone" label="No. HP (opsional)" type="tel" defaultValue={initial.phone} errors={e?.phone} />
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Pekerjaan</legend>
        <Select name="branchId" label="Cabang" options={branches} value={initial.branchId} errors={e?.branchId} required />
        <Select name="departmentId" label="Departemen" options={departments} value={initial.departmentId} errors={e?.departmentId} required />
        <Select name="positionId" label="Jabatan" options={positions} value={initial.positionId} errors={e?.positionId} required />
        <Select name="managerId" label="Atasan langsung" options={managers} value={initial.managerId} errors={e?.managerId} />
        <FormField name="hireDate" label="Tanggal masuk" type="date" defaultValue={initial.hireDate} required errors={e?.hireDate} />
        <Select name="employmentType" label="Jenis hubungan kerja" options={toOptions(EMPLOYMENT_TYPES)} value={initial.employmentType} errors={e?.employmentType} required />
      </fieldset>

      <fieldset className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-2">
        <legend className="px-1 font-semibold">Absensi</legend>
        <Select name="workType" label="Tipe kerja" options={toOptions(WORK_TYPES)} value={initial.workType} errors={e?.workType} required />
        <Select name="attendanceMethod" label="Metode absen" options={toOptions(ATTENDANCE_METHODS)} value={initial.attendanceMethod} errors={e?.attendanceMethod} required />
        <FormField name="fingerprintUserId" label="ID di mesin fingerprint" defaultValue={initial.fingerprintUserId} errors={e?.fingerprintUserId} />
        <Select name="defaultShiftId" label="Shift (jadwal tetap)" options={shifts} value={initial.defaultShiftId} errors={e?.defaultShiftId} />
        <div className="space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium">Hari kerja (jadwal tetap)</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <label key={d.value} className="flex min-h-11 min-w-14 items-center justify-center gap-1.5 rounded-md border bg-white px-3 text-sm">
                <input type="checkbox" name="workDays" value={d.value} defaultChecked={initial.workDays.includes(d.value)} className="size-4" />
                {d.label}
              </label>
            ))}
          </div>
          {e?.workDays && <p className="text-sm text-destructive">{e.workDays[0]}</p>}
        </div>
      </fieldset>

      {state?.message && <p className="text-sm text-destructive">{state.message}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </Button>
        <Button asChild variant="ghost">
          <Link href={initial.id ? `/karyawan/${initial.id}` : "/karyawan"}>Batal</Link>
        </Button>
      </div>
    </form>
  );
}
