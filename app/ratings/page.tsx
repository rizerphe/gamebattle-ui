import Ratings from "./table";

export default function Leaderboard() {
  const api_route = process.env.API_ROUTE;
  if (!api_route) throw new Error("API_ROUTE not set");

  return (
    <div className="bg-black bg-opacity-90 rounded-lg w-full overflow-hidden grid grid-cols-4">
      <span className="text-2xl font-bold m-2 text-green-300">Author</span>
      <span className="text-2xl font-bold m-2 text-green-300">Score</span>
      <span className="text-2xl font-bold m-2 text-green-300">Reports</span>
      <span className="text-2xl font-bold m-2 text-green-300">
        Games played
      </span>
      <Ratings api_route={api_route} />
    </div>
  );
}
