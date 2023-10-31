"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect } from "react";
import { z } from "zod";
import Link from "next/link";

const RatingsSchema = z.array(
  z.tuple([
    z.object({
      name: z.string(),
      author: z.string(),
      file: z.string(),
      email: z.string(),
    }),
    z.object({
      elo: z.number(),
      place: z.number(),
      accumulation: z.number(),
      reports: z.number(),
    }),
  ])
);

export default function Ratings({ api_route }: { api_route: string }) {
  const [user] = useAuthState(auth);
  const [ratings, setRatings] = useState<z.infer<typeof RatingsSchema>>([]);

  useEffect(() => {
    const getLeaderboard = async () => {
      const res = await fetch(`${api_route}/allstats`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });
      const data = await res.json();
      setRatings(RatingsSchema.parse(data));
    };
    getLeaderboard();
  }, [user?.uid]);

  return ratings.map(([metadata, position], index) => (
    <>
      <span key={index * 4} className="text-2xl font-bold m-2 flex flex-col">
        {metadata.author}
        <span className="text-gray-400 text-sm flex flex-row">
          {metadata.email}
          &nbsp;&#x2022;&nbsp;
          {metadata.name}
        </span>
      </span>
      <span key={index * 4 + 1} className="text-xl font-bold m-2">
        {position.elo.toFixed(0)} <span className="text-green-200">ELO</span> (
        {position.place}&apos;th)
      </span>
      <Link
        key={index * 4 + 2}
        className={`text-xl font-bold m-2 ${
          position.reports > 0 ? "hover:underline" : ""
        } ${
          position.reports > 5
            ? position.reports > 25
              ? "text-red-200"
              : "text-yellow-200"
            : "text-gray-200"
        }`}
        href={`/report/${metadata.email.split("@")[0].split(".")[0]}/1`}
      >
        {position.reports} Reports
      </Link>
      <span
        key={index * 4 + 3}
        className={`text-xl font-bold m-2 ${
          position.accumulation < 5 ? "text-red-200" : "text-blue-200"
        }`}
      >
        {position.accumulation.toFixed(0)} Games
      </span>
    </>
  ));
}
