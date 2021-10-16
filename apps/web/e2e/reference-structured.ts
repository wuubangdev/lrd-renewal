export function isStructuredReference(record: { key: string; content?: { title?: string } }) {
  return (
    ["article-2", "article-9", "article-10"].includes(record.key) ||
    (record.key.startsWith("full-") &&
      /^(PGS\.|GS\.|TS\.|ThS\.|KS\.)/.test(record.content?.title ?? ""))
  );
}
