import type { Metadata } from "next";
import {
  EditorialPublicDetail,
  editorialMetadata,
} from "@/features/editorial/editorial-public-detail";
type Params = { locale: string; slug: string };
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return editorialMetadata("EVENT", locale, slug);
}
export default async function EventDetail({ params }: { params: Promise<Params> }) {
  return <EditorialPublicDetail kind="EVENT" {...await params} />;
}
