import { forbidden } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { canDecide, REQUEST_STATUS } from "@/lib/approval";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { DecideForm } from "./decide-form";

export const metadata = { title: "Approval — HRIS" };

const time = (d: Date | null) => (d ? d.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }) : "--:--");

export default async function ApprovalPage() {
  const user = await requireUser();
  const isManager = user.permissions.has("approval.manager");
  const isHr = user.permissions.has("approval.hr");
  if (!isManager && !isHr) forbidden();

  const me = user.employee?.id;
  const candidates: Prisma.ApprovalRequestWhereInput[] = [];
  if (isManager && me) candidates.push({ currentStep: 1, steps: { some: { stepNo: 1, approverEmployeeId: me, decision: "PENDING" } } });
  if (isHr) candidates.push({ currentStep: 2 });
  const [pending, history] = await Promise.all([
    db.approvalRequest.findMany({
      where: { status: "PENDING", OR: candidates, ...(me ? { NOT: { requesterEmployeeId: me } } : {}) },
      orderBy: { createdAt: "asc" },
      include: {
        steps: true,
        requester: { select: { fullName: true, employeeCode: true, branch: { select: { name: true } } } },
        correction: { include: { record: { select: { clockInAt: true, clockOutAt: true } } } },
      },
    }),
    db.approvalStep.findMany({
      where: { decidedBy: user.id },
      orderBy: { decidedAt: "desc" },
      take: 30,
      include: { request: { include: { requester: { select: { fullName: true } }, correction: { select: { workDate: true } } } } },
    }),
  ]);
  const mine = pending.filter((r) => canDecide({ userId: user.id, employeeId: me ?? null, permissions: user.permissions }, r, r.steps.find((s) => s.stepNo === r.currentStep)!));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Approval</h1>
      <section className="space-y-2">
        <h2 className="font-semibold">Menunggu keputusan Anda ({mine.length})</h2>
        {mine.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Tidak ada pengajuan yang menunggu.</p>}
        {mine.map((r) => {
          const c = r.correction!;
          return (
            <article key={r.id} className="space-y-2 rounded-lg border bg-white p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <b>
                  {r.requester.fullName} <span className="font-normal text-muted-foreground">({r.requester.employeeCode} · {r.requester.branch.name})</span>
                </b>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Tahap {r.currentStep === 1 ? "atasan" : "HR"}</span>
              </div>
              <p>
                Koreksi absensi <b>{formatDateOnly(c.workDate)}</b>
              </p>
              <table className="text-sm">
                <tbody>
                  <tr>
                    <td className="pr-3 text-muted-foreground">Masuk</td>
                    <td>
                      {time(c.record?.clockInAt ?? null)} {c.requestedClockIn && <>→ <b>{time(c.requestedClockIn)}</b></>}
                    </td>
                  </tr>
                  <tr>
                    <td className="pr-3 text-muted-foreground">Pulang</td>
                    <td>
                      {time(c.record?.clockOutAt ?? null)} {c.requestedClockOut && <>→ <b>{time(c.requestedClockOut)}</b></>}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-muted-foreground">Alasan: {c.reason}</p>
              <p className="text-xs text-muted-foreground">Diajukan {formatDateTime(r.createdAt)}</p>
              <DecideForm requestId={r.id} />
            </article>
          );
        })}
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold">Riwayat keputusan Anda</h2>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 p-2">
                <span>
                  {h.request.requester.fullName} · koreksi {h.request.correction ? formatDateOnly(h.request.correction.workDate) : ""} · tahap {h.stepNo === 1 ? "atasan" : "HR"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${REQUEST_STATUS[h.decision === "APPROVED" ? "APPROVED" : "REJECTED"][1]}`}>
                  {h.decision === "APPROVED" ? "Anda setujui" : "Anda tolak"} · {formatDateTime(h.decidedAt!)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
