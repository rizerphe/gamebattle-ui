import {
  REPORT_REASON_LABELS,
  type Report,
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

export function CredibilityBadge({
  credibility,
}: {
  credibility: Report["credibility"];
}) {
  const verdict = !credibility
    ? { label: "Not assessed", style: "bg-zinc-800 text-zinc-300" }
    : credibility.status === "pending"
      ? { label: "Assessing…", style: "bg-zinc-800 text-zinc-300" }
      : credibility.credible === true
        ? { label: "Credible", style: "bg-green-950 text-green-300" }
        : credibility.credible === false
          ? { label: "Not credible", style: "bg-orange-950 text-orange-300" }
          : { label: `Not assessed (${credibility.status})`, style: "bg-zinc-800 text-zinc-300" };
  return (
    <span
      title={credibility?.reason ?? undefined}
      className={`rounded px-1.5 py-0.5 text-xs font-bold ${verdict.style}`}
    >
      {verdict.label}
    </span>
  );
}
