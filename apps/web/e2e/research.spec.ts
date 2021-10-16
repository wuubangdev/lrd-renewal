import { test, expect } from "@playwright/test";

test("menu nghiên cứu dẫn đến bản ghi và liên kết tác giả về cán bộ", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported research records");
  await page.goto("/vi");
  const menu = page.getByRole("navigation", { name: /điều hướng|chính/i });
  await menu.locator("summary").filter({ hasText: "Nghiên cứu" }).click();
  await expect(menu.getByRole("link", { name: "Nghiên cứu", exact: true })).toHaveAttribute(
    "href",
    "/vi/nghien-cuu",
  );
  await page.goto("/vi/nghien-cuu/giao-trinh");
  await expect(page.getByRole("heading", { name: "Giáo trình & sách" })).toBeVisible();
  await expect(page.locator(".research-card")).toHaveCount(11);
  await page.locator(".research-card a").first().click();
  await expect(page.locator(".research-detail h1")).toBeVisible();
  await expect(page.locator(".research-authors a").first()).toHaveAttribute(
    "href",
    /\/vi\/can-bo\//,
  );
  await page.locator(".research-authors a").first().click();
  await expect(page).toHaveURL(/\/vi\/can-bo\//);
  await expect(page.locator(".staff-research")).toBeVisible();
});

test("danh mục công bố và tài liệu hiện đủ đối tượng đã nhập", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported research records");
  const counts = [
    ["PROJECT", 85],
    ["JOURNAL_ARTICLE", 335],
    ["CONFERENCE_PAPER", 68],
    ["TEXTBOOK", 11],
    ["DOCUMENT", 2],
  ] as const;
  for (const [kind, count] of counts) {
    const response = await page.request.get(
      `/api/v1/public/research?kind=${kind}&locale=vi&page=0&size=1`,
    );
    expect(response.ok()).toBe(true);
    expect((await response.json()).total).toBe(count);
  }
  await page.goto("/vi/nghien-cuu/tai-lieu");
  await expect(page.locator(".research-card")).toHaveCount(2);
  await page.locator(".research-card a").first().click();
  await expect(page.getByRole("link", { name: /Xem tài liệu/ })).toHaveAttribute("href", /^https:/);
});
