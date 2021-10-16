"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/browser-api";
import { SpreadsheetImport } from "@/components/spreadsheet-import";
import { researchThumbnail } from "@/lib/default-thumbnails";
import {
  researchKinds,
  researchLabels,
  researchPath,
  type ResearchKind,
  type ResearchPage,
  type ResearchRecord,
} from "./contracts";

export function ResearchManager({
  data,
  kind,
  locale,
}: {
  data: ResearchPage<ResearchRecord>;
  kind: ResearchKind;
  locale: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows = data.items.filter((x) =>
    [x.draft.title, x.draft.citation]
      .join(" ")
      .toLocaleLowerCase("vi-VN")
      .includes(q.toLocaleLowerCase("vi-VN")),
  );
  async function create() {
    setBusy(true);
    setError("");
    try {
      const r = await api<ResearchRecord>("/admin/research", {
        method: "POST",
        body: JSON.stringify({ kind, locale }),
      });
      router.push(`/admin/research/${r.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  const query = (page: number) => `/admin/research?kind=${kind}&locale=${locale}&page=${page}`;
  return (
    <>
      <header className="admin-topbar">Nội dung / Nghiên cứu</header>
      <div className="admin-content staff-admin-list">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HỒ SƠ CÓ CẤU TRÚC</p>
            <h1>{researchLabels[kind]}</h1>
            <p className="muted">
              Mỗi công trình là một bản ghi riêng; tác giả có thể liên kết với hồ sơ cán bộ.
            </p>
          </div>
          <button className="button primary" disabled={busy} onClick={create}>
            <Plus size={18} /> Tạo bản ghi
          </button>
        </div>
        <div className="research-kind-tabs" role="navigation" aria-label="Loại công trình">
          {researchKinds.map((k) => (
            <Link
              key={k}
              className={kind === k ? "active" : ""}
              href={`/admin/research?kind=${k}&locale=${locale}`}
            >
              {researchLabels[k]}
            </Link>
          ))}
        </div>
        <div className="staff-admin-tools">
          <label className="admin-search-input">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Lọc trang hiện tại…"
              aria-label="Lọc bản ghi"
            />
          </label>
          <select
            value={locale}
            aria-label="Ngôn ngữ"
            onChange={(e) => router.push(`/admin/research?kind=${kind}&locale=${e.target.value}`)}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
          <Link className="button secondary" href={researchPath(kind, locale)} target="_blank">
            Xem trang public
          </Link>
        </div>
        <SpreadsheetImport
          title={researchLabels[kind]}
          endpoint="/admin/research/spreadsheet"
          params={{ kind, locale }}
          itemHref={(id) => `/admin/research/${id}`}
        />
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <p className="muted">{data.total} bản ghi</p>
        <div className="staff-admin-rows">
          {rows.map((r) => (
            <Link className="staff-admin-row" href={`/admin/research/${r.id}`} key={r.id}>
              <span className="staff-admin-avatar">
                <img
                  src={
                    r.draft.coverId
                      ? `/api/v1/admin/media/${r.draft.coverId}`
                      : researchThumbnail(kind)
                  }
                  alt=""
                />
              </span>
              <span>
                <strong>{r.draft.title || "Chưa có tiêu đề"}</strong>
                <small>
                  {[r.draft.year, r.draft.venue].filter(Boolean).join(" · ") || r.draft.slug}
                </small>
              </span>
              <span className={`badge ${r.live ? "published" : "draft"}`}>
                {r.live ? "Công khai" : "Bản nháp"}
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
          {!rows.length && (
            <div className="empty-state">
              <h2>Không có bản ghi</h2>
            </div>
          )}
        </div>
        {data.total > data.size && (
          <nav className="pagination" aria-label="Phân trang">
            {data.page > 0 && (
              <Link className="button secondary" href={query(data.page - 1)}>
                Trang trước
              </Link>
            )}
            <span>Trang {data.page + 1}</span>
            {(data.page + 1) * data.size < data.total && (
              <Link className="button secondary" href={query(data.page + 1)}>
                Trang sau
              </Link>
            )}
          </nav>
        )}
      </div>
    </>
  );
}
