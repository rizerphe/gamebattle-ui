"use client";
import { auth, login, logout } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "./button";

export default function AccountButton() {
  const [user, loading] = useAuthState(auth);

  return loading ? (
    <Button>Loading...</Button>
  ) : user ? (
    <Button onClick={() => logout()}>
      {user?.photoURL && (
        <img src={user?.photoURL} className="rounded-full w-8 h-8" />
      )}
      <span className="ml-2">{user?.displayName}</span>
    </Button>
  ) : (
    <Button onClick={() => login()}>Log In</Button>
  );
}
