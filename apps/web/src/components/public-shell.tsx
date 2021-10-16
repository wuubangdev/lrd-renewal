import Link from "next/link";
import { ArrowUpRight, MapPin, Mail, ArrowRight } from "lucide-react";
import { Brand } from "./brand";
import { optionalPublicHome, publicMenu } from "@/features/site/server";
import { PublicNavigation } from "@/features/site/public-navigation";
import { LanguageSwitch } from "./language-switch";
export async function PublicHeader({ locale = "vi" }: { locale?: string }) {
  const menu = await publicMenu(locale);
  return (
    <header className="public-header">
      <div className="container header-inner">
        <Brand locale={locale} />
        <PublicNavigation data={menu} />
        <LanguageSwitch locale={locale} />
      </div>
    </header>
  );
}
export async function PublicFooter({ locale = "vi" }: { locale?: string }) {
  const home = await optionalPublicHome(locale);
  const isVi = locale === "vi";
  const footer = home?.content.footer ?? {
    description:
      "Land Resources Department · College of Environment and Natural Resources · Can Tho University.",
    address: "Campus II, 3/2 Street, Ninh Kieu Ward, Can Tho City",
    email: "ptvu@ctu.edu.vn",
  };
  const links = [
    { href: `/${locale}/dao-tao`, label: isVi ? "Chương trình đào tạo" : "Academic programs" },
    { href: `/${locale}/tuyen-sinh`, label: isVi ? "Tuyển sinh" : "Admissions" },
    { href: `/${locale}/nghien-cuu`, label: isVi ? "Nghiên cứu" : "Research" },
    { href: `/${locale}/can-bo`, label: isVi ? "Đội ngũ cán bộ" : "Faculty" },
    { href: `/${locale}/tin-tuc`, label: isVi ? "Tin & cơ hội" : "News & opportunities" },
  ];
  return (
    <footer className="public-footer" id="lien-he">
      <div className="container">
        <div className="footer-cta">
          <div>
            <p className="footer-kicker">
              {isVi ? "HỌC TẬP · NGHIÊN CỨU · KẾT NỐI" : "LEARN · RESEARCH · CONNECT"}
            </p>
            <h2>
              {isVi ? "Bắt đầu từ tri thức về đất đai." : "Start with knowledge of land resources."}
            </h2>
          </div>
          <div className="footer-cta-actions">
            <Link className="footer-primary-link" href={`/${locale}/dao-tao`}>
              {isVi ? "Khám phá chương trình" : "Explore programs"}
              <ArrowUpRight size={19} aria-hidden="true" />
            </Link>
            <a className="footer-secondary-link" href={`mailto:${footer.email}`}>
              {isVi ? "Liên hệ bộ môn" : "Contact the department"}
              <ArrowRight size={17} aria-hidden="true" />
            </a>
          </div>
        </div>
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
            <p className="preserve-lines">{footer.description}</p>
            <a
              className="footer-university"
              href="https://www.ctu.edu.vn/"
              target="_blank"
              rel="noreferrer"
            >
              {isVi ? "Đại học Cần Thơ" : "Can Tho University"}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          </div>
          <nav
            className="footer-navigation"
            aria-label={isVi ? "Điều hướng cuối trang" : "Footer navigation"}
          >
            <h3>{isVi ? "Khám phá" : "Explore"}</h3>
            <div>
              {links.map((link) => (
                <Link href={link.href} key={link.href}>
                  {link.label}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </nav>
          <div className="footer-contact">
            <h3>{isVi ? "Liên hệ" : "Contact"}</h3>
            <address>
              <div>
                <MapPin size={18} aria-hidden="true" />
                <span>{footer.address}</span>
              </div>
              <a href={`mailto:${footer.email}`}>
                <Mail size={18} aria-hidden="true" />
                <span>{footer.email}</span>
              </a>
            </address>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()}{" "}
            {isVi ? "Bộ môn Tài nguyên Đất đai" : "Land Resources Department"}
          </span>
          <div>
            <span>
              {isVi
                ? "Khoa Môi trường và Tài nguyên thiên nhiên"
                : "College of Environment and Natural Resources"}
            </span>
            <Link href="/admin/content">{isVi ? "Quản trị" : "Admin"}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
