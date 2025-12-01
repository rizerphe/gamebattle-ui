"use client";
import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useState, useEffect, useMemo, useDeferredValue, useRef } from "react";
import { z } from "zod";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Link from "next/link";

const EloChangeSchema = z.object({
  team_id: z.string(),
  before: z.number(),
  after: z.number(),
});

const PreferenceHistoryEntrySchema = z.object({
  games: z.tuple([z.string(), z.string()]),
  game_names: z.tuple([z.string(), z.string()]),
  first_score: z.number(),
  author: z.string(),
  author_team: z.string().nullable().optional(),
  timestamp: z.number().nullable().optional(),
  elo_changes: z.array(EloChangeSchema),
  counted: z.boolean(),
});

const ReportEventSchema = z.object({
  type: z.literal("report"),
  game_team_id: z.string(),
  game_name: z.string(),
  reporter: z.string(),
  short_reason: z.enum(["unclear", "buggy", "other"]),
  timestamp: z.number().nullable().optional(),
  report_url: z.string(),
});

const PreferenceEventSchema = PreferenceHistoryEntrySchema.extend({
  type: z.literal("preference"),
});

const EventSchema = z.discriminatedUnion("type", [ReportEventSchema, PreferenceEventSchema]);
const EventsSchema = z.array(EventSchema);

type ReportEvent = z.infer<typeof ReportEventSchema>;
type PreferenceEvent = z.infer<typeof PreferenceEventSchema>;
type Event = z.infer<typeof EventSchema>;

type Granularity = "minute" | "hour" | "day" | "week";

const GRANULARITY_SECONDS: Record<Granularity, number> = {
  minute: 60,
  hour: 3600,
  day: 86400,
  week: 604800,
};

interface TimeBucket {
  time: number;
  all: number;
  selected: number;
}

// Pre-computed data structure for efficient filtering
interface PrecomputedData {
  // Store raw timestamps per author for flexible rebucketing
  authorTimestamps: Map<string, number[]>;
  allTimestamps: number[];
  topAuthors: { author: string; count: number }[];
}

function getEventAuthor(event: Event): string {
  return event.type === "report" ? event.reporter : event.author;
}

function precomputeData(events: Event[]): PrecomputedData {
  const authorTimestamps = new Map<string, number[]>();
  const allTimestamps: number[] = [];
  const authorTotals = new Map<string, number>();

  for (const event of events) {
    const author = getEventAuthor(event);
    if (event.timestamp !== undefined) {
      allTimestamps.push(event.timestamp);
      
      if (!authorTimestamps.has(author)) {
        authorTimestamps.set(author, []);
      }
      authorTimestamps.get(author)!.push(event.timestamp);
    }
    
    authorTotals.set(author, (authorTotals.get(author) || 0) + 1);
  }

  const topAuthors = Array.from(authorTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([author, count]) => ({ author, count }));

  return { authorTimestamps, allTimestamps, topAuthors };
}

function bucketTimestamps(
  timestamps: number[],
  granularity: Granularity
): Map<number, number> {
  const bucketSize = GRANULARITY_SECONDS[granularity];
  const buckets = new Map<number, number>();
  
  for (const ts of timestamps) {
    const bucket = Math.floor(ts / bucketSize) * bucketSize;
    buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
  }
  
  return buckets;
}

function computeChartData(
  precomputed: PrecomputedData,
  selectedAuthors: Set<string>,
  granularity: Granularity
): TimeBucket[] {
  const { authorTimestamps, allTimestamps } = precomputed;
  const selectedArray = Array.from(selectedAuthors);

  // Bucket all timestamps
  const allBuckets = bucketTimestamps(allTimestamps, granularity);
  
  // Bucket selected authors' timestamps
  const selectedBuckets = new Map<number, number>();
  for (const author of selectedArray) {
    const timestamps = authorTimestamps.get(author);
    if (timestamps) {
      const authorBuckets = bucketTimestamps(timestamps, granularity);
      for (const [bucket, count] of Array.from(authorBuckets.entries())) {
        selectedBuckets.set(bucket, (selectedBuckets.get(bucket) || 0) + count);
      }
    }
  }

  // Build sorted result
  const sortedBuckets = Array.from(allBuckets.keys()).sort((a, b) => a - b);
  
  return sortedBuckets.map((time) => ({
    time,
    all: allBuckets.get(time) || 0,
    selected: selectedBuckets.get(time) || 0,
  }));
}

