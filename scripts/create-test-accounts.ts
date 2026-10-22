// Membuat akun uji di database DEV (jangan dijalankan di production).
// Password acak ditulis ke .env.test-accounts (di-ignore Git). Jalankan: npx tsx scripts/create-test-accounts.ts
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateTempPassword, hashPassword } from "../src/lib/password";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

const ACCOUNTS = [
  { loginId: "uji-admin", displayName: "Uji Super Admin", role: "SUPER_ADMIN" },
  { loginId: "uji-karyawan", displayName: "Uji Karyawan", role: "EMPLOYEE" },
  { loginId: "uji-hr", displayName: "Uji HR Admin", role: "HR_ADMIN" },
  { loginId: "uji-supervisor", displayName: "Uji Supervisor", role: "SUPERVISOR" },
];

async function main() {
  const lines = ["# Akun uji DEV (dibuat scripts/create-test-accounts.ts). Jangan dipakai di production."];
  for (const a of ACCOUNTS) {
    const password = generateTempPassword();
    const role = await db.role.findUniqueOrThrow({ where: { code: a.role } });
    const data = { displayName: a.displayName, passwordHash: await hashPassword(password), mustChangePassword: true, isActive: true };
    const user = await db.user.upsert({
      where: { loginId: a.loginId },
      update: data,
      create: { loginId: a.loginId, ...data, roles: { create: { roleId: role.id } } },
    });
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.loginAttempt.deleteMany({ where: { identifier: a.loginId } });
    lines.push(`${a.loginId.toUpperCase().replace("-", "_")}_PASSWORD="${password}"`);
  }
  writeFileSync(".env.test-accounts", lines.join("\n") + "\n");
  console.log(`Akun uji siap: ${ACCOUNTS.map((a) => a.loginId).join(", ")} (password di .env.test-accounts)`);
}

main().finally(() => db.$disconnect());
