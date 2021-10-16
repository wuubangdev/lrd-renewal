/** Static artwork used only when an editorial asset has not been selected. */
export type ThumbnailKind =
  | "program"
  | "admission"
  | "laboratory"
  | "event"
  | "job"
  | "news"
  | "research"
  | "publication"
  | "textbook"
  | "document"
  | "staff";

export function defaultThumbnail(kind: ThumbnailKind): string {
  return `/images/defaults/${kind}.svg`;
}

export function researchThumbnail(kind: string): string {
  return defaultThumbnail(
    kind === "PROJECT"
      ? "research"
      : kind === "TEXTBOOK"
        ? "textbook"
        : kind === "DOCUMENT"
          ? "document"
          : kind === "CONFERENCE_PAPER"
            ? "event"
            : "publication",
  );
}

export function editorialThumbnail(kind: string): string {
  return defaultThumbnail(kind === "EVENT" ? "event" : kind === "JOB" ? "job" : "news");
}

export function articleThumbnail(category: string): string {
  return defaultThumbnail(
    category === "DAO_TAO"
      ? "program"
      : category === "TUYEN_SINH"
        ? "admission"
        : category === "NGHIEN_CUU"
          ? "research"
          : category === "SU_KIEN"
            ? "event"
            : "news",
  );
}
