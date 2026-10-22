import { describe, expect, it } from "vitest";
import { wouldCreateCycle } from "@/lib/org";
import { employeeScopeWhere } from "@/lib/scope";
import { employeeSchema, holidaySchema, workLocationSchema } from "@/lib/validators";

describe("wouldCreateCycle", () => {
  // A ← B ← C (A atasan B, B atasan C)
  const managerOf = new Map<string, string | null>([
    ["A", null],
    ["B", "A"],
    ["C", "B"],
  ]);

  it("atasan diri sendiri ditolak", () => {
    expect(wouldCreateCycle("A", "A", managerOf)).toBe(true);
  });
  it("menjadikan bawahan (langsung/tidak langsung) sebagai atasan ditolak", () => {
    expect(wouldCreateCycle("A", "B", managerOf)).toBe(true);
    expect(wouldCreateCycle("A", "C", managerOf)).toBe(true);
  });
  it("struktur valid diterima", () => {
    expect(wouldCreateCycle("C", "A", managerOf)).toBe(false);
    expect(wouldCreateCycle("D", "C", managerOf)).toBe(false);
    expect(wouldCreateCycle("B", null, managerOf)).toBe(false);
  });
  it("data lama yang sudah melingkar tidak membuat loop tak berujung", () => {
    const broken = new Map<string, string | null>([
      ["X", "Y"],
      ["Y", "X"],
    ]);
    expect(wouldCreateCycle("Z", "X", broken)).toBe(true);
  });
});

describe("employeeScopeWhere", () => {
  const me = { employee: { id: "e1", departmentId: "d1" } };
  it("scope menentukan data karyawan yang boleh dilihat", () => {
    expect(employeeScopeWhere(me, "ALL")).toEqual({});
    expect(employeeScopeWhere(me, "OWN")).toEqual({ id: "e1" });
    expect(employeeScopeWhere(me, "TEAM")).toEqual({ OR: [{ id: "e1" }, { managerId: "e1" }] });
    expect(employeeScopeWhere(me, "DEPARTMENT")).toEqual({ departmentId: "d1" });
  });
  it("akun tanpa data karyawan tidak melihat apa pun kecuali scope ALL", () => {
    expect(employeeScopeWhere({ employee: null }, "TEAM")).toEqual({ id: { in: [] } });
    expect(employeeScopeWhere({ employee: null }, "ALL")).toEqual({});
  });
});

describe("validator organisasi", () => {
  const branchId = "11111111-1111-4111-8111-111111111111";
  it("radius lokasi hanya 10–5000 m", () => {
    const base = { branchId, name: "Pabrik", latitude: "-6.3", longitude: "107.1" };
    expect(workLocationSchema.safeParse({ ...base, radiusM: "9" }).success).toBe(false);
    expect(workLocationSchema.safeParse({ ...base, radiusM: "5001" }).success).toBe(false);
    expect(workLocationSchema.safeParse({ ...base, radiusM: "100.5" }).success).toBe(false);
    expect(workLocationSchema.parse({ ...base, radiusM: "100" })).toMatchObject({ radiusM: 100, latitude: -6.3 });
    expect(workLocationSchema.safeParse({ ...base, latitude: "-91", radiusM: "100" }).success).toBe(false);
  });

  it("hari libur: cabang kosong = semua cabang", () => {
    expect(holidaySchema.parse({ date: "2026-12-25", name: "Natal", branchId: "" }).branchId).toBeNull();
    expect(holidaySchema.safeParse({ date: "25-12-2026", name: "Natal", branchId: "" }).success).toBe(false);
  });

  const employee = {
    employeeCode: "emp-001",
    fullName: "Budi Santoso",
    email: "",
    phone: "",
    branchId,
    departmentId: branchId,
    positionId: branchId,
    managerId: "",
    hireDate: "2024-01-15",
    employmentType: "PKWTT",
    workType: "OFFICE",
    attendanceMethod: "SELFIE_GPS",
    fingerprintUserId: "",
    workDays: ["5", "1", "3", "1"],
  };

  it("karyawan: NIK huruf besar, hari kerja unik & urut, field kosong jadi null", () => {
    const d = employeeSchema.parse(employee);
    expect(d.employeeCode).toBe("EMP-001");
    expect(d.workDays).toEqual([1, 3, 5]);
    expect(d).toMatchObject({ email: null, phone: null, managerId: null, fingerprintUserId: null });
  });

  it("metode fingerprint wajib punya ID fingerprint", () => {
    expect(employeeSchema.safeParse({ ...employee, attendanceMethod: "FINGERPRINT" }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...employee, attendanceMethod: "BOTH", fingerprintUserId: "1042" }).success).toBe(true);
  });

  it("hari kerja minimal satu dan enum harus dikenal", () => {
    expect(employeeSchema.safeParse({ ...employee, workDays: [] }).success).toBe(false);
    expect(employeeSchema.safeParse({ ...employee, workType: "REMOTE" }).success).toBe(false);
  });
});
