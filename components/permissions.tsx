"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import { API_ROUTE } from "@/lib/api-route";
import { phaseStateSchema, playerSchema } from "@/lib/api";

export function usePhase() {
  const [user, loading] = useAuthState(auth);
  return useQuery({
    queryKey: ["phase", user?.uid ?? "signed-out"],
    queryFn: async () => {
      const headers: Record<string, string> = {};
      if (user) {
        headers.Authorization = `Bearer ${await user.getIdToken()}`;
      }
      const response = await fetch(`${API_ROUTE}/phase`, { headers });
      if (!response.ok) throw new Error("Failed to load the phase");
      return phaseStateSchema.parse(await response.json());
    },
    enabled: !loading,
    // Phases change on a schedule, with nobody reloading the page.
    refetchInterval: 15_000,
  });
}

export function usePlayer() {
  const [user] = useAuthState(auth);
  return useQuery({
    queryKey: ["player", user?.uid],
    queryFn: async () => {
      if (!user) throw new Error("User not authenticated");
      const response = await fetch(`${API_ROUTE}/player`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      if (!response.ok) throw new Error("Failed to load player");
      return playerSchema.parse(await response.json());
    },
    enabled: !!user,
  });
}
