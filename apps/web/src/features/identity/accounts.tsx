"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Pencil, KeyRound, ShieldCheck, LogOut } from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import type { PageResult } from "@/lib/contracts";
import { dateLabel } from "@/lib/contracts";
import { Dialog } from "@/components/dialog";
import { roleLabels, type Account, type Role, type ResetLink } from "./contracts";

export function Accounts({
  initial,
  currentId,
}: {
  initial: PageResult<Account>;
  currentId: string;
}) {
  const router = useRouter();
  const [result, setResult] = useState(initial),
    [query, setQuery] = useState(""),
    [loadedQuery, setLoadedQuery] = useState("");
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [reset, setReset] = useState<{ name: string; link: string; expiresAt: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<{ account: Account; action: "reset" | "revoke" } | null>(
    null,
  );
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  async function load(page = 0, q = query) {
    const data = await api<PageResult<Account>>(
      "/admin/users?q=" + encodeURIComponent(q) + "&page=" + page + "&size=20",
    );
    setResult(data);
    setLoadedQuery(q);
  }
  function showLink(name: string, value: ResetLink) {
    setReset({
      name,
      link:
        window.location.origin + "/admin/reset-password#token=" + encodeURIComponent(value.token),
      expiresAt: value.expiresAt,
    });
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    setNotice("");
    const data = new FormData(event.currentTarget);
    const body = {
      name: data.get("name"),
      email: data.get("email"),
      role: data.get("role"),
      active: data.get("active") === "on",
    };
    try {
      if (editing === "new") {
        const invitation = await api<{ account: Account; reset: ResetLink }>("/admin/users", {
          method: "POST",
          body: JSON.stringify(body),
        });
        showLink(invitation.account.name, invitation.reset);
      } else {
        await api<Account>("/admin/users/" + editing.id, {
          method: "PATCH",
          headers: matchVersion(editing.version),
          body: JSON.stringify(body),
        });
        if (editing.id === currentId) {
          router.replace("/admin/login");
          router.refresh();
          return;
        }
        setNotice("Đã lưu tài khoản và thu hồi các phiên đăng nhập cũ.");
      }
      setEditing(null);
      await load(result.page, loadedQuery);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chưa thể lưu tài khoản.");
    } finally {
      setBusy(false);
    }
  }
  async function action() {
    if (!confirm) return;
    setBusy(true);
    setError("");
    setNotice("");
    const { account, action } = confirm;
    try {
      if (action === "reset")
        showLink(
          account.name,
          await api<ResetLink>("/admin/users/" + account.id + "/reset-links", {
            method: "POST",
            headers: matchVersion(account.version),
          }),
        );
      else {
        await api("/admin/users/" + account.id + "/revoke-sessions", {
          method: "POST",
          headers: matchVersion(account.version),
        });
        if (account.id === currentId) {
          router.replace("/admin/login");
          router.refresh();
          return;
        }
        setNotice("Đã đăng xuất tài khoản khỏi mọi thiết bị.");
      }
      setConfirm(null);
      await load(result.page, loadedQuery);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Thao tác chưa thành công.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="admin-topbar">
        <span>Hệ thống / Tài khoản</span>
        <span>Quản trị truy cập</span>
      </div>
      <div className="admin-content" inert={!ready}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">CON NGƯỜI & QUYỀN TRUY CẬP</p>
            <h1>Tài khoản</h1>
            <p className="muted">{result.total} tài khoản · cấp quyền theo trách nhiệm biên tập.</p>
          </div>
          <button
            className="button primary"
            onClick={() => {
              setError("");
              setEditing("new");
            }}
          >
            <Plus size={18} />
            Thêm tài khoản
          </button>
        </div>
        {!editing && !confirm && error && (
          <p className="alert error" role="alert">
            {error}{" "}
            <button
              className="text-link"
              onClick={() => load(result.page, loadedQuery).catch((e) => setError(e.message))}
            >
              Tải lại danh sách
            </button>
          </p>
        )}
        {notice && (
          <p className="alert success" role="status">
            {notice}
          </p>
        )}
        <form
          className="manage-search"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await load();
              setError("");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="search-input">
            <Search size={18} />
            <span className="sr-only">Tìm tài khoản</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên hoặc email…"
              maxLength={200}
            />
          </label>
          <button className="button secondary" disabled={busy}>
            Tìm kiếm
          </button>
        </form>
        <div className="table-panel">
          <div className="table-scroll">
            <table className="content-table accounts-table">
              <thead>
                <tr>
                  <th>Tài khoản</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>
                        {a.name}
                        {a.id === currentId ? " (bạn)" : ""}
                      </strong>
                      <small>{a.email}</small>
                    </td>
                    <td>
                      <span className="role-name">
                        <ShieldCheck size={15} />
                        {roleLabels[a.role]}
                      </span>
                    </td>
                    <td>
                      <span
                        className={"badge " + (a.active && a.passwordSet ? "published" : "draft")}
                      >
                        {!a.active ? "Đã khóa" : a.passwordSet ? "Hoạt động" : "Chờ đặt mật khẩu"}
                      </span>
                    </td>
                    <td>{dateLabel(a.createdAt)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={"Sửa " + a.email}
                          onClick={() => {
                            setError("");
                            setEditing(a);
                          }}
                        >
                          <Pencil size={17} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={!a.active}
                          aria-label={"Reset mật khẩu " + a.email}
                          onClick={() => {
                            setError("");
                            setConfirm({ account: a, action: "reset" });
                          }}
                        >
                          <KeyRound size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={"Thu hồi phiên " + a.email}
                          onClick={() => {
                            setError("");
                            setConfirm({ account: a, action: "revoke" });
                          }}
                        >
                          <LogOut size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.items.length && <p className="empty-message">Không có tài khoản phù hợp.</p>}
          <div className="manage-pagination">
            <span>
              Trang {result.page + 1} / {Math.max(1, Math.ceil(result.total / result.size))}
            </span>
            <div className="row-actions">
              <button
                className="button secondary"
                disabled={busy || result.page === 0}
                onClick={() => load(result.page - 1, loadedQuery).catch((e) => setError(e.message))}
              >
                Trước
              </button>
              <button
                className="button secondary"
                disabled={busy || (result.page + 1) * result.size >= result.total}
                onClick={() => load(result.page + 1, loadedQuery).catch((e) => setError(e.message))}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </div>
      {editing && (
        <Dialog
          title={editing === "new" ? "Thêm tài khoản" : "Chỉnh sửa tài khoản"}
          onClose={() => !busy && setEditing(null)}
        >
          <form method="post" className="manage-form" onSubmit={save}>
            <label>
              Họ và tên
              <input
                name="name"
                defaultValue={editing === "new" ? "" : editing.name}
                required
                maxLength={120}
                autoComplete="off"
              />
            </label>
            <label>
              Email
              <input
                name="email"
                type="email"
                defaultValue={editing === "new" ? "" : editing.email}
                required
                maxLength={254}
                autoComplete="off"
              />
            </label>
            <label>
              Vai trò
              <select name="role" defaultValue={editing === "new" ? "AUTHOR" : editing.role}>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <p className="field-hint">
              Tác giả quản lý bài của mình. Biên tập viên quản lý mọi bài và ảnh. Quản trị viên có
              thêm quyền tài khoản, trang chủ và menu.
            </p>
            {editing !== "new" && (
              <label className="check-label">
                <input type="checkbox" name="active" defaultChecked={editing.active} />
                Cho phép đăng nhập
              </label>
            )}
            <p className="field-hint">
              {editing === "new"
                ? "Sau khi tạo, bạn nhận liên kết để người dùng tự đặt mật khẩu."
                : editing.id === currentId
                  ? "Sửa tài khoản của bạn sẽ đăng xuất phiên hiện tại."
                  : "Lưu thay đổi sẽ thu hồi phiên và vô hiệu hóa liên kết reset cũ."}
            </p>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                Hủy
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Đang lưu…" : editing === "new" ? "Tạo tài khoản" : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title={
            confirm.action === "reset" ? "Cấp liên kết đặt mật khẩu" : "Thu hồi mọi phiên đăng nhập"
          }
          onClose={() => !busy && setConfirm(null)}
        >
          <div className="manage-form">
            <p>
              <strong>{confirm.account.name}</strong>
              <br />
              {confirm.account.email}
            </p>
            <p>
              {confirm.action === "reset"
                ? "Liên kết mới có hiệu lực 30 phút và thay thế liên kết cũ. Mật khẩu hiện tại vẫn dùng được cho đến khi reset hoàn tất."
                : "Người dùng sẽ phải đăng nhập lại trên tất cả thiết bị. Các liên kết reset cũ cũng bị vô hiệu hóa."}
            </p>
            {error && (
              <p className="alert error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button className="button secondary" disabled={busy} onClick={() => setConfirm(null)}>
                Hủy
              </button>
              <button className="button primary" disabled={busy} onClick={action}>
                {busy ? "Đang xử lý…" : "Xác nhận"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {reset && <ResetDialog reset={reset} onClose={() => setReset(null)} />}
    </>
  );
}
function ResetDialog({
  reset,
  onClose,
}: {
  reset: { name: string; link: string; expiresAt: string };
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog title="Liên kết đặt mật khẩu" onClose={onClose}>
      <div className="manage-form">
        <p>
          Gửi riêng liên kết này cho <strong>{reset.name}</strong>. Liên kết chỉ hiển thị một lần và
          dùng được một lần.
        </p>
        <label>
          Liên kết
          <input
            readOnly
            value={reset.link}
            onFocus={(e) => e.target.select()}
            autoComplete="off"
          />
        </label>
        <p className="field-hint">
          Hết hạn lúc {new Date(reset.expiresAt).toLocaleString("vi-VN")}. Người dùng tự đặt mật
          khẩu, không cần gửi mật khẩu cho quản trị viên.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="form-actions">
          <button className="button secondary" onClick={onClose}>
            Đóng
          </button>
          <button
            className="button primary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(reset.link);
                setCopied(true);
              } catch {
                setError("Hãy chọn và sao chép liên kết trong ô phía trên.");
              }
            }}
          >
            {copied ? "Đã sao chép" : "Sao chép liên kết"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
