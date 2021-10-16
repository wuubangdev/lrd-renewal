import { adminPreview } from "@/features/academics/server-pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return adminPreview("admissions", (await params).id);
}
