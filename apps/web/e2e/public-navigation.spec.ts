import { expect, test } from "@playwright/test";

test.beforeEach(() => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires published reference navigation");
});

test("menu một hàng ở cả hai ngôn ngữ và dropdown nằm dưới trong khung trang", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const locale of ["vi", "en"]) {
    for (const width of [901, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`/${locale}`);
      const header = page.locator(".public-header");
      const container = await header.locator(".container").boundingBox();
      const bounds = await header.boundingBox();
      const controls = page.locator(
        ".cms-navigation > .nav-group > summary, .cms-navigation > .nav-leaf > a",
      );
      const positions = await controls.evaluateAll((nodes) =>
        nodes.map((node) => node.getBoundingClientRect().y),
      );
      expect(positions.length).toBeGreaterThan(0);
      expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
      for (const group of await page.locator(".nav-group").all()) {
        await group.locator("summary").click();
        await expect(group).toHaveAttribute("open", "");
        const panel = await group.locator(".nav-dropdown").boundingBox();
        expect(panel!.x).toBeGreaterThanOrEqual(container!.x - 1);
        expect(panel!.x + panel!.width).toBeLessThanOrEqual(container!.x + container!.width + 1);
        expect(Math.abs(panel!.y - (bounds!.y + bounds!.height))).toBeLessThan(2);
        expect(panel!.y + panel!.height).toBeLessThanOrEqual(1001);
        await page.keyboard.press("Escape");
        await expect(group).not.toHaveAttribute("open", "");
        await expect(group.locator("summary")).toBeFocused();
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
  }
});

test("desktop đóng dropdown khi bấm ngoài và đánh dấu mục đang đọc", async ({ page }) => {
  await page.goto("/vi");
  const groups = page.locator(".nav-group");
  await groups.nth(0).locator("summary").click();
  await groups.nth(1).locator("summary").click();
  await expect(page.locator(".nav-group[open]")).toHaveCount(1);
  await page.locator(".public-header .brand").click();
  await expect(page.locator(".nav-group[open]")).toHaveCount(0);
  await groups.nth(0).locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(groups.nth(0)).toHaveAttribute("open", "");
  await page.locator(".header-contact-link").focus();
  await expect(groups.nth(0)).not.toHaveAttribute("open", "");
  await page.goto("/vi/dao-tao/ky-su-quan-ly-dat-dai");
  const active = page.locator(".cms-navigation > [data-active]");
  await expect(active).toHaveCount(1);
  await expect(active.locator("summary")).toContainText("Đào tạo");
  await active.locator("summary").click();
  await expect(active.locator('a[aria-current="page"]')).toHaveAttribute(
    "href",
    "/vi/dao-tao/ky-su-quan-ly-dat-dai",
  );
  await page.keyboard.press("Escape");
  const section = page.locator(".academic-detail-body > section[id]").first();
  await section.evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  const headerHeight = (await page.locator(".public-header").boundingBox())!.height;
  expect((await section.boundingBox())!.y).toBeGreaterThanOrEqual(headerHeight + 20);
  expect(
    await page
      .locator(".academic-detail-sidebar")
      .evaluate((node) => parseFloat(getComputedStyle(node).top)),
  ).toBeGreaterThanOrEqual(headerHeight + 20);
  await page.goto("/vi/tin-tuc?category=SINH_VIEN");
  await expect(page.locator(".cms-navigation > [data-active] > summary")).toHaveText("Sinh viên");
});

test("menu mobile giữ focus, cuộn riêng và khôi phục trang khi đóng", async ({ page }) => {
  for (const width of [320, 390, 768, 900]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/vi");
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: "instant" }));
    const originalScroll = await page.evaluate(() => window.scrollY);
    const toggle = page.locator(".public-menu-toggle");
    // Locator.click auto-scrolls sticky elements; use the visible button's screen position.
    const toggleBounds = (await toggle.boundingBox())!;
    await page.mouse.click(
      toggleBounds.x + toggleBounds.width / 2,
      toggleBounds.y + toggleBounds.height / 2,
    );
    const dialog = page.getByRole("dialog", { name: "Menu điều hướng" });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole("button", { name: "Đóng điều hướng", exact: true });
    await expect(close).toBeFocused();
    expect(await page.locator("#main").evaluate((node: HTMLElement) => node.inert)).toBe(true);
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("link", { name: "Switch to English" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    const groups = dialog.locator(".nav-group");
    await groups.nth(0).locator("summary").click();
    await groups.nth(1).locator("summary").click();
    await expect(dialog.locator(".nav-group[open]")).toHaveCount(1);
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(toggle).toBeFocused();
    expect(await page.locator("#main").evaluate((node: HTMLElement) => node.inert)).toBe(false);
    expect(await page.evaluate(() => document.documentElement.style.overflow)).not.toBe("hidden");
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - originalScroll)).toBeLessThan(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  }
});

