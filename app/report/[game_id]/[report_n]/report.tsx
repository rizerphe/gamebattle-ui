"use client";
import { auth } from "../../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import GameContainer from "@/app/play/game_container";
import { GameText } from "@/app/play/game";
import Link from "next/link";

const reportSchema = z.object({
  short_reason: z.enum(["unclear", "buggy", "other"]),
  reason: z.string(),
  output: z.string().nullable().default(""),
  author: z.string(),
});

const reportsSchema = z.array(reportSchema);

export default function Report({
  api_route,
  game_id,
  report_id,
}: {
  api_route: string;
  game_id: string;
  report_id: number;
}) {
  const [user] = useAuthState(auth);
  const [reports, setReports] = useState<z.infer<typeof reportsSchema>>();
  const [excluded, setExcluded] = useState<boolean | null>(null);
  const [excluding, setExcluding] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      const token = await user?.getIdToken();
      if (!token) return;
      const response = await fetch(`${api_route}/reports/${game_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const reports = reportsSchema.parse(await response.json());
      setReports(reports);
    };
    fetchReport();
  }, [user?.uid]);

  useEffect(() => {
    const fetchExclusionStatus = async () => {
      const token = await user?.getIdToken();
      if (!token) return;
      const response = await fetch(`${api_route}/admin/games/excluded`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const excludedIds: string[] = await response.json();
        setExcluded(excludedIds.includes(game_id));
      }
    };
    fetchExclusionStatus();
  }, [user?.uid, api_route, game_id]);

  const toggleExclusion = async () => {
    const token = await user?.getIdToken();
    if (!token) return;
    setExcluding(true);
    try {
      const response = await fetch(
        `${api_route}/admin/games/${game_id}/exclude`,
        {
          method: excluded ? "DELETE" : "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.ok) {
        setExcluded(!excluded);
      }
    } finally {
      setExcluding(false);
    }
  };

  const report = reports?.[report_id - 1];
  const inputRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<(data: string) => any | null>(null);
  const clearRef = useRef<() => void | null>(null);
  const reasonInputRef = useRef<HTMLDivElement>(null);
  const reasonSenderRef = useRef<(data: string) => any | null>(null);
  const reasonClearRef = useRef<() => void | null>(null);

  useEffect(() => {
    setTimeout(() => {
      if (clearRef.current && senderRef.current && report?.output) {
        clearRef.current();
        senderRef.current(report.output);
      }
      if (reasonClearRef.current && reasonSenderRef.current && report?.reason) {
        // Convert string to Uint8Array and encode as base64
        const bytes = new TextEncoder().encode(
          report.reason.replace(/\n/g, "\r\n")
        );
        const base64 = btoa(
          Array.from(bytes, (c) => String.fromCharCode(c)).join("")
        );

        reasonClearRef.current();
        reasonSenderRef.current(base64);
      }
    }, 0);
  }, [report]);

  return (
    <>
      <div className="flex flex-row flex-wrap items-center justify-start p-2 bg-black gap-8 rounded-md bg-opacity-90">
        {reports?.map((report, i) => (
          <Link
            key={i}
            href={`/report/${game_id}/${i + 1}`}
            className={
              report_id == i + 1 ? "text-green-400" : "hover:text-green-400"
            }
          >
            {i + 1}, {report.author}
          </Link>
        ))}
      </div>
      <div className="flex flex-row flex-wrap items-center justify-start p-2 bg-black gap-8 rounded-md bg-opacity-90">
        <span>
          {"Short reason: "}
          <span className="text-green-400">{report?.short_reason}</span>
        </span>
        <span className="flex-grow" />
        <Link
          href={`/edit/${game_id}`}
          className="text-blue-200 hover:text-green-400"
        >
          Edit game
        </Link>
        {excluded === null ? (
          <span className="text-gray-400">Loading exclusion status...</span>
        ) : excluded ? (
          <>
            <span>
              Game is currently <span className="text-red-400">excluded</span>{" "}
              from the competition.
            </span>
            <button
              onClick={toggleExclusion}
              disabled={excluding}
              className="text-yellow-400 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {excluding ? "Restoring..." : "Restore game to competition."}
            </button>
          </>
        ) : (
          <>
            <span>
              Game is currently <span className="text-green-400">active</span>{" "}
              in the competition.
            </span>
            <button
              onClick={toggleExclusion}
              disabled={excluding}
              className="text-red-400 hover:text-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {excluding ? "Removing..." : "Remove game from competition."}
            </button>
          </>
        )}
      </div>
      {report?.output ? (
        <div className="flex flex-col items-stretch flex-1 bg-black rounded-lg bg-opacity-90">
          <GameContainer
            name={`${game_id} - report by ${report?.author} - game logs`}
          >
            <GameText
              inputRef={inputRef}
              senderRef={senderRef}
              clearRef={clearRef}
            />
          </GameContainer>
        </div>
      ) : null}
      {report?.reason ? (
        <div className="flex flex-col items-stretch flex-1 bg-black rounded-lg bg-opacity-90">
          <GameContainer
            name={`${game_id} - report by ${report?.author} - reason`}
          >
            <GameText
              inputRef={reasonInputRef}
              senderRef={reasonSenderRef}
              clearRef={reasonClearRef}
            />
          </GameContainer>
        </div>
      ) : null}
    </>
  );
}
