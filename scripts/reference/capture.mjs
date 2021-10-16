import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHTML } from "linkedom";
import { sourceOrigin, sha256, extract } from "./source.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dir = resolve(root, "data/reference-site/source");
await mkdir(dir, { recursive: true });
const inventory = JSON.parse(
  await readFile(resolve(root, "data/reference-site/inventory.json"), "utf8"),
);
const previous = process.argv.includes("--resume")
  ? JSON.parse(await readFile(resolve(dir, "index.json"), "utf8"))
  : [];
const queue = [
    ...inventory.map((p) => p.url),
    ...previous.filter((p) => p.status !== 200).map((p) => p.url),
  ],
  pages = previous.filter((p) => p.status === 200),
  seen = new Set(pages.map((p) => p.url));
function eligible(raw, base) {
  try {
    const u = new URL(raw, base);
    u.hash = "";
    if (
      u.origin !== sourceOrigin ||
      u.pathname.startsWith("/en/") ||
      !(u.pathname.endsWith(".html") || u.pathname === "/")
    )
      return null;
    if ([...u.searchParams.keys()].some((k) => k !== "start")) return null;
    if (
      u.searchParams.has("start") &&
      (!/^\d+$/.test(u.searchParams.get("start")) || Number(u.searchParams.get("start")) > 1000)
    )
      return null;
    return u.href;
  } catch {
    return null;
  }
}
while (queue.length) {
  const url = queue.shift();
  if (seen.has(url)) continue;
  seen.add(url);
  if (seen.size > 500)
    throw new Error("Crawl bound reached; inspect pagination before continuing.");
  const key = sha256(url).slice(0, 12);
  let html;
  try {
    let target = url,
      res;
    for (let redirects = 0; redirects < 6; redirects++) {
      res = await fetch(target, { signal: AbortSignal.timeout(30000), redirect: "manual" });
      if (res.status < 300 || res.status >= 400) break;
      const next = new URL(res.headers.get("location"), target);
      await res.body?.cancel();
      if (next.origin !== sourceOrigin) throw new Error("External redirect: " + next.href);
      target = next.href;
    }
    if (!res.ok) {
      pages.push({ url, key, status: res.status });
      continue;
    }
    html = await res.text();
  } catch (e) {
    pages.push({ url, key, error: e.message });
    continue;
  }
  const doc = parseHTML(html).document;
  const extracted = extract(html, url);
  const scope = doc.querySelector("#sp-component,#tz-main-body,#tz-main") ?? doc;
  for (const a of scope.querySelectorAll("a[href]")) {
    const next = eligible(a.getAttribute("href"), url);
    if (next && !seen.has(next)) queue.push(next);
  }
  if (extracted) {
    await writeFile(resolve(dir, key + ".html"), extracted.html);
    pages.push({
      url,
      key,
      status: 200,
      ...extracted,
      html: undefined,
      bodyHash: sha256(extracted.html),
      text: undefined,
      retrievedOn: new Date().toISOString().slice(0, 10),
    });
  } else pages.push({ url, key, status: 200, kind: "listing" });
  console.log(pages.length + " " + (extracted ? "article" : "listing") + " " + url);
  await writeFile(resolve(dir, "index.json"), JSON.stringify(pages, null, 2) + "\n");
}
await writeFile(resolve(dir, "index.json"), JSON.stringify(pages, null, 2) + "\n");
console.log(
  JSON.stringify({
    pages: pages.length,
    articles: pages.filter((p) => p.bodyHash).length,
    unavailable: pages.filter((p) => p.status !== 200),
  }),
);
