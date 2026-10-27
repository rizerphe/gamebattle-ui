"use client";

import LeaderboardTable from "./table";

export default function LeaderboardPage() {
  return (
    <div className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch w-full overflow-hidden">
      <div className="flex flex-row justify-between items-center gap-2 p-4 border-b-2 border-zinc-800">
        <span className="text-2xl font-bold m-2 text-green-300">Game</span>
        <span className="flex-grow" />
        <span className="text-2xl font-bold m-2 text-green-300">Score</span>
      </div>
      <LeaderboardTable />
    </div>
  );
}
