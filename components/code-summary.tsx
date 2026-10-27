"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { auth } from "@/app/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gameSchema, snapshotSchema } from "@/lib/api";
import { apiGet } from "@/lib/fetch";

function scrambled(summary: string, typed: number): string {
  return summary
    .split("")
    .map((c, i) =>
      i < typed || !/[a-zA-Z0-9]/.test(c)
        ? c
        : String.fromCharCode(Math.floor(Math.random() * 26) + 97),
    )
    .join("");
}

export default function CodeSummary() {
  const [user, loading] = useAuthState(auth);
  const [shown, setShown] = useState("");

  const summary = useQuery({
    queryKey: ["summary", user?.uid],
    enabled: !!user,
    queryFn: () => apiGet(user, "/summary", z.string(), "Could not load the summary."),
  }).data;

  useEffect(() => {
    if (!summary) return;
    let typed = 0;
    const timer = setInterval(() => {
      typed += 1;
      setShown(scrambled(summary, typed));
      if (typed >= summary.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [summary]);

  // Prefetch the editor's files and game so the editor opens with them already loaded.
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user) return;
    void queryClient.prefetchQuery({
      queryKey: ["snapshot", user.uid],
      queryFn: () => apiGet(user, "/files", snapshotSchema, "Could not load files."),
    });
    void queryClient.prefetchQuery({
      queryKey: ["game", user.uid],
      queryFn: () => apiGet(user, "/game", gameSchema, "Could not load the game."),
    });
  }, [queryClient, user]);

  const text = !loading && !user ? "Log in to start creating!" : shown;
  return text ? (
    <div className="grid h-full place-content-center w-96 max-w-full font-mono">
      {text}
    </div>
  ) : (
    <div className="grid h-full place-content-center w-96 max-w-full font-mono text-slate-400">
      thinking...
    </div>
  );
}
