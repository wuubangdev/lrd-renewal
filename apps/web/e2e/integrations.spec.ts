import { expect, test } from "@playwright/test";

test("quản trị viên cấu hình Gemini, kiểm tra kết nối trong modal và xóa khóa", async ({
  page,
}) => {
  await page.goto("/admin/integrations");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/integrations$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Tích hợp AI" })).toBeVisible();
  const current = await page.request.get("/api/v1/admin/integrations/gemini");
  expect(current.status()).toBe(200);
  const settings = await current.json();
  test.skip(settings.configured, "Giữ nguyên khóa Gemini đã cấu hình trong môi trường này.");

  try {
    await page.getByRole("button", { name: "Cấu hình & kiểm tra" }).click();
    const dialog = page.getByRole("dialog", { name: "Cấu hình Gemini" });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Khóa API").fill("local-e2e-key-not-a-real-secret");
    await page.route("**/api/v1/admin/integrations/gemini/test", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ connected: true, model: "gemini-2.5-flash" }),
      });
    });
    await dialog.getByRole("button", { name: "Kiểm tra kết nối" }).click();
    await expect(dialog.getByRole("status")).toContainText("Kết nối thành công");
    await page.unrouteAll();
    await dialog.getByRole("button", { name: "Lưu cấu hình" }).click();
    await expect(page.getByText("Đã cấu hình", { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText("Đã cấu hình", { exact: true })).toBeVisible();
    await expect(page.getByText("local-e2e-key-not-a-real-secret")).toHaveCount(0);
    const publicView = await page.request.get("/api/v1/admin/integrations/gemini");
    expect(JSON.stringify(await publicView.json())).not.toContain(
      "local-e2e-key-not-a-real-secret",
    );
  } finally {
    const token = await (await page.request.get("/api/v1/auth/csrf")).json();
    await page.request.delete("/api/v1/admin/integrations/gemini/key", {
      headers: { [token.headerName]: token.token },
    });
  }
  await page.reload();
  await expect(page.getByText("Chưa cấu hình", { exact: true })).toBeVisible();
});
