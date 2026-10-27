"use client";

import { useMemo } from "react";
import Link from "next/link";
import moment from "moment";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import {
  REPORT_REASON_LABELS,
  gameSchema,
  reportsSchema,
  sessionSchema,
} from "@/lib/api";
import type { z } from "zod";
import { formatRecordingDuration } from "@/lib/replay";
import { UUID } from "@/lib/ids";
import { apiGet } from "@/lib/fetch";
import { useAuthorProfiles } from "@/lib/use-author-profiles";
import { SessionRecording } from "@/components/session-recording";
import { StudentChip } from "@/components/student-chip";

function ReplayFrame({ message }: { message: string }) {
  return (
    <div className="flex w-full flex-col gap-4">
      <Link
        href="/admin/students"
        className="text-sm text-zinc-400 hover:text-green-300"
      >
        ← Students
      </Link>
      <p className="px-4 text-sm text-zinc-400">{message}</p>
    </div>
  );
}

const AI_VERDICTS = {
  enough: { label: "Likely enough", style: "bg-green-950 text-green-300" },
  unsure: { label: "Unsure", style: "bg-yellow-950 text-yellow-300" },
  not_enough: { label: "Likely not enough", style: "bg-orange-950 text-orange-300" },
} as const;

const OVERRIDES = {
  enough: { label: "Enough", style: "bg-green-950 text-green-300" },
  unsure: { label: "Unsure", style: "bg-yellow-950 text-yellow-300" },
  not_enough: { label: "Not enough", style: "bg-orange-950 text-orange-300" },
  verified_not_enough: { label: "Verified not enough", style: "bg-red-950 text-red-300" },
} as const;

function FairnessPanel({ session }: { session: z.infer<typeof sessionSchema> }) {
  const { fairness, fairness_override: override } = session;
  if (!fairness && !override) return null;
  const verdict = fairness?.verdict ? AI_VERDICTS[fairness.verdict] : null;
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-black bg-opacity-90 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-zinc-300">AI check</span>
        {verdict ? (
          <span className={`rounded px-2 py-0.5 text-xs font-bold ${verdict.style}`}>
            {verdict.label}
          </span>
        ) : fairness ? (
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-300">
            Check failed ({fairness.status})
          </span>
        ) : (
          <span className="text-xs text-zinc-500">none</span>
        )}
        {fairness?.duration != null ? (
          <span className="text-xs text-zinc-400">
            played {formatRecordingDuration(fairness.duration)}
          </span>
        ) : null}
        {override ? (
          <>
            <span className="ml-4 font-bold text-zinc-300">Teacher override</span>
            <span className={`rounded px-2 py-0.5 text-xs font-bold ${OVERRIDES[override].style}`}>
              {OVERRIDES[override].label}
            </span>
          </>
        ) : null}
      </div>
      {fairness?.reason ? <p className="text-zinc-400">{fairness.reason}</p> : null}
    </div>
  );
}

export default function ReplayPage({
  params,
}: {
  params: { session: string };
}) {
  const sessionId = params.session;
  const valid = UUID.test(sessionId);
  const [user] = useAuthState(auth);

  const sessionQuery = useQuery({
    queryKey: ["replay-session", sessionId, user?.uid],
    enabled: !!user && valid,
    queryFn: () =>
      apiGet(user, `/sessions/${sessionId}`, sessionSchema, "Could not load the session", 404),
  });
  const session = sessionQuery.data;

  const gameQuery = useQuery({
    queryKey: ["replay-game", session?.game, user?.uid],
    enabled: !!user && !!session,
    queryFn: () =>
      apiGet(user, `/games/${session!.game}`, gameSchema, "Could not load the game", 404),
  });

  const reportsQuery = useQuery({
    queryKey: ["replay-reports", sessionId, user?.uid],
    enabled: !!user && !!session,
    queryFn: () =>
      apiGet(user, `/sessions/${sessionId}/reports`, reportsSchema, "Could not load the reports", 404),
  });
  const reports = reportsQuery.data ?? [];

  const playerIds = useMemo(() => (session ? [session.player] : []), [session]);
  const playerProfiles = useAuthorProfiles(playerIds);

  if (!valid || session === null) {
    return <ReplayFrame message="No session matches this id." />;
  }
  if (sessionQuery.error) return <ReplayFrame message={sessionQuery.error.message} />;
  if (!session) return <ReplayFrame message="Loading session…" />;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-4">
      <div className="flex flex-col gap-1 rounded-lg bg-black bg-opacity-90 px-4 py-3">
        <Link
          href="/admin/students"
          className="w-fit text-sm text-zinc-400 hover:text-green-300"
        >
          ← Students
        </Link>
        <h1 className="text-2xl font-bold text-green-300">
          {gameQuery.data?.name ?? "Session"}
        </h1>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <Link href={`/admin/students/${session.player}`} className="hover:opacity-80">
            <StudentChip
              id={session.player}
              profile={playerProfiles.data?.get(session.player)}
              caption={session.player === session.game ? "Own test" : undefined}
            />
          </Link>
          {moment.unix(session.started_at).format("MMM D, HH:mm")}
        </div>
      </div>
      <FairnessPanel session={session} />
      <SessionRecording
        key={session.id}
        sessionId={session.id}
        startedAt={session.started_at}
        markers={reports.map((report) => ({
          t: Math.max(0, report.timestamp - session.started_at),
          label: `Reported · ${REPORT_REASON_LABELS[report.short_reason]}`,
        }))}
      />
    </div>
  );
}
