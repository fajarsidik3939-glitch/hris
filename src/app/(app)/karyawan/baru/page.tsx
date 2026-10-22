import { requirePermission } from "@/server/auth";
import { EmployeeForm } from "../employee-form";
import { employeeFormOptions } from "../form-data";

export const metadata = { title: "Tambah Karyawan — HRIS" };

export default async function NewEmployeePage() {
  await requirePermission("employee.manage");
  const options = await employeeFormOptions();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Tambah Karyawan</h1>
      <EmployeeForm
        {...options}
        initial={{
          id: "",
          employeeCode: "",
          fullName: "",
          email: "",
          phone: "",
          branchId: "",
          departmentId: "",
          positionId: "",
          managerId: "",
          hireDate: "",
          employmentType: "PKWTT",
          workType: "OFFICE",
          attendanceMethod: "SELFIE_GPS",
          fingerprintUserId: "",
          defaultShiftId: "",
          workDays: [1, 2, 3, 4, 5],
        }}
      />
    </div>
  );
}
