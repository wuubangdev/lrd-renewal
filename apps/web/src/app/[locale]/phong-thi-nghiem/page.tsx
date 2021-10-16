import Link from "next/link";
import { serverApi } from "@/lib/server-api";
import type { PublicLaboratory } from "@/features/directory/laboratory-contracts";
import { defaultThumbnail } from "@/lib/default-thumbnails";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Laboratories" : "Phòng thí nghiệm" };
}
export default async function Laboratories({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const labs = await serverApi<PublicLaboratory[]>(`/public/laboratories?locale=${locale}`);
  return (
    <main className="container lab-directory">
      <p className="eyebrow">
        {locale === "en" ? "LAND RESOURCES DEPARTMENT" : "BỘ MÔN TÀI NGUYÊN ĐẤT ĐAI"}
      </p>
      <h1>{locale === "en" ? "Laboratories" : "Phòng thí nghiệm"}</h1>
      <p className="lede">
        {locale === "en"
          ? "Spaces for practical learning and research, collaboration and knowledge transfer."
          : "Không gian thực hành và nghiên cứu phục vụ đào tạo, hợp tác và chuyển giao tri thức."}
      </p>
      <div className="lab-directory-grid">
        {labs.map(({ id, details }) => (
          <Link
            className="lab-directory-item"
            href={`/${locale}/phong-thi-nghiem/${details.slug}`}
            key={id}
          >
            <span className="lab-directory-image">
              <img
                src={
                  details.coverId
                    ? `/api/v1/public/media/${details.coverId}`
                    : defaultThumbnail("laboratory")
                }
                alt=""
                loading="lazy"
              />
            </span>
            <span className="lab-directory-copy">
              <small>{locale === "en" ? "LABORATORY" : "PHÒNG THÍ NGHIỆM"}</small>
              <strong>{details.name}</strong>
              <span>{details.summary}</span>
              <b>{locale === "en" ? "Explore laboratory ↗" : "Khám phá phòng thí nghiệm ↗"}</b>
            </span>
          </Link>
        ))}
      </div>
      {!labs.length && (
        <p>
          {locale === "en"
            ? "Laboratory information coming soon."
            : "Thông tin phòng thí nghiệm đang được cập nhật."}
        </p>
      )}
    </main>
  );
}
