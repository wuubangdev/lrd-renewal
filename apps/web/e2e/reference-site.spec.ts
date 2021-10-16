import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runtimeDirectory } from "./fixtures";
import { isStructuredReference } from "./reference-structured";

test("dữ liệu website gốc: CMS, tài liệu, public, ảnh và chuyển hướng URL", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.E2E_REFERENCE_DATA !== "1",
    "Run seed:reference and set E2E_REFERENCE_DATA=1.",
  );
  test.setTimeout(240000);
  const data = JSON.parse(
    readFileSync(resolve(__dirname, "../../../data/reference-site/manifest.json"), "utf8"),
  );
  const redirects = JSON.parse(
    readFileSync(resolve(__dirname, "../src/lib/legacy-redirects.json"), "utf8"),
  );
  const media = new Set<string>();
  for (const r of data.records) {
    if (isStructuredReference(r)) continue;
    const path =
      r.kind === "articles" ? "/public/content/by-slug/" : "/public/academics/" + r.kind + "/";
    const response = await request.get("/api/v1" + path + r.content.slug + "?locale=vi");
    expect(response.status(), r.key).toBe(200);
    const view = await response.json();
    const content = r.kind === "articles" ? view : view.content;
    expect(content.title).toBe(r.content.title);
    if (content.coverId) media.add(content.coverId);
    if (r.kind !== "articles") {
      expect(content.resources).toEqual(r.content.resources);
      expect(content.source).toEqual(r.content.source);
    }
    if (r.kind === "admissions") {
      expect(view.status).toBe(
        r.content.closesAt && Date.now() >= Date.parse(r.content.closesAt) ? "CLOSED" : "NOTICE",
      );
      expect(view.programs[0].quota).toBe(r.content.programs[0].quota);
    }
  }
  for (const redirect of redirects) {
    const response = await request.get(redirect.source, { maxRedirects: 0 });
    expect(response.status(), redirect.source).toBe(301);
    expect(
      new URL(response.headers().location, "http://localhost").pathname +
        new URL(response.headers().location, "http://localhost").search,
    ).toBe(redirect.destination);
  }
  for (const id of media)
    expect((await request.get("/api/v1/public/media/" + id)).status(), id).toBe(200);
  await page.goto("/vi");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tài nguyên Đất đai");
  await expect(
    page.getByRole("heading", { name: "Thông tin tuyển sinh", exact: true }),
  ).toBeVisible();
  // Scroll lazy images into view before capturing the whole page.
  for (const img of await page.locator('img[loading="lazy"]').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0))
      .toBeTruthy();
  }
  for (const section of await page.locator("#main [data-reveal]").all()) {
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveClass(/is-visible/);
  }
  await page.locator(".news-slider .news-grid").evaluate((element) => (element.scrollLeft = 0));
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({
    path: resolve(runtimeDirectory, "reference-home-desktop.png"),
    fullPage: true,
  });
  await page.goto("/vi/tuyen-sinh/tuyen-sinh-quan-ly-dat-dai-2026");
  await expect(page.getByText("Theo thông báo", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Xem thông báo chính thức" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nộp hồ sơ trực tuyến" })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.screenshot({
    path: resolve(runtimeDirectory, "reference-admission-mobile.png"),
    fullPage: true,
  });
  await page.goto("/vi/dao-tao/ky-su-quan-ly-dat-dai");
  await expect(page.getByRole("link", { name: "Khung chương trình từ khóa 50" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/admin/programs");
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/programs$/);
  await page.getByRole("link", { name: "Kỹ sư Quản lý đất đai", exact: true }).click();
  await expect(page.getByLabel("URL nguồn chính thức", { exact: true })).toHaveValue(
    data.records.find((r: { key: string }) => r.key === "land").content.source.url,
  );
  await expect(page.getByLabel("Tên tài liệu 1", { exact: true })).toHaveValue(
    "Khung chương trình từ khóa 50",
  );
  await page.screenshot({
    path: resolve(runtimeDirectory, "reference-program-cms.png"),
    fullPage: true,
  });
});
