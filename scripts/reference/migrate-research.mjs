import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = fileURLToPath(new URL("../../", import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, "data/reference-site/manifest.json"), "utf8"));
const ledger = JSON.parse(await readFile(resolve(root, ".runtime/reference-seed/c471a7146680/state.json"), "utf8"));
const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
const apply = process.argv.includes("--apply");
const refresh = process.argv.includes("--refresh");
const sources = new Map([
  ["article-22", "PROJECT"], ["article-23", "PROJECT"],
  ["article-25", "JOURNAL_ARTICLE"], ["article-26", "JOURNAL_ARTICLE"],
  ["article-27", "TEXTBOOK"],
  ["article-28", "CONFERENCE_PAPER"], ["article-29", "CONFERENCE_PAPER"],
]);
const textOf = (node) => {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  return (node.content ?? []).map(textOf).join("");
};
const clean = (v) => (v ?? "").replace(/\s+/gu, " ").trim();
const cellText = (cell) => clean(textOf(cell));
const norm = (s) => clean(s).normalize("NFD").replace(/[\u0300-\u036f]/gu, "").replace(/đ/giu, "d").toLowerCase();
const safeYear = (value) => {
  const y = Number(String(value ?? "").match(/(?:19|20)\d{2}/u)?.[0]);
  return y >= 1900 && y <= 2100 ? y : null;
};
const slug = (title, key) => {
  const stem = norm(title).replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 140).replace(/-$/u, "");
  return `${stem || "cong-trinh"}-${createHash("sha256").update(key).digest("hex").slice(0, 9)}`;
};
const valid = (s, max) => clean(s).slice(0, max);
const peopleResponse = await fetch(`${base}/api/v1/public/people?locale=vi`);
if (!peopleResponse.ok) throw new Error(`Không đọc được cán bộ: ${peopleResponse.status}`);
const people = await peopleResponse.json();
function linkedAuthors(raw, role = "AUTHOR") {
  const normalized = ` ${norm(raw).replace(/[^a-z0-9]+/gu, " ").trim()} `;
  return people.filter((p) => {
    const name = norm(p.details.name).replace(/[^a-z0-9]+/gu, " ");
    return name.length >= 8 && normalized.includes(` ${name} `);
  }).map((p) => ({ staffId: p.id, name: p.details.name, role }));
}
const records = [];
function add(source, kind, key, fields) {
  const title = valid(fields.title, 500);
  if (title.length < 4) return;
  const sourceKey = `${source.key}:${key}`;
  records.push({
    sourceKey, kind, source: source.key,
    details: {
      title, slug: slug(title, sourceKey), summary: valid(fields.summary, 3000),
      year: fields.year ?? null, venue: valid(fields.venue, 300), publisher: valid(fields.publisher, 300),
      volume: valid(fields.volume, 300), doi: "", isbn: "",
      authorsText: valid(fields.authorsText, 3000), citation: valid(fields.citation, 5000),
      sourceUrl: source.content.origin?.url ?? "", documentUrl: fields.documentUrl ?? "",
      level: valid(fields.level, 160), period: valid(fields.period, 160), progress: valid(fields.progress, 160),
      coverId: null, coverAlt: "", contributors: linkedAuthors(fields.authorsText, kind === "PROJECT" ? "PRINCIPAL_INVESTIGATOR" : "AUTHOR"),
      sourceArticleId: ledger.records[source.key]?.id ?? null, sourceKey,
    },
  });
}
for (const source of manifest.records.filter((r) => sources.has(r.key))) {
  const kind = sources.get(source.key);
  let headingYear = null;
  let tableNo = 0, listNo = 0;
  for (const block of source.content.document.content ?? []) {
    if (block.type === "heading") { headingYear = safeYear(textOf(block)) ?? headingYear; continue; }
    if (block.type === "table") {
      const rows = (block.content ?? []).map((row) => (row.content ?? []).map(cellText));
      rows.slice(1).forEach((r, index) => {
        const key = `table-${tableNo}-row-${index + 1}`;
        if (kind === "PROJECT" && source.key === "article-22") add(source, kind, key, {
          title: r[2], year: safeYear(r[3]), level: [r[1], r[5]].filter(Boolean).join(" · "),
          period: r[3], progress: r[4], authorsText: r[7],
          summary: r[6], citation: r.filter(Boolean).join(" | "),
        });
        else if (kind === "PROJECT") add(source, kind, key, {
          title: r[1], year: safeYear(r[2]), level: "Cấp cơ sở", period: r[2],
          progress: r[3], authorsText: r[4], citation: r.filter(Boolean).join(" | "),
        });
        else if (kind === "TEXTBOOK") add(source, kind, key, {
          title: r[2], year: safeYear(r[1]), authorsText: [r[3], r[4]].filter(Boolean).join(", "),
          publisher: r[5], citation: r.filter(Boolean).join(" | "),
        });
        else add(source, kind, key, {
          title: r[2], year: headingYear, authorsText: r[3], venue: r[4], volume: r[5],
          citation: [r[3], headingYear, r[2], r[4], r[5]].filter(Boolean).join(". "),
        });
      });
      tableNo++;
    }
    if (block.type === "orderedList") {
      (block.content ?? []).forEach((item, index) => {
        const citation = clean(textOf(item));
        if (citation.length < 12) return;
        const match = citation.match(/^(.*?),?\s*((?:19|20)\d{2})\s*[.:-]?\s*(.*)$/u);
        const authorsText = match ? clean(match[1]) : "";
        const remainder = match ? clean(match[3]) : citation;
        const title = remainder.split(/(?:Tạp chí|Journal|Kỷ yếu|Proceedings|International Journal|Can Tho University Journal)/iu)[0] || remainder;
        add(source, kind, `list-${listNo}-item-${index + 1}`, {
          title, year: match ? safeYear(match[2]) : headingYear, authorsText,
          citation,
        });
      });
      listNo++;
    }
  }
}
const doc = manifest.records.find((r) => r.key === "article-33");
const documentLinks = [
  ["Mẫu định dạng luận văn tốt nghiệp đại học", "https://lrd.ctu.edu.vn/images/doc/dinh_dang_luan_van_TNDD_2026.docx"],
  ["Hướng dẫn trình bày luận văn thạc sĩ và luận án tiến sĩ", "https://gs.ctu.edu.vn/images/upload/vanban-bieumau/HuongdanviettrinhbayLVThS_LATSA5_CTU-Q1799-SH.pdf"],
];
for (const [index, [title, documentUrl]] of documentLinks.entries()) add(doc, "DOCUMENT", `file-${index + 1}`, {
  title, documentUrl, summary: index === 0 ? "Mẫu định dạng luận văn dành cho sinh viên đại học." : "Hướng dẫn trình bày luận văn, luận án dành cho học viên cao học và nghiên cứu sinh.",
});
const counts = Object.groupBy(records, (r) => r.kind);
console.log(`Đã phân tích ${records.length} bản ghi từ ${sources.size + 1} trang nguồn: ${Object.entries(counts).map(([k,v])=>`${k} ${v.length}`).join(", ")}.`);
console.log(`${records.filter((r) => r.details.contributors.length).length} bản ghi khớp tác giả với ${people.length} hồ sơ cán bộ công khai.`);
const auditPath = resolve(root, ".runtime/research-migration/audit.json");
await mkdir(resolve(root, ".runtime/research-migration"), { recursive: true });
await writeFile(auditPath, JSON.stringify(records, null, 2));
if (!apply) { console.log(`Xem dữ liệu tại ${auditPath}. Dùng --apply để nhập.`); process.exit(0); }
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD) throw new Error("Thiếu tài khoản quản trị.");
const cookies = new Map();
async function request(path, { method = "GET", body, version } = {}) {
  const headers = new Headers({ Origin: base });
  if (version !== undefined) headers.set("If-Match", `"${version}"`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await request("/auth/csrf"); headers.set(csrf.headerName, csrf.token);
  }
  if (cookies.size) headers.set("Cookie", [...cookies].map(([k,v])=>`${k}=${v}`).join("; "));
  const response = await fetch(`${base}/api/v1${path}`, { method, headers,
    body: body === undefined ? undefined : JSON.stringify(body), redirect: "error", signal: AbortSignal.timeout(60000) });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0], at = pair.indexOf("=");
    if (at > 0) cookies.set(pair.slice(0,at), pair.slice(at+1));
  }
  const value = await response.json();
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${value?.detail ?? JSON.stringify(value).slice(0,200)}`);
  return value;
}
await request("/auth/login", { method: "POST", body: { email: process.env.LRD_ADMIN_EMAIL, password: process.env.LRD_ADMIN_PASSWORD } });
const statePath = resolve(root, ".runtime/research-migration/state.json");
let state = {};
try { state = JSON.parse(await readFile(statePath, "utf8")); } catch { /* first import */ }
for (let i = 0; i < records.length; i++) {
  const candidate = records[i];
  let saved = state[candidate.sourceKey];
  if (saved?.phase === "published" && !refresh) continue;
  let item = saved?.id ? await request(`/admin/research/${saved.id}`) : null;
  if (!item) {
    item = await request("/admin/research", { method: "POST", body: { kind: candidate.kind, locale: "vi" } });
    saved = state[candidate.sourceKey] = { id: item.id, phase: "created" };
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  if (saved.phase === "created" || refresh) {
    item = await request(`/admin/research/${item.id}/draft`, { method: "PATCH", version: item.version, body: candidate.details });
    saved.phase = "saved";
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  if (saved.phase === "saved") {
    await request(`/admin/research/${item.id}/publish`, { method: "POST", version: item.version, body: { draftVersion: item.draftVersion } });
    saved.phase = "published";
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }
  if ((i+1) % 20 === 0 || i+1 === records.length) console.log(`Đã xử lý ${i+1}/${records.length}.`);
}
