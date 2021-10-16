import { notFound } from "next/navigation";
import { requirePermission, serverApi } from "@/lib/server-api";
import { SiteEditor } from "@/features/site/site-editor";
import type { SiteView } from "@/features/site/contracts";
export default async function SitePage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  await requirePermission("site:manage");
  const { kind } = await params,
    locale = (await searchParams).locale ?? "vi";
  if (!["home", "menu"].includes(kind) || !["vi", "en"].includes(locale)) notFound();
  const initial = await serverApi<SiteView>("/admin/site/" + kind + "?locale=" + locale, true);
  return <SiteEditor key={kind + locale} initial={initial} />;
}
