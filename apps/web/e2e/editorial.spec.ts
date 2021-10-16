import { test, expect } from "@playwright/test";

test("hội thảo, tin tức, tuyển dụng có hồ sơ gắn bài viết công khai", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference content");
  for (const [kind, path, min] of [
    ["EVENT", "/vi/hoi-thao", 9],
    ["JOB", "/vi/tuyen-dung", 6],
    ["NEWS", "/vi/tin-tuc", 4],
  ] as const) {
    const response = await page.request.get(`/api/v1/public/editorial?kind=${kind}&locale=vi`);
    expect(response.ok()).toBe(true);
    const items = await response.json();
    expect(items.length).toBeGreaterThanOrEqual(min);
    expect(
      items.every(
        (item: { details: { articleId: string }; articleUrl: string }) =>
          item.details.articleId && item.articleUrl.startsWith("/vi/tin-tuc/"),
      ),
    ).toBe(true);
    await page.goto(path);
    await expect(page.locator(".editorial-public-card")).toHaveCount(
      kind === "NEWS" ? Math.min(3, items.length) : items.length,
    );
    await page.locator(".editorial-public-card h2 a").first().click();
    await expect(page.locator(".editorial-detail-heading h1")).toBeVisible();
    await expect(page.locator(".article-main")).toBeVisible();
  }
  await page.goto("/admin/editorial?kind=EVENT");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hội thảo" })).toBeVisible();
  const template = await page.request.get("/api/v1/admin/editorial/events/spreadsheet/template");
  expect(template.ok()).toBe(true);
  expect((await template.body()).subarray(0, 2).toString()).toBe("PK");
  await page.locator(".staff-admin-row").first().click();
  await page.getByRole("navigation", { name: "Chủ đề hội thảo" }).getByRole("button", { name: /Bài viết/ }).click();
  await expect(page.getByRole("heading", { name: "Bài viết liên kết *" })).toBeVisible();
  await expect(page.getByText("Sửa nội dung bài viết")).toBeVisible();
});

test("CMS hội thảo lưu diễn giả và lịch trình theo trường cố định", async ({ page }) => {
  const suffix = Date.now();
  await page.goto("/admin/editorial?kind=EVENT");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await page.getByRole("button", { name: "Tạo hội thảo" }).click();
  await expect(page).toHaveURL(/\/admin\/editorial\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop()!;
  await page.getByRole("textbox", { name: "Tiêu đề *" }).fill(`Hội thảo kiểm thử ${suffix}`);
  await page.getByRole("textbox", { name: "Đường dẫn *" }).fill(`hoi-thao-e2e-${suffix}`);
  await page.getByRole("textbox", { name: "Mô tả ngắn *" }).fill("Hội thảo thử nghiệm cấu trúc dữ liệu.");
  await page.getByRole("button", { name: /Tiếp theo: Tổ chức/ }).click();
  await page.getByRole("textbox", { name: "Chủ đề hội thảo" }).fill("Ứng dụng GIS");
  await page.getByRole("combobox", { name: "Hình thức" }).selectOption("HYBRID");
  await page.getByRole("button", { name: /Tiếp theo: Diễn giả/ }).click();
  await page.getByRole("button", { name: "Thêm diễn giả" }).click();
  await page.getByRole("textbox", { name: "Họ và tên" }).fill("Nguyễn Văn A");
  await page.getByRole("button", { name: /Tiếp theo: Lịch trình/ }).click();
  await page.getByRole("button", { name: "Thêm phiên" }).click();
  await page.getByRole("textbox", { name: "Tên phiên" }).fill("Khai mạc");
  await page.getByRole("button", { name: "Lưu nháp" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  const record = await (await page.request.get(`/api/v1/admin/editorial/${id}`)).json();
  expect(record.draft.speakers[0].name).toBe("Nguyễn Văn A");
  expect(record.draft.sessions[0].title).toBe("Khai mạc");
  expect(record.draft.format).toBe("HYBRID");
});
