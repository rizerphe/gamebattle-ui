"use client";
import React, { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function TerminalComponent({
  senderRef,
  clearRef,
  terminalRef,
  send,
  resize,
}: {
  senderRef: React.MutableRefObject<((data: string) => any) | null>;
  clearRef?: React.MutableRefObject<(() => void) | null>;
  terminalRef: React.RefObject<HTMLDivElement>;
  send?: (input: string) => void;
  resize?: (cols: number, rows: number) => void;
}) {
  const terminal = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);

  useEffect(() => {
    // Initialize xterm.js
    terminal.current = new Terminal({
      allowTransparency: true,
      theme: {
        background: "rgba(0, 0, 0, 0)",
      },
      fontFamily: "monospace",
      fontSize: 16,
    });
    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);

    if (terminalRef.current) {
      terminal.current.open(terminalRef.current);

      senderRef.current = (data) => {
        // Decode base64 string to Uint8Array and write to terminal
        const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
        terminal.current?.write(bytes);
      };

      if (clearRef) {
        clearRef.current = () => {
          terminal.current?.reset();
        };
      }

      terminal.current.onData((data) => {
        if (send) {
          // Convert string to Uint8Array and encode as base64
          const bytes = new TextEncoder().encode(data);
          const base64 = btoa(
            Array.from(bytes, (c) => String.fromCharCode(c)).join("")
          );
          send(base64);
        }
      });

      terminal.current.onResize((size) => {
        resize?.(size.cols, size.rows);
      });

      // Handle resizing
      const handleResize = () => {
        fitAddon.current?.fit();
      };
      const handleFocus = () => {
        terminal.current?.focus();
      };

      const terminalElement = terminalRef.current;
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(terminalElement);
      terminalElement.addEventListener("mouseenter", handleFocus);

      // Fit terminal to container, sending the first resize event
      fitAddon.current.fit();

      // Clean up on unmount
      return () => {
        resizeObserver.disconnect();
        terminalElement.removeEventListener("mouseenter", handleFocus);
        terminal.current?.dispose();
      };
    }
  }, []);

  return (
    <div className="p-4 h-full">
      <div ref={terminalRef} className="h-full" />
      <style>
        {`
        /* I know this is a lazy solution, but I genuinely cba
        to even just create a new file */

        .xterm-viewport::-webkit-scrollbar {
          background-color: #000;
          width: 8px;
        }

        .xterm-viewport::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 4px;
        }
      `}
      </style>
    </div>
  );
}
