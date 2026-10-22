"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";
import { Prisma } from "@/generated/prisma/client";
import { branchSchema, companySchema, holidaySchema, shiftSchema, simpleMasterSchema, workLocationSchema } from "@/lib/validators";
import { db } from "@/server/db";
import { writeAudit } from "@/server/audit";
import { requirePermission } from "@/server/auth";

export type OrgState = { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> } | undefined;

const PATH = "/organisasi";
const idSchema = z.union([z.literal(""), z.uuid()]).transform((v) => v || null);

const fields = (fd: FormData) => Object.fromEntries([...fd.keys()].map((k) => [k, fd.get(k)]));

/** Simpan (buat/ubah) satu baris master + audit; ubah error unik jadi pesan di field kode. */
async function save<T extends Record<string, unknown>>(
  entityType: string,
  formData: FormData,
  schema: z.ZodType<T>,
  write: {
    find: (id: string) => Promise<unknown>;
    create: (data: T) => Promise<{ id: string }>;
    update: (id: string, data: T) => Promise<unknown>;
  },
  uniqueMessage = "Kode sudah dipakai.",
): Promise<OrgState> {
  const { user } = await requirePermission("org.manage");
  const id = idSchema.safeParse(formData.get("id") ?? "");
  const parsed = schema.safeParse(fields(formData));
  if (!id.success) return { message: "Data tidak valid." };
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };

  try {
    if (id.data) {
      const before = await write.find(id.data);
      if (!before) return { message: "Data tidak ditemukan." };
      await write.update(id.data, parsed.data);
      await writeAudit({
        actorUserId: user.id,
        action: `${entityType}.update`,
        entityType,
        entityId: id.data,
        before: JSON.parse(JSON.stringify(before)),
        after: JSON.parse(JSON.stringify(parsed.data)),
      });
    } else {
      const created = await write.create(parsed.data);
      await writeAudit({
        actorUserId: user.id,
        action: `${entityType}.create`,
        entityType,
        entityId: created.id,
        after: JSON.parse(JSON.stringify(parsed.data)),
      });
    }
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { errors: { [entityType === "holiday" ? "date" : "code"]: [uniqueMessage] } };
    }
    throw e;
  }
  revalidatePath(PATH);
  return { ok: true, message: "Tersimpan." };
}

async function toggle(entityType: string, id: string, setActive: (id: string, active: boolean) => Promise<{ isActive: boolean }>, current: () => Promise<{ isActive: boolean } | null>) {
  const { user } = await requirePermission("org.manage");
  if (!z.uuid().safeParse(id).success) return;
  const before = await current();
  if (!before) return;
  const after = await setActive(id, !before.isActive);
  await writeAudit({ actorUserId: user.id, action: `${entityType}.${after.isActive ? "activate" : "deactivate"}`, entityType, entityId: id, before, after });
  revalidatePath(PATH);
}

// ---------- Perusahaan ----------

export async function saveCompany(_: OrgState, formData: FormData): Promise<OrgState> {
  const company = await db.company.findFirstOrThrow();
  formData.set("id", company.id);
  return save("company", formData, companySchema, {
    find: (id) => db.company.findUnique({ where: { id }, select: { name: true, legalName: true, address: true } }),
    create: () => Promise.reject(new Error("Perusahaan hanya satu")),
    update: (id, data) => db.company.update({ where: { id }, data }),
  });
}

// ---------- Cabang ----------

export async function saveBranch(_: OrgState, formData: FormData): Promise<OrgState> {
  return save("branch", formData, branchSchema, {
    find: (id) => db.branch.findUnique({ where: { id }, select: { code: true, name: true, address: true } }),
    create: async (data) => db.branch.create({ data: { ...data, companyId: (await db.company.findFirstOrThrow()).id } }),
    update: (id, data) => db.branch.update({ where: { id }, data }),
  });
}

export async function toggleBranch(id: string) {
  await toggle("branch", id, (id, isActive) => db.branch.update({ where: { id }, data: { isActive }, select: { isActive: true } }), () =>
    db.branch.findUnique({ where: { id }, select: { isActive: true } }),
  );
}

// ---------- Departemen & jabatan ----------

