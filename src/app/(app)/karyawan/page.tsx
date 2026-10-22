import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ATTENDANCE_METHODS } from "@/lib/org";
import { employeeScopeWhere } from "@/lib/scope";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";

export const metadata = { title: "Karyawan — HRIS" };

const PAGE_SIZE = 20;

export default async function KaryawanPage({ searchParams }: PageProps<"/karyawan">) {
  const { user, scope } = await requirePermission("employee.read");
  // Karyawan biasa hanya bisa melihat dirinya; langsung buka profilnya.
  if (scope === "OWN" && user.employee) redirect(`/karyawan/${user.employee.id}`);
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const q = str("q");
  const branch = str("cabang");
  const dept = str("dept");
  const status = str("status") === "nonaktif" ? "INACTIVE" : str("status") === "semua" ? undefined : "ACTIVE";
  const page = Math.max(1, Number(str("hal")) || 1);

  const where: Prisma.EmployeeWhereInput = {
    AND: [
      employeeScopeWhere(user, scope),
      q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { employeeCode: { contains: q, mode: "insensitive" } }] } : {},
      branch ? { branchId: branch } : {},
      dept ? { departmentId: dept } : {},
      status ? { status } : {},
    ],
  };

  const [total, employees, branches, departments] = await Promise.all([
    db.employee.count({ where }),
    db.employee.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        employeeCode: true,
        fullName: true,
        status: true,
        attendanceMethod: true,
        branch: { select: { name: true } },
        department: { select: { name: true } },
        position: { select: { name: true } },
      },
    }),
    db.branch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.department.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canManage = user.permissions.has("employee.manage");
  const pageHref = (p: number) => {
    const params = new URLSearchParams({ q, cabang: branch, dept, status: str("status"), hal: String(p) });
    return `/karyawan?${params}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Karyawan</h1>
          <p className="text-sm text-muted-foreground">{total} karyawan</p>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/karyawan/baru">+ Tambah Karyawan</Link>
          </Button>
        )}
      </div>

      <form className="flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Cari nama / NIK…" aria-label="Cari nama atau NIK" className="h-10 min-w-48 flex-1 rounded-md border bg-white px-3 text-base md:text-sm" />
        <select name="cabang" defaultValue={branch} aria-label="Cabang" className="h-10 rounded-md border bg-white px-2 text-sm">
          <option value="">Semua cabang</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select name="dept" defaultValue={dept} aria-label="Departemen" className="h-10 rounded-md border bg-white px-2 text-sm">
          <option value="">Semua departemen</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={str("status")} aria-label="Status" className="h-10 rounded-md border bg-white px-2 text-sm">
          <option value="">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
          <option value="semua">Semua status</option>
        </select>
        <Button type="submit" variant="outline" className="h-10">
          Terapkan
        </Button>
      </form>

      {employees.length === 0 ? (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
          {q || branch || dept ? "Tidak ada karyawan yang cocok dengan filter." : "Belum ada data karyawan."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Metode absen</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link href={`/karyawan/${e.id}`} className="font-medium text-primary hover:underline">
                      {e.fullName}
                    </Link>
                    <div className="text-xs text-muted-foreground">{e.employeeCode}</div>
                  </TableCell>
                  <TableCell>{e.position.name}</TableCell>
                  <TableCell>{e.department.name}</TableCell>
                  <TableCell>{e.branch.name}</TableCell>
                  <TableCell>{ATTENDANCE_METHODS[e.attendanceMethod]}</TableCell>
                  <TableCell>
                    {e.status === "ACTIVE" ? (
                      <Badge className="bg-green-100 text-green-800">Aktif</Badge>
                    ) : (
                      <Badge className="bg-slate-200 text-slate-700">Nonaktif</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pages > 1 && (
        <nav className="flex items-center justify-between text-sm" aria-label="Halaman">
          <span className="text-muted-foreground">
            Halaman {page} dari {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page - 1)}>‹ Sebelumnya</Link>
              </Button>
            )}
            {page < pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={pageHref(page + 1)}>Berikutnya ›</Link>
              </Button>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
