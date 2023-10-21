"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect } from "react";
import { z } from "zod";

const LeaderboardSchema = z.array(
  z.object({
    name: z.string(),
    score: z.number(),
  })
);

export default function LeaderboardTable({ api_route }: { api_route: string }) {
  const [user] = useAuthState(auth);
  const [leaderboard, setLeaderboard] = useState<
    z.infer<typeof LeaderboardSchema>
  >([]);

  useEffect(() => {
    const getLeaderboard = async () => {
      const res = await fetch(`${api_route}/leaderboard`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });
      const data = await res.json();
      setLeaderboard(LeaderboardSchema.parse(data));
    };
    getLeaderboard();
  }, [user?.uid]);

  return leaderboard.map((entry, index) => (
    <div
      key={index}
      className="flex flex-row justify-between items-center gap-2 m-4"
    >
      <span className="text-2xl font-bold m-2">{entry.name}</span>
      <span className="text-xl font-bold m-2">
        {entry.score.toFixed(0)} <span className="text-green-200">ELO</span>
      </span>
    </div>
  ));
}
