"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Menu, X, ChevronDown, ArrowUpRight } from "lucide-react";
import { linkUrl, type NavigationMenu, type SiteRender, type MenuItem } from "./contracts";
export function PublicNavigation({ data }: { data: SiteRender<NavigationMenu> }) {
  const [open, setOpen] = useState(false),
    nav = useRef<HTMLElement>(null);
  function close() {
    setOpen(false);
    nav.current?.querySelectorAll("details").forEach((d) => (d.open = false));
  }
  function itemLink(item: MenuItem) {
    const href = linkUrl(item.link, data.urls);
    return href ? (
      <Link
        href={href}
        onClick={close}
        {...(item.link.kind === "EXTERNAL" ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {item.label}
        {item.link.kind === "EXTERNAL" && <ArrowUpRight size={14} />}
      </Link>
    ) : (
      <span>{item.label}</span>
    );
  }
  return (
    <>
      <button
        className="icon-button public-menu-toggle"
        aria-label={
          open
            ? data.locale === "en"
              ? "Close navigation"
              : "Đóng điều hướng"
            : data.locale === "en"
              ? "Open navigation"
              : "Mở điều hướng"
        }
        aria-expanded={open}
        aria-controls="public-navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
      <nav
        ref={nav}
        id="public-navigation"
        aria-label={data.locale === "en" ? "Main navigation" : "Điều hướng chính"}
        className={"cms-navigation" + (open ? " is-open" : "")}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            const d = (e.target as HTMLElement).closest("details");
            if (d) {
              d.open = false;
              d.querySelector("summary")?.focus();
            } else close();
          }
        }}
      >
        {data.content.items.map((item) =>
          item.children.length ? (
            <details
              key={item.id}
              className="nav-group"
              onToggle={(e) => {
                if (e.currentTarget.open)
                  nav.current?.querySelectorAll("details").forEach((d) => {
                    if (d !== e.currentTarget) d.open = false;
                  });
              }}
            >
              <summary>
                {item.label}
                <ChevronDown size={15} />
              </summary>
              <div className="nav-dropdown">
                {linkUrl(item.link, data.urls) && (
                  <div className="nav-overview">{itemLink(item)}</div>
                )}
                {item.children.map((child) => (
                  <div key={child.id}>{itemLink(child)}</div>
                ))}
              </div>
            </details>
          ) : (
            <div key={item.id} className="nav-leaf">
              {itemLink(item)}
            </div>
          ),
        )}
      </nav>
    </>
  );
}
