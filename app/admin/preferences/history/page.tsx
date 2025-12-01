import PreferenceHistoryTable from "./table";

export default function PreferenceHistory() {
  const api_route = process.env.API_ROUTE;
  if (!api_route) throw new Error("API_ROUTE not set");

  return (
    <div className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch w-full overflow-hidden">
      <div className="flex flex-row justify-between items-center gap-2 p-4 border-b-2 border-zinc-800">
        <span className="text-2xl font-bold m-2 text-green-300">
          Preference History
        </span>
      </div>
      <PreferenceHistoryTable api_route={api_route} />
    </div>
  );
}

