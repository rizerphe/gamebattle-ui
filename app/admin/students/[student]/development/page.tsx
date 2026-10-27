"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../../firebase";
import {
  editorFiles,
  failureDetail,
  snapshotSchema,
  snapshotsSchema,
  type Snapshot,
} from "../../../../../lib/api";
import { usePlayer } from "@/components/permissions";
import LiveEditWarning from "@/components/live-edit-warning";
import { StudentChip } from "@/components/student-chip";
import { API_ROUTE } from "@/lib/api-route";
import { detailFromBody } from "../../../../../lib/api";
import { apiGet } from "@/lib/fetch";
import { useAuthorProfiles } from "@/lib/use-author-profiles";
import EditorLayout from "../../../../edit/editor-layout";
import FileBrowser from "../../../../edit/files";
import FileEditor from "../../../../edit/editor";
import { useStudentAdmin } from "../student-admin-context";

const PAGE_SIZE = 100;

const REASON_LABELS: Record<string, string> = {
  initial: "Started",
  import: "Imported",
  upload: "Uploaded",
  modify: "Draft",
  delete: "Deleted",
  save: "Saved",
  discard: "Discarded draft",
};

function isQuiet(snapshot: Snapshot): boolean {
  return snapshot.reason === "modify" || snapshot.reason === "discard";
}

function draftMark(file: Snapshot["files"][number]): string | null | undefined {
  if (!file.draft) return undefined;
  return file.draft.content;
}

function changedPaths(snapshot: Snapshot, parent?: Snapshot): string[] {
  if (!parent) return [];
  const before = new Map(parent.files.map((file) => [file.path, file]));
  const after = new Map(snapshot.files.map((file) => [file.path, file]));
  const paths: string[] = [];
  for (const file of parent.files.concat(snapshot.files)) {
    if (!paths.includes(file.path)) paths.push(file.path);
  }
  return paths
    .filter((path) => {
      const left = before.get(path);
      const right = after.get(path);
      if (!left || !right) return true;
      return (
        left.saved_content !== right.saved_content ||
        draftMark(left) !== draftMark(right)
      );
    })
    .sort();
}

function entrySummary(snapshot: Snapshot, parent?: Snapshot): string {
  const paths = changedPaths(snapshot, parent);
  // A new empty file is created in the editor, not uploaded from disk.
  const allEmpty =
    paths.length > 0 &&
    paths.every((path) => {
      const file = snapshot.files.find((item) => item.path === path);
      return file?.saved_content === "" && !file.draft;
    });
  const label =
    snapshot.reason === "upload" && allEmpty
      ? "Created"
      : (REASON_LABELS[snapshot.reason] ?? snapshot.reason);
  if (paths.length === 1) return `${label} ${paths[0]}`;
  if (paths.length > 1) return `${label} ${paths.length} files`;
  return label;
}

function formatWhen(timestamp: number): string {
  return moment.unix(timestamp).format("D MMMM, HH:mm:ss").toLowerCase();
}

function authorProfile(
  authorId: string,
  selfId: string | undefined,
  selfEmail: string | null | undefined,
  selfPhoto: string | null | undefined,
  profiles: Map<
    string,
    { email: string | null; username: string | null; photo: string | null }
  > | undefined,
) {
  if (selfId && authorId === selfId && selfEmail) {
    return { email: selfEmail, username: null, photo: selfPhoto ?? null };
  }
  return profiles?.get(authorId) ?? null;
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto w-full max-w-3xl px-8 py-10 text-sm text-zinc-500">
      {children}
    </p>
  );
}

function When({
  timestamp,
  className,
}: {
  timestamp: number;
  className?: string;
}) {
  return (
    <time dateTime={new Date(timestamp * 1000).toISOString()} className={className}>
      {formatWhen(timestamp)}
    </time>
  );
}

