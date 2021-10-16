import { requirePermission, serverApi } from "@/lib/server-api";
import { EditorialManager } from "@/features/editorial/editorial-manager";
import type { EditorialItem, EditorialKind } from "@/features/editorial/contracts";

export default async function EditorialAdmin({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; locale?: string }>;
}) {
  await requirePermission("editorial:manage");
  const query = await searchParams;
  const kind: EditorialKind = query.kind === "EVENT" || query.kind === "JOB" ? query.kind : "NEWS";
  const locale = query.locale === "en" ? "en" : "vi";
  const items = await serverApi<EditorialItem[]>(
    `/admin/editorial?kind=${kind}&locale=${locale}`,
    true,
  );
  return <EditorialManager initial={items} kind={kind} locale={locale} />;
}
