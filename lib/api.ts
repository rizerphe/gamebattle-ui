import { z } from "zod";

const fileDraftSchema = z.object({
  content: z.string().nullable(),
});

const gameFileSchema = z.object({
  path: z.string(),
  saved_content: z.string().nullable(),
  draft: fileDraftSchema.nullable(),
});

export const snapshotSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  timestamp: z.number(),
  author: z.string(),
  reason: z.string(),
  modified: z.boolean(),
  files: z.array(gameFileSchema),
});

export const snapshotsSchema = z.array(snapshotSchema);

export const sessionSchema = z.object({
  id: z.string(),
  game: z.string(),
  game_revision: z.string(),
  player: z.string(),
  started_at: z.number(),
  recording_seconds: z.number(),
  fairness: z
    .object({
      status: z.enum(["done", "timeout", "error"]),
      verdict: z.enum(["enough", "unsure", "not_enough"]).nullable(),
      reason: z.string().nullable(),
      duration: z.number().nullable(),
    })
    .nullish(),
  fairness_override: z
    .enum(["enough", "unsure", "not_enough", "verified_not_enough"])
    .nullish(),
});

/** A session as its own player gets it: no game, revision or player ids. */
export const playerSessionSchema = z.object({
  id: z.string(),
  started_at: z.number(),
  recording_seconds: z.number(),
});

export const sessionsSchema = z.array(sessionSchema);

export const replayableSchema = z.object({
  session_id: z.string(),
  recording_seconds: z.number(),
  game_name: z.string().nullable().optional(),
});

const sidesReadySchema = z.preprocess(
  (value) => value ?? [false, false],
  z.tuple([z.boolean(), z.boolean()]),
);

const gameNamesSchema = z.preprocess(
  (value) => value ?? [null, null],
  z.tuple([z.string().nullable(), z.string().nullable()]),
);

export const comparisonSchema = z.object({
  id: z.string(),
  player: z.string(),
  sessions: z.tuple([
    z.array(z.string()).min(1),
    z.array(z.string()).min(1),
  ]),
  rating: z.number().nullable(),
  sides_ready: sidesReadySchema,
  game_names: gameNamesSchema,
});

export const comparisonPhaseSchema = z.enum([
  "running",
  "awaiting_rating",
  "rated",
]);

export const comparisonSideSessionSchema = z.object({
  session_id: z.string(),
  game_id: z.string(),
  game_name: z.string().nullable(),
  recording_seconds: z.number(),
});

export const comparisonActivitySchema = comparisonSchema.extend({
  started_at: z.number(),
  voter_email: z.string().nullable(),
  game_ids: z.tuple([z.string().nullable(), z.string().nullable()]),
  phase: comparisonPhaseSchema,
  side_sessions: z.tuple([
    z.array(comparisonSideSessionSchema),
    z.array(comparisonSideSessionSchema),
  ]),
});

export const comparisonsActivitySchema = z.array(comparisonActivitySchema);

/** A checkpoint and every event after it; `next` is where the following chunk starts. */
export const recordingChunkSchema = z.object({
  checkpoint: z.object({
    sequence: z.number(),
    elapsed: z.number(),
    columns: z.number(),
    rows: z.number(),
    state: z.string(),
  }),
  events: z.array(
    z.object({
      elapsed: z.number(),
      type: z.string(),
      data: z.string().nullish(),
      columns: z.number().nullish(),
      rows: z.number().nullish(),
    }),
  ),
  next: z.number().nullable(),
});

export const terminalEventSchema = z.object({
  sequence: z.number(),
  elapsed: z.number(),
  type: z.string(),
});

export const terminalEventsSchema = z.array(terminalEventSchema);

export const reportReasonSchema = z.enum(["unclear", "buggy", "other"]);

export const reportSchema = z.object({
  id: z.string(),
  session: sessionSchema,
  short_reason: reportReasonSchema,
  reason: z.string(),
  timestamp: z.number(),
});

export const reportsSchema = z.array(reportSchema);

export const fairnessStatusSchema = z.object({
  enabled: z.boolean(),
  model: z.string().nullable(),
});

export const fairnessVerdictSchema = z.enum([
  "enough",
  "unsure",
  "not_enough",
  "verified_not_enough",
]);

export const fairnessRowSchema = z.object({
  session_id: z.string(),
  comparison_id: z.string(),
  side: z.number(),
  voter: z.string(),
  voter_email: z.string().nullable(),
  game_id: z.string(),
  game_name: z.string().nullable(),
  started_at: z.number(),
  rated_at: z.number().nullable(),
  rating: z.number(),
  counted: z.boolean(),
  confirmed_warning: z.boolean(),
  duration: z.number().nullable(),
  status: z.enum(["done", "timeout", "error"]).nullable(),
  verdict: z.enum(["enough", "unsure", "not_enough"]).nullable(),
  reason: z.string().nullable(),
  override: fairnessVerdictSchema.nullable(),
  effective: fairnessVerdictSchema,
});

export const fairnessRowsSchema = z.array(fairnessRowSchema);

export const ratedActivitySchema = z.object({
  comparison_id: z.string(),
  voter: z.string(),
  voter_email: z.string().nullable(),
  started_at: z.number(),
  rated_at: z.number().nullable(),
  rating: z.number(),
  counted: z.boolean(),
  confirmed_warning: z.boolean(),
  game_names: z.tuple([z.string().nullable(), z.string().nullable()]),
});

export const ratedActivitiesSchema = z.array(ratedActivitySchema);

export const hypotheticalEntrySchema = z.object({
  game_id: z.string(),
  name: z.string().nullable(),
  current_score: z.number().nullable(),
  hypothetical_score: z.number().nullable(),
  delta: z.number().nullable(),
  owned_by_excluded: z.boolean(),
});

