import PlayWindow from "./playwindow";
import YourStats from "./your_stats";

export default function Home() {
  const competition_started = process.env.COMPETITION_STARTED === "true";

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-screen px-4">
      <div className="flex flex-row w-full max-w-[75rem] flex-wrap items-stretch gap-0 rounded-md shadow-md shadow-black overflow-hidden">
        <PlayWindow disabled={!competition_started} />
        <YourStats />
      </div>
    </div>
  );
}
