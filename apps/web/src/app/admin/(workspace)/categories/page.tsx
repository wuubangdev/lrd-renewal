import { requirePermission, serverApi } from "@/lib/server-api";
import type { ArticleCategory } from "@/lib/contracts";
import { CategoryManager } from "@/features/publishing/components/category-manager";

export default async function CategoriesPage() {
  await requirePermission("site:manage");
  const items = await serverApi<ArticleCategory[]>("/public/categories");
  return <CategoryManager initial={items} />;
}
