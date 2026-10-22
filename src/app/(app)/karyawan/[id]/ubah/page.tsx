import { notFound } from "next/navigation";
import { toIsoDate } from "@/lib/format";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { EmployeeForm } from "../../employee-form";
import { employeeFormOptions } from "../../form-data";

export const metadata = { title: "Ubah Karyawan — HRIS" };

export default async function EditEmployeePage({ params }: PageProps<"/karyawan/[id]/ubah">) {
  await requirePermission("employee.manage");
  const { id } = await params;
  const e = await db.employee.findUnique({ where: { id } }).catch(() => null);
  if (!e) notFound();
  const options = await employeeFormOptions(e);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Ubah Data Karyawan</h1>
      <EmployeeForm
        {...options}
        initial={{
          id: e.id,
          employeeCode: e.employeeCode,
          fullName: e.fullName,
          email: e.email ?? "",
          phone: e.phone ?? "",
          branchId: e.branchId,
          departmentId: e.departmentId,
          positionId: e.positionId,
          managerId: e.managerId ?? "",
          hireDate: toIsoDate(e.hireDate),
          employmentType: e.employmentType,
          workType: e.workType,
          attendanceMethod: e.attendanceMethod,
          fingerprintUserId: e.fingerprintUserId ?? "",
          workDays: e.workDays,
        }}
      />
    </div>
  );
}