export async function saveDepartment(_: OrgState, formData: FormData): Promise<OrgState> {
  return save("department", formData, simpleMasterSchema, {
    find: (id) => db.department.findUnique({ where: { id }, select: { code: true, name: true } }),
    create: (data) => db.department.create({ data }),
    update: (id, data) => db.department.update({ where: { id }, data }),
  });
}

export async function toggleDepartment(id: string) {
  await toggle("department", id, (id, isActive) => db.department.update({ where: { id }, data: { isActive }, select: { isActive: true } }), () =>
    db.department.findUnique({ where: { id }, select: { isActive: true } }),
  );
}

export async function savePosition(_: OrgState, formData: FormData): Promise<OrgState> {
  return save("position", formData, simpleMasterSchema, {
    find: (id) => db.position.findUnique({ where: { id }, select: { code: true, name: true } }),
    create: (data) => db.position.create({ data }),
    update: (id, data) => db.position.update({ where: { id }, data }),
  });
}

export async function togglePosition(id: string) {
  await toggle("position", id, (id, isActive) => db.position.update({ where: { id }, data: { isActive }, select: { isActive: true } }), () =>
    db.position.findUnique({ where: { id }, select: { isActive: true } }),
  );
}

// ---------- Hari libur ----------

const holidayData = (d: z.infer<typeof holidaySchema>) => ({ name: d.name, branchId: d.branchId, date: new Date(d.date) });

export async function saveHoliday(_: OrgState, formData: FormData): Promise<OrgState> {
  return save(
    "holiday",
    formData,
    holidaySchema,
    {
      find: (id) => db.holiday.findUnique({ where: { id }, select: { date: true, name: true, branchId: true } }),
      create: (data) => db.holiday.create({ data: holidayData(data) }),
      update: (id, data) => db.holiday.update({ where: { id }, data: holidayData(data) }),
    },
    "Tanggal ini sudah ada hari liburnya untuk cabang yang sama.",
  );
}

/** Hari libur boleh dihapus (tidak dirujuk data lain); isi sebelum dihapus disimpan di audit log. */
export async function deleteHoliday(id: string) {
  const { user } = await requirePermission("org.manage");
  if (!z.uuid().safeParse(id).success) return;
  const before = await db.holiday.findUnique({ where: { id }, select: { date: true, name: true, branchId: true } });
  if (!before) return;
  await db.holiday.delete({ where: { id } });
  await writeAudit({ actorUserId: user.id, action: "holiday.delete", entityType: "holiday", entityId: id, before: JSON.parse(JSON.stringify(before)) });
  revalidatePath(PATH);
}

// ---------- Lokasi kerja ----------

export async function saveWorkLocation(_: OrgState, formData: FormData): Promise<OrgState> {
  return save("work_location", formData, workLocationSchema, {
    find: (id) =>
      db.workLocation.findUnique({ where: { id }, select: { branchId: true, name: true, latitude: true, longitude: true, radiusM: true } }),
    create: (data) => db.workLocation.create({ data }),
    update: (id, data) => db.workLocation.update({ where: { id }, data }),
  });
}

export async function toggleWorkLocation(id: string) {
  await toggle("work_location", id, (id, isActive) => db.workLocation.update({ where: { id }, data: { isActive }, select: { isActive: true } }), () =>
    db.workLocation.findUnique({ where: { id }, select: { isActive: true } }),
  );
}

// ---------- Shift ----------

export async function saveShift(_: OrgState, formData: FormData): Promise<OrgState> {
  return save("shift", formData, shiftSchema, {
    find: (id) =>
      db.shift.findUnique({ where: { id }, select: { code: true, name: true, startMinute: true, endMinute: true, lateToleranceMin: true, clockInWindowMin: true } }),
    create: (data) => db.shift.create({ data }),
    update: (id, data) => db.shift.update({ where: { id }, data }),
  });
}

export async function toggleShift(id: string) {
  await toggle("shift", id, (id, isActive) => db.shift.update({ where: { id }, data: { isActive }, select: { isActive: true } }), () =>
    db.shift.findUnique({ where: { id }, select: { isActive: true } }),
  );
}
