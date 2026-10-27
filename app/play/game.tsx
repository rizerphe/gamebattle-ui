"use client";
import { API_ROUTE, API_WS_ROUTE } from "@/lib/api-route";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import useWebSocket from "react-use-websocket";
import { ticketSchema } from "../../lib/api";

// xterm touches `self` on import, so it cannot be prerendered.
const Terminal = dynamic(() => import("./terminal"), { ssr: false });

export function GameText({
  send,
  resize,
  senderRef,
  clearRef,
  inputRef,
}: {
  send?: (input: string) => void;
  resize?: (cols: number, rows: number) => void;
  senderRef: React.MutableRefObject<((data: string) => any) | null>;
  clearRef?: React.MutableRefObject<(() => void) | null>;
  inputRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <Terminal
      senderRef={senderRef}
      clearRef={clearRef}
      send={send}
      resize={resize}
      terminalRef={inputRef}
    />
  );
}

export type GameFinishKind = "running" | "exited" | "terminated";

export default function Game({
  session_id,
  setConnected,
  inputRef,
  gameRunning,
  setGameRunning,
  onFinishKind,
  onGenuineExit,
}: {
  session_id: string;
  setConnected: (connected: boolean) => void;
  inputRef: React.RefObject<HTMLDivElement>;
  gameRunning: boolean;
  setGameRunning: (running: boolean) => void;
  onFinishKind?: (kind: GameFinishKind) => void;
  onGenuineExit?: () => void;
}) {
  const senderRef = useRef<(data: string) => any | null>(null);
  const clearerRef = useRef<() => void | null>(null);

  const [user] = useAuthState(auth);
  const [ticket, setTicket] = useState<string | null>(null);
  const [nextMessage, setNextMessage] = useState<string | null>(null);
  const [newSize, setNewSize] = useState<{ cols: number; rows: number } | null>(
    null
  );
  const { readyState, sendMessage } = useWebSocket(
    `${API_WS_ROUTE.replace(/\/$/, "")}/sessions/${session_id}/attach?ticket=${encodeURIComponent(ticket ?? "")}`,
    {
      shouldReconnect: () => false,
      onOpen: () => {
        clearerRef.current?.();
        setConnected(true);
        if (newSize) {
          sendMessage(
            JSON.stringify({
              type: "resize",
              columns: newSize.cols,
              rows: newSize.rows,
            })
          );
        }
      },
      onClose: () => {
        setConnected(false);
      },
      onMessage: (e: any) => {
        const message = JSON.parse(e.data);
        if (message.type === "stdout") {
          setGameRunning(true);
          onFinishKind?.("running");
          senderRef.current?.(message.data);
        } else if (message.type === "checkpoint") {
          setGameRunning(true);
          onFinishKind?.("running");
          senderRef.current?.(message.state);
        } else if (message.type === "process-exited") {
          setGameRunning(false);
          onFinishKind?.("exited");
          onGenuineExit?.();
        } else if (message.type === "process-terminated") {
          setGameRunning(false);
          onFinishKind?.("terminated");
        }
      },
    },
    ticket !== null
  );

  useEffect(() => {
    if (readyState === 1 && nextMessage) {
      sendMessage(
        JSON.stringify({
          type: "stdin",
          data: nextMessage,
        })
      );
      setNextMessage(null);
    }
  }, [readyState, nextMessage]);

  useEffect(() => {
    if (newSize) {
      sendMessage(
        JSON.stringify({
          type: "resize",
          columns: newSize.cols,
          rows: newSize.rows,
        })
      );
    }
  }, [newSize]);

  useEffect(() => {
    setTicket(null);
    if (!user) return;
    let cancelled = false;
    (async () => {
      const response = await fetch(
        `${API_ROUTE}/sessions/${session_id}/tickets`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
        }
      );
      if (!response.ok || cancelled) return;
      setTicket(ticketSchema.parse(await response.json()).ticket);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, session_id]);

  return (
    <GameText
      send={(input: string) => setNextMessage(input)}
      resize={(cols: number, rows: number) => setNewSize({ cols, rows })}
      senderRef={senderRef}
      clearRef={clearerRef}
      inputRef={inputRef}
    />
  );
}
