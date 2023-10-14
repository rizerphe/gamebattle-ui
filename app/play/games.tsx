"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import GameContainer from "./game_container";
import Game from "./game";

const Session = z.object({
  launch_time: z.number(),
  games: z.array(z.string()),
});

type Session = z.infer<typeof Session>;

function GameBox({
  name,
  api_ws_route,
  session_id,
  game,
  setConnected,
  tooling,
}: {
  name: string;
  api_ws_route: string;
  session_id: string;
  game: number;
  setConnected: (connected: boolean) => void;
  tooling?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div
      className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch"
      onClick={() => ref.current?.focus?.()}
    >
      <GameContainer name={name} tooling={tooling} key={game}>
        <Game
          api_route={api_ws_route}
          session_id={session_id}
          game={game}
          setConnected={setConnected}
          inputRef={ref}
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
}: {
  api_route: string;
  api_ws_route: string;
  session_id: string;
  n_placeholder_games?: number;
  tooling?: React.ReactNode;
}) {
  const [user] = useAuthState(auth);
  const [session, setSession] = useState<Session | null>(null);
  const [connected, setConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!user) return;
    const fetch_session = async () => {
      const response = await fetch(`${api_route}/sessions/${session_id}`, {
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
      });
      const json = await response.json();
      setSession(Session.parse(json));
    };
    fetch_session();
  }, [user?.uid, api_route, session_id]);

  return session ? (
    <>
      {session.games.map((name: string, game: number) => (
        <GameBox
          name={name}
          api_ws_route={api_ws_route}
          session_id={session_id}
          game={game}
          setConnected={setConnected}
          tooling={
            <>
              {connected ? null : (
                <span className="font-bold text-red-600">connecting...</span>
              )}
              {tooling}
            </>
          }
        />
      ))}
    </>
  ) : (
    <>
      {Array.from(Array(n_placeholder_games).keys()).map((i) => (
        <div className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch">
          <GameContainer key={i} tooling={tooling} name="Loading..." />
        </div>
      ))}
    </>
  );
}
