import { parseHTML } from "linkedom";
import { createHash } from "node:crypto";
import { formatImportedDocument } from "./format.mjs";

export const sourceOrigin = "https://lrd.ctu.edu.vn";
export const sha256 = (value) => createHash("sha256").update(value).digest("hex");
export const compact = (value) => value.replace(/\s+/gu, " ").trim();
export const comparable = (value) => value.replace(/\s+/gu, "");
export const imageUrl = (value, base) =>
  /^data:image\/(?:png|jpeg);base64,[a-z\d+/=\s]+$/i.test(value ?? "")
    ? value.replace(/\s/g, "")
    : absolute(value, base);
export function absolute(value, base) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    if (!["https:", "http:", "mailto:", "tel:"].includes(url.protocol)) return null;
    return url.href;
  } catch {
    return null;
  }
}

// Joomla's email cloak contains literal concatenations. Decode only those literals;
// source scripts are never evaluated, executed in a browser or served to readers.
function uncloakedEmails(document, body) {
  const decode = (s) => parseHTML("<p>" + s + "</p>").document.querySelector("p").textContent;
  for (const script of body.querySelectorAll("script")) {
    const code = script.textContent;
    const match = code.match(/var addy([a-f\d]+)\s*=\s*((?:'[^']*'|[^;'])+);/i);
    if (!match) continue;
    const [, id, first] = match;
    const span = body.querySelector("#cloak" + id);
    if (!span) throw new Error("Email cloak has no target");
    const literals = (expression) =>
      [...expression.matchAll(/'([^']*)'/g)].map((m) => m[1]).join("");
    const second = code.match(
      new RegExp("addy" + id + "\\s*=\\s*addy" + id + "\\s*\\+((?:'[^']*'|[^;'])+);"),
    );
    const text = code.match(new RegExp("var addy_text" + id + "\\s*=((?:'[^']*'|[^;'])+);"));
    const email = decode(literals(first) + literals(second?.[1] ?? ""));
    const label = decode(literals(text?.[1] ?? "")) || email;
    if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email))
      throw new Error("Unrecognized email cloak");
    const a = document.createElement("a");
    a.setAttribute("href", "mailto:" + email);
    a.textContent = label;
    span.replaceChildren(a);
  }
}

export function extract(html, url) {
  const { document } = parseHTML(html);
  let body = document.querySelector('[itemprop="articleBody"]');
  if (!body && document.querySelector("#tz-portfolio-template-fulltext")) {
    body = document.createElement("div");
    for (const selector of ["#tz-portfolio-template-introtext", "#tz-portfolio-template-fulltext"])
      for (const node of document.querySelectorAll(selector)) body.append(node.cloneNode(true));
  }
  if (!body) return null;
  uncloakedEmails(document, body);
  body
    .querySelectorAll("script,style,noscript,.jcomments-links,.article-info,.pager,.actions")
    .forEach((n) => n.remove());
  const title = compact(
    document.querySelector('[itemprop="headline"],.tpp-item-title')?.textContent ??
      document.title.replace(/^Bộ môn Tài nguyên Đất đai\s*-\s*/, ""),
  );
  const date =
    document.querySelector('time[itemprop="datePublished"]')?.getAttribute("datetime") ??
    document.querySelector('meta[property="article:published_time"]')?.getAttribute("content") ??
    null;
  const author = compact(
    document.querySelector('[itemprop="author"] [itemprop="name"],.createdby [itemprop="name"]')
      ?.textContent ?? "",
  );
  const images = [...body.querySelectorAll("img")]
    .map((n) => imageUrl(n.getAttribute("src") || n.getAttribute("data-src"), url))
    .filter(Boolean);
  const coverElement = document.querySelector(
    "#tz-portfolio-template-media img,.item-page .article-full-image img",
  );
  const coverImage = coverElement ? imageUrl(coverElement.getAttribute("src"), url) : null;
  return {
    title,
    publishedOn: date?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
    author,
    html: body.innerHTML,
    text: body.textContent,
    images,
    coverImage,
  };
}

