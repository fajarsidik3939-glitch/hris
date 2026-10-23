import { describe, expect, it } from "vitest";
import { isoWeekday } from "@/lib/attendance";
import { countLeaveDays, currentLeavePeriod, overlaps } from "@/lib/leave";

const weekdayNotHoliday = (holidays: string[]) => (d: string) => isoWeekday(d) <= 5 && !holidays.includes(d);

describe("jumlah hari cuti", () => {
  it("Sabtu, Minggu, dan hari libur tidak dihitung", () => {
    // Jum 23 – Rab 28 Okt 2026: Jum, Sen, Sel, Rab = 4 hari; Sel 27 libur → 3
    expect(countLeaveDays("2026-10-23", "2026-10-28", false, weekdayNotHoliday([]))).toBe(4);
    expect(countLeaveDays("2026-10-23", "2026-10-28", false, weekdayNotHoliday(["2026-10-27"]))).toBe(3);
  });
  it("setengah hari = 0,5; setengah hari di hari libur = 0", () => {
    expect(countLeaveDays("2026-10-22", "2026-10-22", true, weekdayNotHoliday([]))).toBe(0.5);
    expect(countLeaveDays("2026-10-25", "2026-10-25", true, weekdayNotHoliday([]))).toBe(0);
  });
});

describe("periode hak cuti tahunan", () => {
  it("belum 12 bulan → belum dapat hak", () => {
    expect(currentLeavePeriod("2026-01-15", "2026-10-23")).toBeNull();
    expect(currentLeavePeriod("2025-10-24", "2026-10-23")).toBeNull();
  });
  it("tepat genap 12 bulan → periode dimulai hari itu", () => {
    expect(currentLeavePeriod("2025-10-23", "2026-10-23")).toEqual({ year: 2026, start: "2026-10-23", end: "2027-10-22" });
  });
  it("periode = ulang tahun masa kerja terakhir", () => {
    expect(currentLeavePeriod("2023-01-02", "2026-10-23")).toEqual({ year: 2026, start: "2026-01-02", end: "2027-01-01" });
    expect(currentLeavePeriod("2020-11-30", "2026-10-23")).toEqual({ year: 2025, start: "2025-11-30", end: "2026-11-29" });
  });
});

it("rentang tanggal beririsan", () => {
  expect(overlaps("2026-10-26", "2026-10-28", "2026-10-28", "2026-10-30")).toBe(true);
  expect(overlaps("2026-10-26", "2026-10-27", "2026-10-28", "2026-10-30")).toBe(false);
});
