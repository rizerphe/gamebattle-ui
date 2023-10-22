import Link from "next/link";
import { Suspense } from "react";
import Games from "../../../games";
import GamesPlaceholder from "../../../games_placeholder";

function DevTooling({ return_id }: { return_id: string }) {
  return (
    <Link href={`/edit/${return_id}`}>
      <div className="flex-1 p-2 font-bold text-white text-sm bg-blue-500 rounded cursor-pointer hover:bg-blue-600">
        Return to development
      </div>
    </Link>
  );
}

export default function Play({
  params: { session_id, return_id },
}: {
  params: { session_id: string; return_id: string };
}) {
  const api_route = process.env.API_ROUTE;
  const api_ws_route = process.env.API_WS_ROUTE;
  if (!api_route) return <span>API_ROUTE not set</span>;
  if (!api_ws_route) return <span>API_WS_ROUTE not set</span>;

  return (
    <div className="flex flex-col items-stretch flex-1 gap-4 w-full">
      <div className="flex flex-row flex-1 gap-4">
        <Suspense
          fallback={
            <GamesPlaceholder
              n_games={1}
              tooling={<DevTooling return_id={return_id} />}
            />
          }
        >
          <Games
            api_route={api_route}
            api_ws_route={api_ws_route}
            session_id={session_id}
            n_placeholder_games={1}
            tooling={<DevTooling return_id={return_id} />}
          />
        </Suspense>
      </div>
    </div>
  );
}
