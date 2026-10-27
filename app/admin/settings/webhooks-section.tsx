"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminGate } from "@/components/auth-gate";
import { API_ROUTE } from "@/lib/api-route";
import { apiGet } from "@/lib/fetch";
import {
  REPORTS_BEFORE_REMOVAL,
  failureDetail,
  webhookSchema,
  webhooksSchema,
  type Webhook,
} from "@/lib/api";
import { auth } from "../../firebase";

type Draft = { event: Webhook["event"]; threshold: number | null };

const EVENTS: { event: Webhook["event"]; label: string }[] = [
  { event: "first_report", label: "First report" },
  { event: "threshold", label: "N reports reached" },
  { event: "removed", label: "Game automatically removed" },
];

/** Webhook URLs carry a secret token, so only the host is shown. */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "invalid url";
  }
}

function sameDraft(a: Draft, b: Draft): boolean {
  return a.event === b.event && a.threshold === b.threshold;
}

function Triggers({
  value,
  onChange,
  disabled,
}: {
  value: Draft;
  onChange: (next: Draft) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {EVENTS.map(({ event, label }) => {
        const on = value.event === event;
        return (
          <button
            key={event}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() =>
              onChange({
                event,
                threshold:
                  event === "threshold" ? (value.threshold ?? 3) : null,
              })
            }
            className={`rounded border px-3 py-1.5 text-sm ${
              on
                ? "border-green-500 bg-green-950 text-green-200"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500"
            }`}
          >
            {label}
          </button>
        );
      })}
      {value.event === "threshold" ? (
        <Input
          type="number"
          aria-label="Report count"
          min={1}
          max={REPORTS_BEFORE_REMOVAL}
          disabled={disabled}
          value={value.threshold ?? ""}
          onChange={(event) => {
            const next = Math.round(Number(event.target.value));
            if (Number.isFinite(next) && next >= 1) {
              onChange({
                ...value,
                threshold: Math.min(next, REPORTS_BEFORE_REMOVAL),
              });
            }
          }}
          className="h-8 w-16 bg-background"
        />
      ) : null}
    </div>
  );
}

function WebhookRow({
  hook,
  onSave,
  onTest,
  onDelete,
}: {
  hook: Webhook;
  onSave: (draft: Draft) => Promise<void>;
  onTest: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);
  const saved: Draft = { event: hook.event, threshold: hook.threshold };
  const [draft, setDraft] = useState<Draft>(saved);
  const changed = !sameDraft(draft, saved);

  async function run(work: () => Promise<void>, done?: string) {
    setBusy(true);
    setNote(null);
    try {
      await work();
      if (done) setNote({ text: done, bad: false });
    } catch (err) {
      setNote({
        text: err instanceof Error ? err.message : "Something went wrong",
        bad: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-col gap-3 border-b border-zinc-900 py-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm text-zinc-100">{hostOf(hook.url)}</span>
        <div className="ml-auto flex gap-2">
          <Button disabled={busy} onClick={() => void run(onTest, "Test sent")}>
            Send test
          </Button>
          <Button disabled={busy} onClick={() => void run(onDelete)}>
            Delete
          </Button>
        </div>
      </div>
      <Triggers value={draft} onChange={setDraft} disabled={busy} />
      {changed ? (
        <div className="flex items-center gap-2">
          <Button disabled={busy} onClick={() => void run(() => onSave(draft))}>
            Save
          </Button>
        </div>
      ) : null}
      {note ? (
        <p className={`text-xs ${note.bad ? "text-red-300" : "text-zinc-500"}`}>
          {note.text}
        </p>
      ) : null}
    </li>
  );
}

function AddWebhook({
  onAdd,
}: {
  onAdd: (url: string, draft: Draft) => Promise<void>;
}) {
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<Draft>({ event: "removed", threshold: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await onAdd(url.trim(), draft);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the webhook");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 py-5">
      <Input
        type="url"
        aria-label="Webhook URL"
        placeholder="https://discord.com/api/webhooks/…"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        className="bg-background"
      />
      <Triggers value={draft} onChange={setDraft} disabled={busy} />
      <div>
        <Button disabled={busy || !url.trim()} onClick={() => void add()}>
          Add webhook
        </Button>
      </div>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

export default function WebhooksSection() {
  const [user, loadingAuth] = useAuthState(auth);
  const queryClient = useQueryClient();
  const key = ["webhooks", user?.uid ?? "signed-out"];
  const query = useQuery({
    queryKey: key,
    enabled: !loadingAuth && !!user,
    queryFn: async () => {
      if (!user) throw new Error("Sign in to manage webhooks");
      const data = await apiGet(
        user,
        "/webhooks",
        webhooksSchema,
        "Could not load webhooks",
      );
      if (data === null) throw new Error("Could not load webhooks");
      return data;
    },
  });

  async function call(
    path: string,
    method: "POST" | "PUT" | "DELETE",
    fallback: string,
    body?: unknown,
  ): Promise<Response> {
    if (!user) throw new Error("Sign in to manage webhooks");
    const response = await fetch(`${API_ROUTE}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${await user.getIdToken()}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await failureDetail(response, fallback));
    return response;
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  async function add(url: string, draft: Draft) {
    const response = await call("/webhooks", "POST", "Could not add the webhook", {
      url,
      ...draft,
    });
    webhookSchema.parse(await response.json());
    await refresh();
  }

  async function save(hook: Webhook, draft: Draft) {
    await call(`/webhooks/${hook.id}`, "PUT", "Could not save the webhook", {
      url: hook.url,
      ...draft,
    });
    await refresh();
  }

  return (
    <section>
      <h2 className="text-xl font-bold text-zinc-100">Webhooks</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Discord-compatible endpoints, each sent one kind of message. A game is
        removed automatically at {REPORTS_BEFORE_REMOVAL} reports.
      </p>
      <AdminGate
        loading={query.isPending && !query.error}
        loadingMessage="Loading webhooks…"
        error={query.error instanceof Error ? query.error.message : null}
      >
        {query.data ? (
          <>
            {query.data.length === 0 ? (
              <p className="pt-5 text-sm text-zinc-500">No webhooks yet.</p>
            ) : (
              <ul>
                {query.data.map((hook) => (
                  <WebhookRow
                    key={`${hook.id}-${hook.event}-${hook.threshold}`}
                    hook={hook}
                    onSave={(draft) => save(hook, draft)}
                    onTest={async () => {
                      await call(
                        `/webhooks/${hook.id}/test`,
                        "POST",
                        "The test message failed",
                      );
                    }}
                    onDelete={async () => {
                      await call(
                        `/webhooks/${hook.id}`,
                        "DELETE",
                        "Could not delete the webhook",
                      );
                      await refresh();
                    }}
                  />
                ))}
              </ul>
            )}
            <AddWebhook onAdd={add} />
          </>
        ) : null}
      </AdminGate>
    </section>
  );
}
