import type { PhaseName } from "@/lib/api";

export const PHASES: { name: PhaseName; label: string; summary: string }[] = [
  {
    name: "development",
    label: "Development",
    summary: "Code editing allowed. Comparisons and leaderboard off.",
  },
  {
    name: "preparation",
    label: "Preparation",
    summary: "Everything blocked while the competition is set up.",
  },
  {
    name: "competition",
    label: "Competition",
    summary: "Comparisons and leaderboard on. Editing blocked.",
  },
  {
    name: "review",
    label: "Review",
    summary: "Leaderboard only. Comparisons and editing blocked.",
  },
];

export const canEdit = (phase: PhaseName) => phase === "development";
export const canCompare = (phase: PhaseName) => phase === "competition";
export const canSeeLeaderboard = (phase: PhaseName) =>
  phase === "competition" || phase === "review";
