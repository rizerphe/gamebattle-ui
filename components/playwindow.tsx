"use client";
import { auth, login } from "@/app/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "@/components/app-button";
import Image from "next/image";
import { canCompare, canEdit, canSeeLeaderboard } from "@/lib/phase";
import { Countdown, nextStart } from "@/components/countdown";
import { usePhase, usePlayer } from "@/components/permissions";

function Window({
  title = "GameBattle",
  action,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-[3] items-stretch gap-8 p-8 bg-black bg-opacity-90 min-w-fit">
      <div className="flex flex-row items-center justify-between gap-4">
        <span className="font-bold text-4xl flex flex-row items-center justify-start gap-2">
          <Image src="/logo.png" width={40} height={40} alt="logo" />
          {title}
        </span>
        {action}
      </div>
      <div className="flex flex-col flex-1 justify-evenly items-stretch gap-4 text-2xl">
        {children}
      </div>
    </div>
  );
}

export default function PlayWindow() {
  const [user, loading] = useAuthState(auth);
  const state = usePhase().data;
  const phase = state?.phase;
  const player = usePlayer().data;
  const admin = player?.admin ?? false;

  const tools = admin ? (
    <div className="shrink-0 text-base">
      <Button href="/admin">Admin tools</Button>
    </div>
  ) : null;

  return loading || user ? (
    <Window action={user ? tools : null}>
      {state?.phase === "preparation" ? <Countdown at={nextStart(state)} /> : null}
      <Button disabled={!phase || !canEdit(phase)} href="/edit">
        Edit
      </Button>
      <Button disabled={!phase || !canCompare(phase)} href="/play">
        Play
      </Button>
      <Button disabled={!phase || !canSeeLeaderboard(phase)} href="/leaderboard">
        Leaderboard
      </Button>
    </Window>
  ) : (
    <Window>
      <Button onClick={() => login()}>Log In with Google</Button>
    </Window>
  );
}
