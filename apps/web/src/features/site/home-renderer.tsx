import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { defaultThumbnail } from "@/lib/default-thumbnails";
import { EducationRows } from "@/features/academics/public-views";
import { NewsSlider } from "./news-slider";
import { HeroSlider } from "./hero-slider";
import type { ArticleCategory, PublicContent } from "@/lib/contracts";
import { serverApi } from "@/lib/server-api";
import { linkUrl, type Action, type HomeComposition, type SiteRender } from "./contracts";
export async function HomeRenderer({
  data,
  preview = false,
  categoryOptions = [],
}: {
  data: SiteRender<HomeComposition>;
  preview?: boolean;
  categoryOptions?: ArticleCategory[];
}) {
  const h = data.content,
    urls = data.urls;
  const introductionArticleId =
    h.introduction.action?.link.kind === "ARTICLE" ? h.introduction.action.link.target : null;
  const introductionArticle =
    h.sections.includes("INTRODUCTION") && introductionArticleId
      ? await serverApi<PublicContent>("/public/content/" + introductionArticleId).catch(() => null)
      : null;
  function action(value: Action | null, className = "text-link") {
    if (!value) return null;
    const href = linkUrl(value.link, urls);
    return href ? (
      <Link
        className={className}
        href={href}
        {...(value.link.kind === "EXTERNAL" ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {value.label}
        {value.link.kind === "EXTERNAL" ? <ArrowUpRight size={18} /> : <ArrowRight size={18} />}
      </Link>
    ) : null;
  }
  return (
    <>
      <HeroSlider home={h} urls={urls} preview={preview} locale={data.locale} />
      {h.sections.map((section) => {
        switch (section) {
          case "INTRODUCTION":
            return (
              <section key={section} className="intro-section" id="gioi-thieu">
                <div
                  className={
                    "container intro-inner" +
                    (introductionArticle?.coverId ? "" : " intro-inner--text-only")
                  }
                >
                  {introductionArticle?.coverId && (
                    <figure className="intro-visual" data-reveal>
                      <img
                        src={"/api/v1/public/media/" + introductionArticle.coverId}
                        alt={introductionArticle.coverAlt || introductionArticle.title}
                        loading="lazy"
                      />
                      <figcaption>
                        <span className="intro-caption-rule" aria-hidden="true" />
                        {data.locale === "vi"
                          ? "Bộ môn Tài nguyên đất đai"
                          : "Department of Land Resources"}
                      </figcaption>
                    </figure>
                  )}
                  <div className="intro-copy" data-reveal>
                    <p className="eyebrow">{h.introduction.kicker}</p>
                    <h2 className="preserve-lines">{h.introduction.title}</h2>
                    <p className="intro-description preserve-lines">{h.introduction.body}</p>
                    {action(h.introduction.action, "intro-action")}
                  </div>
                </div>
              </section>
            );
          case "PROGRAMS":
            return (
              <section key={section} className="program-section" id="dao-tao">
                <div className="container">
                  <div className="section-heading" data-reveal>
                    <div>
                      <p className="eyebrow">{h.programsKicker}</p>
                      <h2>{h.programsTitle}</h2>
                    </div>
                    {action(h.programsAction)}
                  </div>
                  <div className="program-grid">
                    {h.programs
                      .filter(
                        (p) =>
                          p.action.link.kind !== "PROGRAM" ||
                          !!data.education?.[p.action.link.target],
                      )
                      .map((p, index) => {
                        const program =
                          p.action.link.kind === "PROGRAM"
                            ? data.education[p.action.link.target]
                            : null;
                        const title = program?.title || p.title;
                        const thumbnail = (
                          <span className="program-thumbnail">
                            <img
                              src={
                                program?.coverId
                                  ? "/api/v1/" +
                                    (preview ? "admin" : "public") +
                                    "/media/" +
                                    program.coverId
                                  : defaultThumbnail("program")
                              }
                              alt=""
                              loading="lazy"
                            />
                          </span>
                        );
                        const href = linkUrl(p.action.link, urls);
                        return (
                          <article key={p.id} className="program" data-reveal>
                            {href ? (
                              <Link
                                className="program-thumbnail-link"
                                href={href}
                                aria-label={(data.locale === "vi" ? "Xem " : "View ") + title}
                              >
                                {thumbnail}
                              </Link>
                            ) : (
                              <div className="program-thumbnail-link">{thumbnail}</div>
                            )}
                            <span className="program-index" aria-hidden="true">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="eyebrow">{p.kicker}</span>
                            <h3>{title}</h3>
                            <p>{program?.summary || p.body}</p>
                            {action(p.action)}
                          </article>
                        );
                      })}
                  </div>
                </div>
              </section>
            );
          case "NEWS":
            return (
              <section key={section} className="container news-section" id="tin-tuc">
                <div className="section-heading" data-reveal>
                  <div>
                    <p className="eyebrow">{h.newsKicker}</p>
                    <h2>{h.newsTitle}</h2>
                  </div>
                  <Link
                    className="text-link"
                    href={
                      "/" +
                      data.locale +
                      "/tin-tuc" +
                      (h.newsCategory ? "?category=" + h.newsCategory : "")
                    }
                  >
                    {data.locale === "en" ? "View all" : "Xem tất cả"} <ArrowRight size={18} />
                  </Link>
                </div>
                <NewsSlider
                  items={data.news}
                  locale={data.locale}
                  categoryOptions={categoryOptions}
                />
              </section>
            );
          case "ADMISSIONS":
            return (
              <section key={section} className="container news-section" id="tuyen-sinh">
                <div className="section-heading" data-reveal>
                  <div>
                    <p className="eyebrow">{data.locale === "vi" ? "TUYỂN SINH" : "ADMISSIONS"}</p>
                    <h2>
                      {h.admissionsMode === "LATEST"
                        ? data.locale === "vi"
                          ? "Thông tin tuyển sinh"
                          : "Admission announcements"
                        : data.locale === "vi"
                          ? "Đang nhận hồ sơ"
                          : "Applications open"}
                    </h2>
                  </div>
                  <Link className="text-link" href={"/" + data.locale + "/tuyen-sinh"}>
                    {data.locale === "vi" ? "Xem tất cả" : "View all"}
                    <ArrowRight size={18} />
                  </Link>
                </div>
                <EducationRows
                  locale={data.locale}
                  items={data.admissions ?? []}
                  asOf={new Date().toISOString()}
                />
              </section>
            );
          case "CONTACT":
            return (
              <section key={section} className="contact-strip" id="ket-noi">
                <div className="container contact-inner" data-reveal>
                  <div className="contact-heading">
                    <p className="eyebrow">{h.contact.kicker}</p>
                    <h2 className="preserve-lines">{h.contact.title}</h2>
                  </div>
                  <div className="contact-detail">
                    <p className="preserve-lines">{h.contact.body}</p>
                    {action(h.contact.action, "contact-action")}
                  </div>
                </div>
              </section>
            );
        }
      })}
    </>
  );
}
