import Link from "next/link";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/features/identity/login-form";
import { safeAdminPath } from "@/lib/server-api";
export const metadata = { title: "Đăng nhập quản trị", robots: { index: false, follow: false } };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return (
    <main id="main" className="login-page">
      <div className="login-story">
        <Brand />
        <div>
          <span className="eyebrow">BỘ MÔN TÀI NGUYÊN ĐẤT ĐAI</span>
          <h2>
            Mỗi câu chuyện
            <br />
            mở một kết nối.
          </h2>
          <p>
            Một không gian để cập nhật tri thức, lan tỏa hoạt động và kết nối cộng đồng học thuật.
          </p>
        </div>
        <span>ĐẠI HỌC CẦN THƠ · LAND RESOURCES DEPARTMENT</span>
      </div>
      <div className="login-panel">
        <LoginForm next={safeAdminPath((await searchParams).next)} />
        <Link href="/vi" className="back-home">
          ← Trở về website
        </Link>
      </div>
    </main>
  );
}
