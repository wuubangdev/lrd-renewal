"use client";
import { readResponse } from "./errors";
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.method && !["GET", "HEAD"].includes(options.method)) {
    const csrf = await fetch("/api/v1/auth/csrf", {
      credentials: "same-origin",
      cache: "no-store",
    }).then(readResponse<{ token: string; headerName: string }>);
    headers.set(csrf.headerName, csrf.token);
  }
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  return readResponse<T>(
    await fetch("/api/v1" + path, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    }),
  );
}
export const matchVersion = (version: number) => ({ "If-Match": '"' + version + '"' });
