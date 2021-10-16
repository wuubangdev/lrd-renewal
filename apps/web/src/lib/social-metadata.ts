import type { Metadata } from "next";

export function absoluteSiteUrl(path: string) {
  return new URL(path, process.env.SITE_URL ?? "http://localhost:3000").toString();
}

export function socialMetadata({
  path,
  title,
  description,
  locale,
  imageId,
  publishedTime,
  author,
}: {
  path: string;
  title: string;
  description: string;
  locale: string;
  imageId?: string | null;
  publishedTime?: string | null;
  author?: string | null;
}): Metadata {
  const url = absoluteSiteUrl(path);
  const image = absoluteSiteUrl(imageId ? `/api/v1/public/media/${imageId}` : "/opengraph-image");
  return {
    title,
    description,
    authors: author ? [{ name: author }] : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: publishedTime ? "article" : "website",
      url,
      siteName: "Bộ môn Tài nguyên Đất đai · Đại học Cần Thơ",
      locale: locale === "en" ? "en_US" : "vi_VN",
      title,
      description,
      images: [{ url: image, alt: title, ...(imageId ? {} : { width: 1200, height: 630 }) }],
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
