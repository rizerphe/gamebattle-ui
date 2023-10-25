import EditorLayout from "../editor_layout";

export default function EditorPage({
  params: { game_id },
}: {
  params: { game_id: string };
}) {
  const api_route = process.env.API_ROUTE;
  if (!api_route) throw new Error("API_ROUTE not set");

  return (
    <>
      <div className="bg-black p-3 rounded-xl bg-opacity-90 w-full flex flex-row items-center justify-between">
        <span>
          You&apos;re editing another player&apos;s game. There is no version
          control. This is a live environment.{" "}
          <span className="text-green-400">Be careful!</span>
        </span>
        <span>
          Don&apos&apos;t forget to build the game when you&apos;re done
          editing.
        </span>
      </div>
      <EditorLayout api_route={api_route} game_id={game_id} />
    </>
  );
}
