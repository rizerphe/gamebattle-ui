"use client";

import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { ScrubMarker } from "@/components/session-scrubber";
import { auth } from "@/app/firebase";
import {
  recordingChunkSchema,
  terminalEventsSchema,
  type RecordingChunk,
} from "@/lib/api";
import { apiGet } from "@/lib/fetch";

// xterm touches `self` on import, so it cannot be prerendered.
const SessionScrubber = dynamic(() => import("@/components/session-scrubber"), { ssr: false });

const END_SNAP_SECONDS = 0.25;
const KEPT_CHUNKS = 8;
const LIVE_REFRESH_MS = 1000;
const LIVE_EVENTS_MS = 3000;
const RETRY_MS = 2000;

const LABELS: Record<string, string> = {
  stdin: "Input",
  stdout: "Output",
  resize: "Resize",
  "process-exited": "Exited",
  "process-terminated": "Stopped",
};

const isFinal = (type: string | undefined) =>
  type === "process-exited" || type === "process-terminated";

type AuthUser = { getIdToken: () => Promise<string> };

async function fetchRecording(
  user: AuthUser,
  sessionId: string,
  at: number,
): Promise<RecordingChunk> {
  const chunk = await apiGet(
    user,
    `/sessions/${sessionId}/recording?at=${encodeURIComponent(at)}`,
    recordingChunkSchema,
    "Could not load the recording",
  );
  if (!chunk) throw new Error("Could not load the recording");
  return chunk;
}

function eventsUntil(chunk: RecordingChunk, time: number): number {
  let low = 0;
  let high = chunk.events.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (chunk.events[middle]!.elapsed <= time) low = middle + 1;
    else high = middle;
  }
  return low;
}

/** Every recorded event, polled until the process has finished. */
function useTerminalEvents(sessionId: string) {
  const [user] = useAuthState(auth);
  return useQuery({
    queryKey: ["terminal-events", sessionId],
    enabled: !!user,
    queryFn: async () =>
      (await apiGet(
        user,
        `/sessions/${sessionId}/events`,
        terminalEventsSchema,
        "Could not load the recording",
      ))!,
    refetchInterval: (query) =>
      isFinal(query.state.data?.at(-1)?.type) ? false : LIVE_EVENTS_MS,
  });
}

type Loaded = { chunk: RecordingChunk; fetchedAt: number };

/** Loads the chunk covering `time`; playback inside it needs no further requests. */
function useRecordingFrame(sessionId: string, time: number, enabled: boolean) {
  const [user] = useAuthState(auth);
  const [loaded, setLoaded] = useState<Loaded[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; at: number } | null>(null);

  const covering = loaded.findLast(
    ({ chunk }) =>
      chunk.checkpoint.elapsed <= time && (chunk.next === null || time < chunk.next),
  );
  const stale =
    covering !== undefined &&
    covering.chunk.next === null &&
    !isFinal(covering.chunk.events.at(-1)?.type) &&
    time > (covering.chunk.events.at(-1)?.elapsed ?? covering.chunk.checkpoint.elapsed) &&
    Date.now() - covering.fetchedAt > LIVE_REFRESH_MS;
  const needed = covering === undefined || stale;

  useEffect(() => {
    setLoaded([]);
    setError(null);
  }, [sessionId]);

  useEffect(() => {
    if (!enabled || !user || !needed || loading) return;
    if (error && Date.now() - error.at < RETRY_MS) return;
    setLoading(true);
    fetchRecording(user, sessionId, time)
      .then((chunk) => {
        const start = chunk.checkpoint.sequence;
        setLoaded((previous) =>
          [
            ...previous.filter((entry) => entry.chunk.checkpoint.sequence !== start),
            { chunk, fetchedAt: Date.now() },
          ]
            .sort((a, b) => a.chunk.checkpoint.sequence - b.chunk.checkpoint.sequence)
            .slice(-KEPT_CHUNKS),
        );
        setError(null);
      })
      .catch((err: unknown) => {
        console.error(err);
        setError({
          message: err instanceof Error ? err.message : "Could not load the recording",
          at: Date.now(),
        });
      })
      .finally(() => setLoading(false));
  }, [enabled, error, loading, needed, sessionId, time, user]);

  return {
    frame: covering
      ? { chunk: covering.chunk, applied: eventsUntil(covering.chunk, time) }
      : null,
    error: error?.message ?? null,
    started: loaded.length > 0,
  };
}

/** Plays a session back. The timeline ends with the last recorded event; a marker past it is pinned to the end. */
export function SessionRecording({
  sessionId,
  startedAt,
  markers = [],
  className = "",
}: {
  sessionId: string;
  startedAt: number;
  markers?: ScrubMarker[];
  className?: string;
}) {
  const events = useTerminalEvents(sessionId);
  const span = events.data ? Math.max(0, events.data.at(-1)?.elapsed ?? 0) : null;
  /** Seconds into the session, or null to follow the end of a live recording. */
  const [chosen, setChosen] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const time = span === null ? 0 : Math.min(span, Math.max(0, chosen ?? span));
  const { frame, error, started } = useRecordingFrame(sessionId, time, span !== null);
  const message = events.error?.message ?? error;
  const status = message ?? (started ? null : "Loading the recording…");

  useEffect(() => {
    if (!playing || span === null) return;
    let last = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const dt = Math.min(1, (now - last) / 1000);
      last = now;
      setChosen((current) => {
        const next = (current ?? 0) + dt;
        if (next < span) return next;
        setPlaying(false);
        return null;
      });
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, span]);

  return (
    <div
      className={`flex min-h-0 w-full min-w-0 flex-1 flex-col rounded-lg bg-black bg-opacity-90 ${className}`}
    >
      {status ? (
        <p className={`px-4 pt-3 text-xs ${message ? "text-red-300" : "text-zinc-500"}`}>
          {status}
        </p>
      ) : null}
      {span !== null ? (
        <SessionScrubber
          className="min-h-0 flex-1"
          frame={frame}
          duration={span}
          time={time}
          startedAt={startedAt}
          markers={[
            ...(events.data ?? []).map((event) => ({
              t: event.elapsed,
              label: LABELS[event.type] ?? "Event",
            })),
            ...markers.map((marker) => ({ ...marker, t: Math.min(marker.t, span) })),
          ]}
          playing={playing}
          onPlayingChange={(next) => {
            if (next && span - time < END_SNAP_SECONDS) setChosen(0);
            setPlaying(next);
          }}
          onTimeChange={(next) => setChosen(span - next < END_SNAP_SECONDS ? null : next)}
        />
      ) : (
        <div className="min-h-0 flex-1" />
      )}
    </div>
  );
}
