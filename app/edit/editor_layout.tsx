"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import FileBrowser from "./files";
import FileEditor from "./editor";
import Builder from "./builder";
import { toast } from "sonner";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function EditorLayout({
  api_route,
  game_id = null,
}: {
  api_route: string;
  game_id?: string | null;
}) {
  const [user] = useAuthState(auth);
  const [active_file, setActiveFile] = useState<string | undefined>(undefined);
  const [modified_files, setModifiedFiles] = useState<
    { path: string; content: string }[]
  >([]);

  const queryClient = useQueryClient();

  const files =
    useQuery({
      queryKey: [game_id ? `files-${game_id}` : "files", user?.uid],
      queryFn: async () => {
        if (user) {
          const response = await fetch(
            game_id
              ? `${api_route}/admin/game/${game_id}`
              : `${api_route}/game`,
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user.getIdToken()}`,
              },
            }
          );
          if (!response.ok) {
            console.error(response);
            return;
          }
          const files = await response.json();
          return files as { path: string; content: string }[];
        }
      },
      enabled: !!user,
    }).data ?? [];

  useEffect(() => {
    if (files) {
      if (files.length === 1 && files[0].path.endsWith(".py")) {
        setActiveFile(files[0].path);
      }
    }
  }, [files]);

  const { mutate: save_file_raw } = useMutation({
    mutationFn: async ({
      path,
      content,
    }: {
      path: string;
      content: string;
    }) => {
      if (!path && !content) return;
      if (!user) {
        toast("User not logged in");
        throw "User not logged in";
      }
      const response = await fetch(`${api_route}/game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({ filename: path, content, game_id: game_id }),
      });
      if (!response.ok) {
        if (response.status === 400) {
          const data = await response.json();
          toast("Failed to save file: " + data.detail);
        } else if (response.status === 413) {
          toast("File too large to save");
        }
        throw response;
      }
    },
    onMutate: async ({ path, content }: { path: string; content: string }) => {
      await queryClient.cancelQueries({
        queryKey: [game_id ? `files-${game_id}` : "files", user?.uid],
      });

      const files: { path: string; content: string }[] | undefined =
        queryClient.getQueryData([
          game_id ? `files-${game_id}` : "files",
          user?.uid,
        ]);

      if (files) {
        queryClient.setQueryData(
          [game_id ? `files-${game_id}` : "files", user?.uid],
          [...files.filter((file) => file.path !== path), { path, content }]
        );
      }

      return { files };
    },
    onError: (err, newData, context) => {
      console.error(err);
      if (context?.files) {
        queryClient.setQueryData(
          [game_id ? `files-${game_id}` : "files", user?.uid],
          context?.files
        );
      }
    },
  });
  const save_file = async (path: string, content: string) => {
    save_file_raw({ path, content });
  };

  const { mutate: delete_file } = useMutation({
    mutationFn: async (path: string) => {
      if (!user) {
        throw "User not logged in";
      }
      const response = await fetch(
        game_id
          ? `${api_route}/admin/game/${game_id}/${path}`
          : `${api_route}/game/${path}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        }
      );
      if (!response.ok) {
        throw response;
      }
    },
    onMutate: async (path: string) => {
      await queryClient.cancelQueries({
        queryKey: [game_id ? `files-${game_id}` : "files", user?.uid],
      });

      const files: { path: string; content: string }[] | undefined =
        queryClient.getQueryData([
          game_id ? `files-${game_id}` : "files",
          user?.uid,
        ]);

      if (files) {
        queryClient.setQueryData(
          [game_id ? `files-${game_id}` : "files", user?.uid],
          files.filter((file) => file.path !== path)
        );
      }

      return { files };
    },
    onError: (err, newData, context) => {
      console.error(err);
      if (context?.files) {
        queryClient.setQueryData(
          [game_id ? `files-${game_id}` : "files", user?.uid],
          context?.files
        );
      }
    },
  });

  return (
    <div className="flex flex-row flex-wrap items-stretch flex-1 w-full rounded-md overflow-hidden shadow-md shadow-black">
      <div className="flex flex-col flex-1 items-stretch gap-2 bg-zinc-800 p-0 min-w-[16rem]">
        <Builder
          files={files}
          api_route={api_route}
          modified_files={modified_files}
          game_id={game_id}
        />
        <FileBrowser
          files={files}
          active_file={active_file}
          on_file_open={setActiveFile}
          save_file={save_file}
          delete_file={delete_file}
        />
      </div>
      <div className="flex flex-col flex-1 min-w-[75%] bg-zinc-950">
        <FileEditor
          files={files}
          save_file={save_file}
          active_file={active_file}
          setActiveFile={setActiveFile}
          modified_files={modified_files}
          setModifiedFiles={setModifiedFiles}
        />
      </div>
    </div>
  );
}
