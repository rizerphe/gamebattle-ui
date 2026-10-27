"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import {
  comparisonsActivitySchema,
  reportsSchema,
  sessionsSchema,
  type ComparisonActivity,
  type ComparisonSideSession,
  type Report,
  type Session,
  type StudentProfile,
} from "@/lib/api";
import { studentLabels } from "@/lib/display-name";
import { replayableFromSession, replayableFromSide } from "@/lib/replay";
import { apiGet } from "@/lib/fetch";
import ReplayLink from "@/components/replay-link";
import { AdminGate } from "@/components/auth-gate";
import { ReasonBadge } from "@/components/reason-badge";
import { StudentChip } from "@/components/student-chip";
import { useAuthorProfiles } from "@/lib/use-author-profiles";

type ActivityEntry =
  | {
      kind: "comparison";
      at: number;
      key: string;
      comparison: ComparisonActivity;
    }
  | {
      kind: "report";
      at: number;
      key: string;
      report: Report;
    }
  | {
      kind: "session";
      at: number;
      key: string;
      session: Session;
    };

function mergeActivity(
  comparisons: ComparisonActivity[],
  reports: Report[],
  sessions: Session[],
): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    ...comparisons.map((comparison) => ({
      kind: "comparison" as const,
      at: comparison.started_at,
      key: `comparison-${comparison.id}`,
      comparison,
    })),
    ...reports.map((report) => ({
      kind: "report" as const,
      at: report.timestamp,
      key: `report-${report.id}`,
      report,
    })),
    ...sessions.map((session) => ({
      kind: "session" as const,
      at: session.started_at,
      key: `session-${session.id}`,
      session,
    })),
  ];
  return entries.sort((a, b) => b.at - a.at || a.key.localeCompare(b.key));
}

function playerQuery(playerId?: string) {
  if (!playerId) return "";
  return `?player=${encodeURIComponent(playerId)}`;
}

function useActivityFeed(playerId?: string) {
  const [user, loadingAuth] = useAuthState(auth);
  return useQuery({
    queryKey: [
      "admin-activity",
      playerId ?? "all",
      user?.uid ?? "signed-out",
    ],
    enabled: !loadingAuth && !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to view activity");
      const q = playerQuery(playerId);
      const [comparisons, reports, sessions] = await Promise.all([
        apiGet(
          user,
          `/comparisons${q}`,
          comparisonsActivitySchema,
          "Could not load comparisons",
        ),
        apiGet(user, `/reports${q}`, reportsSchema, "Could not load reports"),
        playerId
          ? apiGet(
              user,
              `/games/${playerId}/sessions`,
              sessionsSchema,
              "Could not load sessions",
            )
          : Promise.resolve([] as Session[]),
      ]);
      if (comparisons === null || reports === null || sessions === null) {
        throw new Error("Could not load activity");
      }
      return { comparisons, reports, sessions };
    },
  });
}

function formatActivityWhen(timestamp: number) {
  if (timestamp <= 0) return "Unknown time";
  return new Date(timestamp * 1000).toLocaleString();
}

function formatComparisonStatus(row: ComparisonActivity) {
  if (row.phase === "rated" && row.rating !== null) {
    const left = Math.round(row.rating * 100);
    return `${left}% left · ${100 - left}% right`;
  }
  if (row.phase === "awaiting_rating") return "Awaiting rating";
  return "In progress";
}

function GameNameLink({
  id,
  name,
  profile,
}: {
  id: string | null;
  name: string | null | undefined;
  profile: StudentProfile | undefined;
}) {
  if (!id) return <span className="text-zinc-500">—</span>;
  const label = studentLabels(profile, name, id).primary;
  return (
    <Link
      href={`/admin/students/${id}`}
      className="font-medium text-zinc-200 hover:text-green-300"
    >
      {label}
    </Link>
  );
}

function SideReplays({ sessions }: { sessions: ComparisonSideSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <span className="ml-1 inline-flex flex-wrap gap-x-2 text-xs text-zinc-500">
      {sessions.map((entry, index) => (
        <ReplayLink
          key={entry.session_id}
          replay={replayableFromSide(entry)}
          index={index}
          total={sessions.length}
          className="text-green-400/90 hover:underline"
        />
      ))}
    </span>
  );
}

function ActivityRow({
  timestamp,
  actor,
  children,
}: {
  timestamp: number;
  actor: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
      {actor}
      <div className="min-w-0 flex-1">{children}</div>
      <time
        dateTime={
          timestamp > 0 ? new Date(timestamp * 1000).toISOString() : undefined
        }
        className="shrink-0 text-sm text-zinc-500 sm:max-w-[9rem] sm:text-right"
      >
        {formatActivityWhen(timestamp)}
      </time>
    </div>
  );
}

function voterChipProfile(
  profile: StudentProfile | undefined,
  fallbackEmail?: string | null,
) {
  if (profile) return profile;
  if (fallbackEmail?.trim()) {
    return { email: fallbackEmail.trim(), username: null, photo: null };
  }
  return null;
}

