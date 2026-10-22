import "server-only";
import { db } from "./db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_ACCOUNT = 5;
// Batas per IP lebih longgar: satu kantor bisa berbagi satu IP publik.
const MAX_PER_IP = 30;

/** true jika login untuk akun/IP ini sedang diblokir. */
export async function isLoginBlocked(identifier: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byAccount, byIp] = await Promise.all([
    db.loginAttempt.count({ where: { identifier, success: false, createdAt: { gte: since } } }),
    db.loginAttempt.count({ where: { ip, success: false, createdAt: { gte: since } } }),
  ]);
  return byAccount >= MAX_PER_ACCOUNT || byIp >= MAX_PER_IP;
}

export async function recordLoginAttempt(identifier: string, ip: string, success: boolean) {
  await db.loginAttempt.create({ data: { identifier, ip, success } });
}
