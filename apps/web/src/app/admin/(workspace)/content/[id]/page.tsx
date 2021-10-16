import { notFound } from "next/navigation";
import { requireUser, serverApi } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import type { AdminContent } from "@/lib/contracts";
import { ContentEditor } from "@/features/publishing/components/content-editor";
export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  try {
    const content = await serverApi<AdminContent>("/admin/content/" + id, true);
    return <ContentEditor key={id} initial={content} />;
  } catch (e) {
    if (e instanceof ApiError && [403, 404].includes(e.status)) notFound();
    throw e;
  }
}
