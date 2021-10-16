import { notFound } from "next/navigation";
import { requirePermission, serverApi } from "@/lib/server-api";
import { ResearchEditor } from "@/features/research/research-editor";
import type { ResearchRecord } from "@/features/research/contracts";
import type { StaffProfile } from "@/features/directory/contracts";
export default async function ResearchEdit({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("research:manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const record = await serverApi<ResearchRecord>(`/admin/research/${id}`, true);
  const profiles = await serverApi<StaffProfile[]>(`/admin/people?locale=${record.locale}`, true);
  const people = profiles.map((profile) => ({
    id: profile.id,
    name: profile.draft.name,
    published: !!profile.live,
  }));
  return <ResearchEditor initial={record} people={people} />;
}
