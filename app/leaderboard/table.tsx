"use client";
import { PencilLine, Terminal, Trophy, type LucideIcon } from "lucide-react";
import { usePhase } from "@/components/permissions";
import { hasStandings } from "@/lib/phase";
import { EntryRow, HeaderRow, Table } from "@/components/leaderboard-rows";
import { useLeaderboard, useStats } from "@/lib/use-stats";

export default function LeaderboardTable() {
  const phase = usePhase();
  const stats = useStats().data;
  const leaderboard = useLeaderboard();

  if (!phase.data) return <p className="text-sm text-zinc-500">Loading...</p>;

  if (!hasStandings(phase.data.phase) || leaderboard.data === null) {
    const p = stats?.platform;
    const green = (text: string | number) => (
      <span className="font-bold text-green-400">{text}</span>
    );
    const magenta = (text: string, Icon?: LucideIcon) => (
      <span className="font-bold text-fuchsia-400">
        {Icon ? <Icon className="mr-1 inline h-[1em] w-[1em] align-[-0.12em]" /> : null}
        {text}
      </span>
    );
    return (
      <p className="text-xl leading-loose text-zinc-300">
        We haven&apos;t started competing yet - what leaderboard did you expect?
        {p ? (
          <>
            {" "}
            All I can say is, {green(`${p.players} people`)} have {magenta("used")}{" "}
            this platform, {magenta("ran their code", Terminal)} a total of{" "}
            {green(p.runs)} times, there&apos;s {green(p.lines)} total{" "}
            {magenta("lines of code", PencilLine)}, out of which{" "}
            {green(p.largest_game_lines)} in the{" "}
            {magenta("largest game", Trophy)}.
          </>
        ) : null}
      </p>
    );
  }
  if (leaderboard.error) {
    return <p className="text-sm text-zinc-400">{leaderboard.error.message}</p>;
  }

  return (
    <Table>
      <HeaderRow />
      {(leaderboard.data ?? []).map((entry, i) => (
        <EntryRow key={i} place={i + 1} entry={entry} />
      ))}
    </Table>
  );
}
