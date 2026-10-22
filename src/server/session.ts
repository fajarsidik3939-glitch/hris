import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";

export const SESSION_COOKIE = "hris_session";
const IDLE_MS = 12 * 60 * 60 * 1000; // sesi berakhir setelah 12 jam tidak aktif
const EXTEND_AFTER_MS = 5 * 60 * 1000; // perpanjang paling sering tiap 5 menit
const COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60; // batas berlaku sebenarnya dipegang database

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string, meta: { ip: string; userAgent: string | null }) {
  const token = randomBytes(32).toString("base64url");
  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + IDLE_MS),
      ip: meta.ip,
      userAgent: meta.userAgent,
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_S,
  });
}

/** Ambil sesi valid dari cookie; perpanjang masa aktif (sliding) di database. */
export async function getSessionFromCookie() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!session) return null;

  const now = Date.now();
  if (session.expiresAt.getTime() <= now) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (session.expiresAt.getTime() - now < IDLE_MS - EXTEND_AFTER_MS) {
    await db.session.update({ where: { id: session.id }, data: { expiresAt: new Date(now + IDLE_MS) } });
  }
  return session;
}

export async function deleteCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  store.delete(SESSION_COOKIE);
}
