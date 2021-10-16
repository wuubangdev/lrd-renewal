import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ResearchCard } from "@/features/research/research-public";
import type { PublicResearch } from "@/features/research/contracts";
export default async function AuthorWorks({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const items = await serverApi<PublicResearch[]>(
    `/public/research/by-staff/${id}?locale=${locale}`,
  );
  if (!items.length) notFound();
  const name =
    items.flatMap((item) => item.authors).find((a) => a.staffId === id)?.name ?? "Cán bộ";
  return (
    <main className="container research-page">
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href={`/${locale}`}>Trang chủ</Link>
        <span>/</span>
        <Link href={`/${locale}/nghien-cuu`}>Nghiên cứu</Link>
      </nav>
      <p className="eyebrow">TÁC GIẢ</p>
      <h1>{name}</h1>
      <p className="lede">{items.length} công trình đã công khai.</p>
      <div className="research-grid">
        {items.map((item) => (
          <ResearchCard key={item.id} item={item} />
        ))}
      </div>
    </main>
  );
}