// Hypothetical leaderboard API response schema
const HypotheticalLeaderboardEntrySchema = z.object({
  name: z.string(),
  team_id: z.string(),
  current_score: z.number().nullable(),
  hypothetical_score: z.number().nullable(),
  delta: z.number().nullable(),
  owned_by_excluded: z.boolean(),
});

const HypotheticalLeaderboardSchema = z.array(HypotheticalLeaderboardEntrySchema);

type HypotheticalLeaderboardEntry = z.infer<typeof HypotheticalLeaderboardEntrySchema>;

function formatTime(timestamp: number, granularity: Granularity): string {
  const date = new Date(timestamp * 1000);
  switch (granularity) {
    case "minute":
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    case "hour":
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
      });
    case "day":
      return date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
      });
    case "week":
      return `Week of ${date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
      })}`;
  }
}

function formatTimestamp(timestamp: number | undefined): string {
  if (timestamp === undefined) return "Unknown time";
  return new Date(timestamp * 1000).toLocaleString();
}

function EloChangeDisplay({ change }: { change: z.infer<typeof EloChangeSchema> }) {
  const diff = change.after - change.before;
  const diffColor = diff >= 0 ? "text-green-400" : "text-red-400";
  const diffSign = diff >= 0 ? "+" : "";

  return (
    <div className="flex flex-row items-center gap-2 text-sm">
      <span className="text-gray-400">{change.team_id}:</span>
      <span>{change.before.toFixed(0)}</span>
      <span className="text-gray-500">→</span>
      <span>{change.after.toFixed(0)}</span>
      <span className={diffColor}>
        ({diffSign}{diff.toFixed(1)})
      </span>
    </div>
  );
}

function GameDisplay({ name, id, muted }: { name: string; id: string; muted?: boolean }) {
  return (
    <span className="flex flex-col">
      <span className={muted ? "text-gray-500" : "text-green-300"}>{name}</span>
      <span className={`text-xs font-mono ${muted ? "text-gray-600" : "text-gray-500"}`}>{id}</span>
    </span>
  );
}

