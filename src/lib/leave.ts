// Logika murni cuti (docs/DATABASE_DESIGN.md §5.7).
import { addDays } from "./attendance";

/** Hari cuti = hari kerja terjadwal dalam rentang (libur & off tidak dihitung); setengah hari = 0,5. */
export function countLeaveDays(start: string, end: string, halfDay: boolean, isWorkDay: (date: string) => boolean): number {
  let days = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) if (isWorkDay(d)) days++;
  return halfDay ? days * 0.5 : days;
}

/** Tanggal "YYYY-MM-DD" ditambah n tahun (29 Feb → 1 Mar di tahun bukan kabisat). */
function addYears(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Periode hak cuti tahunan yang berlaku pada `today`: tahun ulang tahun masa kerja terakhir (≥ 12 bulan).
 * null = belum genap 12 bulan bekerja. Sisa periode lama tidak terbawa (leave.carry_over = false).
 */
export function currentLeavePeriod(hireDate: string, today: string): { year: number; start: string; end: string } | null {
  if (addYears(hireDate, 1) > today) return null;
  let n = Number(today.slice(0, 4)) - Number(hireDate.slice(0, 4));
  while (addYears(hireDate, n) > today) n--;
  const start = addYears(hireDate, n);
  return { year: Number(start.slice(0, 4)), start, end: addDays(addYears(hireDate, n + 1), -1) };
}

/** Dua rentang tanggal (inklusif) beririsan? */
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart <= bEnd && bStart <= aEnd;
