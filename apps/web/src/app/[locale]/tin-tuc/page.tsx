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
  const en = locale === "en";
  const query = await searchParams;
  const page = Math.max(0, Number(query.page) || 0),
    q = query.q ?? "",
    category = query.category ?? "";
  const search = new URLSearchParams({ locale, q, category, page: String(page), size: "9" });
  const result = await serverApi<PageResult<ContentSummary>>("/public/content?" + search);
  const categoryOptions = await serverApi<ArticleCategory[]>("/public/categories");
  const href = (p: number) => "?" + new URLSearchParams({ q, category, page: String(p) });
  const filtered = Boolean(q.trim() || category);
  return (
    <section className="container news-section news-archive">
      <p className="eyebrow">{en ? "ACADEMIC LIFE" : "NHỊP SỐNG HỌC THUẬT"}</p>
      <h1>{en ? "News & activities" : "Tin tức & hoạt động"}</h1>
      <p className="lede">
        {en
          ? "Stories, research and the latest updates from our department."
          : "Những câu chuyện, nghiên cứu và thông tin mới từ bộ môn."}
      </p>
      <form className="public-search" role="search" key={`${locale}:${q}:${category}`}>
        <div className="search-input">
          <Search size={20} aria-hidden="true" />
          <input
            name="q"
            defaultValue={q}
            aria-label={en ? "Search articles" : "Tìm kiếm bài viết"}
            placeholder={en ? "Search news and activities…" : "Tìm kiếm thông tin…"}
          />
        </div>
        <select name="category" defaultValue={category} aria-label={en ? "Category" : "Chuyên mục"}>
          <option value="">{en ? "All categories" : "Tất cả chuyên mục"}</option>
          {categoryOptions.map((item) => (
            <option value={item.code} key={item.code}>
              {locale === "en" ? item.nameEn : item.nameVi}
            </option>
          ))}
        </select>
        <button className="button primary" type="submit">
          {en ? "Search" : "Tìm kiếm"}
        </button>
      </form>
      {filtered && (
        <div className="news-active-filter">
          <p>
            {en ? "Showing filtered articles" : "Đang hiển thị bài viết theo bộ lọc"}
            {q.trim() && <> · “{q.trim()}”</>}
          </p>
          <Link href={`/${locale}/tin-tuc`}>{en ? "Clear filters" : "Xóa bộ lọc"}</Link>
        </div>
      )}
      {!filtered && page === 0 && <EditorialPublicList kind="NEWS" locale={locale} compact />}
      <div className="news-results-heading">
        <h2>
          {filtered
            ? en
              ? "Search results"
              : "Kết quả tìm kiếm"
            : en
              ? "All articles"
              : "Tất cả bài viết"}
        </h2>
        <p className="result-count">
          {result.total} {en ? (result.total === 1 ? "article" : "articles") : "bài viết"}
        </p>
      </div>
      <NewsList
        items={result.items}
        categoryOptions={categoryOptions}
        locale={locale}
        filtered={filtered}
        eagerFirst
      />
      {result.total > 0 && (
        <nav className="pagination" aria-label={en ? "Pagination" : "Phân trang"}>
          {page > 0 && (
            <Link className="button pagination-previous" rel="prev" href={href(page - 1)}>
              {en ? "Previous page" : "Trang trước"}
            </Link>
          )}
          <span aria-current="page">
            {en ? "Page" : "Trang"} {page + 1} / {Math.max(1, Math.ceil(result.total / 9))}
          </span>
          {(page + 1) * 9 < result.total && (
            <Link className="button pagination-next" rel="next" href={href(page + 1)}>
              {en ? "Next page" : "Trang sau"}
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
