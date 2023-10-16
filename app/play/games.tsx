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
  games: z.array(z.string()),
});

type Session = z.infer<typeof Session>;

function GameBox({
  name,
  api_route,
  api_ws_route,
  session_id,
  game,
  tooling,
}: {
  name: string;
  api_route: string;
  api_ws_route: string;
  session_id: string;
  game: number;
  tooling?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [connected, setConnected] = useState<boolean>(false);

  return (
    <div
      className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch"
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
            />
            {connected ? null : (
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
          key={game}
          name={name}
          api_route={api_route}
          api_ws_route={api_ws_route}
          session_id={session_id}
          game={game}
          tooling={tooling}
        />
      ))}
    </>
  ) : (
    <>
      {Array.from(Array(n_placeholder_games).keys()).map((i) => (
        <div
          key={i}
          className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch"
        >
          <GameContainer tooling={tooling} name="Loading..." />
        </div>
      ))}
    </>
  );
}
