import * as z from "zod";
import { ROLES } from "./permissions";

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
