import type { MetadataRoute } from "next";
import { serverApi } from "@/lib/server-api";
import type { ContentSummary, PageResult } from "@/lib/contracts";
import { type EducationResult, publicPath } from "@/features/academics/contracts";
import { optionalPublicHome } from "@/features/site/server";
import type { PublicStaff } from "@/features/directory/contracts";
import type { PublicLaboratory } from "@/features/directory/laboratory-contracts";
import {
  researchDetailPath,
  researchPath,
  type PublicResearch,
  type ResearchKind,
  type ResearchPage,
} from "@/features/research/contracts";
import {
  editorialDetailPath,
  editorialPath,
  type EditorialKind,
  type PublicEditorial,
} from "@/features/editorial/contracts";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of ["vi", "en"]) {
    const people = await serverApi<PublicStaff[]>("/public/people?locale=" + locale);
    entries.push({ url: base + "/" + locale + "/can-bo" });
    entries.push(
      ...people.map((person) => ({
        url: base + "/" + locale + "/can-bo/" + person.details.slug,
        lastModified: new Date(person.publishedAt),
      })),
    );
    const labs = await serverApi<PublicLaboratory[]>("/public/laboratories?locale=" + locale);
    entries.push({ url: base + "/" + locale + "/phong-thi-nghiem" });
    entries.push(
      ...labs.map((lab) => ({
        url: base + "/" + locale + "/phong-thi-nghiem/" + lab.details.slug,
        lastModified: new Date(lab.publishedAt),
      })),
    );
    entries.push({ url: base + `/${locale}/nghien-cuu` });
    const authorIds = new Set<string>();
    for (const kind of [
      "PROJECT",
      "JOURNAL_ARTICLE",
      "CONFERENCE_PAPER",
      "TEXTBOOK",
      "DOCUMENT",
    ] as ResearchKind[]) {
      entries.push({
        url:
          base +
          researchPath(kind, locale) +
          (kind === "CONFERENCE_PAPER" ? "?type=conference" : ""),
      });
      let page = 0,
        total = 0;
      do {
        const result = await serverApi<ResearchPage<PublicResearch>>(
          `/public/research?kind=${kind}&locale=${locale}&page=${page}&size=100`,
        );
        total = result.total;
        for (const item of result.items) {
          entries.push({
            url: base + researchDetailPath(locale, item.details.slug),
            lastModified: new Date(item.publishedAt),
          });
          for (const author of item.authors)
            if (author.staffUrl && author.staffId) authorIds.add(author.staffId);
        }
        page++;
      } while (page * 100 < total);
    }
    entries.push(
      ...[...authorIds].map((id) => ({ url: base + `/${locale}/nghien-cuu/tac-gia/${id}` })),
    );
    for (const kind of ["EVENT", "NEWS", "JOB"] as EditorialKind[]) {
      const items = await serverApi<PublicEditorial[]>(
        `/public/editorial?kind=${kind}&locale=${locale}`,
      );
      if (kind !== "NEWS") entries.push({ url: base + editorialPath(kind, locale) });
      entries.push(
        ...items.map((item) => ({
          url: base + editorialDetailPath(kind, locale, item.details.slug),
          lastModified: new Date(item.publishedAt),
        })),
      );
    }
    const home = await optionalPublicHome(locale);
    if (home) entries.push({ url: base + "/" + locale });
    for (const kind of ["programs", "admissions"] as const) {
      entries.push({ url: base + publicPath(kind, locale) });
      let page = 0,
        total = 0;
      do {
        const result = await serverApi<EducationResult>(
          "/public/academics/" + kind + "?locale=" + locale + "&size=50&page=" + page,
        );
        total = result.total;
        entries.push(
          ...result.items.map((item) => ({
            url: base + publicPath(kind, locale, item.slug),
            lastModified: new Date(item.publishedAt),
          })),
        );
        page++;
      } while (page * 50 < total);
    }
    let page = 0,
      total = 0;
    do {
      const result = await serverApi<PageResult<ContentSummary>>(
        "/public/content?locale=" + locale + "&size=50&page=" + page,
      );
      total = result.total;
      if (page === 0 && (home || total > 0))
        entries.push({ url: base + "/" + locale + "/tin-tuc" });
      entries.push(
        ...result.items.map((item) => ({
          url: base + "/" + locale + "/tin-tuc/" + item.slug,
          lastModified: new Date(item.publishedAt),
        })),
      );
      page++;
    } while (page * 50 < total);
  }
  return entries;
}
