import type { Prisma } from "@/generated/prisma/client";
import type { Scope } from "./permissions";

type Viewer = { employee: { id: string; departmentId: string } | null };

/**
 * Filter karyawan sesuai scope permission (docs/DATABASE_DESIGN.md §4):
 * OWN = diri sendiri, TEAM = diri + bawahan langsung, DEPARTMENT = departemennya, ALL = semua.
 * Akun tanpa data karyawan hanya melihat data bila scope-nya ALL.
 */
export function employeeScopeWhere(viewer: Viewer, scope: Scope): Prisma.EmployeeWhereInput {
  if (scope === "ALL") return {};
  const me = viewer.employee;
  if (!me) return { id: { in: [] } };
  if (scope === "OWN") return { id: me.id };
  if (scope === "TEAM") return { OR: [{ id: me.id }, { managerId: me.id }] };
  return { departmentId: me.departmentId };
}
