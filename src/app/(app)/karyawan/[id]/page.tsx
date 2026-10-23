import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { minuteToTime } from "@/lib/attendance";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { ATTENDANCE_METHODS, EMPLOYMENT_TYPES, WEEKDAYS, WORK_TYPES } from "@/lib/org";
import { ROLES, type RoleCode } from "@/lib/permissions";
import { employeeScopeWhere } from "@/lib/scope";
import { cn } from "@/lib/utils";
import { HR_ASSIGNABLE_ROLES } from "@/lib/validators";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { AccountForm, AdjustLeaveForm, DeactivateForm, ReactivateButton } from "./employee-actions";
import { leaveSummary } from "@/server/leave";

export const metadata = { title: "Detail Karyawan — HRIS" };

const TABS = { profil: "Profil", pekerjaan: "Pekerjaan", cuti: "Cuti", riwayat: "Riwayat Perubahan" } as const;
type Tab = keyof typeof TABS;

function Info({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 rounded-lg border bg-white p-4 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="font-medium">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function EmployeeDetailPage({ params, searchParams }: PageProps<"/karyawan/[id]">) {
  const { user, scope } = await requirePermission("employee.read");
  const { id } = await params;
  const raw = (await searchParams).tab;
  const tab: Tab = typeof raw === "string" && raw in TABS ? (raw as Tab) : "profil";
  const canManage = user.permissions.has("employee.manage");

  // Data di luar scope diperlakukan seperti tidak ada (tidak membocorkan keberadaannya).
  const e = await db.employee
    .findFirst({
      where: { AND: [{ id }, employeeScopeWhere(user, scope)] },
      include: {
        branch: { select: { name: true } },
        department: { select: { name: true } },
        position: { select: { name: true } },
        manager: { select: { id: true, fullName: true } },
        defaultShift: { select: { name: true, startMinute: true, endMinute: true } },
        user: { select: { loginId: true, isActive: true, roles: { select: { role: { select: { code: true } } } } } },
        _count: { select: { subordinates: { where: { status: "ACTIVE" } } } },
      },
    })
    .catch(() => null);
  if (!e) notFound();

  const history =
    tab === "riwayat" && canManage
      ? await db.auditLog.findMany({
          where: { entityType: "employee", entityId: e.id },
          orderBy: { id: "desc" },
          take: 50,
          include: { actor: { select: { displayName: true } } },
        })
      : [];
  // Nama untuk ID cabang/dept/jabatan/atasan yang muncul di riwayat.
  const ids = [...new Set(history.flatMap((h) => [h.before, h.after]).flatMap((v) => Object.values((v ?? {}) as Record<string, unknown>)).filter((v): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v)))];
  const names = new Map<string, string>();
  if (ids.length) {
    const where = { where: { id: { in: ids } }, select: { id: true, name: true } } as const;
    const [b, d, p, m, s] = await Promise.all([db.branch.findMany(where), db.department.findMany(where), db.position.findMany(where), db.employee.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } }), db.shift.findMany(where)]);
    for (const r of [...b, ...d, ...p, ...s]) names.set(r.id, r.name);
    for (const r of m) names.set(r.id, r.fullName);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {scope !== "OWN" && (
            <Link href="/karyawan" className="text-sm text-muted-foreground hover:underline">
              ‹ Daftar karyawan
            </Link>
          )}
          <h1 className="text-xl font-bold">{e.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {e.employeeCode} · {e.position.name} · {e.branch.name}{" "}
            {e.status === "ACTIVE" ? (
              <Badge className="ml-1 bg-green-100 text-green-800">Aktif</Badge>
            ) : (
              <Badge className="ml-1 bg-slate-200 text-slate-700">Nonaktif</Badge>
            )}
          </p>
        </div>
        {canManage && (
          <Button asChild variant="outline">
            <Link href={`/karyawan/${e.id}/ubah`}>Ubah data</Link>
          </Button>
        )}
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Bagian detail karyawan">
        {Object.entries(TABS)
          .filter(([key]) => key !== "riwayat" || canManage)
          .map(([key, label]) => (
            <Link
              key={key}
              href={`/karyawan/${e.id}?tab=${key}`}
              aria-current={tab === key ? "page" : undefined}
              className={cn("shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground", tab === key && "border-primary font-semibold text-primary")}
            >
              {label}
            </Link>
          ))}
      </nav>

      {tab === "profil" && (
        <Info
          items={[
            ["NIK karyawan", e.employeeCode],
            ["Nama lengkap", e.fullName],
            ["Email", e.email],
            ["No. HP", e.phone],
            ["Akun login", e.user ? `${e.user.loginId}${e.user.isActive ? "" : " (nonaktif)"}` : "Belum ada"],
            ["Role", e.user?.roles.map((r) => ROLES[r.role.code as RoleCode] ?? r.role.code).join(", ")],
          ]}
        />
      )}

      {tab === "pekerjaan" && (
        <Info
          items={[
            ["Cabang", e.branch.name],
            ["Departemen", e.department.name],
            ["Jabatan", e.position.name],
            ["Atasan langsung", e.manager ? <Link href={`/karyawan/${e.manager.id}`} className="text-primary hover:underline">{e.manager.fullName}</Link> : null],
            ["Bawahan aktif", `${e._count.subordinates} orang`],
            ["Tanggal masuk", formatDateOnly(e.hireDate)],
            ["Tanggal keluar", e.endDate ? formatDateOnly(e.endDate) : null],
            ["Jenis hubungan kerja", EMPLOYMENT_TYPES[e.employmentType]],
            ["Tipe kerja", WORK_TYPES[e.workType]],
            ["Metode absen", ATTENDANCE_METHODS[e.attendanceMethod]],
            ["ID fingerprint", e.fingerprintUserId],
            ["Shift", e.defaultShift ? `${e.defaultShift.name} (${minuteToTime(e.defaultShift.startMinute)}–${minuteToTime(e.defaultShift.endMinute)})` : "Tanpa shift"],
            ["Hari kerja", WEEKDAYS.filter((d) => e.workDays.includes(d.value)).map((d) => d.label).join(", ")],
          ]}
        />
      )}

      {tab === "cuti" && <LeaveTab employeeId={e.id} canAdjust={user.permissions.has("leave.balance.adjust")} />}

      {tab === "riwayat" && canManage && (
        <ol className="space-y-2">
          {history.length === 0 && <li className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">Belum ada riwayat.</li>}
          {history.map((h) => (
            <li key={h.id.toString()} className="rounded-lg border bg-white p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{ACTION_LABELS[h.action] ?? h.action}</span>
                <span className="text-muted-foreground">
                  {formatDateTime(h.createdAt)} · {h.actor?.displayName ?? "Sistem"}
                </span>
              </div>
              {h.reason && <p className="mt-1">Alasan: {h.reason}</p>}
              <ChangeList before={h.before} after={h.after} names={names} />
            </li>
          ))}
        </ol>
      )}

      {canManage && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Selalu dirender di posisi yang sama agar pesan password sementara tidak hilang saat halaman diperbarui. */}
          <AccountForm
            employeeId={e.id}
            loginId={e.employeeCode.toLowerCase()}
            existing={e.user ? `${e.user.loginId}${e.user.isActive ? "" : " (nonaktif)"}` : null}
            canCreate={e.status === "ACTIVE"}
            roleOptions={HR_ASSIGNABLE_ROLES.map((code) => ({ code, name: ROLES[code] }))}
          />
          {e.status === "ACTIVE" ? (
            <DeactivateForm employeeId={e.id} subordinates={e._count.subordinates} />
          ) : (
            <ReactivateButton employeeId={e.id} />
          )}
        </div>
      )}
    </div>
  );
}

