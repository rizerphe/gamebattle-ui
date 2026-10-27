"use client";
import { auth, logout } from "@/app/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "@/components/app-button";
import { useState } from "react";
import { usePlayer } from "@/components/permissions";

export default function AccountButton() {
  const [user, loading] = useAuthState(auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const player = usePlayer().data;

  return loading || !user ? null : (
    <Button onClick={() => setDropdownOpen(!dropdownOpen)}>
      {user?.photoURL && (
        <img
          src={user.photoURL}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="rounded-full w-8 h-8"
        />
      )}
      {dropdownOpen && (
        <div
          className="absolute top-full right-0 z-10 mt-2 flex min-w-full flex-col shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          {player?.admin && (
            <Button href="/admin" onClick={() => setDropdownOpen(false)}>
              Admin
            </Button>
          )}
          <Button onClick={() => logout()}>Log Out</Button>
        </div>
      )}
      <span className="ml-2">{user?.displayName}</span>
    </Button>
  );
}
