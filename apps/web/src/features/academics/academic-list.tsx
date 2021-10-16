"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { api } from "@/lib/browser-api";
import { SpreadsheetImport } from "@/components/spreadsheet-import";
import { dateLabel, type PageResult } from "@/lib/contracts";
import {
  type AcademicView,
  type Kind,
  type Level,
  levels,
  statuses,
  admissionStatuses,
  publicPath,
} from "./contracts";
export function AcademicList({
  kind,
  data,
  query,
  locale,
}: {
  kind: Kind;
  data: PageResult<AcademicView>;
  query: string;
  locale: string;
}) {
  const router = useRouter(),
    [creating, setCreating] = useState(false),
    [code, setCode] = useState(""),
    [language, setLanguage] = useState(locale || "vi"),
    [level, setLevel] = useState<Level>("UNDERGRADUATE"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const title = kind === "programs" ? "Chương trình đào tạo" : "Tuyển sinh";
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const v = await api<AcademicView>("/admin/academics/" + kind, {
        method: "POST",
        body: JSON.stringify({ code, locale: language, level }),
      });
      router.push("/admin/" + kind + "/" + v.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const pageHref = (page: number) =>
    "?" + new URLSearchParams({ q: query, locale, page: String(page) });
  return (
    <>
      <header className="admin-topbar">Đào tạo & tuyển sinh / {title}</header>
      <div className="admin-content">
        <div className="section-heading academic-list-heading">
          <div>
            <p className="eyebrow">ĐÀO TẠO & TUYỂN SINH</p>
            <h1>{title}</h1>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setError("");
              setCreating(true);
            }}
          >
            <Plus size={18} />
            Tạo {kind === "programs" ? "chương trình" : "đợt tuyển"}
          </button>
        </div>
        <div className="academic-list-summary">
          <p>{data.total} nội dung · Lưu nháp, cập nhật và công khai trực tiếp.</p>
          <Link className="text-link" href={publicPath(kind, locale || "vi")} target="_blank">
            Xem trang public <ArrowUpRight size={17} />
          </Link>
        </div>
        {kind === "programs" && <SpreadsheetImport title="Chương trình đào tạo"
          endpoint="/admin/academics/programs/spreadsheet"
          itemHref={(id) => `/admin/programs/${id}`} />}
        <form className="academic-filters" role="search">
          <label>
            Tìm tên hoặc mã
            <input name="q" defaultValue={query} maxLength={200} placeholder="Tên hoặc mã…" />
          </label>
          <label>
            Ngôn ngữ
            <select name="locale" defaultValue={locale}>
              <option value="">Tất cả</option>
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </label>
          <button className="button secondary">Tìm kiếm</button>
        </form>
        <div className="table-panel">
          <p className="admin-table-hint">Vuốt ngang để xem trạng thái và ngày cập nhật.</p>
          <div
            className="table-scroll"
            role="region"
            aria-label={"Danh sách " + title}
            tabIndex={0}
          >
            <table className="content-table">
              <thead>
                <tr>
                  <th>Nội dung</th>
                  <th>Bậc học</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link className="content-title" href={"/admin/" + kind + "/" + item.id}>
                        {item.content.title || "Chưa đặt tên"}
                      </Link>
                      <small>
                        {item.code} · {item.locale.toUpperCase()}
                      </small>
                    </td>
                    <td>{levels[item.level]}</td>
                    <td>
                      <span
                        className={"badge " + (item.status === "PUBLISHED" ? "published" : "draft")}
                      >
                        {statuses[item.status]}
                      </span>
                      {item.admissionStatus && (
                        <small>{admissionStatuses[item.admissionStatus]}</small>
                      )}
                    </td>
                    <td>{dateLabel(item.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!data.items.length && (
            <div className="empty-state">
              <h2>Chưa có {kind === "programs" ? "chương trình" : "đợt tuyển"} phù hợp</h2>
              <p>Tạo nội dung đầu tiên hoặc thay đổi bộ lọc tìm kiếm.</p>
            </div>
          )}
        </div>
        <nav className="pagination" aria-label="Phân trang">
          {data.page > 0 && (
            <Link className="button secondary" href={pageHref(data.page - 1)}>
              Trang trước
            </Link>
          )}
          <span>
            Trang {data.page + 1} / {Math.max(1, Math.ceil(data.total / data.size))}
          </span>
          {(data.page + 1) * data.size < data.total && (
            <Link className="button secondary" href={pageHref(data.page + 1)}>
              Trang sau
            </Link>
          )}
        </nav>
      </div>
      {creating && (
        <Dialog
          title={"Tạo " + (kind === "programs" ? "chương trình đào tạo" : "đợt tuyển sinh")}
          onClose={() => !busy && setCreating(false)}
        >
          <form className="manage-form" onSubmit={create}>
            <p>
              Mã, ngôn ngữ và bậc học được giữ cố định. Các nội dung khác có thể cập nhật trong bản
              nháp.
            </p>
            <label>
              Mã định danh
              <input
                required
                minLength={2}
                maxLength={30}
                pattern="[A-Za-z0-9][A-Za-z0-9._-]{1,29}"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={kind === "programs" ? "VD: QLDD-DH" : "VD: TS-2026-DH"}
              />
            </label>
            <label>
              Ngôn ngữ
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>
            <label>
              Bậc đào tạo
              <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
                {Object.entries(levels).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <button disabled={busy} className="button primary">
              {busy ? "Đang tạo…" : "Tạo bản nháp"}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
