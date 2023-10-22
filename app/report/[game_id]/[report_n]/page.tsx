import Report from "./report";

export default function ReportPage({
  params: { game_id, report_n },
}: {
  params: { game_id: string; report_n: number };
}) {
  const api_route = process.env.API_ROUTE;
  if (!api_route) throw new Error("No API route provided");

  return (
    <div className="flex flex-col items-stretch flex-1 gap-4 w-full">
      <Report api_route={api_route} game_id={game_id} report_id={report_n} />
    </div>
  );
}
