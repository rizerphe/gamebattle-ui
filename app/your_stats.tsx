import Stats from "./stats";
import CodeSummary from "./code_summary";

export default function YourStats() {
  const api_route = process.env.API_ROUTE;
  if (api_route === undefined) {
    return null;
  }

  const competition_started = process.env.COMPETITION_STARTED === "true";

  return (
    <div className="bg-zinc-900 text-zinc-400 bg-opacity-80 p-4 flex flex-col items-center gap-2 flex-1 min-w-fit">
      <span className="font-bold text-4xl flex flex-row items-center justify-start gap-2 whitespace-nowrap">
        {competition_started ? "Your stats" : "Good luck!"}
      </span>
      {competition_started ? (
        <Stats api_route={api_route} />
      ) : (
        <CodeSummary api_route={api_route} />
      )}
    </div>
  );
}
