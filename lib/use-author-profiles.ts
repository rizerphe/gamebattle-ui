"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase";
import { studentsSchema, type StudentProfile } from "@/lib/api";
import { apiPost } from "@/lib/fetch";
import { UUID } from "@/lib/ids";

export function useAuthorProfiles(authorIds: string[]) {
  const [user, loadingAuth] = useAuthState(auth);
  const ids = useMemo(
    () =>
      Array.from(new Set(authorIds.filter((id) => UUID.test(id)))).sort(),
    [authorIds],
  );

  return useQuery({
    queryKey: ["student-lookup", ids.join(",")],
    enabled: !loadingAuth && !!user && ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Map<string, StudentProfile>> => {
      if (!user) throw new Error("Sign in to view authors");
      const list = await apiPost(
        user,
        "/students/lookup",
        studentsSchema,
        "Could not load authors",
        { ids },
      );
      return new Map(list.map((profile) => [profile.id, profile]));
    },
  });
}
