import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { convert, sha256, compact } from "./source.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = resolve(root, "data/reference-site");
const manifest = JSON.parse(await readFile(resolve(directory, "manifest.json"), "utf8"));
const oldInventory = JSON.parse(await readFile(resolve(directory, "inventory.json"), "utf8"));
const pages = JSON.parse(await readFile(resolve(directory, "source/index.json"), "utf8"));
const sourceAliases = JSON.parse(await readFile(resolve(directory, "source-aliases.json"), "utf8"));
const redirects = JSON.parse(
  await readFile(resolve(root, "apps/web/src/lib/legacy-redirects.json"), "utf8"),
);
const records = manifest.records,
  existing = new Map();
for (const record of records.filter((r) => r.kind === "articles")) {
  const url = record.sourceUrl ?? oldInventory[record.sourcePages?.[0]]?.url;
  if (url) existing.set(url, record);
}
const urlAssets = new Map(Object.entries(manifest.assets).map(([key, a]) => [a.url, key]));
function asset(url, title) {
  let key = urlAssets.get(url);
  if (!key) {
    key = "full-" + sha256(url).slice(0, 16);
    manifest.assets[key] = { url, alt: title.slice(0, 300) };
    urlAssets.set(url, key);
  }
  return { $asset: key };
}
const slugify = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/g, "");
const plainText = (node) => (node.text ?? "") + (node.content ?? []).map(plainText).join(" ");
function listingSummary(record, document) {
  if (/^(?:GS|PGS|TS|ThS|KS)\.?\s/iu.test(record.content.title))
    return `Hồ sơ khoa học, đào tạo và công bố của ${record.content.title} tại Bộ môn Tài nguyên đất đai.`;
  const paragraphs = (document.content ?? [])
    .filter((node) => node.type === "paragraph")
    .map((node) => compact(plainText(node)))
    .filter(
      (text) =>
        text.length >= 80 &&
        !/^[-–•*+]|^\d+[.)]\s/u.test(text) &&
        !/\b(?:Họ và tên|Giới tính|Nơi sinh|Chỗ ở riêng|Điện thoại liên hệ)\b/iu.test(text),
    );
  const text = paragraphs[0] ?? "";
  if (text.length <= 205) return text;
  const sentence = text.slice(0, 205).lastIndexOf(". ");
  if (sentence >= 100) return text.slice(0, sentence + 1);
  const space = text.slice(0, 202).lastIndexOf(" ");
  return text.slice(0, space > 100 ? space : 202).trimEnd() + "…";
}
function category(url) {
  return url.includes("tuy")
    ? "TUYEN_SINH"
    : url.includes("nghien-cuu")
      ? "NGHIEN_CUU"
      : url.includes("dao-tao")
        ? "DAO_TAO"
        : /sinh-via-n|ha-c-ba-ng/.test(url)
          ? "SINH_VIEN"
          : url.includes("hoi-thao")
            ? "SU_KIEN"
            : "TIN_TUC";
}
const canonical = new Map(),
  mappings = new Map(),
  coverage = [],
  skipped = [];
