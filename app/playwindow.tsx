"use client";
import { auth, login } from "./firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "./button";
import Image from "next/image";

function Window({
  title = "GameBattle",
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch gap-8 p-8 max-w-[50rem] w-screen bg-black bg-opacity-90">
      <span className="font-bold text-4xl flex flex-row items-center justify-start gap-2">
        <Image src="/logo.png" width={40} height={40} alt="logo" />
        {title}
      </span>
      <div className="flex flex-col items-stretch gap-4 text-2xl">
        {children}
      </div>
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
      <Button href="/edit">Create</Button>
      <Button disabled={disabled} href="/play">
        Play
      </Button>
      <Button disabled={disabled} href="/leaderboard">
        Leaderboard
      </Button>
    </Window>
  ) : (
    <Window>
      <Button onClick={() => login()}>Log In with Google</Button>
    </Window>
  );
}
