"use client";
import { API_ROUTE } from "@/lib/api-route";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import FileBrowser from "./files";
import FileEditor from "./editor";
import Builder from "./builder";
import { toast } from "sonner";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  editorFiles,
  entrypointOf,
  snapshotSchema,
  unsavedFiles,
  type GameFile,
  type Snapshot,
} from "../../lib/api";
import { usePhase } from "@/components/permissions";
import { canEdit as phaseAllowsEditing } from "@/lib/phase";
import { isValidPath, pathError } from "../../lib/paths";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_FILES = 64;
const DRAFT_DELAY_MS = 400;

const FILE_ERRORS: Record<string, string> = {
  "invalid file name": "That file name is not allowed.",
  "file is too large": "That file is too large.",
  "too many files": "This game already has as many files as it can hold.",
  "expected_current is not the current snapshot":
    "Those changes conflicted with a newer version. Try again.",
  "editing is closed": "Editing is closed.",
  "snapshot not found": "That snapshot no longer exists.",
  "game not found": "That game no longer exists.",
  "invalid request": "That file could not be saved.",
};

function isAllowedPath(path: string): boolean {
  return isValidPath(path);
}

function sameFile(left: GameFile, right: GameFile): boolean {
  return (
    left.path === right.path &&
    left.saved_content === right.saved_content &&
    (left.draft === null) === (right.draft === null) &&
    (left.draft?.content ?? null) === (right.draft?.content ?? null)
  );
}

function writeKey(file: GameFile): string {
  return JSON.stringify([
    file.path,
    file.saved_content,
    file.draft === null ? null : file.draft.content,
  ]);
}

function desiredWrite(
  path: string,
  snapshot: Snapshot,
  modified: { path: string; content: string }[],
  busy: ReadonlySet<string>
): GameFile | null {
  if (!path || busy.has(path) || !isAllowedPath(path)) return null;
  const stored = snapshot.files.find((file) => file.path === path);
  const local = modified.find((file) => file.path === path);
  const saved = stored?.saved_content ?? null;
  if (!local || local.content === saved) {
    if (!stored?.draft) return null;
    return { path, saved_content: saved, draft: null };
  }
  const next: GameFile = {
    path,
    saved_content: saved,
    draft: { content: local.content },
  };
  if (stored && sameFile(stored, next)) return null;
  return next;
}

function applyFile(snapshot: Snapshot, file: GameFile): Snapshot {
  const remaining = snapshot.files.filter((item) => item.path !== file.path);
  const files =
    file.saved_content === null && file.draft === null
      ? remaining
      : [...remaining, file].sort((left, right) => left.path.localeCompare(right.path));
  return {
    ...snapshot,
    files,
    modified: files.some((item) => item.draft !== null),
  };
}

async function fileErrorMessage(response: Response): Promise<string> {
  if (response.status >= 500) return "Could not update the file";
  try {
    const body: unknown = await response.json();
    const detail =
      body && typeof body === "object" && "detail" in body
        ? (body as { detail: unknown }).detail
        : undefined;
    if (typeof detail === "string" && detail in FILE_ERRORS) {
      return FILE_ERRORS[detail];
    }
  } catch {
    // The body was not the error shape we show to people.
  }
  return "Could not update the file";
}

async function postFile(
  token: string,
  route: string,
  expected: string,
  file: GameFile
): Promise<Response> {
  return fetch(route, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ expected_current: expected, file }),
  });
}

