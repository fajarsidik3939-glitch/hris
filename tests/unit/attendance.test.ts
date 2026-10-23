import { describe, expect, it } from "vitest";
import {
  decideAction,
  computeRecord,
  correctionTimes,
  dayStatus,
  earlyLeaveMinutes,
  haversineM,
  isJpeg,
  isoWeekday,
  lateMinutes,
  locationLabel,
  minuteToTime,
  resolveWorkDate,
  scheduleFor,
  shiftResolver,
  timeToMinute,
  wibDate,
} from "@/lib/attendance";

// Jam WIB → instant UTC
const wib = (s: string) => new Date(`${s}+07:00`);
const pagi = { startMinute: 8 * 60, endMinute: 17 * 60, clockInWindowMin: 240 };
const malam = { startMinute: 22 * 60, endMinute: 6 * 60, clockInWindowMin: 240 };
const weekdays = [1, 2, 3, 4, 5];

describe("tanggal & jam WIB", () => {
  it("tanggal WIB berganti pukul 00:00 WIB, bukan UTC", () => {
    expect(wibDate(wib("2026-10-22T23:30:00"))).toBe("2026-10-22");
    expect(wibDate(wib("2026-10-23T00:10:00"))).toBe("2026-10-23");
  });
  it("hari ISO", () => {
    expect(isoWeekday("2026-10-22")).toBe(4); // Kamis
    expect(isoWeekday("2026-10-25")).toBe(7); // Minggu
  });
  it("konversi jam", () => {
    expect(minuteToTime(22 * 60 + 5)).toBe("22:05");
    expect(timeToMinute("07:30")).toBe(450);
    expect(timeToMinute("24:00")).toBeNull();
  });
});

describe("jadwal & tanggal kerja", () => {
  const P = { ...pagi, id: "P", lateToleranceMin: 15 };
  const M = { ...malam, id: "M", lateToleranceMin: 15 };
  const on = (def: typeof P | null, overrides: [string, typeof P | null][] = [], holidays: string[] = []) =>
    shiftResolver({ defaultShift: def, workDays: weekdays, holidays: new Set(holidays), overrides: new Map(overrides) });

  it("shift malam selesai keesokan hari", () => {
    const s = scheduleFor("2026-10-22", malam);
    expect(s.start).toEqual(wib("2026-10-22T22:00:00"));
    expect(s.end).toEqual(wib("2026-10-23T06:00:00"));
  });

  it("clock-in 21:50 dan clock-out 06:05 → tanggal kerja hari pertama", () => {
    expect(resolveWorkDate(wib("2026-10-22T21:50:00"), on(M)).workDate).toBe("2026-10-22");
    expect(resolveWorkDate(wib("2026-10-23T05:30:00"), on(M)).workDate).toBe("2026-10-22");
  });

  it("shift pagi: jendela mulai 4 jam sebelum jam masuk", () => {
    const r = resolveWorkDate(wib("2026-10-22T07:58:00"), on(P));
    expect(r.workDate).toBe("2026-10-22");
    expect(r.schedule?.start).toEqual(wib("2026-10-22T08:00:00"));
    expect(resolveWorkDate(wib("2026-10-22T03:00:00"), on(P)).schedule).toBeNull();
  });

  it("hari libur / bukan hari kerja / tanpa shift → tetap diterima, tanpa jadwal", () => {
    expect(resolveWorkDate(wib("2026-10-22T08:00:00"), on(P, [], ["2026-10-22"])).schedule).toBeNull();
    expect(resolveWorkDate(wib("2026-10-25T08:00:00"), on(P))).toMatchObject({ workDate: "2026-10-25", schedule: null });
    expect(resolveWorkDate(wib("2026-10-22T08:00:00"), on(null)).workDate).toBe("2026-10-22");
  });

  it("jadwal per tanggal menang: rotasi ke shift malam, libur di hari kerja, masuk di hari Minggu/libur", () => {
    expect(on(P, [["2026-10-22", M]])("2026-10-22")?.id).toBe("M");
    expect(on(P, [["2026-10-22", null]])("2026-10-22")).toBeNull();
    expect(on(P, [["2026-10-25", P]], ["2026-10-25"])("2026-10-25")?.id).toBe("P");
  });
});

