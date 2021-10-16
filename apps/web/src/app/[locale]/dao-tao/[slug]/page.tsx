import { publicDetail, detailMetadata } from "@/features/academics/server-pages";
type Params = { locale: string; slug: string };
export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const p = await params;
  return detailMetadata("programs", p.locale, p.slug);
}
export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params;
  return publicDetail("programs", p.locale, p.slug);
}
