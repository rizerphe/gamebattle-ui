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
        <GameContainer key={i} name="Loading..." tooling={tooling} />
      ))}
    </>
  );
}
