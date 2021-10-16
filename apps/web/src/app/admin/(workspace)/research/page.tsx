import { requirePermission, serverApi } from "@/lib/server-api";
import { ResearchManager } from "@/features/research/research-manager";
import {
  researchKinds,
  type ResearchKind,
  type ResearchPage,
  type ResearchRecord,
} from "@/features/research/contracts";
export default async function ResearchAdmin({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; locale?: string; page?: string }>;
}) {
  await requirePermission("research:manage");
  const q = await searchParams;
  const kind: ResearchKind = researchKinds.includes(q.kind as ResearchKind)
    ? (q.kind as ResearchKind)
    : "PROJECT";
  const locale = q.locale === "en" ? "en" : "vi";
  const page = Math.max(0, Number(q.page) || 0);
  const data = await serverApi<ResearchPage<ResearchRecord>>(
    `/admin/research?kind=${kind}&locale=${locale}&page=${page}&size=20`,
    true,
  );
  return <ResearchManager data={data} kind={kind} locale={locale} />;
}
