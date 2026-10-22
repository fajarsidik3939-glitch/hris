import "server-only";
import { db } from "./db";

/** Nilai angka dari system_settings, atau `fallback` bila belum diisi/tidak valid. */
export async function numberSetting(key: string, fallback: number): Promise<number> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  return typeof row?.value === "number" ? row.value : fallback;
}
