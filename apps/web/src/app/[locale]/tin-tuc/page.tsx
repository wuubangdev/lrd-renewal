import Link from "next/link";
import { Search } from "lucide-react";
import { serverApi } from "@/lib/server-api";
import { type ArticleCategory, type ContentSummary, type PageResult } from "@/lib/contracts";
import { NewsList } from "@/features/publishing/components/news-list";
import { EditorialPublicList } from "@/features/editorial/editorial-public-list";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "News & activities" : "Tin tức & hoạt động" };
}
export default async function News({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const page = Math.max(0, Number(query.page) || 0),
    q = query.q ?? "",
    category = query.category ?? "";
  const search = new URLSearchParams({ locale, q, category, page: String(page), size: "9" });
  const result = await serverApi<PageResult<ContentSummary>>("/public/content?" + search);
  const categoryOptions = await serverApi<ArticleCategory[]>("/public/categories");
  const href = (p: number) => "?" + new URLSearchParams({ q, category, page: String(p) });
  return (
    <>
      <EditorialPublicList kind="NEWS" locale={locale} compact />
      <section className="container news-section news-archive">
        <p className="eyebrow">NHỊP SỐNG HỌC THUẬT</p>
        <h1>Tin tức & hoạt động</h1>
        <p className="lede">Những câu chuyện, nghiên cứu và thông tin mới từ bộ môn.</p>
        <form className="public-search" role="search">
          <div className="search-input">
            <Search size={20} />
            <input
              name="q"
              defaultValue={q}
              aria-label="Tìm kiếm bài viết"
              placeholder="Tìm kiếm thông tin…"
            />
          </div>
          <select name="category" defaultValue={category} aria-label="Chuyên mục">
            <option value="">Tất cả chuyên mục</option>
            {categoryOptions.map((item) => (
              <option value={item.code} key={item.code}>
                {locale === "en" ? item.nameEn : item.nameVi}
              </option>
            ))}
          </select>
          <button className="button primary" type="submit">
            Tìm kiếm
          </button>
        </form>
        <p className="result-count">{result.total} bài viết</p>
        <NewsList items={result.items} categoryOptions={categoryOptions} />
        <nav className="pagination" aria-label="Phân trang">
          {page > 0 && (
            <Link className="button" href={href(page - 1)}>
              Trang trước
            </Link>
          )}
          <span>Trang {page + 1}</span>
          {(page + 1) * 9 < result.total && (
            <Link className="button" href={href(page + 1)}>
              Trang sau
            </Link>
          )}
        </nav>
      </section>
    </>
  );
}
