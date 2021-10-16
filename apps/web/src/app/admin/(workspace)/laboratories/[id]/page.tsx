import { notFound } from "next/navigation";
import { requirePermission, serverApi } from "@/lib/server-api";
import type { LaboratoryProfile } from "@/features/directory/laboratory-contracts";
import { LaboratoryEditor } from "@/features/directory/laboratory-editor";

export default async function LaboratoryEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("directory:manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lab = await serverApi<LaboratoryProfile>(`/admin/laboratories/${id}`, true);
  return <LaboratoryEditor initial={lab} />;
}
