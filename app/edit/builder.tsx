"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import Select from "react-select";
import { redirect } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export default function Builder({
  files,
  api_route,
  modified_files,
  game_id = null,
}: {
  files: { path: string; content: string }[];
  api_route: string;
  modified_files: { path: string; content: string }[];
  game_id?: string | null;
}) {
  const [user] = useAuthState(auth);
  const [building, setBuilding] = useState(false);
  const [built, setBuilt] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: metadata, isLoading } = useQuery({
    queryKey: [game_id ? `metadata-${game_id}` : "metadata", user?.uid],
    queryFn: async () => {
      if (!user) {
        throw new Error("User not authenticated");
      }
      const response = await fetch(
        game_id
          ? `${api_route}/admin/game/${game_id}/meta`
          : `${api_route}/game/meta`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch metadata");
      const metadata = await response.json();
      return metadata;
    },
    enabled: !!user,
    placeholderData: { name: "", file: "" },
  });

  const candidates = files.filter(
    (file) => file.path.endsWith(".py") && !file.path.includes(" ")
  );

  if (!metadata.file || !files.find((file) => file.path === metadata.file)) {
    if (candidates.length === 1) {
      metadata.file = candidates[0].path;
    }
  }

  const { mutate: setMetadata } = useMutation({
    mutationFn: async (_: { name: string; file: string }) => {},
    onMutate: async ({ name, file }) => {
      await queryClient.cancelQueries({
        queryKey: [game_id ? `metadata-${game_id}` : "metadata", user?.uid],
      });

      queryClient.setQueryData(
        [game_id ? `metadata-${game_id}` : "metadata", user?.uid],
        {
          name,
          file,
        }
      );
    },
  });

  return built ? (
    redirect("/play/own/" + built + (game_id ? `/${game_id}` : ""))
  ) : (
    <>
      <div className="flex flex-row items-center gap-2 p-2 cursor-pointer bg-zinc-700">
        <span>Build</span>
      </div>
      <div className="flex flex-col items-stretch gap-2 p-2 overflow-visible">
        <div className="flex flex-row items-center gap-2 justify-between">
          <span>Name:</span>
          <input
            className={`px-2 py-1 bg-zinc-700 rounded flex-1 ${
              metadata?.name ? "" : "outline outline-2 outline-red-600"
            }`}
            value={metadata?.name}
            onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
          />
        </div>
        <div className="flex flex-row items-center gap-2 justify-between">
          <span>Entrypoint:</span>
          <Select
            className={`flex-1 ${
              files.find((file) => file.path === metadata?.file)
                ? ""
                : "outline outline-2 outline-red-600"
            }`}
            value={files.find((file) => file.path === metadata?.file) ?? null}
            onChange={(option) => {
              if (!option?.path) return;
              setMetadata({ ...metadata, file: option.path });
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
            isClearable={false}
            isSearchable={true}
            options={candidates}
            noOptionsMessage={() => "Create a Python file first."}
          />
        </div>
        {files.find(
          (file) => file.path.endsWith(".py") && file.path.includes(" ")
        ) && (
          <span className="text-zinc-500 text-sm">
            Warning: Python files with spaces in their name are not supported as
            entry points.
          </span>
        )}
        <div
          className={`flex flex-row items-center justify-center gap-2 p-2 rounded ${
            modified_files.length ||
            !metadata?.name ||
            !files.find((file) => file.path === metadata?.file)
              ? "bg-zinc-700 hover:bg-zinc-600"
              : "bg-blue-700 hover:bg-blue-600"
          } cursor-pointer`}
          onClick={async () => {
            if (modified_files.length) return;
            if (!metadata?.name) return;
            if (!files.find((file) => file.path === metadata?.file)) return;
            setBuilding(true);
            await fetch(`${api_route}/game/build`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user?.getIdToken()}`,
              },
              body: JSON.stringify({ ...metadata, game_id }),
            });
            const response = await fetch(`${api_route}/sessions/own`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${await user?.getIdToken()}`,
              },
              body: JSON.stringify({
                game_id,
              }),
            });
            if (!response.ok) {
              console.error(response);
              setBuilding(false);
              return;
            }
            const session = await response.json();
            setBuilt(session);
          }}
        >
          {building ? <span>Building...</span> : <span>Build and Test</span>}
        </div>
        {game_id ? (
          <div
            className="flex flex-row items-center justify-center gap-2 p-2 rounded bg-zinc-700 hover:bg-zinc-600"
            onClick={async () => {
              setBuilding(true);
              const response = await fetch(`${api_route}/sessions/own`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${await user?.getIdToken()}`,
                },
                body: JSON.stringify({
                  game_id,
                }),
              });
              if (!response.ok) {
                console.error(response);
                setBuilding(false);
                return;
              }
              const session = await response.json();
              setBuilt(session);
            }}
          >
            <span>Just Run</span>
          </div>
        ) : null}
        {modified_files.length ? (
          <span className="text-zinc-500 text-sm">
            Save your changes before building.
          </span>
        ) : null}
      </div>
    </>
  );
}