function PreferenceEntry({ entry }: { entry: PreferenceEvent }) {
  const muted = !entry.counted;
  return (
    <div className={`flex flex-col gap-2 p-4 border-b border-zinc-700 ${muted ? "opacity-40" : ""}`}>
      <div className="flex flex-row flex-wrap items-center gap-4">
        <span className="text-xs px-2 py-0.5 rounded bg-blue-900 text-blue-300">Preference</span>
        <div className="flex flex-row items-center gap-2">
          <GameDisplay name={entry.game_names[0]} id={entry.games[0]} muted={muted} />
          <span className="text-gray-500">vs</span>
          <GameDisplay name={entry.game_names[1]} id={entry.games[1]} muted={muted} />
        </div>
        <span className="text-gray-500">|</span>
        <span>
          Score: <span className={muted ? "text-gray-500" : "text-yellow-300"}>{entry.first_score.toFixed(2)}</span>
        </span>
        <span className="text-gray-500">|</span>
        <span className={muted ? "text-gray-600" : "text-gray-400"}>{entry.author}</span>
        {muted && <span className="text-gray-600 text-xs">(not counted)</span>}
        <span className="flex-grow" />
        <span className={`text-sm ${muted ? "text-gray-600" : "text-gray-500"}`}>{formatTimestamp(entry.timestamp)}</span>
      </div>
      {entry.elo_changes.length > 0 && (
        <div className="flex flex-row flex-wrap gap-4 ml-4">
          {entry.elo_changes.map((change, i) => (
            <EloChangeDisplay key={i} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReportEntry({ entry }: { entry: ReportEvent }) {
  const reasonColors: Record<string, string> = {
    unclear: "text-yellow-400",
    buggy: "text-red-400",
    other: "text-orange-400",
  };

  return (
    <div className="flex flex-col gap-2 p-4 border-b border-zinc-700">
      <div className="flex flex-row flex-wrap items-center gap-4">
        <span className="text-xs px-2 py-0.5 rounded bg-red-900 text-red-300">Report</span>
        <GameDisplay name={entry.game_name} id={entry.game_team_id} />
        <span className="text-gray-500">|</span>
        <span>
          Reason: <span className={reasonColors[entry.short_reason] || "text-gray-300"}>{entry.short_reason}</span>
        </span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">{entry.reporter}</span>
        <span className="flex-grow" />
        <Link
          href={entry.report_url}
          className="text-sm text-blue-400 hover:text-blue-300 underline"
        >
          View Report
        </Link>
        <span className="text-sm text-gray-500">{formatTimestamp(entry.timestamp)}</span>
      </div>
    </div>
  );
}

function EventEntry({ event }: { event: Event }) {
  if (event.type === "report") {
    return <ReportEntry entry={event} />;
  }
  return <PreferenceEntry entry={event} />;
}

function GranularitySelector({
  value,
  onChange,
}: {
  value: Granularity;
  onChange: (g: Granularity) => void;
}) {
  const options: { value: Granularity; label: string }[] = [
    { value: "minute", label: "Minute" },
    { value: "hour", label: "Hour" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
  ];

  return (
    <div className="flex flex-row gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            value === opt.value
              ? "bg-green-600 text-white"
              : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ActivityChart({
  data,
  selectedLabel,
  granularity,
}: {
  data: TimeBucket[];
  selectedLabel: string | null;
  granularity: Granularity;
}) {
  if (data.length === 0) return null;

  const formatLabel = (ts: number) => formatTime(ts, granularity);

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="time"
            tickFormatter={formatLabel}
            stroke="#6b7280"
            fontSize={12}
          />
          <YAxis stroke="#6b7280" fontSize={12} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "8px",
            }}
            labelFormatter={formatLabel}
            formatter={(value: number, name: string) => [
              value,
              name === "selected" ? selectedLabel || "Selected" : "All",
            ]}
          />
          <Area
            type="monotone"
            dataKey="all"
            stroke="#4b5563"
            fill="#374151"
            name="all"
          />
          {selectedLabel && (
            <Area
              type="monotone"
              dataKey="selected"
              stroke="#22c55e"
              fill="#16a34a"
              name="selected"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SimulatedLeaderboard({
  leaderboard,
  excludedCount,
  isLoading,
}: {
  leaderboard: HypotheticalLeaderboardEntry[];
  excludedCount: number;
  isLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (excludedCount === 0) {
    return null;
  }

  return (
    <div className="border-b border-zinc-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-2 text-left hover:bg-zinc-800 transition-colors"
      >
        <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>
          ▶
        </span>
        <span className="text-green-300 font-medium">
          Simulated Leaderboard
        </span>
        <span className="text-gray-500 text-sm">
          (excluding {excludedCount} author{excludedCount !== 1 ? "s" : ""})
        </span>
        {isLoading && <span className="text-yellow-400 text-xs ml-2">Loading...</span>}
      </button>
      {expanded && (
        <div className={`transition-opacity ${isLoading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-[auto_1fr_auto_auto] gap-x-4 px-4 pb-2 text-xs text-gray-500 border-b border-zinc-800">
            <span>#</span>
            <span>Game</span>
            <span className="text-right">Hypothetical ELO</span>
            <span className="text-right">Change</span>
          </div>
          <div className="max-h-80 overflow-auto scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800 hover:scrollbar-thumb-zinc-500">
            {leaderboard.map((entry, index) => {
              const isAffected = entry.delta !== null && entry.delta !== 0;
              return (
                <div
                  key={entry.team_id}
                  className={`grid grid-cols-[auto_1fr_auto_auto] gap-x-4 px-4 py-2 text-sm border-b border-zinc-800 ${
                    entry.owned_by_excluded
                      ? "bg-purple-900/30 hover:bg-purple-900/40 border-l-2 border-l-purple-500"
                      : isAffected
                      ? "bg-yellow-900/20 hover:bg-yellow-900/30"
                      : "hover:bg-zinc-800/50"
                  }`}
                >
                  <span className="text-gray-500 w-8">{index + 1}</span>
                  <span className="flex flex-col min-w-0">
                    <span className={`truncate ${entry.owned_by_excluded ? "text-purple-300" : "text-green-300"}`}>
                      {entry.name}
                      {entry.owned_by_excluded && <span className="ml-2 text-purple-400 text-xs">(excluded author&apos;s game)</span>}
                    </span>
                    <span className="text-gray-500 text-xs font-mono truncate">
                      {entry.team_id}
                    </span>
                  </span>
                  <span className="text-right tabular-nums self-center">
                    {entry.hypothetical_score !== null ? (
                      entry.hypothetical_score.toFixed(0)
                    ) : (
                      <span className="text-gray-500 italic">unrated</span>
                    )}
                  </span>
                  <span className="text-right w-20 self-center">
                    {entry.delta !== null ? (
                      <span
                        className={
                          entry.delta > 0
                            ? "text-green-400"
                            : entry.delta < 0
                            ? "text-red-400"
                            : "text-gray-500"
                        }
                      >
                        {entry.delta > 0 ? "+" : ""}
                        {entry.delta.toFixed(0)}
                      </span>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterControls({
  filterInput,
  setFilterInput,
  topAuthors,
  selectedAuthors,
  onToggleAuthor,
  onSelectAuthor,
}: {
  filterInput: string;
  setFilterInput: (value: string) => void;
  topAuthors: { author: string; count: number }[];
  selectedAuthors: Set<string>;
  onToggleAuthor: (author: string) => void;
  onSelectAuthor: (author: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayAuthors = expanded ? topAuthors : topAuthors.slice(0, 10);

  // Get the current word being typed (after last comma)
  const currentWord = filterInput.split(",").pop()?.trim().toLowerCase() || "";
  
  // Filter autocomplete suggestions
  const suggestions = currentWord.length > 0
    ? topAuthors
        .filter(({ author }) => 
          author.toLowerCase().includes(currentWord) && 
          !selectedAuthors.has(author)
        )
        .slice(0, 8)
    : [];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete || suggestions.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAutocompleteIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAutocompleteIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions[autocompleteIndex]) {
        e.preventDefault();
        onSelectAuthor(suggestions[autocompleteIndex].author);
        setShowAutocomplete(false);
      }
    } else if (e.key === "Escape") {
      setShowAutocomplete(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 border-b border-zinc-700">
      <div className="flex flex-row items-center gap-2 relative">
        <label className="text-gray-400 text-sm">Filter authors:</label>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={filterInput}
            onChange={(e) => {
              setFilterInput(e.target.value);
              setShowAutocomplete(true);
              setAutocompleteIndex(0);
            }}
            onFocus={() => setShowAutocomplete(true)}
            onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder="author1, author2, ..."
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          {showAutocomplete && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-600 rounded shadow-lg z-10 max-h-48 overflow-auto">
              {suggestions.map(({ author, count }, index) => (
                <button
                  key={author}
                  onMouseDown={() => onSelectAuthor(author)}
                  className={`w-full text-left px-3 py-2 text-sm flex justify-between ${
                    index === autocompleteIndex
                      ? "bg-zinc-700 text-white"
                      : "text-gray-300 hover:bg-zinc-700"
                  }`}
                >
                  <span>{author}</span>
                  <span className="text-gray-500">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-row flex-wrap gap-2 items-center">
        <span className="text-gray-500 text-xs">Top authors:</span>
        {displayAuthors.map(({ author, count }) => (
          <button
            key={author}
            onClick={() => onToggleAuthor(author)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              selectedAuthors.has(author)
                ? "bg-green-600 text-white"
                : "bg-zinc-700 text-gray-300 hover:bg-zinc-600"
            }`}
          >
            {author} ({count})
          </button>
        ))}
        {topAuthors.length > 10 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-gray-400 hover:text-gray-200 underline"
          >
            {expanded ? "Show less" : `+${topAuthors.length - 10} more`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function EventHistoryTable({ api_route }: { api_route: string }) {
  const [user] = useAuthState(auth);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterInput, setFilterInput] = useState("");
  const [granularity, setGranularity] = useState<Granularity>("hour");

  const selectedAuthors = useMemo(() => {
    const authors = filterInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return new Set(authors);
  }, [filterInput]);

  // Precompute data once when events load
  const precomputed = useMemo(() => 
    events.length > 0 ? precomputeData(events) : null,
    [events]
  );

  // Defer filter changes to avoid blocking UI
  const deferredSelectedAuthors = useDeferredValue(selectedAuthors);
  const deferredGranularity = useDeferredValue(granularity);
  const isStale = deferredSelectedAuthors !== selectedAuthors || deferredGranularity !== granularity;

  // Compute chart data from precomputed structure
  const chartData = useMemo(() => {
    if (!precomputed) return [];
    return computeChartData(precomputed, deferredSelectedAuthors, deferredGranularity);
  }, [precomputed, deferredSelectedAuthors, deferredGranularity]);

  const topAuthors = precomputed?.topAuthors || [];

  // Fetch hypothetical leaderboard from API
  const [leaderboard, setLeaderboard] = useState<HypotheticalLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  useEffect(() => {
    const fetchHypotheticalLeaderboard = async () => {
      if (!user || deferredSelectedAuthors.size === 0) {
        setLeaderboard([]);
        return;
      }

      setLeaderboardLoading(true);
      try {
        const excludedEmails = Array.from(deferredSelectedAuthors);
        const res = await fetch(`${api_route}/admin/leaderboard/hypothetical`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
          body: JSON.stringify(excludedEmails),
        });

        if (res.ok) {
          const data = await res.json();
          setLeaderboard(HypotheticalLeaderboardSchema.parse(data));
        }
      } catch (e) {
        console.error("Failed to fetch hypothetical leaderboard:", e);
      }
      setLeaderboardLoading(false);
    };

    fetchHypotheticalLeaderboard();
  }, [user, deferredSelectedAuthors, api_route]);

  // Build label for selected authors
  const selectedLabel = useMemo(() => {
    const authors = Array.from(deferredSelectedAuthors);
    if (authors.length === 0) return null;
    if (authors.length <= 3) return authors.join(", ");
    return `${authors.slice(0, 2).join(", ")} +${authors.length - 2} more`;
  }, [deferredSelectedAuthors]);

  const handleToggleAuthor = (author: string) => {
    const currentAuthors = filterInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (currentAuthors.includes(author)) {
      setFilterInput(currentAuthors.filter((a) => a !== author).join(", "));
    } else {
      setFilterInput([...currentAuthors, author].join(", "));
    }
  };

  const handleSelectAuthor = (author: string) => {
    const currentAuthors = filterInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Remove the partial text being typed and add the full author name
    const withoutPartial = currentAuthors.slice(0, -1);
    if (!withoutPartial.includes(author)) {
      setFilterInput([...withoutPartial, author].join(", ") + ", ");
    }
  };

  useEffect(() => {
    const getEvents = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${api_route}/admin/history`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await user.getIdToken()}`,
          },
        });
        if (!res.ok) {
          if (res.status === 403) {
            setError("Access denied. Admin privileges required.");
          } else {
            setError(`Failed to fetch history: ${res.status}`);
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        setEvents(EventsSchema.parse(data));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch history");
      }
      setLoading(false);
    };
    getEvents();
  }, [user?.uid, api_route]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-gray-400">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-red-400">{error}</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-gray-400">Please log in to view event history.</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="text-gray-400">No event history found.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-auto">
      <FilterControls
        filterInput={filterInput}
        setFilterInput={setFilterInput}
        topAuthors={topAuthors}
        selectedAuthors={selectedAuthors}
        onToggleAuthor={handleToggleAuthor}
        onSelectAuthor={handleSelectAuthor}
      />
      <div className={`p-4 border-b border-zinc-700 transition-opacity ${isStale ? "opacity-60" : ""}`}>
        <div className="flex justify-end mb-2">
          <GranularitySelector value={granularity} onChange={setGranularity} />
        </div>
        <ActivityChart data={chartData} selectedLabel={selectedLabel} granularity={deferredGranularity} />
      </div>
      <SimulatedLeaderboard
        leaderboard={leaderboard}
        excludedCount={deferredSelectedAuthors.size}
        isLoading={leaderboardLoading}
      />
      {events.map((event, index) => (
        <EventEntry key={index} event={event} />
      ))}
    </div>
  );
}

