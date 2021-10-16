import {
  categoryLabel,
  dateLabel,
  type ArticleCategory,
  type PublicContent,
} from "@/lib/contracts";
import type { RichNode } from "@/lib/contracts";
import { ContentRenderer, isLegacyBodyHeading } from "./content-renderer";
import { absoluteSiteUrl } from "@/lib/social-metadata";
import { ShareActions } from "./share-actions";
import { t } from "@/lib/i18n";

function plainText(node: RichNode): string {
  return (node.text ?? "") + (node.content ?? []).map(plainText).join("");
}

function articleSections(document: RichNode, imported: boolean, primaryHeadingsOnly = false) {
  const nodes = document.content ?? [];
  const numberedSection = (node: RichNode) => {
    if (node.type !== "orderedList" || node.content?.length !== 1) return false;
    const label = plainText(node).trim();
    return (
      label.length > 0 &&
      label.length <= 120 &&
      !/\s{4,}/u.test(label) &&
      (label.match(/:/gu)?.length ?? 0) < 2
    );
  };
  const numbered = nodes.filter(numberedSection);
  return nodes.flatMap((node, index) => {
    const isHeading =
      node.type === "heading" &&
      !isLegacyBodyHeading(node, imported) &&
      (!primaryHeadingsOnly || Number(node.attrs?.level) === 2);
    const isNumberedSection = !primaryHeadingsOnly && numbered.length >= 3 && numberedSection(node);
    if (!isHeading && !isNumberedSection) return [];
    return [{ id: `muc-${index + 1}`, label: plainText(node).trim().replace(/\s+/g, " "), index }];
  });
}

export function Article({
  article,
  privateMedia = false,
  categoryOptions = [],
  embedded = false,
  sharePath,
}: {
  article: PublicContent;
  privateMedia?: boolean;
  categoryOptions?: ArticleCategory[];
  embedded?: boolean;
  sharePath?: string;
}) {
  const isDepartmentIntroduction = article.slug === "gioi-thieu-bo-mon-tai-nguyen-dat-dai";
  const hasBodyCover = (node: RichNode): boolean =>
    (["image", "inlineImage"].includes(node.type) && node.attrs?.assetId === article.coverId) ||
    (node.content ?? []).some(hasBodyCover);
  const showCover = article.coverId && !(article.origin && hasBodyCover(article.document));
  const sections = articleSections(
    article.document,
    Boolean(article.origin),
    isDepartmentIntroduction,
  );
  const sectionIds = Object.fromEntries(sections.map((section) => [section.index, section.id]));
  const contentsLabel = isDepartmentIntroduction
    ? "Nội dung trang"
    : article.locale === "vi"
      ? "Trong bài viết"
      : "On this page";
  const contents = (
    <ol>
      {sections.map((section) => (
        <li key={section.id}>
          <a href={`#${section.id}`}>{section.label}</a>
        </li>
      ))}
    </ol>
  );
  return (
    <article className={"article" + (isDepartmentIntroduction ? " article--department" : "")}>
      <header className={"article-heading" + (embedded ? " embedded" : "")} data-reveal>
        {!embedded && (
          <>
            <span className="eyebrow">
              {isDepartmentIntroduction
                ? article.locale === "vi"
                  ? "Về bộ môn"
                  : "About the department"
                : categoryLabel(article.category, article.locale, categoryOptions)}
            </span>
            <h1>
              {article.title ||
                (article.locale === "en" ? "Untitled article" : "Bài viết chưa có tiêu đề")}
            </h1>
            {article.summary && <p className="article-summary">{article.summary}</p>}
          </>
        )}
        <div className="article-byline">
          <span>{article.byline || article.origin?.author || article.authorName}</span>
          <time dateTime={article.origin?.publishedOn ?? article.publishedAt}>
            {dateLabel(article.origin?.publishedOn ?? article.publishedAt)}
          </time>
        </div>
        {!privateMedia && (
          <ShareActions
            url={absoluteSiteUrl(sharePath ?? article.publicUrl)}
            title={article.title}
          />
        )}
      </header>
      {showCover && (
        <figure className="article-cover">
          <img
            src={"/api/v1/" + (privateMedia ? "admin" : "public") + "/media/" + article.coverId}
            alt={article.coverAlt}
          />
          {article.coverAlt && <figcaption>{article.coverAlt}</figcaption>}
        </figure>
      )}
      <div className={"article-layout" + (sections.length >= 2 ? "" : " no-toc")}>
        <div className="article-main">
          {sections.length >= 2 && (
            <details className="article-contents-mobile">
              <summary>{contentsLabel}</summary>
              <nav aria-label={contentsLabel}>{contents}</nav>
            </details>
          )}
          <ContentRenderer
            document={article.document}
            privateMedia={privateMedia}
            imported={Boolean(article.origin)}
            sectionIds={sectionIds}
          />
          {article.origin && (
            <aside className="article-origin">
              <a href={article.origin.url} target="_blank" rel="noopener noreferrer">
                {t(article.locale, "sourceArticle")}
              </a>
              <p>
                {article.locale === "en" ? "Retrieved on " : "Đối chiếu ngày "}
                {dateLabel(article.origin.retrievedOn)}
                {article.origin.publishedOn
                  ? (article.locale === "en" ? " · Original publication: " : " · Ngày đăng gốc: ") +
                    dateLabel(article.origin.publishedOn)
                  : ""}
                .
              </p>
            </aside>
          )}
        </div>
        {sections.length >= 2 && (
          <aside className="article-contents" aria-label={contentsLabel}>
            <div>
              <p className="eyebrow">{contentsLabel}</p>
              <nav aria-label={contentsLabel}>{contents}</nav>
            </div>
          </aside>
        )}
      </div>
    </article>
  );
}
