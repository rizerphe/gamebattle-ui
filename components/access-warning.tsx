"use client";

import { usePlayer } from "@/components/permissions";

/** Shown when the backend says this account may not use the service. */
export default function AccessWarning() {
  const { data } = usePlayer();
  if (!data || data.allowed) return null;
  return (
    <div
      role="alert"
      className="mx-4 mt-4 rounded-md border border-red-700 bg-red-950 px-4 py-3 text-sm text-red-200"
    >
      Your account does not have access to this service. Sign in with a
      different account, or ask an admin to add you.
    </div>
  );
}
