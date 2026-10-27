"use client";
import { API_ROUTE } from "@/lib/api-route";
import { useQuery } from "@tanstack/react-query";
import { auth } from "@/app/firebase";
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
      <div className="absolute inset-0 flex flex-row items-center justify-center overflow-hidden rounded bg-cyan-950">
        <span
          className="absolute top-0 bottom-0 left-0 rounded bg-zinc-950"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <div className="absolute inset-0 flex flex-row items-center justify-center font-black text-zinc-100">
        {children}
      </div>
    </div>
  );
}

const statsSchema = z.object({
  permitted: z.boolean(),
  started: z.boolean().optional(),
  elo: z.number().optional().nullable(),
  max_elo: z.number().optional().nullable(),
  place: z.number().optional().nullable(),
  places: z.number().optional(),
  accumulation: z.number().optional(),
  required_accumulation: z.number().optional(),
  game_name: z.string().optional().nullable(),
});

export default function Stats() {
  const [user, loadingAuth] = useAuthState(auth);
  const statsQuery = useQuery({
    queryKey: ["stats", user?.uid ?? "signed-out"],
    enabled: !!user,
    queryFn: async () => {
      const response = await fetch(`${API_ROUTE}/stats`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user!.getIdToken()}`,
        },
      });
      if (!response.ok) return null;
      return statsSchema.parse(await response.json());
    },
  });
  const loading = loadingAuth || statsQuery.isPending;
  const stats = statsQuery.data ?? null;

  const ordinal = (i: number) =>
    i % 10 == 1 && i % 100 != 11
      ? i + "st"
      : i % 10 == 2 && i % 100 != 12
      ? i + "nd"
      : i % 10 == 3 && i % 100 != 13
      ? i + "rd"
      : i + "th";

  return loading ? (
    <span className="font-bold text-red-800">Loading...</span>
  ) : stats?.permitted ? (
    <>
      <div className="flex flex-col items-stretch justify-evenly gap-4">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-bold text-gray-500">Tested games</span>
          <ProgressBar
            progress={
              (stats?.accumulation ?? 0) /
              (stats?.required_accumulation ?? 1)
            }
          >
            {stats?.accumulation}
          </ProgressBar>
          <span className="font-bold">
            You need to do {stats?.required_accumulation} comparisons.
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl font-bold text-gray-500">
            Your performance
          </span>
          {stats?.game_name ? (
            <span className="font-bold">Game: {stats?.game_name}</span>
          ) : null}
          <ProgressBar
            progress={
              1 -
              ((stats?.place ?? 1) - 1) / ((stats?.places ?? 2) - 1)
            }
          >
            {stats?.elo?.toFixed(0)} ELO
          </ProgressBar>
          {stats?.place ? (
            <div className="flex flex-row items-center justify-start gap-2">
              <span className="font-bold">You are at</span>
              <span className="text-xl font-bold text-zinc-300">
                {ordinal(Math.round(stats?.place ?? 0))} place
              </span>
            </div>
          ) : null}
          <span className="font-bold">
            The current top ELO is {stats?.max_elo?.toFixed(2)}.
          </span>
        </div>
      </div>
      {stats?.started ? null : (
        <>
          <span className="font-bold text-red-800">
            Competition not currently started.
          </span>
        </>
      )}
    </>
  ) : (
    <div className="flex flex-col font-bold text-red-800 gap-2">
      <span>Permission denied.</span>
      <span>
        Check whether you are logged in
        <br />
        with the correct account.
      </span>
    </div>
  );
}
