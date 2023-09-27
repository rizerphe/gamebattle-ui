"use client";
import { auth, login } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "./button";

function Window({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-stretch gap-2 rounded-md bg-gray-800 p-4">
      {children}
    </div>
  );
}

export default function PlayWindow() {
  const [user, loading] = useAuthState(auth);

  return loading ? (
    <Window>
      <span className="font-bold text-xl">GameBattle</span>
      <span className="text-gray-400">Loading...</span>
    </Window>
  ) : user ? (
    <Window>
      <span className="font-bold text-xl">GameBattle</span>
      <Button href="/play">Play</Button>
      <Button href="/leaderboard">Leaderboard</Button>
      <Button href="/edit">Create</Button>
    </Window>
  ) : (
    <Window>
      <span className="font-bold text-xl">GameBattle</span>
      <span className="text-gray-400">Log in to play</span>
      <Button onClick={() => login()}>Log In with Google</Button>
    </Window>
  );
}
