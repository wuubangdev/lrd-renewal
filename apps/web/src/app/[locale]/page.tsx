import { publicHome } from "@/features/site/server";
import { HomeRenderer } from "@/features/site/home-renderer";
import { serverApi } from "@/lib/server-api";
import type { ArticleCategory } from "@/lib/contracts";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return {
    title: {
      absolute:
        locale === "en"
          ? "Land Resources Department · Can Tho University"
          : "Bộ môn Tài nguyên Đất đai · Đại học Cần Thơ",
    },
  };
}
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale;
  const [data, categoryOptions] = await Promise.all([
    publicHome(locale),
    serverApi<ArticleCategory[]>("/public/categories"),
  ]);
  return <HomeRenderer data={data} categoryOptions={categoryOptions} />;
}
