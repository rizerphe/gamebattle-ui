"use client";
import { auth, login } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "./button";

function Window({
  title = "GameBattle",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch gap-4 rounded-md bg-gray-900 p-4 min-w-[30rem]">
      <span className="font-bold text-2xl">{title}</span>
      <div className="flex flex-col items-stretch gap-2">{children}</div>
    </div>
  );
}

export default function PlayWindow({ disabled }: { disabled?: boolean }) {
  const [user, loading] = useAuthState(auth);

  return loading ? (
    <Window>
      <span className="text-gray-400">Loading...</span>
    </Window>
  ) : user ? (
    <Window>
      <Button disabled={disabled} href="/play">
        Play
      </Button>
      <Button disabled={disabled} href="/leaderboard">
        Leaderboard
      </Button>
      <Button href="/edit">Create</Button>
    </Window>
  ) : (
    <Window>
      <span className="text-gray-400">Log in to play</span>
      <Button onClick={() => login()}>Log In with Google</Button>
    </Window>
  );
}
