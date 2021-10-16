import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import "./public-design.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Bộ môn Tài nguyên Đất đai · Đại học Cần Thơ",
    template: "%s | Tài nguyên Đất đai · CTU",
  },
  description:
    "Đào tạo, nghiên cứu và kết nối tri thức trong lĩnh vực tài nguyên đất đai, quản lý đất đai và quy hoạch vùng và đô thị.",
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await headers()).get("x-lrd-locale") === "en" ? "en" : "vi";
  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main">
          {locale === "en" ? "Skip to main content" : "Đến nội dung chính"}
        </a>
        {children}
      </body>
    </html>
  );
}
