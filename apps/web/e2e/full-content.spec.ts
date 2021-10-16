import { test, expect, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { recordFixture, runtimeDirectory } from "./fixtures";
import type { RichNode } from "../src/lib/contracts";
import { isStructuredReference } from "./reference-structured";

const manifest = JSON.parse(
  readFileSync(resolve(__dirname, "../../../data/reference-site/manifest.json"), "utf8"),
);
const coverage = JSON.parse(
  readFileSync(resolve(__dirname, "../../../data/reference-site/full-coverage.json"), "utf8"),
);
const plain = (n: RichNode): string => (n.text ?? "") + (n.content ?? []).map(plain).join("");
const fingerprint = (n: RichNode) =>
  createHash("sha256").update(plain(n).replace(/\s+/gu, "")).digest("hex");
const nodes = (n: RichNode): RichNode[] => [n, ...(n.content ?? []).flatMap(nodes)];
async function mutate(
  request: APIRequestContext,
  path: string,
  data: unknown,
  version?: number,
  method = "POST",
) {
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  const response = await request.fetch("/api/v1" + path, {
    method,
    data,
    headers: {
      [csrf.headerName]: csrf.token,
      "Idempotency-Key": randomUUID(),
      ...(version === undefined ? {} : { "If-Match": '"' + version + '"' }),
    },
  });
  expect(response.ok(), (await response.text()).slice(0, 500)).toBeTruthy();
  return response.json();
}

test("toàn văn: đối chiếu tất cả bài và ảnh; CMS sửa bảng, chú thích và ngày nguồn không mất dữ liệu", async ({
  page,
  request,
}) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires full source import");
  test.setTimeout(240000);
  const { formatAboutArticle } = await import(
    pathToFileURL(resolve(__dirname, "../../../scripts/reference/about-article.mjs")).href
  );
  const images = new Set<string>(),
    publicArticles = new Map<string, any>();
  for (const item of coverage.sources) {
    const record = manifest.records.find((r: { key: string }) => r.key === item.key);
    if (isStructuredReference(record)) continue;
    const response = await request.get(
      "/api/v1/public/content/by-slug/" + record.content.slug + "?locale=vi",
    );
    expect(response.status(), item.key).toBe(200);
    const article = await response.json();
    publicArticles.set(item.key, article);
    // The department introduction was deliberately edited into the approved outline.
    // All other source articles still use the original full-text fingerprint.
    const edited =
      record.content.slug === "gioi-thieu-bo-mon-tai-nguyen-dat-dai"
        ? (formatAboutArticle(record.content.document) as RichNode)
        : undefined;
    expect(fingerprint(article.document), item.key).toBe(
      edited ? fingerprint(edited) : item.textHash,
    );
    const bodyImages = nodes(article.document).filter((n) =>
      ["image", "inlineImage"].includes(n.type),
    );
    expect(bodyImages.length, item.key).toBe(
      edited
        ? nodes(edited).filter((n) => ["image", "inlineImage"].includes(n.type)).length
        : item.images,
    );
    for (const n of bodyImages) images.add(String(n.attrs!.assetId));
    expect(article.origin.publishedOn).toBe(record.content.origin.publishedOn);
  }
  for (const id of images)
    expect((await request.get("/api/v1/public/media/" + id)).status(), id).toBe(200);

  const source = publicArticles.get("article-25"),
    gallery = publicArticles.get("article-57");
  await page.goto(gallery.publicUrl);
  await expect(page.locator(".prose img")).toHaveCount(12);
  for (const img of await page.locator(".prose img").all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBeTruthy();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(source.publicUrl);
  await expect(page.locator(".prose table")).toHaveCount(3);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  const firstTable = page.locator(".table-scroll").first();
  expect(await firstTable.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  await firstTable.evaluate((element) => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 110);
  });
  await page.screenshot({ path: resolve(runtimeDirectory, "full-table-mobile.png") });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/content");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
  const created = await mutate(page.request, "/admin/content", { locale: "vi" });
  recordFixture("article", created.id);
  const image = nodes(gallery.document).find((n) => n.type === "image")!;
  const document = { ...source.document, content: [...source.document.content, image] };
  const draft = {
    title: "Kiểm thử toàn văn " + Date.now(),
    slug: "kiem-thu-toan-van-" + created.id,
    summary: source.summary,
    category: source.category,
    document,
    coverId: null,
    coverAlt: "",
    origin: source.origin,
  };
  await mutate(
    page.request,
    "/admin/content/" + created.id + "/draft",
    draft,
    created.version,
    "PATCH",
  );
  await page.goto("/admin/content/" + created.id);
  await expect(page.locator(".editor-prose table")).toHaveCount(3);
  await expect(page.getByLabel("Ngày đăng gốc", { exact: true })).toHaveValue(
    source.origin.publishedOn,
  );
  await page.locator(".editor-prose figure").last().click();
  await page.getByLabel("Chú thích ảnh", { exact: true }).fill("Chú thích được sửa trong CMS");
  await page.locator(".editor-prose table").first().locator("td,th").first().click();
  const rows = await page.locator(".editor-prose table").first().locator("tr").count();
  await page.getByRole("button", { name: "Thêm hàng", exact: true }).click();
  await expect(page.locator(".editor-prose table").first().locator("tr")).toHaveCount(rows + 1);
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".autosave")).toContainText("Đã lưu");
  const saved = await (await page.request.get("/api/v1/admin/content/" + created.id)).json();
  expect(fingerprint(saved.document)).toBe(fingerprint(document));
  expect(nodes(saved.document).find((n) => n.type === "image")!.attrs!.caption).toBe(
    "Chú thích được sửa trong CMS",
  );
  await page.getByRole("button", { name: "Đăng công khai", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bài viết đã được đăng công khai" }),
  ).toBeVisible();
  const published = await (await request.get("/api/v1/public/content/" + created.id)).json();
  expect(fingerprint(published.document)).toBe(fingerprint(document));
  expect(published.origin).toEqual(source.origin);
  await page.goto("/admin/media");
  await expect(page.getByRole("button", { name: "Xem thêm ảnh", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Xem thêm ảnh", exact: true }).click();
  await expect.poll(() => page.locator(".media-library figure").count()).toBeGreaterThan(60);
  await page.getByLabel("Tìm ảnh theo tên").fill("faculty.jpg");
  await page.getByRole("button", { name: "Tìm ảnh", exact: true }).click();
  await expect(page.locator(".media-library figure")).toHaveCount(1);
});
