"use client";
import { useUnsavedChanges, useConfirmNavigation } from "@/components/unsaved-changes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Save, Eye, History, Upload, Download, ExternalLink } from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import { statusLabels, dateLabel } from "@/lib/contracts";
import { Dialog } from "@/components/dialog";
import { HomeForm } from "./home-form";
import { MenuForm } from "./menu-form";
import { EnglishVersionButton } from "@/features/localization/english-version-button";
import type {
  HomeComposition,
  NavigationMenu,
  SiteContent,
  SiteView,
  SiteRelease,
} from "./contracts";

export function SiteEditor({ initial }: { initial: SiteView }) {
  const router = useRouter();
  const confirmNavigation = useConfirmNavigation();
  const [view, setView] = useState(initial),
    [content, setContent] = useState(initial.content);
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [history, setHistory] = useState<SiteRelease[] | null>(null);
  const [restore, setRestore] = useState<SiteRelease | null>(null),
    [reload, setReload] = useState(false);
  const kind = view.kind.toLowerCase(),
    base = "/admin/site/" + kind,
    query = "?locale=" + view.locale;
  useEffect(() => setReady(true), []);
  useUnsavedChanges(dirty);
  function change(value: SiteContent) {
    setContent(value);
    setDirty(true);
    setNotice("");
  }
  async function save() {
    if (!dirty) return view;
    const next = await api<SiteView>(base + query, {
      method: "PATCH",
      headers: matchVersion(view.version),
      body: JSON.stringify(content),
    });
    setView(next);
    setContent(next.content);
    setDirty(false);
    return next;
  }
  async function run(action: "save" | "publish" | "preview" | "history") {
    const tab = action === "preview" ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (action === "history") {
        setHistory(await api<SiteRelease[]>(base + "/releases" + query));
        return;
      }
      const saved = await save();
      if (action === "publish") {
        const next = await api<SiteView>(base + "/publish" + query, {
          method: "POST",
          headers: matchVersion(saved.version),
          body: JSON.stringify({ draftVersion: saved.draftVersion }),
        });
        setView(next);
        setContent(next.content);
        setNotice("Đã đăng công khai. Nội dung mới đã hiển thị trên website.");
      } else if (action === "preview") {
        if (tab) tab.location.href = base + "/preview" + query;
        else setError("Trình duyệt chặn cửa sổ xem trước. Hãy cho phép mở cửa sổ mới rồi thử lại.");
      } else setNotice("Đã lưu bản nháp. Bản công khai chưa thay đổi.");
    } catch (e) {
      tab?.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function backup() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "lrd-" + kind + "-" + view.locale + "-draft.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function restoreRelease() {
    if (!restore) return;
    setBusy(true);
    setError("");
    try {
      const next = await api<SiteView>(base + "/restore" + query, {
        method: "POST",
        headers: matchVersion(view.version),
        body: JSON.stringify({ releaseId: restore.id }),
      });
      setView(next);
      setContent(next.content);
      setDirty(false);
      setRestore(null);
      setHistory(null);
      setNotice("Đã đưa phiên bản cũ về bản nháp. Bấm Đăng công khai để áp dụng.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-topbar">
        <span>Website / {view.kind === "HOME" ? "Trang chủ" : "Menu điều hướng"}</span>
        <Link href={"/" + view.locale} target="_blank">
          Mở website <ExternalLink size={15} />
        </Link>
      </div>
      <div className="admin-content site-editor" inert={!ready}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">NỘI DUNG WEBSITE</p>
            <h1>{view.kind === "HOME" ? "Trang chủ" : "Menu điều hướng"}</h1>
            <p className="muted">
              Chỉnh sửa, xem trước và đăng trực tiếp khi nội dung đã sẵn sàng.
            </p>
          </div>
          <label className="locale-select">
            Ngôn ngữ
            <select
              value={view.locale}
              disabled={busy}
              onChange={(e) => {
                if (confirmNavigation()) router.push(base + "?locale=" + e.target.value);
              }}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English (bản riêng)</option>
            </select>
          </label>
        </div>
        {view.locale === "en" && (
          <p className="alert">
            Bản tiếng Anh có trạng thái công khai riêng. Hãy dịch đầy đủ nội dung trước khi đăng.
          </p>
        )}
        <div className="site-toolbar">
          <div>
            <span className={"badge " + view.status.toLowerCase()}>
              {busy
                ? "Đang xử lý…"
                : dirty
                  ? "Có thay đổi chưa lưu"
                  : notice.startsWith("Đã lưu")
                    ? "Đã lưu nháp"
                    : statusLabels[view.status]}
            </span>
            <small>
              Bản nháp {view.draftVersion}
              {view.publishedAt ? " · Đăng ngày " + dateLabel(view.publishedAt) : ""}
            </small>
          </div>
          <div className="row-actions">
            <EnglishVersionButton
              kind={view.kind}
              sourceId={view.id}
              locale={view.locale}
              dirty={dirty || busy}
            />
            <button
              className="icon-button"
              aria-label="Lịch sử xuất bản"
              disabled={busy}
              onClick={() => run("history")}
            >
              <History size={19} />
            </button>
            <button className="button secondary" disabled={busy} onClick={() => run("preview")}>
              <Eye size={17} />
              Xem trước
            </button>
            <button
              className="button secondary"
              data-admin-save
              title="Lưu bản nháp (Ctrl/Cmd+S). Chưa đăng công khai."
              disabled={busy || !dirty}
              onClick={() => run("save")}
            >
              <Save size={17} />
              Lưu nháp
            </button>
            <button
              className="button primary"
              disabled={busy || (!dirty && view.status === "PUBLISHED")}
              onClick={() => run("publish")}
            >
              <Upload size={17} />
              {busy ? "Đang xử lý…" : "Đăng công khai"}
            </button>
          </div>
        </div>
        {error && (
          <div className="alert error" role="alert">
            <p>{error}</p>
            <div className="row-actions">
              <button className="text-link" onClick={backup}>
                <Download size={16} />
                Tải bản đang nhập
              </button>
              <button className="text-link" onClick={() => setReload(true)}>
                Tải lại dữ liệu
              </button>
            </div>
          </div>
        )}
        {notice && (
          <p className="alert success" role="status">
            {notice}
          </p>
        )}
        <fieldset className="site-fieldset" disabled={busy}>
          {view.kind === "HOME" ? (
            <HomeForm value={content as HomeComposition} onChange={change} locale={view.locale} />
          ) : (
            <MenuForm value={content as NavigationMenu} onChange={change} locale={view.locale} />
          )}
        </fieldset>
      </div>
      {history && (
        <Dialog title="Lịch sử xuất bản" onClose={() => !busy && setHistory(null)}>
          <div className="manage-form">
            <p>
              Mỗi lần đăng tạo một phiên bản. Khôi phục sẽ tạo bản nháp để bạn kiểm tra trước khi
              đăng lại.
            </p>
            {!history.length && <p>Chưa có lần xuất bản nào.</p>}
            {history.map((r) => (
              <div className="release-row" key={r.id}>
                <div>
                  <strong>Bản nháp {r.draftVersion}</strong>
                  <small>{new Date(r.publishedAt).toLocaleString("vi-VN")}</small>
                </div>
                <button className="button secondary" disabled={busy} onClick={() => setRestore(r)}>
                  Khôi phục
                </button>
              </div>
            ))}
          </div>
        </Dialog>
      )}
      {restore && (
        <Dialog title="Khôi phục phiên bản này?" onClose={() => !busy && setRestore(null)}>
          <div className="manage-form">
            <p>
              Bản nháp hiện tại và các thay đổi chưa lưu sẽ được thay bằng phiên bản đã chọn. Bản
              công khai chưa thay đổi.
            </p>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button className="button secondary" disabled={busy} onClick={() => setRestore(null)}>
                Hủy
              </button>
              <button className="button primary" disabled={busy} onClick={restoreRelease}>
                Khôi phục bản nháp
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {reload && (
        <Dialog title="Tải lại dữ liệu từ máy chủ?" onClose={() => setReload(false)}>
          <div className="manage-form">
            <p>Thay đổi chưa lưu sẽ bị bỏ. Bạn có thể tải bản đang nhập trước để giữ nội dung.</p>
            <div className="form-actions">
              <button className="button secondary" onClick={backup}>
                Tải bản đang nhập
              </button>
              <button className="button primary" onClick={() => window.location.reload()}>
                Tải lại
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
