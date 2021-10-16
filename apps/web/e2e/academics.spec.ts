import { test, expect, type Page, type APIRequestContext } from "@playwright/test";
import { resolve } from "node:path";
import { recordFixture as remember, runtimeDirectory as runtime } from "./fixtures";

async function mutate(
  request: APIRequestContext,
  path: string,
  data: unknown,
  version: number,
  method = "POST",
) {
  const csrf = await (await request.get("/api/v1/auth/csrf")).json();
  return request.fetch("/api/v1" + path, {
    method,
    data,
    headers: { [csrf.headerName]: csrf.token, "If-Match": '"' + version + '"' },
  });
}
async function fillCommon(page: Page, title: string, slug: string) {
  await page.getByRole("textbox", { name: "Tên hiển thị *", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "Đường dẫn *", exact: true }).fill(slug);
  await page
    .getByRole("textbox", { name: "Tóm tắt *", exact: true })
    .fill("Tìm hiểu chương trình quản lý tài nguyên đất đai.");
  await page
    .getByRole("textbox", { name: "Giới thiệu chi tiết *", exact: true })
    .fill("Nội dung kiểm thử đào tạo về quản lý đất đai, quy hoạch và phát triển bền vững.");
}
async function contact(page: Page) {
  await page.getByRole("tab", { name: "Liên hệ", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Đầu mối liên hệ *", exact: true })
    .fill("Văn phòng bộ môn");
  await page.getByRole("textbox", { name: "Email liên hệ *", exact: true }).fill("test@ctu.edu.vn");
}
test("CMS đào tạo và tuyển sinh: phiên bản, công khai, gia hạn, đóng và trang public", async ({
  page,
  browser,
}) => {
  test.setTimeout(240000);
  const suffix = Date.now().toString(),
    slug = "dao-tao-e2e-" + suffix,
    title = "Quản lý đất đai E2E " + suffix;
  await page.goto("/admin/programs");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/programs$/);
  await page.getByRole("button", { name: "Tạo chương trình", exact: true }).click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Mã định danh").fill("E2E-P-" + suffix);
  await create.getByRole("button", { name: "Tạo bản nháp" }).click();
  await expect(page).toHaveURL(/\/admin\/programs\/[0-9a-f-]+$/);
  const programId = page.url().split("/").pop()!;
  remember("program", programId);
  await fillCommon(page, title, slug);
  await page.getByRole("spinbutton", { name: "Thời lượng (tháng)", exact: true }).fill("48");
  await page
    .getByRole("spinbutton", { name: "Tổng tín chỉ chương trình", exact: true })
    .fill("120");
  await page.getByRole("button", { name: "Chọn ảnh đại diện", exact: true }).click();
  const uploaded = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/admin/media") && r.request().method() === "POST",
  );
  await page
    .getByLabel("Tệp ảnh", { exact: true })
    .setInputFiles(resolve(__dirname, "../public/images/campus.jpg"));
  remember("asset", (await (await uploaded).json()).id);
  await page.getByLabel(/Mô tả ảnh/).fill("Khuôn viên học tập");
  await page.getByRole("button", { name: "Sử dụng ảnh", exact: true }).click();
  await page.getByRole("button", { name: /Tiếp theo: Đầu ra & nghề nghiệp/ }).click();
  await page.getByRole("button", { name: "Thêm chuẩn đầu ra" }).click();
  await page.getByRole("textbox", { name: "Chuẩn đầu ra 1" }).fill("Phân tích dữ liệu tài nguyên đất");
  await page.getByRole("button", { name: "Thêm chuẩn đầu ra" }).click();
  await page.getByRole("textbox", { name: "Chuẩn đầu ra 2" }).fill("Lập quy hoạch sử dụng đất");
  await page.getByRole("button", { name: "Thêm cơ hội" }).click();
  await page.getByRole("textbox", { name: "Cơ hội nghề nghiệp 1" }).fill("Chuyên viên quản lý đất đai");
  await page.getByRole("button", { name: /Tiếp theo: Khung chương trình/ }).click();
  await page.getByRole("button", { name: "Thêm khung chương trình" }).click();
  await page
    .getByRole("textbox", { name: "Tên phiên bản *", exact: true })
    .fill("Khung chương trình khóa 52");
  await page.getByRole("textbox", { name: "Khóa áp dụng *", exact: true }).fill("52");
  await page.getByLabel("Hiệu lực từ *", { exact: true }).fill("2026-09-01");
  await page.getByLabel("Khung hiện hành cho khóa này").check();
  await page.getByRole("button", { name: "Thêm học phần" }).click();
  await page.getByRole("textbox", { name: "Mã học phần", exact: true }).fill("DD101");
  await page
    .getByRole("textbox", { name: "Tên học phần", exact: true })
    .fill("Cơ sở tài nguyên đất");
  await page.getByRole("button", { name: /Tiếp theo: Kiểm định/ }).click();
  await page.getByRole("button", { name: "Thêm chứng nhận" }).click();
  await page
    .getByRole("textbox", { name: "Tên chứng nhận *", exact: true })
    .fill("Chứng nhận kiểm thử");
  await page.getByRole("textbox", { name: "Tổ chức cấp *", exact: true }).fill("Đơn vị kiểm thử");
  await page.getByLabel("Ngày cấp *", { exact: true }).fill("2026-01-01");
  await page.getByLabel("Ngày hết hạn", { exact: true }).fill("2028-01-01");
  await page
    .getByRole("textbox", { name: "Minh chứng (HTTPS) *", exact: true })
    .fill("https://www.ctu.edu.vn/");
  await page.getByRole("button", { name: /Tiếp theo: Liên hệ/ }).click();
  await contact(page);
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  let program = await (
    await page.request.get("/api/v1/admin/academics/programs/" + programId)
  ).json();
  remember("asset", program.content.coverId);
  const readerContext = await browser.newContext({
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  });
  const reader = await readerContext.newPage();
  expect((await reader.request.get("/api/v1/public/academics/programs/" + slug)).status()).toBe(
    404,
  );
  expect(
    (await reader.request.get("/api/v1/public/media/" + program.content.coverId)).status(),
  ).toBe(404);
  await page.getByRole("button", { name: "Lưu và công khai", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã công khai");
  await reader.goto("/vi/dao-tao/" + slug);
  await expect(reader.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await expect(reader.getByRole("cell", { name: "DD101", exact: true })).toBeVisible();
  await expect(reader.getByText("Còn hiệu lực", { exact: true })).toBeVisible();
  await reader.screenshot({
    path: resolve(runtime, "academic-program-desktop.png"),
    fullPage: true,
  });
  await reader.setViewportSize({ width: 390, height: 844 });
  await reader.screenshot({
    path: resolve(runtime, "academic-program-mobile.png"),
    fullPage: true,
  });
  expect(await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByRole("tab", { name: "Thông tin chung", exact: true }).click();
  await page.getByRole("textbox", { name: "Đường dẫn *", exact: true }).fill(slug + "-moi");
  await page.getByRole("button", { name: "Lưu và công khai", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã công khai");
  await reader.goto("/vi/dao-tao/" + slug);
  await expect(reader).toHaveURL(new RegExp(slug + "-moi$"));
  await page.getByRole("link", { name: "Tuyển sinh", exact: true }).click();
  await page.getByRole("button", { name: "Tạo đợt tuyển", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Mã định danh")
    .fill("E2E-A-" + suffix);
  await page.getByRole("button", { name: "Tạo bản nháp", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/admissions\/[0-9a-f-]+$/);
  const admissionId = page.url().split("/").pop()!;
  remember("admission", admissionId);
  const admissionSlug = "tuyen-sinh-e2e-" + suffix;
  await fillCommon(page, "Tuyển sinh E2E " + suffix, admissionSlug);
  await page.getByRole("tab", { name: "Chương trình & chỉ tiêu", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Thêm chương trình vào đợt tuyển", exact: true })
    .selectOption(programId);
  await page.getByRole("spinbutton", { name: "Chỉ tiêu dự kiến", exact: true }).fill("40");
  await page.getByRole("tab", { name: "Điều kiện & hồ sơ", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Điều kiện / đối tượng dự tuyển *", exact: true })
    .fill("Tốt nghiệp trung học phổ thông");
  await page
    .getByRole("textbox", { name: "Phương thức xét tuyển *", exact: true })
    .fill("Xét kết quả học tập");
  await page
    .getByRole("textbox", { name: "Cổng nộp hồ sơ / thông báo chính thức (HTTPS) *", exact: true })
    .fill("https://www.ctu.edu.vn/");
  await page.getByRole("tab", { name: "Thời gian & lịch trình", exact: true }).click();
  const local = (offset: number) =>
    new Date(Date.now() + 7 * 3600000 + offset).toISOString().slice(0, 16);
  await page.getByLabel("Mở đăng ký", { exact: true }).fill(local(-86400000));
  await page.getByLabel("Đóng đăng ký", { exact: true }).fill(local(86400000));
  await page.getByRole("button", { name: "Thêm mốc thời gian" }).click();
  await page.getByRole("textbox", { name: "Tên mốc *", exact: true }).fill("Công bố kết quả");
  await page.getByLabel("Thời gian *", { exact: true }).fill(local(3 * 86400000));
  await contact(page);
  await page.getByRole("button", { name: "Lưu và công khai", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã công khai");
  await reader.goto("/vi/tuyen-sinh/" + admissionSlug);
  await expect(
    reader.getByRole("link", { name: "Nộp hồ sơ trực tuyến", exact: true }),
  ).toBeVisible();
  await expect(reader.getByRole("link", { name: title, exact: true })).toBeVisible();
  await reader.screenshot({
    path: resolve(runtime, "academic-admission-mobile.png"),
    fullPage: true,
  });
  expect(await reader.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.getByRole("tab", { name: "Thông tin chung", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Tên hiển thị *", exact: true })
    .fill("Bản nháp chưa công khai " + suffix);
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  await page.getByRole("button", { name: "Gia hạn", exact: true }).click();
  await page.getByLabel("Hạn đóng mới (giờ Việt Nam) *", { exact: true }).fill(local(2 * 86400000));
  await page.getByLabel("Lý do *", { exact: true }).fill("Bổ sung thời gian nhận hồ sơ");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("thành công");
  await reader.reload();
  await expect(
    reader.getByRole("heading", { name: "Tuyển sinh E2E " + suffix, exact: true }),
  ).toBeVisible();
  await expect(reader.getByText("Bổ sung thời gian nhận hồ sơ", { exact: true })).toBeVisible();
  program = await (await page.request.get("/api/v1/admin/academics/programs/" + programId)).json();
  expect(
    (
      await mutate(
        page.request,
        "/admin/academics/programs/" + programId + "/retire",
        { reason: "Ngừng chương trình kiểm thử" },
        program.version,
      )
    ).status(),
  ).toBe(422);
  await page.getByRole("button", { name: "Đóng sớm", exact: true }).click();
  await page.getByLabel("Lý do *", { exact: true }).fill("Đã đủ số lượng hồ sơ");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("thành công");
  await reader.reload();
  await expect(
    reader.getByRole("heading", { name: "Thông báo đóng sớm", exact: true }),
  ).toBeVisible();
  await expect(reader.getByRole("link", { name: "Nộp hồ sơ trực tuyến", exact: true })).toHaveCount(
    0,
  );
  await reader.goto("/vi/tuyen-sinh?status=OPEN&q=" + suffix);
  await expect(
    reader.getByRole("heading", { name: "Tuyển sinh E2E " + suffix, exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: resolve(runtime, "academic-cms.png"), fullPage: true });
  await page.getByRole("button", { name: "Gỡ công khai", exact: true }).click();
  await page.getByLabel("Lý do *", { exact: true }).fill("Kết thúc dữ liệu kiểm thử");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("thành công");
  await page.goto("/admin/programs/" + programId);
  await page.getByRole("button", { name: "Ngừng công khai", exact: true }).click();
  await page.getByLabel("Lý do *", { exact: true }).fill("Kết thúc dữ liệu kiểm thử");
  await page.getByRole("button", { name: "Xác nhận", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("thành công");
  expect((await reader.request.get("/api/v1/public/academics/programs/" + slug)).status()).toBe(
    404,
  );
  await readerContext.close();
});
