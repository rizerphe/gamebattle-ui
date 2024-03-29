"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useState } from "react";
import useWebSocket from "react-use-websocket";
import Ansi from "ansi-to-react";

export function GameText({
  content,
  send,
  inputRef,
}: {
  content: string;
  send: (input: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const [input, setInput] = useState<string>("");

  const ansi = Ansi({ children: content });
  ansi.props.children.push(
    <input
      className="bg-transparent text-white p-0 outline-none m-0"
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          send(input + "\n");
          setInput("");
        }
      }}
      ref={inputRef}
      autoFocus={inputRef?.current === document.activeElement}
    />
  );

  setTimeout(() => {
    inputRef?.current?.scrollIntoView?.({
      block: "end",
      inline: "nearest",
    });
  }, 0);

  return (
    <div
      className="p-4 flex flex-col whitespace-pre-wrap overflow-y-auto scrollbar-none max-w-full"
      style={{
        maxHeight: "calc(100vh - 18rem)",
      }}
      onClick={() => inputRef?.current?.focus?.()}
    >
      {ansi}
    </div>
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
  output = "",
  setOutput = () => {},
}: {
  api_route: string;
  session_id: string;
  game: number;
  setConnected: (connected: boolean) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  gameRunning: boolean;
  setGameRunning: (running: boolean) => void;
  output?: string;
  setOutput?: (setter: (output: string) => string) => void;
}) {
  const [user] = useAuthState(auth);
  const [newConnection, setNewConnection] = useState<boolean>(true);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [nextMessage, setNextMessage] = useState<string | null>(null);
  const { readyState, sendMessage } = useWebSocket(
    `${api_route}/sessions/${session_id}/${game}/ws`,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 1000,
      onOpen: () => {
        setOutput(() => "");
        idToken && sendMessage(idToken);
        setConnected(true);
        setNewConnection(true);
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
      sendMessage(nextMessage);
      setNextMessage(null);
    }
  }, [readyState, nextMessage]);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(setIdToken);
  }, [user?.uid]);

  return (
    <GameText
      content={output}
      send={(input: string) => setNextMessage(input)}
      inputRef={inputRef}
    />
  );
}
