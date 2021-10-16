import { test, expect } from "@playwright/test";

test("bài giới thiệu giữ chiều rộng theo header và cỡ chữ thân bài trên mobile", async ({
  page,
}) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference article");
  await page.goto("/vi/tin-tuc/gioi-thieu-bo-mon-tai-nguyen-dat-dai");
  const header = await page.locator(".public-header .container").boundingBox();
  const heading = await page.locator(".article-heading").boundingBox();
  expect(Math.abs(header!.x - heading!.x)).toBeLessThan(1);
  expect(Math.abs(header!.width - heading!.width)).toBeLessThan(1);
  const bodySize = await page
    .locator(".article .prose")
    .evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  await expect(page.locator(".article .prose > h2")).toHaveCount(6);
  const lines = page.locator(".article .prose > p:not(:first-child), .article .prose li p");
  expect(await lines.count()).toBeGreaterThan(0);
  for (const line of await lines.all())
    expect(
      await line.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    ).toBeLessThanOrEqual(bodySize);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("bảng ảnh có chú thích thành bộ ảnh responsive", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference article");
  await page.goto("/vi/tin-tuc/chao-don-tan-sinh-vien-quan-ly-dat-dai-khoa-47-5b6773");
  const gallery = page.locator(".article-image-gallery");
  await expect(gallery.locator("figure")).toHaveCount(4);
  await gallery.scrollIntoViewIfNeeded();
  await expect(gallery.locator("figcaption").first()).toContainText("Hình 1");
  for (const image of await gallery.locator("img").all())
    await expect(image).toHaveAttribute("src", /\/api\/v1\/public\/media\//);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await gallery.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length),
  ).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
