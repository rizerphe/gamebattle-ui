"use client";

import { useEffect, useState } from "react";
import type { PhaseState } from "@/lib/api";
import { PHASES } from "@/lib/phase";

/** The next scheduled phase after the current one, if any has a start. */
export function nextStart(state: PhaseState) {
  const index = PHASES.findIndex((phase) => phase.name === state.phase);
  for (const phase of PHASES.slice(index + 1)) {
    if (phase.name === "development") continue;
    const at = state.schedule[phase.name];
    if (at !== null) return { name: phase.name, label: phase.label, at };
  }
  return null;
}

export function format(seconds: number) {
  const total = Math.max(0, Math.ceil(seconds));
  const days = Math.floor(total / 86_400);
  const clock = [
    Math.floor((total % 86_400) / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
  return days > 0 ? `${days}d ${clock}` : clock;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Small inline "time remaining" for a unix timestamp. */
export function TimeLeft({ at }: { at: number }) {
  const now = useNow();
  return <span className="font-mono tabular-nums">{format(at - now)} left</span>;
}

export function Countdown({
  at,
}: {
  at: ReturnType<typeof nextStart>;
}) {
  const now = useNow();

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <p className="text-lg text-zinc-400">
        We&apos;re getting things ready behind the scenes.
      </p>
      {at ? (
        <>
          <span className="font-mono text-7xl font-bold tabular-nums text-zinc-100 md:text-9xl">
            {format(at.at - now)}
          </span>
          <span className="text-sm text-zinc-500">until {at.label.toLowerCase()}</span>
        </>
      ) : (
        <p className="text-zinc-500">The next phase has not been scheduled yet.</p>
      )}
    </div>
  );
}
