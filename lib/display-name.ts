type ProfileLike = {
  username?: string | null;
  email?: string | null;
} | null | undefined;

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Primary line is the best name available; the id is shortened and only a last resort. */
export function studentLabels(
  profile: ProfileLike,
  gameName: string | null | undefined,
  id: string,
): { primary: string; secondary: string | null; mono: boolean } {
  const username = clean(profile?.username);
  const game = clean(gameName);
  const email = clean(profile?.email);
  const named = username ?? game ?? email;
  const primary = named ?? (id.length > 8 ? `${id.slice(0, 8)}…` : id);
  const secondary = [game, email].find((label) => label && label !== primary) ?? null;
  return { primary, secondary, mono: named === null };
}

export function gameTitle(name: string | null | undefined): string {
  return clean(name) ?? "Unnamed game";
}
