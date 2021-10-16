import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const manifest = JSON.parse(
  await readFile(resolve(root, "data/reference-site/manifest.json"), "utf8"),
);
const ledger = JSON.parse(
  await readFile(resolve(root, ".runtime/reference-seed/c471a7146680/state.json"), "utf8"),
);
const jobs = new Set([
  "article-72",
  "article-73",
  "article-74",
  "article-76",
  "article-77",
  "article-78",
]);
const news = new Set(["article-69", "article-79", "article-80", "article-81"]);
const events = new Set([
  "article-42",
  "article-43",
  "article-45",
  "article-46",
  "article-48",
  "full-0caf0219fceb",
  "full-495665847a23",
  "full-bda5de3f6607",
  "full-fdd6fb596fa1",
]);
const candidates = manifest.records.filter(
  (r) => r.kind === "articles" && (jobs.has(r.key) || news.has(r.key) || events.has(r.key)),
);
const apply = process.argv.includes("--apply");
const refresh = process.argv.includes("--refresh");
console.log(
  `${candidates.length} hồ sơ hội thảo, tin tức, tuyển dụng từ dữ liệu gốc. ${apply ? "Đang chuyển." : "Dùng --apply để chuyển."}`,
);
if (!apply) process.exit(0);
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
  throw new Error("Thiếu tài khoản quản trị.");
const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
const cookies = new Map();
async function request(path, { method = "GET", body, version } = {}) {
  const headers = new Headers({ Origin: base });
  if (version !== undefined) headers.set("If-Match", `"${version}"`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await request("/auth/csrf");
    headers.set(csrf.headerName, csrf.token);
  }
  if (cookies.size) headers.set("Cookie", [...cookies].map(([k, v]) => `${k}=${v}`).join("; "));
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
  const value = text ? JSON.parse(text) : null;
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${value?.detail ?? text.slice(0, 200)}`);
  return value;
}
await request("/auth/login", {
  method: "POST",
  body: { email: process.env.LRD_ADMIN_EMAIL, password: process.env.LRD_ADMIN_PASSWORD },
});
const statePath = resolve(root, ".runtime/editorial-migration/state.json");
await mkdir(resolve(root, ".runtime/editorial-migration"), { recursive: true });
let state = {};
try {
  state = JSON.parse(await readFile(statePath, "utf8"));
} catch {
  /* first run */
}
const lists = {};
for (const kind of ["EVENT", "NEWS", "JOB"])
  lists[kind] = await request(`/admin/editorial?kind=${kind}&locale=vi`);
const iso = (day, month, year) => `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
function eventDates(text) {
  let match = text.match(/từ\s+(\d{1,2})\/(\d{1,2})\s+đến\s+(\d{1,2})\/(\d{1,2})\/(20\d{2})/iu);
  if (match) return [iso(match[1], match[2], match[5]), iso(match[3], match[4], match[5])];
  match = text.match(/từ\s+(\d{1,2})[–-](\d{1,2})\/(\d{1,2})\/(20\d{2})/iu);
  if (match) return [iso(match[1], match[3], match[4]), iso(match[2], match[3], match[4])];
  match = text.match(/ngày\s+(\d{1,2})\/(\d{1,2})\/(20\d{2})/iu);
  if (match) return [iso(match[1], match[2], match[3]), null];
  match = text.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(20\d{2})/iu);
  return match ? [iso(match[1], match[2], match[3]), null] : [null, null];
}
for (const record of candidates) {
  const kind = jobs.has(record.key) ? "JOB" : news.has(record.key) ? "NEWS" : "EVENT";
  const articleId = ledger.records[record.key]?.id;
  if (!articleId) throw new Error(`Chưa có bài viết ${record.key}`);
  let item = lists[kind].find((x) => x.draft.articleId === articleId);
  if (item?.live && !refresh) {
    console.log(`Đã có: ${record.content.title}`);
    continue;
  }
  const article = await request(`/admin/content/${articleId}`);
  if (article.status !== "PUBLISHED" && article.status !== "CHANGED")
    throw new Error(`Bài chưa công khai: ${record.key}`);
  if (!item && state[record.key]?.id)
    item = await request(`/admin/editorial/${state[record.key].id}`);
  if (!item) {
    item = await request("/admin/editorial", { method: "POST", body: { kind, locale: "vi" } });
    state[record.key] = { id: item.id, phase: "created" };
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  const summary = article.summary || record.content.summary || article.title;
  const [startsOn, endsOn] = kind === "EVENT" ? eventDates(summary) : [null, null];
  const employer =
    kind === "JOB"
      ? (
          article.title.match(/^Tuyển dụng\s*[-–]\s*(.+)$/iu)?.[1] ??
          summary.match(/(?:của|tại)\s+(Công ty[^.,]+)/iu)?.[1] ??
          ""
        ).slice(0, 200)
      : "";
  const details = {
    title: article.title,
    slug: article.slug,
    summary,
    thumbnailId: article.coverId ?? null,
    thumbnailAlt: article.coverAlt ?? "",
    externalUrl: article.origin?.url ?? "",
    articleId,
    startsOn,
    endsOn,
    location: "",
    organizer: "",
    deadline: null,
    employer,
    position:
      kind === "JOB" ? (article.title.match(/^Tuyển dụng\s+(.+?)\s+20\d{2}$/iu)?.[1] ?? "") : "",
  };
  if (refresh || state[record.key].phase === "created") {
    item = await request(`/admin/editorial/${item.id}/draft`, {
      method: "PATCH",
      version: item.version,
      body: details,
    });
    state[record.key].phase = "saved";
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  if (state[record.key].phase === "saved") {
    item = await request(`/admin/editorial/${item.id}/publish`, {
      method: "POST",
      version: item.version,
      body: { draftVersion: item.draftVersion },
    });
    state[record.key].phase = "published";
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  console.log(`${kind}: ${record.content.title}`);
}
