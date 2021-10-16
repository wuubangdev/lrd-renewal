import { createElement, Fragment, type ReactNode, type CSSProperties } from "react";
import type { RichNode } from "@/lib/contracts";
function safeHref(value: unknown): string | undefined {
  return typeof value === "string" &&
    !/[\\\u0000-\u0020]/.test(value) &&
    (/^(https?:|mailto:|tel:)/i.test(value) || (value.startsWith("/") && !value.startsWith("//")))
    ? value
    : undefined;
}
function plainText(node: RichNode): string {
  return (node.text ?? "") + (node.content ?? []).map(plainText).join("");
}
function imageNodes(node: RichNode): RichNode[] {
  return [...(node.type === "image" ? [node] : []), ...(node.content ?? []).flatMap(imageNodes)];
}

function media(node: RichNode, privateMedia: boolean): ReactNode {
  const id = String(node.attrs?.assetId ?? "");
  if (!/^[a-f0-9-]{36}$/i.test(id)) return null;
  const img = (
    <img
      className={node.type === "inlineImage" ? "inline-image" : undefined}
      loading="lazy"
      src={"/api/v1/" + (privateMedia ? "admin" : "public") + "/media/" + id}
      alt={String(node.attrs?.alt ?? "")}
    />
  );
  const href = safeHref(node.attrs?.href);
  return href ? (
    <a href={href} rel="noopener noreferrer">
      {img}
    </a>
  ) : (
    img
  );
}

export function isLegacyBodyHeading(node: RichNode, imported: boolean): boolean {
  if (!imported || node.type !== "heading") return false;
  const label = plainText(node).trim();
  return /^[-–•]\s/.test(label) || label.length > 110;
}

