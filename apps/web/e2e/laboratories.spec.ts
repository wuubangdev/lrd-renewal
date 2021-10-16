import { test, expect } from "@playwright/test";
import { recordFixture } from "./fixtures";

test("phòng thí nghiệm tham khảo chuyển sang đối tượng có cấu trúc", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference laboratories");
  const response = await page.request.get("/api/v1/public/laboratories?locale=vi");
  const labs = await response.json();
  expect(labs.length).toBeGreaterThanOrEqual(2);
  await page.goto("/vi/phong-thi-nghiem");
  await expect(page.locator(".lab-directory-item")).toHaveCount(labs.length);
  await page.goto("/vi/tin-tuc/phong-thi-nghiem-gis-va-vien-tham");
  await expect(page).toHaveURL(/\/vi\/phong-thi-nghiem\/phong-thi-nghiem-gis-va-vien-tham$/);
  await expect(page.getByRole("heading", { name: /GIS/ }).first()).toBeVisible();
  await expect(page.locator(".staff-section")).not.toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("CMS tạo phòng thí nghiệm, biên tập thiết bị và đăng công khai", async ({ page }) => {
  const slug = `phong-thi-nghiem-e2e-${Date.now()}`;
  await page.goto("/admin/laboratories");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/laboratories$/);
  const template = await page.request.get("/api/v1/admin/laboratories/spreadsheet/template");
  expect(template.ok()).toBe(true);
  expect((await template.body()).subarray(0, 2).toString()).toBe("PK");
  await page.getByRole("button", { name: "Tạo phòng thí nghiệm" }).click();
  await expect(page).toHaveURL(/\/admin\/laboratories\/[0-9a-f-]+$/);
  const id = page.url().split("/").pop()!;
  recordFixture("laboratory", id);
  await page.getByRole("textbox", { name: "Tên phòng *" }).fill("Phòng kiểm thử dữ liệu");
  await page.getByRole("textbox", { name: "Đường dẫn *" }).fill(slug);
  await page
    .getByRole("textbox", { name: "Giới thiệu ngắn *" })
    .fill("Không gian thực hành GIS và dữ liệu tài nguyên.");
  await page.getByRole("button", { name: /Tiếp theo: Thiết bị/ }).click();
  await page.getByRole("button", { name: "Thêm thiết bị" }).click();
  await page.getByRole("textbox", { name: "Tên thiết bị" }).fill("Máy toàn đạc");
  await page.getByRole("textbox", { name: "Số lượng" }).fill("02 bộ");
  await page.getByRole("button", { name: /Tiếp theo: Học phần/ }).click();
  await page.getByRole("button", { name: /Tiếp theo: Nghiên cứu/ }).click();
  await page.getByRole("button", { name: /Tiếp theo: Công bố/ }).click();
  await page.getByRole("button", { name: /Tiếp theo: Hiển thị/ }).click();
  await page.getByRole("button", { name: "Đăng công khai" }).click();
  await expect(page.getByRole("status")).toContainText("đăng công khai");
  await page.goto(`/vi/phong-thi-nghiem/${slug}`);
  await expect(page.getByRole("heading", { name: "Phòng kiểm thử dữ liệu" })).toBeVisible();
  await expect(page.locator(".lab-equipment")).toContainText("02 bộ");
  const csrf = await (await page.request.get("/api/v1/auth/csrf")).json();
  {
    const record = await (await page.request.get(`/api/v1/admin/laboratories/${id}`)).json();
    const response = await page.request.post(`/api/v1/admin/laboratories/${id}/withdraw`, {
      headers: { [csrf.headerName]: csrf.token, "If-Match": `"${record.version}"` },
    });
    expect(response.ok()).toBe(true);
  }
});
