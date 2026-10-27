import type { LeaderboardEntry } from "@/lib/api";
import { gameTitle } from "@/lib/display-name";

const COLUMNS = "grid grid-cols-[2rem_1fr_7.5rem_4rem] items-baseline gap-4 px-4";

/** Bordered, divided table shell shared by the leaderboard page and the home preview. */
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-zinc-800 border-t border-green-900">
      {children}
    </div>
  );
}

export function HeaderRow() {
  return (
    <div className={`${COLUMNS} py-2 text-sm font-bold uppercase whitespace-nowrap text-green-400`}>
      <span className="text-right">#</span>
      <span>Game</span>
      <span className="text-right">Times played</span>
      <span className="text-right">ELO</span>
    </div>
  );
}

export function EntryRow({
  place,
  entry,
}: {
  place: number;
  entry: LeaderboardEntry;
}) {
  const own = entry.own;
  return (
    <div
      className={`${COLUMNS} cursor-pointer py-3 hover:bg-green-950 ${
        own ? "bg-green-950/60 font-bold text-green-100" : "text-zinc-300"
      }`}
    >
      <span className="text-right tabular-nums text-green-500">{place}</span>
      <span className="truncate">{gameTitle(entry.name)}</span>
      <span className="text-right tabular-nums text-zinc-500">{entry.times_played}</span>
      <span className="text-right tabular-nums text-green-300">{entry.score.toFixed(0)}</span>
    </div>
  );
}
