// Logika murni absensi (docs/DATABASE_DESIGN.md §5.1–5.5). Semua waktu = Date (instant UTC).

// shortcut: semua cabang WIB (UTC+7, tanpa DST); pakai branches.timezone bila ada cabang WITA/WIT.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

/** Tanggal kalender WIB "YYYY-MM-DD" dari sebuah instant. */
export const wibDate = (d: Date) => new Date(d.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);

/** Hari ISO (1 = Senin … 7 = Minggu) dari "YYYY-MM-DD". */
export const isoWeekday = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay() || 7;

export const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

/** "HH:MM" dari menit sejak 00:00. */
export const minuteToTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Menit sejak 00:00 dari "HH:MM", atau null bila tidak valid. */
export function timeToMinute(t: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(t);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export type ShiftTimes = { startMinute: number; endMinute: number; clockInWindowMin: number };

/** Jadwal shift yang dimulai pada tanggal WIB `date`; end < start berarti selesai keesokan hari. */
export function scheduleFor(date: string, s: ShiftTimes) {
  const midnight = Date.parse(`${date}T00:00:00Z`) - WIB_OFFSET_MS;
  const start = new Date(midnight + s.startMinute * MIN);
  const end = new Date(midnight + s.endMinute * MIN + (s.endMinute <= s.startMinute ? DAY : 0));
  return { start, end };
}

export type ShiftOnDate = (date: string) => (ShiftTimes & { id: string; lateToleranceMin: number }) | null;

/**
 * Shift yang berlaku pada tanggal WIB `date` (§5.1): jadwal per tanggal menang (shift null = libur);
 * tanpa jadwal per tanggal → hari libur = libur, selain itu shift default bila hari kerja.
 */
export function shiftResolver<S extends ShiftTimes & { id: string; lateToleranceMin: number }>(opts: {
  defaultShift: S | null;
  workDays: number[];
  holidays: Set<string>;
  overrides: Map<string, S | null>;
}): (date: string) => S | null {
  return (date) => {
    if (opts.overrides.has(date)) return opts.overrides.get(date) ?? null;
    if (opts.holidays.has(date) || !opts.workDays.includes(isoWeekday(date))) return null;
    return opts.defaultShift;
  };
}

/**
 * Tanggal kerja untuk clock-in pada `now`: jadwal hari ini atau kemarin (shift malam) yang jendelanya
 * [mulai − clockInWindow, selesai] memuat `now`. Tanpa jadwal yang cocok → tanggal WIB hari ini, tanpa jadwal.
 */
export function resolveWorkDate(now: Date, shiftOn: ShiftOnDate) {
  const today = wibDate(now);
  for (const date of [today, addDays(today, -1)]) {
    const shift = shiftOn(date);
    if (!shift) continue;
    const s = scheduleFor(date, shift);
    if (now.getTime() >= s.start.getTime() - shift.clockInWindowMin * MIN && now <= s.end) return { workDate: date, schedule: s, shift };
  }
  return { workDate: today, schedule: null, shift: null };
}

/** Terlambat (menit) dihitung dari jam mulai, hanya bila melewati toleransi. */
export function lateMinutes(clockIn: Date, start: Date, toleranceMin: number) {
  const diff = clockIn.getTime() - start.getTime();
  return diff > toleranceMin * MIN ? Math.floor(diff / MIN) : 0;
}

export const earlyLeaveMinutes = (clockOut: Date, end: Date) => Math.max(0, Math.floor((end.getTime() - clockOut.getTime()) / MIN));
export const minutesBetween = (a: Date, b: Date) => Math.max(0, Math.floor((b.getTime() - a.getTime()) / MIN));

/** Jarak dua titik di permukaan bumi (meter), rumus haversine. */
export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const rad = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type Label = "IN_RADIUS" | "OUT_OF_RADIUS" | "LOW_ACCURACY" | "FIELD";
type Loc = { id: string; latitude: number; longitude: number; radiusM: number };

/** Label lokasi (§5.3). Tidak pernah menolak absensi; label hanya untuk pemeriksaan HR. */
export function locationLabel(input: {
  workType: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  accuracyThresholdM: number;
  locations: Loc[];
}): { label: Label; distanceM: number | null; locationId: string | null } {
  const { latitude: lat, longitude: lng } = input;
  let nearest: { loc: Loc; d: number } | null = null;
  if (lat !== null && lng !== null) {
    for (const loc of input.locations) {
      const d = haversineM(lat, lng, loc.latitude, loc.longitude);
      if (!nearest || d < nearest.d) nearest = { loc, d };
    }
  }
  const distanceM = nearest ? Math.round(nearest.d) : null;
  const locationId = nearest?.loc.id ?? null;
  if (input.workType === "FIELD") return { label: "FIELD", distanceM, locationId };
  if (lat === null || lng === null || input.accuracyM === null || input.accuracyM > input.accuracyThresholdM)
    return { label: "LOW_ACCURACY", distanceM, locationId };
  return { label: nearest && nearest.d <= nearest.loc.radiusM ? "IN_RADIUS" : "OUT_OF_RADIUS", distanceM, locationId };
}

export const LABELS: Record<string, string> = {
  IN_RADIUS: "Dalam radius",
  OUT_OF_RADIUS: "Luar radius",
  LOW_ACCURACY: "Akurasi rendah",
  FIELD: "Lapangan",
  FINGERPRINT: "Fingerprint",
};

/** true bila isi file diawali tanda JPEG (FF D8 FF). */
export const isJpeg = (bytes: Uint8Array) => bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

const MIN_SHIFT_MS = 30 * MIN; // tap kedua < 30 menit setelah clock-in dianggap dobel

/**
 * Tap berikutnya = masuk atau pulang. `recent` = absensi terakhir dalam batas durasi shift.
 * Pulang hanya bila absensi masih terbuka, atau sudah pulang tapi tanggal kerjanya sama (clock-out ulang).
 */
export function decideAction(
  now: Date,
  recent: { workDate: string; clockInAt: Date; clockOutAt: Date | null } | null,
  resolvedWorkDate: string,
): "IN" | "OUT" | "TOO_SOON" {
  if (!recent) return "IN";
  if (!recent.clockOutAt) return now.getTime() - recent.clockInAt.getTime() < MIN_SHIFT_MS ? "TOO_SOON" : "OUT";
  return recent.workDate === resolvedWorkDate ? "OUT" : "IN";
}

/** Jam absen hasil gabungan + hitungan terlambat/pulang awal/durasi untuk satu tanggal kerja. */
export function computeRecord(clockIn: Date | null, clockOut: Date | null, schedule: { start: Date; end: Date } | null, lateToleranceMin: number) {
  return {
    lateMinutes: clockIn && schedule ? lateMinutes(clockIn, schedule.start, lateToleranceMin) : 0,
    earlyLeaveMinutes: clockOut && schedule ? earlyLeaveMinutes(clockOut, schedule.end) : 0,
    workMinutes: clockIn && clockOut ? minutesBetween(clockIn, clockOut) : 0,
  };
}

/** Jam koreksi "HH:MM" (WIB) pada tanggal kerja; jam pulang lebih awal dari jam masuk = keesokan hari (shift malam). */
export function correctionTimes(workDate: string, clockIn: string | null, clockOut: string | null) {
  const at = (date: string, t: string) => new Date(`${date}T${t}:00+07:00`);
  const inAt = clockIn ? at(workDate, clockIn) : null;
  let outAt = clockOut ? at(workDate, clockOut) : null;
  if (inAt && outAt && outAt <= inAt) outAt = at(addDays(workDate, 1), clockOut!);
  return { inAt, outAt };
}

export type DayStatus = "LIBUR" | "HADIR" | "TERLAMBAT" | "BELUM_CLOCK_OUT" | "TIDAK_HADIR" | "BELUM_ABSEN";

export const DAY_STATUS: Record<DayStatus, string> = {
  LIBUR: "Libur",
  HADIR: "Hadir",
  TERLAMBAT: "Terlambat",
  BELUM_CLOCK_OUT: "Belum clock-out",
  TIDAK_HADIR: "Tidak hadir",
  BELUM_ABSEN: "Belum absen",
};

/**
 * Status satu karyawan pada satu tanggal kerja (§5.6). Dihitung saat dibaca, tidak disimpan.
 * "Tidak hadir" hanya bila terjadwal kerja, jadwalnya sudah selesai, dan tidak ada absen.
 * shortcut: cuti/izin/sakit belum ada (M5); setelah M5 cuti disetujui dicek sebelum "Tidak hadir".
 */
export function dayStatus(
  now: Date,
  workDate: string,
  schedule: { start: Date; end: Date } | null,
  record: { clockInAt: Date | null; clockOutAt: Date | null; lateMinutes: number } | null,
): DayStatus {
  if (record?.clockInAt) {
    // Tanpa jadwal: "belum clock-out" baru setelah tanggal kerjanya lewat.
    const end = schedule?.end ?? new Date(`${addDays(workDate, 1)}T00:00:00+07:00`);
    if (!record.clockOutAt && now > end) return "BELUM_CLOCK_OUT";
    return record.lateMinutes > 0 ? "TERLAMBAT" : "HADIR";
  }
  if (!schedule) return "LIBUR";
  return now > schedule.end ? "TIDAK_HADIR" : "BELUM_ABSEN";
}
