"use client";
import { auth } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useEffect, useRef, useState } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import Ansi from "ansi-to-react";

function GameText({
  content,
  send,
}: {
  content: string;
  send: (input: string) => void;
}) {
  const input_ref = useRef(null);
  const [input, setInput] = useState<string>("");

  const ansi = Ansi({ children: content });
  ansi.props.children.push(
    <input
      className="bg-gray-800 text-white p-1 outline-none m-0"
      type="text"
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          send(input + "\n");
          setInput("");
        }
      }}
      ref={input_ref}
      autoFocus={input_ref.current === document.activeElement}
    />
  );

  if (input_ref.current === document.activeElement) {
    setTimeout(() => {
      input_ref.current.scrollIntoView({
        block: "end",
        inline: "nearest",
      });
    }, 0);
  }

  return (
    <div
      className="p-4 flex flex-col whitespace-pre-wrap min-h-full max-h-screen overflow-y-scroll"
      onClick={() => input_ref.current.focus()}
    >
      {ansi}
    </div>
  );
}

export default function Game({
  api_route,
  session_id,
  game,
}: {
  api_route: string;
  session_id: string;
  game: number;
}) {
  const [user] = useAuthState(auth);
  const [output, setOutput] = useState<string>("");
  const [idToken, setIdToken] = useState<string | null>(null);
  const { sendMessage, readyState } = useWebSocket(
    `${api_route}/sessions/${session_id}/${game}/ws`,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 1000,
      onOpen: () => {
        sendMessage(idToken);
      },
      onMessage: (e: any) => {
        setOutput((output) => output + e.data);
      },
      onReconnect: () => {
        setOutput("");
      },
    },
    idToken ? true : false
  );

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(setIdToken);
  }, [user?.uid]);

  return (
    <GameText content={output} send={(input: string) => sendMessage(input)} />
  );
}
