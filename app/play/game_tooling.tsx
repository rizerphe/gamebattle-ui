"use client";
import Modal from "react-modal";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState } from "react";
import { VscRefresh, VscWarning, VscRunAll } from "react-icons/vsc";
import { AiFillLike } from "react-icons/ai";
import { redirect } from "next/navigation";

function RestartButton({
  api_route,
  session_id,
  game_id,
  restarting,
  setRestarting,
  setGameRunning,
}: {
  api_route: string;
  session_id: string;
  game_id: number;
  restarting: boolean;
  setRestarting: (restarting: boolean) => void;
  setGameRunning: (running: boolean) => void;
}) {
  const [user] = useAuthState(auth);

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
    <span
      className="relative group rounded-full p-3 aspect-square bg-transparent hover:bg-black"
      onClick={() => {
        setGameRunning(true);
        restartGame();
      }}
    >
      <VscRefresh
        className={`${
          restarting ? "animate-spin" : ""
        } text-xl text-zinc-200 hover:text-zinc-400`}
      />
      <div className="absolute bottom-full left-1/2 p-2 -translate-x-1/2 min-w-fit whitespace-nowrap">
        <span className="rounded bg-zinc-200 text-black px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition duration-300">
          Restart game
        </span>
      </div>
    </span>
  );
}