function PublicationControls({
  gameId,
  snapshot,
  publishedId,
  ready,
  loadError,
}: {
  gameId: string;
  snapshot: Snapshot;
  publishedId: string | null;
  ready: boolean;
  loadError: string | null;
}) {
  const [user] = useAuthState(auth);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<"publish" | "unpublish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPublished = snapshot.id === publishedId;
  const publishDisabled =
    !ready || snapshot.modified || isPublished || pending !== null;
  const unpublishDisabled = !ready || !publishedId || pending !== null;

  async function setPublication(method: "POST" | "DELETE") {
    if (!user) return;
    if (method === "POST" && publishDisabled) return;
    if (method === "DELETE" && unpublishDisabled) return;
    setPending(method === "POST" ? "publish" : "unpublish");
    setError(null);
    try {
      const response = await fetch(`${API_ROUTE}/games/${gameId}/publish`, {
        method,
        headers: {
          ...(method === "POST"
            ? { "Content-Type": "application/json" }
            : {}),
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        ...(method === "POST"
          ? { body: JSON.stringify({ snapshot_id: snapshot.id }) }
          : {}),
      });
      if (!response.ok) {
        setError(
          await failureDetail(
            response,
            method === "POST" ? "Could not publish" : "Could not unpublish",
          ),
        );
        return;
      }
      if (method === "POST") {
        queryClient.setQueryData(
          ["snapshot", "published", gameId],
          snapshotSchema.parse(await response.json()),
        );
      } else {
        queryClient.setQueryData(["snapshot", "published", gameId], null);
      }
    } catch {
      setError(method === "POST" ? "Could not publish" : "Could not unpublish");
    } finally {
      setPending(null);
    }
  }

  const problem = error ?? loadError;
  const note = problem
    ? problem
    : !ready
      ? "Loading publication…"
      : snapshot.modified
        ? "This snapshot still has drafts."
        : isPublished
          ? "This snapshot is live. Unpublish takes the whole game down."
          : publishedId
            ? "Publish replaces the live snapshot. Unpublish takes the whole game down."
            : "Publish makes the selected snapshot live.";

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-zinc-800 px-3 py-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void setPublication("POST")}
          disabled={publishDisabled}
          className={`rounded px-2 py-1 text-xs font-bold ${
            publishDisabled
              ? "bg-zinc-800 text-zinc-500"
              : "bg-green-800 text-zinc-100 hover:bg-green-700"
          }`}
        >
          {pending === "publish" ? "Publishing…" : isPublished ? "Published" : "Publish"}
        </button>
        <button
          type="button"
          onClick={() => void setPublication("DELETE")}
          disabled={unpublishDisabled}
          className={`rounded px-2 py-1 text-xs font-bold ${
            unpublishDisabled
              ? "bg-zinc-800 text-zinc-500"
              : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
          }`}
        >
          {pending === "unpublish" ? "Unpublishing…" : "Unpublish game"}
        </button>
      </div>
      <p className={`text-xs ${problem ? "text-red-300" : "text-zinc-500"}`}>{note}</p>
    </div>
  );
}

function SnapshotView({
  snapshot,
  activeFile,
  onOpen,
}: {
  snapshot: Snapshot;
  activeFile?: string;
  onOpen: (path?: string) => void;
}) {
  const files = useMemo(() => editorFiles(snapshot), [snapshot]);
  const unsaved = useMemo(
    () =>
      files.flatMap((file) =>
        file.content === file.saved_content
          ? []
          : [{ path: file.path, content: file.content }]
      ),
    [files]
  );
  return (
    <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 w-72 shrink-0 flex-col overflow-y-auto bg-zinc-800">
        <FileBrowser
          files={files}
          active_file={activeFile}
          on_file_open={onOpen}
          save_file={() => false}
          delete_file={() => undefined}
          canEdit={false}
        />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-950">
        <FileEditor
          key={snapshot.id}
          files={files}
          active_file={activeFile}
          setActiveFile={onOpen}
          save_file={() => undefined}
          modified_files={unsaved}
          setModifiedFiles={() => undefined}
          canEdit={false}
          idleMessage="This snapshot has no files."
        />
      </div>
    </div>
  );
}

