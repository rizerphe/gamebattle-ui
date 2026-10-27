"use client";
import Link from "next/link";
import { auth, login } from "@/app/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Button from "@/components/app-button";
import CodeSummary from "@/components/code-summary";
import CompetitionInfo from "@/components/home-stats";
import { canCompare } from "@/lib/phase";
import { Countdown, nextStart } from "@/components/countdown";
import { usePhase } from "@/components/permissions";

const compact = "px-5 py-4 text-lg";

function Box({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-8 rounded-md bg-black bg-opacity-90 p-8 shadow-md shadow-black">
        {children}
      </div>
    </div>
  );
}

/** A primary action: title and an arrow. */
function Action({
  href,
  title,
  disabled,
}: {
  href: string;
  title: string;
  disabled?: boolean;
}) {
  const classes =
    "flex flex-row items-center justify-between rounded border px-6 py-5 text-3xl font-bold";
  return disabled ? (
    <div className={`${classes} border-zinc-800 bg-zinc-900 text-zinc-500`}>
      {title}
    </div>
  ) : (
    <Link
      href={href}
      className={`${classes} border-green-800 bg-green-950/50 hover:bg-green-950`}
    >
      {title}
      <span className="text-green-400">-&gt;</span>
    </Link>
  );
}

export default function PlayWindow() {
  const [user, loading] = useAuthState(auth);
  const state = usePhase().data;

  if (state?.phase === "preparation") {
    return <Countdown at={nextStart(state)} />;
  }
  if (loading || !state) return null;

  if (!user) {
    return (
      <Box>
        <Button className={compact} onClick={() => login()}>
          Log In with Google
        </Button>
        <p className="text-center text-base text-zinc-500">
          Use your school email to log in.
        </p>
      </Box>
    );
  }

  if (state.phase === "development") {
    return (
      <Box>
        <Action href="/edit" title="Develop" />
        <CodeSummary />
        <Link href="/leaderboard" className="text-lg text-teal-400 hover:text-teal-300">
          Go to leaderboard -&gt;
        </Link>
      </Box>
    );
  }

  // Competition and review look the same; playing is only possible in competition.
  const playable = canCompare(state.phase);
  return (
    <Box>
      <Action href="/play" title="Play" disabled={!playable} />
      <CompetitionInfo />
    </Box>
  );
}
