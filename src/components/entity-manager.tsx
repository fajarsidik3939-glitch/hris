"use client";

import dynamic from "next/dynamic";
import { useActionState, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const MapPicker = dynamic(() => import("./map-picker").then((m) => m.MapPicker), { ssr: false });

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "date" | "number" | "time" | "select";
  options?: { value: string; label: string }[];
  required?: boolean;
};

export type Row = { id: string; values: Record<string, string>; cells: React.ReactNode[]; isActive?: boolean };

type State = { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> } | undefined;

/**
 * Tabel + form tambah/ubah untuk data master organisasi.
 * `withMap` menambahkan peta yang terhubung ke field latitude/longitude/radiusM.
 */
export function EntityManager({
  title,
  fields,
  columns,
  rows,
  save,
  toggle,
  remove,
  withMap,
  confirmEdit,
}: {
  title: string;
  fields: FieldDef[];
  columns: string[];
  rows: Row[];
  save: (state: State, formData: FormData) => Promise<State>;
  toggle?: (id: string) => Promise<void>;
  remove?: (id: string) => Promise<void>;
  withMap?: boolean;
  confirmEdit?: string;
}) {
  const empty = Object.fromEntries(fields.map((f) => [f.name, f.type === "select" ? "" : f.name === "radiusM" ? "100" : ""]));
  const [editing, setEditing] = useState<string | null>(null); // null = tutup, "" = tambah, id = ubah
  const [values, setValues] = useState<Record<string, string>>(empty);
  const [state, action, pending] = useActionState(async (prev: State, formData: FormData) => {
    const result = await save(prev, formData);
    if (result?.ok) setEditing(null);
    return result;
  }, undefined);
  const [busy, startTransition] = useTransition();

  const open = (row?: Row) => {
    setValues(row ? { ...empty, ...row.values } : empty);
    setEditing(row?.id ?? "");
  };
  const set = (name: string, value: string) => setValues((v) => ({ ...v, [name]: value }));
  const num = (v: string | undefined) => (v === undefined || v === "" || isNaN(Number(v)) ? null : Number(v));

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        {editing === null && (
          <Button size="sm" onClick={() => open()}>
            + Tambah
          </Button>
        )}
      </div>

      {state?.ok && state.message && editing === null && (
        <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.message}
        </p>
      )}

      {editing !== null && (
        <form
          action={action}
          onSubmit={(e) => {
            if (editing && confirmEdit && !window.confirm(confirmEdit)) e.preventDefault();
          }}
          className="space-y-4 rounded-lg border bg-white p-4"
        >
          <input type="hidden" name="id" value={editing} />
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => {
              const err = state?.errors?.[f.name];
              const common = {
                id: `f-${f.name}`,
                name: f.name,
                required: f.required,
                value: values[f.name] ?? "",
                "aria-invalid": err ? true : undefined,
                "aria-describedby": err ? `f-${f.name}-error` : undefined,
              };
              return (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={common.id}>{f.label}</Label>
                  {f.type === "select" ? (
                    <select
                      {...common}
                      onChange={(e) => set(f.name, e.target.value)}
                      className="h-11 w-full rounded-md border bg-white px-3 text-base md:text-sm"
                    >
                      <option value="">— Pilih —</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      {...common}
                      type={f.type ?? "text"}
                      step={f.type === "number" ? "any" : undefined}
                      onChange={(e) => set(f.name, e.target.value)}
                      className="h-11 text-base md:text-sm"
                    />
                  )}
                  {err && (
                    <p id={`f-${f.name}-error`} className="text-sm text-destructive">
                      {err[0]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {withMap && (
            <MapPicker
              latitude={num(values.latitude)}
              longitude={num(values.longitude)}
              radiusM={num(values.radiusM) ?? 0}
              onPick={(lat, lng) => setValues((v) => ({ ...v, latitude: String(lat), longitude: String(lng) }))}
            />
          )}
          {state?.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
              Batal
            </Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Belum ada data. Klik “+ Tambah”.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
                {toggle && <TableHead>Status</TableHead>}
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={row.isActive === false ? "opacity-60" : undefined}>
                  {row.cells.map((c, i) => (
                    <TableCell key={i} className="whitespace-normal">
                      {c}
                    </TableCell>
                  ))}
                  {toggle && (
                    <TableCell>
                      {row.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-700">Nonaktif</Badge>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="space-x-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="outline" onClick={() => open(row)}>
                      Ubah
                    </Button>
                    {toggle && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm(row.isActive ? "Nonaktifkan data ini? Data tidak bisa dipilih untuk karyawan baru." : "Aktifkan kembali?"))
                            startTransition(() => toggle(row.id));
                        }}
                      >
                        {row.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                    )}
                    {remove && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Hapus data ini?")) startTransition(() => remove(row.id));
                        }}
                      >
                        Hapus
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
