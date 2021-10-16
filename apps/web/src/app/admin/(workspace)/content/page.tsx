import Link from "next/link";
import { ArrowUpRight, ChevronRight, FileText, Search, Tags } from "lucide-react";
import { articleThumbnail } from "@/lib/default-thumbnails";
import { serverApi, requireUser } from "@/lib/server-api";
import {
  categoryLabel,
  statusLabels,
  dateLabel,
  type ArticleCategory,
  type AdminContent,
  type PageResult,
} from "@/lib/contracts";
import { CreateButton } from "@/features/publishing/components/create-button";
export default async function ContentList({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; category?: string; status?: string }>;
}) {
  const user = await requireUser();
  const filters = await searchParams;
  const page = Math.max(0, Number(filters.page) || 0);
  const q = (filters.q ?? "").slice(0, 200),
    category = filters.category ?? "",
    status = filters.status ?? "";
  const params = new URLSearchParams({ page: String(page), size: "20", q, category, status });
  const [result, categoryOptions] = await Promise.all([
    serverApi<PageResult<AdminContent>>("/admin/content?" + params, true),
    serverApi<ArticleCategory[]>("/public/categories"),
  ]);
  const pageHref = (next: number) =>
    "?" + new URLSearchParams({ page: String(next), q, category, status });
  return (
    <>
      <header className="admin-topbar">
        <span>
          Nội dung <ChevronRight size={14} /> Bài viết
        </span>
        <Link href="/vi" target="_blank">
          Website <ArrowUpRight size={16} />
        </Link>
      </header>
      <div className="admin-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">QUẢN LÝ NỘI DUNG</p>
            <h1>Bài viết</h1>
            <p className="muted">Tìm bài, cập nhật bản nháp và đăng nội dung lên website.</p>
          </div>
          <CreateButton />
        </div>
        <form className="admin-list-filters" role="search">
          <label className="admin-search-input">
            <Search size={18} aria-hidden="true" />
            <input
              name="q"
              defaultValue={q}
              maxLength={200}
              placeholder="Tìm tiêu đề hoặc tóm tắt…"
              aria-label="Tìm bài viết"
            />
          </label>
          <select name="category" defaultValue={category} aria-label="Lọc chuyên mục">
            <option value="">Tất cả chuyên mục</option>
            {categoryOptions.map((item) => (
              <option value={item.code} key={item.code}>
                {item.nameVi}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} aria-label="Lọc trạng thái">
            <option value="">Tất cả trạng thái</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
          <button className="button secondary" type="submit">
            Lọc bài viết
          </button>
          {(q || category || status) && (
            <Link className="text-link" href="/admin/content">
              Xóa lọc
            </Link>
          )}
        </form>
        <div className="table-panel">
          <div className="table-title">
            <strong>{q || category || status ? "Kết quả lọc" : "Tất cả bài viết"}</strong>
            <span className="count">{result.total}</span>
            {user.permissions.includes("site:manage") && (
              <Link className="table-title-link" href="/admin/categories">
                <Tags size={16} /> Quản lý chuyên mục
              </Link>
            )}
          </div>
          {result.items.length ? (
            <div className="table-scroll">
              <table className="content-table">
                <thead>
                  <tr>
                    <th>Bài viết</th>
                    <th>Chuyên mục</th>
                    <th>Trạng thái</th>
                    <th>Cập nhật</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <Link href={"/admin/content/" + item.id}>
                          <span className="table-thumbnail">
                            <img
                              src={
                                item.coverId
                                  ? "/api/v1/admin/media/" + item.coverId
                                  : articleThumbnail(item.category)
                              }
                              alt=""
                            />
                          </span>
                          <span>
                            <strong>{item.title || "Bài viết chưa có tiêu đề"}</strong>
                            <small>{item.locale === "vi" ? "Tiếng Việt" : "English"}</small>
                          </span>
                        </Link>
                      </td>
                      <td>{categoryLabel(item.category, item.locale, categoryOptions)}</td>
                      <td>
                        <span className={"badge " + item.status.toLowerCase()}>
                          {statusLabels[item.status]}
                        </span>
                      </td>
                      <td>{dateLabel(item.updatedAt)}</td>
                      <td>
                        <Link
                          className="icon-button"
                          href={"/admin/content/" + item.id}
                          aria-label={"Chỉnh sửa " + (item.title || "bài viết")}
                        >
                          <ChevronRight size={20} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={36} />
              <h2>
                {q || category || status
                  ? "Không tìm thấy bài phù hợp"
                  : "Bắt đầu câu chuyện đầu tiên"}
              </h2>
              <p>
                {q || category || status
                  ? "Thử từ khóa hoặc bộ lọc khác."
                  : "Tạo bản nháp, thêm ảnh và đăng bài khi bạn sẵn sàng."}
              </p>
              {q || category || status ? (
                <Link className="button secondary" href="/admin/content">
                  Xem tất cả
                </Link>
              ) : (
                <CreateButton />
              )}
            </div>
          )}
        </div>
        <nav className="pagination" aria-label="Phân trang">
          {page > 0 && (
            <Link className="button" href={pageHref(page - 1)}>
              Trang trước
            </Link>
          )}
          <span>Trang {page + 1}</span>
          {(page + 1) * 20 < result.total && (
            <Link className="button" href={pageHref(page + 1)}>
              Trang sau
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
