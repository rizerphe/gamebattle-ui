"use client";
import { API_ROUTE } from "@/lib/api-route";

import Modal from "react-modal";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import {
  VscRefresh,
  VscWarning,
  VscRunAll,
  VscScreenFull,
} from "react-icons/vsc";
import { AiFillLike } from "react-icons/ai";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  comparisonSchema,
  failureDetail,
  sessionSchema,
  type Comparison,
} from "../../lib/api";

const ROUND = "rounded-full p-3 aspect-square bg-transparent hover:bg-black";

/** The tooltip grows leftwards from the button's right edge, so right-aligned toolbars never overflow. */
function IconButton({
  label,
  onClick,
  className = ROUND,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button type="button" className={`relative group ${className}`} onClick={onClick}>
      {children}
      <span className="pointer-events-none absolute bottom-full right-0 mb-2 whitespace-nowrap rounded bg-zinc-200 px-2 py-1 text-xs font-bold text-black opacity-0 transition duration-300 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function FullscreenButton({ toggleFullscreen }: { toggleFullscreen: () => void }) {
  return (
    <IconButton label="Fullscreen" onClick={toggleFullscreen}>
      <VscScreenFull className="text-xl text-zinc-200 group-hover:text-zinc-400" />
    </IconButton>
  );
}

function RestartButton({
  restarting,
  onRestart,
}: {
  restarting: boolean;
  onRestart: () => void;
}) {
  return (
    <IconButton label="Restart game" onClick={() => !restarting && onRestart()}>
      <VscRefresh
        className={`${restarting ? "animate-spin" : ""} text-xl text-zinc-200 group-hover:text-zinc-400`}
      />
    </IconButton>
  );
}

function ReportButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="Report game" onClick={onClick}>
      <VscWarning className="text-xl text-zinc-200 group-hover:text-zinc-400" />
    </IconButton>
  );
}

const SCORE_TIERS = [
  { caption: "Normal like (some power)", image: "/like.png", hover: "/like.png" },
  { caption: "Cat like (more power)", image: "/cat-1.png", hover: "/cat-1.png" },
  { caption: "Very cat like (so much power)", image: "/cat-2.png", hover: "/cat-2.png" },
  { caption: "Super cat like (most power)", image: "/cat-3.png", hover: "/cat-3-hover.png" },
] as const;

function tierIndex(ownScore: number) {
  return Math.abs(0.5 - ownScore) * 8 - 1;
}

function ScoreButton({
  ownScore,
  score,
  onPick,
  allGamesReady,
  submitting,
}: {
  ownScore: number;
  score: number | null;
  onPick: (leftScore: number) => void;
  allGamesReady: boolean;
  submitting: boolean;
}) {
  const tier = tierIndex(ownScore);
  const meta = SCORE_TIERS[tier];
  if (!meta) return null;
  const active = ownScore === score;

  return (
    <IconButton
      label={allGamesReady ? meta.caption : "Finish both games first"}
      onClick={() => allGamesReady && !submitting && onPick(ownScore)}
      className={`rounded-full p-3 aspect-square ${
        active ? "bg-black outline outline-zinc-600 outline-1" : "bg-transparent hover:bg-black"
      } ${submitting ? "opacity-50 pointer-events-none" : ""}`}
    >
      {allGamesReady ? (
        <span className="relative block">
          <img src={meta.image} alt="" />
          <img
            src={meta.hover}
            alt=""
            className="absolute inset-0 opacity-0 transition group-hover:opacity-100"
          />
        </span>
      ) : (
        <AiFillLike className="text-2xl text-zinc-500" />
      )}
    </IconButton>
  );
}

