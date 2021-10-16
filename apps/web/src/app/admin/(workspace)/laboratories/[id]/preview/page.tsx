import Link from "next/link";
import { requirePermission, serverApi } from "@/lib/server-api";
import type { LaboratoryProfile } from "@/features/directory/laboratory-contracts";
import { LaboratoryView } from "@/features/directory/laboratory-view";

export default async function LaboratoryPreview({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("directory:manage");
  const { id } = await params;
  const profile = await serverApi<LaboratoryProfile>(`/admin/laboratories/${id}`, true);
  return (
    <>
      <header className="preview-banner">
        <strong>BẢN XEM TRƯỚC · CHƯA CÔNG KHAI</strong>
        <Link href={`/admin/laboratories/${id}`}>← Quay lại biên tập</Link>
      </header>
      <LaboratoryView
        admin
        profile={{
          id,
          locale: profile.locale,
          details: profile.draft,
          publishedAt: profile.publishedAt ?? new Date().toISOString(),
        }}
      />
    </>
  );
}
