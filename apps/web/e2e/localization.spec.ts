import { expect, test } from "@playwright/test";

test("English homepage has translated content and language navigation", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: /Understand land/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chuyển sang tiếng Việt" })).toHaveAttribute(
    "href",
    "/vi",
  );
  await page.getByRole("link", { name: "Chuyển sang tiếng Việt" }).click();
  await expect(page).toHaveURL(/\/vi$/);
});

test("CMS exposes AI English draft creation for site content", async ({ page }) => {
  await page.goto("/admin/site/home");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/site\/home/);
  await expect(page.getByRole("button", { name: "Tạo bản tiếng Anh" })).toBeVisible();
  const missingLink = await page.request.get(
    "/api/v1/admin/localization/links/ARTICLE/00000000-0000-0000-0000-000000000001",
  );
  expect(missingLink.status()).toBe(204);
});
