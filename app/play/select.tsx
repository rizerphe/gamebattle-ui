"use client";
import moment from "moment";
import { useEffect, useState } from "react";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import Link from "next/link";

const session_schema = z.object({
  id: z.string(),
  games: z.array(z.string()),
  launch_time: z.number(),
});

type Session = z.infer<typeof session_schema>;

export default function Select({ api_route }: { api_route: string }) {
  const [user] = useAuthState(auth);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [redirectDestination, setRedirectDestination] = useState<string | null>(
    null
  );

  useEffect(() => {
    (async () => {
      const token = await user?.getIdToken();
      if (!token) return null;
      const response = await fetch(`${api_route}/sessions`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      const mapped = Object.keys(data).map((uuid) =>
        session_schema.parse({ id: uuid, ...data[uuid] })
      );
      setSessions(mapped);
    })();
  }, [user?.uid]);

  useEffect(() => {
    const initSession = async () => {
      const token = await user?.getIdToken();
      if (!token) return null;
      const response = await fetch(`${api_route}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status !== 200) return;
      const data = await response.json();
      setRedirectDestination(`/play/${data}`);
    };
    if (!sessions) return;
    if (sessions.length === 0) initSession();
  }, [sessions]);

  if (redirectDestination) {
    redirect(redirectDestination);
    return null;
  }

  if (!sessions || sessions.length === 0) return null;

  return (
    <div className="flex flex-col items-stretch justify-center rounded-lg overflow-hidden bg-gray-900 w-full">
      {sessions.map((session) => (
        <Link
          href={`/play/${session.id}`}
          key={session.id}
          className="hover:bg-gray-800 p-3 text-center"
        >
          {`${session.games.join(", ")} - ${moment
            .unix(session.launch_time)
            .fromNow()}`}
        </Link>
      ))}
    </div>
  );
}
