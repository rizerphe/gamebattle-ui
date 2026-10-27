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
  reportSchema,
  sessionSchema,
} from "@/lib/api";
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

  const reportQuery = useQuery({
    queryKey: ["replay-report", sessionId, user?.uid],
    enabled: !!user && !!session,
    queryFn: () =>
      apiGet(user, `/sessions/${sessionId}/report`, reportSchema, "Could not load the report", 404),
  });
  const report = reportQuery.data;

  const playerIds = useMemo(() => (session ? [session.player] : []), [session]);
  const playerProfiles = useAuthorProfiles(playerIds);

  if (!valid || session === null) {
    return <ReplayFrame message="No session matches this id." />;
  }
  if (sessionQuery.error) return <ReplayFrame message={sessionQuery.error.message} />;
  if (!session) return <ReplayFrame message="Loading session…" />;

  const reportedAt = report ? Math.max(0, report.timestamp - session.started_at) : null;

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
      <SessionRecording
        key={session.id}
        sessionId={session.id}
        startedAt={session.started_at}
        markers={
          report && reportedAt !== null
            ? [{ t: reportedAt, label: `Reported · ${REPORT_REASON_LABELS[report.short_reason]}` }]
            : []
        }
      />
    </div>
  );
}
