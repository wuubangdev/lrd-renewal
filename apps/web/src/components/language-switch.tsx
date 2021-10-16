"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";

export function LanguageSwitch({ locale }: { locale: string }) {
  const pathname = usePathname();
  const next = locale === "vi" ? "en" : "vi";
  const suffix = pathname?.replace(/^\/(vi|en)(?=\/|$)/, "") || "";
  return (
    <Link
      className="language-switch"
      href={`/${next}${suffix}`}
      hrefLang={next}
      lang={next}
      aria-label={locale === "vi" ? "Switch to English" : "Chuyển sang tiếng Việt"}
      title={locale === "vi" ? "English" : "Tiếng Việt"}
    >
      <Languages size={16} aria-hidden="true" />
      <span>{next.toUpperCase()}</span>
    </Link>
  );
}