test("mobile chọn link, bấm nền và chuyển sang desktop đều đóng menu", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 600 });
  await page.goto("/vi");
  await page.locator(".public-menu-toggle").click();
  await page.locator(".public-menu-backdrop").click({ position: { x: 20, y: 200 } });
  await expect(page.locator(".public-navigation-surface")).not.toBeVisible();
  await page.locator(".public-menu-toggle").click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".cms-navigation")).toBeVisible();
  expect(await page.locator("#main").evaluate((node: HTMLElement) => node.inert)).toBe(false);
  await page.setViewportSize({ width: 390, height: 600 });
  await page.locator(".public-menu-toggle").click();
  const group = page
    .locator(".nav-group")
    .filter({ has: page.locator('summary:text-is("Đào tạo")') });
  await group.locator("summary").click();
  await group.getByRole("link", { name: "Kỹ sư Quản lý đất đai", exact: true }).click();
  await expect(page).toHaveURL(/\/vi\/dao-tao\/ky-su-quan-ly-dat-dai$/);
  await expect(page.locator(".public-navigation-surface")).not.toBeVisible();
  expect(await page.locator("#main").evaluate((node: HTMLElement) => node.inert)).toBe(false);
});

test("hover desktop mở menu và giữ nguyên khi rê xuống hoặc quay lại menu con", async ({
  page,
}) => {
  await page.goto("/vi");
  const group = page.locator(".nav-group").first();
  await group.evaluate((node: HTMLDetailsElement) => {
    node.dataset.closedCount = "0";
    node.addEventListener("toggle", () => {
      if (!node.open) node.dataset.closedCount = String(Number(node.dataset.closedCount) + 1);
    });
  });
  await group.locator("summary").hover();
  await expect(group).toHaveAttribute("open", "");
  const child = group.locator(".nav-dropdown a").last();
  const childBounds = (await child.boundingBox())!;
  await page.mouse.move(
    childBounds.x + childBounds.width / 2,
    childBounds.y + childBounds.height / 2,
    { steps: 18 },
  );
  await page.waitForTimeout(320);
  await expect(group).toHaveAttribute("open", "");
  const brand = (await page.locator(".public-header .brand").boundingBox())!;
  await page.mouse.move(brand.x + 20, brand.y + 20);
  await page.waitForTimeout(100);
  await group.locator(".nav-dropdown a").first().hover();
  await page.waitForTimeout(320);
  await expect(group).toHaveAttribute("open", "");
  await expect(group).toHaveAttribute("data-closed-count", "0");
  await page.mouse.move(brand.x + 20, brand.y + 20);
  await expect(group).not.toHaveAttribute("open", "");
});

test("hover rồi click không đóng nhầm menu; chuyển nhóm và Escape không mở lại", async ({
  page,
}) => {
  await page.goto("/vi");
  const groups = page.locator(".nav-group");
  await groups.first().locator("summary").hover();
  await expect(groups.first()).toHaveAttribute("open", "");
  await groups.first().locator("summary").click();
  await expect(groups.first()).toHaveAttribute("open", "");
  await groups.first().locator("summary").click();
  await expect(groups.first()).not.toHaveAttribute("open", "");
  await groups.last().locator("summary").hover();
  await expect(groups.last()).toHaveAttribute("open", "");
  await expect(page.locator(".nav-group[open]")).toHaveCount(1);
  await groups.last().locator("summary").focus();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(320);
  await expect(page.locator(".nav-group[open]")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await groups.first().locator("summary").hover();
  await expect(groups.first()).toHaveAttribute("open", "");
  await expect(groups.first().locator(".nav-dropdown")).toHaveCSS("animation-name", "none");
});

test.describe("thiết bị cảm ứng", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("menu mobile mở và đóng accordion bằng tap", async ({ page }) => {
    await page.goto("/vi");
    await page.locator(".public-menu-toggle").tap();
    const group = page.locator(".nav-group").first();
    await group.locator("summary").tap();
    await expect(group).toHaveAttribute("open", "");
    await group.locator("summary").tap();
    await expect(group).not.toHaveAttribute("open", "");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Đóng điều hướng", exact: true })
      .tap();
    await expect(page.locator(".public-navigation-surface")).not.toBeVisible();
    expect(await page.locator("#main").evaluate((node: HTMLElement) => node.inert)).toBe(false);
  });
});
