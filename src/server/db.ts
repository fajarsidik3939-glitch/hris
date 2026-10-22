import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Satu instance per proses (hot reload di dev tidak membuat koneksi baru terus).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Membuka koneksi baru ke pooler Supabase kadang butuh 9–16 detik (terukur 2026-10-23), sedangkan
// query hanya ~50 ms; koneksi idle dipertahankan 5 menit (default pg: 10 detik) agar jarang membuka baru.
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, idleTimeoutMillis: 5 * 60 * 1000 }) });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
