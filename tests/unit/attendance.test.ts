import { describe, expect, it } from "vitest";
import {
  earlyLeaveMinutes,
  haversineM,
  isJpeg,
  isoWeekday,
  lateMinutes,
  locationLabel,
  minuteToTime,
  resolveWorkDate,
  scheduleFor,
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
  it("shift malam selesai keesokan hari", () => {
    const s = scheduleFor("2026-10-22", malam);
    expect(s.start).toEqual(wib("2026-10-22T22:00:00"));
    expect(s.end).toEqual(wib("2026-10-23T06:00:00"));
  });

  it("clock-in 21:50 dan clock-out 06:05 → tanggal kerja hari pertama", () => {
    expect(resolveWorkDate(wib("2026-10-22T21:50:00"), malam, weekdays, new Set()).workDate).toBe("2026-10-22");
    // Jumat 23 Okt 05:30 masih dalam shift Kamis malam
    expect(resolveWorkDate(wib("2026-10-23T05:30:00"), malam, weekdays, new Set()).workDate).toBe("2026-10-22");
  });

  it("shift pagi: jendela mulai 4 jam sebelum jam masuk", () => {
    const r = resolveWorkDate(wib("2026-10-22T07:58:00"), pagi, weekdays, new Set());
    expect(r.workDate).toBe("2026-10-22");
    expect(r.schedule?.start).toEqual(wib("2026-10-22T08:00:00"));
    expect(resolveWorkDate(wib("2026-10-22T03:00:00"), pagi, weekdays, new Set()).schedule).toBeNull();
  });

  it("hari libur / bukan hari kerja / tanpa shift → tetap diterima, tanpa jadwal", () => {
    expect(resolveWorkDate(wib("2026-10-22T08:00:00"), pagi, weekdays, new Set(["2026-10-22"])).schedule).toBeNull();
    expect(resolveWorkDate(wib("2026-10-25T08:00:00"), pagi, weekdays, new Set())).toEqual({ workDate: "2026-10-25", schedule: null });
    expect(resolveWorkDate(wib("2026-10-22T08:00:00"), null, weekdays, new Set()).workDate).toBe("2026-10-22");
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
