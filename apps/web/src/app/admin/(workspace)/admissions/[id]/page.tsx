import { adminEditor } from "@/features/academics/server-pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return adminEditor("admissions", (await params).id);
}
