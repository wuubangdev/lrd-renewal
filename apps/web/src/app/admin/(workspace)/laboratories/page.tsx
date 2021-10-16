import { requirePermission, serverApi } from "@/lib/server-api";
import type { LaboratoryProfile } from "@/features/directory/laboratory-contracts";
import { LaboratoryManager } from "@/features/directory/laboratory-manager";

export default async function LaboratoriesAdmin({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  await requirePermission("directory:manage");
  const locale = (await searchParams).locale === "en" ? "en" : "vi";
  const labs = await serverApi<LaboratoryProfile[]>(`/admin/laboratories?locale=${locale}`, true);
  return <LaboratoryManager initial={labs} locale={locale} />;
}
