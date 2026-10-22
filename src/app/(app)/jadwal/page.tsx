import Link from "next/link";
import { Button } from "@/components/ui/button";
import { addDays, isoWeekday, minuteToTime, wibDate } from "@/lib/attendance";
import { WEEKDAYS } from "@/lib/org";
import { employeeScopeWhere } from "@/lib/scope";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { loadShiftResolvers } from "@/server/schedule";
import { ScheduleForm } from "./schedule-form";

export const metadata = { title: "Jadwal — HRIS" };

const iso = (d: Date) => d.toISOString().slice(0, 10);

// shortcut: semua karyawan dalam scope di satu halaman (±100 orang); tambah pagination bila > 300.
export default async function JadwalPage({ searchParams }: PageProps<"/jadwal">) {
  const { user, scope } = await requirePermission("schedule.read");
  const sp = await searchParams;
  const asked = typeof sp.minggu === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.minggu) ? sp.minggu : wibDate(new Date());
  const monday = addDays(asked, 1 - isoWeekday(asked));
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const branch = typeof sp.cabang === "string" ? sp.cabang : "";

  const [employees, branches, shifts] = await Promise.all([
    db.employee.findMany({
      where: { AND: [employeeScopeWhere(user, scope), { status: "ACTIVE" }, branch ? { branchId: branch } : {}] },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true, branchId: true, workDays: true, defaultShift: true },
    }),
    db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.shift.findMany({ where: { isActive: true }, orderBy: { startMinute: "asc" } }),
  ]);
  const resolvers = await loadShiftResolvers(employees, days[0], days[6]);
  const overrides = new Set(
    (await db.employeeSchedule.findMany({ where: { employeeId: { in: employees.map((e) => e.id) }, workDate: { gte: new Date(days[0]), lte: new Date(days[6]) } }, select: { employeeId: true, workDate: true } })).map(
      (o) => `${o.employeeId}:${iso(o.workDate)}`,
    ),
  );

  const rows = employees.map((e) => ({
    id: e.id,
    name: e.fullName,
    code: e.employeeCode,
    cells: days.map((d) => {
      const s = resolvers.get(e.id)!(d);
      return { label: s ? s.code : "Libur", title: s ? `${s.name} ${minuteToTime(s.startMinute)}–${minuteToTime(s.endMinute)}` : "Libur", override: overrides.has(`${e.id}:${d}`) };
    }),
  }));
  const canManage = user.permissions.has("schedule.manage");
  const href = (minggu: string) => `/jadwal?${new URLSearchParams({ minggu, cabang: branch })}`;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Jadwal & Shift</h1>
          <p className="text-sm text-muted-foreground">
            Minggu {days[0]} s/d {days[6]} · <span className="rounded bg-blue-50 px-1 text-blue-800">biru</span> = jadwal khusus (rotasi/libur), lainnya shift default
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form className="flex gap-2">
            <input type="hidden" name="minggu" value={monday} />
            <select name="cabang" defaultValue={branch} aria-label="Cabang" className="h-9 rounded-md border bg-white px-2 text-sm">
              <option value="">Semua cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm" className="h-9">
              Terapkan
            </Button>
          </form>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href={href(addDays(monday, -7))}>‹ Minggu lalu</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9">
            <Link href={href(addDays(monday, 7))}>Minggu depan ›</Link>
          </Button>
        </div>
      </div>

      <ScheduleForm
        canManage={canManage}
        days={days.map((d) => ({ date: d, label: `${WEEKDAYS[isoWeekday(d) - 1].label} ${d.slice(8)}` }))}
        rows={rows}
        shifts={shifts.map((s) => ({ id: s.id, label: `${s.name} (${minuteToTime(s.startMinute)}–${minuteToTime(s.endMinute)})` }))}
        defaultFrom={days[0]}
        defaultTo={days[6]}
      />
    </div>
  );
}
