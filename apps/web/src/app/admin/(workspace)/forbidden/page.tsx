import Link from "next/link";
export default function Forbidden() {
  return (
    <div className="admin-content">
      <h1>Không có quyền truy cập</h1>
      <p>Tài khoản của bạn chưa được cấp quyền cho khu vực này.</p>
      <Link className="button primary" href="/admin">
        Về không gian làm việc
      </Link>
    </div>
  );
}
