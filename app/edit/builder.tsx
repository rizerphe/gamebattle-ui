"use client";
import { API_ROUTE } from "@/lib/api-route";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { redirect } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { gameSchema, playerSessionSchema, snapshotSchema, type Game } from "../../lib/api";
import { usePlayer } from "@/components/permissions";
import { canLaunch, isUnlaunchablePython } from "../../lib/paths";

async function putGameName(
  token: string,
  name: string,
): Promise<Game> {
  const response = await fetch(`${API_ROUTE}/game`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Failed to save game name");
  return gameSchema.parse(await response.json());
}

function playHref(sessionId: string, game_id: string | null, returnTo?: string): string {
  if (game_id && returnTo) {
    return `/play/own/${sessionId}/${game_id}?to=${encodeURIComponent(returnTo)}`;
  }
  return `/play/own/${sessionId}`;
}

export default function Builder({
  files,
  modified_files,
  game_id = null,
  snapshot_id,
  canEdit,
  dirty = false,
  returnTo,
  showPublish = true,
}: {
  files: { path: string; content: string }[];
  modified_files: { path: string; content: string }[];
  game_id?: string | null;
  snapshot_id?: string;
  canEdit: boolean;
  dirty?: boolean;
  returnTo?: string;
  showPublish?: boolean;
}) {
  const [user] = useAuthState(auth);
  const [running, setRunning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [launched, setLaunched] = useState<string | null>(null);
  const admin = usePlayer().data?.admin ?? false;
  const canRename = canEdit && !game_id;
  const canRunOwn = !game_id && (canEdit || admin);
  const canRunAdmin = !!game_id && admin;

  const queryClient = useQueryClient();

  const gameKey = game_id ? ["game", "game", game_id] : ["game", user?.uid];
  const { data: game, isLoading } = useQuery({
    queryKey: gameKey,
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      const response = await fetch(
        game_id ? `${API_ROUTE}/games/${game_id}` : `${API_ROUTE}/game`,
        { headers: { Authorization: `Bearer ${await user.getIdToken()}` } }
      );
      if (!response.ok) throw new Error("Failed to fetch game");
      return gameSchema.parse(await response.json());
    },
    enabled: !!user,
  });

  const [draftName, setDraftName] = useState<string | undefined>(undefined);
  const [entrypoint, setEntrypoint] = useState("");
  const name = draftName ?? game?.name ?? "";

  const candidates = useMemo(
    () => files.filter((file) => canLaunch(file.path)),
    [files]
  );
  const unlaunchable = useMemo(
    () => files.filter((file) => isUnlaunchablePython(file.path)),
    [files]
  );
  const entry =
    entrypoint && files.some((file) => file.path === entrypoint)
      ? entrypoint
      : candidates.some((file) => file.path === "main.py")
        ? "main.py"
        : candidates.length === 1
          ? candidates[0].path
          : "";

  const runBlocked =
    modified_files.length > 0 ||
    !snapshot_id ||
    !files.find((file) => file.path === entry) ||
    dirty;

  useEffect(() => {
    if (!canRename || !user || draftName === undefined) return;
    const trimmed = draftName.trim();
    if (!trimmed || trimmed.length > 80 || trimmed === game?.name) return;
    const handle = setTimeout(() => {
      void user.getIdToken().then(async (token) => {
        try {
          queryClient.setQueryData(
            ["game", user.uid],
            await putGameName(token, trimmed)
          );
        } catch (error) {
          console.error(error);
        }
      });
    }, 400);
    return () => clearTimeout(handle);
  }, [canRename, draftName, game?.name, queryClient, user]);

  async function startRun() {
    if (!user || runBlocked) return;
    const trimmed = name.trim();
    if (
      canRename &&
      trimmed &&
      trimmed.length <= 80 &&
      trimmed !== game?.name
    ) {
      try {
        queryClient.setQueryData(
          ["game", user.uid],
          await putGameName(await user.getIdToken(), trimmed)
        );
      } catch (error) {
        console.error(error);
      }
    }
    setRunning(true);
    const token = await user.getIdToken();
    const response = await fetch(
      canRunAdmin
        ? `${API_ROUTE}/games/${game_id}/sessions`
        : `${API_ROUTE}/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: canRunAdmin ? undefined : JSON.stringify({ game: snapshot_id }),
      }
    );
    if (!response.ok) {
      console.error(response);
      setRunning(false);
      return;
    }
    setLaunched(playerSessionSchema.parse(await response.json()).id);
  }

  return launched ? (
    redirect(playHref(launched, game_id, returnTo))
  ) : (
    <>
      <div className="flex flex-row items-center p-2 cursor-pointer gap-2 bg-zinc-700">
        <span>Run</span>
      </div>
      <div className="flex flex-col items-stretch p-2 overflow-visible gap-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <span>Name:</span>
          <input
            className={`px-2 py-1 bg-zinc-700 rounded flex-1 ${
              name ? "" : "outline outline-2 outline-red-600"
            }`}
            value={name}
            disabled={!canRename}
            onChange={(e) => setDraftName(e.target.value)}
          />
        </div>
        {!isLoading && candidates.length === 0 ? (
          <span
            className={`text-sm ${
              files.length > 0 ? "text-red-400" : "text-zinc-400"
            }`}
          >
            {files.length === 0
              ? "No game files yet. Create or upload a Python file to get started."
              : "No Python file can be started yet. Add a main.py, or a .py file whose name has no spaces."}
          </span>
        ) : (
        <div className="flex flex-row items-center gap-2 justify-between">
          <span>Entrypoint:</span>
          <Select
            className={`flex-1 ${
              files.find((file) => file.path === entry)
                ? ""
                : "outline outline-2 outline-red-600"
            }`}
            value={files.find((file) => file.path === entry) ?? null}
            onChange={(option) => {
              if (!option?.path) return;
              setEntrypoint(option.path);
            }}
            getOptionLabel={(option) => option.path}
            theme={(theme) => ({
              ...theme,
              colors: {
                primary: "#8a9ba8",
                primary75: "#6e7d8a",
                primary50: "#525f6d",
                primary25: "#364152",
                danger: "#a88a9b",
                dangerLight: "#524136",
                neutral0: theme.colors.neutral90,
                neutral5: theme.colors.neutral80,
                neutral10: theme.colors.neutral70,
                neutral20: theme.colors.neutral60,
                neutral30: theme.colors.neutral50,
                neutral40: theme.colors.neutral40,
                neutral50: theme.colors.neutral30,
                neutral60: theme.colors.neutral20,
                neutral70: theme.colors.neutral10,
                neutral80: theme.colors.neutral5,
                neutral90: theme.colors.neutral0,
              },
            })}
            isLoading={isLoading}
            isDisabled={!canEdit}
            isClearable={false}
            isSearchable={true}
            options={candidates}
            noOptionsMessage={() => "Create a Python file first."}
          />
        </div>
        )}
        {unlaunchable.length > 0 && (
          <div
            role="alert"
            className={`rounded border p-2 text-sm ${
              candidates.length > 0
                ? "border-amber-700 bg-amber-950/40 text-amber-200"
                : "border-red-600 bg-red-950/60 text-red-200"
            }`}
          >
            <div className="font-bold">
              {unlaunchable.length === 1
                ? "This Python file can't be started:"
                : "These Python files can't be started:"}
            </div>
            <ul className="list-disc pl-5 break-all">
              {unlaunchable.map((file) => (
                <li key={file.path}>{file.path}</li>
              ))}
            </ul>
            <div className="mt-1">
              A file with a space in its name can be imported, but never
              chosen as the entrypoint. Rename it (double-click or right-click
              it) to run it.
            </div>
          </div>
        )}
        {canRunOwn || canRunAdmin ? (
          <>
            <button
              type="button"
              disabled={runBlocked || running}
              onClick={() => void startRun()}
              className={`flex flex-row items-center justify-center gap-2 p-2 rounded ${
                runBlocked || running
                  ? "bg-zinc-700 text-zinc-500"
                  : "bg-blue-700 hover:bg-blue-600 text-zinc-100 cursor-pointer"
              }`}
            >
              {running ? <span>Starting…</span> : <span>Run latest</span>}
            </button>
            <span className="text-zinc-500 text-sm">
              Launches the latest snapshot. This does not publish.
            </span>
          </>
        ) : !game_id ? (
          <span className="text-zinc-500 text-sm">Running is closed.</span>
        ) : null}
        {game_id && showPublish ? (
          <div
            className={`flex flex-row items-center justify-center gap-2 p-2 rounded ${
              modified_files.length || dirty || !snapshot_id
                ? "bg-zinc-700 text-zinc-500"
                : "bg-green-800 hover:bg-green-700 cursor-pointer"
            }`}
            onClick={async () => {
              if (modified_files.length || dirty || !snapshot_id) return;
              setPublishing(true);
              const response = await fetch(
                `${API_ROUTE}/games/${game_id}/publish`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${await user?.getIdToken()}`,
                  },
                  body: JSON.stringify({ snapshot_id }),
                }
              );
              setPublishing(false);
              if (!response.ok) {
                console.error(response);
                return;
              }
              queryClient.setQueryData(
                ["snapshot", "published", game_id],
                snapshotSchema.parse(await response.json())
              );
            }}
          >
            {publishing ? <span>Publishing...</span> : <span>Publish</span>}
          </div>
        ) : null}
        {modified_files.length ? (
          <span className="text-zinc-500 text-sm">
            Save your changes before running.
          </span>
        ) : null}
      </div>
    </>
  );
}
