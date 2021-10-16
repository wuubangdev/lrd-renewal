import { createHash } from "node:crypto";
export const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const immutable = new Set(
  "id slug code kind type locale status format url website email phone target category articleId staffId programId coverId portraitId thumbnailId imageId assetId sourceId sourceArticleId href src textAlign template registrationUrl externalUrl featuredIds newsCategory section admissionsMode degreeType positionType sourceKey doi isbn citation privateNotes privateFacts author byline authorsText sourceUrl documentUrl publishedOn retrievedOn startsOn endsOn opensAt closesAt deadline at effectiveFrom effectiveTo issuedAt expiresAt birthDate".split(
    " ",
  ),
);
const vi = /[À-ỹĐđ]/u;
export function shouldTranslate(kind, key, value) {
  if (immutable.has(key) || !value.trim()) return false;
  if (key === "academicTitle") return true;
  if (key === "name" && ["STAFF", "RESEARCH", "EDITORIAL"].includes(kind)) return false;
  if (/^(?:https?:\/\/\S+|mailto:\S+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})$/i.test(value)) return false;
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(value)) return false;
  return vi.test(value);
}
export function mapText(kind, value, mapper, key = "") {
  if (immutable.has(key)) return structuredClone(value);
  if (Array.isArray(value)) return value.map((v) => mapText(kind, v, mapper, key));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, mapText(kind, v, mapper, k)]),
    );
  return typeof value === "string" && shouldTranslate(kind, key, value)
    ? mapper(value, key)
    : value;
}
export function collectStrings(records) {
  const strings = new Set();
  for (const r of records) mapText(r.kind, r.data, (s) => (strings.add(s), s));
  return [...strings].sort();
}
export function translateRecord(record, dictionary) {
  return mapText(record.kind, record.data, (s) => {
    const result = dictionary[s];
    if (typeof result !== "string" || !result.trim())
      throw new Error(`Missing English translation: ${s.slice(0, 100)}`);
    return result;
  });
}
const relationKind = {
  articleId: "ARTICLE",
  sourceArticleId: "ARTICLE",
  staffId: "STAFF",
  programId: "PROGRAM",
};
const actionKinds = new Set([
  "ARTICLE",
  "STAFF",
  "LABORATORY",
  "PROGRAM",
  "ADMISSION",
  "EDITORIAL",
  "RESEARCH",
]);
export function remapReferences(value, links, key = "") {
  if (relationKind[key] && value) {
    const target = links[`${relationKind[key]}:${value}`];
    if (!target) throw new Error(`Missing English relation ${relationKind[key]}:${value}`);
    return target;
  }
  if (key === "featuredIds")
    return value.map((id) => {
      const target = links[`ARTICLE:${id}`];
      if (!target) throw new Error(`Missing English featured article ${id}`);
      return target;
    });
  if (Array.isArray(value)) return value.map((x) => remapReferences(x, links, key));
  if (value && typeof value === "object") {
    if (actionKinds.has(value.kind) && value.target) {
      const target = links[`${value.kind}:${value.target}`];
      if (!target) throw new Error(`Missing English action ${value.kind}:${value.target}`);
      return { ...value, target };
    }
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, remapReferences(v, links, k)]),
    );
  }
  if (typeof value === "string" && ["href", "url"].includes(key) && /^\/vi(?:[/?#]|$)/.test(value))
    return value.replace(/^\/vi/, "/en");
  return value;
}