const blockTags = new Set([
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "center",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "blockquote",
  "pre",
  "figure",
  "hr",
  "img",
]);
const inlineTypes = new Set(["text", "hardBreak", "inlineImage"]);
export function convert(source, { image, link = (href) => href } = {}) {
  const { document } = parseHTML("<div id=source-root>" + source.html + "</div>");
  const root = document.querySelector("#source-root");
  const sourceLinks = [],
    sourceImages = [];
  const paragraph = (content) => ({ type: "paragraph", content });
  const blocks = (nodes) => {
    const result = [];
    let inline = [];
    const flush = () => {
      if (inline.some((n) => n.type !== "text" || n.text.trim())) result.push(paragraph(inline));
      inline = [];
    };
    for (const n of nodes) {
      if (inlineTypes.has(n.type)) inline.push(n);
      else {
        flush();
        result.push(n);
      }
    }
    flush();
    return result;
  };
  const attributes = (el) => {
    const align = el.style?.textAlign || el.getAttribute("align");
    return ["left", "right", "center", "justify"].includes(align) ? { textAlign: align } : {};
  };
  function visit(el, marks = []) {
    if (el.nodeType === 3)
      return el.textContent
        ? [
            {
              type: "text",
              text: el.textContent.replace(/[\t\r\n ]+/g, " "),
              ...(marks.length ? { marks } : {}),
            },
          ]
        : [];
    if (el.nodeType !== 1) return [];
    const tag = el.localName;
    if (["script", "style", "noscript"].includes(tag)) return [];
    const nextMarks = [...marks];
    const mark = {
      strong: "bold",
      b: "bold",
      em: "italic",
      i: "italic",
      u: "underline",
      s: "strike",
      strike: "strike",
      del: "strike",
      sub: "subscript",
      sup: "superscript",
      code: "code",
    }[tag];
    if (mark && !nextMarks.some((m) => m.type === mark)) nextMarks.push({ type: mark });
    if (
      /bold|[7-9]00/.test(el.style?.fontWeight ?? "") &&
      !nextMarks.some((m) => m.type === "bold")
    )
      nextMarks.push({ type: "bold" });
    if (el.style?.fontStyle === "italic" && !nextMarks.some((m) => m.type === "italic"))
      nextMarks.push({ type: "italic" });
    if (tag === "a") {
      const href = absolute(el.getAttribute("href"), source.url);
      if (href) {
        sourceLinks.push(href);
        nextMarks.push({ type: "link", attrs: { href: link(href) } });
      }
    }
    if (tag === "img") {
      const url = imageUrl(el.getAttribute("src") || el.getAttribute("data-src"), source.url);
      if (!url) throw new Error("Image without a valid source at " + source.url);
      sourceImages.push(url);
      const href = nextMarks.find((m) => m.type === "link")?.attrs.href;
      const inline =
        url.includes("static.xx.fbcdn.net/images/emoji") ||
        (Number(el.getAttribute("width")) > 0 && Number(el.getAttribute("width")) <= 32);
      return [
        {
          type: inline ? "inlineImage" : "image",
          attrs: {
            assetId: image(url),
            alt: (el.getAttribute("alt")?.trim() || source.title).slice(0, 300),
            caption: "",
            ...(href ? { href } : {}),
          },
        },
      ];
    }
    if (["iframe", "embed", "object", "video", "audio"].includes(tag))
      throw new Error("Unsupported embedded content at " + source.url);
    if (tag === "br") return [{ type: "hardBreak" }];
    if (tag === "hr") return [{ type: "horizontalRule" }];
    const children = [...el.childNodes].flatMap((n) => visit(n, nextMarks));
    if (/^h[1-6]$/.test(tag)) {
      // Source sites sometimes style entire articles as h2; preserve text and structure.
      return blocks(children).map((n) =>
        n.type === "paragraph"
          ? compact(el.textContent).length > 300
            ? { ...n, attrs: attributes(el) }
            : {
                type: "heading",
                attrs: { ...attributes(el), level: Math.max(2, Number(tag[1])) },
                content: n.content,
              }
          : n,
      );
    }
    if (tag === "p")
      return blocks(children).map((n) =>
        n.type === "paragraph" ? { ...n, attrs: attributes(el) } : n,
      );
    if (tag === "ul" || tag === "ol")
      return [
        {
          type: tag === "ul" ? "bulletList" : "orderedList",
          ...(tag === "ol"
            ? { attrs: { start: Math.max(1, Number(el.getAttribute("start")) || 1) } }
            : {}),
          content: children.filter((n) => n.type === "listItem"),
        },
      ];
    if (tag === "li") {
      const content = blocks(children);
      if (content[0]?.type !== "paragraph") content.unshift(paragraph([]));
      return [{ type: "listItem", content }];
    }
    if (tag === "table") {
      const captions = [...el.children]
        .filter((n) => n.localName === "caption")
        .flatMap((n) => blocks([...n.childNodes].flatMap((c) => visit(c))));
      return [
        ...captions,
        { type: "table", content: children.filter((n) => n.type === "tableRow") },
      ];
    }
    if (tag === "caption") return [];
    if (tag === "tr")
      return [
        {
          type: "tableRow",
          content: children.filter((n) => ["tableCell", "tableHeader"].includes(n.type)),
        },
      ];
    if (tag === "td" || tag === "th")
      return [
        {
          type: tag === "th" ? "tableHeader" : "tableCell",
          attrs: {
            colspan: Math.max(1, Number(el.getAttribute("colspan")) || 1),
            rowspan: Math.max(1, Number(el.getAttribute("rowspan")) || 1),
          },
          content: blocks(children).length ? blocks(children) : [paragraph([])],
        },
      ];
    if (tag === "blockquote") return [{ type: "blockquote", content: blocks(children) }];
    if (tag === "pre")
      return [{ type: "codeBlock", content: [{ type: "text", text: el.textContent }] }];
    return blockTags.has(tag) ? blocks(children) : children;
  }
  const raw = { type: "doc", content: blocks([...root.childNodes].flatMap((n) => visit(n))) };
  const { document: doc, stats: formatStats } = formatImportedDocument(raw);
  const plain = (n) => (n.text ?? "") + (n.content ?? []).map(plain).join("");
  if (comparable(plain(doc)) !== comparable(root.textContent))
    throw new Error("Text coverage mismatch: " + source.url);
  if (sourceImages.length !== root.querySelectorAll("img").length)
    throw new Error("Image coverage mismatch: " + source.url);
  return {
    document: doc,
    formatStats,
    links: sourceLinks,
    images: sourceImages,
    textHash: sha256(comparable(root.textContent)),
    characters: comparable(root.textContent).length,
  };
}
