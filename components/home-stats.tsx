"use client";

import Link from "next/link";
import { TimeLeft } from "@/components/countdown";
import { EntryRow, HeaderRow, Table } from "@/components/leaderboard-rows";
import { usePhase } from "@/components/permissions";
import { useLeaderboard, useStats } from "@/lib/use-stats";

function Preview() {
  const board = useLeaderboard().data;
  if (!board?.length) return null;
  const ownIndex = board.findIndex((e) => e.own);
  const showOwn = ownIndex > 2;
  const hidden = board.length - (showOwn ? Math.max(ownIndex + 1, 4) : 3);
  return (
    <div className="text-base">
      <Table>
        <HeaderRow />
        {board.slice(0, 3).map((entry, i) => (
          <EntryRow key={i} place={i + 1} entry={entry} />
        ))}
        {ownIndex > 3 ? (
          <div className="px-4 py-2 pl-[3.5rem] text-zinc-600">...</div>
        ) : null}
        {showOwn ? <EntryRow place={ownIndex + 1} entry={board[ownIndex]} /> : null}
        <Link
          href="/leaderboard"
          className="group flex flex-row justify-between px-4 py-3 pl-[3.5rem] text-zinc-600"
        >
          <span>{hidden > 0 ? `${hidden} more games` : ""}</span>
          <span className="text-teal-600 group-hover:text-teal-400">See more -&gt;</span>
        </Link>
      </Table>
    </div>
  );
}

export default function CompetitionInfo() {
  const stats = useStats().data;
  const review = usePhase().data?.schedule.review;
  if (!stats?.competition) return null;
  const { accumulation, required_accumulation } = stats.competition;
  const done = accumulation >= required_accumulation;

  return (
    <>
      <div className="flex flex-col gap-2 text-base text-zinc-400">
        <div className="h-2 overflow-hidden rounded bg-zinc-800">
          <div
            className={`h-full ${done ? "bg-green-500" : "bg-zinc-400"}`}
            style={{ width: `${Math.min(1, accumulation / required_accumulation) * 100}%` }}
          />
        </div>
        <div className="flex flex-row items-baseline justify-between gap-2">
          {done ? (
            <span className="text-green-400">{accumulation} comparisons · done</span>
          ) : (
            <span>
              {accumulation} of {required_accumulation} comparisons
            </span>
          )}
          {review ? <TimeLeft at={review} /> : null}
        </div>
      </div>
      <Preview />
    </>
  );
}
