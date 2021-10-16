import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { serverApi, requirePermission } from "@/lib/server-api";
import { ApiError } from "@/lib/errors";
import type { PageResult } from "@/lib/contracts";
import { AcademicList } from "./academic-list";
import { AcademicEditor } from "./academic-editor";
import { ProgramArticle, AdmissionArticle, EducationRows } from "./public-views";
import {
  type Kind,
  type Level,
  type EducationResult,
  type AcademicView,
  type PublicProgram,
  type PublicAdmission,
  publicPath,
  levels,
  englishLevels,
  admissionStatuses,
} from "./contracts";
export type Query = Record<string, string | string[] | undefined>;
function text(q: Query, key: string) {
  return typeof q[key] === "string" ? (q[key] as string) : "";
}
function pageNumber(q: Query) {
  const p = Number(text(q, "page"));
  return Number.isInteger(p) && p >= 0 && p <= 100000 ? p : 0;
}
export async function adminList(kind: Kind, q: Query) {
  await requirePermission("academics:manage");
  const query = text(q, "q").slice(0, 200),
    locale = ["vi", "en"].includes(text(q, "locale")) ? text(q, "locale") : "";
  const data = await serverApi<PageResult<AcademicView>>(
    "/admin/academics/" +
      kind +
      "?" +
      new URLSearchParams({ q: query, locale, page: String(pageNumber(q)) }),
    true,
  );
  return <AcademicList kind={kind} data={data} query={query} locale={locale} />;
}
export async function adminEditor(kind: Kind, id: string) {
  await requirePermission("academics:manage");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) notFound();
  try {
    const data = await serverApi<AcademicView>("/admin/academics/" + kind + "/" + id, true);
    return <AcademicEditor key={id} kind={kind} initial={data} />;
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
export async function adminPreview(kind: Kind, id: string) {
  await requirePermission("academics:manage");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) notFound();
  const data = await serverApi<PublicProgram | PublicAdmission>(
    "/admin/academics/" + kind + "/" + id + "/preview",
    true,
  );
  return (
    <div className="academic-preview">
      <div className="preview-banner">
        BẢN XEM TRƯỚC · Nội dung chưa công khai{" "}
        <Link href={"/admin/" + kind + "/" + id}>Trở lại biên tập</Link>
      </div>
      {kind === "programs" ? (
        <ProgramArticle data={data as PublicProgram} preview />
      ) : (
        <AdmissionArticle data={data as PublicAdmission} preview />
      )}
    </div>
  );
}
export const loadPublic = cache(async (kind: Kind, locale: string, slug: string) => {
  try {
    return await serverApi<PublicProgram | PublicAdmission>(
      "/public/academics/" + kind + "/" + encodeURIComponent(slug) + "?locale=" + locale,
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
});
export async function detailMetadata(kind: Kind, locale: string, slug: string): Promise<Metadata> {
  const data = await loadPublic(kind, locale, slug);
  return {
    title: data.content.title,
    description: data.content.summary,
    alternates: { canonical: publicPath(kind, locale, data.content.slug) },
    openGraph: {
      title: data.content.title,
      description: data.content.summary,
      images: data.content.coverId ? ["/api/v1/public/media/" + data.content.coverId] : [],
    },
  };
}
export async function publicDetail(kind: Kind, locale: string, slug: string) {
  const data = await loadPublic(kind, locale, slug);
  if (data.content.slug !== slug) permanentRedirect(publicPath(kind, locale, data.content.slug));
  return kind === "programs" ? (
    <ProgramArticle data={data as PublicProgram} />
  ) : (
    <AdmissionArticle data={data as PublicAdmission} />
  );
}
export function listMetadata(kind: Kind, locale: string): Metadata {
  const vi = locale === "vi";
  return {
    title:
      kind === "programs"
        ? vi
          ? "Chương trình đào tạo"
          : "Academic programs"
        : vi
          ? "Tuyển sinh"
          : "Admissions",
    alternates: { canonical: publicPath(kind, locale) },
  };
}
export async function publicList(kind: Kind, locale: string, q: Query) {
  const vi = locale === "vi",
    labels = vi ? levels : englishLevels;
  const params = new URLSearchParams({
    locale,
    q: text(q, "q").slice(0, 200),
    level: text(q, "level") in levels ? text(q, "level") : "",
    page: String(pageNumber(q)),
    size: "12",
  });
  if (kind === "admissions") {
    if (text(q, "status") in admissionStatuses && text(q, "status") !== "DRAFT")
      params.set("status", text(q, "status"));
    if (
      /^\d{4}$/.test(text(q, "year")) &&
      Number(text(q, "year")) >= 2000 &&
      Number(text(q, "year")) <= 2200
    )
      params.set("year", text(q, "year"));
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(text(q, "program")))
      params.set("program", text(q, "program"));
  }
  const data = await serverApi<EducationResult>("/public/academics/" + kind + "?" + params);
  function href(page: number) {
    const p = new URLSearchParams(params);
    p.delete("locale");
    p.delete("size");
    p.set("page", String(page));
    return publicPath(kind, locale) + "?" + p;
  }
  return (
    <>
      <section className="education-list-hero">
        <img src="/images/campus.jpg" alt="" fetchPriority="high" />
        <div className="container">
          <p className="eyebrow">
            {vi ? "BỘ MÔN TÀI NGUYÊN ĐẤT ĐAI" : "LAND RESOURCES DEPARTMENT"}
          </p>
          <h1>
            {kind === "programs"
              ? vi
                ? "Học tập để kiến tạo\ntương lai bền vững."
                : "Learning for a\nsustainable future."
              : vi
                ? "Bắt đầu hành trình\ncùng chúng tôi."
                : "Start your journey\nwith us."}
          </h1>
          <p>
            {kind === "programs"
              ? vi
                ? "Khám phá chương trình, lộ trình học tập và cơ hội nghề nghiệp."
                : "Explore our programs, study plans and career pathways."
              : vi
                ? "Thông tin chương trình, điều kiện dự tuyển và các mốc đăng ký."
                : "Find programs, entry requirements and application dates."}
          </p>
        </div>
      </section>
      <div className="container education-list">
        <nav
          className="education-switch"
          aria-label={vi ? "Đào tạo và tuyển sinh" : "Programs and admissions"}
        >
          <Link
            className={kind === "programs" ? "active" : ""}
            href={publicPath("programs", locale)}
          >
            {vi ? "Chương trình đào tạo" : "Academic programs"}
          </Link>
          <Link
            className={kind === "admissions" ? "active" : ""}
            href={publicPath("admissions", locale)}
          >
            {vi ? "Tuyển sinh" : "Admissions"}
          </Link>
        </nav>
        <form className="academic-filters" role="search">
          <label>
            {vi ? "Tìm kiếm" : "Search"}
            <input
              name="q"
              defaultValue={params.get("q") ?? ""}
              maxLength={200}
              placeholder={vi ? "Tên chương trình, mã…" : "Program name, code…"}
            />
          </label>
          <label>
            {vi ? "Bậc đào tạo" : "Study level"}
            <select name="level" defaultValue={params.get("level") ?? ""}>
              <option value="">{vi ? "Tất cả bậc học" : "All levels"}</option>
              {Object.entries(labels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {kind === "admissions" && (
            <>
              <label>
                {vi ? "Trạng thái" : "Status"}
                <select name="status" defaultValue={params.get("status") ?? ""}>
                  <option value="">{vi ? "Tất cả trạng thái" : "All statuses"}</option>
                  {Object.entries(
                    vi
                      ? {
                          NOTICE: "Theo thông báo",
                          UPCOMING: "Sắp mở",
                          OPEN: "Đang nhận hồ sơ",
                          CLOSED: "Đã hết hạn",
                          CLOSED_EARLY: "Đã đóng sớm",
                        }
                      : {
                          NOTICE: "See official notice",
                          UPCOMING: "Opens soon",
                          OPEN: "Applications open",
                          CLOSED: "Closed",
                          CLOSED_EARLY: "Closed early",
                        },
                  ).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {vi ? "Năm tuyển" : "Year"}
                <input
                  type="number"
                  name="year"
                  min={2000}
                  max={2200}
                  defaultValue={params.get("year") ?? ""}
                  placeholder={vi ? "Tất cả" : "All"}
                />
              </label>
              {params.has("program") && (
                <input type="hidden" name="program" value={params.get("program")!} />
              )}
            </>
          )}
          <button className="button primary">{vi ? "Tìm kiếm" : "Search"}</button>
          <Link href={publicPath(kind, locale)} className="text-link">
            {vi ? "Xóa lọc" : "Clear"}
          </Link>
        </form>
        <div className="section-heading">
          <h2>
            {kind === "programs"
              ? vi
                ? "Chương trình đào tạo"
                : "Academic programs"
              : vi
                ? "Thông tin tuyển sinh"
                : "Admission campaigns"}
          </h2>
          <span className="muted">
            {data.total} {vi ? "kết quả" : "results"}
          </span>
        </div>
        <EducationRows items={data.items} asOf={data.asOf} locale={locale} />
        <nav className="pagination" aria-label={vi ? "Phân trang" : "Pagination"}>
          {data.page > 0 && (
            <Link className="button secondary" href={href(data.page - 1)}>
              {vi ? "Trang trước" : "Previous"}
            </Link>
          )}
          <span>
            {data.page + 1} / {Math.max(1, Math.ceil(data.total / data.size))}
          </span>
          {(data.page + 1) * data.size < data.total && (
            <Link className="button secondary" href={href(data.page + 1)}>
              {vi ? "Trang sau" : "Next"}
            </Link>
          )}
        </nav>
      </div>
    </>
  );
}
