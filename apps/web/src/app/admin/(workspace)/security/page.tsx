import { requireUser } from "@/lib/server-api";
import { PasswordForm } from "@/features/identity/password-form";
export default async function SecurityPage() {
  await requireUser();
  return (
    <>
      <div className="admin-topbar">
        <span>Tài khoản / Bảo mật</span>
      </div>
      <div className="admin-content">
        <div className="settings-panel">
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
