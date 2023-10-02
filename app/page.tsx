import PlayWindow from "./playwindow";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-2">
      <PlayWindow disabled />
    </div>
  );
}
