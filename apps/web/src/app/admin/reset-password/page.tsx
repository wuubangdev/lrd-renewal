import Link from "next/link";
import { Brand } from "@/components/brand";
import { PasswordForm } from "@/features/identity/password-form";
export const metadata = {
  title: "Đặt lại mật khẩu",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function ResetPasswordPage() {
  return (
    <main id="main" className="reset-page">
      <Brand />
      <div className="settings-panel">
        <PasswordForm reset />
      </div>
      <Link href="/admin/login">← Trở về đăng nhập</Link>
    </main>
  );
}
