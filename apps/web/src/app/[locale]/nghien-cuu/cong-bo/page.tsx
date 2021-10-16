import { ResearchCategoryPage } from "@/features/research/research-public";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Scientific publications" : "Công bố khoa học" };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; type?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  return (
    <ResearchCategoryPage
      kind={query.type === "conference" ? "CONFERENCE_PAPER" : "JOURNAL_ARTICLE"}
      locale={locale}
      page={Math.max(0, Number(query.page) || 0)}
    />
  );
}
