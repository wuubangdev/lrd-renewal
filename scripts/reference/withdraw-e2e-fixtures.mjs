const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
  throw new Error("Thiếu tài khoản quản trị.");
const cookies = new Map();
async function request(path, { method = "GET", body, version } = {}) {
  const headers = new Headers({ Origin: base });
  if (version !== undefined) headers.set("If-Match", `"${version}"`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await request("/auth/csrf");
    headers.set(csrf.headerName, csrf.token);
  }
  if (cookies.size)
    headers.set("Cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
  const response = await fetch(base + "/api/v1" + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0],
      at = pair.indexOf("=");
    if (at > 0) cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  const text = await response.text();
  let value;
  try {
    value = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${method} ${path}: ${response.status} ${text.slice(0, 120)}`);
  }
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${value?.detail ?? text.slice(0, 200)}`);
  return value;
}
await request("/auth/login", {
  method: "POST",
  body: { email: process.env.LRD_ADMIN_EMAIL, password: process.env.LRD_ADMIN_PASSWORD },
});

for (const [path, prefix] of [["people", "can-bo-e2e-"], ["laboratories", "phong-thi-nghiem-e2e-"]]) {
  const profiles = await request(`/admin/${path}?locale=vi`);
  for (const profile of profiles.filter(p => p.live?.slug?.startsWith(prefix))) {
    await request(`/admin/${path}/${profile.id}/withdraw`, { method: "POST", version: profile.version });
    console.log(`Đã gỡ fixture ${profile.live.slug}`);
  }
}
