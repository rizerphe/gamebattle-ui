"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import { usePhase } from "@/components/permissions";
import { leaderboardSchema, statsSchema } from "@/lib/api";
import { apiGet } from "@/lib/fetch";
import { hasStandings } from "@/lib/phase";

export function useStats() {
  const [user, loading] = useAuthState(auth);
  return useQuery({
    queryKey: ["stats", user?.uid ?? "signed-out"],
    enabled: !loading && !!user,
    queryFn: () =>
      apiGet(user, "/stats", statsSchema, "Could not load stats.", 403),
  });
}

/** Null while closed (no standings yet, or the server refused). */
export function useLeaderboard() {
  const [user, loading] = useAuthState(auth);
  const phase = usePhase();
  return useQuery({
    queryKey: ["leaderboard", user?.uid ?? "signed-out"],
    enabled: !loading && !!phase.data && hasStandings(phase.data.phase),
    queryFn: () =>
      apiGet(user, "/leaderboard", leaderboardSchema, "Could not load the leaderboard.", 403),
  });
}
