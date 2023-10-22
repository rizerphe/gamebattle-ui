"use client";
import Modal from "react-modal";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState } from "react";
import { VscRefresh, VscWarning, VscRunAll } from "react-icons/vsc";
import { AiFillLike } from "react-icons/ai";
import { redirect } from "next/navigation";

function ReportButton({
  api_route,
  session_id,
  game_id,
  output = "",
}: {
  api_route: string;
  session_id: string;
  game_id: number;
  output?: string;
}) {
  const [user] = useAuthState(auth);
  const [confirmation, setConfirmation] = useState<boolean>(false);
  const [reason, setReason] = useState<string>("");
  const [reporting, setReporting] = useState<boolean>(false);
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [includeOutput, setIncludeOutput] = useState<boolean>(true);
  const [shortReason, setShortReason] = useState<"unclear" | "buggy" | "other">(
    "other"
  );

  if (redirecting) {
    redirect("/play");
  }

  const reportGame = async (restart_session: boolean = false) => {
    setReporting(true);
    fetch(`${api_route}/sessions/${session_id}/${game_id}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
      body: JSON.stringify({
        short_reason: shortReason,
        reason: reason,
        output: includeOutput ? output : "",
      }),
    });
    if (restart_session) {
      await fetch(`${api_route}/sessions/${session_id}/`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
      });
      setRedirecting(true);
    }
    setReporting(false);
  };

  return (
    <>
      <VscWarning
        className="text-xl text-zinc-200 hover:text-zinc-400"
        onClick={() => setConfirmation(true)}
      />
      <Modal
        isOpen={confirmation}
        contentLabel="Confirm close"
        style={{
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "#1e1e1e",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        }}
        onRequestClose={() => setConfirmation(false)}
      >
        <div className="flex flex-col gap-4 items-stretch">
          <span className="text-xl font-bold text-center">Report a game</span>
          <span className="text-center">
            You are about to report this game. This will notify the organizers.
            You might not be able to play this game again.
          </span>
          <div className="flex flex-row items-center gap-2">
            <input
              type="radio"
              className="rounded border-2 border-zinc-700 p-2 text-zinc-300 bg-zinc-900"
              checked={shortReason === "unclear"}
              onChange={() => setShortReason("unclear")}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-zinc-300">Unclear instructions</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <input
              type="radio"
              className="rounded border-2 border-zinc-700 p-2 text-zinc-300 bg-zinc-900"
              checked={shortReason === "buggy"}
              onChange={() => setShortReason("buggy")}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-zinc-300">The game doesn't work</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <input
              type="radio"
              className="rounded border-2 border-zinc-700 p-2 text-zinc-300 bg-zinc-900"
              checked={shortReason === "other"}
              onChange={() => setShortReason("other")}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-zinc-300">Other / I don't know</span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-2 border-zinc-700 p-2 text-zinc-300 bg-zinc-900"
              checked={includeOutput}
              onChange={(e) => setIncludeOutput(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-zinc-300">Include game logs</span>
          </div>
          <textarea
            className="rounded border-2 border-zinc-700 p-2 text-zinc-300 bg-zinc-900"
            placeholder="Reason for reporting"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex flex-row justify-stretch rounded overflow-hidden">
            <button
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 flex-1 border-zinc-700 border-2"
              onClick={() => setConfirmation(false)}
            >
              Cancel
            </button>
            <button
              className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 flex-1 border-zinc-600 border-2"
              onClick={() => {
                reportGame();
                setConfirmation(false);
              }}
            >
              Report
            </button>
            <button
              className="bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 flex-1 border-green-600 border-2"
              onClick={() => {
                reportGame(true);
              }}
            >
              {reporting ? "Reporting..." : "Report and start a new session"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ScoreButton({
  ownScore,
  score,
  setScore,
  api_route,
  session_id,
  allGamesOver,
}: {
  ownScore: number;
  score: number | null;
  setScore: (score: number) => void;
  api_route: string;
  session_id: string;
  allGamesOver: boolean;
}) {
  const [user] = useAuthState(auth);
  const [redirecting, setRedirecting] = useState<boolean>(false);

  const setPreference = async () => {
    setScore(ownScore);
    await fetch(`${api_route}/sessions/${session_id}/preference`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
      body: JSON.stringify({ score_first: ownScore }),
    });
  };

  const nextSession = async () => {
    await fetch(`${api_route}/sessions/${session_id}/`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
    });
    setRedirecting(true);
  };

  if (redirecting) {
    redirect("/play");
  }

  const active = ownScore === score;

  return (
    <>
      <span
        className={`relative rounded-full p-2 ${
          active ? "bg-zinc-700" : "bg-zinc-300 hover:bg-zinc-400"
        }`}
      >
        {allGamesOver ? (
          <AiFillLike
            className={`text-2xl text-green-800 ${
              active ? "" : "animate-pulse animate-bounce"
            }`}
            onClick={setPreference}
          />
        ) : (
          <>
            <AiFillLike className="text-2xl text-zinc-800" />
            <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
              <span className="absolute top-0 right-0 bottom-0 flex flex-row justify-center items-center whitespace-nowrap w-fit rounded text-xs bg-zinc-100 text-zinc-900 p-1">
                Finish all games first!
              </span>
            </div>
          </>
        )}
      </span>
      {active ? (
        <span
          className="text-xs text-zinc-900 rounded p-2 flex flex-row justify-center items-center gap-2 cursor-pointer bg-zinc-200 hover:bg-zinc-300"
          onClick={nextSession}
        >
          Next session <VscRunAll />
        </span>
      ) : null}
    </>
  );
}

export default function GameTooling({
  api_route,
  session_id,
  game_id,
  setGameRunning,
  gameOver,
  allGamesOver,
  score,
  setScore,
  output,
}: {
  api_route: string;
  session_id: string;
  game_id: number;
  setGameRunning: (running: boolean) => void;
  gameOver: boolean;
  allGamesOver: boolean;
  score: number | null;
  setScore: (score: number) => void;
  output: string;
}) {
  const [user] = useAuthState(auth);
  const [restarting, setRestarting] = useState<boolean>(false);

  const restartGame = async () => {
    setRestarting(true);
    await fetch(`${api_route}/sessions/${session_id}/${game_id}/restart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
      body: JSON.stringify({}),
    });
    setRestarting(false);
  };

  return (
    <>
      <VscRefresh
        className={`${
          restarting ? "animate-spin" : ""
        } text-xl text-zinc-200 hover:text-zinc-400`}
        onClick={() => {
          setGameRunning(true);
          restartGame();
        }}
      />
      <ReportButton
        api_route={api_route}
        session_id={session_id}
        game_id={game_id}
        output={output}
      />
      {gameOver ? (
        <ScoreButton
          ownScore={1 - game_id}
          score={score}
          setScore={setScore}
          api_route={api_route}
          session_id={session_id}
          allGamesOver={allGamesOver}
        />
      ) : null}
    </>
  );
}
