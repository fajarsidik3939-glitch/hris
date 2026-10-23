import { expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

it("CSV untuk Excel Indonesia: ; pemisah, desimal koma, tanggal dd/mm/yyyy, kutip aman, BOM", () => {
  const csv = toCsv(
    [{ header: "Nama" }, { header: "Tanggal", type: "date" }, { header: "Jam", type: "number" }, { header: "Alasan" }],
    [
      ["Budi", new Date("2026-10-05T00:00:00Z"), 8.5, 'Acara "keluarga"; pulang kampung'],
      ["Siti", null, 0, ""],
    ],
  );
  expect(csv.startsWith("﻿")).toBe(true);
  expect(csv.slice(1).split("\r\n")).toEqual(["Nama;Tanggal;Jam;Alasan", 'Budi;05/10/2026;8,5;"Acara ""keluarga""; pulang kampung"', "Siti;;0;", ""]);
});
