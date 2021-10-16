import { publicList, listMetadata, type Query } from "@/features/academics/server-pages";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  return listMetadata("programs", (await params).locale);
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Query>;
}) {
  return publicList("programs", (await params).locale, await searchParams);
}