export default function StudentDevelopmentPage() {
  const { studentId, game } = useStudentAdmin();
  const [user] = useAuthState(auth);
  const player = usePlayer().data;
  const gameId = game.id;
  const queryClient = useQueryClient();
  const [showDrafts, setShowDrafts] = useState(false);
  const [pinned, setPinned] = useState<string | null>(null);
  const [chosenFile, setChosenFile] = useState<string | undefined>();
  const seenLatest = useRef<string | null>(null);

  const snapshotKey = ["snapshot", "game", gameId];
  const historyKey = ["snapshot", "history", gameId];
  const publishedKey = ["snapshot", "published", gameId];

  const latestQuery = useQuery({
    queryKey: snapshotKey,
    queryFn: async () => {
      if (!user || !gameId) return;
      const data = await apiGet(
        user,
        `/games/${gameId}/files`,
        snapshotSchema,
        "Could not load files",
      );
      return data ?? undefined;
    },
    enabled: !!user && !!gameId,
  });

  const historyQuery = useInfiniteQuery({
    queryKey: historyKey,
    enabled: !!user && !!gameId,
    initialPageParam: null as string | null,
    retry: false,
    queryFn: async ({ pageParam }) => {
      if (!user || !gameId) return [];
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
      if (pageParam) params.set("before", pageParam);
      const response = await fetch(
        `${API_ROUTE}/games/${gameId}/files/history?${params}`,
        { headers: { Authorization: `Bearer ${await user.getIdToken()}` } },
      );
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(detailFromBody(body, "Could not load history"));
      }
      return snapshotsSchema.parse(body);
    },
    getNextPageParam: (page) =>
      page.length === PAGE_SIZE && page[0] ? page[0].id : undefined,
  });

  const publishedQuery = useQuery({
    queryKey: publishedKey,
    enabled: !!user && !!gameId,
    retry: false,
    queryFn: async () => {
      if (!user || !gameId) return null;
      const response = await fetch(`${API_ROUTE}/games/${gameId}/publish`, {
        headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      });
      if (response.status === 404) {
        const detail = await failureDetail(response, "Could not load publication");
        if (detail === "not published") return null;
        throw new Error(detail);
      }
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(detailFromBody(body, "Could not load publication"));
      }
      return snapshotSchema.parse(body);
    },
  });

  const latestId = latestQuery.data?.id;
  useEffect(() => {
    if (!gameId || !latestId) return;
    if (seenLatest.current === null) {
      seenLatest.current = latestId;
      return;
    }
    if (seenLatest.current !== latestId) {
      seenLatest.current = latestId;
      void queryClient.invalidateQueries({
        queryKey: ["snapshot", "history", gameId],
      });
    }
  }, [gameId, latestId, queryClient]);

  const chronological = useMemo(
    () => historyQuery.data?.pages.slice().reverse().flat() ?? [],
    [historyQuery.data],
  );
  const byId = useMemo(
    () => new Map(chronological.map((snapshot) => [snapshot.id, snapshot])),
    [chronological],
  );
  const latest = latestQuery.data ?? chronological[chronological.length - 1];
  const pinnedSnapshot = pinned ? byId.get(pinned) : undefined;
  const viewingLatest =
    !pinnedSnapshot || pinnedSnapshot.id === latest?.id;
  const viewed = viewingLatest ? latest : pinnedSnapshot;
  const historicalFiles = useMemo(
    () => (viewed && !viewingLatest ? editorFiles(viewed) : []),
    [viewed, viewingLatest],
  );
  const activeFile =
    chosenFile && historicalFiles.some((file) => file.path === chosenFile)
      ? chosenFile
      : (historicalFiles.find((file) => file.content !== file.saved_content)?.path ??
        historicalFiles.find((file) => file.path.endsWith(".py"))?.path ??
        historicalFiles[0]?.path);

  const newestFirst = useMemo(
    () => [...chronological].reverse(),
    [chronological],
  );
  const publishedId = publishedQuery.data?.id ?? null;
  const quietCount = newestFirst.filter(
    (snapshot) =>
      isQuiet(snapshot) &&
      snapshot.id !== latest?.id &&
      snapshot.id !== publishedId,
  ).length;
  const visible = showDrafts
    ? newestFirst
    : newestFirst.filter(
        (snapshot) =>
          !isQuiet(snapshot) ||
          snapshot.id === latest?.id ||
          snapshot.id === publishedId,
      );

  const authorIds = useMemo(
    () =>
      chronological
        .map((snapshot) => snapshot.author)
        .filter((author) => author !== gameId),
    [chronological, gameId],
  );
  const authorProfiles = useAuthorProfiles(authorIds);

  if (historyQuery.isLoading) {
    return <Note>Loading development history…</Note>;
  }
  if (historyQuery.error) {
    return (
      <p className="mx-auto w-full max-w-3xl px-8 py-10 text-sm text-red-300">
        {historyQuery.error instanceof Error
          ? historyQuery.error.message
          : "Could not load history"}
      </p>
    );
  }
  if (!viewed) return <Note>No snapshots.</Note>;

  const viewedParent = viewed.parent_id ? byId.get(viewed.parent_id) : undefined;
  const showViewedAuthor = viewed.author !== gameId;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {viewingLatest ? (
            <EditorLayout game_id={gameId}
              embedded
              returnTo={`/admin/students/${studentId}/development`}
              sidebarFooter={<LiveEditWarning />}
            />
          ) : (
            <SnapshotView
              snapshot={viewed}
              activeFile={activeFile}
              onOpen={setChosenFile}
            />
          )}
        </div>
        <aside className="flex min-h-0 w-80 shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">
          <p
            className={`shrink-0 flex flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-zinc-800 px-3 py-1.5 text-xs ${
              viewingLatest ? "text-zinc-500" : "text-zinc-400"
            }`}
          >
            {viewingLatest ? (
              <>
                Latest snapshot · <When timestamp={viewed.timestamp} />
              </>
            ) : (
              <>
                <span className="text-zinc-500">Read-only</span>
                {" · "}
                <span className="text-zinc-100">
                  {entrySummary(viewed, viewedParent)}
                </span>
                {" · "}
                <When timestamp={viewed.timestamp} />
              </>
            )}
            {showViewedAuthor ? (
              <>
                {" · by "}
                <StudentChip
                  id={viewed.author}
                  profile={authorProfile(
                    viewed.author,
                    player?.id,
                    user?.email,
                    user?.photoURL,
                    authorProfiles.data,
                  )}
                  size="sm"
                  className="inline-flex max-w-full align-bottom"
                />
              </>
            ) : null}
          </p>
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-800 px-3 py-1.5">
            <span className="text-sm font-bold text-zinc-100">History</span>
            <button
              type="button"
              aria-pressed={showDrafts}
              onClick={() => {
                if (showDrafts && pinned) {
                  const selected = byId.get(pinned);
                  if (selected && isQuiet(selected)) setPinned(null);
                }
                setShowDrafts((shown) => !shown);
              }}
              className="text-xs font-bold text-zinc-400 hover:text-green-200"
            >
              {showDrafts
                ? "Hide drafts"
                : `Show drafts${quietCount ? ` (${quietCount})` : ""}`}
            </button>
          </div>
          <PublicationControls
            gameId={gameId}
            snapshot={viewed}
            publishedId={publishedId}
            ready={publishedQuery.isFetched && !publishedQuery.isError}
            loadError={
              publishedQuery.error instanceof Error
                ? publishedQuery.error.message
                : null
            }
          />
          <ol className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <li className="px-3 py-4 text-sm text-zinc-500">
                {quietCount > 0 ? "Nothing here but drafts." : "No snapshots."}
              </li>
            ) : (
              visible.map((snapshot) => {
                const parent = snapshot.parent_id
                  ? byId.get(snapshot.parent_id)
                  : undefined;
                const selected = snapshot.id === (pinned ?? latest?.id);
                const quiet = isQuiet(snapshot);
                const showAuthor = snapshot.author !== gameId;
                return (
                  <li key={snapshot.id}>
                    <button
                      type="button"
                      aria-current={selected ? "true" : undefined}
                      onClick={() =>
                        setPinned(snapshot.id === latest?.id ? null : snapshot.id)
                      }
                      className={`flex w-full flex-col items-start gap-0.5 border-b border-zinc-800 px-3 py-2 text-left ${
                        selected ? "bg-zinc-800" : "hover:bg-zinc-900"
                      } ${quiet ? "text-zinc-600" : "text-zinc-100"}`}
                    >
                      <span className="flex w-full items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {entrySummary(snapshot, parent)}
                        </span>
                        {snapshot.id === publishedId ? (
                          <span className="shrink-0 text-xs font-bold text-green-400">
                            Published
                          </span>
                        ) : null}
                      </span>
                      <When
                        timestamp={snapshot.timestamp}
                        className={`text-xs ${quiet ? "text-zinc-700" : "text-zinc-500"}`}
                      />
                      {showAuthor ? (
                        <span className="flex w-full items-center gap-1 text-xs">
                          <span
                            className={
                              quiet ? "text-amber-200/40" : "text-amber-200"
                            }
                          >
                            by
                          </span>
                          <StudentChip
                            id={snapshot.author}
                            profile={authorProfile(
                              snapshot.author,
                              player?.id,
                              user?.email,
                              user?.photoURL,
                              authorProfiles.data,
                            )}
                            size="sm"
                            className="inline-flex min-w-0 flex-1"
                          />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
            {historyQuery.hasNextPage ? (
              <li className="px-3 py-3">
                <button
                  type="button"
                  onClick={() => void historyQuery.fetchNextPage()}
                  disabled={historyQuery.isFetchingNextPage}
                  className="text-xs font-bold text-zinc-400 hover:text-green-200"
                >
                  {historyQuery.isFetchingNextPage ? "Loading…" : "Older snapshots"}
                </button>
              </li>
            ) : null}
          </ol>
        </aside>
      </div>
    </div>
  );
}
