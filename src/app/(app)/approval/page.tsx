import { forbidden } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { canDecide, REQUEST_STATUS } from "@/lib/approval";
import { formatDateOnly, formatDateTime } from "@/lib/format";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth";
import { leaveBalance } from "@/server/leave";
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
        requester: { select: { id: true, fullName: true, employeeCode: true, hireDate: true, managerId: true, departmentId: true, branch: { select: { name: true } } } },
        correction: { include: { record: { select: { clockInAt: true, clockOutAt: true } } } },
        leave: { include: { leaveType: true } },
      },
    }),
    db.approvalStep.findMany({
      where: { decidedBy: user.id },
      orderBy: { decidedAt: "desc" },
      take: 30,
      include: { request: { include: { requester: { select: { fullName: true } }, correction: { select: { workDate: true } }, leave: { select: { startDate: true, leaveType: { select: { name: true } } } } } } },
    }),
  ]);
  const mine = pending.filter((r) => canDecide({ userId: user.id, employeeId: me ?? null, permissions: user.permissions }, r, r.steps.find((s) => s.stepNo === r.currentStep)!));

  // Untuk cuti: saldo pemohon & rekan (atasan/departemen sama) yang cuti di tanggal yang sama.
  const leaveInfo = new Map(
    await Promise.all(
      mine
        .filter((r) => r.leave)
        .map(async (r) => {
          const l = r.leave!;
          const [balance, overlap] = await Promise.all([
            l.leaveType.deductsBalance ? leaveBalance(r.requester.id, l.leaveTypeId, r.requester.hireDate, db, l.id) : null,
            db.leaveRequest.findMany({
              where: {
                NOT: { employeeId: r.requester.id },
                status: { in: ["PENDING", "APPROVED"] },
                startDate: { lte: l.endDate },
                endDate: { gte: l.startDate },
                employee: { OR: [{ departmentId: r.requester.departmentId }, ...(r.requester.managerId ? [{ managerId: r.requester.managerId }] : [])] },
              },
              select: { status: true, startDate: true, endDate: true, employee: { select: { fullName: true } } },
            }),
          ]);
          return [r.id, { balance, overlap }] as const;
        }),
    ),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold">Approval</h1>
      <section className="space-y-2">
        <h2 className="font-semibold">Menunggu keputusan Anda ({mine.length})</h2>
        {mine.length === 0 && <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">Tidak ada pengajuan yang menunggu.</p>}
        {mine.map((r) => {
          const c = r.correction;
          const l = r.leave;
          const info = leaveInfo.get(r.id);
          return (
            <article key={r.id} className="space-y-2 rounded-lg border bg-white p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <b>
                  {r.requester.fullName} <span className="font-normal text-muted-foreground">({r.requester.employeeCode} · {r.requester.branch.name})</span>
                </b>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">Tahap {r.currentStep === 1 ? "atasan" : "HR"}</span>
              </div>
              {c && (
                <>
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
                </>
              )}
              {l && (
                <>
                  <p>
                    <b>{l.leaveType.name}</b> {formatDateOnly(l.startDate)}
                    {l.endDate.getTime() !== l.startDate.getTime() && <> – {formatDateOnly(l.endDate)}</>} · <b>{Number(l.days)} hari</b>
                    {l.halfDay && " (setengah hari)"}
                  </p>
                  {info?.balance && (
                    <p className={info.balance.available < Number(l.days) ? "font-semibold text-red-700" : "text-muted-foreground"}>
                      Saldo tersedia {info.balance.available} hari → setelah disetujui {info.balance.available - Number(l.days)} hari
                    </p>
                  )}
                  <p className="text-muted-foreground">Alasan: {l.reason}</p>
                  {l.attachmentPath && (
                    <a href={`/api/leave/attachment/${l.id}`} target="_blank" rel="noopener" className="text-primary underline">
                      Lihat lampiran
                    </a>
                  )}
                  <p className="text-xs">
                    {info?.overlap.length
                      ? `Rekan yang juga cuti di tanggal ini: ${info.overlap.map((o) => `${o.employee.fullName}${o.status === "PENDING" ? " (menunggu)" : ""}`).join(", ")}`
                      : "Tidak ada rekan tim/departemen yang cuti di tanggal ini."}
                  </p>
                </>
              )}
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
                  {h.request.requester.fullName} · {h.request.leave ? `${h.request.leave.leaveType.name} ${formatDateOnly(h.request.leave.startDate)}` : `koreksi ${h.request.correction ? formatDateOnly(h.request.correction.workDate) : ""}`} · tahap {h.stepNo === 1 ? "atasan" : "HR"}
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
