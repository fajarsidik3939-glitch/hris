// Format tanggal/jam Indonesia, selalu zona WIB (docs/UI_UX_PLAN.md §1).
const TZ = "Asia/Jakarta";

/** "Rabu, 22 Okt 2026" */
export function formatDateLong(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** Kolom `date` (tanpa jam) disimpan sebagai UTC 00:00 — format di UTC agar tanggal tidak bergeser. */
export function formatDateOnly(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** Date (kolom date) → "2026-10-22" untuk input type=date. */
export const toIsoDate = (d: Date) => d.toISOString().slice(0, 10);

/** "22 Okt 2026 07.58" */
export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
