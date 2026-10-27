"use client";
import { API_ROUTE } from "@/lib/api-route";
import { useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { usePhase } from "@/components/permissions";
import { comparisonSchema, failureDetail, type Comparison } from "@/lib/api";
import { canCompare } from "@/lib/phase";
import ComparisonPlay from "./comparison";
import GamesPlaceholder from "./games-placeholder";

async function requestComparison(
  user: User,
): Promise<{ comparison: Comparison } | { notice: string }> {
  const response = await fetch(`${API_ROUTE}/comparisons`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await user.getIdToken()}` },
  });
  if (response.status === 403) return { notice: "Comparisons are closed." };
  if (!response.ok) {
    return { notice: await failureDetail(response, "No games to compare.") };
  }
  const parsed = comparisonSchema.safeParse(await response.json());
  return parsed.success
    ? { comparison: parsed.data }
    : { notice: "Could not open the comparison." };
}

export default function Select() {
  const [user] = useAuthState(auth);
  const phase = usePhase();
  const [notice, setNotice] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const loadedFor = useRef<string | null>(null);

  const show = (
    result: { comparison: Comparison } | { notice: string },
    uid: string,
  ) => {
    if ("notice" in result) {
      setNotice(result.notice);
      setComparison(null);
      loadedFor.current = null;
      return null;
    }
    setNotice(null);
    loadedFor.current = uid;
    return result.comparison;
  };

  useEffect(() => {
    if (!phase.data) return;
    if (!canCompare(phase.data.phase)) {
      loadedFor.current = null;
      setComparison(null);
      setNotice("Comparisons are closed.");
      return;
    }
    if (!user) {
      loadedFor.current = null;
      setComparison(null);
      setNotice("Sign in to play.");
      return;
    }
    // A refetch would replace the comparison on screen and drop a restart
    // whose response has not been applied yet.
    if (loadedFor.current === user.uid) return;
    const uid = user.uid;
    let cancelled = false;
    void requestComparison(user).then((result) => {
      if (cancelled) return;
      const next = show(result, uid);
      if (next) setComparison(next);
    });
    return () => {
      cancelled = true;
    };
  }, [phase.data, user]);

  const startNextComparison = async () => {
    if (!user) return null;
    return show(await requestComparison(user), user.uid);
  };

  if (comparison) {
    return (
      <ComparisonPlay comparison={comparison}
        onComparison={setComparison}
        onStartNext={startNextComparison}
      />
    );
  }

  if (!phase.data || (canCompare(phase.data.phase) && user && notice === null)) {
    return (
      <div className="flex flex-row flex-1 gap-4 w-full">
        <GamesPlaceholder />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg bg-black bg-opacity-90 w-full p-8 text-xl">
      {notice}
    </div>
  );
}
