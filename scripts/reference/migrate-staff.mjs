import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { staffLeadershipData } from "./staff-leadership-data.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const manifest = JSON.parse(
  await readFile(resolve(root, "data/reference-site/manifest.json"), "utf8"),
);
const ledger = JSON.parse(
  await readFile(resolve(root, ".runtime/reference-seed/c471a7146680/state.json"), "utf8"),
);
const candidates = manifest.records.filter(
  (record) =>
    record.kind === "articles" &&
    record.key.startsWith("full-") &&
    /^(PGS\.|GS\.|TS\.|ThS\.|KS\.)/.test(record.content.title),
);
const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
const apply = process.argv.includes("--apply");
const refresh = process.argv.includes("--refresh");
const withdrawLegacy = process.argv.includes("--withdraw-legacy");
console.log(
  `${candidates.length} hồ sơ cán bộ từ dữ liệu nguồn. ${apply ? "Chuyển qua CMS API." : "Dùng --apply để chuyển."}`,
);
if (!apply) process.exit(0);
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
  throw new Error("Thiếu tài khoản quản trị trong môi trường.");
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
  const value = text ? JSON.parse(text) : null;
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${value?.detail ?? text.slice(0, 200)}`);
  return value;
}
await request("/auth/login", {
  method: "POST",
  body: { email: process.env.LRD_ADMIN_EMAIL, password: process.env.LRD_ADMIN_PASSWORD },
});
const statePath = resolve(root, ".runtime/staff-migration/state.json");
await mkdir(resolve(root, ".runtime/staff-migration"), { recursive: true });
let state = {};
try {
  state = JSON.parse(await readFile(statePath, "utf8"));
} catch {
  /* first run */
}
const existing = await request("/admin/people?locale=vi");
const byArticle = new Map(
  existing.filter((p) => p.draft.sourceArticleId).map((p) => [p.draft.sourceArticleId, p]),
);
const clean = (value) => value.normalize("NFC").replace(/\s+/gu, " ").trim();
function textOf(node) {
  if (!node) return "";
  if (node.type === "hardBreak") return "\n";
  return (node.text ?? "") + (node.content ?? []).map(textOf).join("");
}
const plain = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
const sensitive =
  /^(ngay.*sinh|nam sinh|noi sinh|que quan|dia chi|cho o rieng|dan toc|gioi tinh|chung minh|can cuoc|ho khau|dien thoai|so dien thoai)\b/u;
function convert(source, sourceId) {
  const title = source.title.trim();
  const prefix = title.match(/^(?:(?:PGS|GS|TS|ThS|KS)\.\s*)+/u)?.[0]?.trim() ?? "";
  const name = title.slice(prefix.length).trim();
  const leadership = staffLeadershipData[name] ?? {};
  const privateLines = [`Bài nguồn: ${source.publicUrl ?? `/vi/tin-tuc/${source.slug}`}`];
  const privateFacts = [];
  let email = "",
    position = "",
    degree = prefix.includes("TS")
      ? "Tiến sĩ"
      : prefix.includes("ThS")
        ? "Thạc sĩ"
        : prefix.includes("KS")
          ? "Kỹ sư"
          : "";
  let unit = "";
  const sections = [];
  let current = { title: "Thông tin chuyên môn", blocks: [] };
  function pushSection() {
    if (current.blocks.length) sections.push(current);
  }
  function add(block) {
    current.blocks.push({
      kind: block.kind,
      text: block.text ?? "",
      value: block.value ?? "",
      items: block.items ?? [],
      rows: block.rows ?? [],
      assetId: block.assetId ?? null,
      alt: block.alt ?? "",
    });
  }
  for (const node of source.document.content ?? []) {
    if (node.type === "heading") {
      const heading = clean(textOf(node));
      if (!heading || /^lý lịch khoa học$/iu.test(heading)) continue;
      pushSection();
      current = { title: heading.slice(0, 160), blocks: [] };
      continue;
    }
    if (node.type === "image" || node.type === "inlineImage") {
      if (node.attrs?.assetId && node.attrs.assetId !== source.coverId)
        add({ kind: "IMAGE", assetId: node.attrs.assetId, alt: node.attrs.alt ?? "" });
      continue;
    }
    if (node.type === "table") {
      const rows = (node.content ?? [])
        .filter((r) => r.type === "tableRow")
        .map((r) => (r.content ?? []).map((cell) => clean(textOf(cell))));
      if (rows.length) add({ kind: "TABLE", rows });
      for (const row of node.content ?? [])
        for (const cell of row.content ?? [])
          for (const inner of cell.content ?? [])
            if (["image", "inlineImage"].includes(inner.type) && inner.attrs?.assetId)
              add({ kind: "IMAGE", assetId: inner.attrs.assetId, alt: inner.attrs.alt ?? "" });
      continue;
    }
    if (["bulletList", "orderedList"].includes(node.type)) {
      const items = (node.content ?? []).map((item) => clean(textOf(item))).filter(Boolean);
      if (items.length) add({ kind: "LIST", items });
      continue;
    }
    const content = clean(textOf(node));
    if (!content) continue;
    const pair = content.match(/^([^:]{2,100}):\s*(.*)$/u);
    const label = pair ? plain(pair[1].trim()) : "";
    if (sensitive.test(label)) {
      if (pair[2].trim()) privateFacts.push({ label: pair[1].trim(), value: pair[2].trim() });
      continue;
    }
    if (!email) email = content.match(/[\w.+-]+@ctu\.edu\.vn/iu)?.[0] ?? "";
    const labels = [
      ...content.matchAll(
        /(Họ và tên|Giới tính|Ngày sinh|Năm sinh|Nơi sinh|Quê quán|Dân tộc|Chỗ ở riêng hoặc địa chỉ liên lạc|Địa chỉ|Chức vụ(?:\s*\([^)]*\))?|Chức danh hiện tại|Đơn vị công tác|Nơi công tác|Học vị cao nhất|Trình độ chuyên môn cao nhất|Năm phong|Ngạch viên chức)\s*:/giu,
      ),
    ];
    if (labels.length && (labels[0].index === 0 || /^[IVX]+\.\s*/u.test(content))) {
      labels.forEach((match, index) => {
        const value = content
          .slice(match.index + match[0].length, labels[index + 1]?.index ?? content.length)
          .trim();
        if (!value) return;
        const key = plain(match[1]);
        if (sensitive.test(key)) {
          privateFacts.push({ label: match[1], value });
          return;
        }
        if (!position && /^(chuc vu|chuc danh hien tai)/u.test(key)) position = value.slice(0, 120);
        if (!unit && /^(don vi cong tac|noi cong tac)/u.test(key)) unit = value.slice(0, 160);
        if (!degree && /^(hoc vi cao nhat|trinh do chuyen mon cao nhat)/u.test(key))
          degree = value.slice(0, 100);
        add({ kind: "FACT", text: match[1], value });
      });
    } else if (pair && pair[2].trim())
      add({ kind: "FACT", text: pair[1].trim(), value: pair[2].trim() });
    else add({ kind: "TEXT", text: content });
  }
  pushSection();
  return {
    name,
    slug: source.slug,
    academicTitle: prefix,
    degree,
    position: leadership.position ?? position,
    unit: leadership.unit ?? unit,
    email: leadership.email ?? email,
    phone: "",
    office: "",
    website: "",
    summary: leadership.summary ?? source.summary ?? "",
    specialties: leadership.specialties ?? [],
    portraitId: source.coverId ?? null,
    portraitAlt: source.coverAlt ?? name,
    template: "EDITORIAL",
    sections,
    sourceArticleId: sourceId,
    privateFacts,
    privateNotes: privateLines.join("\n").slice(0, 20000),
  };
}
for (const record of candidates) {
  const id = ledger.records[record.key]?.id;
  if (!id) throw new Error(`Chưa có bài nguồn ${record.key}`);
  if (byArticle.has(id) && !refresh) {
    console.log(`Đã có: ${record.content.title}`);
    continue;
  }
  const source = await request(`/${refresh ? "admin" : "public"}/content/${id}`);
  const details = convert(source, id);
  if (details.sections.length > 30) throw new Error(`${record.key}: quá nhiều đề mục`);
  let profile =
    byArticle.get(id) ??
    (state[record.key]?.id ? await request(`/admin/people/${state[record.key].id}`) : null);
  if (!profile) {
    profile = await request("/admin/people", { method: "POST", body: { locale: "vi" } });
    state[record.key] = { id: profile.id, phase: "created" };
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  if (profile.draft.sourceArticleId && profile.draft.sourceArticleId !== id)
    throw new Error(`Xung đột hồ sơ ${record.key}`);
  if (refresh || state[record.key].phase === "created") {
    profile = await request(`/admin/people/${profile.id}/draft`, {
      method: "PATCH",
      version: profile.version,
      body: details,
    });
    state[record.key].phase = "saved";
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  if (state[record.key].phase === "saved") {
    profile = await request(`/admin/people/${profile.id}/publish`, {
      method: "POST",
      version: profile.version,
      body: { draftVersion: profile.draftVersion },
    });
    state[record.key].phase = "published";
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  console.log(`Đã chuyển: ${record.content.title} → /vi/can-bo/${profile.draft.slug}`);
}
if (withdrawLegacy) {
  const profiles = await request("/admin/people?locale=vi");
  for (const record of candidates) {
    const id = ledger.records[record.key]?.id;
    const profile = profiles.find((p) => p.live?.sourceArticleId === id);
    if (!profile) throw new Error(`Chưa có hồ sơ công khai cho ${record.key}`);
    await request(`/public/people/${profile.live.slug}?locale=vi`);
  }
  for (const record of [...candidates, manifest.records.find((r) => r.key === "article-2")]) {
    if (!record) continue;
    const id = ledger.records[record.key]?.id;
    if (!id) throw new Error(`Chưa có bài cũ ${record.key}`);
    const article = await request(`/admin/content/${id}`);
    if (article.status === "WITHDRAWN" || article.status === "DRAFT") continue;
    await request(`/admin/content/${id}/withdraw`, { method: "POST", version: article.version });
    console.log(`Đã gỡ bài cũ khỏi danh sách tin: ${record.content.title}`);
  }
}
