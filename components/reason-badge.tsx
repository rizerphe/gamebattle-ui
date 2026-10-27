import {
  REPORT_REASON_LABELS,
  type ReportReason,
} from "@/lib/api";

const REASON_CLASS: Record<ReportReason, string> = {
  unclear: "bg-amber-950 text-amber-200",
  buggy: "bg-red-950 text-red-300",
  other: "bg-zinc-800 text-zinc-200",
};

export function ReasonBadge({ reason }: { reason: ReportReason }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-bold ${REASON_CLASS[reason]}`}
    >
      {REPORT_REASON_LABELS[reason]}
    </span>
  );
}
