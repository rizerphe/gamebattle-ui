"use client";
import moment from "moment";
import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import { z } from "zod";

const Session = z.object({
  launch_time: z.number(),
  games: z.array(z.string()),
});

type Session = z.infer<typeof Session>;

export default function TitleBar({
  api_route,
  session_id,
}: {
  api_route: string;
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
    <span>
      {`${session.games.join(", ")} - ${moment
        .unix(session.launch_time)
        .fromNow()}`}
    </span>
  ) : (
    <span>Loading...</span>
  );
}
