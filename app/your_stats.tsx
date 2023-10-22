import Stats from "./stats";

export default function YourStats() {
  const api_route = process.env.API_ROUTE;
  if (api_route === undefined) {
    return null;
  }

  return (
    <div className="bg-white text-gray-600 bg-opacity-80 p-4 flex flex-col items-center gap-2 flex-1 min-w-fit">
      <span className="font-bold text-4xl flex flex-row items-center justify-start gap-2 whitespace-nowrap">
        Your stats
      </span>
      <Stats api_route={api_route} />
    </div>
  );
}
