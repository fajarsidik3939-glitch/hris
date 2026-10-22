"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { wouldCreateCycle } from "@/lib/org";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { deactivateEmployeeSchema, employeeAccountSchema, employeeSchema } from "@/lib/validators";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";

export type EmployeeState =
  | { ok?: boolean; message?: string; tempPassword?: string; errors?: Record<string, string[] | undefined> }
  | undefined;

const toJson = (v: unknown) => JSON.parse(JSON.stringify(v));

export async function saveEmployee(_: EmployeeState, formData: FormData): Promise<EmployeeState> {
  const { user } = await requirePermission("employee.manage");
  const idParsed = z.union([z.literal(""), z.uuid()]).safeParse(formData.get("id") ?? "");
  const parsed = employeeSchema.safeParse({
    ...Object.fromEntries([...formData.keys()].map((k) => [k, formData.get(k)])),
    workDays: formData.getAll("workDays"),
  });
  if (!idParsed.success) return { message: "Data tidak valid." };
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const id = idParsed.data || null;
  const d = parsed.data;

  const notSelf = id ? { NOT: { id } } : {};
  const [codeTaken, fpTaken] = await Promise.all([
    db.employee.count({ where: { employeeCode: d.employeeCode, ...notSelf } }),
    d.fingerprintUserId ? db.employee.count({ where: { fingerprintUserId: d.fingerprintUserId, ...notSelf } }) : 0,
  ]);
  if (codeTaken || fpTaken) {
    return {
      errors: {
        ...(codeTaken ? { employeeCode: ["NIK karyawan sudah dipakai."] } : {}),
        ...(fpTaken ? { fingerprintUserId: ["ID fingerprint sudah dipakai karyawan lain."] } : {}),
      },
    };
  }

  if (d.managerId) {
    const manager = await db.employee.findUnique({ where: { id: d.managerId }, select: { status: true } });
    if (!manager || manager.status !== "ACTIVE") return { errors: { managerId: ["Atasan harus karyawan aktif."] } };
    if (id) {
      const all = await db.employee.findMany({ select: { id: true, managerId: true } });
      if (wouldCreateCycle(id, d.managerId, new Map(all.map((e) => [e.id, e.managerId])))) {
        return { errors: { managerId: ["Atasan ini membuat struktur melingkar (atasan tidak boleh diri sendiri atau bawahannya)."] } };
      }
    }
  }

  const data = { ...d, hireDate: new Date(d.hireDate) };
  let savedId: string;
  try {
    if (id) {
      const before = await db.employee.findUnique({ where: { id } });
      if (!before) return { message: "Karyawan tidak ditemukan." };
      await db.employee.update({ where: { id }, data });
      await writeAudit({ actorUserId: user.id, action: "employee.update", entityType: "employee", entityId: id, before: toJson(before), after: toJson(data) });
      savedId = id;
    } else {
      const created = await db.employee.create({ data });
      await writeAudit({ actorUserId: user.id, action: "employee.create", entityType: "employee", entityId: created.id, after: toJson(data) });
      savedId = created.id;
    }
  } catch (e) {
    // Cadangan bila dua HR menyimpan data yang sama pada saat bersamaan.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { message: "NIK atau ID fingerprint baru saja dipakai data lain. Periksa lalu simpan ulang." };
    }
    throw e;
  }

  revalidatePath("/karyawan");
  redirect(`/karyawan/${savedId}`);
}

