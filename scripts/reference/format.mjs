// Editorial normalization for archived Joomla articles. Keep the source's text,
// image order, links and tables; only repair block boundaries and hierarchy.
const textOf = (node) => (node.text ?? "") + (node.content ?? []).map(textOf).join("");
const isUppercase = (text) => {
  const letters = [...text].filter((char) => /\p{L}/u.test(char));
  return (
    letters.length >= 5 &&
    letters.filter((char) => char === char.toLocaleUpperCase("vi")).length / letters.length >= 0.85
  );
};

function splitLines(node) {
  const parts = [[]];
  for (const child of node.content ?? []) {
    if (child.type === "hardBreak") parts.push([]);
    else parts.at(-1).push(child);
  }
  return parts
    .filter((content) => content.some((part) => textOf(part).trim() || part.type === "inlineImage"))
    .map((content) => ({
      type: "paragraph",
      content,
      ...(node.attrs ? { attrs: node.attrs } : {}),
    }));
}

function headingLevel(node, previous, next, index) {
  const label = textOf(node).trim();
  if (!label || label.length > 90 || /^[-–•*+]\s/u.test(label)) return null;
  const children = node.content ?? [];
  if (
    !children.every(
      (child) =>
        child.type === "text" &&
        (!child.text?.trim() || child.marks?.some((mark) => mark.type === "bold")),
    )
  )
    return null;
  // The source often repeats its article title as several uppercase lines.
  if (
    index < 5 &&
    isUppercase(label) &&
    (isUppercase(textOf(next ?? {}).trim()) || isUppercase(textOf(previous ?? {}).trim()))
  )
    return null;
  if (/^[IVX]{1,5}\.\s/u.test(label) || /^[A-H]\.\s/u.test(label)) return 2;
  if (/^Năm\s+\d{4}\b/iu.test(label)) return 2;
  if (/^\d{4}(?:\s*[-–]\s*\d{4})?$/u.test(label)) return 3;
  if (/^\d+(?:\.\d+)+\s/u.test(label)) return 3;
  if (/^\d+\.\s/u.test(label)) return 3;
  if (isUppercase(label)) return 2;
  if (label.endsWith(":")) return 3;
  if (
    ["table", "bulletList", "orderedList"].includes(next?.type) ||
    (next?.type === "paragraph" && /^\s*[-–•*+]\s/u.test(textOf(next)))
  )
    return 3;
  return null;
}

export function formatImportedDocument(document) {
  const stats = {
    whitespaceNodes: 0,
    splitParagraphs: 0,
    demotedHeadings: 0,
    promotedHeadings: 0,
    manualBullets: 0,
  };
  function clean(node) {
    if (node.type === "text") {
      const value = node.text.replace(/[\s\u00a0]+/gu, " ");
      if (value !== node.text) stats.whitespaceNodes++;
      return { ...node, text: value };
    }
    return node.content ? { ...node, content: node.content.map(clean) } : node;
  }
  const original = clean(document);
  const blocks = [];
  for (const node of original.content ?? []) {
    if (node.type === "heading") {
      const lines = splitLines(node);
      const longOrList =
        /^[-–•*+]\s/u.test(textOf(node).trim()) || textOf(node).trim().length > 110;
      if (longOrList) stats.demotedHeadings++;
      if (lines.length > 1) {
        lines.forEach((line, index) => {
          const label = textOf(line).trim();
          blocks.push(
            index === 0 && !/^[-–•*+]\s/u.test(label) && label.length <= 90
              ? {
                  ...line,
                  type: "heading",
                  attrs: { ...line.attrs, level: node.attrs?.level ?? 2 },
                }
              : line,
          );
        });
      } else if (longOrList) {
        blocks.push({ ...node, type: "paragraph", attrs: { textAlign: node.attrs?.textAlign } });
      } else blocks.push(node);
      continue;
    }
    if (
      node.type === "paragraph" &&
      (node.content ?? []).filter((n) => n.type === "hardBreak").length >= 2
    ) {
      const lines = splitLines(node);
      if (lines.length > 1) stats.splitParagraphs++;
      blocks.push(...lines);
    } else blocks.push(node);
  }
  const formatted = blocks.map((node, index) => {
    if (node.type !== "paragraph") return node;
    if (/^[-–•*+]\s/u.test(textOf(node).trim())) stats.manualBullets++;
    const level = headingLevel(node, blocks[index - 1], blocks[index + 1], index);
    if (!level) return node;
    stats.promotedHeadings++;
    return { ...node, type: "heading", attrs: { ...node.attrs, level } };
  });
  return { document: { ...original, content: formatted }, stats };
}
