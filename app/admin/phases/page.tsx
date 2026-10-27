"use client";

import { useState } from "react";
import moment from "moment";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "../../firebase";
import { API_ROUTE } from "@/lib/api-route";
import {
  failureDetail,
  phaseStateSchema,
  type PhaseName,
  type PhaseState,
} from "../../../lib/api";
import { AdminGate } from "@/components/auth-gate";
import { usePhase } from "@/components/permissions";
import { PHASES } from "@/lib/phase";

const INPUT_FORMAT = "YYYY-MM-DDTHH:mm";

function zone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function PhaseRow({
  index,
  name,
  label,
  summary,
  at,
  current,
  onSave,
}: {
  index: number;
  name: PhaseName;
  label: string;
  summary: string;
  at: number | null;
  current: boolean;
  onSave: (at: number | null) => Promise<void>;
}) {
  const stored = at === null ? "" : moment.unix(at).format(INPUT_FORMAT);
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const value = draft ?? stored;
  const parsed = value ? moment(value, INPUT_FORMAT) : null;

  async function save(next: number | null) {
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex flex-col gap-2 border-b border-zinc-900 py-5">
      <div className="flex items-baseline gap-3">
        <span className="text-sm text-zinc-600">{index + 1}</span>
        <span className="text-lg text-zinc-100">{label}</span>
        {current ? (
          <span className="rounded bg-green-950 px-2 py-0.5 text-xs text-green-300">
            current
          </span>
        ) : null}
      </div>
      <p className="text-sm text-zinc-500">{summary}</p>
      {name === "development" ? (
        <p className="text-sm text-zinc-500">The starting phase.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="datetime-local"
            aria-label={`${label} starts at`}
            value={value}
            onChange={(event) => setDraft(event.target.value)}
            className="w-64 bg-background"
          />
          <Button
            disabled={saving || draft === null || !parsed?.isValid()}
            onClick={() => parsed && void save(parsed.unix())}
          >
            Set
          </Button>
          <Button
            disabled={saving || (at === null && draft === null)}
            onClick={() => {
              if (at === null) setDraft(null);
              else void save(null);
            }}
          >
            Clear
          </Button>
          <span className="text-xs text-zinc-500">
            {at === null ? "Not scheduled" : zone()}
          </span>
        </div>
      )}
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </li>
  );
}

export default function PhasesPage() {
  const [user] = useAuthState(auth);
  const queryClient = useQueryClient();
  const query = usePhase();
  const state = query.data ?? null;

  async function save(phase: PhaseName, at: number | null) {
    if (!user) throw new Error("Sign in to schedule phases");
    const response = await fetch(`${API_ROUTE}/phase/schedule/${phase}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: JSON.stringify({ at }),
    });
    if (!response.ok) {
      throw new Error(await failureDetail(response, "Could not save the phase"));
    }
    queryClient.setQueryData<PhaseState>(
      ["phase", user.uid],
      phaseStateSchema.parse(await response.json()),
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      <AdminGate
        loading={query.isPending}
        loadingMessage="Loading phases…"
        error={query.error instanceof Error ? query.error.message : null}
      >
        {state ? (
          <ol>
            {PHASES.map((phase, index) => {
              const at =
                phase.name === "development" ? null : state.schedule[phase.name];
              return (
                <PhaseRow
                  key={`${phase.name}-${at}`}
                  index={index}
                  name={phase.name}
                  label={phase.label}
                  summary={phase.summary}
                  at={at}
                  current={state.phase === phase.name}
                  onSave={(next) => save(phase.name, next)}
                />
              );
            })}
          </ol>
        ) : null}
      </AdminGate>
    </div>
  );
}
