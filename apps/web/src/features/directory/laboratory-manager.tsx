"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, FlaskConical, Search } from "lucide-react";
import { api } from "@/lib/browser-api";
import type { LaboratoryProfile } from "./laboratory-contracts";
import { SpreadsheetImport } from "@/components/spreadsheet-import";
import { defaultThumbnail } from "@/lib/default-thumbnails";

export function LaboratoryManager({
  initial,
  locale,
}: {
  initial: LaboratoryProfile[];
  locale: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const labs = initial.filter((p) =>
    [p.draft.name, p.draft.lead, p.draft.shortName]
      .join(" ")
      .toLocaleLowerCase("vi-VN")
      .includes(q.toLocaleLowerCase("vi-VN")),
  );
  async function create() {
    setBusy(true);
    setError("");
    try {
      const p = await api<LaboratoryProfile>("/admin/laboratories", {
        method: "POST",
        body: JSON.stringify({ locale }),
      });
      router.push(`/admin/laboratories/${p.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <>
      <header className="admin-topbar">
        <span>Nội dung / Phòng thí nghiệm</span>
      </header>
      <div className="admin-content staff-admin-list">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HỒ SƠ CÓ CẤU TRÚC</p>
            <h1>Phòng thí nghiệm</h1>
            <p className="muted">
              Mỗi phòng là một hồ sơ riêng với chức năng, thiết bị, học phần và hình ảnh.
            </p>
          </div>
          <button className="button primary" disabled={busy} onClick={create}>
            <Plus size={18} /> Tạo phòng thí nghiệm
          </button>
        </div>
        <div className="staff-admin-tools">
          <label className="admin-search-input">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm phòng thí nghiệm…"
              aria-label="Tìm phòng thí nghiệm"
            />
          </label>
          <select
            aria-label="Ngôn ngữ hồ sơ"
            value={locale}
            onChange={(e) => router.push(`/admin/laboratories?locale=${e.target.value}`)}
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>
          <Link className="button secondary" href={`/${locale}/phong-thi-nghiem`} target="_blank">
            Xem trang public
          </Link>
        </div>
        <SpreadsheetImport
          title="Phòng thí nghiệm"
          endpoint="/admin/laboratories/spreadsheet"
          params={{ locale }}
          itemHref={(id) => `/admin/laboratories/${id}`}
        />
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        <div className="staff-admin-rows">
          {labs.map((p) => (
            <Link className="staff-admin-row" href={`/admin/laboratories/${p.id}`} key={p.id}>
              <span className="staff-admin-avatar">
                <img
                  src={
                    p.draft.coverId
                      ? `/api/v1/admin/media/${p.draft.coverId}`
                      : defaultThumbnail("laboratory")
                  }
                  alt=""
                />
              </span>
              <span>
                <strong>{p.draft.name || "Phòng chưa có tên"}</strong>
                <small>{p.draft.shortName || p.draft.slug}</small>
              </span>
              <span className={`badge ${p.live ? "published" : "draft"}`}>
                {p.live ? "Công khai" : "Bản nháp"}
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          ))}
          {!labs.length && (
            <div className="empty-state">
              <FlaskConical size={32} />
              <h2>{q ? "Không tìm thấy" : "Chưa có phòng thí nghiệm"}</h2>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
