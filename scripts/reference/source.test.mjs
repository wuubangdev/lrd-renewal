import { test } from "node:test";
import assert from "node:assert/strict";
import { extract, convert, comparable, sha256 } from "./source.mjs";

test("preserves full paragraphs, nested formatting, merged tables, inline photos and links", () => {
  const source = {
    url: "https://lrd.ctu.edu.vn/sample.html",
    title: "Original",
    html: '<h2>Đề mục</h2><p style="text-align:center">Đầy <strong>đủ</strong><br>nội dung <a href="/doc.pdf">tài liệu</a>.</p><table><tr><th colspan="2">Tiêu đề</th></tr><tr><td rowspan="2"><p>A<img src="/a.jpg" alt="Ảnh A"></p></td><td>B<sup>2</sup></td></tr><tr><td>C</td></tr></table><ol start="3"><li>Ba</li></ol>',
  };
  const result = convert(source, { image: (url) => ({ $asset: sha256(url) }) });
  assert.equal(result.images.length, 1);
  assert.deepEqual(result.links, ["https://lrd.ctu.edu.vn/doc.pdf"]);
  const table = result.document.content.find((n) => n.type === "table");
  assert.equal(table.content[0].content[0].attrs.colspan, 2);
  assert.equal(table.content[1].content[0].attrs.rowspan, 2);
  assert.equal(result.document.content.at(-1).attrs.start, 3);
  assert.equal(result.document.content[1].attrs.textAlign, "center");
});
test("decodes Joomla email literals without executing scripts and excludes site chrome", () => {
  const html = `<html><head><title>Sample</title></head><body><nav>Menu</nav><h2 itemprop="headline">Bài gốc</h2><div itemprop="articleBody"><p>Liên hệ <span id="cloakabc">Enable JS</span><script>var addyabc = 'ptv&#117;' + '&#64;'; addyabc = addyabc + 'ct&#117;' + '&#46;' + 'edu.vn'; var addy_textabc = 'ptvu&#64;ctu.edu.vn'; globalThis.executed = true;</script></p><script>alert(1)</script></div><footer>Footer</footer></body></html>`;
  const source = {
    ...extract(html, "https://lrd.ctu.edu.vn/a.html"),
    url: "https://lrd.ctu.edu.vn/a.html",
  };
  assert.equal(comparable(source.text), "Liênhệptvu@ctu.edu.vn");
  assert.equal(globalThis.executed, undefined);
  assert(!source.html.includes("script"));
  assert.deepEqual(convert(source).links, ["mailto:ptvu@ctu.edu.vn"]);
});
test("refuses unknown embeds and missing images instead of silently dropping content", () => {
  assert.throws(
    () =>
      convert({ url: "https://lrd.ctu.edu.vn/a", html: '<p>Text</p><iframe src="x"></iframe>' }),
    /Unsupported/,
  );
  assert.throws(() => convert({ url: "https://lrd.ctu.edu.vn/a", html: "<img>" }), /Image without/);
  const result = convert({
    url: "https://lrd.ctu.edu.vn/a",
    html: '<p><a href="javascript:alert(1)">Keep text</a></p>',
  });
  assert.equal(result.document.content[0].content[0].text, "Keep text");
  assert.equal(result.links.length, 0);
});

test("formats legacy section labels and line breaks without changing source text", () => {
  const html =
    "<p><strong>A. Giới thiệu</strong><br>Đoạn đầu.<br>Đoạn tiếp.</p><h2>- Một mục liệt kê</h2><p><strong>Năm 2025</strong></p><table><tr><td>Dữ liệu</td></tr></table>";
  const result = convert({ url: "https://lrd.ctu.edu.vn/a.html", title: "Bài mẫu", html });
  assert.deepEqual(
    result.document.content.map((node) => node.type),
    ["heading", "paragraph", "paragraph", "paragraph", "heading", "table"],
  );
  assert.equal(result.document.content[0].attrs.level, 2);
  assert.equal(result.document.content[4].attrs.level, 2);
  assert.equal(result.formatStats.demotedHeadings, 1);
  assert.equal(result.formatStats.splitParagraphs, 1);
});

test("all packaged articles retain source text, images, links and editor-compatible structure", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { verifyFullPackage } = await import("./verify-package.mjs");
  const { getSchema, Node } = await import("@tiptap/core");
  const { default: StarterKit } = await import("@tiptap/starter-kit");
  const { TableKit } = await import("@tiptap/extension-table");
  const { default: TextAlign } = await import("@tiptap/extension-text-align");
  const { default: Subscript } = await import("@tiptap/extension-subscript");
  const { default: Superscript } = await import("@tiptap/extension-superscript");
  const dir = fileURLToPath(new URL("../../data/reference-site/", import.meta.url));
  const manifest = JSON.parse(await readFile(dir + "manifest.json", "utf8"));
  await verifyFullPackage(dir, manifest);
  const image = Node.create({
    name: "image",
    group: "block",
    atom: true,
    addAttributes() {
      return {
        assetId: { default: null },
        alt: { default: "" },
        caption: { default: "" },
        href: { default: "" },
      };
    },
  });
  const schema = getSchema([
    StarterKit.configure({ heading: { levels: [2, 3, 4, 5, 6] } }),
    TableKit,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Subscript,
    Superscript,
    image,
    image.extend({ name: "inlineImage", group: "inline", inline: true }),
  ]);
  for (const record of manifest.records.filter((r) => r.kind === "articles"))
    assert.doesNotThrow(() => schema.nodeFromJSON(record.content.document).check(), record.key);
  for (const record of manifest.records.filter(
    (r) => r.kind === "articles" && r.key.startsWith("full-"),
  )) {
    assert(record.content.summary.length <= 205, record.key + " has a long summary");
    if (/^(?:GS|PGS|TS|ThS|KS)\.?\s/iu.test(record.content.title)) {
      assert.match(record.content.summary, /^Hồ sơ khoa học/);
      assert.doesNotMatch(record.content.summary, /(?:Điện thoại|Chỗ ở|Nơi sinh):/iu);
    }
  }
});
