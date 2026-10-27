"use client";

import PlayWindow from "@/components/playwindow";
import YourStats from "./your-stats";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-screen px-4">
      <div className="flex flex-row w-full max-w-[90rem] flex-wrap items-stretch gap-0 rounded-md shadow-md shadow-black overflow-hidden">
        <PlayWindow />
        <YourStats />
      </div>
    </div>
  );
}
