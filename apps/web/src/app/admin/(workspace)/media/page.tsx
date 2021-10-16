import { requireUser, serverApi } from "@/lib/server-api";
import type { Asset } from "@/lib/contracts";
import { MediaLibrary } from "@/features/media/media-library";
export default async function MediaPage() {
  await requireUser();
  const assets = await serverApi<Asset[]>("/admin/media", true);
  return (
    <>
      <header className="admin-topbar">Nội dung / Thư viện ảnh</header>
      <div className="admin-content">
        <MediaLibrary initial={assets} />
      </div>
    </>
  );
}
