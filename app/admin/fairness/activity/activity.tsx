"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { auth } from "@/app/firebase";
import {
  hypotheticalSchema,
  ratedActivitiesSchema,
  reportsSchema,
  type RatedActivity,
} from "@/lib/api";
import { apiGet, apiPost } from "@/lib/fetch";
import { studentLabels } from "@/lib/display-name";
import { useAuthorProfiles } from "@/lib/use-author-profiles";
import { AdminGate } from "@/components/auth-gate";

type Granularity = "minute" | "hour" | "day" | "week";

const BUCKET_SECONDS: Record<Granularity, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

/** One chart point: a rating or a report, and who did it. */
type Point = { at: number; who: string };

function label(at: number, granularity: Granularity): string {
  const date = new Date(at * 1000);
  const options: Intl.DateTimeFormatOptions =
    granularity === "minute"
      ? { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : granularity === "hour"
        ? { month: "short", day: "numeric", hour: "2-digit" }
        : { month: "short", day: "numeric" };
  const text = date.toLocaleString(undefined, options);
  return granularity === "week" ? `Week of ${text}` : text;
}

function buckets(points: Point[], selected: Set<string>, granularity: Granularity) {
  const size = BUCKET_SECONDS[granularity];
  const table = new Map<number, { all: number; selected: number }>();
  for (const point of points) {
    const time = Math.floor(point.at / size) * size;
    const entry = table.get(time) ?? { all: 0, selected: 0 };
    entry.all += 1;
    if (selected.has(point.who)) entry.selected += 1;
    table.set(time, entry);
  }
  return Array.from(table.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, counts]) => ({ time, ...counts }));
}

function useData() {
  const [user, loadingAuth] = useAuthState(auth);
  return useQuery({
    queryKey: ["fairness-activity", user?.uid ?? "signed-out"],
    enabled: !loadingAuth && !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [ratings, reports] = await Promise.all([
        apiGet(user, "/admin/fairness/activity", ratedActivitiesSchema, "Could not load ratings"),
        apiGet(user, "/reports", reportsSchema, "Could not load reports"),
      ]);
      if (ratings === null || reports === null) throw new Error("Could not load activity");
      return { ratings, reports };
    },
  });
}

function useHypothetical(excluded: string[]) {
  const [user] = useAuthState(auth);
  return useQuery({
    queryKey: ["fairness-hypothetical", excluded.join(",")],
    enabled: !!user && excluded.length > 0,
    queryFn: async () => {
      if (!user) throw new Error("Sign in");
      return apiPost(user, "/admin/fairness/hypothetical", hypotheticalSchema, "Could not load the leaderboard", {
        exclude_players: excluded,
      });
    },
  });
}

function voterCounts(ratings: RatedActivity[], reports: { session: { player: string } }[]) {
  const counts = new Map<string, { count: number; email: string | null }>();
  for (const rating of ratings) {
    const entry = counts.get(rating.voter) ?? { count: 0, email: rating.voter_email };
    entry.count += 1;
    counts.set(rating.voter, entry);
  }
  for (const report of reports) {
    const entry = counts.get(report.session.player) ?? { count: 0, email: null };
    entry.count += 1;
    counts.set(report.session.player, entry);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1].count - a[1].count);
}

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-zinc-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

