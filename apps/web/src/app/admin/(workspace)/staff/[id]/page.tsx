import { notFound } from "next/navigation";
import { requirePermission, serverApi } from "@/lib/server-api";
import type { StaffProfile } from "@/features/directory/contracts";
import { StaffEditor } from "@/features/directory/staff-editor";

export default async function StaffEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("directory:manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const profile = await serverApi<StaffProfile>(`/admin/people/${id}`, true);
  return <StaffEditor initial={profile} />;
}
