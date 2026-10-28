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
      <ArchiveExample />
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

const EXAMPLE_TREE = `archive.zip
├── manifest.json
└── games/
    ├── 0/
    │   ├── cicada.py
    │   └── data
    └── 1/
        └── main.py`;

const EXAMPLE_MANIFEST = `{
  "version": 1,
  "games": [
    {
      "email": "student@ucu.edu.ua",
      "name": "Cicada",
      "files": [
        { "path": "cicada.py", "sha256": "<64 hex chars>" },
        { "path": "data", "sha256": "<64 hex chars>" }
      ]
    },
    {
      "email": "other@ucu.edu.ua",
      "name": "Second game",
      "files": [
        { "path": "main.py", "sha256": "<64 hex chars>" }
      ]
    }
  ]
}`;

function ArchiveExample() {
  return (
    <div className="mt-8 rounded border border-zinc-800 p-4">
      <h2 className="text-sm font-bold text-zinc-100">Archive layout</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <pre className="overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-zinc-300">
          {EXAMPLE_TREE}
        </pre>
        <pre className="overflow-x-auto rounded bg-zinc-900 p-3 text-xs text-zinc-300">
          {EXAMPLE_MANIFEST}
        </pre>
      </div>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-zinc-400">
        <li>
          <code>manifest.json</code> lists every game, in order. Game{" "}
          <code>n</code> in the list has its files under{" "}
          <code>games/n/</code>, starting at 0.
        </li>
        <li>
          Each file&apos;s <code>path</code> is relative to its game folder, and{" "}
          <code>sha256</code> is the hex digest of its bytes. Any missing file,
          extra file, or hash mismatch rejects the whole archive and nothing is
          written.
        </li>
        <li>
          The entrypoint is <code>main.py</code>, or the only <code>.py</code>{" "}
          file without a space in its path.
        </li>
        <li>
          On upload, each <code>email</code> is looked up in Firebase. A match
          makes that account the game&apos;s owner; otherwise the game is
          imported under a new id and listed as not linked. Every game is then
          submitted and published at once.
        </li>
        <li>
          Limits: 1 MiB per file, 64 files and 12 MiB per game, 64 MiB for the
          zip. Names are 1–80 characters, and emails differing only by case are
          duplicates.
        </li>
      </ul>
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
