"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import Terminal from "./terminal";

export function GameText({
  send,
  resize,
  senderRef,
  clearRef,
  inputRef,
}: {
  send: (input: string) => void;
  resize: (cols: number, rows: number) => void;
  senderRef: React.MutableRefObject<((data: string) => any) | null>;
  clearRef: React.MutableRefObject<(() => void) | null>;
  inputRef: React.RefObject<HTMLDivElement | null>;
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

export default function Game({
  api_route,
  session_id,
  game,
  setConnected,
  inputRef,
  gameRunning,
  setGameRunning,
  setOutput = () => {},
}: {
  api_route: string;
  session_id: string;
  game: number;
  setConnected: (connected: boolean) => void;
  inputRef: React.RefObject<HTMLDivElement>;
  gameRunning: boolean;
  setGameRunning: (running: boolean) => void;
  setOutput?: (setter: (output: string) => string) => void;
}) {
  const senderRef = useRef<(data: string) => any | null>(null);
  const clearerRef = useRef<() => void | null>(null);

  const [user] = useAuthState(auth);
  const [newConnection, setNewConnection] = useState<boolean>(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [nextMessage, setNextMessage] = useState<string | null>(null);
  const [newSize, setNewSize] = useState<{ cols: number; rows: number } | null>(
    null
  );
  const { readyState, sendMessage } = useWebSocket(
    `${api_route}/sessions/${session_id}/${game}/ws`,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 1000,
      onOpen: () => {
        setOutput(() => "");
        clearerRef.current?.();
        idToken && sendMessage(idToken);
        setConnected(true);
        setNewConnection(true);

        if (newSize) {
          sendMessage(
            JSON.stringify({
              type: "resize",
              cols: newSize.cols,
              rows: newSize.rows,
            })
          );
        }
      },
      onClose: () => {
        setConnected(false);
      },
      onMessage: (e: any) => {
        if (newConnection) {
          setNewConnection(false);
        }
        const message = JSON.parse(e.data);
        if (message.type === "stdout") {
          setGameRunning(true);
          setOutput((output: string) => output + message.data);
          senderRef?.current && senderRef.current(message.data);
        }
        if (message.type === "bye") {
          setGameRunning(false);
        }
      },
    },
    (idToken ? true : false) && gameRunning
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
          cols: newSize.cols,
          rows: newSize.rows,
        })
      );
    }
  }, [newSize]);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(setIdToken);
  }, [user?.uid]);

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
