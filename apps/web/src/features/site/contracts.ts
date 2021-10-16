import type { EducationDocument } from "@/features/academics/contracts";
import type { ContentSummary } from "@/lib/contracts";
export type SiteLink = {
  kind:
    | "HOME"
    | "NEWS"
    | "EVENTS"
    | "JOBS"
    | "RESEARCH"
    | "PROJECTS"
    | "PUBLICATIONS"
    | "TEXTBOOKS"
    | "DOCUMENTS"
    | "PEOPLE"
    | "LABS"
    | "LABORATORY"
    | "ANCHOR"
    | "CATEGORY"
    | "ARTICLE"
    | "EXTERNAL"
    | "GROUP"
    | "PROGRAMS"
    | "ADMISSIONS"
    | "PROGRAM"
    | "ADMISSION";
  target: string;
};
export type Action = { label: string; link: SiteLink };
export type Block = { kicker: string; title: string; body: string; action: Action | null };
export type Program = { id: string; kicker: string; title: string; body: string; action: Action };
export type Section = "INTRODUCTION" | "PROGRAMS" | "NEWS" | "CONTACT" | "ADMISSIONS";
export const sectionLabels: Record<Section, string> = {
  INTRODUCTION: "Giới thiệu",
  PROGRAMS: "Đào tạo",
  NEWS: "Tin tức",
  CONTACT: "Kết nối",
  ADMISSIONS: "Tuyển sinh",
};
export type HomeComposition = {
  admissionsMode?: "OPEN" | "LATEST";
  hero: Block;
  heroImageId: string | null;
  heroImageAlt: string;
  heroSlides?: { content: Block; imageId: string | null; imageAlt: string }[];
  introduction: Block;
  programsKicker: string;
  programsTitle: string;
  programsAction: Action;
  programs: Program[];
  newsKicker: string;
  newsTitle: string;
  newsCategory: string;
  newsLimit: number;
  featuredIds: string[];
  contact: Block;
  sections: Section[];
  footer: { description: string; address: string; email: string };
};
export type MenuItem = { id: string; label: string; link: SiteLink; children: MenuItem[] };
export type NavigationMenu = { items: MenuItem[] };
export type SiteContent = HomeComposition | NavigationMenu;
export type SiteView<T = SiteContent> = {
  id: string;
  kind: "HOME" | "MENU";
  locale: string;
  version: number;
  draftVersion: number;
  status: "DRAFT" | "PUBLISHED" | "CHANGED";
  content: T;
  updatedAt: string;
  publishedAt: string | null;
};
export type SiteRender<T = SiteContent> = {
  locale: string;
  content: T;
  urls: Record<string, string>;
  news: ContentSummary[];
  education: Record<string, EducationDocument>;
  admissions: EducationDocument[];
};
export type SiteRelease = { id: string; draftVersion: number; publishedAt: string };
export function linkUrl(link: SiteLink, urls: Record<string, string>) {
  return urls[link.kind + ":" + link.target] ?? null;
}
