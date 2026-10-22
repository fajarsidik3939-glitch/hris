// Aturan approval 2 tingkat (docs/DATABASE_DESIGN.md §5.8): atasan langsung → HR.

/** Langkah awal: tahap atasan dilewati bila tidak ada atasan (atau atasannya diri sendiri). */
export function initialSteps(requesterEmployeeId: string, managerId: string | null) {
  const hasManager = Boolean(managerId) && managerId !== requesterEmployeeId;
  return {
    currentStep: hasManager ? 1 : 2,
    steps: [
      { stepNo: 1, approverType: "MANAGER" as const, approverEmployeeId: hasManager ? managerId : null, decision: hasManager ? ("PENDING" as const) : ("SKIPPED" as const) },
      { stepNo: 2, approverType: "HR" as const, approverEmployeeId: null, decision: "PENDING" as const },
    ],
  };
}

type Viewer = { userId: string; employeeId: string | null; permissions: Map<string, unknown> };

/**
 * Bolehkah `viewer` memutuskan langkah yang sedang aktif? Tidak ada yang boleh memutuskan pengajuannya sendiri.
 * Tahap atasan: hanya atasan yang tercatat saat pengajuan (snapshot) dan punya izin approval.manager.
 */
export function canDecide(
  viewer: Viewer,
  request: { status: string; currentStep: number; requesterEmployeeId: string },
  step: { stepNo: number; approverType: string; approverEmployeeId: string | null; decision: string },
) {
  if (request.status !== "PENDING" || step.decision !== "PENDING" || step.stepNo !== request.currentStep) return false;
  if (viewer.employeeId && viewer.employeeId === request.requesterEmployeeId) return false;
  if (step.approverType === "MANAGER") return viewer.permissions.has("approval.manager") && viewer.employeeId === step.approverEmployeeId;
  return viewer.permissions.has("approval.hr");
}

export const REQUEST_STATUS: Record<string, [label: string, className: string]> = {
  PENDING: ["Menunggu", "bg-amber-100 text-amber-800"],
  APPROVED: ["Disetujui", "bg-green-100 text-green-800"],
  REJECTED: ["Ditolak", "bg-red-100 text-red-800"],
  CANCELLED: ["Dibatalkan", "bg-slate-200 text-slate-700"],
};
