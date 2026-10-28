/**
 * File path rules, mirroring `orchestrator/files/models.py` (`valid_path`,
 * `can_launch`). The server is the authority; these exist so the editor can
 * explain a refusal instead of sending a request that is bound to fail.
 *
 * Two separate rules apply:
 *
 * 1. Storable path (every file, every upload, every rename): relative,
 *    `/`-separated, printable ASCII, no `\`, no empty / `.` / `..` segment,
 *    and no segment that starts or ends with a space. Spaces inside a name
 *    (`game (5).py`) are fine, and any extension (`words.txt`) is fine.
 * 2. Launchable (only for choosing the entrypoint): a `.py` file whose path
 *    contains no space. The game starts from `main.py`, otherwise from the
 *    only launchable `.py` file. A `.py` file with a space in its path is
 *    stored and can be imported by the game, but is never started.
 */

/** Why this path cannot be stored, or null when it can. */
export function pathError(path: string): string | null {
  if (!path) return "A file name cannot be empty.";
  if (!/^[\x20-\x7E]*$/.test(path)) {
    return "File names may only use printable ASCII characters.";
  }
  if (path.startsWith("/")) return "A file path cannot start with “/”.";
  if (path.includes("\\")) return "A file name cannot contain “\\”.";
  for (const part of path.split("/")) {
    if (part === "") return "A file or folder name cannot be empty.";
    if (part === "." || part === "..") {
      return "“.” and “..” are not valid file or folder names.";
    }
    if (part !== part.replace(/^ +| +$/g, "")) {
      return "A name cannot start or end with a space.";
    }
  }
  return null;
}

export function isValidPath(path: string): boolean {
  return pathError(path) === null;
}

/** Whether a stored file can be a game's entrypoint. */
export function canLaunch(path: string): boolean {
  return path.endsWith(".py") && !path.includes(" ");
}

/** A Python file that is stored but can never be started (space in its path). */
export function isUnlaunchablePython(path: string): boolean {
  return path.endsWith(".py") && path.includes(" ");
}
