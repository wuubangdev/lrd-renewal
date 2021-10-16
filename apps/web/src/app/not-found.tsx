import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="standalone-message">
      <span className="eyebrow">404 · KHÔNG TÌM THẤY</span>
      <h1>Trang này hiện không có.</h1>
      <p>Nội dung có thể chưa được đăng hoặc đã được gỡ xuống.</p>
      <Link href="/vi" className="button primary">
        Về trang chủ
      </Link>
    </main>
  );
}
