"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { Input } from "@/components/ui/input";
import { auth } from "@/app/firebase";
import {
  adminStudentsSchema,
  type AdminStudent,
} from "@/lib/api";
import { gameTitle, studentLabels } from "@/lib/display-name";
import { apiGet } from "@/lib/fetch";
import { AdminGate } from "@/components/auth-gate";
import { StudentChip } from "@/components/student-chip";

type SortKey =
  | "name"
  | "reports_received"
  | "reports_filed"
  | "times_played"
  | "comparisons_made";

const METRIC_SORT_COLUMNS: { label: string; key: SortKey }[] = [
  { label: "Reports received", key: "reports_received" },
  { label: "Reports filed", key: "reports_filed" },
  { label: "Times rated", key: "times_played" },
  { label: "Comparisons made", key: "comparisons_made" },
];

function chipProfile(row: AdminStudent) {
  return {
    username: row.username,
    email: row.email,
    photo: row.photo,
  };
}

function reportedTone(count: number): string {
  if (count > 25) return "text-red-300";
  if (count > 5) return "text-amber-300";
  if (count > 0) return "text-zinc-300";
  return "text-zinc-500";
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (column: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === column;
  return (
    <th
      className={`px-8 py-4 text-sm font-medium ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={`group inline-flex items-center gap-1.5 ${
          align === "right" ? "ml-auto" : ""
        } ${
          active ? "text-zinc-200" : "text-zinc-400 group-hover:text-zinc-200"
        }`}
      >
        {label}
        <span className="text-xs text-zinc-600">
          {active ? (sortDir === "desc" ? "↓" : "↑") : "↕"}
        </span>
      </button>
    </th>
  );
}

function ViewButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="ml-3 inline-flex shrink-0 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-500 hover:border-zinc-500 hover:text-green-300"
    >
      View
    </Link>
  );
}

function MetricCell({
  value,
  tone = "text-zinc-300",
  viewHref,
  viewLabel,
}: {
  value: number;
  tone?: string;
  viewHref: string;
  viewLabel: string;
}) {
  return (
    <div className="flex items-center justify-end">
      <span className={`text-base ${value > 0 ? tone : "text-zinc-500"}`}>
        {value}
      </span>
      <ViewButton href={viewHref} label={viewLabel} />
    </div>
  );
}

function filterPill(active: boolean) {
  return active
    ? "border-green-600 bg-green-950 text-green-200"
    : "border-zinc-700 text-zinc-400 hover:border-zinc-500";
}

function useStudentRoster() {
  const [user, loadingAuth] = useAuthState(auth);
  return useQuery({
    queryKey: ["admin-students", user?.uid ?? "signed-out"],
    enabled: !loadingAuth && !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to see students");
      const data = await apiGet(
        user,
        "/admin/students",
        adminStudentsSchema,
        "Could not load students",
      );
      if (data === null) throw new Error("Could not load students");
      return data;
    },
  });
}

export default function StudentsPage() {
  const rosterQuery = useStudentRoster();
  const rows = rosterQuery.data ?? null;
  const error =
    rosterQuery.error instanceof Error ? rosterQuery.error.message : null;
  const loading = rosterQuery.isPending;
  const [query, setQuery] = useState("");
  const [filterReported, setFilterReported] = useState(false);
  const [filterComparisons, setFilterComparisons] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function toggleSort(column: SortKey) {
    if (sortKey === column) {
      setSortDir((dir) => (dir === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(column);
      setSortDir("desc");
    }
  }

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => {
    let list = (rows ?? []).filter((row) => {
      if (needle) {
        const haystack = [
          row.email ?? "",
          row.username ?? "",
          row.game_name ?? "",
          row.id,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      if (filterReported && row.reports_received <= 5) return false;
      if (filterComparisons && row.comparisons_made >= 5) return false;
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortKey === "name") {
        const nameA = studentLabels(chipProfile(a), a.game_name, a.id).primary.toLowerCase();
        const nameB = studentLabels(chipProfile(b), b.game_name, b.id).primary.toLowerCase();
        return nameA.localeCompare(nameB) * dir;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av !== bv) return (av - bv) * dir;
      return a.id.localeCompare(b.id) * dir;
    });
    return list;
  }, [
    filterComparisons,
    filterReported,
    needle,
    rows,
    sortDir,
    sortKey,
  ]);

  const rowStripe = (index: number) =>
    index % 2 === 0 ? "bg-black" : "bg-zinc-950";

  return (
    <AdminGate
      loading={loading}
      loadingMessage="Loading students…"
      error={error}
    >
      <div className="flex flex-col gap-5 px-8 pt-10 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search students"
          className="max-w-md bg-background shadow-none"
        />
        <div className="flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setFilterReported((value) => !value)}
            className={`rounded-full border px-3 py-1.5 transition-colors ${filterPill(filterReported)}`}
          >
            Reported &gt;5 times
          </button>
          <button
            type="button"
            onClick={() => setFilterComparisons((value) => !value)}
            className={`rounded-full border px-3 py-1.5 transition-colors ${filterPill(filterComparisons)}`}
          >
            &lt;5 comparisons
          </button>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-left">
          <thead>
            <tr className="border-y border-zinc-900 bg-zinc-950">
              <SortHeader
                label="Student"
                column="name"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
              <th className="px-8 py-4 text-left text-sm font-medium text-zinc-400">
                Game
              </th>
              <th className="px-8 py-4 text-right text-sm font-medium text-zinc-400">
                ELO
              </th>
              {METRIC_SORT_COLUMNS.map(({ label, key }) => (
                <SortHeader
                  key={key}
                  label={label}
                  column={key}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  align="right"
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-8 py-12 text-center text-zinc-500">
                  No students match.
                </td>
              </tr>
            ) : (
              visible.map((row, index) => {
                const base = `/admin/students/${row.id}`;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-zinc-900 last:border-0 ${rowStripe(
                      index,
                    )} hover:bg-zinc-900/80`}
                  >
                    <td className="px-8 py-4">
                      <Link href={base} className="flex items-center gap-2">
                        <StudentChip
                          id={row.id}
                          profile={chipProfile(row)}
                          gameName={row.game_name}
                          size="lg"
                        />
                        {row.admin ? (
                          <span className="shrink-0 rounded border border-green-700 bg-green-950 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-green-300">
                            Admin
                          </span>
                        ) : null}
                      </Link>
                    </td>
                    <td className="px-8 py-4 text-base text-zinc-300">
                      <Link href={base} className="hover:text-green-300">
                        {gameTitle(row.game_name)}
                      </Link>
                    </td>
                    <td className="px-8 py-4 text-right tabular-nums text-base">
                      {row.elo != null ? (
                        <span>
                          {row.elo.toFixed(0)}
                          {row.place != null ? (
                            <span className="ml-1.5 text-sm text-zinc-500">
                              #{row.place}
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <MetricCell
                        value={row.reports_received}
                        tone={reportedTone(row.reports_received)}
                        viewHref={`${base}/reports`}
                        viewLabel="View reports on this game"
                      />
                    </td>
                    <td className="px-8 py-4 text-right">
                      <MetricCell
                        value={row.reports_filed}
                        viewHref={`${base}/activity?filter=reports-filed`}
                        viewLabel="View reports this student filed"
                      />
                    </td>
                    <td className="px-8 py-4 text-right">
                      <MetricCell
                        value={row.times_played}
                        viewHref={`${base}/development`}
                        viewLabel="View development history"
                      />
                    </td>
                    <td className="px-8 py-4 text-right">
                      <MetricCell
                        value={row.comparisons_made}
                        tone={
                          row.comparisons_made < 5
                            ? "text-red-300"
                            : "text-zinc-300"
                        }
                        viewHref={`${base}/activity?filter=comparisons`}
                        viewLabel="View comparison log"
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminGate>
  );
}
