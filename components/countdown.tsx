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

function format(seconds: number) {
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

export function Countdown({
  at,
}: {
  at: ReturnType<typeof nextStart>;
}) {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now() / 1000), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!at) {
    return (
      <p className="text-xl text-zinc-400">
        Preparing. The next phase has not been scheduled yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 text-xl text-zinc-400">
      <span>{at.label} starts in</span>
      <span className="font-mono text-3xl text-zinc-100">
        {format(at.at - now)}
      </span>
    </div>
  );
}
