"use client";

import Link from "next/link";
import { Suspense } from "react";
import Games from "../../../games";
import GamesPlaceholder from "../../../games-placeholder";

function DevTooling({ returnTo }: { returnTo: string }) {
  return (
    <Link href={returnTo}>
      <div className="flex-1 p-2 font-bold text-white text-sm bg-blue-500 rounded cursor-pointer hover:bg-blue-600">
        Return to development
      </div>
    </Link>
  );
}

export default function PlayOwnReturnPage({
  params: { session_id, return_id },
  searchParams,
}: {
  params: { session_id: string; return_id: string };
  searchParams: { to?: string };
}) {
  const returnTo = searchParams.to ?? `/edit/${return_id}`;
  const tooling = <DevTooling returnTo={returnTo} />;

  return (
    <div className="flex flex-col items-stretch flex-1 gap-4 w-full">
      <div className="flex flex-row flex-1 gap-4">
        <Suspense
          fallback={<GamesPlaceholder n_games={1} tooling={tooling} />}
        >
          <Games
            session_id={session_id}
            n_placeholder_games={1}
            tooling={tooling}
            restartHref={`/play/own/{id}/${return_id}?to=${encodeURIComponent(returnTo)}`}
          />
        </Suspense>
      </div>
    </div>
  );
}
