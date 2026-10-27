import type { z } from "zod";
import { API_ROUTE } from "./api-route";
import { detailFromBody } from "./api";

type AuthUser = { getIdToken: () => Promise<string> };

async function parse<T>(
  response: Response,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: string,
  nullOn?: number,
): Promise<T | null> {
  const body: unknown = await response.json().catch(() => null);
  if (response.status === nullOn) return null;
  if (!response.ok) throw new Error(detailFromBody(body, fallback));
  return schema.parse(body);
}

/** Signed-out requests are sent without a token; `nullOn` turns that status into `null`. */
export async function apiGet<T>(
  user: AuthUser | null | undefined,
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: string,
  nullOn?: number,
): Promise<T | null> {
  const response = await fetch(`${API_ROUTE}${path}`, {
    headers: user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {},
  });
  return parse(response, schema, fallback, nullOn);
}

export async function apiPost<T>(
  user: AuthUser,
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  fallback: string,
  json: unknown,
): Promise<T> {
  const response = await fetch(`${API_ROUTE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(json),
  });
  const result = await parse(response, schema, fallback);
  if (result === null) throw new Error(fallback);
  return result;
}

/** A request whose answer does not matter beyond success, such as a PUT or DELETE. */
export async function apiSend(
  user: AuthUser,
  method: "PUT" | "DELETE",
  path: string,
  fallback: string,
  json?: unknown,
): Promise<void> {
  const response = await fetch(`${API_ROUTE}${path}`, {
    method,
    headers: {
      ...(json === undefined ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new Error(detailFromBody(body, fallback));
  }
}
