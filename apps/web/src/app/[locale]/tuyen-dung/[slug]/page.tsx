import type { Metadata } from "next";
import {
  EditorialPublicDetail,
  editorialMetadata,
} from "@/features/editorial/editorial-public-detail";
type Params = { locale: string; slug: string };
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  return editorialMetadata("JOB", locale, slug);
}
export default async function JobDetail({ params }: { params: Promise<Params> }) {
  return <EditorialPublicDetail kind="JOB" {...await params} />;
}
