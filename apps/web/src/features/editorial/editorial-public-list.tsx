import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import { editorialThumbnail } from "@/lib/default-thumbnails";
import {
  editorialDetailPath,
  editorialLabel,
  type EditorialKind,
  type PublicEditorial,
} from "./contracts";

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
export async function EditorialPublicList({
  kind,
  locale,
  compact = false,
}: {
  kind: EditorialKind;
  locale: string;
  compact?: boolean;
}) {
  const items = await serverApi<PublicEditorial[]>(
    `/public/editorial?kind=${kind}&locale=${locale}`,
  );
  return (
    <section className={compact ? "editorial-public compact" : "container editorial-public"}>
      {!compact && (
        <>
          <p className="eyebrow">
            {locale === "en" ? "LAND RESOURCES DEPARTMENT" : "BỘ MÔN TÀI NGUYÊN ĐẤT ĐAI"}
          </p>
          <h1>{editorialLabel(kind, locale)}</h1>
          <p className="lede">
            {locale === "en"
              ? kind === "EVENT"
                ? "Seminars, workshops and academic forums."
                : kind === "JOB"
                  ? "Career opportunities and recruitment announcements."
                  : "The latest news and activities."
              : kind === "EVENT"
                ? "Các hội thảo, tọa đàm và diễn đàn học thuật."
                : kind === "JOB"
                  ? "Cơ hội việc làm và thông báo tuyển dụng dành cho cộng đồng ngành."
                  : "Tin tức và hoạt động mới nhất."}
          </p>
        </>
      )}
      {compact && items.length > 0 && (
        <div className="section-heading">
          <div>
            <p className="eyebrow">{locale === "en" ? "NEWS" : "HỒ SƠ TIN TỨC"}</p>
            <h2>{locale === "en" ? "Featured news" : "Tin nổi bật"}</h2>
          </div>
        </div>
      )}
      <div className="editorial-public-grid">
        {items.slice(0, compact ? 3 : undefined).map((item) => (
          <article className="editorial-public-card" key={item.id}>
            <Link
              className="editorial-public-image"
              href={editorialDetailPath(kind, locale, item.details.slug)}
            >
              <img
                src={
                  item.details.thumbnailId
                    ? `/api/v1/public/media/${item.details.thumbnailId}`
                    : editorialThumbnail(kind)
                }
                alt={item.details.thumbnailId ? item.details.thumbnailAlt : ""}
                loading="lazy"
              />
            </Link>
            <div className="editorial-public-copy">
              <small>
                {kind === "EVENT"
                  ? date(item.details.startsOn, locale)
                  : kind === "JOB"
                    ? item.details.employer || item.details.position
                    : editorialLabel(kind, locale)}
              </small>
              <h2>
                <Link href={editorialDetailPath(kind, locale, item.details.slug)}>
                  {item.details.title}
                </Link>
              </h2>
              <p>{item.details.summary}</p>
              {kind === "EVENT" && item.details.location && (
                <span className="editorial-meta">{item.details.location}</span>
              )}
              {kind === "JOB" && item.details.deadline && (
                <span className="editorial-meta">
                  {locale === "en" ? "Deadline: " : "Hạn nộp: "}
                  {date(item.details.deadline, locale)}
                </span>
              )}
              <div className="editorial-public-links">
                <Link
                  className="text-link"
                  href={editorialDetailPath(kind, locale, item.details.slug)}
                >
                  {locale === "en" ? "View details ↗" : "Xem chi tiết ↗"}
                </Link>
                {item.details.externalUrl && (
                  <a
                    className="text-link"
                    href={item.details.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {locale === "en" ? "External link ↗" : "Liên kết ngoài ↗"}
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
      {!items.length && !compact && (
        <p>{locale === "en" ? "Information coming soon." : "Thông tin đang được cập nhật."}</p>
      )}
    </section>
  );
}
