import ExcelJS from "exceljs";
import * as z from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { addDays, DAY_STATUS, LABELS, wibDate } from "@/lib/attendance";
import { toCsv, type Cell, type Column } from "@/lib/csv";
import { REQUEST_STATUS } from "@/lib/approval";
import { employeeScopeWhere } from "@/lib/scope";
import { writeAudit } from "@/server/audit";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import { attendanceDays, monthRange, summarize } from "@/server/recap";

const MAX_DAYS = 31;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({
  jenis: z.enum(["rekap", "harian", "cuti"]),
  format: z.enum(["xlsx", "csv"]).default("xlsx"),
  bulan: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  dari: isoDate.optional(),
  sampai: isoDate.optional(),
  cabang: z.union([z.literal(""), z.uuid()]).optional(),
  dept: z.union([z.literal(""), z.uuid()]).optional(),
});

const hhmm = (d: Date | null) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":") : "");
const asDate = (s: string) => new Date(`${s}T00:00:00Z`);

/** Unduh laporan (Excel/CSV) sesuai izin & scope pengguna. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.mustChangePassword) return new Response("Unauthorized", { status: 401 });
  const scope = user.permissions.get("attendance.export");
  if (!scope) return new Response("Forbidden", { status: 403 });

  const parsed = query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) return new Response("Parameter tidak valid", { status: 400 });
  const q = parsed.data;
  if (q.jenis === "cuti" && !user.permissions.has("leave.read")) return new Response("Forbidden", { status: 403 });

  const today = wibDate(new Date());
  let from: string, to: string;
  if (q.jenis === "rekap") {
    const r = monthRange(q.bulan ?? today.slice(0, 7), today);
    if (!r.started) return new Response("Bulan belum dimulai", { status: 400 });
    [from, to] = [r.first, r.last];
  } else {
    from = q.dari ?? today;
    to = q.sampai ?? from;
    if (q.jenis === "harian" && to > today) to = today;
    if (to < from || addDays(from, MAX_DAYS - 1) < to) return new Response(`Rentang 1–${MAX_DAYS} hari`, { status: 400 });
  }

  const employeeWhere: Prisma.EmployeeWhereInput = {
    AND: [employeeScopeWhere(user, scope), q.cabang ? { branchId: q.cabang } : {}, q.dept ? { departmentId: q.dept } : {}],
  };
  let columns: Column[];
  let rows: Cell[][];

  if (q.jenis === "cuti") {
    const leaves = await db.leaveRequest.findMany({
      where: { employee: employeeWhere, startDate: { lte: asDate(to) }, endDate: { gte: asDate(from) } },
      orderBy: [{ startDate: "asc" }],
      include: { leaveType: { select: { name: true } }, employee: { select: { employeeCode: true, fullName: true, branch: { select: { name: true } } } } },
    });
    columns = [
      { header: "NIK" }, { header: "Nama" }, { header: "Cabang" }, { header: "Jenis" }, { header: "Mulai", type: "date" }, { header: "Selesai", type: "date" },
      { header: "Hari", type: "number" }, { header: "Setengah hari" }, { header: "Status" }, { header: "Alasan" }, { header: "Diajukan", type: "date" },
    ];
    rows = leaves.map((l) => [
      l.employee.employeeCode, l.employee.fullName, l.employee.branch.name, l.leaveType.name, l.startDate, l.endDate,
      Number(l.days), l.halfDay ? "Ya" : "Tidak", REQUEST_STATUS[l.status][0], l.reason, asDate(wibDate(l.createdAt)),
    ]);
  } else {
    const employees = await db.employee.findMany({
      where: { AND: [employeeWhere, { status: "ACTIVE" }] },
      orderBy: { fullName: "asc" },
      select: {
        id: true, employeeCode: true, fullName: true, branchId: true, workDays: true, defaultShift: true, hireDate: true,
        branch: { select: { name: true } }, department: { select: { name: true } }, position: { select: { name: true } },
      },
    });
    const days = await attendanceDays(employees, from, to);
    if (q.jenis === "rekap") {
      columns = [
        { header: "NIK" }, { header: "Nama" }, { header: "Cabang" }, { header: "Departemen" }, { header: "Jabatan" },
        { header: "Hari terjadwal", type: "number" }, { header: "Hadir (hari)", type: "number" }, { header: "Terlambat (hari)", type: "number" },
        { header: "Total terlambat (menit)", type: "number" }, { header: "Total pulang awal (menit)", type: "number" }, { header: "Tidak hadir (hari)", type: "number" },
        { header: "Belum clock-out (hari)", type: "number" }, { header: "Cuti/izin (hari)", type: "number" }, { header: "Libur (hari)", type: "number" },
        { header: "Total jam kerja", type: "number" },
      ];
      rows = employees.map((e) => {
        const s = summarize(days.filter((d) => d.e.id === e.id));
        const c = s.count;
        return [
          e.employeeCode, e.fullName, e.branch.name, e.department.name, e.position.name, s.scheduled, c.HADIR + c.TERLAMBAT + c.BELUM_CLOCK_OUT, c.TERLAMBAT,
          s.lateMinutes, s.earlyLeaveMinutes, c.TIDAK_HADIR, c.BELUM_CLOCK_OUT, c.CUTI, c.LIBUR, Math.round((s.workMinutes / 60) * 100) / 100,
        ];
      });
    } else {
      columns = [
        { header: "Tanggal", type: "date" }, { header: "NIK" }, { header: "Nama" }, { header: "Cabang" }, { header: "Shift" }, { header: "Masuk" }, { header: "Pulang" },
        { header: "Status" }, { header: "Terlambat (menit)", type: "number" }, { header: "Pulang awal (menit)", type: "number" }, { header: "Durasi (menit)", type: "number" },
        { header: "Lokasi masuk" }, { header: "Lokasi pulang" }, { header: "Dikoreksi" }, { header: "Cuti/izin" },
      ];
      rows = days
        .sort((a, b) => a.date.localeCompare(b.date) || a.e.fullName.localeCompare(b.e.fullName))
        .map((d) => [
          asDate(d.date), d.e.employeeCode, d.e.fullName, d.e.branch.name, d.shiftCode ?? "", hhmm(d.record?.clockInAt ?? null), hhmm(d.record?.clockOutAt ?? null),
          DAY_STATUS[d.status], d.record?.lateMinutes ?? 0, d.record?.earlyLeaveMinutes ?? 0, d.record?.workMinutes ?? 0,
          LABELS[d.record?.clockInLabel ?? ""] ?? "", LABELS[d.record?.clockOutLabel ?? ""] ?? "", d.record?.hasCorrection ? "Ya" : "", d.leave ? `${d.leave.name}${d.leave.halfDay ? " (½)" : ""}` : "",
        ]);
    }
  }

  await writeAudit({ actorUserId: user.id, action: "report.export", entityType: "report", after: { jenis: q.jenis, format: q.format, from, to, rows: rows.length, cabang: q.cabang || null, dept: q.dept || null } });

  const name = `hris-${q.jenis}-${from}${to !== from ? `_${to}` : ""}`;
  if (q.format === "csv") {
    return new Response(toCsv(columns, rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.csv"`, "Cache-Control": "private, no-store" },
    });
  }
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(q.jenis === "rekap" ? "Rekap" : q.jenis === "harian" ? "Harian" : "Cuti");
  ws.columns = columns.map((c) => ({ header: c.header, width: Math.max(12, c.header.length + 2), style: c.type === "date" ? { numFmt: "dd/mm/yyyy" } : {} }));
  ws.addRows(rows);
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
