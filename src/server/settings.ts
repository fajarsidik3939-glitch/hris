import "server-only";
import { db } from "./db";

/** Nilai angka dari system_settings, atau `fallback` bila belum diisi/tidak valid. */
export async function numberSetting(key: string, fallback: number): Promise<number> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  return typeof row?.value === "number" ? row.value : fallback;
}

/** Batas waktu retensi foto absensi (photo.retention_months, default 12). */
export async function photoRetentionCutoff() {
  const months = await numberSetting("photo.retention_months", 12);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  return { months, cutoff };
}
