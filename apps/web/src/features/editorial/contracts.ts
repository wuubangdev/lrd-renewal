export type EditorialKind = "EVENT" | "NEWS" | "JOB";
export const editorialLabels: Record<EditorialKind, string> = {
  EVENT: "Hội thảo",
  NEWS: "Tin tức",
  JOB: "Tuyển dụng",
};
export function editorialLabel(kind: EditorialKind, locale: string) {
  return locale === "en"
    ? { EVENT: "Events", NEWS: "News", JOB: "Careers" }[kind]
    : editorialLabels[kind];
}
export type EditorialDetails = {
  title: string;
  slug: string;
  summary: string;
  thumbnailId: string | null;
  thumbnailAlt: string;
  externalUrl: string;
  articleId: string | null;
  startsOn: string | null;
  endsOn: string | null;
  location: string;
  organizer: string;
  deadline: string | null;
  employer: string;
  position: string;
  theme: string;
  format: "" | "IN_PERSON" | "ONLINE" | "HYBRID";
  audience: string;
  registrationUrl: string;
  speakers: { name: string; title: string; affiliation: string; topic: string }[];
  sessions: { time: string; title: string; speaker: string; description: string }[];
};
export type EditorialItem = {
  id: string;
  kind: EditorialKind;
  locale: string;
  draft: EditorialDetails;
  live: EditorialDetails | null;
  version: number;
  draftVersion: number;
  publishedAt: string | null;
};
export type PublicEditorial = {
  id: string;
  kind: EditorialKind;
  locale: string;
  details: EditorialDetails;
  articleUrl: string;
  publishedAt: string;
};
export function editorialPath(kind: EditorialKind, locale: string) {
  return kind === "EVENT"
    ? `/${locale}/hoi-thao`
    : kind === "JOB"
      ? `/${locale}/tuyen-dung`
      : `/${locale}/tin-tuc`;
}
export function editorialDetailPath(kind: EditorialKind, locale: string, slug: string) {
  const base = editorialPath(kind, locale);
  return kind === "NEWS" ? `${base}/ho-so/${slug}` : `${base}/${slug}`;
}
