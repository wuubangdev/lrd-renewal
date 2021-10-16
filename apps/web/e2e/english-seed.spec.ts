import { expect, test } from "@playwright/test";

test.beforeEach(() => {
  test.skip(process.env.E2E_ENGLISH_SEED !== "1", "Requires the reviewed English seed package");
});

test("English home and navigation resolve translated content", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".hero h1")).toContainText("Land Resources");
  await expect(page.locator(".public-footer")).toContainText("Department of Land Resources");
  const links = await page
    .locator('main a[href^="/vi"], .public-navigation a[href^="/vi"]')
    .count();
  expect(links).toBe(0);
  await page.goto("/en/tin-tuc/gioi-thieu-bo-mon-tai-nguyen-dat-dai");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("About the Department");
  await expect(page.getByRole("link", { name: "Chuyển sang tiếng Việt" })).toHaveAttribute(
    "href",
    "/vi/tin-tuc/gioi-thieu-bo-mon-tai-nguyen-dat-dai",
  );
});

test("English staff retain leadership spotlight and linked publications", async ({ page }) => {
  await page.goto("/en/can-bo");
  await expect(page.locator(".staff-leadership-card")).toHaveCount(3);
  await expect(page.locator(".staff-leadership-card").first()).toContainText("Phạm Thanh Vũ");
  await page.goto("/en/can-bo/pgs-ts-phan-kieu-diem-252429");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Phan Kiều Diễm");
  const people = await (await page.request.get("/api/v1/public/people?locale=en")).json();
  const staff = people.find(
    (x: { details: { name: string } }) => x.details.name === "Phan Kiều Diễm",
  );
  expect(staff.details.degree).toBe("PhD");
  const research = await (
    await page.request.get(`/api/v1/public/research/by-staff/${staff.id}?locale=en`)
  ).json();
  expect(research.length).toBeGreaterThan(0);
  for (const item of research)
    for (const author of item.authors)
      if (author.staffId) expect(author.staffUrl).toMatch(/^\/en\/can-bo\//);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test("English programmes, events and news render on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/en/dao-tao", "/en/tuyen-sinh", "/en/hoi-thao", "/en/tin-tuc"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    const images = page.locator("main img");
    for (const img of await images.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          img.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0),
        )
        .toBe(true);
    }
  }
});

test("CMS opens the seeded English counterpart of a Vietnamese article", async ({ page }) => {
  const source = await (
    await page.request.get(
      "/api/v1/public/content/by-slug/gioi-thieu-bo-mon-tai-nguyen-dat-dai?locale=vi",
    )
  ).json();
  await page.goto(`/admin/content/${source.id}`);
  await page.getByLabel("Email", { exact: true }).fill(process.env.LRD_ADMIN_EMAIL!);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(process.env.LRD_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const english = page.getByRole("link", { name: "Bản tiếng Anh", exact: true });
  await expect(english).toBeVisible();
  await english.click();
  await expect(page.getByRole("textbox", { name: "Tiêu đề bài viết", exact: true })).toHaveValue(
    "About the Department of Land Resources",
  );
});