export const hypotheticalSchema = z.array(hypotheticalEntrySchema);

export const REPORT_REASON_LABELS: Record<
  z.infer<typeof reportReasonSchema>,
  string
> = {
  unclear: "Unclear instructions",
  buggy: "Doesn't work",
  other: "Other",
};

export const ticketSchema = z.object({
  ticket: z.string(),
  expires_at: z.number(),
});

export const phaseNameSchema = z.enum([
  "development",
  "preparation",
  "competition",
  "review",
]);

export const phaseStateSchema = z.object({
  phase: phaseNameSchema,
  schedule: z.object({
    preparation: z.number().nullable(),
    competition: z.number().nullable(),
    review: z.number().nullable(),
  }),
});

/** Reports on one publication that take a game down. Mirrors the server's limit. */
export const REPORTS_BEFORE_REMOVAL = 5;

export const webhookSchema = z.object({
  id: z.string(),
  url: z.string(),
  event: z.enum(["every_report", "first_report", "threshold", "removed"]),
  /** The report count, for the "threshold" event; otherwise null. */
  threshold: z.number().nullable(),
  created_at: z.number(),
});

export const webhooksSchema = z.array(webhookSchema);

export const gameSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

export const gamesSchema = z.array(gameSchema);

export const adminStudentSchema = z.object({
  id: z.string(),
  game_name: z.string().nullable(),
  email: z.string().nullable(),
  username: z.string().nullable(),
  photo: z.string().nullable(),
  elo: z.number().nullable(),
  place: z.number().nullable(),
  times_played: z.number(),
  comparisons_made: z.number(),
  reports_filed: z.number(),
  reports_received: z.number(),
  admin: z.boolean().optional().default(false),
});

export const adminStudentsSchema = z.array(adminStudentSchema);

export const leaderboardEntrySchema = z.object({
  name: z.string().nullable(),
  score: z.number(),
  times_played: z.number(),
  /** The viewer's own game. Entries carry no ids. */
  own: z.boolean(),
});

export const leaderboardSchema = z.array(leaderboardEntrySchema);

/** `GET /stats`: platform totals and the caller's competition progress. */
export const statsSchema = z.object({
  platform: z.object({
    players: z.number(),
    runs: z.number(),
    lines: z.number(),
    largest_game_lines: z.number(),
  }),
  /** Null outside the competition and review phases. */
  competition: z
    .object({
      accumulation: z.number(),
      required_accumulation: z.number(),
      elo: z.number().nullable(),
      place: z.number().nullable(),
      places: z.number(),
    })
    .nullable(),
});

export const playerSchema = z.object({
  id: z.string(),
  admin: z.boolean(),
  allowed: z.boolean().optional().default(true),
});

export const studentSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  username: z.string().nullable(),
  photo: z.string().nullable(),
});

export const studentsSchema = z.array(studentSchema);

export const submittedGameSchema = z.object({
  email: z.string(),
  name: z.string(),
  game_id: z.string(),
  snapshot_id: z.string(),
  linked: z.boolean(),
  warning: z.string().nullable(),
});

export const submissionResultSchema = z.object({
  games: z.array(submittedGameSchema),
  unlinked: z.array(submittedGameSchema),
});

export type GameFile = z.infer<typeof gameFileSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Replayable = z.infer<typeof replayableSchema>;
export type Comparison = z.infer<typeof comparisonSchema>;
export type ComparisonSideSession = z.infer<typeof comparisonSideSessionSchema>;
export type ComparisonActivity = z.infer<typeof comparisonActivitySchema>;
export type ComparisonPhase = z.infer<typeof comparisonPhaseSchema>;
export type RecordingChunk = z.infer<typeof recordingChunkSchema>;
export type TerminalEvent = z.infer<typeof terminalEventSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
export type Report = z.infer<typeof reportSchema>;
export type FairnessRow = z.infer<typeof fairnessRowSchema>;
export type FairnessVerdict = z.infer<typeof fairnessVerdictSchema>;
export type RatedActivity = z.infer<typeof ratedActivitySchema>;
export type HypotheticalEntry = z.infer<typeof hypotheticalEntrySchema>;
export type Ticket = z.infer<typeof ticketSchema>;
export type PhaseName = z.infer<typeof phaseNameSchema>;
export type PhaseState = z.infer<typeof phaseStateSchema>;
export type Webhook = z.infer<typeof webhookSchema>;
export type Game = z.infer<typeof gameSchema>;
export type AdminStudent = z.infer<typeof adminStudentSchema>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type Stats = z.infer<typeof statsSchema>;
export type StudentProfile = z.infer<typeof studentSchema>;
export type SubmittedGame = z.infer<typeof submittedGameSchema>;
export type SubmissionResult = z.infer<typeof submissionResultSchema>;

export type EditorFile = {
  path: string;
  content: string;
  saved_content: string | null;
};

export function detailFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export async function failureDetail(
  response: Response,
  fallback: string
): Promise<string> {
  const data: unknown = await response.json().catch(() => null);
  return detailFromBody(data, fallback);
}

export function editorFiles(snapshot: Snapshot): EditorFile[] {
  return snapshot.files.flatMap((file) => {
    const content = file.draft ? file.draft.content : file.saved_content;
    if (content === null) return [];
    return [{ path: file.path, content, saved_content: file.saved_content }];
  });
}

export function unsavedFiles(
  snapshot: Snapshot
): { path: string; content: string }[] {
  return snapshot.files.flatMap((file) => {
    if (file.draft?.content == null) return [];
    return [{ path: file.path, content: file.draft.content }];
  });
}
