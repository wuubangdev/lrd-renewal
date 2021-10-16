"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  ImageIcon,
  ArrowUpRight,
  LogOut,
  Menu,
  X,
  Users,
  ShieldCheck,
  LockKeyhole,
  House,
  PanelsTopLeft,
  GraduationCap,
  CalendarDays,
  Settings2,
  Tags,
  UserRound,
  FlaskConical,
  BookOpenText,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/contracts";
import { api } from "@/lib/browser-api";
import { Brand } from "./brand";
import { UnsavedChangesProvider, useConfirmNavigation } from "./unsaved-changes";

const navigation = [
  {
    title: "Nội dung",
    items: [
      { href: "/admin/content", label: "Bài viết", Icon: FileText, permission: "content:create" },
      {
        href: "/admin/editorial?kind=EVENT",
        label: "Hội thảo",
        Icon: CalendarDays,
        permission: "editorial:manage",
      },
      {
        href: "/admin/editorial?kind=NEWS",
        label: "Tin tức",
        Icon: FileText,
        permission: "editorial:manage",
      },
      {
        href: "/admin/editorial?kind=JOB",
        label: "Tuyển dụng",
        Icon: Users,
        permission: "editorial:manage",
      },
      {
        href: "/admin/research",
        label: "Nghiên cứu & học liệu",
        Icon: BookOpenText,
        permission: "research:manage",
      },
      { href: "/admin/categories", label: "Chuyên mục", Icon: Tags, permission: "site:manage" },
      { href: "/admin/staff", label: "Cán bộ", Icon: UserRound, permission: "directory:manage" },
      {
        href: "/admin/laboratories",
        label: "Phòng thí nghiệm",
        Icon: FlaskConical,
        permission: "directory:manage",
      },
      { href: "/admin/media", label: "Thư viện ảnh", Icon: ImageIcon, permission: "media:upload" },
      {
        href: "/admin/programs",
        label: "Chương trình đào tạo",
        Icon: GraduationCap,
        permission: "academics:manage",
      },
      {
        href: "/admin/admissions",
        label: "Tuyển sinh",
        Icon: CalendarDays,
        permission: "academics:manage",
      },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/site/home", label: "Trang chủ", Icon: House, permission: "site:manage" },
      {
        href: "/admin/site/menu",
        label: "Menu điều hướng",
        Icon: PanelsTopLeft,
        permission: "site:manage",
      },
    ],
  },
  {
    title: "Hệ thống",
    items: [
      { href: "/admin/users", label: "Tài khoản", Icon: Users, permission: "identity:manage" },
      {
        href: "/admin/roles",
        label: "Phân quyền",
        Icon: ShieldCheck,
        permission: "identity:manage",
      },
      { href: "/admin/security", label: "Bảo mật", Icon: LockKeyhole, permission: null },
      {
        href: "/admin/integrations",
        label: "Tích hợp",
        Icon: Settings2,
        permission: "integrations:manage",
      },
    ],
  },
];

export function AdminShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  return (
    <UnsavedChangesProvider>
      <AdminWorkspace user={user}>{children}</AdminWorkspace>
    </UnsavedChangesProvider>
  );
}

function AdminWorkspace({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const confirmNavigation = useConfirmNavigation();
  const pathname = usePathname(),
    router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<{ label: string; left: number; top: number } | null>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);
  useEffect(() => {
    const saveShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== "s")
        return;
      const saveButton = document.querySelector<HTMLButtonElement>(
        ".admin-main button[data-admin-save]",
      );
      if (!saveButton) return;
      event.preventDefault();
      if (!saveButton.disabled) saveButton.click();
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, []);
  async function logout() {
    if (!confirmNavigation()) return;
    try {
      await api("/auth/logout", { method: "POST" });
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("Chưa thể đăng xuất. Vui lòng thử lại.");
    }
  }
  function showActionTooltip(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>("button[aria-label]");
    if (!button || (!button.classList.contains("icon-button") && button.textContent?.trim())) {
      setTooltip(null);
      return;
    }
    const bounds = button.getBoundingClientRect();
    setTooltip({
      label: button.getAttribute("aria-label") || "",
      left: Math.min(window.innerWidth - 130, Math.max(130, bounds.left + bounds.width / 2)),
      top: bounds.bottom + 48 < window.innerHeight ? bounds.bottom + 8 : bounds.top - 38,
    });
  }
  return (
    <div
      className="admin-shell"
      onMouseOver={(event) => showActionTooltip(event.target)}
      onMouseOut={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setTooltip(null);
        else if (event.target instanceof Element) {
          const button = event.target.closest("button[aria-label]");
          if (button && !button.contains(event.relatedTarget)) setTooltip(null);
        }
      }}
      onFocusCapture={(event) => showActionTooltip(event.target)}
      onBlurCapture={() => setTooltip(null)}
    >
      {tooltip && (
        <span
          className="admin-action-tooltip"
          style={{ left: tooltip.left, top: tooltip.top }}
          aria-hidden="true"
        >
          {tooltip.label}
        </span>
      )}
      <div className="mobile-admin-bar">
        <Brand compact />
        <button
          ref={menuButton}
          className="icon-button"
          aria-label={open ? "Đóng menu" : "Mở menu"}
          aria-expanded={open}
          aria-controls="admin-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <button
          className="admin-nav-backdrop"
          aria-label="Đóng menu quản trị"
          onClick={() => setOpen(false)}
        />
      )}
      <aside id="admin-navigation" className={"admin-sidebar" + (open ? " open" : "")}>
        <Brand compact />
        <nav aria-label="Điều hướng quản trị">
          {navigation.map((group) => {
            const items = group.items.filter(
              (item) => !item.permission || user.permissions.includes(item.permission),
            );
            if (!items.length) return null;
            return (
              <div className="admin-nav-group" key={group.title}>
                <p className="admin-nav-label">{group.title}</p>
                {items.map(({ href, label, Icon }) => {
                  const active = href.includes("?")
                    ? pathname === href.split("?")[0] &&
                      searchParams.get("kind") === href.split("kind=")[1]
                    : pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      className={active ? "active" : ""}
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/vi" target="_blank">
            Xem website <ArrowUpRight size={18} />
          </Link>
          <div className="account">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={17} />
            Đăng xuất
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      </aside>
      <main id="main" className="admin-main">
        {children}
      </main>
    </div>
  );
}
