"use client";
import moment from "moment";
import { useSession } from "./games";

export default function TitleBar({ session_id }: { session_id: string }) {
  const session = useSession(session_id).data;
  return session ? (
    <span>{moment.unix(session.started_at).fromNow()}</span>
  ) : (
    <span>Loading...</span>
  );
}
