"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQuery } from "@tanstack/react-query";
import { usePhase } from "@/components/permissions";
import { canSeeLeaderboard } from "@/lib/phase";
import { leaderboardSchema } from "@/lib/api";
import { apiGet } from "@/lib/fetch";
import { gameTitle } from "@/lib/display-name";

export default function LeaderboardTable() {
  const [user, loading] = useAuthState(auth);
  const phase = usePhase();

  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard", user?.uid ?? "signed-out"],
    enabled: !loading && !!phase.data && canSeeLeaderboard(phase.data.phase),
    queryFn: () =>
      apiGet(user, "/leaderboard", leaderboardSchema, "Could not load the leaderboard.", 403),
  });

  const closed =
    (phase.data && !canSeeLeaderboard(phase.data.phase)) ||
    leaderboardQuery.data === null;
  if (closed) {
    return (
      <p className="m-4 text-xl text-zinc-400">The leaderboard is closed.</p>
    );
  }
  if (leaderboardQuery.error) {
    return (
      <p className="m-4 text-xl text-zinc-400">{leaderboardQuery.error.message}</p>
    );
  }

  return (leaderboardQuery.data ?? []).map((entry) => (
    <div
      key={entry.game_id}
      className="flex flex-row justify-between items-center gap-2 m-4"
    >
      <span className="text-2xl font-bold m-2">{gameTitle(entry.name)}</span>
      <span className="text-xl font-bold m-2">
        {entry.score.toFixed(0)} <span className="text-green-200">ELO</span>
      </span>
    </div>
  ));
}
