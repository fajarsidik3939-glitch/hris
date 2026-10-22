import "server-only";
import { db } from "@/server/db";

/** Pilihan dropdown form karyawan: hanya data aktif (plus nilai yang sedang dipakai agar tetap tampil). */
export async function employeeFormOptions(current?: { branchId: string; departmentId: string; positionId: string; managerId: string | null; id: string }) {
  const keep = (id?: string | null) => (id ? [{ id }] : []);
  const [branches, departments, positions, managers] = await Promise.all([
    db.branch.findMany({ where: { OR: [{ isActive: true }, ...keep(current?.branchId)] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.department.findMany({ where: { OR: [{ isActive: true }, ...keep(current?.departmentId)] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.position.findMany({ where: { OR: [{ isActive: true }, ...keep(current?.positionId)] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.employee.findMany({
      where: { status: "ACTIVE", ...(current ? { NOT: { id: current.id } } : {}) },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true },
    }),
  ]);
  const opt = (rows: { id: string; name: string }[]) => rows.map((r) => ({ value: r.id, label: r.name }));
  return {
    branches: opt(branches),
    departments: opt(departments),
    positions: opt(positions),
    managers: managers.map((m) => ({ value: m.id, label: `${m.fullName} (${m.employeeCode})` })),
  };
}
