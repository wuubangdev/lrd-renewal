"use client";
import { useUnsavedChanges } from "@/components/unsaved-changes";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CloudUpload,
  Eye,
  FileUp,
  History,
  ImagePlus,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import { ApiError } from "@/lib/errors";
import {
  dateLabel,
  draftOf,
  statusLabels,
  type AdminContent,
  type Draft,
  type RichNode,
  type Revision,
} from "@/lib/contracts";
import { MediaPicker } from "@/features/media/media-picker";
import { RichEditor, type RichEditorHandle } from "./rich-editor";
import { useCategories } from "../use-categories";
import { EnglishVersionButton } from "@/features/localization/english-version-button";
type SaveState = "saved" | "changed" | "saving" | "error";
type DocxImport = {
  title: string;
  summary: string;
  document: RichNode;
  imageCount: number;
  warnings: string[];
};
function hasDraftBody(node: RichNode): boolean {
  return (
    Boolean(node.text?.trim()) ||
    ["image", "inlineImage", "table"].includes(node.type) ||
    Boolean(node.content?.some(hasDraftBody))
  );
}
function bodyText(node: RichNode): string {
  return (node.text ?? "") + (node.content ?? []).map(bodyText).join(" ");
}
function hasImage(node: RichNode): boolean {
  return (
    (["image", "inlineImage"].includes(node.type) && !!node.attrs?.assetId) ||
    !!node.content?.some(hasImage)
  );
}
function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
}
export function ContentEditor({ initial }: { initial: AdminContent }) {
  const categoryOptions = useCategories();
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [entry, setEntry] = useState(initial),
    [draft, setDraft] = useState<Draft>(draftOf(initial));
  const latest = useRef(initial),
    current = useRef(draft),
    saved = useRef(JSON.stringify(draft)),
    queue = useRef<Promise<unknown>>(Promise.resolve());
  const [saveState, setSaveState] = useState<SaveState>("saved"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [picker, setPicker] = useState<"cover" | "inline" | null>(null),
    [history, setHistory] = useState<Revision[] | null>(null),
    [editorKey, setEditorKey] = useState(0);
  const [conflict, setConflict] = useState(false);
  const [geminiStatus, setGeminiStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [importing, setImporting] = useState<"plain" | "ai" | null>(null);
  const editor = useRef<RichEditorHandle>(null);
  const docxInput = useRef<HTMLInputElement>(null);
  const importMode = useRef<"plain" | "ai">("plain");
  const publishKey = useRef({ version: -1, key: "" });
  const checks = [
    { label: "Tiêu đề từ 5 ký tự", ok: draft.title.trim().length >= 5 },
    { label: "Đường dẫn hợp lệ", ok: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) },
    {
      label: "Nội dung từ 20 ký tự hoặc có ảnh",
      ok: bodyText(draft.document).trim().length >= 20 || hasImage(draft.document),
    },
    { label: "Ảnh đại diện có mô tả", ok: !draft.coverId || !!draft.coverAlt.trim() },
  ];
  const publishReady = checks.every((check) => check.ok);
  useEffect(() => {
    void api<{ geminiAvailable: boolean }>("/admin/content/import-capabilities")
      .then((result) => setGeminiStatus(result.geminiAvailable ? "ready" : "missing"))
      .catch(() => setGeminiStatus("missing"));
  }, []);
  function update(patch: Partial<Draft>) {
    const next = { ...current.current, ...patch };
    if (JSON.stringify(next) === JSON.stringify(current.current)) return;
    current.current = next;
    setDraft(next);
    setSaveState("changed");
    setNotice("");
  }
  const save = useCallback((): Promise<AdminContent> => {
    const task = queue.current
      .catch(() => undefined)
      .then(async () => {
        if (saved.current === JSON.stringify(current.current)) return latest.current;
        setSaveState("saving");
        const snapshot = current.current,
          serialized = JSON.stringify(snapshot);
        try {
          const result = await api<AdminContent>("/admin/content/" + initial.id + "/draft", {
            method: "PATCH",
            headers: matchVersion(latest.current.version),
            body: serialized,
          });
          latest.current = result;
          saved.current = serialized;
          setEntry(result);
          setSaveState(JSON.stringify(current.current) === serialized ? "saved" : "changed");
          setError("");
          return result;
        } catch (e) {
          setSaveState("error");
          setError((e as Error).message);
          if (e instanceof ApiError && e.status === 412) setConflict(true);
          throw e;
        }
      });
    queue.current = task;
    return task;
  }, [initial.id]);
  useEffect(() => {
    if (saveState !== "changed" || busy || conflict) return;
    const timer = setTimeout(() => void save().catch(() => undefined), 1500);
    return () => clearTimeout(timer);
  }, [draft, saveState, busy, conflict, save]);
  useUnsavedChanges(saved.current !== JSON.stringify(current.current));
  async function flush() {
    let result = await save();
    while (saved.current !== JSON.stringify(current.current)) result = await save();
    return result;
  }
  async function publish() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const persisted = await flush();
      if (publishKey.current.version !== persisted.draftVersion)
        publishKey.current = { version: persisted.draftVersion, key: crypto.randomUUID() };
      const result = await api<AdminContent>("/admin/content/" + entry.id + "/publish", {
        method: "POST",
        headers: { ...matchVersion(persisted.version), "Idempotency-Key": publishKey.current.key },
        body: JSON.stringify({ draftVersion: persisted.draftVersion }),
      });
      latest.current = result;
      setEntry(result);
      setNotice("Bài viết đã được đăng công khai. Người đọc có thể xem ngay.");
      setSaveState("saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function preview() {
    const previewWindow = window.open("about:blank", "_blank");
    if (previewWindow) previewWindow.opener = null;
    setBusy(true);
    setError("");
    try {
      await flush();
      if (previewWindow) previewWindow.location.replace("/admin/content/" + entry.id + "/preview");
      else setError("Trình duyệt đã chặn cửa sổ xem trước. Hãy cho phép mở tab mới rồi thử lại.");
    } catch (e) {
      previewWindow?.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function withdraw() {
    if (!window.confirm("Gỡ bài khỏi website? Bản nháp và lịch sử đăng vẫn được giữ lại.")) return;
    setBusy(true);
    try {
      await queue.current.catch(() => undefined);
      const persisted = latest.current;
      const result = await api<AdminContent>("/admin/content/" + entry.id + "/withdraw", {
        method: "POST",
        headers: matchVersion(persisted.version),
      });
      latest.current = result;
      setEntry(result);
      setNotice("Đã gỡ bài khỏi website.");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadHistory() {
    try {
      setHistory(await api<Revision[]>("/admin/content/" + entry.id + "/revisions"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function restore(revision: Revision) {
    if (
      !window.confirm(
        "Thay bản nháp hiện tại bằng phiên bản này? Bài đang công khai chưa thay đổi.",
      )
    )
      return;
    setBusy(true);
    try {
      await queue.current.catch(() => undefined);
      const result = await api<AdminContent>("/admin/content/" + entry.id + "/restore-revision", {
        method: "POST",
        headers: matchVersion(latest.current.version),
        body: JSON.stringify({ revisionId: revision.id }),
      });
      latest.current = result;
      setEntry(result);
      const restored = draftOf(result);
      current.current = restored;
      saved.current = JSON.stringify(restored);
      setDraft(restored);
      setEditorKey((k) => k + 1);
      setSaveState("saved");
      setHistory(null);
      setConflict(false);
      setError("");
      setNotice("Đã khôi phục vào bản nháp. Bấm Cập nhật công khai khi sẵn sàng.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importDocx(file: File, mode: "plain" | "ai") {
    if (
      !file.name.toLowerCase().endsWith(".docx") ||
      file.size > 15 * 1024 * 1024 ||
      file.size === 0
    ) {
      setError("Vui lòng chọn tệp .docx có nội dung, tối đa 15 MB.");
      return;
    }
    if (
      (draft.title.trim() || hasDraftBody(draft.document)) &&
      !window.confirm(
        "Thay tiêu đề, tóm tắt và nội dung bản nháp bằng tệp Word? Bài đang công khai chưa thay đổi.",
      )
    )
      return;
    setBusy(true);
    setImporting(mode);
    setError("");
    setNotice("");
    try {
      await queue.current.catch(() => undefined);
      const form = new FormData();
      form.append("file", file);
      const imported = await api<DocxImport>(
        "/admin/content/" + entry.id + "/import-docx?enhance=" + (mode === "ai"),
        {
          method: "POST",
          body: form,
        },
      );
      const next = {
        ...current.current,
        title: imported.title,
        summary: imported.summary,
        slug: entry.publicUrl
          ? current.current.slug
          : slugify(imported.title) || current.current.slug,
        document: imported.document,
      };
      current.current = next;
      setDraft(next);
      setEditorKey((key) => key + 1);
      setSaveState("changed");
      setNotice(
        `${mode === "ai" ? "Gemini đã tạo bố cục và mục lục" : "Đã nhập nội dung Word"} cùng ${imported.imageCount} ảnh vào bản nháp. Hãy rà soát trước khi đăng.${imported.warnings.length ? " Lưu ý: " + imported.warnings.join(" ") : ""}`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setImporting(null);
    }
  }
  function downloadBackup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(current.current, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ban-nhap-" + entry.id + ".json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="editor-workspace" inert={!ready} aria-busy={!ready}>
      <header className="admin-topbar editor-topbar">
        <Link href="/admin/content">
          <ArrowLeft size={17} /> Bài viết
        </Link>
        <div className="autosave" role="status">
          {saveState === "saved" ? <Check size={16} /> : <CloudUpload size={16} />}
          {
            {
              saved: "Đã lưu",
              changed: "Có thay đổi chưa lưu",
              saving: "Đang lưu…",
              error: "Chưa lưu được",
            }[saveState]
          }
        </div>
        <div className="editor-actions">
          <EnglishVersionButton
            kind="ARTICLE"
            sourceId={entry.id}
            locale={entry.locale}
            dirty={saveState !== "saved" || busy}
            sourceReady={draft.title.trim().length >= 5}
          />
          <button className="button" onClick={preview} disabled={busy || conflict}>
            <Eye size={17} />
            <span>Xem trước</span>
          </button>
          <button
            className="button"
            onClick={() => void save().catch(() => undefined)}
            disabled={busy || conflict || saveState === "saving"}
          >
            <Save size={17} />
            <span>Lưu nháp</span>
          </button>
          <button
            className="button primary"
            onClick={publish}
            disabled={busy || conflict || !publishReady}
            title={!publishReady ? "Hoàn thành các mục trong Kiểm tra trước khi đăng" : undefined}
          >
            <Send size={17} />
            {busy ? "Đang xử lý…" : entry.publicUrl ? "Cập nhật công khai" : "Đăng công khai"}
          </button>
        </div>
      </header>
      <div className="editor-page">
        {error && (
          <div className="alert error" role="alert">
            <strong>Thao tác chưa hoàn tất</strong>
            <p>{error}</p>
            {conflict ? (
              <div className="inline-actions">
                <button className="button" onClick={downloadBackup}>
                  Tải bản đang nhập
                </button>
                <a
                  className="button"
                  href={"/admin/content/" + entry.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  Mở bản mới nhất
                </a>
              </div>
            ) : (
              <a href="/admin/login" target="_blank" rel="noreferrer">
                Mở trang đăng nhập trong tab mới
              </a>
            )}
          </div>
        )}
        {notice && (
          <div className="alert success" role="status">
            <Check size={18} />
            <span>{notice}</span>
            {entry.publicUrl && (
              <Link href={entry.publicUrl} target="_blank">
                Xem bài viết <ArrowUpRight size={16} />
              </Link>
            )}
          </div>
        )}
        <div className="editor-heading">
          <p className="eyebrow">BIÊN TẬP BÀI VIẾT</p>
          <div className="editor-heading-tools">
            <input
              ref={docxInput}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="sr-only"
              aria-label="Chọn tệp Word để nhập"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void importDocx(file, importMode.current);
              }}
            />
            <button
              className="button"
              type="button"
              disabled={busy || conflict}
              onClick={() => {
                importMode.current = "plain";
                docxInput.current?.click();
              }}
            >
              <FileUp size={17} /> Nhập Word .docx
            </button>
            <button
              className="button primary"
              type="button"
              disabled={busy || conflict || geminiStatus !== "ready"}
              title={
                geminiStatus === "ready"
                  ? "Gemini tạo tiêu đề, tóm tắt và đề mục cho mục lục"
                  : "Quản trị viên cần cấu hình Gemini trong mục Tích hợp"
              }
              onClick={() => {
                importMode.current = "ai";
                docxInput.current?.click();
              }}
            >
              <Sparkles size={17} />{" "}
              {importing === "ai" ? "Gemini đang xử lý…" : "Tạo bài với Gemini"}
            </button>
            <span className={"badge " + entry.status.toLowerCase()}>
              {statusLabels[entry.status]}
            </span>
          </div>
        </div>
        {geminiStatus === "missing" && (
          <p className="field-hint ai-import-hint">
            Để dùng Gemini, quản trị viên mở Hệ thống → Tích hợp và nhập khóa API.
          </p>
        )}
        <div className="editor-grid">
          <section className="editor-paper" aria-label="Soạn bài">
            <fieldset disabled={busy}>
              <label className="sr-only" htmlFor="article-title">
                Tiêu đề bài viết
              </label>
              <textarea
                className="title-input"
                id="article-title"
                value={draft.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Tiêu đề bài viết"
                maxLength={200}
                rows={2}
              />
              <small className="editor-field-count">{draft.title.length}/200 ký tự</small>
              <label className="sr-only" htmlFor="article-summary">
                Tóm tắt
              </label>
              <textarea
                className="summary-input"
                id="article-summary"
                value={draft.summary}
                onChange={(e) => update({ summary: e.target.value })}
                maxLength={360}
                rows={3}
                placeholder="Thêm lời dẫn ngắn để giới thiệu câu chuyện…"
              />
              <small className="editor-field-count">{draft.summary.length}/360 ký tự</small>
            </fieldset>
            <RichEditor
              key={editorKey}
              ref={editor}
              initial={draft.document}
              onChange={(document) => update({ document })}
              onImage={() => setPicker("inline")}
              disabled={busy}
            />
          </section>
          <aside className="editor-inspector">
            <section className="inspector-section publish-checklist">
              <h2>Kiểm tra trước khi đăng</h2>
              <p>
                {checks.filter((check) => check.ok).length}/{checks.length} mục đã hoàn thành
              </p>
              <ul>
                {checks.map((check) => (
                  <li key={check.label} className={check.ok ? "done" : ""}>
                    <Check size={15} aria-hidden="true" /> {check.label}
                  </li>
                ))}
              </ul>
            </section>
            <section className="inspector-section">
              <h2>Thông tin bài viết</h2>
              <fieldset disabled={busy}>
                <label htmlFor="article-byline">Tác giả hiển thị</label>
                <input
                  id="article-byline"
                  value={draft.byline}
                  maxLength={200}
                  placeholder="Tên cá nhân hoặc đơn vị"
                  onChange={(e) => update({ byline: e.target.value })}
                />
                <p className="field-hint">
                  Tên này xuất hiện trên bài viết và bản xem trước khi chia sẻ.
                </p>
                <label htmlFor="category">Chuyên mục</label>
                <select
                  id="category"
                  value={draft.category}
                  onChange={(e) => update({ category: e.target.value as Draft["category"] })}
                >
                  {categoryOptions.map((category) => (
                    <option key={category.code} value={category.code}>
                      {initial.locale === "en" ? category.nameEn : category.nameVi}
                    </option>
                  ))}
                </select>
                <Link className="text-link" href="/admin/categories">
                  Quản lý chuyên mục
                </Link>
                <label htmlFor="slug">Đường dẫn bài viết</label>
                <input
                  id="slug"
                  value={draft.slug}
                  maxLength={160}
                  onChange={(e) => update({ slug: e.target.value })}
                />
                <button
                  className="text-button"
                  type="button"
                  onClick={() => update({ slug: slugify(draft.title) })}
                  disabled={!draft.title}
                >
                  Tạo từ tiêu đề
                </button>
                <p className="field-hint">Chữ thường, số và dấu gạch ngang.</p>
                <p className="slug-preview">
                  Đường dẫn xem trước:{" "}
                  <code>
                    /{entry.locale}/tin-tuc/{draft.slug || "..."}
                  </code>
                </p>
              </fieldset>
            </section>
            <section className="inspector-section">
              <h2>Ảnh đại diện</h2>
              {draft.coverId ? (
                <div className="cover-preview">
                  <img src={"/api/v1/admin/media/" + draft.coverId} alt={draft.coverAlt} />
                  <button
                    className="icon-button"
                    aria-label="Bỏ ảnh đại diện"
                    disabled={busy}
                    onClick={() => update({ coverId: null, coverAlt: "" })}
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button className="cover-upload" disabled={busy} onClick={() => setPicker("cover")}>
                  <ImagePlus size={25} />
                  <strong>Thêm ảnh đại diện</strong>
                  <span>JPG, PNG · Tối đa 8 MB</span>
                </button>
              )}
              {draft.coverId && (
                <>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => setPicker("cover")}
                  >
                    Thay ảnh
                  </button>
                  <label htmlFor="cover-alt">Mô tả ảnh</label>
                  <textarea
                    id="cover-alt"
                    value={draft.coverAlt}
                    maxLength={300}
                    rows={3}
                    disabled={busy}
                    onChange={(e) => update({ coverAlt: e.target.value })}
                  />
                </>
              )}
            </section>
            <section className="inspector-section">
              <h2>Nguồn bài viết</h2>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={!!draft.origin}
                  disabled={busy}
                  onChange={(e) =>
                    update({
                      origin: e.target.checked
                        ? {
                            url: "",
                            author: "",
                            publishedOn: null,
                            retrievedOn: new Date().toLocaleDateString("en-CA", {
                              timeZone: "Asia/Ho_Chi_Minh",
                            }),
                          }
                        : null,
                    })
                  }
                />
                Ghi nguồn tham khảo
              </label>
              {draft.origin && (
                <>
                  <label htmlFor="origin-url">URL bài gốc</label>
                  <input
                    id="origin-url"
                    type="url"
                    value={draft.origin.url}
                    disabled={busy}
                    onChange={(e) => update({ origin: { ...draft.origin!, url: e.target.value } })}
                  />
                  <label htmlFor="origin-author">Tác giả ở nguồn</label>
                  <input
                    id="origin-author"
                    maxLength={200}
                    value={draft.origin.author}
                    disabled={busy}
                    onChange={(e) =>
                      update({ origin: { ...draft.origin!, author: e.target.value } })
                    }
                  />
                  <label htmlFor="origin-date">Ngày đăng gốc</label>
                  <input
                    id="origin-date"
                    type="date"
                    value={draft.origin.publishedOn ?? ""}
                    disabled={busy}
                    onChange={(e) =>
                      update({ origin: { ...draft.origin!, publishedOn: e.target.value || null } })
                    }
                  />
                  <label htmlFor="origin-retrieved">Ngày đối chiếu</label>
                  <input
                    id="origin-retrieved"
                    type="date"
                    value={draft.origin.retrievedOn}
                    disabled={busy}
                    onChange={(e) =>
                      update({ origin: { ...draft.origin!, retrievedOn: e.target.value } })
                    }
                  />
                </>
              )}
            </section>
            <section className="inspector-section publish-info">
              <h2>Xuất bản</h2>
              <p>Bấm đăng công khai để bài viết xuất hiện ngay trên website.</p>
              {entry.publishedAt && <p>Đã đăng: {dateLabel(entry.publishedAt)}</p>}
              {entry.publicUrl && (
                <>
                  <Link className="text-link" href={entry.publicUrl} target="_blank">
                    Xem bài công khai <ArrowUpRight size={16} />
                  </Link>
                  <button className="text-button danger" disabled={busy} onClick={withdraw}>
                    Gỡ bài khỏi website
                  </button>
                </>
              )}
              <button className="text-button" onClick={loadHistory}>
                <History size={16} />
                Lịch sử xuất bản
              </button>
            </section>
          </aside>
        </div>
        {history && (
          <section className="history-panel">
            <div className="section-heading">
              <h2>Lịch sử xuất bản</h2>
              <button
                className="icon-button"
                aria-label="Đóng lịch sử"
                onClick={() => setHistory(null)}
              >
                <X size={20} />
              </button>
            </div>
            {history.length ? (
              history.map((revision) => (
                <div key={revision.id} className="history-row">
                  <div>
                    <strong>{revision.title}</strong>
                    <small>
                      {dateLabel(revision.publishedAt)} · {revision.authorName} · Bản{" "}
                      {revision.draftVersion}
                    </small>
                  </div>
                  <button
                    className="button"
                    disabled={busy || conflict}
                    onClick={() => void restore(revision)}
                  >
                    Khôi phục vào nháp
                  </button>
                </div>
              ))
            ) : (
              <p>Chưa có phiên bản công khai.</p>
            )}
          </section>
        )}
      </div>
      {picker && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(asset, alt) => {
            if (picker === "cover") update({ coverId: asset.id, coverAlt: alt });
            else editor.current?.insertImage(asset.id, alt);
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
