import Link from "next/link";
import type { ReactNode } from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import type { PublicLaboratory } from "./laboratory-contracts";

function Prose({ value }: { value: string }) {
  return (
    <div className="lab-structured-prose">
      {value
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((part, index) => (
          <p key={index}>{part}</p>
        ))}
    </div>
  );
}
export function LaboratoryView({
  profile,
  admin = false,
}: {
  profile: PublicLaboratory;
  admin?: boolean;
}) {
  const lab = profile.details;
  const label = (vi: string, en: string) => (profile.locale === "en" ? en : vi);
  const content = lab.content;
  const sections: { title: string; body: ReactNode }[] = [];
  if (content.overview)
    sections.push({
      title: label("Giới thiệu", "Overview"),
      body: <Prose value={content.overview} />,
    });
  if (content.functions)
    sections.push({
      title: label("Chức năng", "Functions"),
      body: <Prose value={content.functions} />,
    });
  if (content.duties)
    sections.push({ title: label("Nhiệm vụ", "Duties"), body: <Prose value={content.duties} /> });
  if (content.equipment.length)
    sections.push({
      title: label("Trang thiết bị", "Equipment"),
      body: (
        <div className="lab-equipment-grid">
          {content.equipment.map((item, i) => (
            <article className="lab-equipment" key={i}>
              {item.imageId && (
                <img
                  src={`/api/v1/${admin ? "admin" : "public"}/media/${item.imageId}`}
                  alt={item.imageAlt}
                />
              )}
              <div>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h3>{item.name}</h3>
                {item.quantity && (
                  <p>
                    {label("Số lượng", "Quantity")}: {item.quantity}
                  </p>
                )}
                {item.description && <p>{item.description}</p>}
              </div>
            </article>
          ))}
        </div>
      ),
    });
  if (content.courses.length)
    sections.push({
      title: label("Học phần giảng dạy", "Courses"),
      body: (
        <div className="lab-course-groups">
          {(["UNDERGRADUATE", "POSTGRADUATE"] as const).map((level) => {
            const rows = content.courses.filter((item) => item.level === level);
            return rows.length ? (
              <div key={level}>
                <h3>
                  {level === "UNDERGRADUATE"
                    ? label("Đại học", "Undergraduate")
                    : label("Sau đại học", "Postgraduate")}
                </h3>
                <ul>
                  {rows.map((item, i) => (
                    <li key={i}>
                      <strong>{item.name}</strong>
                      {item.code && <span>{item.code}</span>}
                      {item.description && <small>{item.description}</small>}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null;
          })}
        </div>
      ),
    });
  if (content.researchDescription || content.researchAreas.length)
    sections.push({
      title: label("Lĩnh vực nghiên cứu", "Research areas"),
      body: (
        <>
          {content.researchDescription && <Prose value={content.researchDescription} />}
          {content.researchAreas.length > 0 && (
            <ul className="lab-area-list">
              {content.researchAreas.map((area, i) => (
                <li key={i}>{area}</li>
              ))}
            </ul>
          )}
        </>
      ),
    });
  if (content.publications.length)
    sections.push({
      title: label("Công bố khoa học", "Publications"),
      body: (
        <ol className="lab-publication-list">
          {content.publications.map((item, i) => (
            <li key={i}>
              {item.year && <span>{item.year}</span>}
              <p>{item.citation}</p>
              {item.url && (
                <a href={item.url} target="_blank" rel="noreferrer">
                  {label("Xem nguồn ↗", "View source ↗")}
                </a>
              )}
            </li>
          ))}
        </ol>
      ),
    });
  if (content.additionalNotes)
    sections.push({
      title: label("Thông tin bổ sung", "Additional information"),
      body: <Prose value={content.additionalNotes} />,
    });
  return (
    <article className={`container lab-profile staff-template-${lab.template.toLowerCase()}`}>
      <nav className="breadcrumb" aria-label={label("Đường dẫn", "Breadcrumb")}>
        <Link href={`/${profile.locale}`}>{label("Trang chủ", "Home")}</Link>
        <span>/</span>
        <Link href={`/${profile.locale}/phong-thi-nghiem`}>
          {label("Phòng thí nghiệm", "Laboratories")}
        </Link>
      </nav>
      <header className="lab-hero">
        {lab.coverId && (
          <img
            src={`/api/v1/${admin ? "admin" : "public"}/media/${lab.coverId}`}
            alt={lab.coverAlt}
          />
        )}
        <div className="lab-hero-shade" />
        <div className="lab-hero-text">
          <p className="eyebrow">{label("HẠ TẦNG NGHIÊN CỨU", "RESEARCH INFRASTRUCTURE")}</p>
          <h1>{lab.name}</h1>
          {lab.shortName && <p className="lab-short-name">{lab.shortName}</p>}
        </div>
      </header>
      <div className="lab-layout">
        <main>
          {lab.summary && <p className="lab-lede">{lab.summary}</p>}
          {sections.map((section, index) => (
            <section className="staff-section" id={`muc-${index + 1}`} key={section.title}>
              <h2>
                <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                {section.title}
              </h2>
              <div className="staff-section-content">{section.body}</div>
            </section>
          ))}
        </main>
        <aside className="staff-side">
          <div className="staff-facts">
            <h2>{label("Thông tin phòng thí nghiệm", "Laboratory information")}</h2>
            {lab.lead && (
              <div>
                <span>{label("Người phụ trách", "Laboratory lead")}</span>
                <strong>{lab.lead}</strong>
              </div>
            )}
            {lab.location && (
              <p>
                <MapPin size={16} />
                {lab.location}
              </p>
            )}
            {lab.email && (
              <a href={`mailto:${lab.email}`}>
                <Mail size={16} />
                {lab.email}
              </a>
            )}
            {lab.phone && (
              <a href={`tel:${lab.phone.replace(/\s/g, "")}`}>
                <Phone size={16} />
                {lab.phone}
              </a>
            )}
          </div>
          {sections.length > 1 && (
            <nav className="staff-toc" aria-label={label("Trong trang", "On this page")}>
              <h2>{label("Trong trang", "On this page")}</h2>
              {sections.map((section, index) => (
                <a href={`#muc-${index + 1}`} key={section.title}>
                  {section.title}
                </a>
              ))}
            </nav>
          )}
        </aside>
      </div>
    </article>
  );
}
