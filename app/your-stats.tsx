import CodeSummary from "@/components/code-summary";

export default function YourStats() {
  return (
    <div className="bg-zinc-900 text-zinc-400 bg-opacity-80 p-4 flex flex-col items-center gap-2 flex-1 w-fit max-w-full">
      <span className="font-bold text-4xl flex flex-row items-center justify-start gap-2 whitespace-nowrap">
        Good luck!
      </span>
      <CodeSummary />
    </div>
  );
}
