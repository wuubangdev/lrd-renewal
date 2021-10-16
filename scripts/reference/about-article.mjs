// Editorial structure for the imported department introduction. The source text and
// photographs stay attached to the same CMS article; only their presentation changes.
export const aboutSlug = "gioi-thieu-bo-mon-tai-nguyen-dat-dai";

const text = (node) =>
  (node?.text ?? "") + (node?.content ?? []).map(text).join("");
const inline = (value, marks) => ({ type: "text", text: value, ...(marks ? { marks } : {}) });
const heading = (level, value) => ({ type: "heading", attrs: { level }, content: [inline(value)] });
const paragraph = (value) => ({ type: "paragraph", content: [inline(value)] });
const list = (values) => ({
  type: "bulletList",
  content: values.map((value) => ({ type: "listItem", content: [paragraph(value)] })),
});
const teamDetails = new Map([
  ["Tổ Công nghệ địa không gian", "7 cán bộ: 3 phó giáo sư, 1 tiến sĩ, 2 thạc sĩ và 1 kỹ sư."],
  ["Tổ Quản lý nhà nước về đất đai", "Thành phần: 1 phó giáo sư, 3 tiến sĩ và 3 thạc sĩ."],
  ["Tổ nghiên cứu về Tài nguyên đất đai", "6 cán bộ: 1 giáo sư, 2 tiến sĩ, 2 nghiên cứu sinh và 1 thạc sĩ."],
]);

function refineFormatted(document) {
  const nodes = document.content ?? [];
  const originalIntro = text(nodes[0]).trim();
  const introParts = originalIntro.includes("Từ năm 2010") && /[ÐĐ]ội ngũ/u.test(originalIntro)
    ? originalIntro.split(/(?=Từ năm 2010|[ÐĐ]ội ngũ)/u).map((part) => part.trim().replace(/^Ðội/u, "Đội"))
    : null;
  const changes = new Map();
  for (let index = 0; index < nodes.length - 1; index++) {
    const canonical = nodes[index].type === "heading" ? teamDetails.get(text(nodes[index])) : null;
    if (canonical && text(nodes[index + 1]) !== canonical)
      changes.set(index + 1, paragraph(canonical));
  }
  if (!introParts && changes.size === 0) return document;
  return {
    ...document,
    content: nodes.flatMap((node, index) =>
      index === 0 && introParts
        ? introParts.map(paragraph)
        : [changes.get(index) ?? node]),
  };
}

function cleanParagraph(node) {
  const copy = structuredClone(node);
  copy.attrs = {};
  copy.content = (copy.content ?? []).filter((child) => child.type !== "hardBreak");
  for (const child of copy.content) {
    if (child.type === "text") {
      child.marks = (child.marks ?? []).filter((mark) => ["bold", "link"].includes(mark.type));
    }
  }
  const first = copy.content.find((child) => child.type === "text");
  const last = [...copy.content].reverse().find((child) => child.type === "text");
  if (first) first.text = first.text.trimStart();
  if (last) last.text = last.text.trimEnd();
  return copy;
}

function team(nodes, descriptionIndex, photoIndex, label) {
  const source = text(nodes[descriptionIndex]).trim().replace(/^[-–]\s*/u, "");
  const detail = source.replace(new RegExp("^" + label + "\\s*", "u"), "").trim();
  if (!detail.startsWith("gồm có")) throw new Error("Unexpected team description: " + label);
  const photo = structuredClone(nodes[photoIndex]);
  photo.attrs = { ...photo.attrs, alt: label, caption: label };
  return [heading(3, label), paragraph(detail[0].toUpperCase() + detail.slice(1)), photo];
}

export function formatAboutArticle(document) {
  const nodes = document.content ?? [];
  if (nodes.some((node) => node.type === "heading" && text(node) === "Đội ngũ chuyên môn"))
    return refineFormatted(document);
  const expected = new Map([
    [10, /^A\. Công tác giảng dạy$/u],
    [12, /^B\. Công tác nghiên cứu khoa học$/u],
    [20, /^C\. Quan hệ hợp tác$/u],
    [22, /^D\. Trang thiết bị$/u],
    [26, /^E\. Các chuyên ngành đào tạo$/u],
    [49, /^Đia chỉ liên hệ:$/u],
  ]);
  if (document.type !== "doc" || nodes.length !== 56 || nodes[1]?.type !== "image" ||
      [...expected].some(([index, pattern]) => !pattern.test(text(nodes[index]).trim())))
    throw new Error("The introduction article changed; review it before reformatting.");

  const bullet = (indices) => list(indices.map((index) => text(nodes[index]).trim().replace(/^[-–]\s*/u, "")));
  const detail = (index, label) =>
    paragraph(label + ": " + text(nodes[index]).trim().replace(new RegExp("^" + label + ":?\\s*", "iu"), ""));
  return refineFormatted({
    type: "doc",
    content: [
      cleanParagraph(nodes[0]),
      heading(2, "Đội ngũ chuyên môn"),
      ...team(nodes, 2, 3, "Tổ Công nghệ địa không gian"),
      ...team(nodes, 4, 5, "Tổ Quản lý nhà nước về đất đai"),
      ...team(nodes, 6, 7, "Tổ nghiên cứu về Tài nguyên đất đai"),
      heading(2, "Đào tạo"),
      cleanParagraph(nodes[11]),
      heading(3, "Quản lý đất đai"),
      cleanParagraph(nodes[28]),
      heading(4, "Mục tiêu và năng lực"),
      bullet([30, 31, 32]),
      heading(3, "Quy hoạch vùng và đô thị"),
      cleanParagraph(nodes[34]),
      heading(4, "Mục tiêu và năng lực"),
      bullet([36, 37, 38, 39]),
      heading(3, "Thạc sĩ Quản lý đất đai"),
      cleanParagraph(nodes[41]),
      detail(42, "Mục tiêu"),
      detail(43, "Thi tuyển"),
      detail(44, "Môn thi"),
      heading(3, "Tiến sĩ Quản lý đất đai"),
      cleanParagraph(nodes[46]),
      heading(3, "Chất lượng chương trình"),
      cleanParagraph(nodes[48]),
      heading(2, "Nghiên cứu khoa học"),
      cleanParagraph(nodes[13]),
      bullet([14, 15, 16, 17, 18, 19]),
      heading(2, "Hợp tác"),
      cleanParagraph(nodes[21]),
      heading(2, "Phòng thí nghiệm"),
      cleanParagraph(nodes[23]),
      bullet([24, 25]),
      heading(2, "Liên hệ"),
      cleanParagraph(nodes[50]),
      cleanParagraph(nodes[51]),
      cleanParagraph(nodes[52]),
      cleanParagraph(nodes[53]),
      {
        type: "paragraph",
        content: [inline("Email: "), inline("ptvu@ctu.edu.vn", [{ type: "link", attrs: { href: "mailto:ptvu@ctu.edu.vn" } }])],
      },
      {
        type: "paragraph",
        content: [inline("Video giới thiệu bộ môn", [{ type: "link", attrs: { href: "https://www.youtube.com/watch?v=2RNoAYIdnCs" } }])],
      },
    ],
  });
}

export function aboutOutline(document) {
  return (document.content ?? [])
    .filter((node) => node.type === "heading" && node.attrs?.level === 2)
    .map(text);
}
