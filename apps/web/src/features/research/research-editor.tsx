"use client";
import { useUnsavedChanges } from "@/components/unsaved-changes";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ImagePlus, Plus, Save, Send, Trash2 } from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import { EnglishVersionButton } from "@/features/localization/english-version-button";
import { MediaPicker } from "@/features/media/media-picker";
import {
  researchDetailPath,
  researchLabels,
  type Contributor,
  type ResearchDetails,
  type ResearchRecord,
} from "./contracts";
function Field({
  label,
  value,
  change,
  multiline = false,
  type = "text",
}: {
  label: string;
  value: string;
  change: (v: string) => void;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="staff-field">
      {label}
      {multiline ? (
        <textarea rows={4} value={value} onChange={(e) => change(e.target.value)} />
      ) : (
        <input type={type} value={value} onChange={(e) => change(e.target.value)} />
      )}
    </label>
  );
}
const roles: Record<Contributor["role"], string> = {
  AUTHOR: "Tác giả",
  EDITOR: "Chủ biên",
  PRINCIPAL_INVESTIGATOR: "Chủ nhiệm",
  MEMBER: "Thành viên",
};
export function ResearchEditor({
  initial,
  people,
}: {
  initial: ResearchRecord;
  people: { id: string; name: string; published: boolean }[];
}) {
  const [record, setRecord] = useState(initial),
    [draft, setDraft] = useState(initial.draft),
    [picker, setPicker] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dirty = JSON.stringify(draft) !== JSON.stringify(record.draft);
  useUnsavedChanges(dirty);
  function change<K extends keyof ResearchDetails>(key: K, value: ResearchDetails[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice("");
  }
  function author(index: number, next: Contributor) {
    change(
      "contributors",
      draft.contributors.map((a, i) => (i === index ? next : a)),
    );
  }
  async function save() {
    if (!dirty) return record;
    const next = await api<ResearchRecord>(`/admin/research/${record.id}/draft`, {
      method: "PATCH",
      headers: matchVersion(record.version),
      body: JSON.stringify(draft),
    });
    setRecord(next);
    setDraft(next.draft);
    return next;
  }
  async function run(action: "save" | "publish" | "withdraw") {
    if (
      action === "withdraw" &&
      !window.confirm("Gỡ công trình khỏi website? Phần đang nhập chưa lưu sẽ được giữ tại đây.")
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const current = action === "withdraw" ? record : await save();
      if (action === "save") setNotice("Đã lưu bản nháp.");
      if (action === "publish") {
        const next = await api<ResearchRecord>(`/admin/research/${record.id}/publish`, {
          method: "POST",
          headers: matchVersion(current.version),
          body: JSON.stringify({ draftVersion: current.draftVersion }),
        });
        setRecord(next);
        setDraft(next.draft);
        setNotice("Đã đăng công khai.");
      }
      if (action === "withdraw") {
        const next = await api<ResearchRecord>(`/admin/research/${record.id}/withdraw`, {
          method: "POST",
          headers: matchVersion(current.version),
        });
        setRecord(next);
        setNotice("Đã gỡ khỏi trang công khai.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="staff-editor">
      <header className="admin-topbar staff-editor-bar">
        <Link href={`/admin/research?kind=${record.kind}`}>
          <ArrowLeft size={16} /> {researchLabels[record.kind]}
        </Link>
        <span className={`badge ${record.live ? "published" : "draft"}`}>
          {busy
            ? "Đang xử lý…"
            : dirty
              ? "Chưa lưu"
              : notice.startsWith("Đã lưu")
                ? "Đã lưu nháp"
                : record.live
                  ? "Công khai"
                  : "Bản nháp"}
        </span>
        <div className="row-actions">
          <EnglishVersionButton
            kind="RESEARCH"
            sourceId={record.id}
            locale={record.locale}
            dirty={dirty || busy}
            sourceReady={!!draft.title.trim()}
          />
          <button
            className="button secondary"
            data-admin-save
            title="Lưu bản nháp (Ctrl/Cmd+S). Chưa đăng công khai."
            disabled={busy || !dirty}
            onClick={() => run("save")}
          >
            <Save size={16} /> Lưu nháp
          </button>
          <button
            className="button primary"
            disabled={busy || draft.title.trim().length < 4}
            onClick={() => run("publish")}
          >
            <Send size={16} /> {record.live ? "Cập nhật công khai" : "Đăng công khai"}
          </button>
        </div>
      </header>
      <div className="admin-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HỒ SƠ NGHIÊN CỨU</p>
            <h1>{draft.title || "Công trình mới"}</h1>
            <p className="muted">
              Điền trích dẫn, metadata và liên kết tác giả. Các trường không rõ có thể để trống.
            </p>
          </div>
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
        <fieldset disabled={busy} className="staff-editor-grid">
          <div className="staff-editor-main">
            <section className="staff-editor-section">
              <h2>Thông tin công trình</h2>
              <Field
                label="Tên công trình *"
                value={draft.title}
                change={(v) => change("title", v)}
              />
              <div className="staff-field-grid">
                <Field label="Đường dẫn *" value={draft.slug} change={(v) => change("slug", v)} />
                <Field
                  label="Năm"
                  type="number"
                  value={draft.year?.toString() ?? ""}
                  change={(v) => change("year", v ? Number(v) : null)}
                />
              </div>
              <Field
                label="Tóm tắt"
                value={draft.summary}
                change={(v) => change("summary", v)}
                multiline
              />
              {record.kind === "PROJECT" ? (
                <div className="staff-field-grid">
                  <Field
                    label="Cấp đề tài"
                    value={draft.level}
                    change={(v) => change("level", v)}
                  />
                  <Field
                    label="Thời gian"
                    value={draft.period}
                    change={(v) => change("period", v)}
                  />
                  <Field
                    label="Tiến độ"
                    value={draft.progress}
                    change={(v) => change("progress", v)}
                  />
                </div>
              ) : (
                <div className="staff-field-grid">
                  <Field
                    label="Tạp chí / Hội thảo"
                    value={draft.venue}
                    change={(v) => change("venue", v)}
                  />
                  <Field
                    label="Nhà xuất bản"
                    value={draft.publisher}
                    change={(v) => change("publisher", v)}
                  />
                  <Field
                    label="Tập, số, trang"
                    value={draft.volume}
                    change={(v) => change("volume", v)}
                  />
                  <Field label="DOI" value={draft.doi} change={(v) => change("doi", v)} />
                  <Field label="ISBN" value={draft.isbn} change={(v) => change("isbn", v)} />
                </div>
              )}
              <Field
                label="Tác giả theo nguồn"
                value={draft.authorsText}
                change={(v) => change("authorsText", v)}
                multiline
              />
              <Field
                label="Trích dẫn nguyên văn"
                value={draft.citation}
                change={(v) => change("citation", v)}
                multiline
              />
              <div className="staff-field-grid">
                <Field
                  label="Liên kết nguồn"
                  value={draft.sourceUrl}
                  change={(v) => change("sourceUrl", v)}
                  type="url"
                />
                <Field
                  label="Tài liệu công khai"
                  value={draft.documentUrl}
                  change={(v) => change("documentUrl", v)}
                  type="url"
                />
              </div>
            </section>
            <section className="staff-editor-section">
              <div className="staff-section-head">
                <div>
                  <h2>Tác giả & cán bộ liên kết</h2>
                  <p>Chọn cán bộ khi người đó là tác giả; tác giả ngoài đơn vị để tên tự do.</p>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() =>
                    change("contributors", [
                      ...draft.contributors,
                      {
                        staffId: null,
                        name: "",
                        role: record.kind === "PROJECT" ? "PRINCIPAL_INVESTIGATOR" : "AUTHOR",
                      },
                    ])
                  }
                >
                  <Plus size={16} /> Thêm tác giả
                </button>
              </div>
              <div className="research-author-list">
                {draft.contributors.map((a, i) => (
                  <div className="research-author-edit" key={i}>
                    <div className="staff-field-grid">
                      <label className="staff-field">
                        Cán bộ liên kết
                        <select
                          value={a.staffId ?? ""}
                          onChange={(e) => {
                            const p = people.find((x) => x.id === e.target.value);
                            author(i, {
                              ...a,
                              staffId: p?.id ?? null,
                              name: p?.name ?? a.name,
                            });
                          }}
                        >
                          <option value="">Tác giả ngoài danh sách</option>
                          {people.map((p) => (
                            <option value={p.id} key={p.id}>
                              {p.name || "Chưa đặt tên"}
                              {p.published ? "" : " (bản nháp)"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="staff-field">
                        Vai trò
                        <select
                          value={a.role}
                          onChange={(e) =>
                            author(i, { ...a, role: e.target.value as Contributor["role"] })
                          }
                        >
                          {Object.entries(roles).map(([key, label]) => (
                            <option value={key} key={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="research-author-name">
                      <Field
                        label="Tên hiển thị"
                        value={a.name}
                        change={(v) => author(i, { ...a, name: v })}
                      />
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Xóa tác giả ${i + 1}`}
                        onClick={() =>
                          change(
                            "contributors",
                            draft.contributors.filter((_, j) => j !== i),
                          )
                        }
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                ))}
                {!draft.contributors.length && <p className="field-hint">Chưa khai báo tác giả.</p>}
              </div>
            </section>
          </div>
          <aside className="staff-editor-aside">
            <section className="staff-editor-section">
              <h2>Ảnh bìa</h2>
              {draft.coverId && (
                <img
                  className="staff-editor-portrait"
                  src={`/api/v1/admin/media/${draft.coverId}`}
                  alt={draft.coverAlt}
                />
              )}
              <button type="button" className="button secondary" onClick={() => setPicker(true)}>
                <ImagePlus size={16} /> Chọn ảnh
              </button>
              {draft.coverId && (
                <Field
                  label="Mô tả ảnh"
                  value={draft.coverAlt}
                  change={(v) => change("coverAlt", v)}
                />
              )}
            </section>
            {draft.sourceArticleId && (
              <section className="staff-editor-section">
                <h2>Bài nguồn đã chuyển</h2>
                <Link
                  className="text-link"
                  href={`/admin/content/${draft.sourceArticleId}`}
                  target="_blank"
                >
                  Xem bài nguồn ↗
                </Link>
              </section>
            )}
            {record.live && (
              <section className="staff-editor-section">
                <h2>Xuất bản</h2>
                <Link
                  className="text-link"
                  href={researchDetailPath(record.locale, record.live.slug)}
                  target="_blank"
                >
                  Xem trang công khai ↗
                </Link>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => run("withdraw")}
                >
                  Gỡ công khai
                </button>
              </section>
            )}
          </aside>
        </fieldset>
      </div>
      {picker && (
        <MediaPicker
          onClose={() => setPicker(false)}
          onSelect={(asset, alt) => {
            setDraft((d) => ({ ...d, coverId: asset.id, coverAlt: alt }));
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
