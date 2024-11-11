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
    <div className="flex flex-col flex-[3] items-stretch gap-8 p-8 bg-black bg-opacity-90 min-w-fit">
      <span className="font-bold text-4xl flex flex-row items-center justify-start gap-2">
        <Image src="/logo.png" width={40} height={40} alt="logo" />
        {title}
      </span>
      <div className="flex flex-col flex-1 justify-evenly items-stretch gap-4 text-2xl">
        {children}
      </div>
    </div>
  );
}

export default function PlayWindow({ disabled }: { disabled?: boolean }) {
  const [user, loading] = useAuthState(auth);

  // TODO: proper competition end handling

  return loading || user ? (
    <Window>
      <Button disabled={!disabled} href="/edit">
        Create
      </Button>
      <Button disabled={disabled} href="/play">
        Play
      </Button>
      <Button href="/leaderboard">Leaderboard</Button>
    </Window>
  ) : (
    <Window>
      <Button onClick={() => login()}>Log In with Google</Button>
    </Window>
  );
}
