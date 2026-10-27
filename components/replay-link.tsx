import Link from "next/link";
import type { Replayable } from "../lib/api";
import { replayLabel } from "../lib/replay";

export default function ReplayLink({
  replay,
  index,
  total,
  prefix,
  className = "text-sm text-green-300 hover:underline",
}: {
  replay: Replayable;
  index?: number;
  total?: number;
  prefix?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/admin/replay/${replay.session_id}`}
      className={className}
      title={`Session ${replay.session_id}`}
    >
      {replayLabel(replay, { index, total, prefix })}
    </Link>
  );
}
