import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import { LaboratoryView } from "@/features/directory/laboratory-view";
import type { PublicLaboratory } from "@/features/directory/laboratory-contracts";

export default async function LaboratoryDetail({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  let laboratory: PublicLaboratory;
  try {
    laboratory = await serverApi<PublicLaboratory>(
      `/public/laboratories/${encodeURIComponent(slug)}?locale=${locale}`,
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
  return <LaboratoryView profile={laboratory} />;
}
