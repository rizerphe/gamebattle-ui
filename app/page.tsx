"use client";

import PlayWindow from "@/components/playwindow";

export default function Home() {
  // pb-24 matches the navbar height (h-24): centres on the page, not on the area below the bar.
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full px-4 pb-24">
      <PlayWindow />
    </div>
  );
}
