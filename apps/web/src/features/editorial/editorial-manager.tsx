"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { api } from "@/lib/browser-api";
import { SpreadsheetImport } from "@/components/spreadsheet-import";
import { editorialThumbnail } from "@/lib/default-thumbnails";
import {
  editorialLabels,
  editorialPath,
  type EditorialItem,
  type EditorialKind,
} from "./contracts";

export function EditorialManager({
  initial,
  kind,
  locale,
}: {
  initial: EditorialItem[];
  kind: EditorialKind;
  locale: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows = initial.filter((item) =>
    [item.draft.title, item.draft.summary]
      .join(" ")
      .toLocaleLowerCase("vi-VN")
      .includes(q.toLocaleLowerCase("vi-VN")),
  );
  async function create() {
    setBusy(true);
    setError("");
    try {
      const item = await api<EditorialItem>("/admin/editorial", {
        method: "POST",
        body: JSON.stringify({ kind, locale }),
      });
      router.push(`/admin/editorial/${item.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <header className="admin-topbar">
        <span>Nội dung / {editorialLabels[kind]}</span>
      </header>
      <div className="admin-content staff-admin-list">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HỒ SƠ CÓ CẤU TRÚC</p>
            <h1>{editorialLabels[kind]}</h1>
            <p className="muted">
              Quản lý thông tin, ảnh đại diện và bài viết gắn với từng{" "}
              {editorialLabels[kind].toLocaleLowerCase("vi-VN")}.
            </p>
          </div>
          <button className="button primary" onClick={create} disabled={busy}>
            <Plus size={18} /> Tạo {editorialLabels[kind].toLocaleLowerCase("vi-VN")}
          </button>
        </div>
        <div className="staff-admin-tools">
          <label className="admin-search-input">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm hồ sơ…"
              aria-label="Tìm hồ sơ"
            />
          </label>
          <select
            aria-label="Ngôn ngữ"
            value={locale}
            onChange={(e) => router.push(`/admin/editorial?kind=${kind}&locale=${e.target.value}`)}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
          <Link className="button secondary" href={editorialPath(kind, locale)} target="_blank">
            Xem trang public
          </Link>
        </div>
        {kind === "EVENT" && (
          <SpreadsheetImport
            title="Hội thảo"
            endpoint="/admin/editorial/events/spreadsheet"
            params={{ locale }}
            itemHref={(id) => `/admin/editorial/${id}`}
          />
        )}
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="staff-admin-rows">
          {rows.map((item) => (
            <Link className="staff-admin-row" href={`/admin/editorial/${item.id}`} key={item.id}>
              <span className="staff-admin-avatar">
                <img
                  src={
                    item.draft.thumbnailId
                      ? `/api/v1/admin/media/${item.draft.thumbnailId}`
                      : editorialThumbnail(kind)
                  }
                  alt=""
                />
              </span>
              <span>
                <strong>{item.draft.title || "Hồ sơ chưa có tiêu đề"}</strong>
                <small>{item.draft.slug}</small>
              </span>
              <span className={`badge ${item.live ? "published" : "draft"}`}>
                {item.live ? "Công khai" : "Bản nháp"}
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
          {!rows.length && (
            <div className="empty-state">
              <h2>{q ? "Không tìm thấy" : "Chưa có hồ sơ"}</h2>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
