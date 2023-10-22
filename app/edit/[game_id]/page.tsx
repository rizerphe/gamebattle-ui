import EditorLayout from "../editor_layout";

export default function EditorPage({
  params: { game_id },
}: {
  params: { game_id: string };
}) {
  const api_route = process.env.API_ROUTE;
  if (!api_route) throw new Error("API_ROUTE not set");

  return <EditorLayout api_route={api_route} game_id={game_id} />;
}
