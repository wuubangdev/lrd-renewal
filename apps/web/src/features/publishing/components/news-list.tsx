import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import {
  categoryLabel,
  dateLabel,
  type ArticleCategory,
  type ContentSummary,
} from "@/lib/contracts";
import { articleThumbnail } from "@/lib/default-thumbnails";
export function NewsList({
  items,
  eagerFirst = false,
  categoryOptions = [],
}: {
  items: ContentSummary[];
  eagerFirst?: boolean;
  categoryOptions?: ArticleCategory[];
}) {
  if (!items.length)
    return (
      <div className="empty-state">
        <FileText size={32} />
        <h3>Chưa có bài viết</h3>
        <p>Các thông tin mới của bộ môn sẽ được cập nhật tại đây.</p>
      </div>
    );
  return (
    <div className="news-grid">
      {items.map((item, index) => (
        <article className="news-item" key={item.id} data-reveal>
          <Link
            href={"/" + item.locale + "/tin-tuc/" + item.slug}
            className="news-image"
            tabIndex={-1}
            aria-hidden="true"
          >
            <img
              loading={eagerFirst && index === 0 ? "eager" : "lazy"}
              src={
                item.coverId
                  ? "/api/v1/public/media/" + item.coverId
                  : articleThumbnail(item.category)
              }
              alt=""
            />
          </Link>
          <div className="news-copy">
            <div className="news-meta">
              <span>{categoryLabel(item.category, item.locale, categoryOptions)}</span>
              <time dateTime={item.sourcePublishedOn ?? item.publishedAt}>
                {dateLabel(item.sourcePublishedOn ?? item.publishedAt)}
              </time>
            </div>
            <h3>
              <Link href={"/" + item.locale + "/tin-tuc/" + item.slug}>
                {item.title}
                <ArrowUpRight size={20} />
              </Link>
            </h3>
            <p>{item.summary}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
