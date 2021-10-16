import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { recordFixture } from "./fixtures";
const adminCredentials = () => ({
  email: process.env.LRD_ADMIN_EMAIL!,
  password: process.env.LRD_ADMIN_PASSWORD!,
});
async function login(
  page: Page,
  email = adminCredentials().email,
  password = adminCredentials().password,
  path = "/admin/users",
) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(path + "$"));
}
async function mutate(
  request: APIRequestContext,
  path: string,
  method: string,
  data: unknown,
  version?: number,
) {
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  return request.fetch("/api/v1" + path, {
    method,
    data,
    headers: {
      [csrf.headerName]: csrf.token,
      ...(version === undefined ? {} : { "If-Match": '"' + version + '"' }),
    },
  });
}
test("quản lý tài khoản, cấp quyền, reset một lần và tự đổi mật khẩu", async ({
  page,
  browser,
}) => {
  const email = "e2e-iam-" + Date.now() + "@test.invalid",
    password = randomBytes(20).toString("base64url") + "!a9";
  await login(page);
  await page.getByRole("button", { name: "Thêm tài khoản", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Thêm tài khoản", exact: true });
  await form.getByLabel("Họ và tên").fill("E2E Tài khoản biên tập");
  await form.getByLabel("Email", { exact: true }).fill(email);
  await form.getByRole("combobox", { name: "Vai trò", exact: true }).selectOption("AUTHOR");
  await form.getByRole("button", { name: "Tạo tài khoản", exact: true }).click();
  const resetDialog = page.getByRole("dialog", { name: "Liên kết đặt mật khẩu", exact: true });
  await expect(resetDialog).toBeVisible();
  const resetUrl = await resetDialog.getByLabel("Liên kết", { exact: true }).inputValue();
  await resetDialog.getByRole("button", { name: "Đóng", exact: true }).last().click();
  const accounts = await (await page.request.get("/api/v1/admin/users?q=" + email)).json();
  recordFixture("account", accounts.items[0].id);
  const userContext = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  });
  const user = await userContext.newPage();
  await user.goto(resetUrl);
  await expect(user).toHaveURL(/\/admin\/reset-password$/);
  await user.getByLabel("Mật khẩu mới", { exact: true }).fill(password);
  await user.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill(password);
  await user.getByRole("button", { name: "Cập nhật mật khẩu", exact: true }).click();
  await expect(user.getByRole("heading", { name: "Đã cập nhật mật khẩu" })).toBeVisible();
  await user.goto(resetUrl);
  await user.getByLabel("Mật khẩu mới", { exact: true }).fill(password);
  await user.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill(password);
  await user.getByRole("button", { name: "Cập nhật mật khẩu", exact: true }).click();
  await expect(user.locator(".alert.error")).toContainText("không hợp lệ");
  await login(user, email, password, "/admin/content");
  await expect(user.getByRole("link", { name: "Tài khoản", exact: true })).toHaveCount(0);
  expect((await user.request.get("/api/v1/admin/users")).status()).toBe(403);
  expect((await user.request.get("/api/v1/admin/site/home")).status()).toBe(403);
  expect((await user.request.get("/api/v1/admin/academics/programs")).status()).toBe(403);
  await user.goto("/admin/programs");
  await expect(user.getByRole("heading", { name: "Không có quyền truy cập" })).toBeVisible();
  await user.goto("/admin/site/home");
  await expect(user.getByRole("heading", { name: "Không có quyền truy cập" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Sửa " + email, exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Chỉnh sửa tài khoản" });
  await edit.getByRole("combobox", { name: "Vai trò", exact: true }).selectOption("EDITOR");
  await edit.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu tài khoản");
  expect((await user.request.get("/api/v1/auth/me")).status()).toBe(401);
  await login(user, email, password, "/admin/content");
  const me = await (await user.request.get("/api/v1/auth/me")).json();
  expect(me.permissions).toContain("content:update:any");
  expect(me.permissions).toContain("academics:manage");
  await user.getByRole("link", { name: "Bảo mật", exact: true }).click();
  await user.getByLabel("Mật khẩu hiện tại", { exact: true }).fill(password);
  await user.getByLabel("Mật khẩu mới", { exact: true }).fill(password + "2");
  await user.getByLabel("Nhập lại mật khẩu mới", { exact: true }).fill(password + "2");
  await user.getByRole("button", { name: "Cập nhật mật khẩu", exact: true }).click();
  await expect(user.getByRole("heading", { name: "Đã cập nhật mật khẩu" })).toBeVisible();
  await login(user, email, password + "2", "/admin/content");
  await page.reload();
  await page.getByRole("button", { name: "Sửa " + email, exact: true }).click();
  await edit.getByLabel("Cho phép đăng nhập").uncheck();
  await edit.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu tài khoản");
  expect((await user.request.get("/api/v1/auth/me")).status()).toBe(401);
  await page.goto("/admin/roles");
  await expect(page.getByRole("heading", { name: "Vai trò & quyền hạn" })).toBeVisible();
  await userContext.close();
});

test("CMS trang chủ và menu giữ nháp riêng, preview, đăng trực tiếp và responsive", async ({
  page,
  context,
  browser,
}) => {
  await login(page, undefined, undefined, "/admin/site/home");
  const home = await (await page.request.get("/api/v1/admin/site/home")).json();
  const menu = await (await page.request.get("/api/v1/admin/site/menu")).json();
  const readerContext = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  });
  const reader = await readerContext.newPage();
  const title = "Tri thức & kết nối " + Date.now();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.getByRole("textbox", { name: "Tiêu đề", exact: true }).first().fill(title);
    await page.getByRole("button", { name: "Chọn ảnh bìa", exact: true }).click();
    await page
      .getByLabel("Tệp ảnh", { exact: true })
      .setInputFiles(resolve(__dirname, "../public/images/campus.jpg"));
    await expect(page.locator(".media-choice.selected")).toBeVisible();
    await page
      .getByRole("dialog")
      .getByLabel("Mô tả ảnh", { exact: false })
      .fill("Ảnh bìa CMS kiểm thử");
    await page.getByRole("button", { name: "Sử dụng ảnh", exact: true }).click();
    await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu bản nháp");
    const draft = await (await page.request.get("/api/v1/admin/site/home")).json();
    recordFixture("asset", draft.content.heroImageId);
    await reader.goto("/vi");
    await expect(reader.getByRole("heading", { level: 1 })).toHaveText(home.content.hero.title);
    expect(
      (await reader.request.get("/api/v1/public/media/" + draft.content.heroImageId)).status(),
    ).toBe(404);
    const popup = context.waitForEvent("page");
    await page.getByRole("button", { name: "Xem trước", exact: true }).click();
    const preview = await popup;
    await expect(preview.getByRole("heading", { level: 1 })).toHaveText(title);
    await preview.close();
    await page.getByRole("button", { name: "Đăng công khai", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Đã đăng công khai");
    await reader.reload();
    await expect(reader.getByRole("heading", { level: 1 })).toHaveText(title);
    expect(
      (await reader.request.get("/api/v1/public/media/" + draft.content.heroImageId)).status(),
    ).toBe(200);
    await page.getByRole("button", { name: "Lịch sử xuất bản" }).click();
    await expect(page.locator(".release-row").first()).toBeVisible();
    await page
      .getByRole("dialog", { name: "Lịch sử xuất bản" })
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/admin/site/menu");
    await expect(page.locator(".site-editor")).toHaveJSProperty("inert", false);
    const first = page.locator(".menu-outline-item").first();
    await first.locator(".menu-outline-select").click();
    const detail = page.getByRole("region", { name: "Sửa mục menu" });
    await detail.getByLabel("Tên hiển thị", { exact: true }).fill("Khám phá bộ môn");
    await expect(first.locator(".menu-outline-select")).toContainText("Khám phá bộ môn");
    await detail.getByRole("button", { name: "Thêm mục con", exact: true }).click();
    const child = detail.locator(".menu-child-detail").last();
    await child.locator("summary").click();
    await child.getByLabel("Tên mục con", { exact: true }).fill("Tin mới từ bộ môn");
    await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Đã lưu bản nháp");
    await reader.reload();
    await expect(reader.locator(".cms-navigation")).not.toContainText("Khám phá bộ môn");
    await page.getByRole("button", { name: "Đăng công khai", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Đã đăng công khai");
    const publishedMenu = await (await page.request.get("/api/v1/admin/site/menu")).json();
    expect(publishedMenu.content.items[0].label).toBe("Khám phá bộ môn");
    await reader.reload();
    await reader.locator(".nav-group summary").filter({ hasText: "Khám phá bộ môn" }).click();
    await expect(
      reader.getByRole("link", { name: "Tin mới từ bộ môn", exact: true }),
    ).toBeVisible();
    await reader.getByRole("link", { name: "Tin mới từ bộ môn", exact: true }).focus();
    await reader.keyboard.press("Escape");
    await expect(
      reader.getByRole("link", { name: "Tin mới từ bộ môn", exact: true }),
    ).not.toBeVisible();
    await reader.setViewportSize({ width: 390, height: 844 });
    await reader.getByRole("button", { name: "Mở điều hướng", exact: true }).click();
    await reader.locator(".nav-group summary").filter({ hasText: "Khám phá bộ môn" }).click();
    await reader.getByRole("link", { name: "Tin mới từ bộ môn", exact: true }).click();
    await expect(reader).toHaveURL(/\/vi\/tin-tuc$/);
    expect(
      await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    expect(errors).toEqual([]);
  } finally {
    // Restore only the two documents this test changed, keeping the editor history intact.
    for (const [kind, original] of [
      ["home", home],
      ["menu", menu],
    ] as const) {
      const current = await (await page.request.get("/api/v1/admin/site/" + kind)).json();
      const saved = await mutate(
        page.request,
        "/admin/site/" + kind,
        "PATCH",
        original.content,
        current.version,
      );
      expect(saved.ok()).toBeTruthy();
      const d = await saved.json();
      expect(
        (
          await mutate(
            page.request,
            "/admin/site/" + kind + "/publish",
            "POST",
            { draftVersion: d.draftVersion },
            d.version,
          )
        ).ok(),
      ).toBeTruthy();
    }
    await readerContext.close();
  }
});
