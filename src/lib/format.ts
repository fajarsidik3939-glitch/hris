// Format tanggal/jam Indonesia, selalu zona WIB (docs/UI_UX_PLAN.md §1).
const TZ = "Asia/Jakarta";

/** "Rabu, 22 Okt 2026" */
export function formatDateLong(d: Date): string {
  return new Intl.DateTimeFormat("id-ID", { timeZone: TZ, weekday: "long", day: "numeric", month: "short", year: "numeric" }).format(d);
}

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
