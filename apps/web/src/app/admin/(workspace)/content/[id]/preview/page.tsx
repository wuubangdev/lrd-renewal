import Link from "next/link";
import { requireUser, serverApi } from "@/lib/server-api";
import type { AdminContent, ArticleCategory } from "@/lib/contracts";
import { Article } from "@/features/publishing/components/article";
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(),
    { id } = await params;
  const content = await serverApi<AdminContent>("/admin/content/" + id, true);
  const categoryOptions = await serverApi<ArticleCategory[]>("/public/categories");
  return (
    <>
      <header className="preview-banner">
        <strong>BẢN XEM TRƯỚC · NỘI DUNG CHƯA CÔNG KHAI</strong>
        <Link href={"/admin/content/" + id}>← Quay lại biên tập</Link>
      </header>
      <div className="preview-content">
        <Article
          privateMedia
          categoryOptions={categoryOptions}
          article={{
            ...content,
            publicUrl: content.publicUrl ?? "",
            authorName: user.name,
            publishedAt: content.publishedAt ?? new Date().toISOString(),
          }}
        />
      </div>
    </>
  );
}
