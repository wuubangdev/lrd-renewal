import { ResearchOverview } from "@/features/research/research-public";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Research" : "Nghiên cứu" };
}
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <ResearchOverview locale={locale} />;
}
