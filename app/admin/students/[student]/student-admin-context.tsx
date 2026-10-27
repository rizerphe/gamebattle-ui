"use client";

import Link from "next/link";
import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import {
  gameSchema,
  studentSchema,
  type Game,
  type StudentProfile,
} from "@/lib/api";
import AdminTabs from "@/components/admin-tabs";
import { StudentChip } from "@/components/student-chip";
import { UUID } from "@/lib/ids";
import { apiGet } from "@/lib/fetch";

function studentAdminTabs(studentId: string) {
  const base = `/admin/students/${studentId}`;
  return [
    { href: `${base}/activity`, label: "Activity" },
    { href: `${base}/reports`, label: "Reports" },
    { href: `${base}/development`, label: "Development" },
  ] as const;
}

type StudentAdminContextValue = {
  studentId: string;
  game: Game;
  profile: StudentProfile | null;
  error: string | null;
};

const StudentAdminContext = createContext<StudentAdminContextValue | null>(
  null,
);

export function useStudentAdmin() {
  const value = useContext(StudentAdminContext);
  if (!value) {
    throw new Error("useStudentAdmin must be used within StudentAdminProvider");
  }
  return value;
}

export function StudentAdminProvider({
  studentId,
  children,
}: {
  studentId: string;
  children: ReactNode;
}) {
  const [user] = useAuthState(auth);
  const validId = UUID.test(studentId);

  const gameQuery = useQuery({
    queryKey: ["student-game", studentId, user?.uid ?? "signed-out"],
    enabled: !!user && validId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to review this student");
      return apiGet(
        user,
        `/games/${studentId}`,
        gameSchema,
        "Could not load this student",
        404,
      );
    },
  });

  const profileQuery = useQuery({
    queryKey: ["student-profile", studentId, user?.uid ?? "signed-out"],
    enabled: !!user && validId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to review this student");
      return apiGet(
        user,
        `/students/${studentId}`,
        studentSchema,
        "Could not load this student",
        404,
      );
    },
  });

  if (!validId) {
    return (
      <p className="mx-auto w-full max-w-3xl px-8 py-10 text-sm text-zinc-500">
        No student matches.
      </p>
    );
  }

  if (gameQuery.isError) {
    return (
      <p className="mx-auto w-full max-w-3xl px-8 py-10 text-sm text-red-300">
        {gameQuery.error instanceof Error
          ? gameQuery.error.message
          : "Could not load this student"}
      </p>
    );
  }

  const game = gameQuery.data;

  if (gameQuery.isPending || game === undefined) {
    return (
      <p className="mx-auto w-full max-w-3xl px-8 py-10 text-sm text-zinc-500">
        Loading…
      </p>
    );
  }

  if (game === null) {
    return (
      <p className="mx-auto w-full max-w-3xl px-8 py-10 text-sm text-zinc-500">
        No student matches.
      </p>
    );
  }

  const profile = profileQuery.data ?? null;
  const error =
    profileQuery.error instanceof Error ? profileQuery.error.message : null;

  return (
    <StudentAdminContext.Provider
      value={{
        studentId,
        game,
        profile,
        error,
      }}
    >
      <AdminTabs
        tabs={studentAdminTabs(studentId)}
        leading={
          <div className="flex min-w-0 max-w-xs items-center gap-3 sm:max-w-sm">
            <Link
              href="/admin/students"
              className="shrink-0 text-sm text-zinc-400 hover:text-green-300"
            >
              ← Students
            </Link>
            <StudentChip
              id={game.id}
              profile={profile}
              gameName={game.name}
              size="md"
            />
          </div>
        }
      />
      {children}
    </StudentAdminContext.Provider>
  );
}
