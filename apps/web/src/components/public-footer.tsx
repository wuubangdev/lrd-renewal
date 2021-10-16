import Link from "next/link";
import { ArrowUpRight, LockKeyhole, Mail, MapPin } from "lucide-react";
import type { HomeComposition } from "@/features/site/contracts";

export function FooterContent({
  locale,
  footer,
}: {
  locale: string;
  footer: HomeComposition["footer"];
}) {
  const isVi = locale === "vi";
  const groups = [
    {
      title: isVi ? "Học tập & nghiên cứu" : "Study & research",
      links: [
        { href: `/${locale}/dao-tao`, label: isVi ? "Chương trình đào tạo" : "Academic programs" },
        { href: `/${locale}/tuyen-sinh`, label: isVi ? "Thông tin tuyển sinh" : "Admissions" },
        { href: `/${locale}/nghien-cuu`, label: isVi ? "Nghiên cứu khoa học" : "Research" },
        {
          href: `/${locale}/hoi-thao`,
          label: isVi ? "Hội thảo & sự kiện" : "Conferences & events",
        },
      ],
    },
    {
      title: isVi ? "Về bộ môn" : "Our department",
      links: [
        { href: `/${locale}#gioi-thieu`, label: isVi ? "Giới thiệu chung" : "About us" },
        { href: `/${locale}/can-bo`, label: isVi ? "Đội ngũ cán bộ" : "Our faculty" },
        { href: `/${locale}/phong-thi-nghiem`, label: isVi ? "Cơ sở vật chất" : "Our facilities" },
        { href: `/${locale}/tin-tuc`, label: isVi ? "Tin tức & hoạt động" : "News & activities" },
      ],
    },
  ];

  return (
    <footer className="public-footer" id="lien-he">
      <div className="container">
        <div className="footer-main">
          <div className="footer-identity">
            <Link
              href={`/${locale}`}
              className="footer-brand"
              aria-label={
                isVi ? "Về trang chủ Bộ môn Tài nguyên Đất đai" : "Land Resources Department home"
              }
            >
              <span className="footer-seal">
                <img src="/images/ctu-logo.png" alt="" width="52" height="52" />
              </span>
              <span>
                <small>{isVi ? "ĐẠI HỌC CẦN THƠ" : "CAN THO UNIVERSITY"}</small>
                <strong>{isVi ? "Tài nguyên Đất đai" : "Land Resources"}</strong>
              </span>
            </Link>
            {footer.description && <p className="preserve-lines">{footer.description}</p>}
            <a
              className="footer-university"
              href="https://www.ctu.edu.vn/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {isVi ? "Website Đại học Cần Thơ" : "Can Tho University website"}
              <ArrowUpRight size={16} aria-hidden="true" />
              <span className="sr-only">
                {isVi ? " (mở trong tab mới)" : " (opens in a new tab)"}
              </span>
            </a>
          </div>
          {groups.map((group) => (
            <nav className="footer-navigation" aria-label={group.title} key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div className="footer-contact">
            <h2>{isVi ? "Liên hệ bộ môn" : "Get in touch"}</h2>
            <address>
              {footer.address && (
                <div className="footer-contact-item">
                  <MapPin size={19} aria-hidden="true" />
                  <div>
                    <span className="footer-contact-label">{isVi ? "Địa chỉ" : "Visit us"}</span>
                    <p className="preserve-lines">{footer.address}</p>
                  </div>
                </div>
              )}
              {footer.email && (
                <div className="footer-contact-item">
                  <Mail size={19} aria-hidden="true" />
                  <div>
                    <span className="footer-contact-label">Email</span>
                    <a className="footer-email" href={`mailto:${footer.email}`}>
                      <span>{footer.email}</span>
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </a>
                  </div>
                </div>
              )}
            </address>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()}{" "}
            {isVi ? "Bộ môn Tài nguyên Đất đai" : "Land Resources Department"}
          </span>
          <Link href="/admin/content">
            <LockKeyhole size={14} aria-hidden="true" />
            {isVi ? "Cổng quản trị" : "Staff portal"}
          </Link>
        </div>
      </div>
    </footer>
  );
}
