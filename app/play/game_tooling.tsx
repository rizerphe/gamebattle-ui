"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { VscRefresh } from "react-icons/vsc";
import { useState } from "react";

export default function GameTooling({
  api_route,
  session_id,
  game_id,
}: {
  api_route: string;
  session_id: string;
  game_id: number;
}) {
  const [user] = useAuthState(auth);
  const [restarting, setRestarting] = useState<boolean>(false);

  const restartGame = async () => {
    setRestarting(true);
    await fetch(`${api_route}/sessions/${session_id}/${game_id}/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
      body: JSON.stringify({}),
    });
    setRestarting(false);
  };

  // rotates icon with tailwind if restarting
  return (
    <>
      <VscRefresh
        className={`${
          restarting ? "animate-spin" : ""
        } text-xl text-gray-500 hover:text-gray-700`}
        onClick={restartGame}
      />
    </>
  );
}