function ReportButton({
  api_route,
  session_id,
  game_id,
  output = "",
  gameRestarter,
  setGameRestarter,
}: {
  api_route: string;
  session_id: string;
  game_id: number;
  output?: string;
  gameRestarter: number;
  setGameRestarter: (gameRestarter: number) => void;
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

  const reportGame = async (
    restart_game: boolean = false,
    restart_session: boolean = false
  ) => {
    setReporting(true);
    await fetch(`${api_route}/sessions/${session_id}/${game_id}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user?.getIdToken()}`,
      },
      body: JSON.stringify({
        short_reason: shortReason,
        reason: reason,
        restart_game: restart_game,
        output: includeOutput ? output : "",
      }),
    });
    if (restart_game) {
      setGameRestarter(gameRestarter + 1);
    }
    if (restart_session) {
      await fetch(`${api_route}/sessions/${session_id}`, {
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
    <span
      className="relative group rounded-full p-3 aspect-square bg-transparent hover:bg-black"
      onClick={() => setConfirmation(true)}
    >
      <VscWarning className="text-xl text-zinc-200 group-hover:text-zinc-400" />
      <div className="absolute bottom-full left-1/2 p-2 -translate-x-1/2 min-w-fit whitespace-nowrap">
        <span className="rounded bg-zinc-200 text-black px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition duration-300">
          Report game
        </span>
      </div>
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
            backgroundColor: "#000000",
            border: "solid 2px #333333",
            borderRadius: "0.5rem",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.75)",
          },
        }}
        onRequestClose={(e) => {
          setConfirmation(false);
          e.stopPropagation();
        }}
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
            <span className="text-zinc-300">
              The game doesn&apos;t work / I can&apos;t end the game
            </span>
          </div>
          <div className="flex flex-row items-center gap-2">
            <input
              type="radio"
              className="rounded border-2 border-zinc-700 p-2 text-zinc-300 bg-zinc-900"
              checked={shortReason === "other"}
              onChange={() => setShortReason("other")}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-zinc-300">Other / I don&apos;t know</span>
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
            className="rounded border-2 border-zinc-900 p-2 text-zinc-300 bg-zinc-950"
            placeholder="More details (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex flex-row justify-stretch rounded overflow-hidden">
            <button
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2 px-4 flex-1 border-zinc-800 border-2"
              onClick={(e) => {
                setConfirmation(false);
                e.stopPropagation();
              }}
            >
              Cancel
            </button>
            <button
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2 px-4 flex-1 border-zinc-800 border-2"
              onClick={(e) => {
                reportGame();
                setConfirmation(false);
                e.stopPropagation();
              }}
            >
              Report
            </button>
            <button
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2 px-4 flex-1 border-zinc-800 border-2"
              onClick={() => {
                reportGame(false, true);
              }}
            >
              {reporting ? "Reporting..." : "Report and start a new session"}
            </button>
            <button
              className="bg-green-900 hover:bg-green-800 text-white font-bold py-2 px-4 flex-1 border-green-800 border-2"
              onClick={(e) => {
                reportGame(true, false);
                setConfirmation(false);
                e.stopPropagation();
              }}
            >
              {reporting ? "Reporting..." : "Report and start a new game"}
            </button>
          </div>
        </div>
      </Modal>
    </span>
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

  const image_source = {
    0: "/like.png",
    1: "/cat-1.png",
    2: "/cat-2.png",
    3: "/cat-3.png",
  }[Math.abs(0.5 - ownScore) * 8 - 1];
  const image_source_hover = {
    0: "/like.png",
    1: "/cat-1.png",
    2: "/cat-2.png",
    3: "/cat-3-hover.png",
  }[Math.abs(0.5 - ownScore) * 8 - 1];
  const caption = {
    0: "Normal like (some power)",
    1: "Cat like (more power)",
    2: "Very cat like (so much power)",
    3: "Super cat like (most power)",
  }[Math.abs(0.5 - ownScore) * 8 - 1];
  const active = ownScore === score;

  return allGamesOver || !image_source ? (
    <span
      className={`relative group rounded-full p-3 aspect-square ${
        active
          ? "bg-black outline outline-zinc-600 outline-1"
          : "bg-transparent hover:bg-black"
      }`}
      onClick={allGamesOver ? setPreference : undefined}
    >
      {allGamesOver ? (
        image_source ? (
          <>
            <img src={image_source} alt="Cat" />
            <div className="absolute inset-0 p-3">
              <img
                src={image_source_hover}
                alt=""
                className="opacity-0 group-hover:opacity-100 transition"
              />
            </div>
            {caption ? (
              <div className="absolute bottom-full left-1/2 p-2 -translate-x-1/2 min-w-fit whitespace-nowrap">
                <span className="rounded bg-zinc-200 text-black px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition duration-300">
                  {caption}
                </span>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <AiFillLike className="text-2xl text-white" />
            {caption ? (
              <div className="absolute bottom-full left-1/2 p-2 -translate-x-1/2 min-w-fit whitespace-nowrap">
                <span className="rounded bg-zinc-200 text-black px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition duration-300">
                  {caption}
                </span>
              </div>
            ) : null}
          </>
        )
      ) : image_source ? null : (
        <>
          <AiFillLike className="text-2xl text-white" />
          <div className="absolute bottom-full left-1/2 p-2 -translate-x-1/2 min-w-fit whitespace-nowrap">
            <span className="rounded bg-zinc-200 text-black px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition duration-300">
              Finish all games first
            </span>
          </div>
        </>
      )}
    </span>
  ) : null;
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
  restarting,
  setRestarting,
  n_games,
  gameRestarter,
  setGameRestarter,
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
  restarting: boolean;
  setRestarting: (restarting: boolean) => void;
  n_games: number;
  gameRestarter: number;
  setGameRestarter: (gameRestarter: number) => void;
}) {
  const [user] = useAuthState(auth);
  const [redirecting, setRedirecting] = useState<boolean>(false);

  const nextSession = async () => {
    await fetch(`${api_route}/sessions/${session_id}`, {
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
  const next_text = {
    0: ":)",
    1: ":p",
    2: ":3",
    3: ":D",
  }[Math.abs(0.5 - (score ?? 0.5)) * 8 - 1];

  return (
    <>
      <RestartButton
        api_route={api_route}
        session_id={session_id}
        game_id={game_id}
        restarting={restarting}
        setRestarting={setRestarting}
        setGameRunning={setGameRunning}
      />
      {score == null ? (
        <ReportButton
          api_route={api_route}
          session_id={session_id}
          game_id={game_id}
          output={output}
          gameRestarter={gameRestarter}
          setGameRestarter={setGameRestarter}
        />
      ) : null}
      {n_games > 1 && gameOver ? (
        <>
          <ScoreButton
            ownScore={1 - game_id}
            score={score}
            setScore={setScore}
            api_route={api_route}
            session_id={session_id}
            allGamesOver={allGamesOver}
          />
          <ScoreButton
            ownScore={Math.abs(1 - game_id - 0.125)}
            score={score}
            setScore={setScore}
            api_route={api_route}
            session_id={session_id}
            allGamesOver={allGamesOver}
          />
          <ScoreButton
            ownScore={Math.abs(1 - game_id - 0.25)}
            score={score}
            setScore={setScore}
            api_route={api_route}
            session_id={session_id}
            allGamesOver={allGamesOver}
          />
          <ScoreButton
            ownScore={Math.abs(1 - game_id - 0.375)}
            score={score}
            setScore={setScore}
            api_route={api_route}
            session_id={session_id}
            allGamesOver={allGamesOver}
          />
        </>
      ) : null}
      {n_games <= 1 || score === null || score === undefined ? null : (
        <span
          className="relative text-xs text-bold text-green-400 rounded p-4 flex flex-row justify-center items-center gap-2 cursor-pointer bg-black hover:bg-zinc-950 whitespace-nowrap group"
          onClick={nextSession}
        >
          {next_text} <VscRunAll />
          <div className="absolute bottom-full left-1/2 p-2 -translate-x-1/2 min-w-fit whitespace-nowrap">
            <span className="rounded bg-zinc-200 text-black px-2 py-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition duration-300">
              Next session
            </span>
          </div>
        </span>
      )}
    </>
  );
}
