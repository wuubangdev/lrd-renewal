import type { Metadata } from "next";
import { ResearchDetail, loadResearch } from "@/features/research/research-public";
import { researchDetailPath } from "@/features/research/contracts";
import { socialMetadata } from "@/lib/social-metadata";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = await loadResearch(locale, slug);
  return socialMetadata({
    path: researchDetailPath(locale, item.details.slug),
    title: item.details.title,
    description: item.details.summary || item.details.citation.slice(0, 300),
    locale,
    imageId: item.details.coverId,
    publishedTime: item.publishedAt,
    author: item.details.authorsText || item.authors.map((a) => a.name).join(", "),
  });
}
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  return <ResearchDetail {...await params} />;
}
