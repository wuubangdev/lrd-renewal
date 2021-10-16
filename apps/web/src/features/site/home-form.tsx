"use client";
import { useState } from "react";
import { Plus, Trash2, ImageIcon } from "lucide-react";
import { useCategories } from "@/features/publishing/use-categories";
import { MediaPicker } from "@/features/media/media-picker";
import { Field, BlockField, ActionField, MoveButtons, moveItem, ArticleSelect } from "./fields";
import { sectionLabels, type HomeComposition, type Section } from "./contracts";

export function HomeForm({
  value: h,
  onChange,
  locale,
}: {
  value: HomeComposition;
  onChange: (v: HomeComposition) => void;
  locale: string;
}) {
  const [picker, setPicker] = useState<number | null>(null);
  const heroSlides = h.heroSlides ?? [];
  function updateSlide(index: number, slide: (typeof heroSlides)[number]) {
    const next = [...heroSlides];
    next[index] = slide;
    change("heroSlides", next);
  }
  const categoryOptions = useCategories();
  function change<K extends keyof HomeComposition>(key: K, value: HomeComposition[K]) {
    onChange({ ...h, [key]: value });
  }
  return (
    <div className="site-form">
      <section className="settings-section">
        <div className="settings-section-heading">
          <span className="section-number">01</span>
          <div>
            <h2>Banner trang chủ</h2>
            <p>Thêm nhiều slide, mỗi slide có ảnh, thông điệp và liên kết riêng.</p>
          </div>
        </div>
        <div className="site-fields">
          <BlockField value={h.hero} onChange={(v) => change("hero", v)} locale={locale} />
          <div className="hero-image-field">
            <img
              src={h.heroImageId ? "/api/v1/admin/media/" + h.heroImageId : "/images/campus.jpg"}
              alt={h.heroImageAlt}
            />
            <div>
              <button type="button" className="button secondary" onClick={() => setPicker(0)}>
                <ImageIcon size={17} />
                Chọn ảnh bìa
              </button>
              {h.heroImageId && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() =>
                    onChange({
                      ...h,
                      heroImageId: null,
                      heroImageAlt: "Khuôn viên Đại học Cần Thơ",
                    })
                  }
                >
                  Dùng ảnh mặc định
                </button>
              )}
              <p className="field-hint">Ảnh ngang, tối đa 8 MB. Dùng thư viện ảnh chung của CMS.</p>
            </div>
          </div>
          <Field
            label="Mô tả ảnh bìa"
            max={300}
            value={h.heroImageAlt}
            onChange={(v) => change("heroImageAlt", v)}
          />
          <div className="hero-slide-editor-heading">
            <strong>Các slide tiếp theo</strong>
            <span>{heroSlides.length + 1} / 6 slide</span>
          </div>
          {heroSlides.map((slide, index) => (
            <div className="hero-slide-editor" key={index}>
              <div className="hero-slide-editor-title">
                <strong>Slide {index + 2}</strong>
                <div>
                  <MoveButtons
                    index={index}
                    length={heroSlides.length}
                    label={`slide ${index + 2}`}
                    onMove={(to) => change("heroSlides", moveItem(heroSlides, index, to))}
                  />
                  <button type="button" className="icon-button" aria-label={`Xóa slide ${index + 2}`} onClick={() => change("heroSlides", heroSlides.filter((_, i) => i !== index))}>
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <BlockField value={slide.content} onChange={(content) => updateSlide(index, { ...slide, content })} locale={locale} />
              <div className="hero-image-field">
                {slide.imageId ? <img src={`/api/v1/admin/media/${slide.imageId}`} alt={slide.imageAlt} /> : <span className="hero-slide-placeholder"><ImageIcon size={30} />Chưa chọn ảnh</span>}
                <div>
                  <button type="button" className="button secondary" onClick={() => setPicker(index + 1)}><ImageIcon size={17} /> Chọn ảnh slide</button>
                  {slide.imageId && <button type="button" className="text-link" onClick={() => updateSlide(index, { ...slide, imageId: null, imageAlt: "" })}>Bỏ ảnh</button>}
                </div>
              </div>
              <Field label="Mô tả ảnh slide" max={300} value={slide.imageAlt} onChange={(imageAlt) => updateSlide(index, { ...slide, imageAlt })} />
            </div>
          ))}
          {heroSlides.length < 5 && (
            <button type="button" className="button secondary" onClick={() => change("heroSlides", [...heroSlides, { content: { kicker: "", title: "", body: "", action: null }, imageId: null, imageAlt: "" }])}>
              <Plus size={17} /> Thêm slide
            </button>
          )}
        </div>
      </section>
      <section className="settings-section">
        <div className="settings-section-heading">
          <span className="section-number">02</span>
          <div>
            <h2>Bố cục trang chủ</h2>
            <p>Bật/tắt và sắp xếp các khối theo nhu cầu nội dung.</p>
          </div>
        </div>
        <div className="site-fields">
          <div className="section-order">
            {[
              ...h.sections,
              ...(Object.keys(sectionLabels) as Section[]).filter((s) => !h.sections.includes(s)),
            ].map((s, i) => (
              <div key={s}>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={h.sections.includes(s)}
                    onChange={(e) =>
                      change(
                        "sections",
                        e.target.checked ? [...h.sections, s] : h.sections.filter((v) => v !== s),
                      )
                    }
                  />
                  {sectionLabels[s]}
                </label>
                {h.sections.includes(s) && (
                  <MoveButtons
                    index={i}
                    length={h.sections.length}
                    label={sectionLabels[s]}
                    onMove={(to) => change("sections", moveItem(h.sections, i, to))}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="field-hint">
            Nếu ẩn một khối, cập nhật các nút đang trỏ đến khối đó trước khi đăng.
          </p>
          {h.sections.includes("ADMISSIONS") && (
            <label>
              Nội dung khối tuyển sinh
              <select
                value={h.admissionsMode ?? "OPEN"}
                onChange={(e) => change("admissionsMode", e.target.value as "OPEN" | "LATEST")}
              >
                <option value="OPEN">Chỉ các đợt đang nhận hồ sơ</option>
                <option value="LATEST">Thông báo mới nhất, gồm cả đợt đã hết hạn</option>
              </select>
            </label>
          )}
        </div>
      </section>
      {h.sections.includes("INTRODUCTION") && (
        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Giới thiệu bộ môn</h2>
          </div>
          <div className="site-fields">
            <BlockField
              value={h.introduction}
              onChange={(v) => change("introduction", v)}
              locale={locale}
            />
          </div>
        </section>
      )}
      {h.sections.includes("PROGRAMS") && (
        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Đào tạo</h2>
            <span className="muted">Tối đa 6 chương trình</span>
            <p>Chọn liên kết “Chương trình công khai” để lấy tên và tóm tắt từ dữ liệu đào tạo.</p>
          </div>
          <div className="site-fields">
            <Field
              label="Dòng dẫn đào tạo"
              value={h.programsKicker}
              max={120}
              onChange={(v) => change("programsKicker", v)}
            />
            <Field
              label="Tiêu đề đào tạo"
              value={h.programsTitle}
              onChange={(v) => change("programsTitle", v)}
            />
            <ActionField
              value={h.programsAction}
              onChange={(v) => change("programsAction", v)}
              locale={locale}
            />
            {h.programs.map((p, i) => (
              <details key={p.id} className="edit-item" open>
                <summary>{p.title || "Chương trình mới"}</summary>
                <div className="edit-item-body">
                  <div className="item-toolbar">
                    <MoveButtons
                      index={i}
                      length={h.programs.length}
                      label={p.title || "chương trình"}
                      onMove={(to) => change("programs", moveItem(h.programs, i, to))}
                    />
                    <button
                      type="button"
                      className="icon-button danger-text"
                      aria-label={"Xóa chương trình " + p.title}
                      onClick={() =>
                        change(
                          "programs",
                          h.programs.filter((x) => x.id !== p.id),
                        )
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                  <BlockField
                    value={p}
                    actionRequired
                    onChange={(v) =>
                      change(
                        "programs",
                        h.programs.map((x) =>
                          x.id === p.id
                            ? {
                                ...x,
                                ...v,
                                action: v.action ?? {
                                  label: "Khám phá chương trình",
                                  link: { kind: "NEWS", target: "" },
                                },
                              }
                            : x,
                        ),
                      )
                    }
                    locale={locale}
                  />
                </div>
              </details>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={h.programs.length >= 6}
              onClick={() =>
                change("programs", [
                  ...h.programs,
                  {
                    id: crypto.randomUUID(),
                    kicker: "",
                    title: "",
                    body: "",
                    action: { label: "Khám phá chương trình", link: { kind: "NEWS", target: "" } },
                  },
                ])
              }
            >
              <Plus size={17} />
              Thêm chương trình
            </button>
          </div>
        </section>
      )}
      {h.sections.includes("NEWS") && (
        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Tin tức nổi bật</h2>
          </div>
          <div className="site-fields">
            <Field
              label="Dòng dẫn tin tức"
              value={h.newsKicker}
              max={120}
              onChange={(v) => change("newsKicker", v)}
            />
            <Field
              label="Tiêu đề tin tức"
              value={h.newsTitle}
              onChange={(v) => change("newsTitle", v)}
            />
            <div className="form-grid">
              <label>
                Chuyên mục tự động
                <select
                  value={h.newsCategory}
                  onChange={(e) => change("newsCategory", e.target.value)}
                >
                  <option value="">Tất cả chuyên mục</option>
                  {categoryOptions.map((category) => (
                    <option key={category.code} value={category.code}>
                      {locale === "en" ? category.nameEn : category.nameVi}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Số tin hiển thị
                <input
                  type="number"
                  min={Math.max(1, h.featuredIds.length)}
                  max={12}
                  value={h.newsLimit}
                  onChange={(e) =>
                    change(
                      "newsLimit",
                      Math.max(h.featuredIds.length, Math.min(12, Number(e.target.value) || 1)),
                    )
                  }
                />
              </label>
            </div>
            <p className="field-hint">
              Tin ghim được hiển thị trước theo thứ tự bên dưới. Các vị trí còn lại lấy tin công
              khai mới nhất trong chuyên mục.
            </p>
            {h.featuredIds.map((id, i) => (
              <div className="featured-item" key={id}>
                <ArticleSelect
                  label={"Tin ghim " + (i + 1)}
                  value={id}
                  onChange={(v) => {
                    if (v && !h.featuredIds.includes(v))
                      change(
                        "featuredIds",
                        h.featuredIds.map((x) => (x === id ? v : x)),
                      );
                  }}
                  locale={locale}
                />
                <div className="row-actions">
                  <MoveButtons
                    index={i}
                    length={h.featuredIds.length}
                    label={"tin ghim " + (i + 1)}
                    onMove={(to) => change("featuredIds", moveItem(h.featuredIds, i, to))}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={"Bỏ ghim tin " + (i + 1)}
                    onClick={() =>
                      change(
                        "featuredIds",
                        h.featuredIds.filter((x) => x !== id),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            ))}
            {h.featuredIds.length < h.newsLimit && (
              <ArticleSelect
                label="Thêm tin ghim"
                value=""
                onChange={(id) => {
                  if (id && !h.featuredIds.includes(id))
                    change("featuredIds", [...h.featuredIds, id]);
                }}
                locale={locale}
              />
            )}
          </div>
        </section>
      )}
      {h.sections.includes("CONTACT") && (
        <section className="settings-section">
          <div className="settings-section-heading">
            <h2>Kết nối</h2>
          </div>
          <div className="site-fields">
            <BlockField value={h.contact} onChange={(v) => change("contact", v)} locale={locale} />
          </div>
        </section>
      )}
      <section className="settings-section">
        <div className="settings-section-heading">
          <h2>Thông tin chân trang</h2>
          <p>Dùng chung cho các trang công khai trong ngôn ngữ này.</p>
        </div>
        <div className="site-fields">
          <Field
            label="Thông điệp chân trang"
            value={h.footer.description}
            max={500}
            multiline
            onChange={(v) => change("footer", { ...h.footer, description: v })}
          />
          <Field
            label="Địa chỉ liên hệ"
            value={h.footer.address}
            max={500}
            onChange={(v) => change("footer", { ...h.footer, address: v })}
          />
          <Field
            label="Email liên hệ"
            value={h.footer.email}
            max={254}
            onChange={(v) => change("footer", { ...h.footer, email: v })}
          />
        </div>
      </section>
      {picker !== null && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(asset, alt) => {
            if (picker === 0) onChange({ ...h, heroImageId: asset.id, heroImageAlt: alt });
            else updateSlide(picker - 1, { ...heroSlides[picker - 1], imageId: asset.id, imageAlt: alt });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
