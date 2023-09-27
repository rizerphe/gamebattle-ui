import EditorLayout from "./editor_layout";

export default function EditorPage() {
  const api_route = process.env.API_ROUTE;
  if (!api_route) throw new Error("API_ROUTE not set");

  return <EditorLayout api_route={api_route} />;
}
