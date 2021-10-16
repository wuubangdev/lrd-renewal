import { EditorialPublicList } from "@/features/editorial/editorial-public-list";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Events" : "Hội thảo" };
}
export default async function Events({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <EditorialPublicList kind="EVENT" locale={locale} />;
}
