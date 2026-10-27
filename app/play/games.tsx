"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import GameContainer from "./game-container";
import Game from "./game";
import SessionGameTooling from "./game-tooling";
import { sessionSchema } from "@/lib/api";
import { apiGet } from "@/lib/fetch";

export function useSession(session_id: string) {
  const [user] = useAuthState(auth);
  return useQuery({
    queryKey: ["session", session_id],
    enabled: !!user,
    queryFn: () =>
      apiGet(user, `/sessions/${session_id}`, sessionSchema, "Could not load the session."),
  });
}

function GameBox({
  name,
  session_id,
  game,
  tooling,
  isFullscreen,
  toggleFullscreen,
  restartHref,
}: {
  name: string;
  session_id: string;
  game: number;
  tooling?: React.ReactNode;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  restartHref: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [gameRunning, setGameRunning] = useState<boolean>(true);
  const [restarting, setRestarting] = useState<boolean>(false);

  return (
    <div
      className={`flex flex-col flex-1 ${
        gameRunning ? "bg-black" : "bg-zinc-900"
      } bg-opacity-90 rounded-lg items-stretch`}
      style={{
        maxWidth: `calc(${100 / (isFullscreen ? 1 : 1)}% - ${
          ((isFullscreen ? 1 : 1) - 1) / 2
        }rem`,
      }}
      onClick={() => ref.current?.focus?.()}
    >
      <GameContainer
        name={name}
        tooling={
          <>
            <SessionGameTooling session_id={session_id}
              setGameRunning={setGameRunning}
              restarting={restarting}
              setRestarting={setRestarting}
              toggleFullscreen={toggleFullscreen}
              restartHref={restartHref}
            />
            {connected || !gameRunning ? null : (
              <span className="font-bold text-red-600">connecting...</span>
            )}
            {tooling}
          </>
        }
        key={game}
      >
        <Game
          key={session_id} session_id={session_id}
          setConnected={setConnected}
          inputRef={ref}
          gameRunning={gameRunning}
          setGameRunning={(running: boolean) => {
            if (!restarting) setGameRunning(running);
          }}
        />
      </GameContainer>
    </div>
  );
}

export default function Games({
  session_id,
  n_placeholder_games = 2,
  tooling,
  children,
  restartHref = "/play/{id}",
}: {
  session_id: string;
  n_placeholder_games?: number;
  tooling?: React.ReactNode;
  children?: React.ReactNode;
  restartHref?: string;
}) {
  const session = useSession(session_id).data;
  const [fullscreenGameId, setFullscreenGameId] = useState<number | null>(null);

  return (
    <>
      {session ? (
        <>
          {(fullscreenGameId == null || fullscreenGameId === 0) && (
            <GameBox
              key={session_id}
              name="Game" session_id={session_id}
              game={0}
              tooling={tooling}
              isFullscreen={fullscreenGameId === 0}
              toggleFullscreen={() =>
                setFullscreenGameId(fullscreenGameId === 0 ? null : 0)
              }
              restartHref={restartHref}
            />
          )}
        </>
      ) : (
        <>
          {Array.from(Array(n_placeholder_games).keys()).map((i) => (
            <div
              key={i}
              className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch"
              style={{ maxWidth: `${100 / n_placeholder_games}%` }}
            >
              <GameContainer tooling={tooling} name="Loading..." />
            </div>
          ))}
        </>
      )}
      {fullscreenGameId == null && children}
    </>
  );
}