function ComparisonActivityCard({
  row,
  profiles,
}: {
  row: ComparisonActivity;
  profiles: Map<string, StudentProfile> | undefined;
}) {
  return (
    <ActivityRow
      timestamp={row.started_at}
      actor={
        <Link href={`/admin/students/${row.player}`} className="shrink-0">
          <StudentChip
            id={row.player}
            profile={voterChipProfile(
              profiles?.get(row.player),
              row.voter_email,
            )}
            caption="Voted"
            size="lg"
          />
        </Link>
      }
    >
      <p className="text-sm text-zinc-400">
        Compared{" "}
        <GameNameLink
          id={row.game_ids[0]}
          name={row.game_names[0]}
          profile={
            row.game_ids[0] ? profiles?.get(row.game_ids[0]) : undefined
          }
        />
        <SideReplays sessions={row.side_sessions[0]} />
        {" vs "}
        <GameNameLink
          id={row.game_ids[1]}
          name={row.game_names[1]}
          profile={
            row.game_ids[1] ? profiles?.get(row.game_ids[1]) : undefined
          }
        />
        <SideReplays sessions={row.side_sessions[1]} />
      </p>
      <p className="mt-1 text-xs text-zinc-500">{formatComparisonStatus(row)}</p>
    </ActivityRow>
  );
}

function ReportActivityCard({
  report,
  profiles,
}: {
  report: Report;
  profiles: Map<string, StudentProfile> | undefined;
}) {
  const gameId = report.session.game;
  const reporterId = report.session.player;

  return (
    <ActivityRow
      timestamp={report.timestamp}
      actor={
        <Link href={`/admin/students/${reporterId}`} className="shrink-0">
          <StudentChip
            id={reporterId}
            profile={profiles?.get(reporterId) ?? null}
            caption="Reported"
            size="lg"
          />
        </Link>
      }
    >
      <p className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
        <span>Flagged</span>
        <GameNameLink
          id={gameId}
          profile={profiles?.get(gameId)}
          name={null}
        />
        <ReasonBadge reason={report.short_reason} />
        <Link
          href={`/admin/students/${gameId}/reports?report=${report.id}`}
          className="text-xs text-green-300 hover:underline"
        >
          Open
        </Link>
      </p>
    </ActivityRow>
  );
}

function SessionActivityCard({
  session,
  profile,
}: {
  session: Session;
  profile: StudentProfile | undefined;
}) {
  return (
    <ActivityRow
      timestamp={session.started_at}
      actor={
        <Link href={`/admin/students/${session.player}`} className="shrink-0">
          <StudentChip
            id={session.player}
            profile={profile ?? null}
            caption="Ran own game"
            size="lg"
          />
        </Link>
      }
    >
      <p className="text-sm text-zinc-400">
        Tested their game during development
        <span className="ml-2">
          <ReplayLink
            replay={replayableFromSession(session)}
            className="text-green-400/90 hover:underline"
          />
        </span>
      </p>
    </ActivityRow>
  );
}

export default function ActivityFeed({
  studentId,
  filter,
}: {
  studentId?: string;
  filter?: "comparisons" | "reports-filed" | "sessions";
}) {
  const feedQuery = useActivityFeed(studentId);

  const entries = useMemo(() => {
    if (!feedQuery.data) return null;
    let merged = mergeActivity(
      feedQuery.data.comparisons,
      feedQuery.data.reports,
      feedQuery.data.sessions,
    );
    if (filter === "comparisons") {
      merged = merged.filter((entry) => entry.kind === "comparison");
    } else if (filter === "reports-filed") {
      merged = merged.filter((entry) => entry.kind === "report");
    } else if (filter === "sessions") {
      merged = merged.filter((entry) => entry.kind === "session");
    }
    return merged;
  }, [feedQuery.data, filter]);

  const authorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const entry of entries ?? []) {
      if (entry.kind === "comparison") {
        const row = entry.comparison;
        ids.add(row.player);
        for (const side of row.side_sessions) {
          for (const session of side) ids.add(session.game_id);
        }
      } else if (entry.kind === "session") {
        ids.add(entry.session.player);
      } else {
        ids.add(entry.report.session.game);
        ids.add(entry.report.session.player);
      }
    }
    return Array.from(ids).sort();
  }, [entries]);

  const profiles = useAuthorProfiles(authorIds);
  const loading =
    profiles.isLoading || (feedQuery.isPending && !feedQuery.error);

  const rowStripe = (index: number) =>
    index % 2 === 0 ? "bg-black" : "bg-zinc-950";

  const error =
    feedQuery.error instanceof Error
      ? feedQuery.error.message
      : profiles.error instanceof Error
        ? profiles.error.message
        : null;

  return (
    <AdminGate
      loading={loading}
      loadingMessage="Loading activity…"
      error={error}
    >
      {!entries || entries.length === 0 ? (
        <p className="px-8 pt-10 text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <ol className="w-full">
          {entries.map((entry, index) => (
            <li
              key={entry.key}
              className={`w-full border-b border-zinc-900 px-8 py-5 last:border-b-0 ${rowStripe(
                index,
              )} hover:bg-zinc-900/80`}
            >
              {entry.kind === "comparison" ? (
                <ComparisonActivityCard
                  row={entry.comparison}
                  profiles={profiles.data}
                />
              ) : entry.kind === "session" ? (
                <SessionActivityCard
                  session={entry.session}
                  profile={profiles.data?.get(entry.session.player)}
                />
              ) : (
                <ReportActivityCard
                  report={entry.report}
                  profiles={profiles.data}
                />
              )}
            </li>
          ))}
        </ol>
      )}
    </AdminGate>
  );
}