async function readSnapshot(
  token: string,
  route: string
): Promise<Snapshot | undefined> {
  const response = await fetch(route, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return;
  return snapshotSchema.parse(await response.json());
}

export default function EditorLayout({
  game_id = null,
  embedded = false,
  sidebarFooter,
  returnTo,
}: {
  game_id?: string | null;
  embedded?: boolean;
  sidebarFooter?: ReactNode;
  returnTo?: string;
}) {
  const [user] = useAuthState(auth);
  const phase = usePhase().data?.phase;
  // Admins edit other players' games whatever the phase is.
  const canEdit = game_id ? true : (phase ? phaseAllowsEditing(phase) : false);
  const files_route = game_id
    ? `${API_ROUTE}/games/${game_id}/files`
    : `${API_ROUTE}/files`;
  const [active_file, setActiveFile] = useState<string | undefined>(undefined);
  const [modified_files, setModifiedFiles] = useState<
    { path: string; content: string }[]
  >([]);
  const [draftsReady, setDraftsReady] = useState(false);

  const queryClient = useQueryClient();
  const modifiedRef = useRef(modified_files);
  modifiedRef.current = modified_files;
  const userRef = useRef(user);
  userRef.current = user;
  const canEditRef = useRef(canEdit);
  canEditRef.current = canEdit;
  const chain = useRef(Promise.resolve());
  const timers = useRef(new Map<string, number>());
  const pending = useRef(new Set<string>());
  const suppressed = useRef(new Map<string, string>());
  const openedSingle = useRef(false);
  const commitRef = useRef<(file: GameFile) => Promise<boolean>>(async () => false);

  const snapshotKey = game_id
    ? ["snapshot", "game", game_id]
    : ["snapshot", user?.uid];
  const snapshotKeyRef = useRef(snapshotKey);
  snapshotKeyRef.current = snapshotKey;
  const snapshot = useQuery({
    queryKey: snapshotKey,
    queryFn: async () => {
      if (!user) return;
      return readSnapshot(await user.getIdToken(), files_route);
    },
    enabled: !!user,
  }).data;
  const files = useMemo(
    () => (snapshot ? editorFiles(snapshot) : []),
    [snapshot]
  );

  const scope = `${game_id ?? ""}:${user?.uid ?? ""}`;
  const seenScope = useRef<string | null>(null);
  useEffect(() => {
    if (seenScope.current === null) {
      seenScope.current = scope;
      return;
    }
    if (seenScope.current === scope) return;
    seenScope.current = scope;
    setDraftsReady(false);
    setModifiedFiles([]);
    setActiveFile(undefined);
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current.clear();
    pending.current.clear();
    suppressed.current.clear();
    openedSingle.current = false;
  }, [scope]);

  useEffect(() => {
    if (!snapshot || draftsReady) return;
    const unsaved = unsavedFiles(snapshot);
    setModifiedFiles((current) => {
      const byPath = new Map(unsaved.map((file) => [file.path, file]));
      current.forEach((file) => byPath.set(file.path, file));
      return Array.from(byPath.values());
    });
    setDraftsReady(true);
    setActiveFile((current) => {
      if (current) return current;
      if (unsaved.length > 0) return unsaved[0].path;
      const entry = entrypointOf(editorFiles(snapshot));
      return entry ?? current;
    });
  }, [snapshot, draftsReady]);

  useEffect(() => {
    if (!draftsReady || openedSingle.current) return;
    if (files.length === 1 && files[0].path.endsWith(".py")) {
      openedSingle.current = true;
      setActiveFile((current) => current ?? files[0].path);
    }
  }, [draftsReady, files]);

  // Close the open tab when its file is gone (deleted, or never created).
  // A path with a write in flight is about to exist; "" is a new file the
  // browser is still naming.
  useEffect(() => {
    if (!draftsReady || !snapshot || !active_file) return;
    if (pending.current.has(active_file)) return;
    if (files.some((file) => file.path === active_file)) return;
    setActiveFile(undefined);
  }, [active_file, draftsReady, files, snapshot]);

  const enqueue = (task: () => Promise<void>) => {
    chain.current = chain.current.then(task, task);
  };

  commitRef.current = async (file: GameFile) => {
    const currentUser = userRef.current;
    if (!currentUser) {
      toast.error("User not logged in");
      return false;
    }
    if (!canEditRef.current) {
      toast.error("Editing is closed");
      return false;
    }
    if (file.path && !isAllowedPath(file.path)) {
      toast.error(pathError(file.path) ?? "Invalid file name");
      return false;
    }
    const pieces = [file.saved_content, file.draft?.content ?? null];
    if (
      pieces.some(
        (piece) =>
          piece !== null && new TextEncoder().encode(piece).length > MAX_FILE_BYTES
      )
    ) {
      toast.error("File size too large");
      return false;
    }
    const key = snapshotKeyRef.current;
    const current = queryClient.getQueryData<Snapshot>(key);
    if (!current) return false;
    const exists = current.files.some((item) => item.path === file.path);
    const removing = file.saved_content === null && file.draft === null;
    if (!removing && !exists && current.files.length >= MAX_FILES) {
      toast.error("Too many files");
      return false;
    }
    if (current.files.some((item) => sameFile(item, file)) || (!exists && removing)) {
      return true;
    }

    const token = await currentUser.getIdToken();
    const previous = current;
    queryClient.setQueryData(key, applyFile(current, file));
    try {
      let response = await postFile(token, files_route, current.id, file);
      if (response.status === 409) {
        const fresh = await readSnapshot(token, files_route);
        if (fresh) {
          queryClient.setQueryData(key, applyFile(fresh, file));
          response = await postFile(
            await currentUser.getIdToken(),
            files_route,
            fresh.id,
            file
          );
        }
      }
      if (!response.ok) {
        const fresh = await readSnapshot(
          await currentUser.getIdToken(),
          files_route
        ).catch(() => undefined);
        queryClient.setQueryData(key, fresh ?? previous);
        toast.error(await fileErrorMessage(response));
        return false;
      }
      queryClient.setQueryData(key, snapshotSchema.parse(await response.json()));
      return true;
    } catch (error) {
      console.error(error);
      queryClient.setQueryData(key, previous);
      toast.error("Could not update the file");
      return false;
    }
  };

  useEffect(() => {
    if (!draftsReady || !canEdit) {
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current.clear();
      return;
    }
    const snap = queryClient.getQueryData<Snapshot>(snapshotKeyRef.current) ?? snapshot;
    if (!snap) return;
    const paths = new Set<string>();
    for (const file of modified_files) paths.add(file.path);
    for (const file of snap.files) if (file.draft) paths.add(file.path);
    Array.from(timers.current.keys()).forEach((path) => {
      if (!paths.has(path)) {
        window.clearTimeout(timers.current.get(path));
        timers.current.delete(path);
      }
    });
    Array.from(paths).forEach((path) => {
      const next = desiredWrite(path, snap, modified_files, pending.current);
      const key = next ? writeKey(next) : null;
      const timer = timers.current.get(path);
      if (!next || (key !== null && suppressed.current.get(path) === key)) {
        if (timer !== undefined) {
          window.clearTimeout(timer);
          timers.current.delete(path);
        }
        return;
      }
      if (timer !== undefined) window.clearTimeout(timer);
      timers.current.set(
        path,
        window.setTimeout(() => {
          timers.current.delete(path);
          enqueue(async () => {
            const latest =
              queryClient.getQueryData<Snapshot>(snapshotKeyRef.current) ?? snap;
            const write = desiredWrite(
              path,
              latest,
              modifiedRef.current,
              pending.current
            );
            if (!write) return;
            const id = writeKey(write);
            if (suppressed.current.get(path) === id) return;
            const ok = await commitRef.current(write);
            if (ok) suppressed.current.delete(path);
            else suppressed.current.set(path, id);
          });
        }, DRAFT_DELAY_MS)
      );
    });
  }, [canEdit, draftsReady, modified_files, queryClient, snapshot]);

  const save_file = async (path: string, content: string) => {
    if (!path && !content) return true;
    if (new TextEncoder().encode(content).length > MAX_FILE_BYTES) {
      toast.error("File size too large");
      return false;
    }
    if (path && !isAllowedPath(path)) {
      toast.error(pathError(path) ?? "Invalid file name");
      return false;
    }
    const current = queryClient.getQueryData<Snapshot>(snapshotKey);
    if (
      current &&
      path &&
      !current.files.some((file) => file.path === path) &&
      current.files.length >= MAX_FILES
    ) {
      toast.error("Too many files");
      return false;
    }
    const timer = timers.current.get(path);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(path);
    }
    suppressed.current.delete(path);
    pending.current.add(path);
    setModifiedFiles((items) => items.filter((file) => file.path !== path));
    enqueue(async () => {
      const ok = await commitRef.current({
        path,
        saved_content: content,
        draft: null,
      });
      pending.current.delete(path);
      if (!ok) {
        setModifiedFiles((items) =>
          items.some((file) => file.path === path)
            ? items
            : [...items, { path, content }]
        );
      }
    });
    return true;
  };

  const delete_file = (path: string) => {
    const timer = timers.current.get(path);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(path);
    }
    suppressed.current.delete(path);
    pending.current.add(path);
    setModifiedFiles((items) => items.filter((file) => file.path !== path));
    enqueue(async () => {
      const ok = await commitRef.current({
        path,
        saved_content: null,
        draft: null,
      });
      pending.current.delete(path);
      if (ok) return;
      const snap = queryClient.getQueryData<Snapshot>(snapshotKeyRef.current);
      const draft = snap?.files.find((file) => file.path === path)?.draft?.content;
      if (draft == null) return;
      setModifiedFiles((items) =>
        items.some((file) => file.path === path)
          ? items
          : [...items, { path, content: draft }]
      );
    });
  };

  // Move a file, keeping its saved text and any unsaved edits (an edited file
  // stays edited). A file that only exists in the browser, still being named,
  // is saved under its new name instead.
  const rename_file = async (from: string, to: string): Promise<boolean> => {
    if (from === to) return true;
    const invalid = pathError(to);
    if (invalid) {
      toast.error(invalid);
      return false;
    }
    const snap = queryClient.getQueryData<Snapshot>(snapshotKeyRef.current);
    if (!snap) return false;
    if (
      snap.files.some(
        (file) =>
          file.path === to ||
          file.path.startsWith(to + "/") ||
          to.startsWith(file.path + "/")
      )
    ) {
      toast.error("A file with that name already exists.");
      return false;
    }
    const stored = snap.files.find((file) => file.path === from);
    const local = modifiedRef.current.find((file) => file.path === from);
    const text =
      local?.content ?? stored?.draft?.content ?? stored?.saved_content ?? "";
    const target: GameFile = stored
      ? {
          path: to,
          saved_content: stored.saved_content,
          draft:
            text !== stored.saved_content ? { content: text } : null,
        }
      : { path: to, saved_content: text, draft: null };

    for (const path of [from, to]) {
      const timer = timers.current.get(path);
      if (timer !== undefined) {
        window.clearTimeout(timer);
        timers.current.delete(path);
      }
      suppressed.current.delete(path);
      pending.current.add(path);
    }
    setModifiedFiles((items) => items.filter((file) => file.path !== from));
    return new Promise<boolean>((resolve) => {
      enqueue(async () => {
        const wrote = await commitRef.current(target);
        if (wrote) {
          setActiveFile((current) => (current === from ? to : current));
          if (stored) {
            await commitRef.current({
              path: from,
              saved_content: null,
              draft: null,
            });
          }
        } else if (local) {
          setModifiedFiles((items) =>
            items.some((file) => file.path === from)
              ? items
              : [...items, local]
          );
        }
        pending.current.delete(from);
        pending.current.delete(to);
        resolve(wrote);
      });
    });
  };

  return (
    <div
      className={
        embedded
          ? "flex min-h-0 min-w-0 flex-1 flex-row items-stretch overflow-hidden"
          : "flex flex-row flex-wrap items-stretch flex-1 w-full rounded-md overflow-hidden shadow-md shadow-black"
      }
    >
      <div
        className={
          embedded
            ? "flex min-h-0 w-72 shrink-0 flex-col items-stretch bg-zinc-800"
            : "flex flex-col flex-1 items-stretch gap-2 bg-zinc-800 p-0 min-w-[16rem]"
        }
      >
        <div
          className={
            embedded
              ? "flex min-h-0 flex-1 flex-col items-stretch gap-2 overflow-y-auto"
              : "contents"
          }
        >
          <Builder
            files={files} modified_files={modified_files}
            game_id={game_id}
            snapshot_id={snapshot?.id}
            canEdit={canEdit}
            dirty={snapshot?.modified ?? false}
            returnTo={returnTo}
            showPublish={!embedded}
          />
          <FileBrowser
            files={files}
            active_file={active_file}
            on_file_open={setActiveFile}
            save_file={save_file}
            rename_file={rename_file}
            delete_file={delete_file}
            modified_files={modified_files}
            canEdit={canEdit}
          />
        </div>
        {embedded && sidebarFooter ? (
          <div className="shrink-0 border-t border-zinc-700 px-2 py-1.5 text-xs leading-snug text-zinc-100">
            {sidebarFooter}
          </div>
        ) : null}
      </div>
      <div
        className={
          embedded
            ? "flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-950"
            : "flex flex-col flex-1 min-w-[75%] bg-zinc-950"
        }
      >
        <FileEditor
          files={files}
          save_file={save_file}
          active_file={active_file}
          setActiveFile={setActiveFile}
          modified_files={modified_files}
          setModifiedFiles={setModifiedFiles}
          canEdit={canEdit}
        />
      </div>
    </div>
  );
}
