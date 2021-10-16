import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { readResponse, ApiError } from "./errors";
import type { SessionUser } from "./contracts";
export const backend = process.env.BACKEND_URL ?? "http://127.0.0.1:8080";
export const sessionCookie = process.env.SESSION_COOKIE ?? "LRD_SESSION";
export async function serverApi<T>(path: string, authenticated = false): Promise<T> {
  const headers = new Headers();
  if (authenticated) {
    const value = (await cookies()).get(sessionCookie)?.value;
    if (value) headers.set("Cookie", sessionCookie + "=" + encodeURIComponent(value));
  }
  return readResponse<T>(await fetch(backend + "/api/v1" + path, { headers, cache: "no-store" }));
}
export const requireUser = cache(async () => {
  try {
    return await serverApi<SessionUser>("/auth/me", true);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect("/admin/login");
    throw error;
  }
});
export async function requirePermission(permission: string) {
  const user = await requireUser();
  if (!user.permissions.includes(permission)) redirect("/admin/forbidden");
  return user;
}
export function safeAdminPath(value: string | null | undefined) {
  return value &&
    /^\/admin(?:\/|$)/.test(value) &&
    !/[\\\r\n]/.test(value) &&
    !value.startsWith("/admin/session-check") &&
    !value.startsWith("/admin/login")
    ? value
    : "/admin/content";
}