function ReportModal({
  isOpen,
  onClose,
  onConfirm,
  reporting,
  replaceCopy,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (shortReason: "unclear" | "buggy" | "other", reason: string) => void;
  reporting: boolean;
  replaceCopy: boolean;
}) {
  const [reason, setReason] = useState("");
  const [shortReason, setShortReason] = useState<"unclear" | "buggy" | "other">(
    "other",
  );

  return (
    <Modal
      isOpen={isOpen}
      contentLabel="Report game"
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
        onClose();
        e.stopPropagation();
      }}
    >
      <div className="flex flex-col gap-4 items-stretch">
        <span className="text-xl font-bold text-center">Report a game</span>
        <span className="text-center">
          {replaceCopy
            ? "Reporting replaces this game with another. Organizers can replay the session and read what you write here."
            : "Reporting ends this session. Organizers can replay it and read what you write here."}
        </span>
        {(["unclear", "buggy", "other"] as const).map((value) => (
          <div key={value} className="flex flex-row items-center gap-2">
            <input
              type="radio"
              className="rounded border-2 border-zinc-700 p-2 text-zinc-300 bg-zinc-900"
              checked={shortReason === value}
              onChange={() => setShortReason(value)}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-zinc-300">
              {value === "unclear"
                ? "Unclear instructions"
                : value === "buggy"
                  ? "The game doesn't work / I can't end the game"
                  : "Other / I don't know"}
            </span>
          </div>
        ))}
        <textarea
          className="rounded border-2 border-zinc-900 p-2 text-zinc-300 bg-zinc-950"
          placeholder="More details (optional)"
          maxLength={4000}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex flex-row justify-stretch rounded overflow-hidden">
          <button
            type="button"
            className="bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-2 px-4 flex-1 border-zinc-800 border-2"
            disabled={reporting}
            onClick={(e) => {
              onClose();
              e.stopPropagation();
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-green-900 hover:bg-green-800 text-white font-bold py-2 px-4 flex-1 border-green-800 border-2 disabled:opacity-50"
            disabled={reporting}
            onClick={(e) => {
              e.stopPropagation();
              onConfirm(shortReason, reason);
            }}
          >
            {reporting ? "Reporting..." : replaceCopy ? "Report" : "Report and leave"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function NextComparisonButton({
  score,
  loading,
  onNext,
}: {
  score: number | null;
  loading: boolean;
  onNext: () => void;
}) {
  if (score === null) return null;
  const next_text = {
    0: ":)",
    1: ":p",
    2: ":3",
    3: ":D",
  }[tierIndex(score)];

  return (
    <IconButton
      label="Next comparison"
      onClick={() => !loading && onNext()}
      className={`text-xs font-bold text-green-400 rounded p-4 flex flex-row justify-center items-center gap-2 bg-black hover:bg-zinc-950 whitespace-nowrap ${
        loading ? "opacity-50 pointer-events-none" : ""
      }`}
    >
      {next_text} <VscRunAll />
    </IconButton>
  );
}

export function ComparisonSideTooling({
  comparisonId,
  side,
  session_id,
  allGamesReady,
  score,
  onScore,
  onComparison,
  restarting,
  onRestart,
  toggleFullscreen,
  onNextComparison,
  nextLoading,
}: {
  comparisonId: string;
  side: 0 | 1;
  session_id: string;
  allGamesReady: boolean;
  score: number | null;
  onScore: (score: number) => void;
  onComparison: (comparison: Comparison) => void;
  restarting: boolean;
  onRestart: () => void;
  toggleFullscreen: () => void;
  onNextComparison: () => void;
  nextLoading: boolean;
}) {
  const [user] = useAuthState(auth);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  const submitRating = async (leftScore: number) => {
    if (!user) {
      toast("Sign in to rate");
      return;
    }
    setRatingSubmitting(true);
    try {
      const response = await fetch(
        `${API_ROUTE}/comparisons/${comparisonId}/rating`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ score: leftScore }),
        },
      );
      if (!response.ok) {
        toast(await failureDetail(response, "Could not save rating"));
        return;
      }
      const updated = comparisonSchema.parse(await response.json());
      onComparison(updated);
      if (updated.rating !== null) onScore(updated.rating);
    } catch (error) {
      console.error(error);
      toast("Could not save rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  const reportGame = async (
    shortReason: "unclear" | "buggy" | "other",
    reason: string,
  ) => {
    if (!user) {
      toast("Sign in to report this game");
      return;
    }
    setReporting(true);
    try {
      const response = await fetch(
        `${API_ROUTE}/comparisons/${comparisonId}/sides/${side}/report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ short_reason: shortReason, reason }),
        },
      );
      if (!response.ok) {
        toast(await failureDetail(response, "Could not file the report"));
        setReporting(false);
        return;
      }
      onComparison(comparisonSchema.parse(await response.json()));
      setReportOpen(false);
    } catch (error) {
      console.error(error);
      toast("Could not file the report");
    }
    setReporting(false);
  };

  const ownScores = [
    1 - side,
    Math.abs(1 - side - 0.125),
    Math.abs(1 - side - 0.25),
    Math.abs(1 - side - 0.375),
  ] as const;

  return (
    <>
      <FullscreenButton toggleFullscreen={toggleFullscreen} />
      <RestartButton restarting={restarting} onRestart={onRestart} />
      {score === null ? (
        <ReportButton onClick={() => setReportOpen(true)} />
      ) : null}
      {score === null
        ? ownScores.map((ownScore) => (
            <ScoreButton
              key={ownScore}
              ownScore={ownScore}
              score={score}
              onPick={(leftScore) => void submitRating(leftScore)}
              allGamesReady={allGamesReady}
              submitting={ratingSubmitting}
            />
          ))
        : null}
      <NextComparisonButton
        score={score}
        loading={nextLoading}
        onNext={onNextComparison}
      />
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onConfirm={(shortReason, reason) => void reportGame(shortReason, reason)}
        reporting={reporting}
        replaceCopy
      />
    </>
  );
}

export default function SessionGameTooling({
  session_id,
  setGameRunning,
  restarting,
  setRestarting,
  toggleFullscreen,
  restartHref,
}: {
  session_id: string;
  setGameRunning: (running: boolean) => void;
  restarting: boolean;
  setRestarting: (restarting: boolean) => void;
  toggleFullscreen: () => void;
  restartHref: string;
}) {
  const [user] = useAuthState(auth);
  const router = useRouter();
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [redirectAfterReport, setRedirectAfterReport] = useState(false);

  useEffect(() => {
    if (redirectAfterReport) router.push("/play");
  }, [redirectAfterReport, router]);

  const restartGame = async () => {
    if (!user) {
      toast("Sign in to restart");
      return;
    }
    setRestarting(true);
    setGameRunning(true);
    try {
      const response = await fetch(
        `${API_ROUTE}/sessions/${session_id}/restart`,
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
      const created = sessionSchema.parse(await response.json());
      router.replace(restartHref.replace("{id}", created.id));
    } catch (error) {
      console.error(error);
      toast("Could not restart");
      setRestarting(false);
    }
  };

  const reportGame = async (
    shortReason: "unclear" | "buggy" | "other",
    reason: string,
  ) => {
    if (!user) {
      toast("Sign in to report this game");
      return;
    }
    setReporting(true);
    try {
      const response = await fetch(
        `${API_ROUTE}/sessions/${session_id}/report`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify({ short_reason: shortReason, reason }),
        },
      );
      if (!response.ok) {
        toast(await failureDetail(response, "Could not file the report"));
        setReporting(false);
        return;
      }
      setRedirectAfterReport(true);
    } catch (error) {
      console.error(error);
      toast("Could not file the report");
      setReporting(false);
    }
  };

  return (
    <>
      <FullscreenButton toggleFullscreen={toggleFullscreen} />
      <RestartButton restarting={restarting} onRestart={() => void restartGame()} />
      <ReportButton onClick={() => setReportOpen(true)} />
      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onConfirm={(shortReason, reason) => void reportGame(shortReason, reason)}
        reporting={reporting}
        replaceCopy={false}
      />
    </>
  );
}
