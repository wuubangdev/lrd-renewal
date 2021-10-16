import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import type { ArticleCategory, PublicContent } from "@/lib/contracts";
import { Article } from "@/features/publishing/components/article";
import { socialMetadata } from "@/lib/social-metadata";
import {
  editorialDetailPath,
  editorialLabel,
  editorialPath,
  type EditorialKind,
  type PublicEditorial,
} from "./contracts";

export async function loadEditorial(kind: EditorialKind, locale: string, slug: string) {
  try {
    return await serverApi<PublicEditorial>(
      `/public/editorial/${encodeURIComponent(slug)}?kind=${kind}&locale=${locale}`,
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
export async function editorialMetadata(
  kind: EditorialKind,
  locale: string,
  slug: string,
): Promise<Metadata> {
  const item = await loadEditorial(kind, locale, slug);
  const article = await serverApi<PublicContent>(`/public/content/${item.details.articleId}`);
  return socialMetadata({
    path: editorialDetailPath(kind, locale, item.details.slug),
    title: item.details.title,
    description: item.details.summary || article.summary,
    locale,
    imageId: item.details.thumbnailId || article.coverId,
    publishedTime: item.publishedAt,
    author: article.byline,
  });
}
function date(value: string | null, locale: string) {
  return value
    ? new Intl.DateTimeFormat(locale === "en" ? "en" : "vi-VN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "";
}
export async function EditorialPublicDetail({
  kind,
  locale,
  slug,
}: {
  kind: EditorialKind;
  locale: string;
  slug: string;
}) {
  const item = await loadEditorial(kind, locale, slug);
  const [article, categories] = await Promise.all([
    serverApi<PublicContent>(`/public/content/${item.details.articleId}`),
    serverApi<ArticleCategory[]>("/public/categories"),
  ]);
  const facts =
    kind === "EVENT"
      ? [
          [
            locale === "en" ? "Date and time" : "Thời gian",
            [date(item.details.startsOn, locale), date(item.details.endsOn, locale)]
              .filter(Boolean)
              .join(" – "),
          ],
          [locale === "en" ? "Location" : "Địa điểm", item.details.location],
          [locale === "en" ? "Organizer" : "Đơn vị tổ chức", item.details.organizer],
          [locale === "en" ? "Theme" : "Chủ đề", item.details.theme],
          [
            locale === "en" ? "Format" : "Hình thức",
            (locale === "en"
              ? { IN_PERSON: "In person", ONLINE: "Online", HYBRID: "Hybrid", "": "" }
              : { IN_PERSON: "Trực tiếp", ONLINE: "Trực tuyến", HYBRID: "Kết hợp", "": "" })[
              item.details.format
            ],
          ],
          [locale === "en" ? "Audience" : "Đối tượng tham dự", item.details.audience],
        ]
      : kind === "JOB"
        ? [
            [locale === "en" ? "Employer" : "Đơn vị tuyển dụng", item.details.employer],
            [locale === "en" ? "Position" : "Vị trí", item.details.position],
            [
              locale === "en" ? "Application deadline" : "Hạn nộp hồ sơ",
              date(item.details.deadline, locale),
            ],
          ]
        : [];
  return (
    <main className="container editorial-detail">
      <nav className="breadcrumb" aria-label={locale === "en" ? "Breadcrumb" : "Đường dẫn"}>
        <Link href={`/${locale}`}>{locale === "en" ? "Home" : "Trang chủ"}</Link>
        <span>/</span>
        <Link href={editorialPath(kind, locale)}>{editorialLabel(kind, locale)}</Link>
      </nav>
      <div className="editorial-detail-heading">
        <p className="eyebrow">
          {editorialLabel(kind, locale).toLocaleUpperCase(locale === "en" ? "en" : "vi-VN")}
        </p>
        <h1>{item.details.title}</h1>
        <p>{item.details.summary}</p>
      </div>
      {(facts.some(([, value]) => Boolean(value)) ||
        item.details.externalUrl ||
        (kind === "EVENT" && item.details.registrationUrl)) && (
        <section
          className="editorial-detail-facts"
          aria-label={locale === "en" ? "Key information" : "Thông tin chính"}
        >
          {facts
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          {item.details.externalUrl && (
            <div>
              <span>{locale === "en" ? "Link" : "Liên kết"}</span>
              <a href={item.details.externalUrl} target="_blank" rel="noopener noreferrer">
                {locale === "en" ? "View source ↗" : "Xem thông tin nguồn ↗"}
              </a>
            </div>
          )}
          {kind === "EVENT" && item.details.registrationUrl && (
            <div>
              <span>{locale === "en" ? "Registration" : "Đăng ký"}</span>
              <a href={item.details.registrationUrl} target="_blank" rel="noopener noreferrer">
                {locale === "en" ? "Register ↗" : "Đăng ký tham dự ↗"}
              </a>
            </div>
          )}
        </section>
      )}
      {kind === "EVENT" && item.details.speakers.length > 0 && (
        <section className="event-structured-section">
          <p className="eyebrow">{locale === "en" ? "EVENT" : "HỘI THẢO"}</p>
          <h2>{locale === "en" ? "Speakers" : "Diễn giả"}</h2>
          <div className="event-speaker-grid">
            {item.details.speakers.map((speaker, index) => (
              <article key={index}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{speaker.name}</h3>
                {speaker.title && <p>{speaker.title}</p>}
                {speaker.affiliation && <p>{speaker.affiliation}</p>}
                {speaker.topic && <strong>{speaker.topic}</strong>}
              </article>
            ))}
          </div>
        </section>
      )}
      {kind === "EVENT" && item.details.sessions.length > 0 && (
        <section className="event-structured-section">
          <p className="eyebrow">{locale === "en" ? "PROGRAM" : "CHƯƠNG TRÌNH"}</p>
          <h2>{locale === "en" ? "Schedule" : "Lịch trình"}</h2>
          <div className="event-session-list">
            {item.details.sessions.map((session, index) => (
              <article key={index}>
                <span>{session.time}</span>
                <div>
                  <h3>{session.title}</h3>
                  {session.speaker && <strong>{session.speaker}</strong>}
                  {session.description && <p>{session.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <div className="editorial-detail-article">
        <Article
          article={article}
          categoryOptions={categories}
          embedded
          sharePath={editorialDetailPath(kind, locale, item.details.slug)}
        />
      </div>
      <div className="article-back">
        <Link href={editorialPath(kind, locale)} className="text-link">
          ← {locale === "en" ? "Back to " : "Trở lại "}
          {editorialLabel(kind, locale).toLocaleLowerCase(locale === "en" ? "en" : "vi-VN")}
        </Link>
      </div>
    </main>
  );
}
