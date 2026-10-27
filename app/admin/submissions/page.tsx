"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { auth } from "../../firebase";
import { API_ROUTE } from "@/lib/api-route";
import {
  detailFromBody,
  submissionResultSchema,
  type SubmissionResult,
} from "../../../lib/api";

export default function SubmissionsPage() {
  const [user] = useAuthState(auth);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  const submit = async () => {
    if (!user || !file) return;
    setPending(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("archive", file);
      const response = await fetch(`${API_ROUTE}/submissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        body,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(detailFromBody(payload, "Could not submit the archive"));
      }
      setResult(submissionResultSchema.parse(payload));
    } catch (err) {
      console.error(err);
      setResult(null);
      setError(
        err instanceof Error ? err.message : "Could not submit the archive",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <p className="text-sm text-zinc-400">
        Upload a finished archive. Each game is submitted and published in the
        same step. The address in the archive is only used to ask Firebase
        which account it is. After that the game belongs to that account&apos;s
        id.
      </p>
      <form
        className="mt-8 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setResult(null);
            setError(null);
          }}
          className="text-sm text-zinc-300 file:mr-4 file:rounded file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:font-bold file:text-zinc-100"
        />
        <Button type="submit" disabled={pending || !file} className="w-fit">
          {pending ? "Submitting…" : "Submit and publish"}
        </Button>
      </form>
      {error ? <p className="mt-8 text-sm text-red-300">{error}</p> : null}
      {result ? <Result result={result} /> : null}
    </div>
  );
}

function Result({ result }: { result: SubmissionResult }) {
  const unlinkedIds = new Set(result.unlinked.map((game) => game.game_id));
  return (
    <div className="mt-10">
      <p className="text-sm text-zinc-100">
        Submitted {result.games.length}{" "}
        {result.games.length === 1 ? "game" : "games"}.
        {result.unlinked.length === 0
          ? " Every address matched a Firebase account."
          : ` ${result.unlinked.length} did not match an account and were assigned their own ids.`}
      </p>
      <ul className="mt-6">
        {result.games.map((game) => (
          <li key={game.game_id} className="pb-4">
            <Link
              href={`/admin/students/${game.game_id}`}
              className="text-sm text-zinc-100 hover:text-green-200"
            >
              {game.name}
              {unlinkedIds.has(game.game_id) ? (
                <span className="ml-2 text-xs font-bold text-amber-200">
                  Not linked
                </span>
              ) : null}
            </Link>
            <p className="mt-1 text-sm text-zinc-500">{game.email}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
