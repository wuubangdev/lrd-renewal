import { staffLeadershipData } from "./staff-leadership-data.mjs";

const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
if (!process.argv.includes("--apply")) {
  console.log("Đối chiếu bốn hồ sơ nhân sự. Thêm --apply để cập nhật qua CMS API.");
  process.exit(0);
}
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
  throw new Error("Thiếu LRD_ADMIN_EMAIL hoặc LRD_ADMIN_PASSWORD.");

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
  const response = await fetch(`${base}/api/v1${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0];
    const at = pair.indexOf("=");
    if (at > 0) cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${data?.detail ?? raw.slice(0, 200)}`);
  return data;
}

await request("/auth/login", {
  method: "POST",
  body: { email: process.env.LRD_ADMIN_EMAIL, password: process.env.LRD_ADMIN_PASSWORD },
});
const profiles = await request("/admin/people?locale=vi");
for (const [name, correction] of Object.entries(staffLeadershipData)) {
  const profile = profiles.find(({ draft }) => draft.name === name);
  if (!profile) throw new Error(`Không tìm thấy hồ sơ ${name}`);
  const details = { ...profile.draft, ...correction };
  const changed = Object.keys(correction).some(
    (key) => JSON.stringify(profile.draft[key]) !== JSON.stringify(details[key]) ||
      JSON.stringify(profile.live?.[key]) !== JSON.stringify(details[key]),
  );
  if (!changed) {
    console.log(`Đã khớp: ${name}`);
    continue;
  }
  const saved = await request(`/admin/people/${profile.id}/draft`, {
    method: "PATCH",
    version: profile.version,
    body: details,
  });
  await request(`/admin/people/${profile.id}/publish`, {
    method: "POST",
    version: saved.version,
    body: { draftVersion: saved.draftVersion },
  });
  console.log(`Đã cập nhật và đăng công khai: ${name}`);
}
