import { test, expect, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { recordFixture } from "./fixtures";
const credentials = () => ({
  email: process.env.LRD_ADMIN_EMAIL!,
  password: process.env.LRD_ADMIN_PASSWORD!,
});
async function login(page: Page) {
  await page.goto("/admin/content");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email", { exact: true }).fill(credentials().email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(credentials().password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/content$/);
}
test("nhập DOCX vào bản nháp và xem trước nội dung bảng", async ({ page, context }) => {
  await login(page);
  await page.getByRole("button", { name: "Viết bài mới", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]+$/);
  const id = page.url().split("/").at(-1)!;
  recordFixture("article", id);
  await page
    .getByLabel("Chọn tệp Word để nhập")
    .setInputFiles(resolve(__dirname, "fixtures/import-sample.docx"));
  await expect(page.getByLabel("Tiêu đề bài viết", { exact: true })).toHaveValue("Tiêu đề từ Word");
  await expect(page.locator(".ProseMirror table")).toContainText("Ô bảng từ Word");
  await expect(page.locator(".ProseMirror strong")).toContainText("được in đậm");
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".autosave")).toContainText("Đã lưu");
  const anonymous = await context.browser()!.newContext();
  expect(
    (
      await anonymous.request.get(new URL(page.url()).origin + "/api/v1/public/content/" + id)
    ).status(),
  ).toBe(404);
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Xem trước", exact: true }).click();
  const preview = await popup;
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText("Tiêu đề từ Word");
  await expect(preview.locator(".prose table")).toContainText("Ô bảng từ Word");
  await anonymous.close();
});
test("đăng nhập, soạn bài, tải ảnh, đăng trực tiếp và giữ bản công khai khi sửa nháp", async ({
  page,
  context,
}) => {
  const stamp = Date.now(),
    title = "Kiểm thử xuất bản " + stamp,
    slug = "kiem-thu-xuat-ban-" + stamp;
  const browserErrors: string[] = [];
  page.on("pageerror", (e) => browserErrors.push(e.message));
  await login(page);
  await page.getByRole("button", { name: "Viết bài mới", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]+$/);
  const id = page.url().split("/").at(-1)!;
  recordFixture("article", id);
  await page.getByLabel("Tiêu đề bài viết", { exact: true }).fill(title);
  await page
    .getByLabel("Tóm tắt", { exact: true })
    .fill("Bài viết được tạo tự động để kiểm tra luồng biên tập và xuất bản.");
  await page.getByLabel("Đường dẫn bài viết", { exact: true }).fill(slug);
  await page.getByLabel("Tác giả hiển thị", { exact: true }).fill("TS. Tác giả Kiểm thử");
  await page
    .getByRole("textbox", { name: "Nội dung bài viết", exact: true })
    .fill(
      "Nội dung kiểm thử: kết nối giữa soạn thảo, lưu bản nháp, tải ảnh và xuất bản công khai hoạt động đầy đủ.",
    );
  await page.getByRole("button", { name: "Thêm ảnh đại diện" }).click();
  await page
    .getByLabel("Tệp ảnh", { exact: true })
    .setInputFiles(resolve(__dirname, "../public/images/campus.jpg"));
  await expect(page.locator(".media-choice.selected")).toBeVisible();
  const uploadedImage = await page.locator(".media-choice.selected img").getAttribute("src");
  recordFixture("asset", uploadedImage!.split("/").pop()!);
  await page.getByLabel("Mô tả ảnh", { exact: false }).fill("Khuôn viên khoa trong ảnh kiểm thử");
  await page.getByRole("button", { name: "Sử dụng ảnh" }).click();
  await page.getByRole("button", { name: "Chèn ảnh vào nội dung" }).click();
  await page.locator(".media-choice").first().click();
  await page
    .getByLabel("Mô tả ảnh", { exact: false })
    .last()
    .fill("Ảnh minh họa trong nội dung bài kiểm thử");
  await page.getByRole("button", { name: "Sử dụng ảnh" }).click();
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".autosave")).toContainText("Đã lưu");
  const anonymous = await context.browser()!.newContext();
  const base = new URL(page.url()).origin;
  expect((await anonymous.request.get(base + "/api/v1/public/content/" + id)).status()).toBe(404);
  const popup = context.waitForEvent("page");
  await page.getByRole("button", { name: "Xem trước", exact: true }).click();
  const preview = await popup;
  await expect(preview.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(preview.locator(".prose img")).toBeVisible();
  await preview.close();
  await page.getByRole("button", { name: "Đăng công khai", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Bài viết đã được đăng công khai" }),
  ).toBeVisible();
  const reader = await anonymous.newPage();
  await reader.goto(base + "/vi/tin-tuc/" + slug);
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(reader.locator(".article-byline")).toContainText("TS. Tác giả Kiểm thử");
  const image = reader.locator(".article-cover img");
  await expect(image).toBeVisible();
  await expect(reader.locator(".prose img")).toBeVisible();
  expect(
    await image.evaluate(
      (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
    ),
  ).toBeTruthy();
  await page.getByLabel("Tiêu đề bài viết", { exact: true }).fill(title + " · chỉnh sửa nháp");
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".autosave")).toContainText("Đã lưu");
  await reader.reload();
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title);
  await page.getByRole("button", { name: "Cập nhật công khai", exact: true }).click();
  await expect(page.locator(".alert.success")).toBeVisible();
  await reader.reload();
  await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title + " · chỉnh sửa nháp");
  // An expired route hint is renewed using the opaque backend session.
  await context.clearCookies({ name: "LRD_ROUTE" });
  await page.reload();
  await expect(page.getByLabel("Tiêu đề bài viết", { exact: true })).toHaveValue(
    title + " · chỉnh sửa nháp",
  );
  await page.getByRole("button", { name: "Lịch sử xuất bản" }).click();
  await expect(page.locator(".history-row")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Gỡ bài khỏi website", exact: true }).click();
  await expect(page.locator(".alert.success")).toContainText("Đã gỡ bài");
  expect((await anonymous.request.get(base + "/api/v1/public/content/" + id)).status()).toBe(404);
  const imageUrl = await image.getAttribute("src");
  expect((await anonymous.request.get(base + imageUrl)).status()).toBe(404);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  expect((await page.request.get(base + "/api/v1/admin/content")).status()).toBe(401);
  expect(browserErrors).toEqual([]);
  await anonymous.close();
});
test("giữ nội dung đang nhập khi hai tab sửa cùng một bài", async ({ page, context }) => {
  await login(page);
  await page.getByRole("button", { name: "Viết bài mới", exact: true }).first().click();
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]+$/);
  recordFixture("article", page.url().split("/").at(-1)!);
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.locator(".editor-workspace")).toHaveAttribute("aria-busy", "false");
  await page.getByLabel("Tiêu đề bài viết", { exact: true }).fill("Bản đã lưu từ tab thứ nhất");
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.locator(".autosave")).toContainText("Đã lưu");
  await other
    .getByLabel("Tiêu đề bài viết", { exact: true })
    .fill("Nội dung đang nhập ở tab thứ hai");
  await other.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(other.locator(".alert.error")).toContainText("đã được cập nhật");
  await expect(other.getByLabel("Tiêu đề bài viết", { exact: true })).toHaveValue(
    "Nội dung đang nhập ở tab thứ hai",
  );
  await expect(other.getByRole("button", { name: "Tải bản đang nhập" })).toBeVisible();
  await expect(other.getByRole("button", { name: "Đăng công khai", exact: true })).toBeDisabled();
});
test("chặn truy cập quản trị và không tin cookie phân quyền giả", async ({ page, context }) => {
  const base = process.env.E2E_BASE_URL ?? "http://localhost:3000";
  await context.addCookies([
    { name: "LRD_SESSION", value: "invalid-session", url: base },
    { name: "LRD_ROUTE", value: "admin", url: base },
  ]);
  await page.goto("/admin/content");
  await expect(page).toHaveURL(/\/admin\/login/);
  expect((await page.request.get("/api/v1/admin/content")).status()).toBe(401);
  expect((await page.request.post("/api/v1/auth/login", { data: credentials() })).status()).toBe(
    403,
  );
});
test("website và đăng nhập đọc được trên điện thoại", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/vi");
  const home = await (await page.request.get("/api/v1/public/site/home?locale=vi")).json();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(home.content.hero.title);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.goto("/admin/login");
  await expect(page.getByRole("button", { name: "Đăng nhập", exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
});
