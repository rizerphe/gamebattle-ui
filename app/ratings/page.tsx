import Ratings from "./table";

export default function Leaderboard() {
  const api_route = process.env.API_ROUTE;
  if (!api_route) throw new Error("API_ROUTE not set");

  return (
    <div className="bg-black bg-opacity-90 rounded-lg w-full overflow-hidden grid grid-cols-4">
      <Ratings api_route={api_route} />
    </div>
  );
}
