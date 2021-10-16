import { test, expect } from "@playwright/test";

test("sidebar quản trị có nhóm rõ ràng và menu tablet/mobile đóng mở đúng", async ({ page }) => {
  await page.goto("/admin/content");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);

  const nav = page.getByRole("navigation", { name: "Điều hướng quản trị" });
  await expect(nav).toBeVisible();
  await expect(nav.getByText("Nội dung", { exact: true })).toBeVisible();
  await expect(nav.getByText("Website", { exact: true })).toBeVisible();
  await expect(nav.getByText("Hệ thống", { exact: true })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Bài viết" })).toHaveAttribute("aria-current", "page");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );

  for (const width of [900, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const open = page.getByRole("button", { name: "Mở menu" });
    await expect(open).toBeVisible();
    await expect(nav).toBeHidden();
    await open.click();
    await expect(nav).toBeVisible();
    await expect(page.getByRole("button", { name: "Đóng menu", exact: true })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await page.keyboard.press("Escape");
    await expect(nav).toBeHidden();
    await open.click();
    await page
      .getByRole("button", { name: "Đóng menu quản trị" })
      .click({ position: { x: width - 20, y: 100 } });
    await expect(nav).toBeHidden();
    await page.evaluate(() => window.scrollTo(1000, 0));
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
  }

  await page.goto("/admin/programs");
  const title = page.getByRole("heading", { name: "Chương trình đào tạo" });
  const create = page.getByRole("button", { name: "Tạo chương trình" });
  await expect(title).toBeVisible();
  await expect(create).toBeVisible();
  const titleBox = await title.boundingBox();
  const buttonBox = await create.boundingBox();
  expect(buttonBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);
  const table = page.getByRole("region", { name: "Danh sách Chương trình đào tạo" });
  expect(await table.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
});

test("thanh lưu dễ tìm, Ctrl+S lưu nháp và icon hiện tên thao tác", async ({ page }) => {
  await page.goto("/admin/site/home");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/site\/home$/);

  await page.getByRole("button", { name: "Lịch sử xuất bản" }).hover();
  await expect(page.locator(".admin-action-tooltip")).toHaveText("Lịch sử xuất bản");
  const title = page.getByRole("textbox", { name: "Tiêu đề", exact: true }).first();
  const original = await title.inputValue();
  try {
    await title.fill(original + " kiểm tra lưu");
    await expect(page.locator(".site-toolbar")).toContainText("Có thay đổi chưa lưu");
    await page.keyboard.press("ControlOrMeta+s");
    await expect(page.getByRole("status").filter({ hasText: "Đã lưu bản nháp" })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.locator(".site-toolbar")).toBeInViewport();
  } finally {
    await title.fill(original);
    await page.keyboard.press("ControlOrMeta+s");
    await expect(page.locator(".site-toolbar")).toContainText("Đã lưu nháp");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.locator(".site-toolbar")).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.goto("/admin/users");
  const editAccount = page.getByRole("button", { name: /^Sửa / }).first();
  await editAccount.hover();
  await expect(page.locator(".admin-action-tooltip")).toContainText("Sửa ");
});
