import type { ComparisonSideSession, Replayable, Session } from "./api";

export function formatRecordingDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export function replayableFromSession(session: Session): Replayable {
  return {
    session_id: session.id,
    recording_seconds: session.recording_seconds,
  };
}

export function replayableFromSide(entry: ComparisonSideSession): Replayable {
  return {
    session_id: entry.session_id,
    recording_seconds: entry.recording_seconds,
    game_name: entry.game_name,
  };
}

export function replayLabel(
  replay: Replayable,
  options?: { index?: number; total?: number; prefix?: string },
): string {
  const duration = formatRecordingDuration(replay.recording_seconds);
  const index = options?.index;
  const total = options?.total ?? 1;
  let title =
    options?.prefix ??
    (total === 1 ? "Replay" : `Replay ${(index ?? 0) + 1}`);
  const name = replay.game_name?.trim();
  if (name) title = `${title} · ${name}`;
  return `${title} (${duration})`;
}
