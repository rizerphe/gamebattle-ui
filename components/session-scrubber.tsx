"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import moment from "moment";
import { Pause, Play } from "lucide-react";
import { Terminal } from "xterm";
import "xterm/css/xterm.css";
import type { RecordingChunk } from "@/lib/api";
import { cn } from "@/lib/utils";

const NATURAL_FONT_PX = 16;

export type ScrubMarker = {
  t: number;
  label: string;
};

/** A recorded chunk with its first `applied` events played. */
export type RecordingFrame = {
  chunk: RecordingChunk;
  applied: number;
};

function formatElapsed(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function formatScrubTimestamp(
  elapsedSeconds: number,
  startedAt?: string | number
) {
  if (startedAt !== undefined) {
    const origin =
      typeof startedAt === "number" ? moment.unix(startedAt) : moment(startedAt);
    if (origin.isValid()) {
      return origin
        .add(Math.round(elapsedSeconds * 1000), "milliseconds")
        .format("MMM D, HH:mm:ss");
    }
  }
  return formatElapsed(elapsedSeconds);
}

function decodeBase64(data: string) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function sizeAt({ chunk, applied }: RecordingFrame) {
  let { columns, rows } = chunk.checkpoint;
  for (const event of chunk.events.slice(0, applied)) {
    if (event.type === "resize" && event.columns && event.rows) {
      columns = event.columns;
      rows = event.rows;
    }
  }
  return { columns, rows };
}

function labelShift(percent: number) {
  if (percent < 12) return "translateX(0)";
  if (percent > 88) return "translateX(-100%)";
  return "translateX(-50%)";
}

export default function SessionScrubber({
  frame,
  duration,
  time,
  onTimeChange,
  startedAt,
  markers = [],
  playing = false,
  onPlayingChange,
  className,
}: {
  /** What to show; while null the last screen stays up. */
  frame: RecordingFrame | null;
  duration: number;
  time: number;
  onTimeChange: (time: number) => void;
  /** Unix seconds, or a moment-parseable start time. The cursor label is this plus `time`. */
  startedAt?: string | number;
  markers?: ScrubMarker[];
  playing?: boolean;
  /** When set, a play/pause button is shown beside the timeline. */
  onPlayingChange?: (playing: boolean) => void;
  className?: string;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const writingRef = useRef(false);
  const pendingRef = useRef<RecordingFrame | null>(null);
  const shownRef = useRef<{ sequence: number; applied: number } | null>(null);
  const fitRef = useRef<() => void>(() => {});

  fitRef.current = () => {
    const term = terminalRef.current;
    const viewport = viewportRef.current;
    const element = term?.element;
    if (!term || !viewport || !element) return;
    // Leave the 1px border room to sit outside the glyphs.
    const availableWidth = viewport.clientWidth - 2;
    const availableHeight = viewport.clientHeight - 2;
    const screen = element.querySelector<HTMLElement>(".xterm-screen") ?? element;
    if (availableWidth < 8 || availableHeight < 8) return;
    const width = screen.offsetWidth;
    const height = screen.offsetHeight;
    if (width === 0 || height === 0) return;

    // The recorded columns and rows stay put. The font scales so the grid
    // fills whichever side of the viewport runs out first.
    // One assignment: stepping through every size makes xterm refresh a
    // renderer that is not ready yet.
    const current = term.options.fontSize ?? NATURAL_FONT_PX;
    const factor = Math.min(availableWidth / width, availableHeight / height);
    let next = Math.max(1, Math.floor(current * factor));
    if (next === current) {
      const grown = (current + 1) / current;
      if (width * grown <= availableWidth && height * grown <= availableHeight) next = current + 1;
    }
    if (next !== current) term.options.fontSize = next;
    if (
      (screen.offsetWidth > availableWidth || screen.offsetHeight > availableHeight) &&
      next > 1
    ) {
      term.options.fontSize = next - 1;
    }
  };

  useLayoutEffect(() => {
    const host = hostRef.current;
    const viewport = viewportRef.current;
    if (!host || !viewport) return;

    const term = new Terminal({
      cols: 80,
      rows: 24,
      fontFamily: '"Roboto Mono", monospace',
      fontSize: NATURAL_FONT_PX,
      allowTransparency: true,
      disableStdin: true,
      cursorBlink: false,
      cursorStyle: "bar",
      scrollback: 1000,
      theme: {
        background: "rgba(0, 0, 0, 0)",
        foreground: "#d1fae5",
        cursor: "#86efac",
        selectionBackground: "rgba(74, 222, 128, 0.3)",
      },
    });
    terminalRef.current = term;
    term.open(host);
    term.attachCustomKeyEventHandler(() => false);

    const observer = new ResizeObserver(() => fitRef.current());
    observer.observe(viewport);
    const fonts = document.fonts?.ready.then(() => fitRef.current());
    fitRef.current();

    return () => {
      observer.disconnect();
      void fonts;
      writingRef.current = false;
      pendingRef.current = null;
      shownRef.current = null;
      terminalRef.current = null;
      term.dispose();
    };
  }, []);

  // One batch at a time, so a fast drag never queues several full replays.
  useLayoutEffect(() => {
    if (!frame) return;
    pendingRef.current = frame;
    if (writingRef.current) return;
    writingRef.current = true;

    const pump = () => {
      const term = terminalRef.current;
      const next = pendingRef.current;
      if (!term || !next) {
        writingRef.current = false;
        return;
      }
      pendingRef.current = null;
      const { checkpoint, events } = next.chunk;
      const shown = shownRef.current;
      let from = 0;
      if (shown?.sequence === checkpoint.sequence && shown.applied <= next.applied) {
        from = shown.applied;
      } else {
        // Every earlier write has been parsed, so reset and resize apply in order.
        term.reset();
        term.resize(checkpoint.columns, checkpoint.rows);
        term.write(decodeBase64(checkpoint.state));
      }
      for (const event of events.slice(from, next.applied)) {
        if (event.type === "stdout" && event.data) {
          term.write(decodeBase64(event.data));
        } else if (event.type === "resize" && event.columns && event.rows) {
          const { columns, rows } = event;
          term.write("", () => term.resize(columns, rows));
        }
      }
      shownRef.current = { sequence: checkpoint.sequence, applied: next.applied };
      term.write("", () => {
        if (terminalRef.current !== term) return;
        fitRef.current();
        pump();
      });
    };
    pump();
  }, [frame]);

  const size = frame ? sizeAt(frame) : null;

  return (
    <div className={cn("flex min-h-0 min-w-0 w-full flex-1 flex-col px-3 pb-3", className)}>
      <div className="relative min-h-0 min-w-0 flex-1 pt-2">
        <div
          ref={viewportRef}
          className="absolute inset-x-0 bottom-0 top-2 flex items-center justify-center"
        >
          <div className="relative border border-zinc-700">
            <span className="absolute right-2 top-0 -translate-y-1/2 bg-black px-1.5 font-mono text-[11px] leading-none text-zinc-400">
              {size ? `${size.columns}×${size.rows}` : "…"}
            </span>
            <div ref={hostRef} className="leading-none" />
          </div>
        </div>
      </div>
      <div className="mt-2 flex shrink-0 gap-1.5">
        {onPlayingChange ? (
          <div className="flex w-7 shrink-0 flex-col">
            <div className="h-4" />
            <div className="flex h-4 items-center justify-center">
              <PlayPauseButton
                playing={playing}
                atEnd={duration - time < 0.25}
                disabled={duration <= 0}
                onPlayingChange={onPlayingChange}
              />
            </div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <Timeline
            duration={duration}
            time={time}
            startedAt={startedAt}
            markers={markers}
            onTimeChange={onTimeChange}
          />
        </div>
      </div>
      <style>{`
        .xterm-viewport::-webkit-scrollbar {
          background-color: transparent;
          width: 8px;
        }
        .xterm-viewport::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

function PlayPauseButton({
  playing,
  atEnd,
  disabled,
  onPlayingChange,
}: {
  playing: boolean;
  atEnd: boolean;
  disabled: boolean;
  onPlayingChange: (playing: boolean) => void;
}) {
  const label = playing ? "Pause" : atEnd ? "Play from start" : "Play";
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={playing}
      title={label}
      disabled={disabled}
      onClick={() => onPlayingChange(!playing)}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-700 text-green-300 hover:border-green-700 hover:text-green-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:pointer-events-none disabled:opacity-40"
    >
      {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-px h-3.5 w-3.5" />}
    </button>
  );
}

function Timeline({
  duration,
  time,
  startedAt,
  markers,
  onTimeChange,
}: {
  duration: number;
  time: number;
  startedAt?: string | number;
  markers: ScrubMarker[];
  onTimeChange: (time: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [hover, setHover] = useState<number | null>(null);
  const span = Math.max(duration, 0);
  const shown = hover ?? time;
  const shownPercent = span === 0 ? 0 : (Math.min(span, Math.max(0, shown)) / span) * 100;
  const playedPercent = span === 0 ? 0 : (Math.min(span, Math.max(0, time)) / span) * 100;
  const timestamp = formatScrubTimestamp(shown, startedAt);

  function timeFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || span === 0) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * span;
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    dragging.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Capture is only available for a real pointer. Seeking still works.
    }
    const next = timeFromClientX(event.clientX);
    setHover(next);
    onTimeChange(next);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const next = timeFromClientX(event.clientX);
    setHover(next);
    if (dragging.current) onTimeChange(next);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    const rect = trackRef.current?.getBoundingClientRect();
    const inside =
      rect !== undefined &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    if (!inside) setHover(null);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 5 : 1;
    let next: number | undefined;
    if (event.key === "ArrowLeft") next = time - step;
    else if (event.key === "ArrowRight") next = time + step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = span;
    else return;
    event.preventDefault();
    event.stopPropagation();
    onTimeChange(Math.min(span, Math.max(0, next)));
  }

  return (
    <div>
      <div className="relative mx-1.5 h-4">
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-0 whitespace-nowrap font-mono text-xs leading-4 text-zinc-400"
          style={{ left: `${shownPercent}%`, transform: labelShift(shownPercent) }}
        >
          {timestamp}
        </span>
      </div>
      <div
        ref={trackRef}
        className="relative mx-1.5 h-4 cursor-pointer touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={(event) => {
          if (!dragging.current) setHover(null);
          else onPointerMove(event);
        }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Session time"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={span}
          aria-valuenow={Math.min(span, Math.max(0, time))}
          aria-valuetext={formatScrubTimestamp(time, startedAt)}
          onKeyDown={onKeyDown}
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-zinc-800 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-600"
        >
          <div
            className="h-full rounded-full bg-green-800"
            style={{ width: `${playedPercent}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black bg-green-300"
          style={{ left: `${playedPercent}%` }}
        />
        {hover !== null && Math.abs(hover - time) > span * 0.004 && (
          <div
            className="pointer-events-none absolute top-1/2 h-3.5 w-px -translate-y-1/2 bg-green-200"
            style={{ left: `${shownPercent}%` }}
          />
        )}
        {markers.map((marker, index) => {
          const left = span === 0 ? 0 : (marker.t / span) * 100;
          return (
            <button
              key={`${index}-${marker.t}-${marker.label}`}
              type="button"
              title={marker.label}
              aria-label={marker.label}
              tabIndex={-1}
              onPointerDown={(event) => {
                event.stopPropagation();
                setHover(marker.t);
                onTimeChange(marker.t);
              }}
              className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
            >
              <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
