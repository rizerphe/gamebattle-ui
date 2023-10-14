import GameContainer from "./game_container";

export default function GamesPlaceholder({
  n_games = 2,
  tooling,
}: {
  n_games?: number;
  tooling?: React.ReactNode;
}) {
  return (
    <>
      {Array.from(Array(n_games).keys()).map((i) => (
        <div
          key={i}
          className="flex flex-col flex-1 bg-black bg-opacity-90 rounded-lg items-stretch"
        >
          <GameContainer name="Loading..." tooling={tooling} />
        </div>
      ))}
    </>
  );
}
