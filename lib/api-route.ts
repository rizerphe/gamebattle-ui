function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Set ${name} (baked in at build time)`);
  return value;
}

// Next only inlines NEXT_PUBLIC_* into the client bundle when accessed literally.

/** Orchestrator base URL (files, sessions, admin APIs). */
export const API_ROUTE = required("NEXT_PUBLIC_API_ROUTE", process.env.NEXT_PUBLIC_API_ROUTE);

/** Terminal WebSocket base URL. */
export const API_WS_ROUTE = required("NEXT_PUBLIC_API_WS_ROUTE", process.env.NEXT_PUBLIC_API_WS_ROUTE);
