"use client";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { api } from "@/lib/browser-api";
import type { ArticleCategory } from "@/lib/contracts";

const empty: ArticleCategory = { code: "", nameVi: "", nameEn: "", sortOrder: 100 };
export function CategoryManager({ initial }: { initial: ArticleCategory[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState<ArticleCategory | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const sorted = [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code),
  );

  function start(category?: ArticleCategory) {
    setEditing(category ?? { ...empty, sortOrder: (sorted.at(-1)?.sortOrder ?? 0) + 10 });
    setIsNew(!category);
    setError("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    try {
      const item = await api<ArticleCategory>(
        "/admin/categories" + (isNew ? "" : "/" + editing.code),
        { method: isNew ? "POST" : "PUT", body: JSON.stringify(editing) },
      );
      setItems((current) =>
        isNew ? [...current, item] : current.map((x) => (x.code === item.code ? item : x)),
      );
      setEditing(null);
      setNotice(isNew ? "Đã tạo chuyên mục." : "Đã lưu chuyên mục.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(category: ArticleCategory) {
    if (
      !window.confirm(
        `Xóa chuyên mục “${category.nameVi}”? Chuyên mục đang được sử dụng sẽ không thể xóa.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api<void>("/admin/categories/" + category.code, { method: "DELETE" });
      setItems((current) => current.filter((x) => x.code !== category.code));
      setNotice("Đã xóa chuyên mục.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="admin-topbar">
        <span>
          Nội dung <ChevronRight size={14} /> Chuyên mục
        </span>
      </header>
      <div className="admin-content category-page">
        <div className="section-heading">
          <div>
            <p className="eyebrow">TỔ CHỨC NỘI DUNG</p>
            <h1>Chuyên mục</h1>
            <p className="muted">
              Tên chuyên mục hiển thị ở bài viết, bộ lọc tin tức và menu website.
            </p>
          </div>
          <button className="button primary" onClick={() => start()}>
            <Plus size={18} /> Thêm chuyên mục
          </button>
        </div>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="alert success" role="status">
            {notice}
          </p>
        )}
        <div className="category-list" role="list" aria-label="Danh sách chuyên mục">
          {sorted.map((item) => (
            <div className="category-row" role="listitem" key={item.code}>
              <span className="category-order">{String(item.sortOrder).padStart(2, "0")}</span>
              <div>
                <strong>{item.nameVi}</strong>
                <small>
                  {item.nameEn} · {item.code}
                </small>
              </div>
              <div className="row-actions">
                <button
                  className="icon-button"
                  aria-label={`Sửa ${item.nameVi}`}
                  disabled={busy}
                  onClick={() => start(item)}
                >
                  <Pencil size={18} />
                </button>
                <button
                  className="icon-button danger-text"
                  aria-label={`Xóa ${item.nameVi}`}
                  disabled={busy}
                  onClick={() => void remove(item)}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="field-hint">
          Mã chuyên mục không đổi sau khi tạo. Hãy chuyển bài viết và liên kết menu sang mục khác
          trước khi xóa.
        </p>
        <Link className="text-link" href="/admin/content">
          ← Quay lại bài viết
        </Link>
      </div>
      {editing && (
        <Dialog
          title={isNew ? "Thêm chuyên mục" : "Sửa chuyên mục"}
          onClose={() => !busy && setEditing(null)}
        >
          <form className="manage-form" onSubmit={save}>
            <label>
              Mã chuyên mục
              <input
                value={editing.code}
                disabled={!isNew || busy}
                required
                maxLength={40}
                pattern="[A-Z][A-Z0-9_]{2,39}"
                placeholder="VD: HOP_TAC_QUOC_TE"
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
                  })
                }
              />
            </label>
            <p className="field-hint">
              Dùng chữ in hoa không dấu, số và dấu gạch dưới. Mã xuất hiện trong URL lọc tin tức.
            </p>
            <label>
              Tên tiếng Việt
              <input
                value={editing.nameVi}
                maxLength={80}
                required
                disabled={busy}
                onChange={(e) => setEditing({ ...editing, nameVi: e.target.value })}
              />
            </label>
            <label>
              Tên tiếng Anh
              <input
                value={editing.nameEn}
                maxLength={80}
                required
                disabled={busy}
                onChange={(e) => setEditing({ ...editing, nameEn: e.target.value })}
              />
            </label>
            <label>
              Thứ tự hiển thị
              <input
                type="number"
                min={0}
                max={10000}
                value={editing.sortOrder}
                disabled={busy}
                onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })}
              />
            </label>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
                disabled={busy}
              >
                Hủy
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Đang lưu…" : "Lưu chuyên mục"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
