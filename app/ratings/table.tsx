"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect } from "react";
import { z } from "zod";
import Link from "next/link";
import { FaFilter, FaDownload } from "react-icons/fa";

const RatingsSchema = z.array(
  z.tuple([
    z.object({
      name: z.string(),
      author: z.string(),
      file: z.string(),
      email: z.string(),
    }),
    z.object({
      elo: z.number().or(z.null()),
      place: z.number(),
      accumulation: z.number(),
      reports: z.number(),
      times_played: z.number(),
    }),
  ])
);

export default function Ratings({ api_route }: { api_route: string }) {
  const [user] = useAuthState(auth);
  const [ratings, setRatings] = useState<z.infer<typeof RatingsSchema>>([]);
  const [filterByReports, setFilterByReports] = useState(false);
  const [filterByAccumulation, setFilterByAccumulation] = useState(false);

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

  const download_csv_data = async () => {
    const csv_data = await fetch(`${api_route}/allstats/csv`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
    }).then((res) => res.text());
    const blob = new Blob([csv_data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", "ratings.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <span className="text-2xl font-bold m-2 text-green-300">Author</span>
      <span className="text-2xl font-bold m-2 text-green-300">Score</span>
      <span className="text-2xl font-bold m-2 text-green-300 flex flex-row items-center gap-2">
        Reports
        <FaFilter
          onClick={() => setFilterByReports(!filterByReports)}
          className="text-sm cursor-pointer text-gray-400 hover:text-gray-200"
        />
      </span>
      <span className="text-2xl font-bold m-2 text-green-300">
        Times game was played
      </span>
      <span className="text-2xl font-bold m-2 text-green-300 flex flex-row items-center gap-2">
        Comparisons made
        <FaFilter
          onClick={() => setFilterByAccumulation(!filterByAccumulation)}
          className="text-sm cursor-pointer text-gray-400 hover:text-gray-200"
        />
        <FaDownload
          onClick={download_csv_data}
          className="text-sm cursor-pointer text-gray-400 hover:text-gray-200"
        />
      </span>
      {ratings
        .filter(
          ([metadata, position]) =>
            (!filterByReports || position.reports > 5) &&
            (!filterByAccumulation || position.accumulation < 5)
        )
        .map(([metadata, position], index) => (
          <>
            <span
              key={index * 5}
              className="text-2xl font-bold p-2 flex flex-col border-t border-gray-500"
            >
              {metadata.author}
              <span className="text-gray-400 text-sm flex flex-row">
                {metadata.email}
                &nbsp;&#x2022;&nbsp;
                {metadata.name}
              </span>
            </span>
            <span
              key={index * 5 + 1}
              className="text-xl font-bold p-4 border-t border-gray-500"
            >
              {position.elo ? (
                <>
                  {position.elo.toFixed(0)}{" "}
                  <span className="text-green-200">ELO</span> ({position.place}
                  &apos;th)
                </>
              ) : (
                <span className="text-red-200">Unranked</span>
              )}
            </span>
            <Link
              key={index * 5 + 3}
              className={`text-xl font-bold p-4 border-t border-gray-500 ${
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
              key={index * 5 + 2}
              className="text-xl font-bold p-4 border-t border-gray-500"
            >
              {position.times_played}
            </span>
            <span
              key={index * 5 + 4}
              className={`text-xl font-bold p-4 border-t border-gray-500 ${
                position.accumulation < 5 ? "text-red-200" : "text-blue-200"
              }`}
            >
              {position.accumulation.toFixed(0)} Games
            </span>
          </>
        ))}
    </>
  );
}