function render(
  node: RichNode,
  privateMedia: boolean,
  imported: boolean,
  sectionId?: string,
): ReactNode {
  const align = String(node.attrs?.textAlign ?? "");
  const style: CSSProperties | undefined = ["left", "center", "right", "justify"].includes(align)
    ? { textAlign: align as CSSProperties["textAlign"] }
    : undefined;
  const children = node.content?.map((child, i) => (
    <Fragment key={i}>{render(child, privateMedia, imported)}</Fragment>
  ));
  switch (node.type) {
    case "doc":
      return children;
    case "text": {
      let text: ReactNode = node.text;
      for (const mark of node.marks ?? []) {
        switch (mark.type) {
          case "bold":
            text = <strong>{text}</strong>;
            break;
          case "italic":
            text = <em>{text}</em>;
            break;
          case "underline":
            text = <u>{text}</u>;
            break;
          case "strike":
            text = <s>{text}</s>;
            break;
          case "code":
            text = <code>{text}</code>;
            break;
          case "subscript":
            text = <sub>{text}</sub>;
            break;
          case "superscript":
            text = <sup>{text}</sup>;
            break;
          case "link":
            text = (
              <a href={safeHref(mark.attrs?.href)} rel="noopener noreferrer">
                {text}
              </a>
            );
            break;
        }
      }
      return text;
    }
    case "paragraph":
      return (
        <p
          style={style}
          className={
            imported && /^[-–•*+]\s/u.test(plainText(node).trim())
              ? "article-source-bullet"
              : undefined
          }
        >
          {children ?? <br />}
        </p>
      );
    case "heading":
      if (isLegacyBodyHeading(node, imported)) {
        return <p style={style}>{children}</p>;
      }
      return createElement(
        "h" + Math.min(6, Math.max(2, Number(node.attrs?.level) || 2)),
        { style, id: sectionId },
        children,
      );
    case "table":
      const rows = node.content ?? [];
      const cells = rows.flatMap((row) => row.content ?? []);
      const first = rows[0]?.content ?? [];
      const second = rows[1]?.content ?? [];
      const isPeopleTable =
        imported &&
        rows.length === 2 &&
        first.length >= 2 &&
        first.length <= 4 &&
        second.length === first.length &&
        first.every((cell) => imageNodes(cell).length === 0) &&
        second.every(
          (cell) => imageNodes(cell).length === 1 && /(?:email|e-mail)/i.test(plainText(cell)),
        );
      if (isPeopleTable) {
        return (
          <div className="article-people-grid" aria-label="Nhân sự bộ môn">
            {first.map((person, index) => {
              const photo = imageNodes(second[index])[0];
              return (
                <article className="article-person" key={index}>
                  <div className="article-person-photo">{media(photo, privateMedia)}</div>
                  <div className="article-person-details">
                    {(person.content ?? []).map((child, childIndex) => (
                      <Fragment key={childIndex}>{render(child, privateMedia, imported)}</Fragment>
                    ))}
                    {(second[index].content ?? [])
                      .filter((child) => child.type !== "image")
                      .map((child, childIndex) => (
                        <Fragment key={childIndex}>
                          {render(child, privateMedia, imported)}
                        </Fragment>
                      ))}
                  </div>
                </article>
              );
            })}
          </div>
        );
      }
      const isImageGallery =
        imported &&
        cells.length >= 2 &&
        cells.length <= 12 &&
        cells.every((cell) => imageNodes(cell).length === 1);
      if (isImageGallery) {
        return (
          <div className="article-image-gallery" aria-label="Hình ảnh bài viết">
            {cells.map((cell, index) => {
              const image = imageNodes(cell)[0];
              return (
                <figure key={index}>
                  {media(image, privateMedia)}
                  <figcaption>
                    {(cell.content ?? [])
                      .filter((child) => child.type !== "image")
                      .map((child, childIndex) => (
                        <Fragment key={childIndex}>
                          {render(child, privateMedia, imported)}
                        </Fragment>
                      ))}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        );
      }
      const firstCell = rows[0]?.content?.[0];
      const hasHeader =
        rows[0]?.content?.every((cell) => cell.type === "tableHeader") ||
        /^(stt|số thứ tự|no\.?|#)$/i.test(plainText(firstCell ?? { type: "text" }).trim());
      const headerRow =
        hasHeader && rows[0]
          ? {
              ...rows[0],
              content: rows[0].content?.map((cell) => ({ ...cell, type: "tableHeader" })),
            }
          : null;
      return (
        <>
          <span className="table-scroll-hint" aria-hidden="true">
            ↔ Vuốt ngang để xem toàn bộ bảng
          </span>
          <div
            className="table-scroll"
            role="region"
            aria-label="Bảng nội dung bài viết"
            tabIndex={0}
          >
            <table>
              {headerRow && <thead>{render(headerRow, privateMedia, imported)}</thead>}
              <tbody>
                {(headerRow ? rows.slice(1) : rows).map((row, index) => (
                  <Fragment key={index}>{render(row, privateMedia, imported)}</Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    case "tableRow":
      return <tr>{children}</tr>;
    case "tableCell":
    case "tableHeader":
      return createElement(
        node.type === "tableHeader" ? "th" : "td",
        { colSpan: Number(node.attrs?.colspan) || 1, rowSpan: Number(node.attrs?.rowspan) || 1 },
        children,
      );
    case "bulletList":
      return (
        <ul
          className={
            imported &&
            (node.content?.length ?? 0) >= 5 &&
            node.content?.every(
              (item) =>
                plainText(item).trim().length <= 90 &&
                !item.content?.some((part) =>
                  ["bulletList", "orderedList", "table", "image"].includes(part.type),
                ),
            )
              ? "article-compact-list"
              : undefined
          }
        >
          {children}
        </ul>
      );
    case "orderedList":
      return (
        <ol
          id={sectionId}
          className={sectionId ? "article-section-list" : undefined}
          start={Number(node.attrs?.start) || 1}
        >
          {children}
        </ol>
      );
    case "listItem":
      return <li>{children}</li>;
    case "blockquote":
      return <blockquote>{children}</blockquote>;
    case "codeBlock":
      return (
        <pre>
          <code>{children}</code>
        </pre>
      );
    case "hardBreak":
      return <br />;
    case "horizontalRule":
      return <hr />;
    case "inlineImage":
    case "image": {
      const caption = String(node.attrs?.caption ?? node.attrs?.alt ?? "");
      const image = media(node, privateMedia);
      if (node.type === "inlineImage") return image;
      return image ? (
        <figure>
          {image}
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      ) : null;
    }
    default:
      return null;
  }
}
export function ContentRenderer({
  document,
  privateMedia = false,
  imported = false,
  sectionIds = {},
}: {
  document: RichNode;
  privateMedia?: boolean;
  imported?: boolean;
  sectionIds?: Record<number, string>;
}) {
  return (
    <div className="prose">
      {document.type === "doc"
        ? document.content?.map((node, index) => (
            <Fragment key={index}>
              {render(node, privateMedia, imported, sectionIds[index])}
            </Fragment>
          ))
        : render(document, privateMedia, imported)}
    </div>
  );
}
