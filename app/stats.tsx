"use client";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { z } from "zod";

const statsSchema = z.object({
  permitted: z.boolean(),
  started: z.boolean().optional(),
  elo: z.number().optional(),
});

export default function Stats({ api_route }: { api_route: string }) {
  const [stats, setStats] = useState<{
    loading: boolean;
    stats: z.infer<typeof statsSchema> | null;
  }>({
    loading: true,
    stats: null,
  });
  const [user, loading] = useAuthState(auth);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.uid) return;
      setStats({ loading: true, stats: null });
      const response = await fetch(api_route + "/stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });
      if (response.status === 200) {
        const json = await response.json();
        setStats({ loading: false, stats: statsSchema.parse(json) });
      } else {
        setStats({ loading: false, stats: null });
      }
    };
    fetchStats();
  }, [api_route, user?.uid]);

  return loading || stats.loading ? (
    <span className="font-bold text-red-800">Loading...</span>
  ) : stats.stats?.permitted ? (
    stats.stats?.started ? (
      <span className="font-bold text-xl text-green-800">
        {stats.stats?.elo?.toFixed(2)} ELO
      </span>
    ) : (
      <span className="font-bold text-red-800">
        Competition not yet started.
      </span>
    )
  ) : (
    <div className="font-bold text-red-800 flex flex-col gap-2">
      <span>Permission denied.</span>
      <span>
        Check whether you are logged in
        <br />
        with the correct account.
      </span>
    </div>
  );
}
