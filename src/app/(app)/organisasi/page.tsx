import Link from "next/link";
import { EntityManager } from "@/components/entity-manager";
import { minuteToTime } from "@/lib/attendance";
import { formatDateOnly, toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import * as actions from "./actions";
import { CompanyForm } from "./company-form";

export const metadata = { title: "Organisasi — HRIS" };

const TABS = {
  perusahaan: "Perusahaan",
  cabang: "Cabang",
  departemen: "Departemen",
  jabatan: "Jabatan",
  lokasi: "Lokasi Kerja",
  shift: "Shift",
  "hari-libur": "Hari Libur",
} as const;
type Tab = keyof typeof TABS;

export default async function OrganisasiPage({ searchParams }: PageProps<"/organisasi">) {
  await requirePermission("org.manage");
  const raw = (await searchParams).tab;
  const tab: Tab = typeof raw === "string" && raw in TABS ? (raw as Tab) : "cabang";

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Organisasi</h1>
        <p className="text-sm text-muted-foreground">Data perusahaan, cabang, departemen, jabatan, lokasi kerja, dan hari libur.</p>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Bagian organisasi">
        {Object.entries(TABS).map(([key, label]) => (
          <Link
            key={key}
            href={`/organisasi?tab=${key}`}
            aria-current={tab === key ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground",
              tab === key && "border-primary font-semibold text-primary",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      <TabContent tab={tab} />
    </div>
  );
}

async function branchOptions() {
  const branches = await db.branch.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } });
  return branches.map((b) => ({ value: b.id, label: b.name }));
}

async function TabContent({ tab }: { tab: Tab }) {
  switch (tab) {
    case "perusahaan": {
      const c = await db.company.findFirstOrThrow({ select: { name: true, legalName: true, address: true } });
      return <CompanyForm initial={{ name: c.name, legalName: c.legalName ?? "", address: c.address ?? "" }} />;
    }
    case "cabang": {
      const rows = await db.branch.findMany({ orderBy: { code: "asc" } });
      return (
        <EntityManager
          title="Cabang"
          fields={[
            { name: "code", label: "Kode", required: true },
            { name: "name", label: "Nama cabang", required: true },
            { name: "address", label: "Alamat" },
          ]}
          columns={["Kode", "Nama", "Alamat"]}
          rows={rows.map((b) => ({
            id: b.id,
            isActive: b.isActive,
            values: { code: b.code, name: b.name, address: b.address ?? "" },
            cells: [b.code, b.name, b.address ?? "—"],
          }))}
          save={actions.saveBranch}
          toggle={actions.toggleBranch}
        />
      );
    }
    case "departemen":
    case "jabatan": {
      const isDept = tab === "departemen";
      const rows = isDept
        ? await db.department.findMany({ orderBy: { code: "asc" } })
        : await db.position.findMany({ orderBy: { code: "asc" } });
      return (
        <EntityManager
          title={isDept ? "Departemen" : "Jabatan"}
          fields={[
            { name: "code", label: "Kode", required: true },
            { name: "name", label: "Nama", required: true },
          ]}
          columns={["Kode", "Nama"]}
          rows={rows.map((r) => ({ id: r.id, isActive: r.isActive, values: { code: r.code, name: r.name }, cells: [r.code, r.name] }))}
          save={isDept ? actions.saveDepartment : actions.savePosition}
          toggle={isDept ? actions.toggleDepartment : actions.togglePosition}
        />
      );
    }
    case "lokasi": {
      const [rows, options] = await Promise.all([
        db.workLocation.findMany({ orderBy: [{ branch: { name: "asc" } }, { name: "asc" }], include: { branch: { select: { name: true } } } }),
        branchOptions(),
      ]);
      return (
        <EntityManager
          title="Lokasi Kerja"
          withMap
          confirmEdit="Simpan perubahan lokasi/radius? Absensi berikutnya akan dinilai dengan lokasi baru."
          fields={[
            { name: "branchId", label: "Cabang", type: "select", options, required: true },
            { name: "name", label: "Nama lokasi", required: true },
            { name: "latitude", label: "Latitude", type: "number", required: true },
            { name: "longitude", label: "Longitude", type: "number", required: true },
            { name: "radiusM", label: "Radius (meter)", type: "number", required: true },
          ]}
          columns={["Cabang", "Nama", "Koordinat", "Radius"]}
          rows={rows.map((l) => ({
            id: l.id,
            isActive: l.isActive,
            values: {
              branchId: l.branchId,
              name: l.name,
              latitude: l.latitude.toString(),
              longitude: l.longitude.toString(),
              radiusM: String(l.radiusM),
            },
            cells: [l.branch.name, l.name, `${l.latitude}, ${l.longitude}`, `${l.radiusM} m`],
          }))}
          save={actions.saveWorkLocation}
          toggle={actions.toggleWorkLocation}
        />
      );
    }
    case "shift": {
      const rows = await db.shift.findMany({ orderBy: { startMinute: "asc" } });
      return (
        <EntityManager
          title="Shift"
          fields={[
            { name: "code", label: "Kode", required: true },
            { name: "name", label: "Nama shift", required: true },
            { name: "startTime", label: "Jam mulai (WIB)", type: "time", required: true },
            { name: "endTime", label: "Jam selesai (lewat 00:00 = shift malam)", type: "time", required: true },
            { name: "lateToleranceMin", label: "Toleransi terlambat (menit)", type: "number", required: true },
            { name: "clockInWindowMin", label: "Boleh clock-in sejak (menit sebelum mulai)", type: "number", required: true },
          ]}
          columns={["Kode", "Nama", "Jam", "Toleransi"]}
          rows={rows.map((s) => ({
            id: s.id,
            isActive: s.isActive,
            values: {
              code: s.code,
              name: s.name,
              startTime: minuteToTime(s.startMinute),
              endTime: minuteToTime(s.endMinute),
              lateToleranceMin: String(s.lateToleranceMin),
              clockInWindowMin: String(s.clockInWindowMin),
            },
            cells: [
              s.code,
              s.name,
              `${minuteToTime(s.startMinute)}–${minuteToTime(s.endMinute)}${s.endMinute < s.startMinute ? " (+1 hari)" : ""}`,
              `${s.lateToleranceMin} menit`,
            ],
          }))}
          save={actions.saveShift}
          toggle={actions.toggleShift}
        />
      );
    }
    case "hari-libur": {
      const [rows, options] = await Promise.all([
        db.holiday.findMany({ orderBy: { date: "asc" }, include: { branch: { select: { name: true } } } }),
        branchOptions(),
      ]);
      return (
        <EntityManager
          title="Hari Libur"
          fields={[
            { name: "date", label: "Tanggal", type: "date", required: true },
            { name: "name", label: "Nama hari libur", required: true },
            { name: "branchId", label: "Berlaku untuk cabang (kosong = semua)", type: "select", options },
          ]}
          columns={["Tanggal", "Nama", "Cabang"]}
          rows={rows.map((h) => ({
            id: h.id,
            values: { date: toIsoDate(h.date), name: h.name, branchId: h.branchId ?? "" },
            cells: [formatDateOnly(h.date), h.name, h.branch?.name ?? "Semua cabang"],
          }))}
          save={actions.saveHoliday}
          remove={actions.deleteHoliday}
        />
      );
    }
  }
}
