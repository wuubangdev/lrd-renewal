"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Settings2, Sparkles, Unplug, Wifi } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { api } from "@/lib/browser-api";
import { dateLabel } from "@/lib/contracts";

export type GeminiSettingsView = { model: string; configured: boolean; updatedAt: string | null };

export function GeminiSettings({ initial }: { initial: GeminiSettingsView }) {
  const [settings, setSettings] = useState(initial);
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState(initial.model);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [working, setWorking] = useState<"save" | "test" | "remove" | null>(null);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState("");
  const [notice, setNotice] = useState("");

  function edit() {
    setModel(settings.model);
    setApiKey("");
    setError("");
    setTestResult("");
    setOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking("save");
    setError("");
    try {
      const result = await api<GeminiSettingsView>("/admin/integrations/gemini", {
        method: "PUT",
        body: JSON.stringify({ model: model.trim(), apiKey: apiKey.trim() || null }),
      });
      setSettings(result);
      setApiKey("");
      setNotice("Đã lưu cấu hình Gemini. Khóa API không được hiển thị lại.");
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  async function testConnection() {
    setWorking("test");
    setError("");
    setTestResult("");
    try {
      const result = await api<{ connected: boolean; model: string }>(
        "/admin/integrations/gemini/test",
        {
          method: "POST",
          body: JSON.stringify({ model: model.trim(), apiKey: apiKey.trim() || null }),
        },
      );
      setTestResult(`Kết nối thành công với ${result.model}. Bạn có thể lưu cấu hình.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  async function removeKey() {
    if (!window.confirm("Xóa khóa Gemini đã lưu? Tính năng tạo bài bằng AI sẽ tạm ngừng.")) return;
    setWorking("remove");
    setError("");
    try {
      const result = await api<GeminiSettingsView>("/admin/integrations/gemini/key", {
        method: "DELETE",
      });
      setSettings(result);
      setApiKey("");
      setTestResult("");
      setNotice("Đã xóa khóa Gemini.");
      setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(null);
    }
  }

  return (
    <>
      <div className="admin-topbar">
        <span>Hệ thống / Tích hợp</span>
      </div>
      <div className="admin-content integration-page">
        <p className="eyebrow">CẤU HÌNH DỊCH VỤ</p>
        <h1>Tích hợp AI</h1>
        <p className="muted">
          Quản lý kết nối Gemini để tạo bố cục bài viết từ tệp Word trong CMS.
        </p>
        {notice && (
          <div className="alert success" role="status">
            <CheckCircle2 size={18} />
            {notice}
          </div>
        )}
        <section className="integration-card" aria-label="Cấu hình Gemini">
          <div className="integration-icon">
            <Sparkles size={25} />
          </div>
          <div className="integration-copy">
            <div className="integration-title">
              <h2>Google Gemini</h2>
              <span
                className={settings.configured ? "integration-status ready" : "integration-status"}
              >
                {settings.configured ? "Đã cấu hình" : "Chưa cấu hình"}
              </span>
            </div>
            <p>
              Tạo tiêu đề, tóm tắt và đề mục từ nội dung Word. Mục lục của trang bài được tạo từ các
              đề mục này.
            </p>
            <dl>
              <div>
                <dt>Model</dt>
                <dd>{settings.model}</dd>
              </div>
              <div>
                <dt>Khóa API</dt>
                <dd>{settings.configured ? "Đã lưu an toàn" : "Chưa có"}</dd>
              </div>
              {settings.updatedAt && (
                <div>
                  <dt>Cập nhật</dt>
                  <dd>{dateLabel(settings.updatedAt)}</dd>
                </div>
              )}
            </dl>
          </div>
          <button className="button primary" onClick={edit}>
            <Settings2 size={17} /> Cấu hình & kiểm tra
          </button>
        </section>
        <p className="integration-note">
          <KeyRound size={17} /> Chỉ quản trị viên có thể sửa cấu hình. Khi dùng Gemini, văn bản từ
          file Word được gửi tới Google; ảnh gốc được giữ trong thư viện media của website. Bài viết
          luôn được xem trước và sửa trong bản nháp trước khi đăng.
        </p>
      </div>
      {open && (
        <Dialog title="Cấu hình Gemini" onClose={() => !working && setOpen(false)}>
          <form className="manage-form gemini-form" onSubmit={save}>
            <label htmlFor="gemini-model">
              Model Gemini
              <input
                id="gemini-model"
                list="gemini-models"
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setTestResult("");
                }}
                maxLength={80}
                required
                disabled={!!working}
              />
            </label>
            <datalist id="gemini-models">
              <option value="gemini-2.5-flash" />
              <option value="gemini-2.5-flash-lite" />
            </datalist>
            <label htmlFor="gemini-key">
              Khóa API{" "}
              {settings.configured && (
                <span className="field-hint">Để trống nếu giữ khóa đã lưu</span>
              )}
              <span className="gemini-key-field">
                <input
                  id="gemini-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult("");
                  }}
                  autoComplete="new-password"
                  spellCheck={false}
                  maxLength={512}
                  placeholder={
                    settings.configured ? "Nhập khóa mới để thay thế" : "Nhập khóa Gemini API"
                  }
                  disabled={!!working}
                />
                <button type="button" className="text-button" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? "Ẩn" : "Hiện"}
                </button>
              </span>
            </label>
            <p className="field-hint">
              Khóa được mã hóa trong cơ sở dữ liệu và không được trả về trình duyệt sau khi lưu.
            </p>
            {error && (
              <div className="alert error" role="alert">
                <Unplug size={18} />
                {error}
              </div>
            )}
            {testResult && (
              <div className="alert success" role="status">
                <CheckCircle2 size={18} />
                {testResult}
              </div>
            )}
            <div className="gemini-form-actions">
              {settings.configured && (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={removeKey}
                  disabled={!!working}
                >
                  Xóa khóa đã lưu
                </button>
              )}
              <button
                type="button"
                className="button"
                onClick={testConnection}
                disabled={!!working || !model.trim() || (!apiKey.trim() && !settings.configured)}
              >
                <Wifi size={17} /> {working === "test" ? "Đang kiểm tra…" : "Kiểm tra kết nối"}
              </button>
              <button
                type="submit"
                className="button primary"
                disabled={!!working || !model.trim() || (!apiKey.trim() && !settings.configured)}
              >
                {working === "save" ? "Đang lưu…" : "Lưu cấu hình"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
