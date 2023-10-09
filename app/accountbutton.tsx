"use client";
import { auth, login, logout } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "./button";
import { useState } from "react";

export default function AccountButton() {
  const [user, loading] = useAuthState(auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return loading ? (
    <Button>Loading...</Button>
  ) : user ? (
    <Button onClick={() => setDropdownOpen(!dropdownOpen)}>
      {user?.photoURL && (
        <img src={user?.photoURL} className="rounded-full w-8 h-8" />
      )}
      {dropdownOpen && (
        <div className="absolute top-full mt-2 w-full right-0 shadow-lg z-10">
          <Button onClick={() => logout()}>Log Out</Button>
        </div>
      )}
      <span className="ml-2">{user?.displayName}</span>
    </Button>
  ) : (
    <Button onClick={() => login()}>Log In</Button>
  );
}
