export type ResearchKind =
  | "PROJECT"
  | "JOURNAL_ARTICLE"
  | "CONFERENCE_PAPER"
  | "TEXTBOOK"
  | "DOCUMENT";
export const researchLabels: Record<ResearchKind, string> = {
  PROJECT: "Đề tài nghiên cứu",
  JOURNAL_ARTICLE: "Bài báo khoa học",
  CONFERENCE_PAPER: "Bài đăng hội thảo",
  TEXTBOOK: "Giáo trình & sách",
  DOCUMENT: "Tài liệu",
};
export function researchLabel(kind: ResearchKind, locale: string) {
  return locale === "en"
    ? {
        PROJECT: "Research projects",
        JOURNAL_ARTICLE: "Journal articles",
        CONFERENCE_PAPER: "Conference papers",
        TEXTBOOK: "Textbooks & books",
        DOCUMENT: "Documents",
      }[kind]
    : researchLabels[kind];
}
export const researchKinds = Object.keys(researchLabels) as ResearchKind[];
export type Contributor = {
  staffId: string | null;
  name: string;
  role: "AUTHOR" | "EDITOR" | "PRINCIPAL_INVESTIGATOR" | "MEMBER";
};
export type ResearchDetails = {
  title: string;
  slug: string;
  summary: string;
  year: number | null;
  venue: string;
  publisher: string;
  volume: string;
  doi: string;
  isbn: string;
  authorsText: string;
  citation: string;
  sourceUrl: string;
  documentUrl: string;
  level: string;
  period: string;
  progress: string;
  coverId: string | null;
  coverAlt: string;
  contributors: Contributor[];
  sourceArticleId: string | null;
  sourceKey: string;
};
export type ResearchRecord = {
  id: string;
  kind: ResearchKind;
  locale: string;
  draft: ResearchDetails;
  live: ResearchDetails | null;
  version: number;
  draftVersion: number;
  publishedAt: string | null;
};
export type PublicContributor = Contributor & { staffUrl: string | null };
export type PublicResearch = {
  id: string;
  kind: ResearchKind;
  locale: string;
  details: ResearchDetails;
  authors: PublicContributor[];
  publishedAt: string;
};
export type ResearchPage<T> = { items: T[]; total: number; page: number; size: number };
export function researchPath(kind: ResearchKind, locale: string) {
  return `/${locale}/nghien-cuu/${kind === "PROJECT" ? "de-tai" : kind === "TEXTBOOK" ? "giao-trinh" : kind === "DOCUMENT" ? "tai-lieu" : "cong-bo"}`;
}
export function researchDetailPath(locale: string, slug: string) {
  return `/${locale}/nghien-cuu/cong-trinh/${slug}`;
}
