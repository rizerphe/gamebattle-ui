"use client";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQueryClient } from "@tanstack/react-query";

export default function CodeSummary({ api_route }: { api_route: string }) {
  const [user, loading] = useAuthState(auth);
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (user) {
        const response = await fetch(`${api_route}/summary`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });
        if (!response.ok) {
          console.error(response);
          return;
        }
        const summary: string = await response.json();

        let already_typed = "";

        for (let i = 0; i < summary.length; i++) {
          already_typed += `${summary[i]}`;

          // Random trailing characters, from the full alphabet
          const len_random = summary.length - i - 1;
          const random = Array.from({ length: len_random }, () =>
            String.fromCharCode(Math.floor(Math.random() * 26) + 97)
          ).join("");
          let target = already_typed + random;

          // Except that we preserve all non-alphanumeric from the original summary
          target = target
            .split("")
            .map((c, i) => {
              if (summary[i].match(/[a-zA-Z0-9]/)) {
                return c;
              }
              return summary[i];
            })
            .join("");

          setSummary(target);
          await new Promise((r) => setTimeout(r, 50));
        }
      } else if (!loading) {
        setSummary("Log in to start creating!");
      }
    })();
  }, [user]);

  // We also want to prefetch the game files and metadata so that the app feels faster
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!user) return;
    queryClient.prefetchQuery({
      queryKey: ["files", user?.uid],
      queryFn: async () => {
        const response = await fetch(`${api_route}/game`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });
        if (!response.ok) {
          console.error(response);
          return;
        }
        const files = await response.json();
        return files;
      },
    });
  }, [user]);
  useEffect(() => {
    if (!user) return;
    queryClient.prefetchQuery({
      queryKey: ["metadata", user?.uid],
      queryFn: async () => {
        const response = await fetch(`${api_route}/game/meta`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });
        if (!response.ok) {
          console.error(response);
          return;
        }
        const metadata = await response.json();
        return metadata;
      },
    });
  }, [user]);

  return !loading && summary ? (
    <div className="grid h-full place-content-center w-96 max-w-full font-mono">
      {summary}
    </div>
  ) : (
    <div className="grid h-full place-content-center w-96 max-w-full font-mono text-slate-400">
      thinking...
    </div>
  );
}
