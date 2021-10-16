import Link from "next/link";
import { defaultThumbnail } from "@/lib/default-thumbnails";
import { ArrowUpRight, ArrowRight, Mail, Phone, CalendarDays } from "lucide-react";
import {
  type Contact,
  type BaseDraft,
  type Kind,
  type EducationDocument,
  type EducationResult,
  type PublicProgram,
  type PublicAdmission,
  levels,
  englishLevels,
  degrees,
  publicPath,
  admissionState,
  admissionStatuses,
  timeLabel,
} from "./contracts";
const enStatuses: Record<string, string> = {
  NOTICE: "See official notice",
  UPCOMING: "Opens soon",
  OPEN: "Applications open",
  CLOSED: "Applications closed",
  CLOSED_EARLY: "Closed early",
  DRAFT: "Draft",
};
export function StateBadge({ status, locale = "vi" }: { status: string; locale?: string }) {
  return (
    <span className={"academic-status " + status.toLowerCase()}>
      {(locale === "vi" ? admissionStatuses : enStatuses)[status] ?? status}
    </span>
  );
}
export function EducationRows({
  items,
  asOf,
  empty = true,
  locale = "vi",
}: {
  items: EducationDocument[];
  asOf: string;
  empty?: boolean;
  locale?: string;
}) {
  if (!items.length)
    return empty ? (
      <div className="academic-empty">
        <h3>{locale === "vi" ? "Chưa có nội dung phù hợp" : "No results"}</h3>
        <p>
          {locale === "vi"
            ? "Vui lòng quay lại sau hoặc thay đổi bộ lọc."
            : "Please check back later or change your filters."}
        </p>
      </div>
    ) : null;
  return (
    <div className="education-rows">
      {items.map((d) => (
        <article key={d.id} className="education-row" data-reveal>
          <Link
            tabIndex={-1}
            aria-hidden="true"
            href={publicPath(d.kind === "PROGRAM" ? "programs" : "admissions", d.locale, d.slug)}
          >
            <img
              src={
                d.coverId
                  ? "/api/v1/public/media/" + d.coverId
                  : defaultThumbnail(d.kind === "PROGRAM" ? "program" : "admission")
              }
              alt=""
              loading="lazy"
            />
          </Link>
          <div>
            <div className="education-row-meta">
              <span>
                {(d.locale === "vi" ? levels : englishLevels)[d.level]} · {d.code}
              </span>
              {d.kind === "ADMISSION" && (
                <StateBadge status={admissionState(d, asOf)} locale={d.locale} />
              )}
            </div>
            <h3>
              <Link
                href={publicPath(
                  d.kind === "PROGRAM" ? "programs" : "admissions",
                  d.locale,
                  d.slug,
                )}
              >
                {d.title}
              </Link>
            </h3>
            <p>{d.summary}</p>
            {d.kind === "ADMISSION" && d.closesAt && (
              <p className="education-deadline">
                <CalendarDays size={16} />
                {d.locale === "vi" ? "Hạn đăng ký: " : "Deadline: "}
                {timeLabel(d.closesAt, d.locale)} (UTC+07)
              </p>
            )}
          </div>
          <Link
            className="education-row-arrow"
            href={publicPath(d.kind === "PROGRAM" ? "programs" : "admissions", d.locale, d.slug)}
            aria-label={(d.locale === "vi" ? "Xem " : "View ") + d.title}
          >
            <ArrowRight size={24} />
          </Link>
        </article>
      ))}
    </div>
  );
}
function ContactPanel({ contact, locale }: { contact: Contact; locale: string }) {
  return (
    <section className="academic-contact">
      <h2>{locale === "vi" ? "Cần thêm thông tin?" : "Need more information?"}</h2>
      <p>{contact.name}</p>
      {contact.email && (
        <a href={"mailto:" + contact.email}>
          <Mail size={17} />
          {contact.email}
        </a>
      )}
      {contact.phone && (
        <p>
          <Phone size={17} />
          {contact.phone}
        </p>
      )}
    </section>
  );
}
function Text({ value }: { value: string }) {
  return (
    <div className="academic-prose">
      {value
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((p, i) => (
          <p className="preserve-lines" key={i}>
            {p}
          </p>
        ))}
    </div>
  );
}
function Day({ value, locale }: { value: string | null; locale: string }) {
  return (
    <>
      {value
        ? new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
            dateStyle: "medium",
            timeZone: "UTC",
          }).format(new Date(value + "T00:00:00Z"))
        : "—"}
    </>
  );
}
function DetailHeader({
  kind,
  data,
  preview,
}: {
  kind: Kind;
  data: PublicProgram | PublicAdmission;
  preview: boolean;
}) {
  const { locale, content: d } = data,
    vi = locale === "vi";
  return (
    <>
      <header className="academic-detail-heading">
        <div className="container" data-reveal>
          <nav className="breadcrumb" aria-label={vi ? "Đường dẫn" : "Breadcrumb"}>
            <Link href={"/" + locale}>{vi ? "Trang chủ" : "Home"}</Link>
            <span>/</span>
            <Link href={publicPath(kind, locale)}>
              {kind === "programs"
                ? vi
                  ? "Đào tạo"
                  : "Programs"
                : vi
                  ? "Tuyển sinh"
                  : "Admissions"}
            </Link>
          </nav>
          <p className="eyebrow">
            {(vi ? levels : englishLevels)[data.level]} · {data.code}
          </p>
          <h1>{d.title || "Chưa đặt tên"}</h1>
          <p className="academic-lead">{d.summary}</p>
          {kind === "admissions" && (
            <StateBadge status={(data as PublicAdmission).status} locale={locale} />
          )}
        </div>
      </header>
      {d.coverId && (
        <div className="container academic-detail-cover">
          <img
            src={"/api/v1/" + (preview ? "admin" : "public") + "/media/" + d.coverId}
            alt={d.coverAlt}
            fetchPriority="high"
          />
        </div>
      )}
    </>
  );
}
export function ProgramArticle({
  data,
  preview = false,
}: {
  data: PublicProgram;
  preview?: boolean;
}) {
  const d = data.content,
    vi = data.locale === "vi";
  const validity: Record<string, string> = vi
    ? {
        VALID: "Còn hiệu lực",
        EXPIRED: "Đã hết hiệu lực",
        NOT_YET_VALID: "Chưa tới ngày hiệu lực",
        NO_EXPIRY_RECORDED: "Chưa ghi ngày hết hạn",
      }
    : {
        VALID: "Valid",
        EXPIRED: "Expired",
        NOT_YET_VALID: "Not yet valid",
        NO_EXPIRY_RECORDED: "Expiry date not recorded",
      };
  return (
    <>
      <DetailHeader kind="programs" data={data} preview={preview} />
      <div className="container academic-detail-layout">
        <div className="academic-detail-body">
          <section id="tong-quan">
            <p className="eyebrow">{vi ? "CHƯƠNG TRÌNH ĐÀO TẠO" : "ACADEMIC PROGRAM"}</p>
            <h2>{vi ? "Tổng quan" : "Overview"}</h2>
            <Text value={d.description} />
          </section>
          {!!d.outcomes.length && (
            <section id="chuan-dau-ra">
              <h2>{vi ? "Chuẩn đầu ra" : "Learning outcomes"}</h2>
              <ul className="academic-bullet-list">
                {d.outcomes.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </section>
          )}
          {!!d.careers.length && (
            <section>
              <h2>{vi ? "Cơ hội nghề nghiệp" : "Career opportunities"}</h2>
              <ul className="academic-bullet-list">
                {d.careers.map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </section>
          )}
          <section id="khung-chuong-trinh">
            <p className="eyebrow">{vi ? "LỘ TRÌNH HỌC TẬP" : "STUDY PLAN"}</p>
            <h2>{vi ? "Khung chương trình" : "Curriculum"}</h2>
            {!d.curricula.length && (
              <p>
                {vi
                  ? "Khung chương trình sẽ được cập nhật. Vui lòng liên hệ bộ môn để biết thêm thông tin."
                  : "Curriculum information will be updated. Please contact the department."}
              </p>
            )}
            {d.curricula.map((c) => (
              <details key={c.id} className="curriculum-details" open={c.current}>
                <summary>
                  <span>
                    <strong>{c.name}</strong>
                    <small>
                      {vi ? "Khóa: " : "Cohort: "}
                      {c.cohort}
                    </small>
                  </span>
                  {c.current && <span className="badge">{vi ? "Hiện hành" : "Current"}</span>}
                </summary>
                <div>
                  <p>
                    {vi ? "Hiệu lực từ " : "Effective from "}
                    <Day value={c.effectiveFrom} locale={data.locale} />
                    {c.effectiveTo && (
                      <>
                        {" "}
                        – <Day value={c.effectiveTo} locale={data.locale} />
                      </>
                    )}
                  </p>
                  {c.documentUrl && (
                    <a className="text-link" href={c.documentUrl} target="_blank" rel="noreferrer">
                      {vi ? "Xem tài liệu khung chương trình" : "View curriculum document"}{" "}
                      <ArrowUpRight size={16} />
                    </a>
                  )}
                  {!!c.courses.length && (
                    <div className="table-panel">
                      <table className="curriculum-table">
                        <caption>
                          {vi ? "Danh sách học phần" : "Course list"} ·{" "}
                          {c.courses
                            .reduce((sum, x) => sum + x.credits, 0)
                            .toLocaleString(data.locale)}{" "}
                          {vi ? "tín chỉ kê khai" : "listed credits"}
                        </caption>
                        <thead>
                          <tr>
                            {(vi
                              ? ["Mã", "Học phần", "Tín chỉ", "Học kỳ", "Loại"]
                              : ["Code", "Course", "Credits", "Semester", "Type"]
                            ).map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {c.courses.map((x) => (
                            <tr key={x.id}>
                              <td>{x.code}</td>
                              <td>{x.name}</td>
                              <td>{x.credits}</td>
                              <td>{x.semester}</td>
                              <td>
                                {x.elective
                                  ? vi
                                    ? "Tự chọn"
                                    : "Elective"
                                  : vi
                                    ? "Bắt buộc"
                                    : "Required"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </section>
          {!!d.accreditations.length && (
            <section id="kiem-dinh">
              <h2>{vi ? "Kiểm định & chứng nhận" : "Accreditation"}</h2>
              {d.accreditations.map((c) => (
                <article className="accreditation-item" key={c.id}>
                  <div>
                    <h3>{c.name}</h3>
                    <p>{c.organization}</p>
                    <span className="badge">{validity[data.accreditations[c.id]]}</span>
                    <p>
                      {vi ? "Ngày cấp: " : "Issued: "}
                      <Day value={c.issuedAt} locale={data.locale} />
                      {c.expiresAt && (
                        <>
                          {" "}
                          · {vi ? "Hết hạn: " : "Expires: "}
                          <Day value={c.expiresAt} locale={data.locale} />
                        </>
                      )}
                    </p>
                  </div>
                  {c.evidenceUrl && (
                    <a className="text-link" target="_blank" rel="noreferrer" href={c.evidenceUrl}>
                      {vi ? "Minh chứng" : "Evidence"}
                      <ArrowUpRight size={16} />
                    </a>
                  )}
                </article>
              ))}
            </section>
          )}
          <section id="dot-tuyen">
            <h2>{vi ? "Các đợt tuyển sinh" : "Admission campaigns"}</h2>
            <EducationRows
              items={data.admissions.items}
              asOf={data.admissions.asOf}
              locale={data.locale}
            />
            {data.admissions.total > data.admissions.items.length && (
              <Link
                className="text-link"
                href={publicPath("admissions", data.locale) + "?program=" + data.id}
              >
                {vi ? "Xem tất cả đợt tuyển" : "All campaigns"}
                <ArrowRight size={18} />
              </Link>
            )}
          </section>
        </div>
        <aside className="academic-detail-sidebar">
          <dl className="academic-facts">
            <div>
              <dt>{vi ? "Văn bằng" : "Qualification"}</dt>
              <dd>
                {vi
                  ? degrees[d.degree]
                  : {
                      BACHELOR: "Bachelor",
                      ENGINEER: "Engineer",
                      MASTER: "Master",
                      DOCTOR: "Doctorate",
                    }[d.degree]}
              </dd>
            </div>
            <div>
              <dt>{vi ? "Đơn vị đào tạo" : "Department"}</dt>
              <dd>{d.unit}</dd>
            </div>
            {d.durationMonths && (
              <div>
                <dt>{vi ? "Thời lượng" : "Duration"}</dt>
                <dd>
                  {d.durationMonths} {vi ? "tháng" : "months"}
                </dd>
              </div>
            )}
            {d.credits && (
              <div>
                <dt>{vi ? "Khối lượng học tập" : "Program credits"}</dt>
                <dd>
                  {d.credits} {vi ? "tín chỉ" : "credits"}
                </dd>
              </div>
            )}
          </dl>
          <nav className="academic-jump-links" aria-label={vi ? "Trong trang này" : "On this page"}>
            <a href="#tong-quan">{vi ? "Tổng quan" : "Overview"}</a>
            <a href="#khung-chuong-trinh">{vi ? "Khung chương trình" : "Curriculum"}</a>
            <a href="#dot-tuyen">{vi ? "Các đợt tuyển sinh" : "Admissions"}</a>
          </nav>
          <ReferencePanel content={d} locale={data.locale} />
          <ContactPanel contact={d.contact} locale={data.locale} />
        </aside>
      </div>
    </>
  );
}
export function AdmissionArticle({
  data,
  preview = false,
}: {
  data: PublicAdmission;
  preview?: boolean;
}) {
  const d = data.content,
    vi = data.locale === "vi";
  return (
    <>
      <DetailHeader kind="admissions" data={data} preview={preview} />
      <div className="container academic-detail-layout">
        <div className="academic-detail-body">
          <section>
            <p className="eyebrow">
              {vi ? "THÔNG TIN TUYỂN SINH" : "ADMISSION INFORMATION"} · {d.year}
            </p>
            <h2>{vi ? "Thông báo tuyển sinh" : "Admission announcement"}</h2>
            <Text value={d.description} />
          </section>
          {data.closedAt && (
            <section className="academic-closure">
              <h2>{vi ? "Thông báo đóng sớm" : "Early closure"}</h2>
              <p>{timeLabel(data.closedAt, data.locale)} (UTC+07)</p>
              <Text value={data.closureReason} />
            </section>
          )}
          <section>
            <h2>{vi ? "Chương trình & chỉ tiêu" : "Programs & places"}</h2>
            <div className="table-panel">
              <table className="curriculum-table admission-program-table">
                <thead>
                  <tr>
                    <th>{vi ? "Chương trình" : "Program"}</th>
                    <th>{vi ? "Chỉ tiêu dự kiến" : "Planned places"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.programs.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.slug ? (
                          <Link href={publicPath("programs", data.locale, p.slug)}>{p.title}</Link>
                        ) : (
                          p.title
                        )}
                        <small>
                          {p.code}
                          {!p.slug &&
                            (vi
                              ? " · Chương trình hiện không công khai"
                              : " · Program currently unavailable")}
                        </small>
                      </td>
                      <td>{p.quota ?? (vi ? "Chưa công bố" : "Not announced")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2>{vi ? "Điều kiện dự tuyển" : "Eligibility"}</h2>
            <Text value={d.requirements} />
          </section>
          <section>
            <h2>{vi ? "Phương thức xét tuyển" : "Selection process"}</h2>
            <Text value={d.selectionMethod} />
          </section>
          {!!d.schedule.length && (
            <section>
              <h2>{vi ? "Lịch trình" : "Schedule"}</h2>
              <ol className="admission-timeline">
                {[...d.schedule]
                  .sort((a, b) => (a.at ?? "").localeCompare(b.at ?? ""))
                  .map((m) => (
                    <li key={m.id}>
                      <time dateTime={m.at ?? undefined}>
                        {timeLabel(m.at, data.locale)} (UTC+07)
                      </time>
                      <h3>{m.title}</h3>
                      <p className="preserve-lines">{m.note}</p>
                    </li>
                  ))}
              </ol>
            </section>
          )}
          {!!data.deadlineChanges.length && (
            <section>
              <h2>{vi ? "Các lần gia hạn" : "Deadline extensions"}</h2>
              {data.deadlineChanges.map((c, i) => (
                <div className="deadline-change" key={i}>
                  <p>
                    <strong>
                      {vi ? "Hạn mới: " : "New deadline: "}
                      {timeLabel(c.deadline, data.locale)} (UTC+07)
                    </strong>
                  </p>
                  <p>{c.reason}</p>
                  <small>
                    {vi ? "Cập nhật: " : "Updated: "}
                    {timeLabel(c.at, data.locale)}
                  </small>
                </div>
              ))}
            </section>
          )}
        </div>
        <aside className="academic-detail-sidebar">
          <section className="admission-apply">
            <h2>{vi ? "Đăng ký dự tuyển" : "Apply"}</h2>
            <dl>
              <div>
                <dt>{vi ? "Mở đăng ký" : "Opens"}</dt>
                <dd>
                  {d.opensAt
                    ? timeLabel(d.opensAt, data.locale)
                    : vi
                      ? "Theo thông báo"
                      : "See notice"}
                </dd>
              </div>
              <div>
                <dt>{vi ? "Đóng đăng ký" : "Closes"}</dt>
                <dd>
                  {d.closesAt
                    ? timeLabel(d.closesAt, data.locale)
                    : vi
                      ? "Theo thông báo"
                      : "See notice"}
                </dd>
              </div>
            </dl>
            <p className="field-hint">
              {vi ? "Thời gian Việt Nam (UTC+07)" : "Vietnam time (UTC+07)"}
            </p>
            {data.status === "NOTICE" && (
              <p>
                {vi
                  ? "Lịch đăng ký theo thông báo chính thức. Chưa có đủ mốc thời gian để xác định trạng thái nhận hồ sơ."
                  : "Consult the official announcement for application dates."}
              </p>
            )}
            {(data.status === "OPEN" || data.status === "NOTICE") && d.applicationUrl ? (
              <a
                className="button primary"
                href={d.applicationUrl}
                target="_blank"
                rel="noreferrer"
              >
                {data.status === "NOTICE"
                  ? vi
                    ? "Xem thông báo chính thức"
                    : "Official announcement"
                  : vi
                    ? "Nộp hồ sơ trực tuyến"
                    : "Apply online"}
                <ArrowUpRight size={17} />
              </a>
            ) : (
              <p className="academic-application-closed">
                {data.status === "UPCOMING"
                  ? vi
                    ? "Cổng đăng ký sẽ mở vào thời gian nêu trên."
                    : "Applications open at the time shown above."
                  : vi
                    ? "Đợt tuyển hiện không nhận hồ sơ."
                    : "This campaign is not accepting applications."}
              </p>
            )}
          </section>
          <ReferencePanel content={d} locale={data.locale} />
          <ContactPanel contact={d.contact} locale={data.locale} />
          <Link className="text-link" href={publicPath("admissions", data.locale) + "?status=OPEN"}>
            {vi ? "Xem các đợt đang mở" : "Browse open campaigns"}
            <ArrowRight size={17} />
          </Link>
        </aside>
      </div>
    </>
  );
}

function ReferencePanel({ content: d, locale }: { content: BaseDraft; locale: string }) {
  const vi = locale === "vi";
  if (!d.source && !d.resources?.length) return null;
  return (
    <section className="academic-references">
      {!!d.resources?.length && (
        <>
          <h2>{vi ? "Tài liệu & biểu mẫu" : "Documents & forms"}</h2>
          <ul>
            {d.resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noreferrer">
                  {r.label}
                  <ArrowUpRight size={16} />
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      {d.source && (
        <div className="academic-source">
          <a href={d.source.url} target="_blank" rel="noreferrer">
            {vi ? "Nguồn thông tin" : "Information source"}
            <ArrowUpRight size={16} />
          </a>
          {d.source.publishedOn && (
            <p>
              {vi ? "Ngày đăng ở nguồn: " : "Source published: "}
              <Day value={d.source.publishedOn} locale={locale} />
            </p>
          )}
          <p>
            {vi ? "Đối chiếu: " : "Checked: "}
            <Day value={d.source.retrievedOn} locale={locale} />
          </p>
        </div>
      )}
    </section>
  );
}
