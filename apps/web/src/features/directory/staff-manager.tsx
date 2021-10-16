"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Search, UserRound } from "lucide-react";
import { api } from "@/lib/browser-api";
import { staffStatus, type StaffProfile } from "./contracts";
import { statusLabels } from "@/lib/contracts";
import { SpreadsheetImport } from "@/components/spreadsheet-import";
import { defaultThumbnail } from "@/lib/default-thumbnails";

export function StaffManager({ initial, locale }: { initial: StaffProfile[]; locale: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const people = initial.filter((p) =>
    [p.draft.name, p.draft.position, p.draft.unit]
      .join(" ")
      .toLocaleLowerCase("vi-VN")
      .includes(q.toLocaleLowerCase("vi-VN")),
  );
  async function create() {
    setBusy(true);
    setError("");
    try {
      const p = await api<StaffProfile>("/admin/people", {
        method: "POST",
        body: JSON.stringify({ locale }),
      });
      router.push(`/admin/staff/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <header className="admin-topbar">
        <span>Nội dung / Cán bộ</span>
      </header>
      <div className="admin-content staff-admin-list">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HỒ SƠ CÓ CẤU TRÚC</p>
            <h1>Đội ngũ cán bộ</h1>
            <p className="muted">
              Mỗi cán bộ là một hồ sơ riêng, dùng chung mẫu hiển thị chuyên nghiệp.
            </p>
          </div>
          <button className="button primary" disabled={busy} onClick={create}>
            <Plus size={18} /> Tạo hồ sơ
          </button>
        </div>
        <div className="staff-admin-tools">
          <label className="admin-search-input">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm cán bộ…"
              aria-label="Tìm cán bộ"
            />
          </label>
          <select
            aria-label="Ngôn ngữ hồ sơ"
            value={locale}
            onChange={(e) => router.push(`/admin/staff?locale=${e.target.value}`)}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
          <Link className="button secondary" href={`/${locale}/can-bo`} target="_blank">
            Xem trang public
          </Link>
        </div>
        <SpreadsheetImport
          title="Cán bộ"
          endpoint="/admin/people/spreadsheet"
          params={{ locale }}
          itemHref={(id) => `/admin/staff/${id}`}
        />
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="staff-admin-rows">
          {people.map((person) => (
            <Link href={`/admin/staff/${person.id}`} className="staff-admin-row" key={person.id}>
              <span className="staff-admin-avatar">
                <img
                  src={
                    person.draft.portraitId
                      ? `/api/v1/admin/media/${person.draft.portraitId}`
                      : defaultThumbnail("staff")
                  }
                  alt=""
                />
              </span>
              <span>
                <strong>
                  {[person.draft.academicTitle, person.draft.name || "Hồ sơ chưa có tên"]
                    .filter(Boolean)
                    .join(" ")}
                </strong>
                <small>
                  {[person.draft.position, person.draft.unit].filter(Boolean).join(" · ") ||
                    person.draft.slug}
                </small>
              </span>
              <span className={`badge ${staffStatus(person).toLowerCase()}`}>
                {statusLabels[staffStatus(person)]}
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
          {!people.length && (
            <div className="empty-state">
              <UserRound size={32} />
              <h2>{q ? "Không tìm thấy cán bộ" : "Chưa có hồ sơ cán bộ"}</h2>
              <p>{q ? "Thử từ khóa khác." : "Tạo hồ sơ hoặc chuyển dữ liệu từ bài viết cũ."}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
