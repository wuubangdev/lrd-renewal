export const categories = {
  TIN_TUC: "Tin bộ môn",
  DAO_TAO: "Đào tạo",
  NGHIEN_CUU: "Nghiên cứu",
  SINH_VIEN: "Sinh viên",
  TUYEN_SINH: "Tuyển sinh",
  SU_KIEN: "Sự kiện",
} as const;
export type Category = string;
export type ArticleCategory = { code: string; nameVi: string; nameEn: string; sortOrder: number };
export function categoryLabel(code: string, locale: string, catalog: ArticleCategory[] = []) {
  const found = catalog.find((item) => item.code === code);
  return found
    ? locale === "en"
      ? found.nameEn
      : found.nameVi
    : ((categories as Record<string, string>)[code] ?? code);
}
export type RichNode = {
  type: string;
  text?: string | null;
  attrs?: Record<string, unknown> | null;
  marks?: { type: string; attrs?: Record<string, unknown> | null }[] | null;
  content?: RichNode[] | null;
};
export type Draft = {
  title: string;
  slug: string;
  summary: string;
  byline: string;
  category: Category;
  document: RichNode;
  coverId: string | null;
  coverAlt: string;
  origin?: { url: string; publishedOn: string | null; author: string; retrievedOn: string } | null;
};
export type AdminContent = Draft & {
  id: string;
  ownerId: string;
  locale: string;
  version: number;
  draftVersion: number;
  status: "DRAFT" | "PUBLISHED" | "CHANGED";
  publicUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
export type PublicContent = Draft & {
  id: string;
  locale: string;
  authorName: string;
  publishedAt: string;
  publicUrl: string;
};
export type ContentSummary = Omit<PublicContent, "document" | "coverAlt" | "publicUrl" | "byline"> & {
  sourcePublishedOn?: string | null;
};
export type PageResult<T> = { items: T[]; total: number; page: number; size: number };
export type SessionUser = { id: string; email: string; name: string; permissions: string[] };
export type Asset = {
  id: string;
  name: string;
  contentType: string;
  size: number;
  width: number;
  height: number;
  url: string;
};
export type Revision = {
  id: string;
  draftVersion: number;
  title: string;
  publishedAt: string;
  authorName: string;
};
export const statusLabels = {
  DRAFT: "Bản nháp",
  PUBLISHED: "Đã công khai",
  CHANGED: "Có thay đổi mới",
};
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}
export function draftOf(content: AdminContent): Draft {
  const { title, slug, summary, byline, category, document, coverId, coverAlt, origin } = content;
  return { title, slug, summary, byline, category, document, coverId, coverAlt, origin };
}
