"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X, ChevronDown, ArrowUpRight, ArrowRight } from "lucide-react";
import { LanguageSwitch } from "@/components/language-switch";
import { linkUrl, type NavigationMenu, type SiteRender, type MenuItem } from "./contracts";

const mobileQuery = "(max-width: 900px)";
const hoverQuery = "(min-width: 901px) and (hover: hover) and (pointer: fine)";

function positionDropdown(group: HTMLDetailsElement) {
  const panel = group.querySelector<HTMLElement>(".nav-dropdown");
  const container = group.closest(".header-inner");
  if (!panel || !container || window.matchMedia(mobileQuery).matches) return;
  const bounds = container.getBoundingClientRect();
  const anchor = group.getBoundingClientRect();
  const left = Math.max(bounds.left, Math.min(anchor.left, bounds.right - panel.offsetWidth));
  group.style.setProperty("--nav-dropdown-left", `${left - anchor.left}px`);
}

export function PublicNavigation({ data }: { data: SiteRender<NavigationMenu> }) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams?.toString() ?? "";
  const restoreToggleFocus = useRef(false);
  const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverOpened = useRef<HTMLDetailsElement | null>(null);
  const isVi = data.locale === "vi";

  function cancelHoverOpen() {
    if (hoverOpenTimer.current) clearTimeout(hoverOpenTimer.current);
    hoverOpenTimer.current = null;
  }
  function cancelHoverClose() {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    hoverCloseTimer.current = null;
  }
  function closeGroups() {
    cancelHoverOpen();
    cancelHoverClose();
    hoverOpened.current = null;
    nav.current?.querySelectorAll("details").forEach((group) => (group.open = false));
  }
  function openOnHover(group: HTMLDetailsElement) {
    cancelHoverOpen();
    cancelHoverClose();
    if (group.open) return;
    hoverOpenTimer.current = setTimeout(() => {
      hoverOpenTimer.current = null;
      if (!group.isConnected || !group.matches(":hover")) return;
      hoverOpened.current = group;
      group.open = true;
      positionDropdown(group);
    }, 100);
  }
  function closeAfterHover() {
    cancelHoverOpen();
    cancelHoverClose();
    hoverCloseTimer.current = setTimeout(() => {
      hoverCloseTimer.current = null;
      // Keyboard users may still be reading a dropdown after the mouse moves away.
      if (!nav.current?.querySelector(":focus-visible")) closeGroups();
    }, 260);
  }
  function close(restoreFocus = false) {
    restoreToggleFocus.current = restoreFocus;
    setOpen(false);
    closeGroups();
  }

  useEffect(() => {
    const media = window.matchMedia(mobileQuery);
    const update = () => {
      setMobile(media.matches);
      setOpen(false);
      closeGroups();
    };
    update();
    media.addEventListener("change", update);
    const root = document.documentElement;
    const previousHeaderHeight = root.style.getPropertyValue("--public-header-height");
    const header = surface.current?.closest(".public-header");
    const observer = new ResizeObserver(() => {
      if (header)
        root.style.setProperty(
          "--public-header-height",
          `${header.getBoundingClientRect().height}px`,
        );
    });
    if (header) observer.observe(header);
    const resize = () =>
      nav.current
        ?.querySelectorAll("details[open]")
        .forEach((group) => positionDropdown(group as HTMLDetailsElement));
    window.addEventListener("resize", resize);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("resize", resize);
      observer.disconnect();
      cancelHoverOpen();
      cancelHoverClose();
      if (previousHeaderHeight)
        root.style.setProperty("--public-header-height", previousHeaderHeight);
      else root.style.removeProperty("--public-header-height");
    };
  }, []);

  useEffect(() => {
    setOpen(false);
    closeGroups();
  }, [pathname, query]);

  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (!surface.current?.contains(event.target as Node)) closeGroups();
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);

  useEffect(() => {
    if (!mobile || !open || !surface.current) return;
    // Keep the dialog usable while removing the background from keyboard and screen-reader navigation.
    const background: [HTMLElement, boolean][] = [];
    let branch: HTMLElement = surface.current;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (
          sibling instanceof HTMLElement &&
          sibling !== branch &&
          !sibling.classList.contains("public-menu-backdrop") &&
          !["SCRIPT", "STYLE"].includes(sibling.tagName)
        ) {
          background.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      background.forEach(([element, inert]) => (element.inert = inert));
      if (restoreToggleFocus.current) {
        toggle.current?.focus({ preventScroll: true });
        restoreToggleFocus.current = false;
      }
    };
  }, [mobile, open]);

  function exactPath(item: MenuItem) {
    const href = linkUrl(item.link, data.urls);
    if (!href?.startsWith("/") || href.startsWith("//") || href.includes("#")) return false;
    const target = new URL(href, "https://lrd.invalid");
    return (
      target.pathname === pathname &&
      [...target.searchParams].every(([key, value]) => searchParams?.get(key) === value)
    );
  }
  const queryMatch = (item: MenuItem) =>
    linkUrl(item.link, data.urls)?.includes("?") && exactPath(item);
  const active =
    data.content.items.find((item) => queryMatch(item) || item.children.some(queryMatch)) ??
    data.content.items.find((item) => item.children.some(exactPath)) ??
    data.content.items.find(exactPath) ??
    data.content.items
      .filter((item) => {
        const href = linkUrl(item.link, data.urls);
        return (
          href &&
          !/[?#]/.test(href) &&
          href !== `/${data.locale}` &&
          pathname?.startsWith(href + "/")
        );
      })
      .sort(
        (a, b) =>
          (linkUrl(b.link, data.urls)?.length ?? 0) - (linkUrl(a.link, data.urls)?.length ?? 0),
      )[0];

  function itemLink(item: MenuItem, overview = false) {
    const href = linkUrl(item.link, data.urls);
    return href ? (
      <Link
        href={href}
        onClick={() => close()}
        aria-current={exactPath(item) ? "page" : undefined}
        {...(item.link.kind === "EXTERNAL" ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        <span>{item.label}</span>
        {item.link.kind === "EXTERNAL" ? (
          <ArrowUpRight size={16} aria-hidden="true" />
        ) : (
          <ArrowRight
            className={overview ? "nav-overview-arrow" : "nav-item-arrow"}
            size={16}
            aria-hidden="true"
          />
        )}
      </Link>
    ) : (
      <span className="nav-unavailable">{item.label}</span>
    );
  }

  return (
    <>
      <button
        ref={toggle}
        type="button"
        className="icon-button public-menu-toggle"
        aria-label={
          open
            ? isVi
              ? "Đóng điều hướng"
              : "Close navigation"
            : isVi
              ? "Mở điều hướng"
              : "Open navigation"
        }
        aria-expanded={open}
        aria-controls="public-navigation-surface"
        onClick={() => setOpen(!open)}
      >
        <Menu size={22} aria-hidden="true" />
      </button>
      {open && mobile && (
        <button
          type="button"
          className="public-menu-backdrop"
          aria-label={isVi ? "Đóng menu điều hướng" : "Dismiss navigation"}
          tabIndex={-1}
          onClick={() => close(true)}
        />
      )}
      <div
        ref={surface}
        id="public-navigation-surface"
        className={"public-navigation-surface" + (open ? " is-open" : "")}
        role={mobile && open ? "dialog" : undefined}
        aria-modal={mobile && open ? true : undefined}
        aria-label={mobile && open ? (isVi ? "Menu điều hướng" : "Navigation menu") : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            if (mobile) close(true);
            else {
              const group = (event.target as HTMLElement).closest("details");
              if (group) {
                cancelHoverOpen();
                cancelHoverClose();
                hoverOpened.current = null;
                group.open = false;
                group.querySelector("summary")?.focus({ preventScroll: true });
              }
            }
          }
          if (event.key === "Tab" && mobile && open) {
            const controls = [
              ...(surface.current?.querySelectorAll<HTMLElement>(
                "a[href], button:not(:disabled), summary",
              ) ?? []),
            ].filter((element) => element.getClientRects().length > 0);
            const first = controls[0],
              last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus({ preventScroll: true });
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus({ preventScroll: true });
            }
          }
        }}
      >
        <div className="nav-mobile-heading">
          <div>
            <span>{isVi ? "ĐẠI HỌC CẦN THƠ" : "CAN THO UNIVERSITY"}</span>
            <strong>{isVi ? "Tài nguyên Đất đai" : "Land Resources"}</strong>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="nav-mobile-close"
            aria-label={isVi ? "Đóng điều hướng" : "Close navigation"}
            onClick={() => close(true)}
          >
            <X size={23} aria-hidden="true" />
          </button>
        </div>
        <nav
          ref={nav}
          id="public-navigation"
          aria-label={isVi ? "Điều hướng chính" : "Main navigation"}
          className={"cms-navigation" + (open ? " is-open" : "")}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse" && window.matchMedia(hoverQuery).matches)
              cancelHoverClose();
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse" && window.matchMedia(hoverQuery).matches)
              closeAfterHover();
          }}
        >
          {data.content.items.map((item) =>
            item.children.length ? (
              <details
                key={item.id}
                className="nav-group"
                data-active={active?.id === item.id || undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && window.matchMedia(hoverQuery).matches)
                    openOnHover(event.currentTarget);
                }}
                onToggle={(event) => {
                  if (!event.currentTarget.open) return;
                  positionDropdown(event.currentTarget);
                  nav.current?.querySelectorAll("details").forEach((group) => {
                    if (group !== event.currentTarget) group.open = false;
                  });
                }}
                onBlur={(event) => {
                  if (
                    !window.matchMedia(mobileQuery).matches &&
                    !event.currentTarget.contains(event.relatedTarget as Node | null)
                  ) {
                    cancelHoverOpen();
                    if (hoverOpened.current === event.currentTarget) hoverOpened.current = null;
                    event.currentTarget.open = false;
                  }
                }}
              >
                <summary
                  onClick={(event) => {
                    cancelHoverOpen();
                    cancelHoverClose();
                    const group = event.currentTarget.parentElement as HTMLDetailsElement;
                    // The first click after a hover keeps the panel open; a second click can close it.
                    if (event.detail > 0 && hoverOpened.current === group && group.open)
                      event.preventDefault();
                    hoverOpened.current = null;
                  }}
                >
                  {item.label}
                  <ChevronDown size={15} aria-hidden="true" />
                </summary>
                <div className="nav-dropdown">
                  {linkUrl(item.link, data.urls) && (
                    <div className="nav-overview">{itemLink(item, true)}</div>
                  )}
                  <ul>
                    {item.children.map((child) => (
                      <li key={child.id}>{itemLink(child)}</li>
                    ))}
                  </ul>
                </div>
              </details>
            ) : (
              <div
                key={item.id}
                className="nav-leaf"
                data-active={active?.id === item.id || undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && window.matchMedia(hoverQuery).matches)
                    closeAfterHover();
                }}
              >
                {itemLink(item)}
              </div>
            ),
          )}
        </nav>
        <div className="nav-mobile-utilities">
          <Link href={`/${data.locale}#lien-he`} onClick={() => close()}>
            {isVi ? "Liên hệ bộ môn" : "Contact us"}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
          <LanguageSwitch locale={data.locale} />
        </div>
      </div>
    </>
  );
}
