"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import GameContainer from "./game_container";
import Game from "./game";
import GameTooling from "./game_tooling";

const Session = z.object({
  launch_time: z.number(),
  games: z.array(
    z.object({
      name: z.string(),
      over: z.boolean(),
    })
  ),
});

type Session = z.infer<typeof Session>;

function GameBox({
  name,
  api_route,
  api_ws_route,
  session_id,
  game,
  tooling,
  gameOver,
  setGameOver,
  allGamesOver,
  score,
  setScore,
  n_games,
  gameRestarter,
  setGameRestarter,
  isFullscreen,
  toggleFullscreen,
}: {
  name: string;
  api_route: string;
  api_ws_route: string;
  session_id: string;
  game: number;
  tooling?: React.ReactNode;
  gameOver: boolean;
  setGameOver: (gameOver: boolean) => void;
  allGamesOver: boolean;
  score: number | null;
  setScore: (score: number) => void;
  n_games: number;
  gameRestarter: number;
  setGameRestarter: (gameRestarter: number) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
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
        maxWidth: `calc(${100 / (isFullscreen ? 1 : n_games)}% - ${
          ((isFullscreen ? 1 : n_games) - 1) / 2
        }rem`,
      }}
      onClick={() => ref.current?.focus?.()}
    >
      <GameContainer
        name={name}
        tooling={
          <>
            <GameTooling
              api_route={api_route}
              session_id={session_id}
              game_id={game}
              setGameRunning={setGameRunning}
              gameOver={gameOver}
              allGamesOver={allGamesOver}
              score={score}
              setScore={setScore}
              restarting={restarting}
              setRestarting={setRestarting}
              n_games={n_games}
              gameRestarter={gameRestarter}
              setGameRestarter={setGameRestarter}
              toggleFullscreen={toggleFullscreen}
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
          api_route={api_ws_route}
          session_id={session_id}
          game={game}
          setConnected={setConnected}
          inputRef={ref}
          gameRunning={gameRunning}
          setGameRunning={(running: boolean) => {
            if (!restarting) {
              setGameRunning(running);
              if (!running) setGameOver(true);
            }
          }}
        />
      </GameContainer>
    </div>
  );
}

export default function Games({
  api_route,
  api_ws_route,
  session_id,
  n_placeholder_games = 2,
  tooling,
  children,
}: {
  api_route: string;
  api_ws_route: string;
  session_id: string;
  n_placeholder_games?: number;
  tooling?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [user] = useAuthState(auth);
  const [session, setSession] = useState<Session | null>(null);
  const [gamesOver, setGamesOver] = useState<boolean[]>([]);
  const [score, setScore] = useState<number | null>(null);
  const [gameRestarter, setGameRestarter] = useState<number>(0);

  const [fullscreenGameId, setFullscreenGameId] = useState<number | null>(null);

  useEffect(() => {
    const getScore = async () => {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return null;
      const response = await fetch(
        `${api_route}/sessions/${session_id}/preference`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      setScore(data?.first_score);
    };
    getScore();
  }, [session_id, user?.uid, gameRestarter]);

  useEffect(() => {
    if (!user) return;
    const fetch_session = async () => {
      setSession(null);
      const response = await fetch(`${api_route}/sessions/${session_id}`, {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });
      const json = await response.json();
      const session = Session.parse(json);
      setSession(session);
      setGamesOver(session.games.map((game) => game.over));
    };
    fetch_session();
  }, [user?.uid, api_route, session_id, gameRestarter]);

  return (
    <>
      {session ? (
        <>
          {session.games.map(
            ({ name }: { name: string; over: boolean }, game: number) =>
              (fullscreenGameId == null || fullscreenGameId === game) && (
                <GameBox
                  key={game}
                  name={name}
                  api_route={api_route}
                  api_ws_route={api_ws_route}
                  session_id={session_id}
                  game={game}
                  tooling={tooling}
                  allGamesOver={gamesOver.every((gameOver) => gameOver)}
                  gameOver={gamesOver[game]}
                  setGameOver={(gameOver: boolean) => {
                    const newGamesOver = [...gamesOver];
                    newGamesOver[game] = gameOver;
                    setGamesOver(newGamesOver);
                  }}
                  score={score}
                  setScore={setScore}
                  n_games={session.games.length}
                  gameRestarter={gameRestarter}
                  setGameRestarter={setGameRestarter}
                  isFullscreen={fullscreenGameId === game}
                  toggleFullscreen={() => {
                    if (fullscreenGameId === game) {
                      setFullscreenGameId(null);
                    } else {
                      setFullscreenGameId(game);
                    }
                  }}
                />
              )
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
