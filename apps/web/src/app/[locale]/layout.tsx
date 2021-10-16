import { notFound } from "next/navigation";
import { PublicHeader, PublicFooter } from "@/components/public-shell";
import { PublicMotion } from "@/components/public-motion";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return locale === "en"
    ? {
        title: {
          default: "Land Resources Department · Can Tho University",
          template: "%s | Land Resources · CTU",
        },
        description:
          "Education, research and knowledge exchange in land resources, land management and regional and urban planning.",
      }
    : {};
}
export default async function PublicLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!["vi", "en"].includes(locale)) notFound();
  return (
    <>
      <PublicHeader locale={locale} />
      <main id="main">{children}</main>
      <PublicFooter locale={locale} />
      <PublicMotion locale={locale} />
    </>
  );
}
