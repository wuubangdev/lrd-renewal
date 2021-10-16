import { serverApi } from "@/lib/server-api";
import type { PublicStaff } from "@/features/directory/contracts";
import { StaffDirectoryView } from "@/features/directory/staff-directory-view";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return { title: locale === "en" ? "Faculty" : "Đội ngũ cán bộ" };
}
export default async function StaffDirectory({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const people = await serverApi<PublicStaff[]>(`/public/people?locale=${locale}`);
  return <StaffDirectoryView locale={locale} people={people} />;
}
