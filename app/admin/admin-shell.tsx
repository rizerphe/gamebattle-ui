"use client";

import type { ReactNode } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

export function AdminShell({ children }: { children: ReactNode }) {
  const [user, loading] = useAuthState(auth);
  if (loading) {
    return (
      <p className="px-8 py-10 text-sm text-zinc-500">Loading…</p>
    );
  }
  if (!user) {
    return (
      <p className="px-8 py-10 text-sm text-zinc-500">
        Sign in to use admin.
      </p>
    );
  }
  return children;
}
