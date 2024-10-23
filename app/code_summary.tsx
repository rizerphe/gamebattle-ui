"use client";
import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";

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
        const summary = await response.json();
        setSummary(summary);
      }
    })();
  }, [user]);

  return !loading && summary ? (
    <div className="grid h-full place-content-center max-w-md">{summary}</div>
  ) : (
    <div className="grid h-full place-content-center max-w-md text-slate-400">
      thinking...
    </div>
  );
}
