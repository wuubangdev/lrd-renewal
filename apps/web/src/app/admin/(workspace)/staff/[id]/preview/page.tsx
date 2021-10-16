import Link from "next/link";
import { requirePermission, serverApi } from "@/lib/server-api";
import { StaffView } from "@/features/directory/staff-view";
import type { StaffProfile } from "@/features/directory/contracts";

export default async function StaffPreview({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("directory:manage");
  const { id } = await params;
  const profile = await serverApi<StaffProfile>(`/admin/people/${id}`, true);
  return (
    <>
      <header className="preview-banner">
        <strong>BẢN XEM TRƯỚC · HỒ SƠ CHƯA CÔNG KHAI</strong>
        <Link href={`/admin/staff/${id}`}>← Quay lại biên tập</Link>
      </header>
      <div className="container">
        <StaffView
          admin
          profile={{
            id,
            locale: profile.locale,
            details: profile.draft,
            publishedAt: profile.publishedAt ?? new Date().toISOString(),
          }}
        />
      </div>
    </>
  );
}
