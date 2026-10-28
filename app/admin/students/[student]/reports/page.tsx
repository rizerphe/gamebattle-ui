"use client";

import moment from "moment";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import { AdminGate } from "@/components/auth-gate";
import { CredibilityBadge, ReasonBadge } from "@/components/reason-badge";
import { SessionRecording } from "@/components/session-recording";
import { StudentChip } from "@/components/student-chip";
import { useAuthorProfiles } from "@/lib/use-author-profiles";
import { apiGet } from "@/lib/fetch";
import { reportsSchema, type Report } from "@/lib/api";
import { useStudentAdmin } from "../student-admin-context";

function useGameReports(gameId: string, enabled: boolean) {
  const [user, loadingAuth] = useAuthState(auth);
  return useQuery({
    queryKey: ["student-reports", gameId, user?.uid ?? "signed-out"],
    enabled: !loadingAuth && !!user && enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to review this student");
      const data = await apiGet(
        user,
        `/games/${gameId}/reports`,
        reportsSchema,
        "Could not load reports",
      );
      if (data === null) throw new Error("Could not load reports");
      return data;
    },
  });
}

function ReportPlayback({ report }: { report: Report }) {
  const atReport = report.timestamp - report.session.started_at;
  return (
    <SessionRecording
      sessionId={report.session.id}
      startedAt={report.session.started_at}
      markers={atReport > 0 ? [{ t: atReport, label: "Reported" }] : []}
      className="min-h-0 flex-1 bg-black"
    />
  );
}

function ReportsContent() {
  const { studentId, error } = useStudentAdmin();
  const deepLink = useSearchParams().get("report");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const reportsQuery = useGameReports(studentId, true);
  const reports = reportsQuery.data ?? null;

  const reporterIds = useMemo(() => {
    const ids = new Set<string>();
    for (const report of reports ?? []) ids.add(report.session.player);
    return Array.from(ids).sort();
  }, [reports]);

  const profiles = useAuthorProfiles(reporterIds);

  const loadError =
    error ??
    (reportsQuery.error instanceof Error ? reportsQuery.error.message : null);

  const ordered = useMemo(
    () => (reports ? [...reports].sort((a, b) => a.timestamp - b.timestamp) : []),
    [reports],
  );

  const activeId =
    (selectedId && ordered.some((row) => row.id === selectedId)
      ? selectedId
      : null) ??
    (deepLink && ordered.some((row) => row.id === deepLink)
      ? deepLink
      : null) ??
    ordered[0]?.id ??
    null;

  const report = ordered.find((row) => row.id === activeId);
  const writtenReason = report?.reason?.trim() ?? "";

  return (
    <AdminGate
      loading={reportsQuery.isPending && !loadError}
      loadingMessage="Loading reports…"
      error={loadError}
    >
      {!reports || reports.length === 0 ? (
        <p className="px-4 text-sm text-zinc-500">
          Nobody reported their game yet.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden lg:grid-cols-[minmax(11rem,14rem)_minmax(0,1fr)]">
            <aside className="flex max-h-[30vh] min-h-0 flex-col gap-2 overflow-y-auto overscroll-contain bg-black p-2 lg:max-h-none">
              <nav aria-label="Reports for this game" className="min-h-0 flex-1">
                {ordered.map((item) => {
                  const active = item.id === activeId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`mb-1 block w-full rounded-md px-2 py-1.5 text-left ${
                        active ? "bg-zinc-900" : "hover:bg-zinc-900/80"
                      }`}
                    >
                      <StudentChip
                        id={item.session.player}
                        profile={profiles.data?.get(item.session.player)}
                        caption="Reporter"
                        size="md"
                      />
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <ReasonBadge reason={item.short_reason} />
                        <CredibilityBadge credibility={item.credibility} />
                        <span className="text-[11px] text-zinc-500">
                          {moment.unix(item.timestamp).format("MMM D, HH:mm")}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>
            {report ? (
              <article className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2 bg-black px-3 py-2 text-sm">
                  <ReasonBadge reason={report.short_reason} />
                  <CredibilityBadge credibility={report.credibility} />
                  {report.credibility?.reason ? (
                    <span className="text-zinc-400">{report.credibility.reason}</span>
                  ) : null}
                </div>
                <div
                  className={`grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-hidden ${
                    writtenReason
                      ? "lg:grid-cols-[minmax(0,1fr)_minmax(12rem,22rem)]"
                      : ""
                  }`}
                >
                  <ReportPlayback key={report.id} report={report} />
                  {writtenReason ? (
                    <section className="flex min-h-0 flex-col overflow-hidden bg-black p-3">
                      <label
                        htmlFor="report-reason-text"
                        className="shrink-0 text-xs font-bold uppercase tracking-wide text-zinc-500"
                      >
                        Written reason
                      </label>
                      <textarea
                        id="report-reason-text"
                        readOnly
                        value={writtenReason}
                        className="mt-2 min-h-[8rem] flex-1 resize-none rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm leading-relaxed text-zinc-300"
                      />
                    </section>
                  ) : null}
                </div>
              </article>
            ) : null}
          </div>
        </div>
      )}
    </AdminGate>
  );
}

export default function StudentReportsPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-black p-4 pt-2">
      <Suspense fallback={<p className="px-4 text-sm text-zinc-500">Loading…</p>}>
        <ReportsContent />
      </Suspense>
    </div>
  );
}
