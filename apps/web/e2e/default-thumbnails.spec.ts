import { expect, test } from "@playwright/test";

test("card dùng thumbnail theo loại khi thiếu ảnh và giữ ảnh thật", async ({ page }) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference records");

  await page.goto("/vi/tuyen-dung");
  const job = page.locator(".editorial-public-card .editorial-public-image img").first();
  await expect(job).toHaveAttribute("src", "/images/defaults/job.svg");
  await expect
    .poll(() => job.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);

  await page.goto("/vi/nghien-cuu/giao-trinh");
  const textbook = page.locator(".research-card-image img").first();
  await expect(textbook).toHaveAttribute("src", "/images/defaults/textbook.svg");
  await expect
    .poll(() => textbook.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.goto("/vi/dao-tao");
  await expect(page.locator(".education-row img").first()).toHaveAttribute(
    "src",
    /\/api\/v1\/public\/media\//,
  );

  const people = await (await page.request.get("/api/v1/public/people?locale=vi")).json();
  const withoutPortrait = people.find(
    (person: { details: { portraitId: string | null } }) => !person.details.portraitId,
  );
  expect(withoutPortrait).toBeTruthy();
  await page.goto("/vi/can-bo");
  const staff = page.locator(`.staff-directory-card[href$="/${withoutPortrait.details.slug}"] img`);
  await expect(staff).toHaveAttribute("src", "/images/defaults/staff.svg");
  await staff.scrollIntoViewIfNeeded();
  await expect
    .poll(() => staff.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
});
