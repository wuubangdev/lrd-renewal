import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import { absoluteSiteUrl } from "@/lib/social-metadata";
import { researchThumbnail } from "@/lib/default-thumbnails";
import { ShareActions } from "@/features/publishing/components/share-actions";
import {
  researchDetailPath,
  researchLabel,
  researchPath,
  type PublicResearch,
  type ResearchKind,
  type ResearchPage,
} from "./contracts";
function authorNames(item: PublicResearch) {
  return item.details.authorsText || item.authors.map((a) => a.name).join(", ");
}
export function ResearchCard({ item }: { item: PublicResearch }) {
  return (
    <article className="research-card">
      <Link
        className="research-card-main"
        href={researchDetailPath(item.locale, item.details.slug)}
      >
        <span className="research-card-image">
          <img
            src={
              item.details.coverId
                ? `/api/v1/public/media/${item.details.coverId}`
                : researchThumbnail(item.kind)
            }
            alt=""
            loading="lazy"
          />
        </span>
        <span className="research-card-type">
          {researchLabel(item.kind, item.locale)}
          {item.details.year ? ` · ${item.details.year}` : ""}
        </span>
        <h2>{item.details.title}</h2>
        {item.details.summary && <p>{item.details.summary}</p>}
        <span className="research-card-meta">
          {[authorNames(item), item.details.venue || item.details.publisher || item.details.level]
            .filter(Boolean)
            .join(" · ")}
        </span>
        <b>{item.locale === "en" ? "View details ↗" : "Xem chi tiết ↗"}</b>
      </Link>
    </article>
  );
}
export async function ResearchList({
  kind,
  locale,
  page = 0,
}: {
  kind: ResearchKind;
  locale: string;
  page?: number;
}) {
  const data = await serverApi<ResearchPage<PublicResearch>>(
    `/public/research?kind=${kind}&locale=${locale}&page=${page}&size=20`,
  );
  const base =
    researchPath(kind, locale) + (kind === "CONFERENCE_PAPER" ? "?type=conference&" : "?");
  return (
    <>
      <p className="research-count">
        {data.total} {locale === "en" ? "works" : "công trình"}
      </p>
      <div className="research-grid">
        {data.items.map((item) => (
          <ResearchCard item={item} key={item.id} />
        ))}
      </div>
      {!data.items.length && (
        <p>
          {locale === "en" ? "This collection is being updated." : "Danh mục đang được cập nhật."}
        </p>
      )}
      {data.total > data.size && (
        <nav className="pagination" aria-label={locale === "en" ? "Pagination" : "Phân trang"}>
          {page > 0 && (
            <Link className="button secondary" href={`${base}page=${page - 1}`}>
              {locale === "en" ? "Previous" : "Trang trước"}
            </Link>
          )}
          <span>
            {locale === "en" ? "Page" : "Trang"} {page + 1}
          </span>
          {(page + 1) * data.size < data.total && (
            <Link className="button secondary" href={`${base}page=${page + 1}`}>
              {locale === "en" ? "Next" : "Trang sau"}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
export function ResearchTabs({ locale, active }: { locale: string; active: ResearchKind }) {
  return (
    <nav
      className="research-kind-tabs"
      aria-label={locale === "en" ? "Research categories" : "Danh mục nghiên cứu"}
    >
      {["PROJECT", "JOURNAL_ARTICLE", "CONFERENCE_PAPER", "TEXTBOOK", "DOCUMENT"].map((kind) => (
        <Link
          key={kind}
          className={active === kind ? "active" : ""}
          href={
            kind === "CONFERENCE_PAPER"
              ? `${researchPath(kind, locale)}?type=conference`
              : researchPath(kind as ResearchKind, locale)
          }
        >
          {researchLabel(kind as ResearchKind, locale)}
        </Link>
      ))}
    </nav>
  );
}
export async function ResearchCategoryPage({
  kind,
  locale,
  page,
}: {
  kind: ResearchKind;
  locale: string;
  page: number;
}) {
  return (
    <main className="container research-page">
      <p className="eyebrow">
        {locale === "en" ? "LAND RESOURCES DEPARTMENT" : "BỘ MÔN TÀI NGUYÊN ĐẤT ĐAI"}
      </p>
      <h1>{researchLabel(kind, locale)}</h1>
      <p className="lede">
        {locale === "en"
          ? "Explore the department's projects, publications and resources."
          : "Tra cứu đề tài, công bố và tài liệu của bộ môn theo từng bản ghi."}
      </p>
      <ResearchTabs locale={locale} active={kind} />
      <ResearchList kind={kind} locale={locale} page={page} />
    </main>
  );
}
export async function loadResearch(locale: string, slug: string) {
  try {
    return await serverApi<PublicResearch>(
      `/public/research/${encodeURIComponent(slug)}?locale=${locale}`,
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
export async function ResearchDetail({ locale, slug }: { locale: string; slug: string }) {
  const item = await loadResearch(locale, slug),
    d = item.details;
  const facts = [
    ...(item.kind === "PROJECT"
      ? [
          [locale === "en" ? "Project level" : "Cấp đề tài", d.level],
          [locale === "en" ? "Period" : "Thời gian", d.period],
          [locale === "en" ? "Progress" : "Tiến độ", d.progress],
        ]
      : [
          [locale === "en" ? "Year" : "Năm", d.year?.toString() ?? ""],
          [locale === "en" ? "Journal / conference" : "Tạp chí / Hội thảo", d.venue],
          [locale === "en" ? "Publisher" : "Nhà xuất bản", d.publisher],
          [locale === "en" ? "Volume, issue, pages" : "Tập, số, trang", d.volume],
          ["DOI", d.doi],
          ["ISBN", d.isbn],
        ]),
  ].filter(([, value]) => Boolean(value));
  return (
    <main className="container research-detail">
      <nav className="breadcrumb" aria-label={locale === "en" ? "Breadcrumb" : "Đường dẫn"}>
        <Link href={`/${locale}`}>{locale === "en" ? "Home" : "Trang chủ"}</Link>
        <span>/</span>
        <Link href={`/${locale}/nghien-cuu`}>{locale === "en" ? "Research" : "Nghiên cứu"}</Link>
        <span>/</span>
        <Link href={researchPath(item.kind, locale)}>{researchLabel(item.kind, locale)}</Link>
      </nav>
      <div className="research-detail-hero">
        <p className="eyebrow">
          {researchLabel(item.kind, locale).toLocaleUpperCase(locale === "en" ? "en" : "vi-VN")}
        </p>
        <h1>{d.title}</h1>
        {d.summary && <p>{d.summary}</p>}
        <ShareActions url={absoluteSiteUrl(researchDetailPath(locale, d.slug))} title={d.title} />
      </div>
      {d.coverId && (
        <figure className="research-detail-cover">
          <img src={`/api/v1/public/media/${d.coverId}`} alt={d.coverAlt} />
          {d.coverAlt && <figcaption>{d.coverAlt}</figcaption>}
        </figure>
      )}
      {item.authors.length > 0 && (
        <section className="research-authors" aria-label={locale === "en" ? "Authors" : "Tác giả"}>
          <h2>
            {item.kind === "PROJECT"
              ? locale === "en"
                ? "Research team"
                : "Nhóm thực hiện"
              : locale === "en"
                ? "Authors"
                : "Tác giả"}
          </h2>
          <div>
            {item.authors.map((a, i) => (
              <span key={i}>
                {a.staffUrl ? <Link href={a.staffUrl}>{a.name}</Link> : a.name}
                {i < item.authors.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        </section>
      )}
      {d.authorsText && (
        <p className="research-original-authors">
          <strong>{locale === "en" ? "Authors as cited:" : "Tác giả theo nguồn:"}</strong>{" "}
          {d.authorsText}
        </p>
      )}
      {facts.length > 0 && (
        <dl className="research-facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {d.citation && (
        <section className="research-citation">
          <h2>{locale === "en" ? "Citation" : "Trích dẫn"}</h2>
          <p>{d.citation}</p>
        </section>
      )}
      <div className="research-links">
        {d.documentUrl && (
          <a
            className="button primary"
            href={d.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {locale === "en" ? "View document ↗" : "Xem tài liệu ↗"}
          </a>
        )}
        {d.sourceUrl && (
          <a className="text-link" href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
            {locale === "en" ? "View source ↗" : "Xem nguồn gốc ↗"}
          </a>
        )}
      </div>
      <Link className="text-link" href={researchPath(item.kind, locale)}>
        ← {locale === "en" ? "Back to collection" : "Trở lại danh mục"}
      </Link>
    </main>
  );
}
export async function ResearchOverview({ locale }: { locale: string }) {
  const kinds: ResearchKind[] = [
    "PROJECT",
    "JOURNAL_ARTICLE",
    "CONFERENCE_PAPER",
    "TEXTBOOK",
    "DOCUMENT",
  ];
  const data = await Promise.all(
    kinds.map((kind) =>
      serverApi<ResearchPage<PublicResearch>>(
        `/public/research?kind=${kind}&locale=${locale}&page=0&size=3`,
      ),
    ),
  );
  return (
    <main className="container research-page">
      <p className="eyebrow">{locale === "en" ? "RESEARCH & RESOURCES" : "KHOA HỌC & HỌC LIỆU"}</p>
      <h1>{locale === "en" ? "Research" : "Nghiên cứu"}</h1>
      <p className="lede">
        {locale === "en"
          ? "Projects, publications, textbooks and documents connected to their authors."
          : "Đề tài, công bố, giáo trình và tài liệu được quản lý theo từng công trình và gắn với tác giả."}
      </p>
      {kinds.map((kind, i) => (
        <section className="research-overview-section" key={kind}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                {data[i].total} {locale === "en" ? "RECORDS" : "BẢN GHI"}
              </p>
              <h2>{researchLabel(kind, locale)}</h2>
            </div>
            <Link
              className="text-link"
              href={
                kind === "CONFERENCE_PAPER"
                  ? `${researchPath(kind, locale)}?type=conference`
                  : researchPath(kind, locale)
              }
            >
              {locale === "en" ? "View all ↗" : "Xem tất cả ↗"}
            </Link>
          </div>
          <div className="research-grid">
            {data[i].items.map((item) => (
              <ResearchCard item={item} key={item.id} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
