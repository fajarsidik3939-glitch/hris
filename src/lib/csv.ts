// CSV untuk Excel berlokal Indonesia: pemisah ";", desimal koma, tanggal dd/mm/yyyy, BOM UTF-8.
export type Cell = string | number | Date | null;
export type Column = { header: string; type?: "date" | "number" | "text" };

const pad = (n: number) => String(n).padStart(2, "0");

export function formatCell(v: Cell, type: Column["type"] = "text"): string {
  if (v === null || v === "") return "";
  if (v instanceof Date) return `${pad(v.getUTCDate())}/${pad(v.getUTCMonth() + 1)}/${v.getUTCFullYear()}`;
  if (typeof v === "number") return type === "number" ? String(v).replace(".", ",") : String(v);
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(columns: Column[], rows: Cell[][]): string {
  const lines = [columns.map((c) => formatCell(c.header)).join(";"), ...rows.map((r) => r.map((v, i) => formatCell(v, columns[i].type)).join(";"))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
