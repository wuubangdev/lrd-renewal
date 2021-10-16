import { test, expect } from "@playwright/test";

test("bài viết công khai có tác giả và thẻ chia sẻ đầy đủ", async ({ page, context }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported articles");
  const listing = await (await page.request.get("/api/v1/public/content?locale=vi&size=1")).json();
  const slug = listing.items[0].slug as string;
  const article = await (
    await page.request.get(`/api/v1/public/content/by-slug/${slug}?locale=vi`)
  ).json();
  const path = `/vi/tin-tuc/${slug}`;
  const url = `http://localhost:8088${path}`;
  expect(article.byline.trim()).not.toBe("");
  await page.goto(path);
  await expect(page.locator(".article-byline")).toContainText(article.byline);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", url);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", url);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /^http:\/\/localhost:8088\//,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  expect(
    await page
      .locator('script[type="application/ld+json"]')
      .evaluate((element) => element.textContent),
  ).toContain(article.title);
  await expect(page.getByRole("link", { name: "Chia sẻ lên Facebook" })).toHaveAttribute(
    "href",
    new RegExp(encodeURIComponent(url)),
  );
  await expect(page.getByRole("link", { name: "Chia sẻ lên LinkedIn" })).toHaveAttribute(
    "href",
    new RegExp(encodeURIComponent(url)),
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Sao chép liên kết" }).click();
  await expect(page.getByRole("status")).toContainText("Đã sao chép liên kết");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
  const image = await page.request.get("/opengraph-image");
  expect(image.ok()).toBe(true);
  expect(image.headers()["content-type"]).toContain("image/png");
});
