import { adminEditor } from "@/features/academics/server-pages";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return adminEditor("programs", (await params).id);
}
