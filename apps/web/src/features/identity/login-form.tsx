"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { api } from "@/lib/browser-api";
import type { SessionUser } from "@/lib/contracts";
export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api<SessionUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      router.replace(next);
      router.refresh();
    } catch {
      setError("Đăng nhập chưa thành công. Kiểm tra email, mật khẩu và thử lại.");
      setBusy(false);
    }
  }
  return (
    <form className="login-form" method="post" onSubmit={submit}>
      <div className="login-symbol">
        <LockKeyhole size={24} />
      </div>
      <p className="eyebrow">KHÔNG GIAN BIÊN TẬP</p>
      <h1>Chào mừng trở lại.</h1>
      <p>Đăng nhập để quản lý và chia sẻ thông tin của bộ môn.</p>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="ten@ctu.edu.vn"
        required
        autoFocus
      />
      <label htmlFor="password">Mật khẩu</label>
      <div className="password-input">
        <input
          id="password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          required
        />
        <button
          type="button"
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" type="submit" disabled={busy || !ready}>
        {busy ? "Đang đăng nhập…" : "Đăng nhập"}
        <ArrowRight size={18} />
      </button>
      <noscript>Bật JavaScript để đăng nhập vào khu vực quản trị.</noscript>
      <p className="form-note">
        Quên mật khẩu? Liên hệ quản trị viên của bộ môn để nhận liên kết đặt lại mật khẩu dùng một
        lần.
      </p>
    </form>
  );
}
