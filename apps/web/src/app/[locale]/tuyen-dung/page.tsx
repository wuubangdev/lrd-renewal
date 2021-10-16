import { EditorialPublicList } from "@/features/editorial/editorial-public-list";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Careers" : "Tuyển dụng" };
}
export default async function Jobs({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <EditorialPublicList kind="JOB" locale={locale} />;
}
