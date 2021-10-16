"use client";
import { useUnsavedChanges } from "@/components/unsaved-changes";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Plus, Save, Search, Send, Trash2 } from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import { EnglishVersionButton } from "@/features/localization/english-version-button";
import type { ContentSummary, PageResult } from "@/lib/contracts";
import { MediaPicker } from "@/features/media/media-picker";
import {
  editorialLabels,
  editorialDetailPath,
  type EditorialDetails,
  type EditorialItem,
} from "./contracts";

function Field({
  label,
  value,
  onChange,
  type = "text",
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  multiline?: boolean;
}) {
  return (
    <label className="staff-field">
      {label}
      {multiline ? (
        <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}
export function EditorialEditor({ initial }: { initial: EditorialItem }) {
  const [item, setItem] = useState(initial);
  const [draft, setDraft] = useState(initial.draft);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [articles, setArticles] = useState<ContentSummary[]>([]);
  const [selectedTitle, setSelectedTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [eventTab, setEventTab] = useState(0);
  const eventTopics = [
    "Thông tin chính",
    "Tổ chức",
    "Diễn giả",
    "Lịch trình",
    "Bài viết",
    "Hình ảnh",
  ];
  const eventCreateFlow = item.kind === "EVENT" && initial.version === 0 && !item.live;
  const dirty = JSON.stringify(draft) !== JSON.stringify(item.draft);
  const kindName = editorialLabels[item.kind];
  useUnsavedChanges(dirty);
  function change<K extends keyof EditorialDetails>(key: K, value: EditorialDetails[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setNotice("");
  }
  async function findArticles() {
    try {
      const params = new URLSearchParams({ locale: item.locale, q: query, page: "0", size: "20" });
      const result = await api<PageResult<ContentSummary>>(`/public/content?${params}`);
      setArticles(result.items);
      if (!result.items.length) setError("Không thấy bài công khai. Hãy đăng bài viết trước.");
      else setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    if (!dirty) return item;
    const next = await api<EditorialItem>(`/admin/editorial/${item.id}/draft`, {
      method: "PATCH",
      headers: matchVersion(item.version),
      body: JSON.stringify(draft),
    });
    setItem(next);
    setDraft(next.draft);
    return next;
  }
  async function run(action: "save" | "publish" | "withdraw") {
    if (
      action === "withdraw" &&
      !window.confirm("Gỡ hồ sơ khỏi website? Phần đang nhập chưa lưu sẽ được giữ tại đây.")
    )
      return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const current = action === "withdraw" ? item : await save();
      if (action === "save") setNotice("Đã lưu bản nháp.");
      if (action === "publish") {
        const next = await api<EditorialItem>(`/admin/editorial/${item.id}/publish`, {
          method: "POST",
          headers: matchVersion(current.version),
          body: JSON.stringify({ draftVersion: current.draftVersion }),
        });
        setItem(next);
        setDraft(next.draft);
        setNotice("Đã đăng công khai.");
      }
      if (action === "withdraw") {
        const next = await api<EditorialItem>(`/admin/editorial/${item.id}/withdraw`, {
          method: "POST",
          headers: matchVersion(current.version),
        });
        setItem(next);
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
        <Link href={`/admin/editorial?kind=${item.kind}`}>
          <ArrowLeft size={16} /> {kindName}
        </Link>
        <span className={`badge ${item.live ? "published" : "draft"}`}>
          {busy
            ? "Đang xử lý…"
            : dirty
              ? "Chưa lưu"
              : notice.startsWith("Đã lưu")
                ? "Đã lưu nháp"
                : item.live
                  ? "Công khai"
                  : "Bản nháp"}
        </span>
        <div className="row-actions">
          <EnglishVersionButton
            kind="EDITORIAL"
            sourceId={item.id}
            locale={item.locale}
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
          {!eventCreateFlow && (
            <button
              className="button primary"
              disabled={busy || !draft.title.trim() || !draft.articleId}
              onClick={() => run("publish")}
            >
              <Send size={16} /> {item.live ? "Cập nhật công khai" : "Đăng công khai"}
            </button>
          )}
        </div>
      </header>
      <div className="admin-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HỒ SƠ {kindName.toLocaleUpperCase("vi-VN")}</p>
            <h1>{draft.title || `Tạo ${kindName.toLocaleLowerCase("vi-VN")}`}</h1>
            <p className="muted">
              {item.kind === "EVENT"
                ? `${eventCreateFlow ? `Bước ${eventTab + 1}/${eventTopics.length}: ${eventTopics[eventTab]}. ` : "Chọn chủ đề để chỉnh sửa. "}Nội dung dài nằm trong bài viết liên kết.`
                : "Thông tin thẻ hiển thị nằm ở đây; nội dung dài được biên tập trong bài viết liên kết."}
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
        {item.kind === "EVENT" && (
          <nav
            className="staff-topic-nav"
            aria-label={eventCreateFlow ? "Các bước tạo hội thảo" : "Chủ đề hội thảo"}
          >
            {eventTopics.map((label, index) => (
              <button
                type="button"
                key={label}
                className={eventTab === index ? "active" : ""}
                disabled={eventCreateFlow && index > eventTab}
                onClick={() => {
                  if (!eventCreateFlow) setEventTab(index);
                }}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                {label}
              </button>
            ))}
          </nav>
        )}
        <fieldset disabled={busy} className="staff-editor-grid">
          <div className="staff-editor-main">
            {(item.kind !== "EVENT" || eventTab === 0) && (
              <section className="staff-editor-section">
                <h2>Thông tin chính</h2>
                <div className="staff-field-grid">
                  <Field
                    label="Tiêu đề *"
                    value={draft.title}
                    onChange={(v) => change("title", v)}
                  />
                  <Field
                    label="Đường dẫn *"
                    value={draft.slug}
                    onChange={(v) => change("slug", v)}
                  />
                </div>
                <Field
                  label="Mô tả ngắn *"
                  value={draft.summary}
                  onChange={(v) => change("summary", v)}
                  multiline
                />
                <Field
                  label="Liên kết ngoài (nếu có)"
                  type="url"
                  value={draft.externalUrl}
                  onChange={(v) => change("externalUrl", v)}
                />
              </section>
            )}
            {item.kind === "EVENT" && eventTab === 1 && (
              <section className="staff-editor-section">
                <h2>Thông tin hội thảo</h2>
                <div className="staff-field-grid">
                  <Field
                    label="Ngày bắt đầu *"
                    type="date"
                    value={draft.startsOn ?? ""}
                    onChange={(v) => change("startsOn", v || null)}
                  />
                  <Field
                    label="Ngày kết thúc"
                    type="date"
                    value={draft.endsOn ?? ""}
                    onChange={(v) => change("endsOn", v || null)}
                  />
                  <Field
                    label="Địa điểm"
                    value={draft.location}
                    onChange={(v) => change("location", v)}
                  />
                  <Field
                    label="Đơn vị tổ chức"
                    value={draft.organizer}
                    onChange={(v) => change("organizer", v)}
                  />
                </div>
                <div className="staff-field-grid">
                  <Field
                    label="Chủ đề hội thảo"
                    value={draft.theme}
                    onChange={(v) => change("theme", v)}
                  />
                  <label className="staff-field">
                    Hình thức
                    <select
                      value={draft.format}
                      onChange={(event) =>
                        change("format", event.target.value as EditorialDetails["format"])
                      }
                    >
                      <option value="">Chưa xác định</option>
                      <option value="IN_PERSON">Trực tiếp</option>
                      <option value="ONLINE">Trực tuyến</option>
                      <option value="HYBRID">Kết hợp</option>
                    </select>
                  </label>
                </div>
                <Field
                  label="Đối tượng tham dự"
                  value={draft.audience}
                  onChange={(v) => change("audience", v)}
                  multiline
                />
                <Field
                  label="Link đăng ký"
                  type="url"
                  value={draft.registrationUrl}
                  onChange={(v) => change("registrationUrl", v)}
                />
              </section>
            )}
            {item.kind === "EVENT" && eventTab === 2 && (
              <section className="staff-editor-section">
                <div className="staff-section-head">
                  <h2>Diễn giả</h2>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      change("speakers", [
                        ...draft.speakers,
                        { name: "", title: "", affiliation: "", topic: "" },
                      ])
                    }
                  >
                    <Plus size={16} /> Thêm diễn giả
                  </button>
                </div>
                {draft.speakers.map((speaker, index) => (
                  <div className="staff-entry-card" key={index}>
                    <div className="staff-entry-card-head">
                      <strong>{speaker.name || `Diễn giả ${index + 1}`}</strong>
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Xóa diễn giả ${index + 1}`}
                        onClick={() =>
                          change(
                            "speakers",
                            draft.speakers.filter((_, at) => at !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="staff-field-grid">
                      <Field
                        label="Họ và tên"
                        value={speaker.name}
                        onChange={(v) =>
                          change(
                            "speakers",
                            draft.speakers.map((row, at) =>
                              at === index ? { ...row, name: v } : row,
                            ),
                          )
                        }
                      />
                      <Field
                        label="Chức danh"
                        value={speaker.title}
                        onChange={(v) =>
                          change(
                            "speakers",
                            draft.speakers.map((row, at) =>
                              at === index ? { ...row, title: v } : row,
                            ),
                          )
                        }
                      />
                      <Field
                        label="Đơn vị"
                        value={speaker.affiliation}
                        onChange={(v) =>
                          change(
                            "speakers",
                            draft.speakers.map((row, at) =>
                              at === index ? { ...row, affiliation: v } : row,
                            ),
                          )
                        }
                      />
                      <Field
                        label="Chủ đề trình bày"
                        value={speaker.topic}
                        onChange={(v) =>
                          change(
                            "speakers",
                            draft.speakers.map((row, at) =>
                              at === index ? { ...row, topic: v } : row,
                            ),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </section>
            )}
            {item.kind === "EVENT" && eventTab === 3 && (
              <section className="staff-editor-section">
                <div className="staff-section-head">
                  <h2>Lịch trình</h2>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      change("sessions", [
                        ...draft.sessions,
                        { time: "", title: "", speaker: "", description: "" },
                      ])
                    }
                  >
                    <Plus size={16} /> Thêm phiên
                  </button>
                </div>
                {draft.sessions.map((session, index) => (
                  <div className="staff-entry-card" key={index}>
                    <div className="staff-entry-card-head">
                      <strong>{session.title || `Phiên ${index + 1}`}</strong>
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Xóa phiên ${index + 1}`}
                        onClick={() =>
                          change(
                            "sessions",
                            draft.sessions.filter((_, at) => at !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="staff-field-grid">
                      <Field
                        label="Thời gian"
                        value={session.time}
                        onChange={(v) =>
                          change(
                            "sessions",
                            draft.sessions.map((row, at) =>
                              at === index ? { ...row, time: v } : row,
                            ),
                          )
                        }
                      />
                      <Field
                        label="Tên phiên"
                        value={session.title}
                        onChange={(v) =>
                          change(
                            "sessions",
                            draft.sessions.map((row, at) =>
                              at === index ? { ...row, title: v } : row,
                            ),
                          )
                        }
                      />
                      <Field
                        label="Diễn giả"
                        value={session.speaker}
                        onChange={(v) =>
                          change(
                            "sessions",
                            draft.sessions.map((row, at) =>
                              at === index ? { ...row, speaker: v } : row,
                            ),
                          )
                        }
                      />
                    </div>
                    <Field
                      label="Mô tả"
                      value={session.description}
                      onChange={(v) =>
                        change(
                          "sessions",
                          draft.sessions.map((row, at) =>
                            at === index ? { ...row, description: v } : row,
                          ),
                        )
                      }
                      multiline
                    />
                  </div>
                ))}
              </section>
            )}
            {item.kind === "JOB" && (
              <section className="staff-editor-section">
                <h2>Thông tin tuyển dụng</h2>
                <div className="staff-field-grid">
                  <Field
                    label="Đơn vị tuyển dụng"
                    value={draft.employer}
                    onChange={(v) => change("employer", v)}
                  />
                  <Field
                    label="Vị trí"
                    value={draft.position}
                    onChange={(v) => change("position", v)}
                  />
                  <Field
                    label="Hạn nộp hồ sơ"
                    type="date"
                    value={draft.deadline ?? ""}
                    onChange={(v) => change("deadline", v || null)}
                  />
                </div>
              </section>
            )}
            {(item.kind !== "EVENT" || eventTab === 4) && (
              <section className="staff-editor-section">
                <h2>Bài viết liên kết *</h2>
                <p className="muted">
                  Đăng bài viết trước, sau đó tìm và chọn bài ở đây. Một bài chỉ liên kết với một hồ
                  sơ.
                </p>
                {draft.articleId && (
                  <p className="field-hint">
                    Đã chọn: {selectedTitle || draft.articleId} ·{" "}
                    <Link href={`/admin/content/${draft.articleId}`} target="_blank">
                      Sửa nội dung bài viết ↗
                    </Link>
                  </p>
                )}
                <div className="staff-admin-tools">
                  <label className="admin-search-input">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void findArticles();
                        }
                      }}
                      placeholder="Tìm tiêu đề bài công khai…"
                      aria-label="Tìm bài viết"
                    />
                  </label>
                  <button type="button" className="button secondary" onClick={findArticles}>
                    Tìm bài
                  </button>
                  <Link className="button secondary" href="/admin/content" target="_blank">
                    Quản lý bài viết ↗
                  </Link>
                </div>
                {articles.length > 0 && (
                  <div className="editorial-article-results">
                    {articles.map((article) => (
                      <button
                        type="button"
                        className={draft.articleId === article.id ? "active" : ""}
                        key={article.id}
                        onClick={() => {
                          change("articleId", article.id);
                          setSelectedTitle(article.title);
                        }}
                      >
                        <strong>{article.title}</strong>
                        <small>
                          {article.category} · {article.slug}
                        </small>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
            {item.kind === "EVENT" && (
              <div className="staff-step-actions">
                {eventTab > 0 && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setEventTab(eventTab - 1)}
                  >
                    <ArrowLeft size={16} /> Quay lại
                  </button>
                )}
                {eventTab < eventTopics.length - 1 && (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => setEventTab(eventTab + 1)}
                  >
                    Tiếp theo: {eventTopics[eventTab + 1]} <ArrowRight size={16} />
                  </button>
                )}
                {eventTab === eventTopics.length - 1 && (
                  <button
                    type="button"
                    className="button primary"
                    disabled={!draft.title.trim() || !draft.articleId}
                    onClick={() => run("publish")}
                  >
                    <Send size={16} /> Đăng công khai
                  </button>
                )}
              </div>
            )}
          </div>
          <aside className="staff-editor-aside">
            {(item.kind !== "EVENT" || eventTab === 5) && (
              <section className="staff-editor-section">
                <h2>Ảnh đại diện</h2>
                {draft.thumbnailId && (
                  <img
                    className="staff-editor-portrait"
                    src={`/api/v1/admin/media/${draft.thumbnailId}`}
                    alt={draft.thumbnailAlt}
                  />
                )}
                <button type="button" className="button secondary" onClick={() => setPicker(true)}>
                  <ImagePlus size={16} /> Chọn ảnh
                </button>
                {draft.thumbnailId && (
                  <Field
                    label="Mô tả ảnh"
                    value={draft.thumbnailAlt}
                    onChange={(v) => change("thumbnailAlt", v)}
                  />
                )}
              </section>
            )}
            {item.live && (
              <section className="staff-editor-section">
                <h2>Xuất bản</h2>
                <Link
                  className="text-link"
                  href={editorialDetailPath(item.kind, item.locale, item.live.slug)}
                  target="_blank"
                >
                  Xem trang công khai ↗
                </Link>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => run("withdraw")}
                >
                  Gỡ hồ sơ
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
            setDraft((d) => ({ ...d, thumbnailId: asset.id, thumbnailAlt: alt }));
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
