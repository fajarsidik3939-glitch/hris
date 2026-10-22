// Logika murni organisasi/karyawan (tanpa database) agar mudah diuji.

/**
 * true jika menjadikan `newManagerId` atasan `employeeId` membentuk siklus
 * (termasuk atasan = diri sendiri). `managerOf` memetakan id karyawan → id atasannya.
 */
export function wouldCreateCycle(
  employeeId: string,
  newManagerId: string | null,
  managerOf: ReadonlyMap<string, string | null>,
): boolean {
  const seen = new Set<string>();
  for (let cur = newManagerId; cur; cur = managerOf.get(cur) ?? null) {
    if (cur === employeeId) return true;
    if (seen.has(cur)) return true; // data lama sudah bersiklus; tolak juga
    seen.add(cur);
  }
  return false;
}

export const WEEKDAYS = [
  { value: 1, label: "Sen" },
  { value: 2, label: "Sel" },
  { value: 3, label: "Rab" },
  { value: 4, label: "Kam" },
  { value: 5, label: "Jum" },
  { value: 6, label: "Sab" },
  { value: 7, label: "Min" },
] as const;

export const EMPLOYMENT_TYPES = { PKWTT: "Tetap (PKWTT)", PKWT: "Kontrak (PKWT)", HARIAN: "Harian", MAGANG: "Magang" } as const;
export const WORK_TYPES = { OFFICE: "Kantor", SHIFT: "Shift", FIELD: "Lapangan" } as const;
export const ATTENDANCE_METHODS = { SELFIE_GPS: "Selfie GPS", FINGERPRINT: "Fingerprint", BOTH: "Selfie GPS + Fingerprint" } as const;
