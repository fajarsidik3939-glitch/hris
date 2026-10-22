"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { changePasswordSchema, loginSchema } from "@/lib/validators";
import { hashPassword, verifyPassword } from "@/lib/password";
import { db } from "@/server/db";
import { requestMeta, writeAudit } from "@/server/audit";
import { isLoginBlocked, recordLoginAttempt } from "@/server/rate-limit";
import { createSession, deleteCurrentSession, getSessionFromCookie } from "@/server/session";
import { requireUser } from "@/server/auth";

export type FormState = { message?: string; errors?: Record<string, string[] | undefined> } | undefined;

// Hash palsu agar waktu respons sama saat ID tidak ditemukan (mencegah tebak-tebakan akun).
const DUMMY_HASH = hashPassword("dummy-password-for-timing");

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const { loginId, password } = parsed.data;
  const meta = await requestMeta();

  if (await isLoginBlocked(loginId, meta.ip)) {
    return { message: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit." };
  }

  const user = await db.user.findFirst({
    where: { OR: [{ loginId }, { email: loginId }] },
    select: { id: true, passwordHash: true, isActive: true, mustChangePassword: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash ?? (await DUMMY_HASH));

  if (!user || !valid || !user.isActive) {
    await recordLoginAttempt(loginId, meta.ip, false);
    return { message: "ID/email atau password salah, atau akun tidak aktif." };
  }

  await recordLoginAttempt(loginId, meta.ip, true);
  await createSession(user.id, meta);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await writeAudit({ actorUserId: user.id, action: "auth.login", entityType: "user", entityId: user.id });

  redirect(user.mustChangePassword ? "/ganti-password" : "/beranda");
}

export async function logout() {
  const session = await getSessionFromCookie();
  if (session) {
    await writeAudit({ actorUserId: session.userId, action: "auth.logout", entityType: "user", entityId: session.userId });
  }
  await deleteCurrentSession();
  redirect("/login");
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowPendingPasswordChange: true });
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  const current = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(parsed.data.currentPassword, current.passwordHash))) {
    return { errors: { currentPassword: ["Password lama salah."] } };
  }

  const session = await getSessionFromCookie();
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.newPassword), mustChangePassword: false },
    });
    // Keluarkan sesi di perangkat lain; sesi ini tetap aktif.
    await tx.session.deleteMany({ where: { userId: user.id, NOT: { id: session?.id } } });
    await writeAudit({ actorUserId: user.id, action: "auth.change_password", entityType: "user", entityId: user.id }, tx);
  });

  redirect("/beranda");
}
