import { Mail } from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { LanguageSwitch } from "./language-switch";
import { PublicNavigation } from "@/features/site/public-navigation";
import type { NavigationMenu, SiteRender } from "@/features/site/contracts";

export function HeaderContent({ data }: { data: SiteRender<NavigationMenu> }) {
  const isVi = data.locale === "vi";
  return (
    <header className="public-header">
      <div className="container header-inner">
        <Brand locale={data.locale} />
        <div className="header-utilities">
          <Link className="header-contact-link" href={`/${data.locale}#lien-he`}>
            <Mail size={17} aria-hidden="true" />
            {isVi ? "Liên hệ bộ môn" : "Contact us"}
          </Link>
          <LanguageSwitch locale={data.locale} />
        </div>
        <PublicNavigation data={data} />
      </div>
    </header>
  );
}