describe("terlambat & pulang awal", () => {
  const start = wib("2026-10-22T08:00:00");
  it("dalam toleransi = 0; lewat toleransi dihitung dari jam masuk", () => {
    expect(lateMinutes(wib("2026-10-22T08:15:00"), start, 15)).toBe(0);
    expect(lateMinutes(wib("2026-10-22T08:21:30"), start, 15)).toBe(21);
    expect(lateMinutes(wib("2026-10-22T07:50:00"), start, 15)).toBe(0);
  });
  it("pulang awal", () => {
    expect(earlyLeaveMinutes(wib("2026-10-22T16:30:00"), wib("2026-10-22T17:00:00"))).toBe(30);
    expect(earlyLeaveMinutes(wib("2026-10-22T17:05:00"), wib("2026-10-22T17:00:00"))).toBe(0);
  });
});

describe("label lokasi", () => {
  const locations = [{ id: "L1", latitude: -6.3, longitude: 107.15, radiusM: 100 }];
  const base = { workType: "OFFICE", accuracyM: 12, accuracyThresholdM: 100, locations };

  it("haversine: 0,001° lintang ≈ 111 m", () => {
    expect(Math.round(haversineM(-6.3, 107.15, -6.301, 107.15))).toBe(111);
  });
  it("dalam / luar radius", () => {
    expect(locationLabel({ ...base, latitude: -6.3003, longitude: 107.15 })).toMatchObject({ label: "IN_RADIUS", distanceM: 33, locationId: "L1" });
    expect(locationLabel({ ...base, latitude: -6.311, longitude: 107.15 }).label).toBe("OUT_OF_RADIUS");
  });
  it("tanpa koordinat atau akurasi buruk → Akurasi rendah (tetap diterima)", () => {
    expect(locationLabel({ ...base, latitude: null, longitude: null }).label).toBe("LOW_ACCURACY");
    expect(locationLabel({ ...base, latitude: -6.3, longitude: 107.15, accuracyM: 240 }).label).toBe("LOW_ACCURACY");
  });
  it("karyawan lapangan → Lapangan; cabang tanpa lokasi → Luar radius", () => {
    expect(locationLabel({ ...base, workType: "FIELD", latitude: -7, longitude: 110 }).label).toBe("FIELD");
    expect(locationLabel({ ...base, locations: [], latitude: -6.3, longitude: 107.15 })).toMatchObject({ label: "OUT_OF_RADIUS", distanceM: null });
  });
});

