"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState } from "react";
import { VscRefresh } from "react-icons/vsc";
import { AiFillLike } from "react-icons/ai";

function ScoreButton({
  ownScore,
  score,
  setScore,
  api_route,
  session_id,
  allGamesOver,
}: {
  ownScore: number;
  score: number;
  setScore: (score: number) => void;
  api_route: string;
  session_id: string;
  allGamesOver: boolean;
}) {
  const [user] = useAuthState(auth);

  const setPreference = async () => {
    setScore(ownScore);
    await fetch(`${api_route}/sessions/${session_id}/preference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
      body: JSON.stringify({ score_first: ownScore }),
    });
  };

  const active = ownScore === score;

  return (
    <span
      className={`relative rounded-full p-2 ${
        active ? "bg-zinc-700" : "bg-zinc-300 hover:bg-zinc-400"
      }`}
    >
      {allGamesOver ? (
        <AiFillLike
          className={`text-2xl text-green-800 ${
            active ? "" : "animate-pulse animate-bounce"
          }`}
          onClick={setPreference}
        />
      ) : (
        <>
          <AiFillLike className="text-2xl text-zinc-800" />
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <span className="absolute top-0 right-0 bottom-0 flex flex-row justify-center items-center whitespace-nowrap w-fit rounded text-xs bg-zinc-100 text-zinc-900 p-1">
              Finish all games first!
            </span>
          </div>
        </>
      )}
    </span>
  );
}

export default function GameTooling({
  api_route,
  session_id,
  game_id,
  setGameRunning,
  gameOver,
  allGamesOver,
  score,
  setScore,
}: {
  api_route: string;
  session_id: string;
  game_id: number;
  setGameRunning: (running: boolean) => void;
  gameOver: boolean;
  allGamesOver: boolean;
  score: number;
  setScore: (score: number) => void;
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

  const setPreference = async () => {
    await fetch(`${api_route}/sessions/${session_id}/preference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
      body: JSON.stringify({ score_first: 1 - game_id }),
    });
  };

  return (
    <>
      <VscRefresh
        className={`${
          restarting ? "animate-spin" : ""
        } text-xl text-zinc-200 hover:text-zinc-400`}
        onClick={() => {
          setGameRunning(true);
          restartGame();
        }}
      />
      {gameOver ? (
        <ScoreButton
          ownScore={1 - game_id}
          score={score}
          setScore={setScore}
          api_route={api_route}
          session_id={session_id}
          allGamesOver={allGamesOver}
        />
      ) : null}
    </>
  );
}