export default function Activity() {
  const [user, loadingAuth] = useAuthState(auth);
  const data = useData();
  const [granularity, setGranularity] = useState<Granularity>("hour");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showReports, setShowReports] = useState(true);
  const [showUncounted, setShowUncounted] = useState(true);
  const [showAll, setShowAll] = useState(false);

  const ratings = data.data?.ratings;
  const reports = data.data?.reports;

  const voters = useMemo(() => voterCounts(ratings ?? [], reports ?? []), [ratings, reports]);
  const profiles = useAuthorProfiles(voters.map(([id]) => id)).data;

  const points = useMemo<Point[]>(
    () => [
      ...(ratings ?? [])
        .filter((row) => (showUncounted || row.counted) && row.rated_at !== null)
        .map((row) => ({ at: row.rated_at as number, who: row.voter })),
      ...(showReports ? reports ?? [] : []).map((report) => ({
        at: report.timestamp,
        who: report.session.player,
      })),
    ],
    [ratings, reports, showReports, showUncounted],
  );

  const deferredSelected = useDeferredValue(selected);
  const deferredGranularity = useDeferredValue(granularity);
  const chart = useMemo(
    () => buckets(points, deferredSelected, deferredGranularity),
    [points, deferredSelected, deferredGranularity],
  );
  const leaderboard = useHypothetical(Array.from(deferredSelected).sort());

  const named = voters.map(([id, info]) => ({
    id,
    count: info.count,
    name: studentLabels(
      profiles?.get(id) ?? (info.email ? { email: info.email, username: null } : null),
      null,
      id,
    ).primary,
  }));
  const needle = search.trim().toLowerCase();
  const shown = named
    .filter((voter) => !needle || voter.name.toLowerCase().includes(needle))
    .slice(0, showAll || needle ? 60 : 12);

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const selectedNames = named.filter((voter) => selected.has(voter.id)).map((voter) => voter.name);
  const selectedLabel =
    selectedNames.length === 0
      ? null
      : selectedNames.length <= 3
        ? selectedNames.join(", ")
        : `${selectedNames.slice(0, 2).join(", ")} +${selectedNames.length - 2} more`;
  const uncounted = (ratings ?? []).filter((row) => !row.counted).length;

  return (
    <div className="flex flex-col">
      <AdminGate
        loading={loadingAuth || data.isLoading}
        error={data.error?.message}
        loadingMessage="Loading activity…"
      >
        {user ? (
          <>
            <div className="flex flex-col gap-3 border-b border-zinc-900 px-6 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find a rater…"
                  className="w-56 rounded border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600"
                />
                <span className="text-xs text-zinc-500">
                  Select people to see how much of the activity is theirs, and what the leaderboard
                  looks like without their ratings.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {shown.map((voter) => (
                  <button
                    key={voter.id}
                    type="button"
                    onClick={() => toggle(voter.id)}
                    className={`rounded px-2 py-1 text-xs ${
                      selected.has(voter.id)
                        ? "bg-green-600 text-white"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    {voter.name} ({voter.count})
                  </button>
                ))}
                {!needle && named.length > 12 ? (
                  <button
                    type="button"
                    onClick={() => setShowAll((value) => !value)}
                    className="text-xs text-zinc-400 underline hover:text-zinc-200"
                  >
                    {showAll ? "Show fewer" : `Show more (${named.length - 12})`}
                  </button>
                ) : null}
                {selected.size > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="text-xs text-zinc-400 underline hover:text-zinc-200"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-4">
                  <Toggle checked={showReports} onChange={setShowReports}>
                    Include reports
                  </Toggle>
                  <Toggle checked={showUncounted} onChange={setShowUncounted}>
                    Include ratings that did not count ({uncounted})
                  </Toggle>
                </div>
                <div className="flex gap-1">
                  {(Object.keys(BUCKET_SECONDS) as Granularity[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGranularity(option)}
                      className={`rounded px-2 py-1 text-xs capitalize ${
                        granularity === option
                          ? "bg-green-600 text-white"
                          : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-64 w-full border-b border-zinc-900 px-4 py-4">
              {chart.length === 0 ? (
                <p className="px-2 text-sm text-zinc-500">No activity yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="time"
                      tickFormatter={(time: number) => label(time, deferredGranularity)}
                      stroke="#6b7280"
                      fontSize={12}
                    />
                    <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid #3f3f46",
                        borderRadius: "8px",
                      }}
                      labelFormatter={(time: number) => label(time, deferredGranularity)}
                      formatter={(value: number, name: string) => [
                        value,
                        name === "selected" ? (selectedLabel ?? "Selected") : "Everyone",
                      ]}
                    />
                    <Area type="monotone" dataKey="all" stroke="#4b5563" fill="#374151" />
                    {selectedLabel ? (
                      <Area type="monotone" dataKey="selected" stroke="#22c55e" fill="#16a34a" />
                    ) : null}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {selected.size > 0 ? (
              <div className="px-6 py-4">
                <h2 className="mb-2 text-sm font-bold text-green-300">
                  Leaderboard without {selectedLabel}
                  {leaderboard.isFetching ? (
                    <span className="ml-2 text-xs text-yellow-400">Loading…</span>
                  ) : null}
                </h2>
                {leaderboard.error ? (
                  <p className="text-sm text-red-300">{leaderboard.error.message}</p>
                ) : null}
                <div className="max-h-96 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-zinc-500">
                      <tr>
                        <th className="w-10 py-1">#</th>
                        <th>Game</th>
                        <th className="text-right">Elo without them</th>
                        <th className="text-right">Change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(leaderboard.data ?? []).map((entry, index) => (
                        <tr
                          key={entry.game_id}
                          className={`border-t border-zinc-900 ${
                            entry.owned_by_excluded
                              ? "bg-purple-950/40"
                              : entry.delta
                                ? "bg-yellow-950/20"
                                : ""
                          }`}
                        >
                          <td className="py-1.5 text-zinc-500">{index + 1}</td>
                          <td className="text-zinc-200">
                            {entry.name ?? "Unnamed game"}
                            {entry.owned_by_excluded ? (
                              <span className="ml-2 text-xs text-purple-300">(their game)</span>
                            ) : null}
                          </td>
                          <td className="text-right tabular-nums">
                            {entry.hypothetical_score === null
                              ? "unrated"
                              : Math.round(entry.hypothetical_score)}
                          </td>
                          <td
                            className={`text-right tabular-nums ${
                              (entry.delta ?? 0) > 0
                                ? "text-green-400"
                                : (entry.delta ?? 0) < 0
                                  ? "text-red-400"
                                  : "text-zinc-500"
                            }`}
                          >
                            {entry.delta ? `${entry.delta > 0 ? "+" : ""}${Math.round(entry.delta)}` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </AdminGate>
    </div>
  );
}
