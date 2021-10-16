"use client";

import Link from "next/link";
import { ArrowUpRight, Mail, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { PublicStaff } from "./contracts";
import { defaultThumbnail } from "@/lib/default-thumbnails";

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLocaleLowerCase("vi-VN");
}

function leadershipRank(position: string) {
  const value = normalize(position);
  if (/^truong bo mon$|^head of (the )?.*department$|^department head$/.test(value)) return 0;
  if (
    /^pho truong bo mon$|^(deputy|vice) head of (the )?.*department$|^deputy department head$/.test(
      value,
    )
  )
    return 1;
  return -1;
}

export function StaffDirectoryView({ people, locale }: { people: PublicStaff[]; locale: string }) {
  const en = locale === "en";
  const [query, setQuery] = useState("");
  const leadership = useMemo(
    () =>
      people
        .filter(({ details }) => leadershipRank(details.position) >= 0)
        .sort((a, b) => leadershipRank(a.details.position) - leadershipRank(b.details.position)),
    [people],
  );
  const leadershipIds = useMemo(() => new Set(leadership.map(({ id }) => id)), [leadership]);
  const visible = useMemo(() => {
    const needle = normalize(query.trim());
    if (!needle) return people;
    return people.filter(({ details }) =>
      normalize(
        [
          details.name,
          details.academicTitle,
          details.degree,
          details.position,
          details.unit,
          ...details.specialties,
        ].join(" "),
      ).includes(needle),
    );
  }, [people, query]);
  const gridPeople = query ? visible : visible.filter(({ id }) => !leadershipIds.has(id));

  return (
    <div className="staff-directory">
      <div className="staff-directory-header">
        <div className="container staff-directory-header-inner">
          <p className="eyebrow">
            {en ? "PEOPLE · RESEARCH · TEACHING" : "CON NGƯỜI · NGHIÊN CỨU · GIẢNG DẠY"}
          </p>
          <h1>{en ? "Faculty" : "Đội ngũ cán bộ"}</h1>
          <p>
            {en
              ? "Meet the people who teach, research and share knowledge at the Land Resources Department."
              : "Những người đang giảng dạy, nghiên cứu và kết nối tri thức tại Bộ môn Tài nguyên Đất đai."}
          </p>
          <span className="staff-directory-header-rule" aria-hidden="true" />
        </div>
      </div>
      <div className="container staff-directory-content">
        {!query && leadership.length > 0 && (
          <section className="staff-leadership" aria-labelledby="staff-leadership-title">
            <div className="staff-leadership-heading">
              <div>
                <p className="eyebrow">
                  {en ? "LEAD · CONNECT · GROW" : "DẪN DẮT · KẾT NỐI · PHÁT TRIỂN"}
                </p>
                <h2 id="staff-leadership-title">
                  {en ? "Department leadership" : "Ban chủ nhiệm bộ môn"}
                </h2>
              </div>
              <p>
                {en
                  ? "Based on the original staff listing, term 2021–2025"
                  : "Theo thông tin nhân sự trên trang gốc, nhiệm kỳ 2021–2025"}
              </p>
            </div>
            <div className="staff-leadership-grid">
              {leadership.map(({ id, details }, index) => (
                <article className="staff-leadership-card" key={id}>
                  <Link
                    href={`/${locale}/can-bo/${details.slug}`}
                    className="staff-leadership-photo"
                    aria-label={`${en ? "View profile" : "Xem hồ sơ"} ${details.name}`}
                  >
                    <img
                      src={
                        details.portraitId
                          ? `/api/v1/public/media/${details.portraitId}`
                          : defaultThumbnail("staff")
                      }
                      alt={details.portraitId ? details.portraitAlt || details.name : ""}
                      loading="eager"
                    />
                  </Link>
                  <div className="staff-leadership-copy">
                    <span className="staff-leadership-role">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {details.position}
                    </span>
                    <p className="staff-leadership-degree">
                      {details.academicTitle || details.degree}
                    </p>
                    <h3>
                      <Link href={`/${locale}/can-bo/${details.slug}`}>{details.name}</Link>
                    </h3>
                    {details.summary && <p className="staff-leadership-focus">{details.summary}</p>}
                    <div className="staff-leadership-actions">
                      <Link href={`/${locale}/can-bo/${details.slug}`}>
                        {en ? "View profile" : "Xem hồ sơ"} <ArrowUpRight size={16} />
                      </Link>
                      {details.email && (
                        <a
                          href={`mailto:${details.email}`}
                          aria-label={`${en ? "Email" : "Gửi email cho"} ${details.name}`}
                        >
                          <Mail size={16} />
                          {details.email}
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <div className="staff-directory-toolbar">
          <div className="staff-directory-count">
            <span>{String(visible.length).padStart(2, "0")}</span>
            <div>
              <strong>
                {query
                  ? en
                    ? "Search results"
                    : "Kết quả tìm kiếm"
                  : en
                    ? "Faculty profiles"
                    : "Hồ sơ cán bộ"}
              </strong>
              <small>
                {query
                  ? en
                    ? `among ${people.length} profiles`
                    : `trong ${people.length} hồ sơ`
                  : en
                    ? "Select a profile for details"
                    : "Chọn một hồ sơ để xem thông tin chi tiết"}
              </small>
            </div>
          </div>
          <label className="staff-directory-search">
            <Search size={19} aria-hidden="true" />
            <input
              aria-label={
                en
                  ? "Search faculty by name, degree or field"
                  : "Tìm cán bộ theo tên, học vị hoặc lĩnh vực"
              }
              type="search"
              placeholder={en ? "Search name, degree, field…" : "Tìm theo tên, học vị, lĩnh vực…"}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                type="button"
                aria-label={en ? "Clear search" : "Xóa tìm kiếm"}
                onClick={() => setQuery("")}
              >
                <X size={17} />
              </button>
            )}
          </label>
        </div>
        {visible.length ? (
          <div className="staff-directory-grid">
            {gridPeople.map(({ id, details }, index) => (
              <Link
                href={`/${locale}/can-bo/${details.slug}`}
                className="staff-directory-card"
                key={id}
                style={{ animationDelay: `${Math.min(index, 7) * 55}ms` }}
              >
                <span className="staff-directory-image">
                  <img
                    src={
                      details.portraitId
                        ? `/api/v1/public/media/${details.portraitId}`
                        : defaultThumbnail("staff")
                    }
                    alt=""
                    loading={index < 4 ? "eager" : "lazy"}
                  />
                  <span className="staff-directory-image-arrow" aria-hidden="true">
                    <ArrowUpRight size={20} />
                  </span>
                </span>
                <span className="staff-directory-card-copy">
                  <span className="staff-directory-card-degree">
                    {details.academicTitle || details.degree || (en ? "Faculty" : "Cán bộ")}
                  </span>
                  <strong>{details.name}</strong>
                  <small>
                    {details.position ||
                      details.unit ||
                      (en ? "Land Resources Department" : "Bộ môn Tài nguyên Đất đai")}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="staff-directory-empty">
            <h2>
              {people.length
                ? en
                  ? "No matching faculty found"
                  : "Không tìm thấy cán bộ phù hợp"
                : en
                  ? "Faculty profiles coming soon"
                  : "Hồ sơ cán bộ đang được cập nhật"}
            </h2>
            {people.length > 0 && (
              <button type="button" onClick={() => setQuery("")}>
                {en ? "View all faculty" : "Xem toàn bộ đội ngũ"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
