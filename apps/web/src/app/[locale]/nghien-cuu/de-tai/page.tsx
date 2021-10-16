import { ResearchCategoryPage } from "@/features/research/research-public";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Research projects" : "Đề tài nghiên cứu" };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page } = await searchParams;
  return (
    <ResearchCategoryPage kind="PROJECT" locale={locale} page={Math.max(0, Number(page) || 0)} />
  );
}
