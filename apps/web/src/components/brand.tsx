import Link from "next/link";
export function Brand({ compact = false, locale = "vi" }: { compact?: boolean; locale?: string }) {
  const isVi = locale === "vi";
  return (
    <Link
      href={compact ? "/admin/content" : "/" + locale}
      className="brand"
      aria-label={isVi ? "Bộ môn Tài nguyên Đất đai" : "Land Resources Department"}
    >
      <span className="logo-mark">
        <img src="/images/ctu-logo.png" alt="" width="260" height="64" />
      </span>
      <span>
        <small>{isVi ? "ĐẠI HỌC CẦN THƠ" : "CAN THO UNIVERSITY"}</small>
        <strong>
          {compact ? "LRD · Quản trị" : isVi ? "Tài nguyên Đất đai" : "Land Resources"}
        </strong>
      </span>
    </Link>
  );
}
