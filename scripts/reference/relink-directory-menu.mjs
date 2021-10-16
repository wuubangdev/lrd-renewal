import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const ledger = JSON.parse(
  await readFile(resolve(root, ".runtime/reference-seed/c471a7146680/state.json"), "utf8"),
);
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
const laboratories = await request("/admin/laboratories?locale=vi");
const replacements = new Map([
  [ledger.records["article-2"].id, { kind: "PEOPLE", target: "" }],
  ...["article-9", "article-10"].map((key) => {
    const sourceId = ledger.records[key].id;
    const lab = laboratories.find((profile) => profile.live?.sourceArticleId === sourceId);
    if (!lab) throw new Error(`Chưa có phòng công khai cho ${key}`);
    return [sourceId, { kind: "LABORATORY", target: lab.id }];
  }),
]);
let document = await request("/admin/site/menu?locale=vi");
let count = 0;
function rewrite(items) {
  return items.map((item) => {
    const replacement = item.link.kind === "ARTICLE" ? replacements.get(item.link.target) : null;
    if (replacement) count++;
    return { ...item, link: replacement ?? item.link, children: rewrite(item.children ?? []) };
  });
}
const content = { ...document.content, items: rewrite(document.content.items) };
if (!count) {
  console.log("Menu đã dùng liên kết hồ sơ có cấu trúc.");
  process.exit(0);
}
document = await request("/admin/site/menu?locale=vi", {
  method: "PATCH",
  version: document.version,
  body: content,
});
document = await request("/admin/site/menu/publish?locale=vi", {
  method: "POST",
  version: document.version,
  body: { draftVersion: document.draftVersion },
});
console.log(`Đã cập nhật ${count} liên kết menu và đăng công khai.`);
