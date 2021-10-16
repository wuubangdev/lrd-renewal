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
const records = ["article-9", "article-10"].map((key) =>
  manifest.records.find((r) => r.key === key),
);
const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
const apply = process.argv.includes("--apply");
const withdrawLegacy = process.argv.includes("--withdraw-legacy");
console.log(
  `${records.length} phòng thí nghiệm từ site tham khảo. ${apply ? "Chuyển qua CMS API." : "Dùng --apply để chuyển."}`,
);
if (!apply) process.exit(0);
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
const statePath = resolve(root, ".runtime/laboratory-migration/state.json");
await mkdir(resolve(root, ".runtime/laboratory-migration"), { recursive: true });
let state = {};
try {
  state = JSON.parse(await readFile(statePath, "utf8"));
} catch {
  /* first run */
}
const saveState = () => writeFile(statePath, JSON.stringify(state, null, 2));
const clean = (text) => text.normalize("NFC").replace(/\s+/gu, " ").trim();
function textOf(node) {
  if (!node) return "";
  if (node.type === "hardBreak") return "\n";
  return (node.text ?? "") + (node.content ?? []).map(textOf).join("");
}
function convert(source, id) {
  const sections = [];
  let current = { title: "Giới thiệu", blocks: [] };
  function push() {
    if (current.blocks.length) sections.push(current);
  }
  function add(kind, extra = {}) {
    current.blocks.push({
      kind,
      text: "",
      value: "",
      items: [],
      rows: [],
      assetId: null,
      alt: "",
      ...extra,
    });
  }
  let lead = "",
    email = "";
  for (const node of source.document.content ?? []) {
    const content = clean(textOf(node));
    const list =
      node.type === "orderedList" || node.type === "bulletList"
        ? (node.content ?? []).map((item) => clean(textOf(item))).filter(Boolean)
        : [];
    if (
      node.type === "heading" ||
      (node.type === "orderedList" &&
        list.length === 1 &&
        list[0].length < 100 &&
        !list[0].includes(":"))
    ) {
      const heading = (node.type === "heading" ? content : list[0])
        .replace(/^\d+(?:\.\d+)*\s*[.\-]?\s*/u, "")
        .trim();
      if (heading) {
        push();
        current = { title: heading.slice(0, 160), blocks: [] };
      }
      continue;
    }
    if (node.type === "image" || node.type === "inlineImage") {
      if (node.attrs?.assetId && node.attrs.assetId !== source.coverId)
        add("IMAGE", { assetId: node.attrs.assetId, alt: node.attrs.alt ?? "" });
      continue;
    }
    if (node.type === "table") {
      const rows = (node.content ?? [])
        .filter((row) => row.type === "tableRow")
        .map((row) => (row.content ?? []).map((cell) => clean(textOf(cell))));
      if (rows.length && rows.some((row) => row.some(Boolean))) add("TABLE", { rows });
      for (const row of node.content ?? [])
        for (const cell of row.content ?? [])
          for (const inner of cell.content ?? [])
            if (["image", "inlineImage"].includes(inner.type) && inner.attrs?.assetId)
              add("IMAGE", { assetId: inner.attrs.assetId, alt: inner.attrs.alt ?? "" });
      continue;
    }
    if (list.length) {
      const contact = list.join(" ");
      if (!lead)
        lead =
          contact.match(/(?:Người phụ trách|Người phụ trách)\s*:\s*([^;.]+)/iu)?.[1]?.trim() ?? "";
      if (!email) email = contact.match(/[\w.+-]+@ctu\.edu\.vn/iu)?.[0] ?? "";
      add("LIST", { items: list });
      continue;
    }
    if (!content) continue;
    const pair = content.match(/^([^:]{2,100}):\s*(.+)$/u);
    if (pair) add("FACT", { text: pair[1].trim(), value: pair[2].trim() });
    else add("TEXT", { text: content });
  }
  push();
  return {
    name: source.title,
    slug: source.slug,
    shortName: source.title.includes("GIS")
      ? "GIS & Remote Sensing Lab"
      : "Land Resource Laboratory",
    lead: lead.slice(0, 200),
    location: "",
    email,
    phone: "",
    summary: source.summary || source.title,
    coverId: source.coverId ?? null,
    coverAlt: source.coverAlt ?? source.title,
    template: "EDITORIAL",
    sections,
    sourceArticleId: id,
  };
}
const existing = await request("/admin/laboratories?locale=vi");
for (const record of records) {
  const id = ledger.records[record.key]?.id;
  if (!id) throw new Error(`Thiếu bài nguồn ${record.key}`);
  const found = existing.find((p) => p.draft.sourceArticleId === id);
  if (found) {
    console.log(`Đã có: ${record.content.title}`);
    continue;
  }
  const source = await request(`/public/content/${id}`);
  const details = convert(source, id);
  if (details.sections.length > 30) throw new Error(`${record.key}: quá nhiều đề mục`);
  let profile = state[record.key]?.id
    ? await request(`/admin/laboratories/${state[record.key].id}`)
    : null;
  if (!profile) {
    profile = await request("/admin/laboratories", { method: "POST", body: { locale: "vi" } });
    state[record.key] = { id: profile.id, phase: "created" };
    await saveState();
  }
  if (state[record.key].phase === "created") {
    profile = await request(`/admin/laboratories/${profile.id}/draft`, {
      method: "PATCH",
      version: profile.version,
      body: details,
    });
    state[record.key].phase = "saved";
    await saveState();
  }
  if (state[record.key].phase === "saved") {
    profile = await request(`/admin/laboratories/${profile.id}/publish`, {
      method: "POST",
      version: profile.version,
      body: { draftVersion: profile.draftVersion },
    });
    state[record.key].phase = "published";
    await saveState();
  }
  console.log(`Đã chuyển: ${record.content.title} → /vi/phong-thi-nghiem/${details.slug}`);
}
if (withdrawLegacy) {
  const profiles = await request("/admin/laboratories?locale=vi");
  for (const record of records) {
    const id = ledger.records[record.key].id;
    const profile = profiles.find((p) => p.live?.sourceArticleId === id);
    if (!profile) throw new Error(`Chưa có hồ sơ công khai ${record.key}`);
    await request(`/public/laboratories/${profile.live.slug}?locale=vi`);
  }
  for (const record of records) {
    const id = ledger.records[record.key].id;
    const article = await request(`/admin/content/${id}`);
    if (article.status !== "WITHDRAWN" && article.status !== "DRAFT") {
      await request(`/admin/content/${id}/withdraw`, { method: "POST", version: article.version });
      console.log(`Đã gỡ bài cũ: ${record.content.title}`);
    }
  }
}
