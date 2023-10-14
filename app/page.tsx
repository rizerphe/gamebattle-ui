import PlayWindow from "./playwindow";
import YourStats from "./your_stats";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-2">
      <div className="flex flex-row flex-wrap items-stretch gap-0 rounded-md shadow-md shadow-black overflow-hidden">
        <PlayWindow disabled />
        <YourStats />
      </div>
    </div>
  );
}
