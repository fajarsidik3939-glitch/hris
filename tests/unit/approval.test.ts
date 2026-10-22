import { describe, expect, it } from "vitest";
import { canDecide, initialSteps } from "@/lib/approval";

const perms = (...p: string[]) => new Map(p.map((x) => [x, "ALL"]));

describe("langkah awal approval", () => {
  it("dengan atasan: mulai di tahap atasan", () => {
    const r = initialSteps("E", "M");
    expect(r.currentStep).toBe(1);
    expect(r.steps.map((s) => s.decision)).toEqual(["PENDING", "PENDING"]);
  });
  it("tanpa atasan / atasan diri sendiri: tahap atasan dilewati, langsung HR", () => {
    expect(initialSteps("E", null)).toMatchObject({ currentStep: 2, steps: [{ decision: "SKIPPED" }, { decision: "PENDING" }] });
    expect(initialSteps("E", "E").currentStep).toBe(2);
  });
});

describe("siapa boleh memutuskan", () => {
  const req = { status: "PENDING", currentStep: 1, requesterEmployeeId: "E" };
  const s1 = { stepNo: 1, approverType: "MANAGER", approverEmployeeId: "M", decision: "PENDING" };
  const s2 = { stepNo: 2, approverType: "HR", approverEmployeeId: null, decision: "PENDING" };
  const manager = { userId: "uM", employeeId: "M", permissions: perms("approval.manager") };
  const otherManager = { userId: "uX", employeeId: "X", permissions: perms("approval.manager") };
  const hr = { userId: "uH", employeeId: "H", permissions: perms("approval.hr") };

  it("tahap atasan: hanya atasan tercatat", () => {
    expect(canDecide(manager, req, s1)).toBe(true);
    expect(canDecide(otherManager, req, s1)).toBe(false);
    expect(canDecide(hr, req, s1)).toBe(false);
  });
  it("tahap HR hanya setelah tahap atasan selesai", () => {
    expect(canDecide(hr, req, s2)).toBe(false);
    expect(canDecide(hr, { ...req, currentStep: 2 }, s2)).toBe(true);
  });
  it("tidak ada yang memutuskan pengajuannya sendiri (mis. HR mengajukan)", () => {
    expect(canDecide({ ...hr, employeeId: "E" }, { ...req, currentStep: 2 }, s2)).toBe(false);
  });
  it("pengajuan selesai/dibatalkan tidak bisa diputuskan lagi", () => {
    expect(canDecide(manager, { ...req, status: "CANCELLED" }, s1)).toBe(false);
    expect(canDecide(manager, req, { ...s1, decision: "APPROVED" })).toBe(false);
  });
});
