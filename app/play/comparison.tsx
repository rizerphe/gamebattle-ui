"use client";
import { API_ROUTE } from "@/lib/api-route";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { toast } from "sonner";
import { auth } from "../firebase";
import {
  comparisonSchema,
  failureDetail,
  type Comparison,
} from "../../lib/api";
import Game from "./game";
import GameContainer from "./game-container";
import { ComparisonSideTooling } from "./game-tooling";

type FinishKind = "running" | "exited" | "terminated";

function sideLabel(comparison: Comparison, side: 0 | 1) {
  const name = comparison.game_names[side]?.trim();
  if (name) return name;
  return side === 0 ? "Left" : "Right";
}

export default function ComparisonPlay({
  comparison,
  onComparison,
  onStartNext,
}: {
  comparison: Comparison;
  onComparison: (comparison: Comparison) => void;
  onStartNext: () => Promise<Comparison | null>;
}) {
  const [user] = useAuthState(auth);
  const [fullscreen, setFullscreen] = useState<0 | 1 | null>(null);
  const [score, setScore] = useState<number | null>(comparison.rating);
  const [nextLoading, setNextLoading] = useState(false);

  useEffect(() => {
    setScore(comparison.rating);
  }, [comparison]);

  const allGamesReady =
    comparison.sides_ready[0] && comparison.sides_ready[1];

  const refreshComparison = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(
        `${API_ROUTE}/comparisons/${comparison.id}`,
        { headers: { Authorization: `Bearer ${await user.getIdToken()}` } },
      );
      if (!response.ok) return;
      onComparison(comparisonSchema.parse(await response.json()));
    } catch (error) {
      console.error(error);
    }
  }, [comparison.id, onComparison, user]);

  const startNext = async () => {
    setNextLoading(true);
    try {
      const next = await onStartNext();
      if (next) onComparison(next);
    } catch (error) {
      console.error(error);
      toast("Could not start the next comparison");
    }
    setNextLoading(false);
  };

  return (
    <div className="flex flex-row flex-1 gap-4 w-full">
      {([0, 1] as const).map((side) =>
        fullscreen == null || fullscreen === side ? (
          <Side
            key={`${side}-${currentSession(comparison, side)}`}
            label={sideLabel(comparison, side)}
            side={side} comparison={comparison}
            allGamesReady={allGamesReady}
            score={score}
            onScore={setScore}
            onComparison={onComparison}
            onRefreshComparison={() => void refreshComparison()}
            onNextComparison={() => void startNext()}
            nextLoading={nextLoading}
            toggleFullscreen={() =>
              setFullscreen(fullscreen === side ? null : side)
            }
          />
        ) : null,
      )}
    </div>
  );
}

function currentSession(comparison: Comparison, side: 0 | 1): string {
  const sessions = comparison.sessions[side];
  return sessions[sessions.length - 1];
}

function Side({
  label,
  side,
  comparison,
  allGamesReady,
  score,
  onScore,
  onComparison,
  onRefreshComparison,
  onNextComparison,
  nextLoading,
  toggleFullscreen,
}: {
  label: string;
  side: 0 | 1;
  comparison: Comparison;
  allGamesReady: boolean;
  score: number | null;
  onScore: (score: number) => void;
  onComparison: (comparison: Comparison) => void;
  onRefreshComparison: () => void;
  onNextComparison: () => void;
  nextLoading: boolean;
  toggleFullscreen: () => void;
}) {
  const [user] = useAuthState(auth);
  const ref = useRef<HTMLDivElement | null>(null);
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(true);
  const [restarting, setRestarting] = useState(false);
  const sessionId = currentSession(comparison, side);

  useEffect(() => {
    setRunning(true);
    setConnected(false);
    setRestarting(false);
  }, [sessionId]);

  const restart = async () => {
    if (!user) {
      toast("Sign in to restart");
      return;
    }
    setRestarting(true);
    setRunning(true);
    try {
      const response = await fetch(
        `${API_ROUTE}/comparisons/${comparison.id}/sides/${side}/restart`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        },
      );
      if (!response.ok) {
        toast(await failureDetail(response, "Could not restart"));
        setRestarting(false);
        return;
      }
      onComparison(comparisonSchema.parse(await response.json()));
      setConnected(false);
      setRestarting(false);
    } catch (error) {
      console.error(error);
      toast("Could not restart");
      setRestarting(false);
    }
  };

  return (
    <div
      className={`flex flex-col flex-1 min-w-0 ${
        running ? "bg-black" : "bg-zinc-900"
      } bg-opacity-90 rounded-lg items-stretch`}
      onClick={() => ref.current?.focus?.()}
    >
      <GameContainer
        name={label}
        tooling={
          <>
            <ComparisonSideTooling comparisonId={comparison.id}
              side={side}
              session_id={sessionId}
              allGamesReady={allGamesReady}
              score={score}
              onScore={onScore}
              onComparison={onComparison}
              restarting={restarting}
              onRestart={() => void restart()}
              toggleFullscreen={toggleFullscreen}
              onNextComparison={onNextComparison}
              nextLoading={nextLoading}
            />
            {connected || !running ? null : (
              <span className="font-bold text-red-600">connecting...</span>
            )}
          </>
        }
      >
        <Game
          key={sessionId} session_id={sessionId}
          setConnected={setConnected}
          inputRef={ref}
          gameRunning={running}
          setGameRunning={(next) => {
            if (!restarting) setRunning(next);
          }}
          onFinishKind={(kind: FinishKind) => {
            if (kind !== "running") setRunning(false);
          }}
          onGenuineExit={onRefreshComparison}
        />
      </GameContainer>
    </div>
  );
}
