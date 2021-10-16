import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { runtimeDirectory } from "./fixtures";

test("trang public: slider, reveal, về đầu trang và giảm chuyển động", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires published reference news");
  await page.goto("/vi");

  const slider = page.getByRole("region", { name: "Tin tức nổi bật" });
  const track = slider.locator(".news-grid");
  await expect(slider.getByRole("button", { name: "Tin trước" })).toBeDisabled();
  await expect(slider.getByRole("button", { name: "Tin tiếp theo" })).toBeEnabled();
  await slider.getByRole("button", { name: "Tin tiếp theo" }).click();
  await expect.poll(() => track.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await expect(slider.getByRole("button", { name: "Tin trước" })).toBeEnabled();
  const previousScroll = await track.evaluate((element) => element.scrollLeft);
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => track.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(previousScroll);

  const program = page.locator("#dao-tao .program").first();
  await program.scrollIntoViewIfNeeded();
  await expect(program).toHaveClass(/is-visible/);
  const top = page.getByRole("button", { name: "Về đầu trang" });
  await expect(top).toHaveClass(/is-visible/);
  await top.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(20);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(slider.getByRole("button", { name: "Tin tiếp theo" })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.locator("#tin-tuc").evaluate((element) => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 110);
  });
  await page.screenshot({ path: resolve(runtimeDirectory, "motion-home-mobile.png") });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      page
        .locator(".hero-content h1")
        .evaluate((element) => getComputedStyle(element).animationName),
    )
    .toBe("none");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    "auto",
  );
});
