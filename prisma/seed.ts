// Data awal: role, permission, matrix default, pengaturan sistem, dan Super Admin pertama.
// Aman dijalankan berulang (upsert). Jalankan: npx prisma db seed
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS, ROLE_MATRIX, ROLES, type RoleCode } from "../src/lib/permissions";
import { hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

const SETTINGS: Record<string, unknown> = {
  "gps.accuracy_threshold_m": 100,
  "gps.default_radius_m": 100,
  "attendance.max_shift_hours": 20,
  "photo.retention_months": 12,
  "leave.annual_days": 12,
  "leave.carry_over": false,
  "fingerprint.column_mapping": {},
};

const LEAVE_TYPES = [
  { code: "TAHUNAN", name: "Cuti Tahunan", deductsBalance: true, allowHalfDay: true },
  { code: "SAKIT", name: "Sakit", requiresAttachment: true },
  { code: "IZIN", name: "Izin Pribadi", allowHalfDay: true },
  { code: "MENIKAH", name: "Cuti Menikah", maxDaysPerRequest: 3 },
];

async function main() {
  for (const [code, description] of Object.entries(PERMISSIONS)) {
    await db.permission.upsert({ where: { code }, update: { description }, create: { code, description } });
  }
  const permissionIds = new Map((await db.permission.findMany()).map((p) => [p.code, p.id]));

  for (const [code, name] of Object.entries(ROLES)) {
    const role = await db.role.upsert({
      where: { code },
      update: { name },
      create: { code, name, isSystem: true },
    });
    // Matrix default hanya diisi saat role belum punya permission, agar perubahan admin tidak tertimpa.
    if ((await db.rolePermission.count({ where: { roleId: role.id } })) === 0) {
      await db.rolePermission.createMany({
        data: Object.entries(ROLE_MATRIX[code as RoleCode]).map(([perm, scope]) => ({
          roleId: role.id,
          permissionId: permissionIds.get(perm)!,
          scope: scope!,
        })),
      });
    }
  }

  // MVP satu perusahaan; nama diubah HR di menu Organisasi.
  if ((await db.company.count()) === 0) {
    await db.company.create({ data: { name: "Nama Perusahaan" } });
  }

  // Jenis cuti default (docs/DECISIONS.md); hanya dibuat bila belum ada, perubahan HR tidak ditimpa.
  for (const t of LEAVE_TYPES) await db.leaveType.upsert({ where: { code: t.code }, update: {}, create: t });

  for (const [key, value] of Object.entries(SETTINGS)) {
    await db.systemSetting.upsert({ where: { key }, update: {}, create: { key, value: value as never } });
  }

  const loginId = (process.env.SEED_ADMIN_LOGIN || "admin").toLowerCase();
  if (!(await db.user.findUnique({ where: { loginId } }))) {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password || password.length < 8) {
      throw new Error("Isi SEED_ADMIN_PASSWORD (minimal 8 karakter) di file .env untuk membuat Super Admin pertama.");
    }
    const superAdmin = await db.role.findUniqueOrThrow({ where: { code: "SUPER_ADMIN" } });
    const user = await db.user.create({
      data: {
        loginId,
        displayName: "Super Admin",
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        roles: { create: { roleId: superAdmin.id } },
      },
    });
    await db.auditLog.create({
      data: { action: "user.create", entityType: "user", entityId: user.id, after: { loginId, roles: ["SUPER_ADMIN"] }, reason: "seed" },
    });
    console.log(`Super Admin dibuat: login "${loginId}" (wajib ganti password saat login pertama).`);
  }
}

main()
  .then(() => console.log("Seed selesai."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
