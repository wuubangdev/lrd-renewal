import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import type { ArticleCategory, PublicContent } from "@/lib/contracts";
import { Article } from "@/features/publishing/components/article";
import { absoluteSiteUrl, socialMetadata } from "@/lib/social-metadata";
type Params = { locale: string; slug: string };
function description(article: PublicContent) {
  if (article.summary.trim()) return article.summary;
  const body = (node: PublicContent["document"]): string =>
    `${node.text ?? ""} ${(node.content ?? []).map(body).join(" ")}`;
  return body(article.document).replace(/\s+/g, " ").trim().slice(0, 220);
}
const load = cache(async (locale: string, slug: string) => {
  try {
    return await serverApi<PublicContent>(
      "/public/content/by-slug/" + encodeURIComponent(slug) + "?locale=" + locale,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
});
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await load(locale, slug);
  return socialMetadata({
    path: article.publicUrl,
    title: article.title,
    description: description(article),
    locale,
    imageId: article.coverId,
    publishedTime: article.origin?.publishedOn ?? article.publishedAt,
    author: article.byline,
  });
}
export default async function Detail({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  const article = await load(locale, slug);
  const departmentIntroduction = article.slug === "gioi-thieu-bo-mon-tai-nguyen-dat-dai";
  const categoryOptions = await serverApi<ArticleCategory[]>("/public/categories");
  if (slug !== article.slug) permanentRedirect(article.publicUrl);
  const canonical = absoluteSiteUrl(article.publicUrl);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: description(article),
    url: canonical,
    mainEntityOfPage: canonical,
    datePublished: article.origin?.publishedOn ?? article.publishedAt,
    author: {
      "@type": /^(bm\b|bộ môn\b|khoa\b|đại học\b)/iu.test(article.byline)
        ? "Organization"
        : "Person",
      name: article.byline,
    },
    publisher: { "@type": "Organization", name: "Bộ môn Tài nguyên Đất đai · Đại học Cần Thơ" },
    image: [
      absoluteSiteUrl(
        article.coverId ? `/api/v1/public/media/${article.coverId}` : "/opengraph-image",
      ),
    ],
  };
  return (
    <div className="container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href={"/" + locale}>Trang chủ</Link>
        <span>/</span>
        {departmentIntroduction ? (
          <span>{locale === "vi" ? "Bộ môn" : "Department"}</span>
        ) : (
          <Link href={"/" + locale + "/tin-tuc"}>Tin tức</Link>
        )}
      </nav>
      <Article article={article} categoryOptions={categoryOptions} />
      <div className="article-back">
        <Link href={departmentIntroduction ? "/" + locale : "/" + locale + "/tin-tuc"} className="text-link">
          {departmentIntroduction ? "← Trở về trang chủ" : "← Trở lại tin tức"}
        </Link>
      </div>
    </div>
  );
}
