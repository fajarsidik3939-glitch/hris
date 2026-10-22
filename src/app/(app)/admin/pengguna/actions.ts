"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { createUserSchema, setRolesSchema } from "@/lib/validators";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";

export type UserActionState =
  | { ok?: boolean; message?: string; tempPassword?: string; errors?: Record<string, string[] | undefined> }
  | undefined;

const PATH = "/admin/pengguna";

export async function createUser(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const { user: actor } = await requirePermission("user.manage");
  const parsed = createUserSchema.safeParse({
    loginId: formData.get("loginId"),
    displayName: formData.get("displayName"),
    email: formData.get("email") ?? "",
    roles: formData.getAll("roles"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const { loginId, displayName, email, roles } = parsed.data;

  const clash = await db.user.findFirst({
    where: { OR: [{ loginId }, ...(email ? [{ email }, { loginId: email }] : []), { email: loginId }] },
    select: { id: true },
  });
  if (clash) return { errors: { loginId: ["ID login atau email sudah dipakai."] } };

  const tempPassword = generateTempPassword();
  // Hash di luar transaksi agar transaksi tidak tertahan selama proses scrypt.
  const passwordHash = await hashPassword(tempPassword);
  const roleRows = await db.role.findMany({ where: { code: { in: roles } }, select: { id: true } });
  await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        loginId,
        displayName,
        email,
        passwordHash,
        mustChangePassword: true,
        roles: { create: roleRows.map((r) => ({ roleId: r.id })) },
      },
    });
    await writeAudit(
      { actorUserId: actor.id, action: "user.create", entityType: "user", entityId: user.id, after: { loginId, displayName, email, roles } },
      tx,
    );
  });

  revalidatePath(PATH);
  return { ok: true, message: `Akun "${loginId}" dibuat.`, tempPassword };
}

export async function setUserActive(userId: string, active: boolean): Promise<UserActionState> {
  const { user: actor } = await requirePermission("user.manage");
  if (!z.uuid().safeParse(userId).success) return { message: "Data tidak valid." };
  if (userId === actor.id) return { message: "Anda tidak bisa menonaktifkan akun sendiri." };

  await db.$transaction(async (tx) => {
    const before = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { isActive: true } });
    await tx.user.update({ where: { id: userId }, data: { isActive: active } });
    if (!active) await tx.session.deleteMany({ where: { userId } });
    await writeAudit(
      { actorUserId: actor.id, action: active ? "user.activate" : "user.deactivate", entityType: "user", entityId: userId, before, after: { isActive: active } },
      tx,
    );
  });
  revalidatePath(PATH);
  return { ok: true, message: active ? "Akun diaktifkan." : "Akun dinonaktifkan dan semua sesinya dihapus." };
}

export async function resetPassword(userId: string): Promise<UserActionState> {
  const { user: actor } = await requirePermission("user.manage");
  if (!z.uuid().safeParse(userId).success) return { message: "Data tidak valid." };
  if (userId === actor.id) return { message: "Untuk akun sendiri, gunakan menu Ganti password." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
    });
    await tx.session.deleteMany({ where: { userId } });
    await writeAudit({ actorUserId: actor.id, action: "user.reset_password", entityType: "user", entityId: userId }, tx);
  });
  revalidatePath(PATH);
  return { ok: true, message: "Password direset. Berikan password sementara ini kepada pengguna:", tempPassword };
}

export async function setUserRoles(_: UserActionState, formData: FormData): Promise<UserActionState> {
  const { user: actor } = await requirePermission("user.manage");
  const parsed = setRolesSchema.safeParse({ userId: formData.get("userId"), roles: formData.getAll("roles") });
  if (!parsed.success) return { message: z.flattenError(parsed.error).fieldErrors.roles?.[0] ?? "Data tidak valid." };
  const { userId, roles } = parsed.data;

  if (userId === actor.id && !roles.includes("SUPER_ADMIN")) {
    return { message: "Anda tidak bisa mencabut role Super Admin dari akun sendiri." };
  }

  await db.$transaction(async (tx) => {
    const before = (await tx.userRole.findMany({ where: { userId }, select: { role: { select: { code: true } } } })).map((r) => r.role.code);
    const roleRows = await tx.role.findMany({ where: { code: { in: roles } }, select: { id: true } });
    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRole.createMany({ data: roleRows.map((r) => ({ userId, roleId: r.id })) });
    await writeAudit(
      { actorUserId: actor.id, action: "user.set_roles", entityType: "user", entityId: userId, before: { roles: before }, after: { roles } },
      tx,
    );
  });
  revalidatePath(PATH);
  return { ok: true, message: "Role diperbarui." };
}
