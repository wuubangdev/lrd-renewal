"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Save, Eye, History, Upload, Download, ArrowLeft, ArrowRight } from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import { Dialog } from "@/components/dialog";
import { ProgramForm } from "./program-form";
import { AdmissionForm } from "./admission-form";
import { TextField } from "./fields";
import { EnglishVersionButton } from "@/features/localization/english-version-button";
import {
  type AcademicView,
  type ProgramDraft,
  type AdmissionDraft,
  type Kind,
  type Edition,
  levels,
  statuses,
  admissionStatuses,
  publicPath,
  timeLabel,
  toLocalTime,
  fromLocalTime,
} from "./contracts";
const programTabs = [
  ["general", "Thông tin chung"],
  ["outcomes", "Đầu ra & nghề nghiệp"],
  ["curricula", "Khung chương trình"],
  ["accreditations", "Kiểm định"],
  ["contact", "Liên hệ"],
];
const admissionTabs = [
  ["general", "Thông tin chung"],
  ["programs", "Chương trình & chỉ tiêu"],
  ["requirements", "Điều kiện & hồ sơ"],
  ["schedule", "Thời gian & lịch trình"],
  ["contact", "Liên hệ"],
];
const actionLabels: Record<string, string> = {
  retire: "Ngừng công khai chương trình",
  reinstate: "Khôi phục chương trình",
  extend: "Gia hạn đăng ký",
  close: "Đóng sớm đợt tuyển",
  withdraw: "Gỡ đợt tuyển",
  reload: "Tải bản mới",
  restore: "Khôi phục phiên bản",
};
export function AcademicEditor({ kind, initial }: { kind: Kind; initial: AcademicView }) {
  const [view, setView] = useState(initial),
    [content, setContent] = useState(initial.content),
    [dirty, setDirty] = useState(false),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("general"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [history, setHistory] = useState<Edition[] | null>(null),
    [action, setAction] = useState<string | null>(null),
    [edition, setEdition] = useState<Edition | null>(null),
    [reason, setReason] = useState(""),
    [deadline, setDeadline] = useState("");
  const base = "/admin/academics/" + kind + "/" + view.id;
  const createFlow = kind === "programs" && initial.version === 0 && !view.publishedAt;
  const currentProgramStep = programTabs.findIndex(([key]) => key === tab);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    function leave(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  function change(d: ProgramDraft | AdmissionDraft) {
    setContent(d);
    setDirty(true);
    setNotice("");
  }
  function accept(v: AcademicView) {
    setView(v);
    setContent(v.content);
    setDirty(false);
  }
  async function save() {
    if (!dirty) return view;
    const v = await api<AcademicView>(base, {
      method: "PATCH",
      headers: matchVersion(view.version),
      body: JSON.stringify(content),
    });
    accept(v);
    return v;
  }
  async function run(operation: "save" | "publish" | "preview" | "history") {
    const popup = operation === "preview" ? window.open("about:blank", "_blank") : null;
    if (popup) popup.opener = null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (operation === "history") {
        setHistory(await api<Edition[]>(base + "/editions"));
        return;
      }
      const saved = await save();
      if (operation === "publish") {
        accept(
          await api<AcademicView>(base + "/publish", {
            method: "POST",
            headers: matchVersion(saved.version),
            body: JSON.stringify({ draftVersion: saved.draftVersion }),
          }),
        );
        setNotice("Đã công khai. Nội dung mới đã hiển thị trên website.");
      } else if (operation === "preview") {
        if (popup) popup.location.href = "/admin/" + kind + "/" + view.id + "/preview";
        else setError("Trình duyệt đã chặn cửa sổ xem trước. Cho phép cửa sổ mới rồi thử lại.");
      } else setNotice("Đã lưu bản nháp. Bản công khai chưa thay đổi.");
    } catch (e) {
      popup?.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function ask(name: string) {
    setAction(name);
    setReason("");
    setError("");
    setNotice("");
    setDeadline(kind === "admissions" ? toLocalTime((content as AdmissionDraft).closesAt) : "");
  }
  async function operate(e: React.FormEvent) {
    e.preventDefault();
    if (!action) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const v =
        action === "reload"
          ? await api<AcademicView>(base)
          : await api<AcademicView>(base + "/" + action, {
              method: "POST",
              headers: matchVersion(view.version),
              body: JSON.stringify(
                action === "restore"
                  ? { editionId: edition?.id }
                  : { reason, deadline: fromLocalTime(deadline) },
              ),
            });
      accept(v);
      setNotice(
        action === "restore"
          ? "Đã đưa phiên bản cũ về bản nháp. Công khai để áp dụng nội dung."
          : "Đã cập nhật thành công.",
      );
      setAction(null);
      setHistory(null);
    } catch (e) {
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
    a.download = view.code + "-draft.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <header className="admin-topbar">
        <Link
          href={"/admin/" + kind}
          onClick={(e) => {
            if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?"))
              e.preventDefault();
          }}
        >
          ← {kind === "programs" ? "Chương trình đào tạo" : "Tuyển sinh"}
        </Link>
        <span>
          {view.code} · {view.locale.toUpperCase()}
        </span>
      </header>
      <div className="admin-content academic-editor" inert={!ready}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{levels[view.level]}</p>
            <h1>{view.content.title || "Nội dung mới"}</h1>
            <p className="muted">
              Bản nháp #{view.draftVersion} · Cập nhật {timeLabel(view.updatedAt)}
            </p>
          </div>
          <span className={"badge " + (view.status === "PUBLISHED" ? "published" : "draft")}>
            {statuses[view.status]}
          </span>
        </div>
        <div className="academic-toolbar">
          <EnglishVersionButton
            kind={kind === "programs" ? "PROGRAM" : "ADMISSION"}
            sourceId={view.id}
            locale={view.locale}
            dirty={dirty || busy}
            sourceReady={!!content.title.trim()}
          />
          <span className={`badge ${dirty ? "changed" : "draft"}`} role="status">
            {busy
              ? "Đang xử lý…"
              : dirty
                ? "Có thay đổi chưa lưu"
                : notice.startsWith("Đã lưu")
                  ? "Đã lưu nháp"
                  : "Đã lưu"}
          </span>
          <button
            className="button secondary"
            data-admin-save
            title="Lưu bản nháp (Ctrl/Cmd+S). Chưa đăng công khai."
            disabled={busy || !dirty || view.status === "RETIRED"}
            onClick={() => run("save")}
          >
            <Save size={17} />
            Lưu nháp
          </button>
          <button className="button secondary" disabled={busy} onClick={() => run("preview")}>
            <Eye size={17} />
            Xem trước
          </button>
          {!createFlow && (
            <button
              className="button primary"
              disabled={busy || view.status === "RETIRED"}
              onClick={() => run("publish")}
            >
              <Upload size={17} />
              {busy ? "Đang xử lý…" : "Lưu và công khai"}
            </button>
          )}
          <button className="button ghost" disabled={busy} onClick={() => run("history")}>
            <History size={17} />
            Lịch sử
          </button>
          <button className="button ghost" onClick={backup}>
            <Download size={17} />
            Tải bản nháp
          </button>
        </div>
        <div className="academic-operations">
          {view.publishedAt && (
            <Link href={view.publicUrl!} target="_blank" className="text-link">
              Xem bản công khai ↗
            </Link>
          )}
          {kind === "programs" ? (
            view.status === "RETIRED" ? (
              <button disabled={busy} className="button secondary" onClick={() => ask("reinstate")}>
                Khôi phục về nháp
              </button>
            ) : (
              <button
                disabled={busy || dirty}
                className="button ghost"
                onClick={() => ask("retire")}
              >
                Ngừng công khai
              </button>
            )
          ) : (
            view.publishedAt && (
              <>
                <span className="badge">{admissionStatuses[view.admissionStatus ?? ""]}</span>
                {!["CLOSED_EARLY", "NOTICE"].includes(view.admissionStatus ?? "") && (
                  <button
                    className="button secondary"
                    disabled={busy || dirty}
                    onClick={() => ask("extend")}
                  >
                    Gia hạn
                  </button>
                )}
                {["OPEN", "UPCOMING"].includes(view.admissionStatus ?? "") && (
                  <button
                    className="button secondary"
                    disabled={busy || dirty}
                    onClick={() => ask("close")}
                  >
                    Đóng sớm
                  </button>
                )}
                <button
                  className="button ghost"
                  disabled={busy || dirty}
                  onClick={() => ask("withdraw")}
                >
                  Gỡ công khai
                </button>
              </>
            )
          )}
          <span className="muted">{dirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ bản nháp"}</span>
        </div>
        {notice && (
          <p className="alert success" role="status">
            {notice}
          </p>
        )}
        {error && !action && (
          <div className="alert error" role="alert">
            {error}
            <button className="button secondary" onClick={() => ask("reload")}>
              Tải bản mới
            </button>
          </div>
        )}
        {view.status === "RETIRED" && (
          <p className="alert">
            Lý do ngừng: {view.retirementReason}. Khôi phục về nháp để tiếp tục biên tập.
          </p>
        )}
        <div role="tablist" aria-label="Nội dung biên tập" className="academic-tabs">
          {(kind === "programs" ? programTabs : admissionTabs).map(([key, label]) => (
            <button
              key={key}
              id={"tab-" + key}
              role="tab"
              aria-selected={tab === key}
              aria-controls={"panel-" + key}
              tabIndex={tab === key ? 0 : -1}
              disabled={
                createFlow &&
                programTabs.findIndex(([candidate]) => candidate === key) > currentProgramStep
              }
              onKeyDown={(e) => {
                const tabs = kind === "programs" ? programTabs : admissionTabs;
                const current = tabs.findIndex((t) => t[0] === key);
                const next =
                  e.key === "ArrowRight"
                    ? (current + 1) % tabs.length
                    : e.key === "ArrowLeft"
                      ? (current + tabs.length - 1) % tabs.length
                      : e.key === "Home"
                        ? 0
                        : e.key === "End"
                          ? tabs.length - 1
                          : -1;
                if (next >= 0) {
                  e.preventDefault();
                  if (!createFlow || next <= currentProgramStep) setTab(tabs[next][0]);
                  document.getElementById("tab-" + tabs[next][0])?.focus();
                }
              }}
              onClick={() => {
                if (!createFlow) setTab(key);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <section
          role="tabpanel"
          id={"panel-" + tab}
          aria-labelledby={"tab-" + tab}
          className="academic-panel"
        >
          <fieldset disabled={busy || view.status === "RETIRED"}>
            <p className="field-hint">Các mục có * cần điền trước khi công khai.</p>
            {kind === "programs" ? (
              <ProgramForm value={content as ProgramDraft} onChange={change} tab={tab} />
            ) : (
              <AdmissionForm
                value={content as AdmissionDraft}
                onChange={change}
                tab={tab}
                locale={view.locale}
                level={view.level}
                published={!!view.publishedAt && view.admissionStatus !== "NOTICE"}
              />
            )}
          </fieldset>
        </section>
        {createFlow && (
          <div className="staff-step-actions academic-step-actions">
            {currentProgramStep > 0 && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setTab(programTabs[currentProgramStep - 1][0])}
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
            )}
            {currentProgramStep < programTabs.length - 1 && (
              <button
                type="button"
                className="button primary"
                onClick={() => setTab(programTabs[currentProgramStep + 1][0])}
              >
                Tiếp theo: {programTabs[currentProgramStep + 1][1]} <ArrowRight size={16} />
              </button>
            )}
            {currentProgramStep === programTabs.length - 1 && (
              <button
                type="button"
                className="button primary"
                disabled={busy}
                onClick={() => run("publish")}
              >
                <Upload size={16} /> Lưu và công khai
              </button>
            )}
          </div>
        )}
      </div>
      {history && (
        <Dialog
          title="Lịch sử phiên bản công khai (50 bản gần nhất)"
          onClose={() => setHistory(null)}
        >
          <div className="manage-form">
            {!history.length && <p>Chưa có phiên bản công khai.</p>}
            {history.map((e) => (
              <article key={e.id} className="academic-history">
                <div>
                  <strong>{e.content.title}</strong>
                  <small>
                    {timeLabel(e.publishedAt)} ·{" "}
                    {e.action === "PUBLISHED"
                      ? "Công khai"
                      : e.action === "DEADLINE_EXTENDED"
                        ? "Gia hạn"
                        : "Đóng sớm"}
                  </small>
                  {e.reason && <p>{e.reason}</p>}
                </div>
                <button
                  className="button secondary"
                  disabled={busy || view.status === "RETIRED"}
                  onClick={() => {
                    setEdition(e);
                    ask("restore");
                  }}
                >
                  Khôi phục về nháp
                </button>
              </article>
            ))}
          </div>
        </Dialog>
      )}
      {action && (
        <Dialog title={actionLabels[action]} onClose={() => !busy && setAction(null)}>
          <form className="manage-form" onSubmit={operate}>
            {action === "reload" || action === "restore" ? (
              <p>
                Thay thế phần đang nhập bằng{" "}
                {action === "reload" ? "bản nháp mới nhất" : "phiên bản đã chọn"}. Có thể tải bản
                nháp để giữ nội dung trước khi tiếp tục.{" "}
                {action === "restore" && kind === "admissions"
                  ? "Mốc đăng ký và trạng thái đóng sớm của bản công khai được giữ nguyên."
                  : ""}
              </p>
            ) : action === "reinstate" ? (
              <p>Chương trình sẽ trở về bản nháp. Bạn cần công khai để hiện lại trên website.</p>
            ) : (
              <>
                <p>
                  {action === "retire"
                    ? "Ẩn chương trình khỏi website. Thao tác bị chặn nếu còn đợt tuyển đang hoặc sắp mở."
                    : action === "close"
                      ? "Dừng nhận hồ sơ ngay; thông báo tuyển sinh vẫn hiển thị để người đọc tra cứu."
                      : action === "withdraw"
                        ? "Gỡ thông báo và đường dẫn công khai; bản nháp và lịch sử được giữ lại."
                        : "Hạn mới phải sau hạn cũ và thời điểm hiện tại. Chỉ mốc đóng được cập nhật lên bản công khai; nội dung nháp khác giữ nguyên."}
                </p>
                {action === "extend" && (
                  <TextField
                    label="Hạn đóng mới (giờ Việt Nam)"
                    required
                    type="datetime-local"
                    value={deadline}
                    onChange={setDeadline}
                  />
                )}
                <label>
                  Lý do *
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              </>
            )}
            {error && (
              <p role="alert" className="alert error">
                {error}
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Đang xử lý…" : "Xác nhận"}
            </button>
          </form>
        </Dialog>
      )}
    </>
  );
}
