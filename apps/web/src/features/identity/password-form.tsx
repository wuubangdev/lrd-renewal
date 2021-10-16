"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/browser-api";
import { LockKeyhole } from "lucide-react";

export function PasswordForm({ reset = false }: { reset?: boolean }) {
  const [token, setToken] = useState(""),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [done, setDone] = useState(false);
  useEffect(() => {
    function readToken() {
      setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "");
      setDone(false);
      setError("");
      window.history.replaceState(null, "", window.location.pathname);
    }
    if (reset) readToken();
    setReady(true);
    if (reset) window.addEventListener("hashchange", readToken);
    return () => window.removeEventListener("hashchange", readToken);
  }, [reset]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = new FormData(e.currentTarget),
      password = String(data.get("password") ?? "");
    if (password !== data.get("confirm")) {
      setError("Hai mật khẩu chưa khớp.");
      return;
    }
    if ([...password].length < 12 || new TextEncoder().encode(password).length > 72) {
      setError("Mật khẩu cần ít nhất 12 ký tự, tối đa 72 byte UTF-8.");
      return;
    }
    setBusy(true);
    try {
      await api(reset ? "/auth/reset-password" : "/auth/change-password", {
        method: "POST",
        body: JSON.stringify(
          reset ? { token, password } : { currentPassword: data.get("currentPassword"), password },
        ),
      });
      setToken("");
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="manage-form">
        <ShieldMessage />
        <h2>Đã cập nhật mật khẩu</h2>
        <p>Các phiên đăng nhập cũ đã được thu hồi. Hãy đăng nhập bằng mật khẩu mới.</p>
        <Link className="button primary" href="/admin/login">
          Đăng nhập
        </Link>
      </div>
    );
  return (
    <form method="post" className="manage-form password-form" onSubmit={submit}>
      <div className="login-symbol">
        <LockKeyhole size={24} />
      </div>
      <h1>{reset ? "Đặt mật khẩu mới" : "Bảo mật tài khoản"}</h1>
      <p>
        {reset
          ? "Liên kết chỉ sử dụng được một lần."
          : "Thay đổi mật khẩu sẽ đăng xuất tài khoản khỏi mọi thiết bị."}
      </p>
      {reset && ready && !token ? (
        <p className="alert error">
          Liên kết không có mã đặt mật khẩu. Hãy mở đầy đủ liên kết do quản trị viên cung cấp hoặc
          yêu cầu cấp lại.
        </p>
      ) : (
        <>
          {!reset && (
            <label>
              Mật khẩu hiện tại
              <input
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={100}
              />
            </label>
          )}
          <label>
            Mật khẩu mới
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
            />
          </label>
          <label>
            Nhập lại mật khẩu mới
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={72}
            />
          </label>
          <p className="field-hint">
            Dùng ít nhất 12 ký tự, tối đa 72 byte UTF-8. Bạn có thể dùng một cụm từ dài, dễ nhớ.
          </p>
          {error && (
            <p className="alert error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary" disabled={!ready || busy}>
            {busy ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
          </button>
        </>
      )}
    </form>
  );
}
function ShieldMessage() {
  return (
    <p className="alert success" role="status">
      Mật khẩu đã được lưu an toàn.
    </p>
  );
}