// Existing article URLs take precedence so ID, CMS history and public slugs survive this upgrade.
const ordered = [
  ...pages.filter((p) => existing.has(p.url)),
  ...pages.filter((p) => !existing.has(p.url)),
];
for (const page of ordered) {
  if (!page.bodyHash) {
    if (page.status !== 200)
      skipped.push({ url: page.url, reason: "Source unavailable", status: page.status });
    continue;
  }
  const html = await readFile(resolve(directory, "source", page.key + ".html"), "utf8");
  if (sha256(html) !== page.bodyHash) throw new Error("Source snapshot changed: " + page.url);
  if (
    /Underconstruction|Style Guide/i.test(page.title) ||
    page.url.endsWith("/chuyen-giao-cong-nghe.html")
  ) {
    skipped.push({ url: page.url, reason: "Source contains an unfinished template" });
    continue;
  }
  const source = { ...page, html };
  const converted = convert(source, { image: (url) => asset(url, page.title) });
  if (!converted.characters && !converted.images.length) {
    skipped.push({ url: page.url, reason: "Source body is empty" });
    continue;
  }
  const signature = converted.textHash + JSON.stringify(converted.images);
  let record = canonical.get(signature)?.record;
  if (!record) {
    record = existing.get(page.url);
    if (!record) {
      record = {
        key: "full-" + page.key,
        kind: "articles",
        locale: "vi",
        sourceUrl: page.url,
        content: {
          title: page.title,
          slug: slugify(page.title) + "-" + page.key.slice(0, 6),
          summary: "",
          category: category(page.url),
          document: converted.document,
          coverId: null,
          coverAlt: "",
        },
      };
      records.push(record);
    }
    record.sourceUrl = page.url;
    record.content.title = page.title;
    record.content.document = converted.document;
    record.content.origin = {
      url: page.url,
      publishedOn: page.publishedOn,
      author: page.author,
      retrievedOn: page.retrievedOn,
    };
    // The initial full import copied 355 raw characters, including CV contact details.
    // Keep curated summaries on pre-existing records and rebuild generated ones.
    if (record.key.startsWith("full-"))
      record.content.summary = listingSummary(record, converted.document);
    if (page.coverImage) {
      record.content.coverId = asset(page.coverImage, page.title);
      record.content.coverAlt = page.title.slice(0, 300);
    }
    if (!record.content.coverId && converted.images.length) {
      record.content.coverId = asset(converted.images[0], page.title);
      record.content.coverAlt = page.title.slice(0, 300);
    }
    canonical.set(signature, { record, source });
    coverage.push({
      key: record.key,
      url: page.url,
      sourceKey: page.key,
      bodyHash: page.bodyHash,
      textHash: converted.textHash,
      characters: converted.characters,
      images: converted.images.length,
      links: converted.links.length,
    });
  }
  mappings.set(page.url, "/vi/tin-tuc/" + record.content.slug);
}
// Explicitly reviewed legacy links can recover a missing URL through another
// article listed by the source website. Retain the original HTTP failure report.
const recovered = sourceAliases.map((alias) => {
  if (new URL(alias.url).origin !== "https://lrd.ctu.edu.vn")
    throw new Error("Unexpected legacy origin: " + alias.url);
  const destination = mappings.get(alias.target);
  if (!destination) throw new Error("Alias target was not imported: " + alias.target);
  if (mappings.has(alias.url)) throw new Error("Alias already has content: " + alias.url);
  mappings.set(alias.url, destination);
  const missing = skipped.find((item) => item.url === alias.url);
  if (missing) missing.recoveredTo = destination;
  return { ...alias, destination };
});
const mappedLink = (href) => {
  try {
    const u = new URL(href);
    if (u.hash) return href;
    return mappings.get(u.origin + u.pathname) ?? href;
  } catch {
    return href;
  }
};
const formatting = [];
for (const { record, source } of canonical.values()) {
  const converted = convert(source, {
    image: (url) => asset(url, source.title),
    link: mappedLink,
  });
  record.content.document = converted.document;
  formatting.push({ key: record.key, slug: record.content.slug, ...converted.formatStats });
}
// The existing Academics pages keep current validated codes/dates. Their source articles
// remain available in full, including historical details and original formatting.
for (const record of records.filter((r) => r.kind !== "articles")) {
  const url = oldInventory[record.sourcePages?.[0]]?.url;
  const target = mappings.get(url);
  if (target) {
    const resources = (record.content.resources ?? []).filter(
      (r) => r.label !== "Nội dung bài gốc đầy đủ",
    );
    record.content.resources = [...resources, { label: "Nội dung bài gốc đầy đủ", url: target }];
  }
}
for (const [url, destination] of mappings) {
  const source = new URL(url).pathname;
  const existingRedirect = redirects.find((r) => r.source === source);
  if (!existingRedirect) redirects.push({ source, destination, statusCode: 301 });
  else if (sourceAliases.some((alias) => alias.url === url))
    existingRedirect.destination = destination;
}
manifest.version = 1;
manifest.description =
  "Toàn văn phần thân bài, bảng, liên kết và ảnh từ các trang nguồn truy cập được; giữ bản ghi và lịch sử đã nhập.";
manifest.fullImport = {
  capturedPages: pages.length,
  articles: coverage.length,
  aliases: mappings.size - coverage.length,
  skipped,
  recovered,
};
await writeFile(resolve(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
await writeFile(
  resolve(directory, "full-coverage.json"),
  JSON.stringify(
    { sources: coverage, aliases: Object.fromEntries(mappings), skipped, recovered },
    null,
    2,
  ) + "\n",
);
await writeFile(
  resolve(directory, "format-report.json"),
  JSON.stringify(
    {
      articles: formatting.length,
      totals: Object.fromEntries(
        Object.keys(formatting[0])
          .filter((key) => !["key", "slug"].includes(key))
          .map((key) => [key, formatting.reduce((total, article) => total + article[key], 0)]),
      ),
      records: formatting,
    },
    null,
    2,
  ) + "\n",
);
await writeFile(
  resolve(root, "apps/web/src/lib/legacy-redirects.json"),
  JSON.stringify(redirects, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    {
      records: records.length,
      articles: coverage.length,
      assets: Object.keys(manifest.assets).length,
      redirects: redirects.length,
      skipped,
    },
    null,
    2,
  ),
);