it("deteksi JPEG dari isi file", () => {
  expect(isJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe(true);
  expect(isJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
});

describe("masuk atau pulang", () => {
  const rec = (workDate: string, inAt: string, outAt: string | null) => ({ workDate, clockInAt: wib(inAt), clockOutAt: outAt ? wib(outAt) : null });

  it("tanpa absensi terakhir → masuk", () => {
    expect(decideAction(wib("2026-10-22T07:55:00"), null, "2026-10-22")).toBe("IN");
  });
  it("absensi terbuka → pulang; < 30 menit → dobel", () => {
    expect(decideAction(wib("2026-10-22T17:00:00"), rec("2026-10-22", "2026-10-22T08:00:00", null), "2026-10-22")).toBe("OUT");
    expect(decideAction(wib("2026-10-22T08:10:00"), rec("2026-10-22", "2026-10-22T08:00:00", null), "2026-10-22")).toBe("TOO_SOON");
  });
  it("shift siang selesai, besok pagi masuk lagi → masuk (bukan pulang kemarin)", () => {
    expect(decideAction(wib("2026-10-23T06:50:00"), rec("2026-10-22", "2026-10-22T15:00:00", "2026-10-22T23:00:00"), "2026-10-23")).toBe("IN");
  });
  it("sudah pulang, tap lagi di tanggal kerja yang sama → clock-out ulang", () => {
    expect(decideAction(wib("2026-10-22T17:30:00"), rec("2026-10-22", "2026-10-22T08:00:00", "2026-10-22T17:00:00"), "2026-10-22")).toBe("OUT");
  });
});

describe("status harian (rekap)", () => {
  const sched = scheduleFor("2026-10-22", pagi); // 08:00–17:00
  const rec = (inAt: string | null, outAt: string | null, late = 0) => ({ clockInAt: inAt ? wib(inAt) : null, clockOutAt: outAt ? wib(outAt) : null, lateMinutes: late });
  const at = wib("2026-10-22T12:00:00");
  const after = wib("2026-10-22T18:00:00");

  it("terjadwal tanpa absen: belum absen saat shift berjalan, tidak hadir setelah selesai", () => {
    expect(dayStatus(at, "2026-10-22", sched, null)).toBe("BELUM_ABSEN");
    expect(dayStatus(after, "2026-10-22", sched, null)).toBe("TIDAK_HADIR");
  });
  it("tidak terjadwal & tanpa absen → libur (bukan tidak hadir)", () => {
    expect(dayStatus(after, "2026-10-25", null, null)).toBe("LIBUR");
  });
  it("hadir / terlambat / belum clock-out", () => {
    expect(dayStatus(after, "2026-10-22", sched, rec("2026-10-22T07:55:00", "2026-10-22T17:00:00"))).toBe("HADIR");
    expect(dayStatus(after, "2026-10-22", sched, rec("2026-10-22T08:30:00", "2026-10-22T17:00:00", 30))).toBe("TERLAMBAT");
    expect(dayStatus(at, "2026-10-22", sched, rec("2026-10-22T07:55:00", null))).toBe("HADIR");
    expect(dayStatus(after, "2026-10-22", sched, rec("2026-10-22T07:55:00", null))).toBe("BELUM_CLOCK_OUT");
  });
  it("cuti disetujui di hari kerja → Cuti/Izin (bukan tidak hadir); setengah hari dinilai dari absen", () => {
    expect(dayStatus(after, "2026-10-22", sched, null, { halfDay: false })).toBe("CUTI");
    expect(dayStatus(after, "2026-10-22", sched, null, { halfDay: true })).toBe("TIDAK_HADIR");
    expect(dayStatus(after, "2026-10-25", null, null, { halfDay: false })).toBe("LIBUR");
  });
  it("absen tanpa jadwal: belum clock-out baru setelah tanggalnya lewat", () => {
    expect(dayStatus(wib("2026-10-25T20:00:00"), "2026-10-25", null, rec("2026-10-25T09:00:00", null))).toBe("HADIR");
    expect(dayStatus(wib("2026-10-26T08:00:00"), "2026-10-25", null, rec("2026-10-25T09:00:00", null))).toBe("BELUM_CLOCK_OUT");
  });
});

describe("koreksi absensi", () => {
  it("jam pulang < jam masuk = keesokan hari (shift malam)", () => {
    const t = correctionTimes("2026-10-22", "22:00", "06:00");
    expect(t.inAt).toEqual(wib("2026-10-22T22:00:00"));
    expect(t.outAt).toEqual(wib("2026-10-23T06:00:00"));
  });
  it("hanya jam pulang (lupa clock-out)", () => {
    expect(correctionTimes("2026-10-22", null, "17:00")).toEqual({ inAt: null, outAt: wib("2026-10-22T17:00:00") });
  });
  it("hitung ulang record setelah koreksi", () => {
    const s = scheduleFor("2026-10-22", pagi);
    expect(computeRecord(wib("2026-10-22T08:20:00"), wib("2026-10-22T16:30:00"), s, 15)).toEqual({ lateMinutes: 20, earlyLeaveMinutes: 30, workMinutes: 490 });
    expect(computeRecord(wib("2026-10-22T08:00:00"), null, s, 15)).toEqual({ lateMinutes: 0, earlyLeaveMinutes: 0, workMinutes: 0 });
  });
});
