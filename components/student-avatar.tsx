"use client";

import { useState } from "react";

function initial(name: string | null | undefined, id: string): string {
  const letter = name?.trim()?.[0];
  if (letter) return letter.toUpperCase();
  return id.slice(0, 1).toUpperCase();
}

export default function StudentAvatar({
  src,
  name,
  id,
  className = "h-10 w-10 shrink-0 rounded-full bg-zinc-800 object-cover",
}: {
  src: string | null | undefined;
  name?: string | null;
  id: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className={`inline-flex items-center justify-center text-sm font-medium text-zinc-300 ${className}`}
        aria-hidden
      >
        {initial(name, id)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
