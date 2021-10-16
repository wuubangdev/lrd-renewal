import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isStructuredReference } from "./reference-structured";

const manifest = JSON.parse(
  readFileSync(resolve(__dirname, "../../../data/reference-site/manifest.json"), "utf8"),
);
const articles = manifest.records.filter(
  (record: { kind: string; key: string; content?: { title?: string } }) =>
    record.kind === "articles" && !isStructuredReference(record),
);

test("bài viết còn ở dạng tự do đọc được trên điện thoại và không có chữ thân bài phóng lớn", async ({
  page,
}) => {
  test.skip(process.env.E2E_REFERENCE_DATA !== "1", "Requires imported reference articles");
  test.setTimeout(480000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const article of articles) {
    await page.goto(`/vi/tin-tuc/${article.content.slug}`, { waitUntil: "domcontentloaded" });
    const result = await page.evaluate(() => {
      const prose = document.querySelector<HTMLElement>(".article .prose");
      if (!prose) return null;
      const bodySize = parseFloat(getComputedStyle(prose).fontSize);
      const oversizedParagraphs = [...prose.querySelectorAll<HTMLElement>("p")].filter(
        (node) => parseFloat(getComputedStyle(node).fontSize) > bodySize + 0.5,
      ).length;
      return {
        overflow: document.documentElement.scrollWidth - innerWidth,
        oversizedParagraphs,
        title: document.querySelector(".article h1")?.textContent,
      };
    });
    expect(result, article.key).not.toBeNull();
    expect(result?.title, article.key).toBeTruthy();
    expect(result?.overflow, article.key).toBeLessThanOrEqual(1);
    expect(result?.oversizedParagraphs, article.key).toBe(0);
  }
});
