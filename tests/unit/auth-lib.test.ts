import { describe, expect, it } from "vitest";
import { generateTempPassword, hashPassword, verifyPassword } from "@/lib/password";
import { mergePermissions, PERMISSIONS, ROLE_MATRIX } from "@/lib/permissions";
import { changePasswordSchema, createUserSchema, loginSchema } from "@/lib/validators";

describe("password", () => {
  it("hash bukan plaintext dan bisa diverifikasi", async () => {
    const hash = await hashPassword("Rahasia123");
    expect(hash).toMatch(/^scrypt\$131072\$8\$1\$/);
    expect(hash).not.toContain("Rahasia123");
    expect(await verifyPassword("Rahasia123", hash)).toBe(true);
    expect(await verifyPassword("rahasia123", hash)).toBe(false);
  });

  it("salt acak: hash berbeda untuk password sama", async () => {
    expect(await hashPassword("Rahasia123")).not.toBe(await hashPassword("Rahasia123"));
  });

  it("format tersimpan rusak dianggap salah, bukan error", async () => {
    expect(await verifyPassword("x", "bcrypt$abc")).toBe(false);
    expect(await verifyPassword("x", "")).toBe(false);
  });

  it("password sementara memenuhi aturan password baru", () => {
    for (let i = 0; i < 20; i++) {
      const p = generateTempPassword();
      expect(p).toMatch(/^[A-Za-z2-9]{4}-[A-Za-z2-9]{4}-[A-Za-z2-9]{4}$/);
    }
  });
});

describe("permissions", () => {
  it("scope terluas menang saat role digabung", () => {
    const merged = mergePermissions([
      { code: "attendance.read", scope: "OWN" },
      { code: "attendance.read", scope: "DEPARTMENT" },
      { code: "attendance.read", scope: "TEAM" },
      { code: "leave.request", scope: "OWN" },
    ]);
    expect(merged.get("attendance.read")).toBe("DEPARTMENT");
    expect(merged.get("leave.request")).toBe("OWN");
    expect(merged.has("user.manage")).toBe(false);
  });

  it("matrix hanya memakai permission yang terdaftar", () => {
    for (const perms of Object.values(ROLE_MATRIX)) {
      for (const code of Object.keys(perms)) expect(PERMISSIONS).toHaveProperty([code]);
    }
  });

  it("pemisahan tugas: Super Admin tidak melihat absensi/foto; Employee tidak kelola pengguna", () => {
    expect(ROLE_MATRIX.SUPER_ADMIN["attendance.read"]).toBeUndefined();
    expect(ROLE_MATRIX.SUPER_ADMIN["attendance.photo.read"]).toBeUndefined();
    expect(ROLE_MATRIX.EMPLOYEE["user.manage"]).toBeUndefined();
    expect(ROLE_MATRIX.EMPLOYEE["attendance.read"]).toBe("OWN");
    expect(ROLE_MATRIX.SUPERVISOR["approval.manager"]).toBe("TEAM");
    expect(ROLE_MATRIX.HR_ADMIN["approval.hr"]).toBe("ALL");
  });
});

describe("validators", () => {
  it("login ID dinormalisasi huruf kecil", () => {
    expect(loginSchema.parse({ loginId: "  EMP-0042 ", password: "x" }).loginId).toBe("emp-0042");
  });

  it("password baru wajib huruf + angka, min 8, dan beda dari lama", () => {
    const base = { currentPassword: "Lama12345", confirmPassword: "" };
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "abcdefgh", confirmPassword: "abcdefgh" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "abc123", confirmPassword: "abc123" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "Lama12345", confirmPassword: "Lama12345" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "Baru12345", confirmPassword: "Beda12345" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ ...base, newPassword: "Baru12345", confirmPassword: "Baru12345" }).success).toBe(true);
  });

  it("buat pengguna: role wajib & harus dikenal, email kosong jadi null", () => {
    const ok = createUserSchema.parse({ loginId: "EMP-1", displayName: "Budi", email: "", roles: ["EMPLOYEE"] });
    expect(ok).toMatchObject({ loginId: "emp-1", email: null });
    expect(createUserSchema.safeParse({ loginId: "emp-1", displayName: "Budi", email: "", roles: [] }).success).toBe(false);
    expect(createUserSchema.safeParse({ loginId: "emp-1", displayName: "Budi", email: "", roles: ["ROOT"] }).success).toBe(false);
    expect(createUserSchema.safeParse({ loginId: "emp 1", displayName: "Budi", email: "", roles: ["EMPLOYEE"] }).success).toBe(false);
  });
});
