import Link from "next/link";
export function Brand({ compact = false, locale = "vi" }: { compact?: boolean; locale?: string }) {
  return (
    <Link
      href={compact ? "/admin/content" : "/" + locale}
      className="brand"
      aria-label="Bộ môn Tài nguyên Đất đai"
    >
      <span className="logo-mark">
        <img src="/images/ctu-logo.png" alt="" width="260" height="64" />
      </span>
      <span>
        <small>ĐẠI HỌC CẦN THƠ</small>
        <strong>{compact ? "LRD · Quản trị" : "Tài nguyên Đất đai"}</strong>
      </span>
    </Link>
  );
}
