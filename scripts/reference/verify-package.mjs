import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { convert, sha256 } from "./source.mjs";

export async function verifyFullPackage(directory, manifest) {
  if (!manifest.fullImport) return;
  const coverage = JSON.parse(await readFile(resolve(directory, "full-coverage.json"), "utf8"));
  const pages = JSON.parse(await readFile(resolve(directory, "source/index.json"), "utf8"));
  const assets = new Map(Object.entries(manifest.assets).map(([key, value]) => [value.url, key]));
  for (const item of coverage.sources) {
    const page = pages.find((p) => p.key === item.sourceKey);
    const html = await readFile(resolve(directory, "source", page.key + ".html"), "utf8");
    assert.equal(sha256(html), item.bodyHash, "Source HTML changed: " + page.url);
    const expected = convert(
      { ...page, html },
      {
        image: (url) => {
          assert(assets.has(url), "Image not packaged: " + url);
          return { $asset: assets.get(url) };
        },
        link: (href) => {
          const u = new URL(href);
          return u.hash ? href : (coverage.aliases[u.origin + u.pathname] ?? href);
        },
      },
    );
    const record = manifest.records.find((r) => r.key === item.key);
    assert.equal(expected.textHash, item.textHash, "Text coverage changed: " + item.key);
    assert.equal(expected.images.length, item.images, "Image coverage changed: " + item.key);
    assert.deepEqual(
      record.content.document,
      expected.document,
      "Full body differs from source: " + item.key,
    );
    assert.equal(record.content.title, page.title, "Original title changed: " + item.key);
    if (page.coverImage)
      assert.deepEqual(
        record.content.coverId,
        { $asset: assets.get(page.coverImage) },
        "Original cover changed: " + item.key,
      );
    assert.equal(
      record.content.origin.publishedOn,
      page.publishedOn,
      "Source date changed: " + item.key,
    );
  }
  assert.equal(
    coverage.sources.length,
    manifest.records.filter((r) => r.kind === "articles").length,
    "An article is missing full coverage",
  );
}
