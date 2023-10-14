"use client";
import { auth } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useRef, useState } from "react";
import useWebSocket from "react-use-websocket";
import Ansi from "ansi-to-react";

function GameText({
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
      className="bg-transparent text-white p-1 outline-none m-0"
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

  if (inputRef?.current === document.activeElement) {
    setTimeout(() => {
      inputRef?.current?.scrollIntoView?.({
        block: "end",
        inline: "nearest",
      });
    }, 0);
  }

  return (
    <div
      className="p-4 flex flex-col whitespace-pre-wrap overflow-y-scroll"
      style={{
        maxHeight: "calc(100vh - 16rem)",
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
}: {
  api_route: string;
  session_id: string;
  game: number;
  setConnected: (connected: boolean) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}) {
  const [user] = useAuthState(auth);
  const [output, setOutput] = useState<string>("");
  const [idToken, setIdToken] = useState<string | null>(null);
  const { sendMessage } = useWebSocket(
    `${api_route}/sessions/${session_id}/${game}/ws`,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 1000,
      onOpen: () => {
        idToken && sendMessage(idToken);
        setOutput("");
        setConnected(true);
      },
      onClose: () => {
        setConnected(false);
      },
      onMessage: (e: any) => {
        setOutput((output) => output + e.data);
      },
    },
    idToken ? true : false
  );

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(setIdToken);
  }, [user?.uid]);

  return (
    <GameText
      content={output}
      send={(input: string) => sendMessage(input)}
      inputRef={inputRef}
    />
  );
}
