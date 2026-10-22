import Link from "next/link";
import { Button } from "@/components/ui/button";
import { REQUEST_STATUS } from "@/lib/approval";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { db } from "@/server/db";
import { requirePermission } from "@/server/auth";
import { CancelButton } from "./cancel-button";

export const metadata = { title: "Pengajuan — HRIS" };

const time = (d: Date | null) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : null);

export default async function PengajuanPage() {
  const { user } = await requirePermission("attendance.correction.request");
  const requests = user.employee
    ? await db.approvalRequest.findMany({
        where: { requesterEmployeeId: user.employee.id },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { correction: true, steps: { orderBy: { stepNo: "asc" }, include: { decider: { select: { displayName: true } } } } },
      })
    : [];

  return (
    <div className="mx-auto max-w-md space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Pengajuan Saya</h1>
        <Button asChild size="sm">
          <Link href="/pengajuan/koreksi">+ Koreksi absensi</Link>
        </Button>
      </div>
      {requests.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Belum ada pengajuan.</p>}
      <ul className="space-y-2">
        {requests.map((r) => {
          const [label, cls] = REQUEST_STATUS[r.status];
          const c = r.correction;
          return (
            <li key={r.id} className="space-y-1.5 rounded-lg border bg-white p-3 text-sm">
              <div className="flex justify-between gap-2">
                <b>Koreksi {c ? formatDateOnly(c.workDate) : ""}</b>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
              </div>
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
                    {s.decision === "PENDING" ? (r.currentStep === s.stepNo && r.status === "PENDING" ? "menunggu" : "—") : s.decision === "SKIPPED" ? "dilewati (tidak ada atasan)" : `${s.decision === "APPROVED" ? "disetujui" : "ditolak"} oleh ${s.decider?.displayName ?? "?"}, ${formatDateTime(s.decidedAt!)}`}
                    {s.comment && ` — "${s.comment}"`}
                  </li>
                ))}
              </ol>
              {r.status === "PENDING" && <CancelButton requestId={r.id} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
