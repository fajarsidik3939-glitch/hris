import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { mergePermissions, type PermissionCode, type Scope } from "@/lib/permissions";
import { db } from "./db";
import { getSessionFromCookie } from "./session";

export type CurrentUser = {
  id: string;
  loginId: string;
  displayName: string;
  mustChangePassword: boolean;
  roles: string[];
  permissions: Map<string, Scope>;
  /** Data karyawan yang terhubung ke akun (null untuk akun non-karyawan, mis. Super Admin). */
  employee: { id: string; departmentId: string } | null;
};

/** Pengguna yang sedang login (sekali per render), atau null. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await getSessionFromCookie();
  if (!session) return null;

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      loginId: true,
      displayName: true,
      isActive: true,
      mustChangePassword: true,
      employee: { select: { id: true, departmentId: true, status: true } },
      roles: {
        select: {
          role: {
            select: {
              code: true,
              permissions: { select: { scope: true, permission: { select: { code: true } } } },
            },
          },
        },
      },
    },
  });
  if (!user || !user.isActive) return null;

  const roles = user.roles.map((r) => r.role.code);
  const permissions = mergePermissions(
    user.roles.flatMap((r) => r.role.permissions.map((p) => ({ code: p.permission.code, scope: p.scope }))),
  );
  return {
    id: user.id,
    loginId: user.loginId,
    displayName: user.displayName,
    mustChangePassword: user.mustChangePassword,
    roles,
    permissions,
    employee:
      user.employee?.status === "ACTIVE" ? { id: user.employee.id, departmentId: user.employee.departmentId } : null,
  };
});

/** Wajib login. Pengguna yang belum mengganti password sementara diarahkan ke halaman ganti password. */
export async function requireUser(opts: { allowPendingPasswordChange?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword && !opts.allowPendingPasswordChange) redirect("/ganti-password");
  return user;
}

/** Wajib punya permission; kembalikan scope datanya (OWN/TEAM/DEPARTMENT/ALL). Tanpa izin → 403. */
export async function requirePermission(code: PermissionCode) {
  const user = await requireUser();
  const scope = user.permissions.get(code);
  if (!scope) forbidden();
  return { user, scope };
}
