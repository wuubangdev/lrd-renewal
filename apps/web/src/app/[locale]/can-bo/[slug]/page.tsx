import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import { StaffView } from "@/features/directory/staff-view";
import type { PublicStaff } from "@/features/directory/contracts";
import type { PublicResearch } from "@/features/research/contracts";
import { ResearchCard } from "@/features/research/research-public";
import Link from "next/link";

export default async function StaffDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  let person: PublicStaff;
  try {
    person = await serverApi<PublicStaff>(
      `/public/people/${encodeURIComponent(slug)}?locale=${locale}`,
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  const works = await serverApi<PublicResearch[]>(
    `/public/research/by-staff/${person.id}?locale=${locale}`,
  );
  return (
    <div className="container">
      <StaffView profile={person} />
      {works.length > 0 && (
        <section className="staff-research">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CÔNG TRÌNH LIÊN KẾT</p>
              <h2>Nghiên cứu & xuất bản</h2>
              <p className="muted">
                {works.length} công trình ghi nhận cán bộ là tác giả hoặc thành viên.
              </p>
            </div>
            {works.length > 6 && (
              <Link className="text-link" href={`/${locale}/nghien-cuu/tac-gia/${person.id}`}>
                Xem tất cả ↗
              </Link>
            )}
          </div>
          <div className="research-grid">
            {works.slice(0, 6).map((work) => (
              <ResearchCard key={work.id} item={work} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
