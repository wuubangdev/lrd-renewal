import { randomUUID } from "node:crypto";
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

let menu = await request("/admin/site/menu?locale=vi");
const items = [...menu.content.items];
const desired = [
  { kind: "EVENTS", label: "Hội thảo" },
  { kind: "JOBS", label: "Tuyển dụng" },
];
let changed = 0;
for (const { kind, label } of desired) {
  const present = (nodes) =>
    nodes.some(
      (item) =>
        item.link.kind === kind || (item.children ?? []).some((child) => child.link.kind === kind),
    );
  if (present(items)) continue;
  if (items.length < 8)
    items.push({ id: randomUUID(), label, link: { kind, target: "" }, children: [] });
  else {
    const group = items.find(
      (item) => item.link.kind === "GROUP" && (item.children ?? []).length < 8,
    );
    if (!group) throw new Error("Menu đã đầy, cần sắp xếp một nhóm trước khi thêm liên kết.");
    group.children.push({ id: randomUUID(), label, link: { kind, target: "" }, children: [] });
  }
  changed++;
}
if (!changed) {
  console.log("Menu hội thảo/tuyển dụng đã có.");
  process.exit(0);
}
menu = await request("/admin/site/menu?locale=vi", {
  method: "PATCH",
  version: menu.version,
  body: { items },
});
menu = await request("/admin/site/menu/publish?locale=vi", {
  method: "POST",
  version: menu.version,
  body: { draftVersion: menu.draftVersion },
});
console.log(`Đã thêm ${changed} liên kết vào menu công khai.`);
