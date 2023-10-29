import { Suspense } from "react";
import Games from "../games";
import GamesPlaceholder from "../games_placeholder";
import TitleBar from "../titlebar";
import { FaTrash } from "react-icons/fa";
import SessionDeleteButton from "../session_delete";

export default function Play({
  params: { session_id },
}: {
  params: { session_id: string };
}) {
  const api_route = process.env.API_ROUTE;
  const api_ws_route = process.env.API_WS_ROUTE;
  if (!api_route) return <span>API_ROUTE not set</span>;
  if (!api_ws_route) return <span>API_WS_ROUTE not set</span>;

  return (
    <div className="flex flex-col items-stretch flex-1 gap-4 w-full max-w-screen">
      <div className="flex flex-row justify-between items-center p-2 rounded-md bg-black bg-opacity-90">
        <TitleBar api_route={api_route} session_id={session_id} />
        <div className="rounded-full bg-gray-800 h-4 w-4">
          <Suspense
            fallback={
              <span>
                <FaTrash />
              </span>
            }
          >
            <SessionDeleteButton api_route={api_route} session_id={session_id}>
              <FaTrash />
            </SessionDeleteButton>
          </Suspense>
        </div>
      </div>
      <div className="flex flex-row flex-1 gap-4">
        <Suspense fallback={<GamesPlaceholder />}>
          <Games
            api_route={api_route}
            api_ws_route={api_ws_route}
            session_id={session_id}
          />
        </Suspense>
      </div>
    </div>
  );
}
