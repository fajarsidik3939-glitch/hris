// Data CONTOH organisasi & karyawan untuk database DEV (jangan dijalankan di production).
// Aman diulang (upsert). Menghubungkan akun uji ke data karyawan. Jalankan: npx tsx scripts/sample-org.ts
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

// Koordinat perkiraan kawasan industri (contoh), bukan lokasi pabrik sebenarnya.
const BRANCHES = [
  { code: "CKR", name: "Cikarang", lat: -6.29, lng: 107.16 },
  { code: "KRW", name: "Karawang", lat: -6.37, lng: 107.29 },
  { code: "BKS", name: "Bekasi", lat: -6.3, lng: 107.06 },
];
const DEPARTMENTS = [
  ["PROD", "Produksi"],
  ["GDG", "Gudang"],
  ["QC", "Quality Control"],
  ["HRGA", "HR & GA"],
  ["FIN", "Keuangan"],
];
const POSITIONS = [
  ["OPR", "Operator"],
  ["STF", "Staf"],
  ["SPV", "Supervisor"],
  ["MGR", "Manager"],
];
// [kode, nama, cabang, dept, jabatan, atasan, tipe kerja, metode, id fingerprint, akun uji]
const EMPLOYEES: [string, string, string, string, string, string | null, "OFFICE" | "SHIFT" | "FIELD", "SELFIE_GPS" | "FINGERPRINT" | "BOTH", string | null, string | null][] = [
  ["EMP-0001", "Rudi Hartono", "CKR", "PROD", "MGR", null, "OFFICE", "SELFIE_GPS", null, null],
  ["EMP-0002", "Uji Supervisor", "CKR", "PROD", "SPV", "EMP-0001", "OFFICE", "BOTH", "1002", "uji-supervisor"],
  ["EMP-0003", "Uji Karyawan", "CKR", "PROD", "OPR", "EMP-0002", "SHIFT", "BOTH", "1003", "uji-karyawan"],
  ["EMP-0004", "Siti Aminah", "CKR", "PROD", "OPR", "EMP-0002", "SHIFT", "FINGERPRINT", "1004", null],
  ["EMP-0005", "Andi Pratama", "KRW", "GDG", "SPV", null, "SHIFT", "BOTH", "2005", null],
  ["EMP-0006", "Dewi Lestari", "BKS", "QC", "STF", null, "FIELD", "SELFIE_GPS", null, null],
  ["EMP-0007", "Joko Susilo", "KRW", "GDG", "OPR", "EMP-0005", "SHIFT", "FINGERPRINT", "2007", null],
  ["EMP-0008", "Rina Wati", "CKR", "HRGA", "STF", null, "OFFICE", "SELFIE_GPS", null, null],
];

async function main() {
  const company = await db.company.findFirstOrThrow();
  const branchId: Record<string, string> = {};
  for (const b of BRANCHES) {
    const row = await db.branch.upsert({ where: { code: b.code }, update: {}, create: { code: b.code, name: b.name, companyId: company.id } });
    branchId[b.code] = row.id;
    if ((await db.workLocation.count({ where: { branchId: row.id } })) === 0) {
      await db.workLocation.create({ data: { branchId: row.id, name: `Pabrik ${b.name}`, latitude: b.lat, longitude: b.lng, radiusM: 100 } });
    }
  }
  const deptId: Record<string, string> = {};
  for (const [code, name] of DEPARTMENTS) deptId[code] = (await db.department.upsert({ where: { code }, update: {}, create: { code, name } })).id;
  const posId: Record<string, string> = {};
  for (const [code, name] of POSITIONS) posId[code] = (await db.position.upsert({ where: { code }, update: {}, create: { code, name } })).id;

  const empId: Record<string, string> = {};
  for (const [code, fullName, br, dept, pos, manager, workType, method, fp, account] of EMPLOYEES) {
    const user = account ? await db.user.findUnique({ where: { loginId: account } }) : null;
    if (user) await db.user.update({ where: { id: user.id }, data: { isActive: true } });
    const data = {
      fullName,
      branchId: branchId[br],
      departmentId: deptId[dept],
      positionId: posId[pos],
      managerId: manager ? empId[manager] : null,
      workType,
      attendanceMethod: method,
      fingerprintUserId: fp,
      userId: user?.id ?? null,
    };
    const row = await db.employee.upsert({
      where: { employeeCode: code },
      update: data,
      create: { ...data, employeeCode: code, hireDate: new Date("2023-01-02"), employmentType: "PKWTT" },
    });
    empId[code] = row.id;
  }

  for (const [date, name] of [
    ["2026-12-25", "Hari Raya Natal"],
    ["2027-01-01", "Tahun Baru 2027 Masehi"],
  ]) {
    const exists = await db.holiday.findFirst({ where: { date: new Date(date), branchId: null } });
    if (!exists) await db.holiday.create({ data: { date: new Date(date), name } });
  }
  console.log("Data contoh siap: 3 cabang, 5 departemen, 4 jabatan, 8 karyawan, 2 hari libur.");
}

main().finally(() => db.$disconnect());
