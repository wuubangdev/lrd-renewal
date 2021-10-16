import { test, expect } from "@playwright/test";

test("giao diện public giữ tương phản và vị trí nút ổn định", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires published reference content");
  await page.goto("/vi");

  const heroTitle = page.locator(".hero h1");
  await expect(heroTitle).toHaveCSS("color", "rgb(255, 255, 255)");
  const primary = page.locator(".hero .button").first();
  await expect(primary).toHaveCSS("cursor", "pointer");
  await primary.scrollIntoViewIfNeeded();
  await expect(primary).toBeVisible();
  const documentPosition = () =>
    primary.evaluate((node) => {
      const box = node.getBoundingClientRect();
      return { x: box.x + scrollX, y: box.y + scrollY, width: box.width, height: box.height };
    });
  const before = await documentPosition();
  await primary.hover();
  await expect
    .poll(async () => Math.abs((await documentPosition()).y - before.y))
    .toBeLessThan(0.5);
  const after = await documentPosition();
  expect(Math.abs(after.x - before.x)).toBeLessThan(0.5);
  expect(after.width).toBe(before.width);
  expect(after.height).toBe(before.height);

  await page.goto("/vi/dao-tao");
  await expect(page.locator(".education-list-hero h1")).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.locator(".education-switch a").first()).toHaveCSS("cursor", "pointer");
});

test("slider tin tức không cắt bài trên mobile", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires published reference news");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/vi");
  const slider = page.getByRole("region", { name: "Tin tức nổi bật" });
  const track = slider.locator(".news-grid");
  const first = track.locator(".news-item").first();
  await first.scrollIntoViewIfNeeded();
  const trackBox = await track.boundingBox();
  const itemBox = await first.boundingBox();
  expect(trackBox).not.toBeNull();
  expect(itemBox).not.toBeNull();
  expect(Math.abs(trackBox!.width - itemBox!.width)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await expect(slider.getByRole("button", { name: "Tin tiếp theo" })).toBeEnabled();
});

test("chương trình trên trang chủ có thumbnail từ nội dung đã công khai", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires published reference programs");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/vi");
  const cards = page.locator("#dao-tao .program");
  await expect(cards).toHaveCount(4);
  for (const card of await cards.all()) {
    const image = card.locator(".program-thumbnail img");
    await expect(image).toHaveCount(1);
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
    await expect(card.locator(".program-thumbnail-link")).toHaveCSS("cursor", "pointer");
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("trang lưu trữ tin ưu tiên tiêu đề và ảnh gọn trên mobile", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires published reference news");
  await page.goto("/vi/tin-tuc");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  const header = (await page.locator(".public-header .container").boundingBox())!;
  const featured = page.locator(".news-featured");
  const featuredBox = (await featured.boundingBox())!;
  expect(featuredBox.x).toBe(header.x);
  expect(featuredBox.width).toBe(header.width);
  const title = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  const search = (await page.getByRole("search").boundingBox())!;
  expect(search.y).toBeGreaterThan(title.y + title.height);
  expect(featuredBox.y).toBeGreaterThan(search.y + search.height);
  const list = page.locator(".news-archive .news-grid");
  await expect(list.locator(".news-item")).toHaveCount(9);
  await expect(list).toHaveCSS("grid-template-columns", /\d/);
  const first = list.locator(".news-item").first();
  const desktopImage = await first.locator(".news-image").boundingBox();
  expect(desktopImage!.width).toBe(248);

  await page.setViewportSize({ width: 390, height: 844 });
  const image = await first.locator(".news-image").boundingBox();
  const copy = await first.locator(".news-copy").boundingBox();
  expect(image!.width).toBe(92);
  expect(copy!.x).toBeLessThan(image!.x);
  expect((await featured.boundingBox())!.height).toBeLessThan(650);
  for (const width of [320, 768, 1024]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = (await featured.boundingBox())!;
    expect(bounds.x).toBeGreaterThan(0);
    expect(bounds.x + bounds.width).toBeLessThan(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("trang tin giữ phân trang trong màn hình nhỏ và hiển thị trạng thái tìm kiếm đúng", async ({
  page,
}) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires published reference news");
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/vi/tin-tuc?page=1");
  await expect(page.locator(".news-featured")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Trang trước", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Trang sau", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByLabel("Tìm kiếm bài viết", { exact: true }).fill("qa-khong-co-bai-viet-20261016");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(page).not.toHaveURL(/page=1/);
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy bài viết", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".news-featured")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Phân trang", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.locator(".news-featured")).toHaveCount(1);
  await expect(page.getByLabel("Tìm kiếm bài viết", { exact: true })).toHaveValue("");
  await page.goto("/en/tin-tuc?q=qa-khong-co-bai-viet-20261016");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("News & activities");
  await expect(
    page.getByRole("heading", { name: "No matching articles", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Clear filters", exact: true })).toHaveAttribute(
    "href",
    "/en/tin-tuc",
  );
});
