"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState } from "react";
import { redirect } from "next/navigation";

export default function SessionDeleteButton({
  api_route,
  session_id,
  children,
}: {
  api_route: string;
  session_id: string;
  children: JSX.Element;
}) {
  const [user] = useAuthState(auth);
  const [deleted, setDeleted] = useState<boolean>(false);

  const deleteSession = async () => {
    setDeleted(true);
    const res = await fetch(`${api_route}/sessions/${session_id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken?.()}`,
      },
    });
    if (!res.ok) {
      console.error("Failed to delete session", res);
    }
  };

  return deleted ? (
    redirect("/")
  ) : (
    <span onClick={deleteSession}>{children}</span>
  );
}