const FIELD_LABELS: Record<string, string> = {
  employeeCode: "NIK",
  fullName: "Nama",
  email: "Email",
  phone: "No. HP",
  branchId: "Cabang",
  departmentId: "Departemen",
  positionId: "Jabatan",
  managerId: "Atasan",
  hireDate: "Tanggal masuk",
  endDate: "Tanggal keluar",
  employmentType: "Hubungan kerja",
  workType: "Tipe kerja",
  attendanceMethod: "Metode absen",
  fingerprintUserId: "ID fingerprint",
  defaultShiftId: "Shift",
  workDays: "Hari kerja",
  status: "Status",
  accountDisabled: "Akun ikut dinonaktifkan",
};
const ACTION_LABELS: Record<string, string> = {
  "employee.create": "Data dibuat",
  "employee.update": "Data diubah",
  "employee.deactivate": "Dinonaktifkan",
  "employee.reactivate": "Diaktifkan kembali",
};
const VALUE_LABELS: Record<string, string> = { ...EMPLOYMENT_TYPES, ...WORK_TYPES, ...ATTENDANCE_METHODS, ACTIVE: "Aktif", INACTIVE: "Nonaktif" };

/** Tampilkan field yang berubah saja (sebelum → sesudah), dengan label dan nama yang mudah dibaca. */
function ChangeList({ before, after, names }: { before: unknown; after: unknown; names: Map<string, string> }) {
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const keys = Object.keys(a).filter((k) => !["updatedAt", "createdAt", "id", "userId"].includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  if (keys.length === 0) return null;
  const show = (k: string, v: unknown) => {
    if (v === null || v === undefined || v === "") return "—";
    if (typeof v === "boolean") return v ? "Ya" : "Tidak";
    if (k === "workDays" && Array.isArray(v)) return WEEKDAYS.filter((d) => v.includes(d.value)).map((d) => d.label).join(", ");
    if (typeof v !== "string") return JSON.stringify(v);
    return names.get(v) ?? VALUE_LABELS[v] ?? v.replace(/T00:00:00\.000Z$/, "");
  };
  return (
    <ul className="mt-1 space-y-0.5 text-muted-foreground">
      {keys.map((k) => (
        <li key={k}>
          {FIELD_LABELS[k] ?? k}: {k in b ? `${show(k, b[k])} → ` : ""}
          <span className="text-foreground">{show(k, a[k])}</span>
        </li>
      ))}
    </ul>
  );
}

const TX_KIND: Record<string, string> = { GRANT: "Hak tahunan", USE: "Dipakai", REVERSAL: "Dikembalikan (batal)", ADJUSTMENT: "Penyesuaian HR" };

async function LeaveTab({ employeeId, canAdjust }: { employeeId: string; canAdjust: boolean }) {
  const [summary, txs] = await Promise.all([
    leaveSummary(employeeId),
    db.leaveTransaction.findMany({ where: { employeeId }, orderBy: { createdAt: "desc" }, take: 50, include: { leaveType: { select: { name: true } } } }),
  ]);
  return (
    <div className="space-y-4">
      {summary.map((s) => (
        <div key={s.type.id} className="rounded-lg border bg-white p-4 text-sm">
          <b>{s.type.name}</b>
          {s.period ? (
            <p>
              Periode {s.period.start} s/d {s.period.end}: saldo <b>{s.balance} hari</b>, menunggu persetujuan {s.pending} hari, tersedia <b>{s.available} hari</b>
            </p>
          ) : (
            <p className="text-muted-foreground">Belum berhak (belum genap 12 bulan bekerja).</p>
          )}
        </div>
      ))}
      {canAdjust && summary.length > 0 && <AdjustLeaveForm employeeId={employeeId} types={summary.map((s) => ({ id: s.type.id, name: s.type.name }))} />}
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Waktu</th>
              <th className="p-2">Jenis</th>
              <th className="p-2">Transaksi</th>
              <th className="p-2 text-right">Hari</th>
              <th className="p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {txs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  Belum ada transaksi saldo.
                </td>
              </tr>
            )}
            {txs.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="p-2 whitespace-nowrap">{formatDateTime(t.createdAt)}</td>
                <td className="p-2">{t.leaveType.name}</td>
                <td className="p-2">{TX_KIND[t.kind]}</td>
                <td className={cn("p-2 text-right font-semibold", Number(t.days) < 0 ? "text-red-700" : "text-green-700")}>
                  {Number(t.days) > 0 ? "+" : ""}
                  {Number(t.days)}
                </td>
                <td className="p-2 text-muted-foreground">{t.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
