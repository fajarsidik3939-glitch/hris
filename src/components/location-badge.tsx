import { LABELS } from "@/lib/attendance";
import { cn } from "@/lib/utils";

// Warna + ikon + teks (status tidak hanya dibedakan warna; docs/UI_UX_PLAN.md §5).
const STYLE: Record<string, [string, string]> = {
  IN_RADIUS: ["bg-green-100 text-green-800", "●"],
  OUT_OF_RADIUS: ["bg-amber-100 text-amber-800", "▲"],
  LOW_ACCURACY: ["bg-orange-100 text-orange-800", "◐"],
  FIELD: ["bg-sky-100 text-sky-800", "◆"],
  FINGERPRINT: ["bg-slate-200 text-slate-700", "▣"],
};

export function LocationBadge({ label, distanceM }: { label: string | null; distanceM?: number | null }) {
  if (!label) return null;
  const [cls, icon] = STYLE[label] ?? STYLE.FINGERPRINT;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", cls)}>
      <span aria-hidden>{icon}</span>
      {LABELS[label] ?? label}
      {distanceM != null && label !== "FIELD" && ` · ${distanceM.toLocaleString("id-ID")} m`}
    </span>
  );
}
