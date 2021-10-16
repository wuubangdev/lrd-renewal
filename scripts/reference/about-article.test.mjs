import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { aboutOutline, formatAboutArticle } from "./about-article.mjs";

const manifestFile = fileURLToPath(new URL("../../data/reference-site/manifest.json", import.meta.url));
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
const article = manifest.records.find((record) => record.content?.slug === "gioi-thieu-bo-mon-tai-nguyen-dat-dai");

test("department article has a concise outline and keeps its source material", () => {
  const document = formatAboutArticle(article.content.document);
  assert.deepEqual(aboutOutline(document), [
    "Đội ngũ chuyên môn", "Đào tạo", "Nghiên cứu khoa học", "Hợp tác", "Phòng thí nghiệm", "Liên hệ",
  ]);
  assert.strictEqual(formatAboutArticle(document), document);
  assert.equal(document.content.filter((node) => node.type === "image").length, 3);
  assert.equal(document.content.filter((node) => node.type === "bulletList").length, 4);
  assert.equal(document.content.slice(0, 3).every((node) => node.type === "paragraph"), true);
  const body = JSON.stringify(document);
  for (const phrase of ["năm 1976", "Wageningen", "AUN-QA", "ptvu@ctu.edu.vn", "2RNoAYIdnCs"])
    assert.ok(body.includes(phrase), `missing ${phrase}`);
  assert.ok(!aboutOutline(document).some((label) => /^[A-E1-5]\.\s/u.test(label)));
  assert.ok(!body.includes("P.Gíáo"));
  assert.ok(body.includes("mailto:ptvu@ctu.edu.vn"));
});
