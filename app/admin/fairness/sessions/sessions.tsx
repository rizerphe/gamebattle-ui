"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { auth } from "@/app/firebase";
import {
  fairnessRowsSchema,
  fairnessStatusSchema,
  type FairnessRow,
  type FairnessVerdict,
} from "@/lib/api";
import { apiGet, apiSend } from "@/lib/fetch";
import { formatRecordingDuration } from "@/lib/replay";
import { useAuthorProfiles } from "@/lib/use-author-profiles";
import { AdminGate } from "@/components/auth-gate";
import { SessionRecording } from "@/components/session-recording";
import { StudentChip } from "@/components/student-chip";

const CHOICES: { value: FairnessVerdict; label: string; active: string }[] = [
  { value: "enough", label: "Played enough", active: "bg-green-900 border-green-700 text-green-100" },
  { value: "unsure", label: "Unsure", active: "bg-yellow-900 border-yellow-700 text-yellow-100" },
  { value: "not_enough", label: "Not enough", active: "bg-orange-900 border-orange-700 text-orange-100" },
  {
    value: "verified_not_enough",
    label: "Verified not enough",
    active: "bg-red-900 border-red-700 text-red-100",
  },
];

/** Worst first. Unchecked sessions (timeout or error) come last. */
const SEVERITY: Record<string, number> = { not_enough: 0, unsure: 1, none: 2 };

function severityOrder(a: FairnessRow, b: FairnessRow): number {
  const bySeverity =
    (SEVERITY[a.verdict ?? "none"] ?? 2) - (SEVERITY[b.verdict ?? "none"] ?? 2);
  if (bySeverity !== 0) return bySeverity;
  return (a.duration ?? Infinity) - (b.duration ?? Infinity);
}

/** Which section each session sits in is fixed when the page loads. */
function arrange(rows: FairnessRow[]) {
  return {
    verified: rows.filter((row) => row.override !== null).map((row) => row.session_id),
    flagged: rows
      .filter((row) => row.override === null)
      .sort(severityOrder)
      .map((row) => row.session_id),
  };
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold ${className}`}>{children}</span>
  );
}

function VerdictBadge({ row }: { row: FairnessRow }) {
  if (row.verdict === null) {
    return (
      <Badge className="bg-zinc-800 text-zinc-300">
        {row.status === null ? "Not checked" : `Check failed (${row.status})`}
      </Badge>
    );
  }
  const style = {
    enough: "bg-green-950 text-green-300",
    unsure: "bg-yellow-950 text-yellow-300",
    not_enough: "bg-orange-950 text-orange-300",
  }[row.verdict];
  const label = { enough: "Likely enough", unsure: "Unsure", not_enough: "Likely not enough" }[
    row.verdict
  ];
  return <Badge className={style}>{label}</Badge>;
}

function SessionItem({
  row,
  profile,
  onChoose,
  onClear,
}: {
  row: FairnessRow;
  profile: Parameters<typeof StudentChip>[0]["profile"];
  onChoose: (verdict: FairnessVerdict) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const score = row.side === 0 ? row.rating : 1 - row.rating;
  return (
    <li className="border-b border-zinc-900 px-6 py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <StudentChip
          id={row.voter}
          profile={profile ?? (row.voter_email ? { email: row.voter_email, username: null, photo: null } : null)}
          caption="Rater"
          size="md"
          className="w-56 shrink-0"
        />
        <div className="min-w-0 flex-1 basis-72">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-zinc-100">{row.game_name ?? "Unnamed game"}</span>
            <VerdictBadge row={row} />
            {row.duration !== null ? (
              <span className="text-xs text-zinc-400">
                played {formatRecordingDuration(row.duration)}
              </span>
            ) : null}
            <span className="text-xs text-zinc-500">gave it {Math.round(score * 100)}%</span>
            {row.counted ? null : <Badge className="bg-red-950 text-red-300">Rating not counted</Badge>}
            {row.confirmed_warning ? (
              <Badge className="bg-zinc-800 text-zinc-300">Confirmed despite warning</Badge>
            ) : null}
          </div>
          {row.reason ? <p className="mt-1 text-sm text-zinc-400">{row.reason}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              onClick={() => onChoose(choice.value)}
              className={`rounded border px-2 py-1 text-xs font-bold ${
                row.effective === choice.value
                  ? choice.active
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {choice.label}
            </button>
          ))}
          {row.override !== null ? (
            <button
              type="button"
              onClick={onClear}
              className="px-1 text-xs text-zinc-500 underline hover:text-zinc-300"
            >
              clear
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="ml-2 rounded border border-zinc-800 px-2 py-1 text-xs font-bold text-green-300 hover:bg-zinc-900"
          >
            {open ? "Hide recording" : "Show recording"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="mt-4 flex h-[28rem] min-h-0">
          <SessionRecording sessionId={row.session_id} startedAt={row.started_at} />
        </div>
      ) : null}
    </li>
  );
}

