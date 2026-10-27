"use client";

import { Suspense } from "react";
import { FaTrash } from "react-icons/fa";
import Games from "../games";
import GamesPlaceholder from "../games-placeholder";
import TitleBar from "../titlebar";
import SessionDeleteButton from "../session-delete";

export default function PlaySessionPage({
  params: { session_id },
}: {
  params: { session_id: string };
}) {
  return (
    <div className="flex flex-col items-stretch flex-1 gap-4 w-full max-w-screen">
      <div className="flex flex-row justify-between items-center p-2 rounded-md bg-black bg-opacity-90">
        <TitleBar session_id={session_id} />
        <div className="rounded-full bg-gray-800 h-4 w-4">
          <Suspense
            fallback={
              <span>
                <FaTrash />
              </span>
            }
          >
            <SessionDeleteButton>
              <FaTrash />
            </SessionDeleteButton>
          </Suspense>
        </div>
      </div>
      <div className="flex flex-row flex-1 gap-4">
        <Suspense fallback={<GamesPlaceholder />}>
          <Games session_id={session_id} />
        </Suspense>
      </div>
    </div>
  );
}
