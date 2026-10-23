import Link from "next/link";
import { Button } from "@/components/ui/button";
import { REQUEST_STATUS } from "@/lib/approval";
import { wibDate } from "@/lib/attendance";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { CancelButton } from "./cancel-button";

export const metadata = { title: "Pengajuan — HRIS" };

const time = (d: Date | null) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : null);
const iso = (d: Date) => d.toISOString().slice(0, 10);

export default async function PengajuanPage() {
  const { user } = await requirePermission("attendance.correction.request");
  const today = wibDate(new Date());
  const requests = user.employee
    ? await db.approvalRequest.findMany({
        where: { requesterEmployeeId: user.employee.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          correction: true,
          leave: { include: { leaveType: { select: { name: true } } } },
          steps: { orderBy: { stepNo: "asc" }, include: { decider: { select: { displayName: true } } } },
        },
      })
    : [];

  return (
    <div className="mx-auto max-w-md space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Pengajuan Saya</h1>
        <div className="flex gap-2">
          {user.permissions.has("leave.request") && (
            <Button asChild size="sm">
              <Link href="/pengajuan/cuti">+ Cuti / izin</Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href="/pengajuan/koreksi">+ Koreksi absensi</Link>
          </Button>
        </div>
      </div>
      {requests.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Belum ada pengajuan.</p>}
      <ul className="space-y-2">
        {requests.map((r) => {
          const [label, cls] = REQUEST_STATUS[r.status];
          const c = r.correction;
          const l = r.leave;
          const cancellable = r.status === "PENDING" || (r.status === "APPROVED" && l && iso(l.startDate) > today);
          return (
            <li key={r.id} className="space-y-1.5 rounded-lg border bg-white p-3 text-sm">
              <div className="flex justify-between gap-2">
                <b>
                  {l ? `${l.leaveType.name} · ${formatDateOnly(l.startDate)}${iso(l.endDate) !== iso(l.startDate) ? ` – ${formatDateOnly(l.endDate)}` : ""}` : `Koreksi ${c ? formatDateOnly(c.workDate) : ""}`}
                </b>
                <span className={`h-fit rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cls}`}>{label}</span>
              </div>
              {l && (
                <p>
                  {Number(l.days)} hari{l.halfDay && " (setengah hari)"}
                  <span className="block text-muted-foreground">Alasan: {l.reason}</span>
                  {l.attachmentPath && (
                    <a href={`/api/leave/attachment/${l.id}`} target="_blank" rel="noopener" className="text-xs text-primary underline">
                      Lihat lampiran
                    </a>
                  )}
                </p>
              )}
              {c && (
                <p>
                  {c.requestedClockIn && <>Masuk → {time(c.requestedClockIn)} </>}
                  {c.requestedClockOut && <>Pulang → {time(c.requestedClockOut)}</>}
                  <span className="block text-muted-foreground">Alasan: {c.reason}</span>
                </p>
              )}
              <ol className="text-xs text-muted-foreground">
                {r.steps.map((s) => (
                  <li key={s.id}>
                    {s.stepNo}. {s.approverType === "MANAGER" ? "Atasan" : "HR"}:{" "}
                    {s.decision === "PENDING"
                      ? r.currentStep === s.stepNo && r.status === "PENDING"
                        ? "menunggu"
                        : "—"
                      : s.decision === "SKIPPED"
                        ? "dilewati (tidak ada atasan)"
                        : `${s.decision === "APPROVED" ? "disetujui" : "ditolak"} oleh ${s.decider?.displayName ?? "?"}, ${formatDateTime(s.decidedAt!)}`}
                    {s.comment && ` — "${s.comment}"`}
                  </li>
                ))}
              </ol>
              {cancellable && <CancelButton requestId={r.id} label={r.status === "APPROVED" ? "Batalkan cuti (saldo dikembalikan)" : "Batalkan"} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
