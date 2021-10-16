import { notFound } from "next/navigation";
import { requirePermission, serverApi } from "@/lib/server-api";
import type { EditorialItem } from "@/features/editorial/contracts";
import { EditorialEditor } from "@/features/editorial/editorial-editor";
export default async function EditorialEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("editorial:manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const item = await serverApi<EditorialItem>(`/admin/editorial/${id}`, true);
  return <EditorialEditor initial={item} />;
}
