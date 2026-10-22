import * as z from "zod";
import { ROLES } from "./permissions";
import { ATTENDANCE_METHODS, EMPLOYMENT_TYPES, WORK_TYPES } from "./org";

export const loginSchema = z.object({
  loginId: z.string().trim().toLowerCase().min(1, { error: "ID atau email wajib diisi." }).max(100),
  password: z.string().min(1, { error: "Password wajib diisi." }).max(200),
});

export const newPasswordSchema = z
  .string()
  .min(8, { error: "Password minimal 8 karakter." })
  .max(200)
  .regex(/[a-zA-Z]/, { error: "Password harus mengandung huruf." })
  .regex(/[0-9]/, { error: "Password harus mengandung angka." });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Password lama wajib diisi." }),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    error: "Konfirmasi password tidak sama.",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    error: "Password baru harus berbeda dari password lama.",
    path: ["newPassword"],
  });

const roleCodes = z.array(z.enum(Object.keys(ROLES) as [keyof typeof ROLES, ...(keyof typeof ROLES)[]]));

export const createUserSchema = z.object({
  loginId: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { error: "ID login minimal 3 karakter." })
    .max(50)
    .regex(/^[a-z0-9._-]+$/, { error: "ID login hanya boleh huruf, angka, titik, minus, garis bawah." }),
  displayName: z.string().trim().min(2, { error: "Nama minimal 2 karakter." }).max(100),
  email: z
    .union([z.literal(""), z.email({ error: "Format email tidak valid." })])
    .transform((v) => (v ? v.toLowerCase() : null)),
  roles: roleCodes.min(1, { error: "Pilih minimal satu role." }),
});

export const setRolesSchema = z.object({
  userId: z.uuid(),
  roles: roleCodes.min(1, { error: "Pilih minimal satu role." }),
});

// ---------- Organisasi & karyawan ----------

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const code = z
  .string()
  .trim()
  .toUpperCase()
  .min(1, { error: "Kode wajib diisi." })
  .max(20)
  .regex(/^[A-Z0-9_-]+$/, { error: "Kode hanya huruf, angka, minus, garis bawah." });

const isoDate = z.iso.date({ error: "Tanggal tidak valid." });

export const companySchema = z.object({
  name: z.string().trim().min(2, { error: "Nama perusahaan wajib diisi." }).max(150),
  legalName: optionalText(150),
  address: optionalText(300),
});

export const branchSchema = z.object({
  code,
  name: z.string().trim().min(2, { error: "Nama cabang wajib diisi." }).max(100),
  address: optionalText(300),
});

export const simpleMasterSchema = z.object({
  code,
  name: z.string().trim().min(2, { error: "Nama wajib diisi." }).max(100),
});

export const holidaySchema = z.object({
  date: isoDate,
  name: z.string().trim().min(2, { error: "Nama hari libur wajib diisi." }).max(100),
  branchId: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
});

export const workLocationSchema = z.object({
  branchId: z.uuid({ error: "Pilih cabang." }),
  name: z.string().trim().min(2, { error: "Nama lokasi wajib diisi." }).max(100),
  latitude: z.coerce.number({ error: "Latitude tidak valid." }).min(-90).max(90),
  longitude: z.coerce.number({ error: "Longitude tidak valid." }).min(-180).max(180),
  radiusM: z.coerce
    .number({ error: "Radius tidak valid." })
    .int({ error: "Radius harus bilangan bulat." })
    .min(10, { error: "Radius minimal 10 meter." })
    .max(5000, { error: "Radius maksimal 5000 meter." }),
});

const enumOf = <T extends Record<string, string>>(obj: T) =>
  z.enum(Object.keys(obj) as [keyof T & string, ...(keyof T & string)[]], { error: "Pilih salah satu." });

export const employeeSchema = z
  .object({
    employeeCode: code,
    fullName: z.string().trim().min(2, { error: "Nama wajib diisi." }).max(150),
    email: z
      .union([z.literal(""), z.email({ error: "Format email tidak valid." })])
      .transform((v) => (v ? v.toLowerCase() : null)),
    phone: optionalText(30),
    branchId: z.uuid({ error: "Pilih cabang." }),
    departmentId: z.uuid({ error: "Pilih departemen." }),
    positionId: z.uuid({ error: "Pilih jabatan." }),
    managerId: z.union([z.literal(""), z.uuid()]).transform((v) => v || null),
    hireDate: isoDate,
    employmentType: enumOf(EMPLOYMENT_TYPES),
    workType: enumOf(WORK_TYPES),
    attendanceMethod: enumOf(ATTENDANCE_METHODS),
    fingerprintUserId: optionalText(30),
    workDays: z
      .array(z.coerce.number().int().min(1).max(7))
      .min(1, { error: "Pilih minimal satu hari kerja." })
      .transform((d) => [...new Set(d)].sort((a, b) => a - b)),
  })
  .refine((d) => d.attendanceMethod === "SELFIE_GPS" || d.fingerprintUserId, {
    error: "ID fingerprint wajib diisi untuk metode absen fingerprint.",
    path: ["fingerprintUserId"],
  });

export const deactivateEmployeeSchema = z.object({
  employeeId: z.uuid(),
  endDate: isoDate,
  reason: z.string().trim().min(5, { error: "Alasan minimal 5 karakter." }).max(300),
});

/** Role yang boleh diberikan HR saat membuat akun karyawan; role HR/Admin hanya lewat Super Admin. */
export const HR_ASSIGNABLE_ROLES = ["EMPLOYEE", "SUPERVISOR", "DEPT_MANAGER"] as const;

export const employeeAccountSchema = z.object({
  employeeId: z.uuid(),
  roles: z.array(z.enum(HR_ASSIGNABLE_ROLES)).min(1, { error: "Pilih minimal satu role." }),
});
