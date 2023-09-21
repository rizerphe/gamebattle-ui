"use client";
import { auth } from "../../firebase";
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
}: {
  api_route: string;
  api_ws_route: string;
  session_id: string;
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
        <GameContainer name={name} key={game}>
          <Game api_route={api_ws_route} session_id={session_id} game={game} />
        </GameContainer>
      ))}
    </>
  ) : (
    <>
      <GameContainer name="Loading..." />
      <GameContainer name="Loading..." />
    </>
  );
}
