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
  output: z.string(),
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

  const report = reports?.[report_id - 1];
  const inputRef = useRef<HTMLDivElement>(null);
  const senderRef = useRef<(data: string) => any | null>(null);
  const clearRef = useRef<() => void | null>(null);

  useEffect(() => {
    if (clearRef.current && senderRef.current && report?.output) {
      clearRef.current();
      senderRef.current(report.output);
    }
  });

  return (
    <>
      <div className="flex flex-row justify-start items-center gap-4 p-2 rounded-md bg-black bg-opacity-90 flex-wrap">
        {reports?.map((report, i) => (
          <Link
            key={i}
            href={`/report/${game_id}/${i + 1}`}
            className="hover:underline hover:text-green-400"
          >
            Report {i + 1} by {report.author}
          </Link>
        ))}
        <div className="flex-grow" />
        <span className="text-green-400">
          Short reason: {report?.short_reason}
        </span>
        <Link
          href={`/edit/${game_id}`}
          className="hover:underline hover:text-green-400"
        >
          Edit game
        </Link>
      </div>
      {report?.output ? (
        <div className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch">
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
        <div className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch">
          <GameContainer
            name={`${game_id} - report by ${report?.author} - reason`}
          >
            <GameText
              inputRef={inputRef}
              senderRef={senderRef}
              clearRef={clearRef}
            />
          </GameContainer>
        </div>
      ) : null}
    </>
  );
}
