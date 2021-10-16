import { test, expect } from "@playwright/test";
import { recordFixture } from "./fixtures";

test("hồ sơ cán bộ tham khảo dùng mẫu thống nhất và URL cũ chuyển tiếp", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference profiles");
  const profiles = await (await page.request.get("/api/v1/public/people?locale=vi")).json();
  expect(profiles.length).toBeGreaterThanOrEqual(17);
  expect(
    profiles.every((person: { details: { privateNotes: string } }) => !person.details.privateNotes),
  ).toBe(true);
  await page.goto("/vi/can-bo");
  await expect(page.locator(".staff-leadership-card")).toHaveCount(3);
  await expect(page.locator(".staff-directory-card")).toHaveCount(profiles.length - 3);
  await expect(page.locator(".staff-leadership-card").first()).toContainText("Phạm Thanh Vũ");
  await expect(page.locator(".staff-leadership-card").nth(1)).toContainText("Phan Kiều Diễm");
  await expect(page.locator(".staff-leadership-card").nth(2)).toContainText("Trương Chí Quang");
  await page.goto("/vi/tin-tuc/pgs-ts-pham-thanh-vu-d5c25b");
  await expect(page).toHaveURL(/\/vi\/can-bo\/pgs-ts-pham-thanh-vu-d5c25b$/);
  await expect(page.getByRole("heading", { name: /Phạm Thanh Vũ/ })).toBeVisible();
  await expect(page.locator(".staff-structured-facts").first()).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("các mục công tác và nghiên cứu dùng đủ chiều ngang, danh sách cân đối", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference profiles");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/vi/can-bo/ts-huynh-thi-thu-huong-32358f");
  await expect(page.locator("#muc-4 h2")).toContainText("Quá trình công tác");
  await expect(page.locator("#muc-5 h2")).toContainText("Đề tài và dự án nghiên cứu");
  await expect(page.locator("#muc-6 h2")).toContainText("Công trình khoa học");
  const layout = await page.evaluate(() => {
    const hero = document.querySelector(".staff-hero")!.getBoundingClientRect();
    const section = document.querySelector("#muc-5")!.getBoundingClientRect();
    const cards = [...document.querySelectorAll("#muc-5 li")]
      .slice(0, 2)
      .map((item) => item.getBoundingClientRect());
    const career = [...document.querySelectorAll("#muc-4 .staff-timeline-item")]
      .slice(0, 2)
      .map((item) => item.getBoundingClientRect());
    return { heroWidth: hero.width, sectionWidth: section.width, cards, career };
  });
  expect(layout.sectionWidth).toBeGreaterThan(layout.heroWidth * 0.95);
  expect(layout.cards[1].left).toBeGreaterThan(layout.cards[0].left);
  expect(layout.cards[0].width).toBeGreaterThan(400);
  expect(layout.career[1].left).toBeGreaterThan(layout.career[0].left);
  expect(layout.career[0].width).toBeGreaterThan(400);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("CMS tạo hồ sơ, chọn mẫu, đăng công khai và giữ ghi chú nội bộ", async ({ page }) => {
  const slug = `can-bo-e2e-${Date.now()}`;
  await page.goto("/admin/staff");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/staff$/);
  await page.getByRole("button", { name: "Tạo hồ sơ" }).click();
  await expect(page).toHaveURL(/\/admin\/staff\/[0-9a-f-]+$/);
  recordFixture("staff", page.url().split("/").pop()!);
  await page.getByRole("textbox", { name: "Họ và tên *" }).fill("Nguyễn Văn Kiểm Thử");
  await page.getByRole("textbox", { name: "Đường dẫn hồ sơ" }).fill(slug);
  await page.getByRole("textbox", { name: "Học vị cao nhất" }).fill("Tiến sĩ");
  await page.getByRole("button", { name: /Tiếp theo: Đào tạo/ }).click();
  await page.getByRole("button", { name: "Thêm dòng" }).first().click();
  await page.getByRole("textbox", { name: "Bậc học / học vị" }).fill("Đại học");
  await page.getByRole("textbox", { name: "Chuyên ngành" }).fill("Quản lý đất đai");
  await page.getByRole("button", { name: /Tiếp theo:/ }).click();
  await page.getByRole("button", { name: /Tiếp theo:/ }).click();
  await page.getByRole("button", { name: /Tiếp theo:/ }).click();
  await page.getByRole("button", { name: /Tiếp theo:/ }).click();
  await page.getByRole("button", { name: /Tiếp theo:/ }).click();
  await page.getByRole("radio", { name: "Hồ sơ khoa học" }).check();
  await page.getByRole("textbox", { name: "Ghi chú chung" }).fill("Thông tin nội bộ E2E");
  await page.locator(".staff-step-actions").getByRole("button", { name: "Đăng công khai" }).click();
  await expect(page.getByRole("status")).toContainText("đăng công khai");
  const publicResponse = await page.request.get(`/api/v1/public/people/${slug}?locale=vi`);
  expect(publicResponse.ok()).toBe(true);
  const profile = await publicResponse.json();
  expect(profile.details.template).toBe("DOSSIER");
  expect(profile.details.privateNotes).toBe("");
  expect(profile.details.academic.undergraduate[0].major).toBe("Quản lý đất đai");
  await page.goto(`/vi/can-bo/${slug}`);
  await expect(page.getByRole("heading", { name: "Nguyễn Văn Kiểm Thử" })).toBeVisible();
  await expect(page.locator(".staff-records")).toContainText("Quản lý đất đai");
  await expect(page.getByText("Thông tin nội bộ E2E")).toHaveCount(0);
  await page.goto(`/admin/staff/${profile.id}`);
  await page.getByRole("button", { name: "Hiển thị & nội bộ" }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Gỡ hồ sơ" }).click();
  await expect(page.getByRole("status")).toContainText("Đã gỡ hồ sơ");
});
