"use client";

import LiveEditWarning from "@/components/live-edit-warning";
import EditorLayout from "../editor-layout";

export default function EditorGamePage({
  params: { game_id },
}: {
  params: { game_id: string };
}) {
  return (
    <>
      <div className="bg-black p-3 rounded-xl bg-opacity-90 w-full flex flex-row items-center justify-between">
        <LiveEditWarning />
        <span>Publish points their published game at this snapshot.</span>
      </div>
      <EditorLayout game_id={game_id} returnTo={`/edit/${game_id}`} />
    </>
  );
}
