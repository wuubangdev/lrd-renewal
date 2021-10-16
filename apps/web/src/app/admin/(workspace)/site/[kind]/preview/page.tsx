import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission, serverApi } from "@/lib/server-api";
import { HomeRenderer } from "@/features/site/home-renderer";
import { HeaderContent } from "@/components/public-header";
import { FooterContent } from "@/components/public-footer";
import type { SiteRender, HomeComposition, NavigationMenu } from "@/features/site/contracts";
export default async function SitePreview({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ locale?: string }>;
}) {
  await requirePermission("site:manage");
  const { kind } = await params,
    locale = (await searchParams).locale ?? "vi";
  if (!["home", "menu"].includes(kind) || !["vi", "en"].includes(locale)) notFound();
  const data = await serverApi<SiteRender>(
    "/admin/site/" + kind + "/preview?locale=" + locale,
    true,
  );
  return (
    <div className="site-preview">
      <div className="preview-banner">
        <span>BẢN XEM TRƯỚC · Chưa công khai</span>
        <Link href={"/admin/site/" + kind + "?locale=" + locale}>Quay lại chỉnh sửa</Link>
      </div>
      {kind === "home" ? (
        <>
          <HomeRenderer data={data as SiteRender<HomeComposition>} preview />
          <FooterContent locale={locale} footer={(data.content as HomeComposition).footer} />
        </>
      ) : (
        <>
          <HeaderContent data={data as SiteRender<NavigationMenu>} />
          <div className="admin-content">
            <h1>Xem trước menu</h1>
            <p>
              Thử menu bằng chuột, bàn phím hoặc ở kích thước màn hình di động. Bài viết chưa công
              khai sẽ không có liên kết.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
