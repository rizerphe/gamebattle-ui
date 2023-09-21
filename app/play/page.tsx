import Select from "./select";

export default function Play() {
  const api_route = process.env.API_ROUTE;
  if (!api_route) return <span>API_ROUTE not set</span>;

  return <Select api_route={api_route} />;
}
