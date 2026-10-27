"use client";

import Link from "next/link";
import { Suspense } from "react";
import Games from "../../games";
import GamesPlaceholder from "../../games-placeholder";
import Tips from "./tips";

function DevTooling() {
  return (
    <Link href="/edit">
      <div className="flex-1 p-2 font-bold text-white text-sm bg-blue-500 rounded cursor-pointer hover:bg-blue-600">
        Return to development
      </div>
    </Link>
  );
}

export default function PlayOwnSessionPage({
  params: { session_id },
}: {
  params: { session_id: string };
}) {
  return (
    <div className="flex flex-col items-stretch flex-1 gap-4 w-full">
      <div className="flex flex-row flex-1 gap-4">
        <Suspense
          fallback={
            <>
              <GamesPlaceholder n_games={1} tooling={<DevTooling />} />
              <Tips />
            </>
          }
        >
          <Games
            session_id={session_id}
            n_placeholder_games={1}
            tooling={<DevTooling />}
            restartHref="/play/own/{id}"
          >
            <Tips />
          </Games>
        </Suspense>
      </div>
    </div>
  );
}
