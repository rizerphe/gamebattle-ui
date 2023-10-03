"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import { z } from "zod";
import GameContainer from "./game_container";
import Game from "./game";

const Session = z.object({
  launch_time: z.number(),
  games: z.array(z.string()),
});

type Session = z.infer<typeof Session>;

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
        <GameContainer
          name={name}
          tooling={
            <>
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
          />
        </GameContainer>
      ))}
    </>
  ) : (
    <>
      {Array.from(Array(n_placeholder_games).keys()).map((i) => (
        <GameContainer key={i} tooling={tooling} name="Loading..." />
      ))}
    </>
  );
}