export async function deactivateEmployee(_: EmployeeState, formData: FormData): Promise<EmployeeState> {
  const { user } = await requirePermission("employee.manage");
  const parsed = deactivateEmployeeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const { employeeId, endDate, reason } = parsed.data;

  const emp = await db.employee.findUnique({ where: { id: employeeId }, select: { status: true, hireDate: true, userId: true, endDate: true } });
  if (!emp) return { message: "Karyawan tidak ditemukan." };
  if (emp.status === "INACTIVE") return { message: "Karyawan sudah nonaktif." };
  if (new Date(endDate) < emp.hireDate) return { errors: { endDate: ["Tanggal keluar tidak boleh sebelum tanggal masuk."] } };
  if (emp.userId === user.id) return { message: "Anda tidak bisa menonaktifkan data karyawan Anda sendiri." };

  await db.$transaction(async (tx) => {
    await tx.employee.update({ where: { id: employeeId }, data: { status: "INACTIVE", endDate: new Date(endDate) } });
    if (emp.userId) {
      await tx.user.update({ where: { id: emp.userId }, data: { isActive: false } });
      await tx.session.deleteMany({ where: { userId: emp.userId } });
    }
    await writeAudit(
      {
        actorUserId: user.id,
        action: "employee.deactivate",
        entityType: "employee",
        entityId: employeeId,
        before: { status: emp.status, endDate: emp.endDate },
        after: { status: "INACTIVE", endDate, accountDisabled: Boolean(emp.userId) },
        reason,
      },
      tx,
    );
  });
  revalidatePath(`/karyawan/${employeeId}`);
  return { ok: true, message: "Karyawan dinonaktifkan. Akun loginnya ikut dinonaktifkan." };
}

export async function reactivateEmployee(employeeId: string) {
  const { user } = await requirePermission("employee.manage");
  if (!z.uuid().safeParse(employeeId).success) return;
  const emp = await db.employee.findUnique({ where: { id: employeeId }, select: { status: true, endDate: true, userId: true } });
  if (!emp || emp.status === "ACTIVE") return;
  await db.$transaction(async (tx) => {
    await tx.employee.update({ where: { id: employeeId }, data: { status: "ACTIVE", endDate: null } });
    if (emp.userId) await tx.user.update({ where: { id: emp.userId }, data: { isActive: true } });
    await writeAudit(
      { actorUserId: user.id, action: "employee.reactivate", entityType: "employee", entityId: employeeId, before: toJson(emp), after: { status: "ACTIVE", endDate: null } },
      tx,
    );
  });
  revalidatePath(`/karyawan/${employeeId}`);
}

/** Buat akun login untuk karyawan: ID login = NIK karyawan, password sementara tampil sekali. */
export async function createEmployeeAccount(_: EmployeeState, formData: FormData): Promise<EmployeeState> {
  const { user } = await requirePermission("employee.manage");
  const parsed = employeeAccountSchema.safeParse({ employeeId: formData.get("employeeId"), roles: formData.getAll("roles") });
  if (!parsed.success) return { message: z.flattenError(parsed.error).fieldErrors.roles?.[0] ?? "Data tidak valid." };
  const { employeeId, roles } = parsed.data;

  const emp = await db.employee.findUnique({ where: { id: employeeId }, select: { employeeCode: true, fullName: true, email: true, status: true, userId: true } });
  if (!emp) return { message: "Karyawan tidak ditemukan." };
  if (emp.status !== "ACTIVE") return { message: "Karyawan nonaktif tidak bisa dibuatkan akun." };
  if (emp.userId) return { message: "Karyawan ini sudah punya akun." };

  const loginId = emp.employeeCode.toLowerCase();
  const email = emp.email;
  const clash = await db.user.findFirst({
    where: { OR: [{ loginId }, { email: loginId }, ...(email ? [{ email }, { loginId: email }] : [])] },
    select: { id: true },
  });
  if (clash) return { message: `ID login "${loginId}" atau email karyawan sudah dipakai akun lain.` };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const roleRows = await db.role.findMany({ where: { code: { in: roles } }, select: { id: true } });
  await db.$transaction(async (tx) => {
    const account = await tx.user.create({
      data: { loginId, email, displayName: emp.fullName, passwordHash, mustChangePassword: true, roles: { create: roleRows.map((r) => ({ roleId: r.id })) } },
    });
    await tx.employee.update({ where: { id: employeeId }, data: { userId: account.id } });
    await writeAudit(
      { actorUserId: user.id, action: "user.create", entityType: "user", entityId: account.id, after: { loginId, roles, employeeId } },
      tx,
    );
  });
  revalidatePath(`/karyawan/${employeeId}`);
  return { ok: true, message: `Akun dibuat. ID login: ${loginId}. Berikan password sementara ini:`, tempPassword };
}
