// Role, permission, dan matrix default (docs/DATABASE_DESIGN.md §4).
// Dipakai oleh seed; saat runtime, hak akses dibaca dari database agar bisa diubah.

export type Scope = "OWN" | "TEAM" | "DEPARTMENT" | "ALL";

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  HR_MANAGER: "HR Manager",
  HR_ADMIN: "HR Admin",
  DEPT_MANAGER: "Department Manager",
  SUPERVISOR: "Supervisor",
  EMPLOYEE: "Employee",
} as const;

export type RoleCode = keyof typeof ROLES;

export const PERMISSIONS = {
  "attendance.clock": "Absen (clock-in/out) diri sendiri",
  "attendance.read": "Lihat data absensi",
  "attendance.photo.read": "Lihat foto & lokasi absensi",
  "attendance.correction.request": "Ajukan koreksi absensi",
  "attendance.export": "Ekspor rekap absensi",
  "fingerprint.import": "Impor data fingerprint",
  "leave.request": "Ajukan cuti/izin",
  "leave.read": "Lihat data cuti/izin",
  "leave.balance.adjust": "Sesuaikan saldo cuti",
  "approval.manager": "Approval tahap atasan",
  "approval.hr": "Approval tahap HR",
  "employee.read": "Lihat data karyawan",
  "employee.manage": "Kelola data karyawan",
  "schedule.read": "Lihat jadwal",
  "schedule.manage": "Kelola jadwal",
  "org.manage": "Kelola organisasi, lokasi, hari libur, shift, jenis cuti",
  "report.read": "Lihat laporan",
  "user.manage": "Kelola akun pengguna",
  "role.manage": "Kelola role & permission",
  "audit.read": "Lihat audit log",
  "settings.manage": "Kelola pengaturan sistem",
} as const;

export type PermissionCode = keyof typeof PERMISSIONS;

const SELF: Partial<Record<PermissionCode, Scope>> = {
  "attendance.clock": "OWN",
  "attendance.correction.request": "OWN",
  "leave.request": "OWN",
};

const HR: Partial<Record<PermissionCode, Scope>> = {
  ...SELF,
  "attendance.read": "ALL",
  "attendance.photo.read": "ALL",
  "attendance.export": "ALL",
  "fingerprint.import": "ALL",
  "leave.read": "ALL",
  "approval.hr": "ALL",
  "employee.read": "ALL",
  "employee.manage": "ALL",
  "schedule.read": "ALL",
  "schedule.manage": "ALL",
  "org.manage": "ALL",
  "report.read": "ALL",
};

const manager = (scope: Scope): Partial<Record<PermissionCode, Scope>> => ({
  ...SELF,
  "attendance.read": scope,
  "attendance.photo.read": scope,
  "attendance.export": scope,
  "leave.read": scope,
  "approval.manager": scope,
  "employee.read": scope,
  "schedule.read": scope,
  "report.read": scope,
});

export const ROLE_MATRIX: Record<RoleCode, Partial<Record<PermissionCode, Scope>>> = {
  EMPLOYEE: {
    ...SELF,
    "attendance.read": "OWN",
    "attendance.photo.read": "OWN",
    "leave.read": "OWN",
    "employee.read": "OWN",
    "schedule.read": "OWN",
  },
  SUPERVISOR: manager("TEAM"),
  DEPT_MANAGER: manager("DEPARTMENT"),
  HR_ADMIN: HR,
  HR_MANAGER: {
    ...HR,
    "leave.balance.adjust": "ALL",
    "audit.read": "ALL",
    "settings.manage": "ALL",
  },
  // Sengaja tanpa akses data absensi/foto (pemisahan tugas IT vs HR).
  SUPER_ADMIN: {
    "employee.read": "ALL",
    "org.manage": "ALL",
    "user.manage": "ALL",
    "role.manage": "ALL",
    "audit.read": "ALL",
    "settings.manage": "ALL",
  },
};

const RANK: Record<Scope, number> = { OWN: 0, TEAM: 1, DEPARTMENT: 2, ALL: 3 };

/** Gabungkan permission dari beberapa role; ambil scope terluas. */
export function mergePermissions(
  rows: { code: string; scope: Scope }[],
): Map<string, Scope> {
  const result = new Map<string, Scope>();
  for (const { code, scope } of rows) {
    const current = result.get(code);
    if (!current || RANK[scope] > RANK[current]) result.set(code, scope);
  }
  return result;
}
