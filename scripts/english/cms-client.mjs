import { randomUUID } from "node:crypto";

export function createCmsClient(baseUrl = process.env.SEED_BASE_URL ?? "http://localhost:8088") {
  const origin = new URL(baseUrl);
  if (
    !["http:", "https:"].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new Error("SEED_BASE_URL must be an HTTP(S) origin without credentials or a path.");
  const cookies = new Map();
  async function request(path, { method = "GET", data, version, headers = {} } = {}) {
    if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Invalid CMS API path");
    const h = new Headers(headers);
    h.set("Origin", origin.origin);
    if (cookies.size)
      h.set("Cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
    if (version !== undefined) h.set("If-Match", `"${version}"`);
    if (data !== undefined) h.set("Content-Type", "application/json");
    const response = await fetch(origin.origin + "/api/v1" + path, {
      method,
      headers: h,
      body: data === undefined ? undefined : JSON.stringify(data),
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0],
        at = pair.indexOf("=");
      if (at > 0) cookies.set(pair.slice(0, at), pair.slice(at + 1));
    }
    const text = await response.text();
    let result;
    try {
      result = text ? JSON.parse(text) : undefined;
    } catch {
      result = undefined;
    }
    if (!response.ok) {
      const error = new Error(
        `${method} ${path}: HTTP ${response.status} ${result?.detail ?? result?.message ?? ""}`,
      );
      error.status = response.status;
      throw error;
    }
    return result;
  }
  async function mutate(path, data, version, method = "POST") {
    const csrf = await request("/auth/csrf");
    return request(path, {
      method,
      data,
      version,
      headers: { [csrf.headerName]: csrf.token, "Idempotency-Key": randomUUID() },
    });
  }
  async function all(path) {
    const items = [];
    for (let page = 0; ; page++) {
      const result = await request(
        path + (path.includes("?") ? "&" : "?") + `size=50&page=${page}`,
      );
      if (Array.isArray(result)) return result;
      items.push(...result.items);
      if (items.length >= result.total || !result.items.length) return items;
    }
  }
  return {
    origin: origin.origin,
    request,
    mutate,
    all,
    async login() {
      if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
        throw new Error("Set LRD_ADMIN_EMAIL and LRD_ADMIN_PASSWORD.");
      return mutate("/auth/login", {
        email: process.env.LRD_ADMIN_EMAIL,
        password: process.env.LRD_ADMIN_PASSWORD,
      });
    },
    logout: () => mutate("/auth/logout"),
  };
}