export default function Sessions() {
  const [user, loadingAuth] = useAuthState(auth);
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["fairness-sessions", user?.uid ?? "signed-out"], [user?.uid]);

  const status = useQuery({
    queryKey: ["fairness-status", user?.uid ?? "signed-out"],
    enabled: !loadingAuth && !!user,
    queryFn: () => apiGet(user, "/admin/fairness/status", fairnessStatusSchema, "Could not load status"),
  });

  // Never refetched on its own: rows stay where they are until the page is refreshed.
  const rows = useQuery({
    queryKey,
    enabled: !loadingAuth && !!user,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const found = await apiGet(user, "/admin/fairness/sessions", fairnessRowsSchema, "Could not load sessions");
      if (found === null) throw new Error("Could not load sessions");
      return found;
    },
  });

  const [layout, setLayout] = useState<ReturnType<typeof arrange> | null>(null);
  useEffect(() => {
    if (layout === null && rows.data) setLayout(arrange(rows.data));
  }, [layout, rows.data]);

  const byId = useMemo(
    () => new Map((rows.data ?? []).map((row) => [row.session_id, row])),
    [rows.data],
  );
  const profiles = useAuthorProfiles((rows.data ?? []).map((row) => row.voter)).data;

  const patch = (sessionId: string, override: FairnessVerdict | null) => {
    queryClient.setQueryData<FairnessRow[]>(queryKey, (current) =>
      current?.map((row) =>
        row.session_id === sessionId
          ? {
              ...row,
              override,
              effective: override ?? row.verdict ?? "enough",
            }
          : row,
      ),
    );
  };

  const choose = async (sessionId: string, verdict: FairnessVerdict) => {
    if (!user) return;
    try {
      await apiSend(user, "PUT", `/admin/fairness/sessions/${sessionId}`, "Could not save", { verdict });
      patch(sessionId, verdict);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save");
    }
  };

  const clear = async (sessionId: string) => {
    if (!user) return;
    try {
      await apiSend(user, "DELETE", `/admin/fairness/sessions/${sessionId}`, "Could not clear");
      patch(sessionId, null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not clear");
    }
  };

  const renderRows = (ids: string[]) =>
    ids.map((id) => {
      const row = byId.get(id);
      if (!row) return null;
      return (
        <SessionItem
          key={id}
          row={row}
          profile={profiles?.get(row.voter) ?? null}
          onChoose={(verdict) => void choose(id, verdict)}
          onClear={() => void clear(id)}
        />
      );
    });

  return (
    <div className="flex flex-col">
      {status.data && !status.data.enabled ? (
        <p className="border-b border-zinc-900 bg-yellow-950/40 px-6 py-3 text-sm text-yellow-200">
          AI checks are off: no <code>LLM_API_KEY</code> is set, so no ratings are being flagged.
        </p>
      ) : null}
      <AdminGate
        loading={loadingAuth || rows.isLoading || (rows.data !== undefined && layout === null)}
        error={rows.error?.message}
        loadingMessage="Loading sessions…"
      >
        {layout ? (
          <>
            <p className="px-6 py-3 text-xs text-zinc-500">
              Only sessions that can still change a rating are shown. Changes apply right away, but
              rows stay where they are until you refresh.
              {status.data?.model ? ` Model: ${status.data.model}.` : ""}
            </p>
            {layout.verified.length > 0 ? (
              <details className="border-y border-zinc-900">
                <summary className="cursor-pointer px-6 py-3 text-sm font-bold text-zinc-300">
                  Human-verified ({layout.verified.length})
                </summary>
                <ul>{renderRows(layout.verified)}</ul>
              </details>
            ) : null}
            {layout.flagged.length === 0 ? (
              <p className="px-6 py-6 text-sm text-zinc-500">Nothing to review.</p>
            ) : (
              <ul>{renderRows(layout.flagged)}</ul>
            )}
          </>
        ) : null}
      </AdminGate>
    </div>
  );
}
