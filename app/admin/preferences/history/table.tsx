"use client";
import { auth } from "../../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect } from "react";
import { z } from "zod";

const EloChangeSchema = z.object({
  team_id: z.string(),
  before: z.number(),
  after: z.number(),
});

const PreferenceHistoryEntrySchema = z.object({
  games: z.tuple([z.string(), z.string()]),
  first_score: z.number(),
  author: z.string(),
  timestamp: z.number(),
  elo_changes: z.array(EloChangeSchema),
});

const PreferenceHistorySchema = z.array(PreferenceHistoryEntrySchema);

type PreferenceHistoryEntry = z.infer<typeof PreferenceHistoryEntrySchema>;

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

function EloChangeDisplay({ change }: { change: z.infer<typeof EloChangeSchema> }) {
  const diff = change.after - change.before;
  const diffColor = diff >= 0 ? "text-green-400" : "text-red-400";
  const diffSign = diff >= 0 ? "+" : "";

  return (
    <div className="flex flex-row items-center gap-2 text-sm">
      <span className="text-gray-400">{change.team_id}:</span>
      <span>{change.before.toFixed(0)}</span>
      <span className="text-gray-500">→</span>
      <span>{change.after.toFixed(0)}</span>
      <span className={diffColor}>
        ({diffSign}{diff.toFixed(1)})
      </span>
    </div>
  );
}

function HistoryEntry({ entry }: { entry: PreferenceHistoryEntry }) {
  return (
    <div className="flex flex-col gap-2 p-4 border-b border-zinc-700">
      <div className="flex flex-row flex-wrap items-center gap-4">
        <div className="flex flex-row items-center gap-2">
          <span className="text-green-300 font-mono">{entry.games[0]}</span>
          <span className="text-gray-500">vs</span>
          <span className="text-green-300 font-mono">{entry.games[1]}</span>
        </div>
        <span className="text-gray-500">|</span>
        <span>
          Score: <span className="text-yellow-300">{entry.first_score.toFixed(2)}</span>
        </span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">{entry.author}</span>
        <span className="flex-grow" />
        <span className="text-gray-500 text-sm">{formatTimestamp(entry.timestamp)}</span>
      </div>
      {entry.elo_changes.length > 0 && (
        <div className="flex flex-row flex-wrap gap-4 ml-4">
          {entry.elo_changes.map((change, i) => (
            <EloChangeDisplay key={i} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PreferenceHistoryTable({ api_route }: { api_route: string }) {
  const [user] = useAuthState(auth);
  const [history, setHistory] = useState<PreferenceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${api_route}/admin/preferences/history`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });
        if (!res.ok) {
          if (res.status === 403) {
            setError("Access denied. Admin privileges required.");
          } else {
            setError(`Failed to fetch history: ${res.status}`);
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        setHistory(PreferenceHistorySchema.parse(data));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch history");
      }
      setLoading(false);
    };
    getHistory();
  }, [user?.uid, api_route]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-red-400">{error}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-gray-400">Please log in to view preference history.</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-gray-400">No preference history found.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-auto">
      {history.map((entry, index) => (
        <HistoryEntry key={index} entry={entry} />
      ))}
    </div>
  );
}

