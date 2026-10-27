"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import { adminStudentsSchema } from "@/lib/api";
import { gameTitle, studentLabels } from "@/lib/display-name";
import { apiGet } from "@/lib/fetch";
import StudentAvatar from "@/components/student-avatar";
import ActivityFeed from "../../../activity/feed";
import { useStudentAdmin } from "../student-admin-context";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[5rem]">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="text-lg tabular-nums text-zinc-100">{value}</dd>
    </div>
  );
}

function StudentSummary() {
  const { studentId, game, profile } = useStudentAdmin();
  const [user] = useAuthState(auth);
  const statsQuery = useQuery({
    queryKey: ["admin-students", user?.uid ?? "signed-out"],
    enabled: !!user,
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
  const row = statsQuery.data?.find((student) => student.id === studentId);
  const merged = {
    email: profile?.email ?? row?.email ?? null,
    username: profile?.username ?? row?.username ?? null,
    photo: profile?.photo ?? row?.photo ?? null,
  };
  const { primary } = studentLabels(merged, game.name, studentId);
  const dash = "—";

  return (
    <section className="flex flex-col gap-6 border-b border-zinc-900 px-8 py-8 sm:flex-row sm:items-center">
      <StudentAvatar
        src={merged.photo}
        name={merged.username ?? merged.email ?? game.name}
        id={studentId}
        className="h-24 w-24 shrink-0 rounded-full bg-zinc-800 object-cover text-3xl font-medium text-zinc-300"
      />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-semibold text-zinc-100">
          {primary}
        </h1>
        {merged.email ? (
          <p className="truncate text-sm text-zinc-400">{merged.email}</p>
        ) : null}
        <p className="mt-1 truncate text-sm text-zinc-500">
          Game: <span className="text-zinc-300">{gameTitle(game.name)}</span>
        </p>
      </div>
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <Stat
          label="Elo"
          value={row?.elo != null ? row.elo.toFixed(0) : dash}
        />
        <Stat label="Place" value={row?.place != null ? `#${row.place}` : dash} />
        <Stat
          label="Times played"
          value={row ? String(row.times_played) : dash}
        />
        <Stat
          label="Ratings made"
          value={row ? String(row.comparisons_made) : dash}
        />
        <Stat
          label="Reports filed"
          value={row ? String(row.reports_filed) : dash}
        />
        <Stat
          label="Reports received"
          value={row ? String(row.reports_received) : dash}
        />
      </dl>
    </section>
  );
}

function StudentActivityContent() {
  const { studentId } = useStudentAdmin();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const filter =
    filterParam === "comparisons" ||
    filterParam === "reports-filed" ||
    filterParam === "sessions"
      ? filterParam
      : undefined;
  return (
    <>
      <StudentSummary />
      <ActivityFeed studentId={studentId} filter={filter} />
    </>
  );
}

export default function StudentActivityPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Loading…</p>}>
      <StudentActivityContent />
    </Suspense>
  );
}
