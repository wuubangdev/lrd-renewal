import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { aboutSlug, aboutOutline, formatAboutArticle } from "./about-article.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const base = process.env.SEED_BASE_URL ?? "http://localhost:8088";
const articleId = "68124ab3-1f7c-4a34-90e4-e104e3b721f0";
const apply = process.argv.includes("--apply");
const manifestFile = resolve(root, "data/reference-site/manifest.json");
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
const source = manifest.records.find((record) => record.kind === "articles" && record.content.slug === aboutSlug);
if (!source) throw new Error("Missing introduction article in reference manifest.");
const formattedSource = formatAboutArticle(source.content.document);
console.log("Article outline:", aboutOutline(formattedSource).join(" / "));
if (!apply) {
  console.log("Use --apply to update the CMS article and navigation menu.");
  process.exit(0);
}
if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
  throw new Error("Missing LRD_ADMIN_EMAIL or LRD_ADMIN_PASSWORD.");

const cookies = new Map();
async function request(path, { method = "GET", body, version } = {}) {
  const headers = new Headers({ Origin: base });
  if (version !== undefined) headers.set("If-Match", `"${version}"`);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await request("/auth/csrf");
    headers.set(csrf.headerName, csrf.token);
    headers.set("Idempotency-Key", randomUUID());
  }
  if (cookies.size) headers.set("Cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
  const response = await fetch(base + "/api/v1" + path, {
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
  const value = raw ? JSON.parse(raw) : null;
  if (!response.ok)
    throw new Error(`${method} ${path}: ${response.status} ${value?.detail ?? raw.slice(0, 200)}`);
  return value;
}

await request("/auth/login", {
  method: "POST",
  body: { email: process.env.LRD_ADMIN_EMAIL, password: process.env.LRD_ADMIN_PASSWORD },
});
let article = await request("/admin/content/" + articleId);
if (article.slug !== aboutSlug || article.locale !== "vi" || article.status !== "PUBLISHED")
  throw new Error("The CMS article has changed or contains unpublished edits; review it first.");
const formatted = formatAboutArticle(article.document);
if (formatted !== article.document) {
  const backupDirectory = resolve(root, ".runtime/about-reformat");
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(resolve(backupDirectory, `article-v${article.version}.json`), JSON.stringify(article, null, 2) + "\n");
  article = await request("/admin/content/" + articleId + "/draft", {
    method: "PATCH",
    version: article.version,
    body: {
      title: article.title,
      slug: article.slug,
      summary: article.summary,
      byline: article.byline,
      category: article.category,
      document: formatted,
      coverId: article.coverId,
      coverAlt: article.coverAlt,
      origin: article.origin,
    },
  });
  article = await request("/admin/content/" + articleId + "/publish", {
    method: "POST",
    version: article.version,
    body: { draftVersion: article.draftVersion },
  });
  console.log("Published reformatted article.");
} else console.log("Article already formatted.");

let menu = await request("/admin/site/menu?locale=vi");
const items = structuredClone(menu.content.items);
const introduction = items.flatMap((item) => item.children ?? [])
  .find((item) => item.link.kind === "ARTICLE" && item.link.target === articleId);
if (!introduction) throw new Error("Introduction link missing from navigation menu.");
if (introduction.label !== "Giới thiệu bộ môn") {
  if (menu.status !== "PUBLISHED") throw new Error("The CMS menu contains unpublished edits; review it first.");
  introduction.label = "Giới thiệu bộ môn";
  menu = await request("/admin/site/menu?locale=vi", {
    method: "PATCH",
    version: menu.version,
    body: { ...menu.content, items },
  });
  await request("/admin/site/menu/publish?locale=vi", {
    method: "POST",
    version: menu.version,
    body: { draftVersion: menu.draftVersion },
  });
  console.log("Published updated navigation label.");
} else console.log("Navigation label already updated.");
