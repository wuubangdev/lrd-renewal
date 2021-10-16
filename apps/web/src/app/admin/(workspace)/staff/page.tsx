import { requirePermission, serverApi } from "@/lib/server-api";
import type { StaffProfile } from "@/features/directory/contracts";
import { StaffManager } from "@/features/directory/staff-manager";

export default async function StaffAdmin({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  await requirePermission("directory:manage");
  const locale = (await searchParams).locale === "en" ? "en" : "vi";
  const people = await serverApi<StaffProfile[]>(`/admin/people?locale=${locale}`, true);
  return <StaffManager initial={people} locale={locale} />;
}
