"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { assignSchedule } from "./actions";

type Row = { id: string; name: string; code: string; cells: { label: string; title: string; override: boolean }[] };

export function ScheduleForm({
  canManage,
  days,
  rows,
  shifts,
  defaultFrom,
  defaultTo,
}: {
  canManage: boolean;
  days: { date: string; label: string }[];
  rows: Row[];
  shifts: { id: string; label: string }[];
  defaultFrom: string;
  defaultTo: string;
}) {
  const [state, action, pending] = useActionState(assignSchedule, undefined);
  return (
    <form action={action} className="space-y-3">
      {canManage && (
        <fieldset className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3 text-sm">
          <legend className="px-1 font-semibold">Ubah jadwal karyawan yang dicentang</legend>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Dari</span>
            <input type="date" name="from" defaultValue={defaultFrom} required className="h-10 rounded-md border px-2" />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Sampai</span>
            <input type="date" name="to" defaultValue={defaultTo} required className="h-10 rounded-md border px-2" />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-muted-foreground">Jadwal</span>
            <select name="shiftId" className="h-10 rounded-md border bg-white px-2">
              {shifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
              <option value="OFF">Libur</option>
              <option value="">Kembali ke shift default</option>
            </select>
          </label>
          <Button type="submit" disabled={pending} onClick={(e) => !window.confirm("Terapkan jadwal ke karyawan yang dicentang?") && e.preventDefault()}>
            {pending ? "Menyimpan…" : "Terapkan"}
          </Button>
          {state?.message && <p className={state.ok ? "text-green-700" : "text-destructive"}>{state.message}</p>}
        </fieldset>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Tidak ada karyawan aktif.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-muted-foreground">
              <tr>
                <th className="p-2 text-left">Karyawan</th>
                {days.map((d) => (
                  <th key={d.date} className="p-2 text-center whitespace-nowrap">
                    {d.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">
                    <label className="flex items-center gap-2">
                      {canManage && <input type="checkbox" name="employeeIds" value={r.id} className="size-4" aria-label={`Pilih ${r.name}`} />}
                      <span>
                        <span className="font-medium">{r.name}</span> <span className="text-xs text-muted-foreground">{r.code}</span>
                      </span>
                    </label>
                  </td>
                  {r.cells.map((c, i) => (
                    <td key={i} title={c.title} className={cn("p-2 text-center text-xs font-semibold", c.override && "bg-blue-50 text-blue-800", c.label === "Libur" && "text-muted-foreground")}>
                      {c.label}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
