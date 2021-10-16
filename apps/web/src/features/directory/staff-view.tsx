import Link from "next/link";
import { defaultThumbnail } from "@/lib/default-thumbnails";
import { t } from "@/lib/i18n";
import { ArrowLeft, ArrowUpRight, Mail, MapPin, Phone } from "lucide-react";
import type { ReactNode } from "react";
import type {
  PublicStaff,
  StaffBlock,
  StaffActivity,
  StaffCareer,
  StaffEducation,
} from "./contracts";

export function StaffContentBlock({
  block,
  admin = false,
}: {
  block: StaffBlock;
  admin?: boolean;
}) {
  if (block.kind === "TEXT") return block.text ? <p>{block.text}</p> : null;
  if (block.kind === "FACT")
    return block.text && block.value ? (
      <dl className="staff-fact-row">
        <dt>{block.text}</dt>
        <dd>{block.value}</dd>
      </dl>
    ) : null;
  if (block.kind === "LIST")
    return block.items.length ? (
      <ul>
        {block.items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    ) : null;
  if (block.kind === "IMAGE")
    return block.assetId ? (
      <figure>
        <img src={`/api/v1/${admin ? "admin" : "public"}/media/${block.assetId}`} alt={block.alt} />
        {block.alt && <figcaption>{block.alt}</figcaption>}
      </figure>
    ) : null;
  return block.rows.length ? (
    <div
      className="staff-table-scroll"
      role="region"
      aria-label="Bảng thông tin cán bộ"
      tabIndex={0}
    >
      <span className="staff-table-hint">Vuốt ngang để xem đủ cột</span>
      <table>
        <thead>
          <tr>
            {(block.rows[0] ?? []).map((cell, index) => (
              <th key={index}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.slice(1).map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null;
}

function Facts({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="staff-structured-facts">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}
function Education({ rows, locale }: { rows: StaffEducation[]; locale: string }) {
  return (
    <div className="staff-records">
      {rows
        .filter((row) => row.degree || row.institution || row.major)
        .map((row, i) => (
          <div className="staff-record" key={i}>
            <div className="staff-record-head">
              <strong>
                {row.degree ||
                  row.major ||
                  (locale === "en" ? "Study program" : "Chương trình đào tạo")}
              </strong>
              {row.period && <span>{row.period}</span>}
            </div>
            <Facts
              rows={[
                [locale === "en" ? "Institution" : "Cơ sở đào tạo", row.institution],
                [locale === "en" ? "Field of study" : "Chuyên ngành", row.major],
                [locale === "en" ? "Mode" : "Hình thức", row.mode],
                [
                  locale === "en" ? "Graduation year" : "Năm tốt nghiệp / cấp bằng",
                  row.graduationYear,
                ],
                [locale === "en" ? "Thesis" : "Luận văn / luận án", row.thesis],
              ]}
            />
          </div>
        ))}
    </div>
  );
}
function Career({ rows }: { rows: StaffCareer[] }) {
  return (
    <div className="staff-timeline">
      {rows
        .filter((row) => row.period || row.institution || row.role)
        .map((row, i) => (
          <div className="staff-timeline-item" key={i}>
            <span className="staff-timeline-period">{row.period}</span>
            <div>
              <strong>{row.role || row.institution}</strong>
              {row.role && row.institution && <p>{row.institution}</p>}
              {row.description && <p>{row.description}</p>}
            </div>
          </div>
        ))}
    </div>
  );
}
function Activities({ rows, locale }: { rows: StaffActivity[]; locale: string }) {
  return (
    <ol className="staff-activity-list">
      {rows
        .filter((row) => row.title || row.description)
        .map((row, i) => (
          <li key={i} className={row.period ? undefined : "staff-activity-no-period"}>
            {row.period && <span className="staff-activity-period">{row.period}</span>}
            <div>
              <strong>{row.title}</strong>
              {row.description && <p>{row.description}</p>}
              {(row.organization || row.role) && (
                <small>{[row.organization, row.role].filter(Boolean).join(" · ")}</small>
              )}
              {row.url && (
                <a href={row.url} target="_blank" rel="noreferrer">
                  {locale === "en" ? "View source" : "Xem nguồn"} <ArrowUpRight size={14} />
                </a>
              )}
            </div>
          </li>
        ))}
    </ol>
  );
}

export function StaffView({ profile, admin = false }: { profile: PublicStaff; admin?: boolean }) {
  const staff = profile.details;
  const hasContact = staff.email || staff.phone || staff.office || staff.website;
  const academic = staff.academic;
  const sections: { title: string; content: ReactNode; wide?: boolean }[] = [];
  const biography: [string, string][] = [
    [profile.locale === "en" ? "Full name" : "Họ và tên", staff.name],
    [profile.locale === "en" ? "Highest degree" : "Học vị cao nhất", staff.degree],
    [profile.locale === "en" ? "Year awarded" : "Năm nhận học vị", academic.highestDegreeYear],
    [
      profile.locale === "en" ? "Academic rank" : "Chức danh khoa học",
      academic.academicRank || staff.academicTitle,
    ],
    [profile.locale === "en" ? "Year appointed" : "Năm phong chức danh", academic.academicRankYear],
    [profile.locale === "en" ? "Date of birth" : "Ngày sinh", academic.birthDate],
    [profile.locale === "en" ? "Place of birth" : "Nơi sinh", academic.birthPlace],
    [profile.locale === "en" ? "Department" : "Đơn vị công tác", staff.unit],
    [
      profile.locale === "en" ? "Research interests" : "Lĩnh vực nghiên cứu",
      academic.researchInterests,
    ],
  ];
  sections.push({
    title: t(profile.locale, "scientificBiography"),
    content: <Facts rows={biography} />,
  });
  const education = [...academic.undergraduate, ...academic.postgraduate];
  if (education.length)
    sections.push({
      title: t(profile.locale, "education"),
      content: <Education rows={education} locale={profile.locale} />,
    });
  if (academic.languages.length)
    sections.push({
      title: t(profile.locale, "languages"),
      content: (
        <Facts
          rows={academic.languages.map((row) => [
            row.language,
            [row.proficiency, row.certificate].filter(Boolean).join(" · ") ||
              (profile.locale === "en" ? "Studied" : "Đã học"),
          ])}
        />
      ),
    });
  if (academic.workHistory.length)
    sections.push({
      title: t(profile.locale, "career"),
      content: <Career rows={academic.workHistory} />,
      wide: true,
    });
  const groups: [string, StaffActivity[]][] = [
    [t(profile.locale, "projects"), academic.researchProjects],
    [t(profile.locale, "publications"), academic.publications],
    [t(profile.locale, "books"), academic.books],
    [t(profile.locale, "supervisions"), academic.supervisions],
    [t(profile.locale, "training"), academic.trainingCourses],
    [t(profile.locale, "awards"), academic.awards],
    [t(profile.locale, "memberships"), academic.memberships],
    [t(profile.locale, "otherActivities"), academic.otherActivities],
  ];
  for (const [title, rows] of groups)
    if (rows.length)
      sections.push({
        title,
        content: <Activities rows={rows} locale={profile.locale} />,
        wide: true,
      });
  const firstWideSection = sections.findIndex((section) => section.wide);
  const overviewSections = firstWideSection < 0 ? sections : sections.slice(0, firstWideSection);
  const professionalSections = firstWideSection < 0 ? [] : sections.slice(firstWideSection);
  const renderSection = (section: (typeof sections)[number], index: number) => (
    <section
      id={`muc-${index + 1}`}
      key={index}
      className={`staff-section${section.wide ? " staff-section-wide" : ""}`}
    >
      <h2>
        <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        {section.title}
      </h2>
      <div className="staff-section-content">{section.content}</div>
    </section>
  );
  const summary = staff.summary.startsWith("Hồ sơ khoa học, đào tạo và công bố của")
    ? ""
    : staff.summary;
  return (
    <article className={`staff-profile staff-template-${staff.template.toLowerCase()}`}>
      <nav className="breadcrumb" aria-label="Đường dẫn">
        <Link href={`/${profile.locale}`}>{t(profile.locale, "home")}</Link>
        <span>/</span>
        <Link href={`/${profile.locale}/can-bo`}>{t(profile.locale, "faculty")}</Link>
      </nav>
      <header className="staff-hero">
        <div className="staff-portrait">
          <img
            src={
              staff.portraitId
                ? `/api/v1/${admin ? "admin" : "public"}/media/${staff.portraitId}`
                : defaultThumbnail("staff")
            }
            alt={staff.portraitId ? staff.portraitAlt || staff.name : ""}
          />
        </div>
        <div className="staff-intro">
          <p className="eyebrow">
            {t(profile.locale, "department").toLocaleUpperCase(profile.locale)}{" "}
            <span aria-hidden="true">/</span>{" "}
            {t(profile.locale, "profile").toLocaleUpperCase(profile.locale)}
          </p>
          {staff.academicTitle && <p className="staff-hero-title">{staff.academicTitle}</p>}
          <h1>{staff.name}</h1>
          <p className="staff-position">
            {[staff.position, staff.degree].filter(Boolean).join(" · ") ||
              (profile.locale === "en"
                ? "Land Resources Department faculty member"
                : "Cán bộ Bộ môn Tài nguyên Đất đai")}
          </p>
          {summary && <p className="staff-summary">{summary}</p>}
          {staff.specialties.length > 0 && (
            <div className="staff-specialties">
              {staff.specialties.slice(0, 5).map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
          )}
          {staff.email && (
            <a className="staff-hero-email" href={`mailto:${staff.email}`}>
              <Mail size={17} /> {t(profile.locale, "emailContact")} <ArrowUpRight size={16} />
            </a>
          )}
        </div>
      </header>
      {sections.length > 1 && (
        <details className="staff-mobile-toc">
          <summary>{t(profile.locale, "contents")}</summary>
          <nav aria-label={profile.locale === "en" ? "Profile sections" : "Các đề mục hồ sơ"}>
            {sections.map((section, index) => (
              <a href={`#muc-${index + 1}`} key={index}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>
        </details>
      )}
      <div className="staff-layout">
        <div className="staff-body">
          {overviewSections.map(renderSection)}
          {!sections.length && (
            <p className="staff-empty">
              {profile.locale === "en"
                ? "Professional information coming soon."
                : "Thông tin chuyên môn đang được cập nhật."}
            </p>
          )}
        </div>
        <aside className="staff-side">
          {(staff.unit || hasContact) && (
            <div className="staff-facts">
              <h2>{t(profile.locale, "contact")}</h2>
              {staff.degree && (
                <div className="staff-facts-degree">
                  <span>{profile.locale === "en" ? "Degree" : "Học vị"}</span>
                  <strong>{staff.degree}</strong>
                </div>
              )}
              {staff.unit && (
                <div className="staff-facts-degree">
                  <span>{profile.locale === "en" ? "Department" : "Đơn vị"}</span>
                  <strong>{staff.unit}</strong>
                </div>
              )}
              {staff.email && (
                <a href={`mailto:${staff.email}`}>
                  <Mail size={16} />
                  {staff.email}
                </a>
              )}
              {staff.phone && (
                <a href={`tel:${staff.phone.replace(/\s/g, "")}`}>
                  <Phone size={16} />
                  {staff.phone}
                </a>
              )}
              {staff.office && (
                <p>
                  <MapPin size={16} />
                  {staff.office}
                </p>
              )}
              {staff.website && (
                <a href={staff.website} target="_blank" rel="noreferrer">
                  {profile.locale === "en" ? "Personal website" : "Website cá nhân"}{" "}
                  <ArrowUpRight size={16} />
                </a>
              )}
            </div>
          )}
          {sections.length > 1 && (
            <nav
              className="staff-toc"
              aria-label={profile.locale === "en" ? "In this profile" : "Trong hồ sơ"}
            >
              <h2>{t(profile.locale, "toc")}</h2>
              {sections.map((section, index) => (
                <a href={`#muc-${index + 1}`} key={index}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </a>
              ))}
            </nav>
          )}
        </aside>
      </div>
      {professionalSections.length > 0 && (
        <div className="staff-professional-sections">
          {professionalSections.map((section, index) =>
            renderSection(section, overviewSections.length + index),
          )}
        </div>
      )}
      <Link href={`/${profile.locale}/can-bo`} className="staff-back">
        <ArrowLeft size={16} /> {t(profile.locale, "backFaculty")}
      </Link>
    </article>
  );
}
