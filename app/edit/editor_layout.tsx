"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import FileBrowser from "./files";
import FileEditor from "./editor";
import Builder from "./builder";

export default function EditorLayout({ api_route }: { api_route: string }) {
  const [user] = useAuthState(auth);
  const [files, setFiles] = useState<{ path: string; content: string }[]>([]);
  const [active_file, setActiveFile] = useState<string | undefined>(undefined);
  const [modified_files, setModifiedFiles] = useState<
    { path: string; content: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      if (user) {
        const response = await fetch(`${api_route}/game`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });
        if (!response.ok) {
          console.error(response);
          return;
        }
        const files = await response.json();
        setFiles(files);
      }
    })();
  }, [user]);

  const save_file = async (path: string, content: string) => {
    setFiles((files) => [
      ...files.filter((file) => file.path !== path),
      { path, content },
    ]);
    if (!user) {
      console.error("User not logged in");
      return;
    }
    const response = await fetch(`${api_route}/game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ filename: path, content }),
    });
    if (!response.ok) {
      console.error(response);
      return;
    }
  };

  const delete_file = async (path: string) => {
    setFiles((files) => files.filter((file) => file.path !== path));
    if (!user) {
      console.error("User not logged in");
      return;
    }
    const response = await fetch(`${api_route}/game/${path}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
    });
    if (!response.ok) {
      console.error(response);
      return;
    }
  };

  return (
    <div className="flex flex-row items-stretch flex-1 w-full rounded-md overflow-hidden shadow-md shadow-black">
      <div className="flex flex-col items-stretch gap-2 bg-zinc-800 p-0 min-w-[16rem]">
        <Builder
          files={files}
          api_route={api_route}
          modified_files={modified_files}
        />
        <FileBrowser
          files={files}
          active_file={active_file}
          on_file_open={setActiveFile}
          save_file={save_file}
          delete_file={delete_file}
        />
      </div>
      <div className="flex flex-col flex-1">
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
