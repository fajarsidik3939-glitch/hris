"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";

type Opt = { id: string; name: string };
const REPORTS = {
  rekap: "Rekap kehadiran bulanan (untuk payroll)",
  harian: "Detail kehadiran harian (maks. 31 hari)",
  cuti: "Daftar cuti & izin (maks. 31 hari)",
} as const;

/** Form biasa (GET) ke /api/laporan: browser langsung mengunduh berkas. */
export function ReportForm({ today, branches, departments, canLeave }: { today: string; branches: Opt[]; departments: Opt[]; canLeave: boolean }) {
  const [jenis, setJenis] = useState<keyof typeof REPORTS>("rekap");
  const field = "h-11 w-full rounded-md border bg-white px-3 text-base md:text-sm";
  return (
    <form action="/api/laporan" method="get" className="space-y-4 rounded-lg border bg-white p-4">
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium">Jenis laporan</legend>
        {(Object.keys(REPORTS) as (keyof typeof REPORTS)[])
          .filter((k) => k !== "cuti" || canLeave)
          .map((k) => (
            <label key={k} className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm">
              <input type="radio" name="jenis" value={k} checked={jenis === k} onChange={() => setJenis(k)} className="size-4" />
              {REPORTS[k]}
            </label>
          ))}
      </fieldset>
      {jenis === "rekap" ? (
        <div className="space-y-1.5">
          <Label htmlFor="bulan">Bulan</Label>
          <input id="bulan" type="month" name="bulan" defaultValue={today.slice(0, 7)} max={today.slice(0, 7)} required className={field} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="dari">Dari</Label>
            <input id="dari" type="date" name="dari" defaultValue={`${today.slice(0, 7)}-01`} required className={field} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sampai">Sampai</Label>
            <input id="sampai" type="date" name="sampai" defaultValue={today} required className={field} />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cabang">Cabang</Label>
          <select id="cabang" name="cabang" className={field}>
            <option value="">Semua</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dept">Departemen</Label>
          <select id="dept" name="dept" className={field}>
            <option value="">Semua</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="format" value="xlsx" className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
          Unduh Excel (.xlsx)
        </button>
        <button type="submit" name="format" value="csv" className="h-11 rounded-md border px-4 text-sm font-semibold">
          Unduh CSV
        </button>
      </div>
    </form>
  );
}
