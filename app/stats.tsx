"use client";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { z } from "zod";

export function ProgressBar({
  progress,
  children,
}: {
  progress: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="relative w-full h-full min-h-[2rem]">
      <div className="absolute inset-0 flex flex-row items-center justify-center rounded overflow-hidden bg-cyan-950">
        <span
          className="absolute left-0 top-0 bottom-0 rounded bg-zinc-950"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="absolute inset-0 flex flex-row items-center justify-center text-zinc-100 font-black">
        {children}
      </div>
    </div>
  );
}

const statsSchema = z.object({
  permitted: z.boolean(),
  started: z.boolean().optional(),
  elo: z.number().optional(),
  max_elo: z.number().optional(),
  place: z.number().optional().nullable(),
  places: z.number().optional(),
  accumulation: z.number().optional(),
  required_accumulation: z.number().optional(),
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

  const ordinal = (i: number) =>
    i % 10 == 1 && i % 100 != 11
      ? i + "st"
      : i % 10 == 2 && i % 100 != 12
      ? i + "nd"
      : i % 10 == 3 && i % 100 != 13
      ? i + "rd"
      : i + "th";

  return loading || stats.loading ? (
    <span className="font-bold text-red-800">Loading...</span>
  ) : stats.stats?.permitted ? (
    <>
      <div className="flex flex-col justify-evenly items-stretch gap-4">
        <div className="flex flex-col items-center gap-2">
          <span className="font-bold text-xl text-gray-500">Tested games</span>
          <ProgressBar
            progress={
              (stats.stats?.accumulation ?? 0) /
              (stats.stats?.required_accumulation ?? 1)
            }
          >
            {stats?.stats?.accumulation}
          </ProgressBar>
          <span className="font-bold">
            You need to do {stats.stats?.required_accumulation} comparisons.
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="font-bold text-xl text-gray-500">
            Your performance
          </span>
          <ProgressBar
            progress={
              1 -
              ((stats.stats?.place ?? 1) - 1) / ((stats.stats?.places ?? 2) - 1)
            }
          >
            {stats.stats?.elo?.toFixed(0)} ELO
          </ProgressBar>
          {stats?.stats?.place ? (
            <div className="flex flex-row items-center justify-start gap-2">
              <span className="font-bold">You are at</span>
              <span className="font-bold text-xl text-zinc-300">
                {ordinal(Math.round(stats?.stats?.place ?? 0))} place
              </span>
            </div>
          ) : null}
          <span className="font-bold">
            The current top ELO is {stats.stats?.max_elo?.toFixed(2)}.
          </span>
        </div>
      </div>
      {stats.stats?.started ? null : (
        <>
          <span className="font-bold text-red-800">
            Competition not currently started.
          </span>
        </>
      )}
    </>
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
