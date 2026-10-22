import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { ROLES, type RoleCode } from "@/lib/permissions";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { CreateUserForm, UserRowActions } from "./user-forms";

export const metadata = { title: "Pengguna — HRIS" };

export default async function UsersPage() {
  const { user: me } = await requirePermission("user.manage");
  const users = await db.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      loginId: true,
      displayName: true,
      email: true,
      isActive: true,
      mustChangePassword: true,
      lastLoginAt: true,
      roles: { select: { role: { select: { code: true } } } },
    },
  });
  const roleOptions = Object.entries(ROLES).map(([code, name]) => ({ code, name }));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold">Kelola Pengguna</h1>
        <p className="text-sm text-muted-foreground">Buat akun, atur role, reset password, dan nonaktifkan akun.</p>
      </div>

      <CreateUserForm roleOptions={roleOptions} />

      {users.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Belum ada pengguna.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pengguna</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login terakhir</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const roles = u.roles.map((r) => r.role.code);
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.loginId}
                        {u.email ? ` · ${u.email}` : ""}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">{roles.map((r) => ROLES[r as RoleCode] ?? r).join(", ")}</TableCell>
                    <TableCell>
                      {u.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-700">Nonaktif</Badge>
                      )}
                      {u.mustChangePassword && <div className="mt-1 text-xs text-amber-700">Password sementara</div>}
                    </TableCell>
                    <TableCell className="text-sm">{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <UserRowActions
                        user={{ id: u.id, loginId: u.loginId, isActive: u.isActive, roles }}
                        roleOptions={roleOptions}
                        isSelf={u.id === me.id}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
