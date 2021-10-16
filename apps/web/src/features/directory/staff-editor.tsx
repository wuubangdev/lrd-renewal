"use client";
import { useUnsavedChanges } from "@/components/unsaved-changes";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Eye, ImagePlus, Plus, Save, Send, Trash2 } from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import { EnglishVersionButton } from "@/features/localization/english-version-button";
import { MediaPicker } from "@/features/media/media-picker";
import {
  staffStatus,
  staffTemplateLabels,
  type StaffAcademicInfo,
  type StaffActivity,
  type StaffCareer,
  type StaffDetails,
  type StaffEducation,
  type StaffProfile,
} from "./contracts";
import { statusLabels } from "@/lib/contracts";

const topics = [
  { id: "identity", label: "Lý lịch khoa học" },
  { id: "education", label: "Đào tạo" },
  { id: "career", label: "Công tác" },
  { id: "research", label: "Nghiên cứu" },
  { id: "publication", label: "Công bố & học liệu" },
  { id: "activities", label: "Hoạt động khác" },
  { id: "presentation", label: "Hiển thị & nội bộ" },
] as const;
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160);
const emptyEducation = (): StaffEducation => ({
  degree: "",
  period: "",
  institution: "",
  major: "",
  graduationYear: "",
  thesis: "",
  mode: "",
});
const emptyCareer = (): StaffCareer => ({ period: "", institution: "", role: "", description: "" });
const emptyActivity = (): StaffActivity => ({
  title: "",
  period: "",
  organization: "",
  role: "",
  description: "",
  url: "",
});
type ArrayKey =
  | "undergraduate"
  | "postgraduate"
  | "workHistory"
  | "researchProjects"
  | "publications"
  | "books"
  | "supervisions"
  | "trainingCourses"
  | "awards"
  | "memberships"
  | "otherActivities";
function Field({
  label,
  value,
  onChange,
  max = 500,
  multiline = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: number;
  multiline?: boolean;
  hint?: string;
}) {
  return (
    <label className="staff-field">
      {label}
      {hint && <small>{hint}</small>}
      {multiline ? (
        <textarea
          value={value || ""}
          maxLength={max}
          rows={4}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          value={value || ""}
          maxLength={max}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
const educationFields: { key: keyof StaffEducation; label: string; max?: number }[] = [
  { key: "degree", label: "Bậc học / học vị" },
  { key: "period", label: "Thời gian đào tạo" },
  { key: "institution", label: "Cơ sở đào tạo" },
  { key: "major", label: "Chuyên ngành" },
  { key: "graduationYear", label: "Năm tốt nghiệp / cấp bằng" },
  { key: "mode", label: "Hình thức đào tạo" },
  { key: "thesis", label: "Tên luận văn / luận án", max: 2000 },
];
const careerFields: { key: keyof StaffCareer; label: string; max?: number }[] = [
  { key: "period", label: "Thời gian" },
  { key: "institution", label: "Đơn vị công tác" },
  { key: "role", label: "Chức vụ / công việc" },
  { key: "description", label: "Mô tả", max: 3000 },
];
const activityFields: { key: keyof StaffActivity; label: string; max?: number }[] = [
  { key: "title", label: "Tên đề tài / công trình / hoạt động", max: 1000 },
  { key: "period", label: "Năm / giai đoạn" },
  { key: "organization", label: "Đơn vị / nơi công bố" },
  { key: "role", label: "Vai trò" },
  { key: "description", label: "Chi tiết", max: 10000 },
  { key: "url", label: "Liên kết HTTPS" },
];

export function StaffEditor({ initial }: { initial: StaffProfile }) {
  const [profile, setProfile] = useState(initial);
  const [draft, setDraft] = useState(initial.draft);
  const [topic, setTopic] = useState(0);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const createFlow = initial.version === 0 && !profile.live;
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile.draft);
  useUnsavedChanges(dirty);
  function change<K extends keyof StaffDetails>(key: K, value: StaffDetails[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  }
  function changeAcademic<K extends keyof StaffAcademicInfo>(key: K, value: StaffAcademicInfo[K]) {
    setDraft((current) => ({ ...current, academic: { ...current.academic, [key]: value } }));
    setNotice("");
  }
  function updateRow<T extends StaffEducation | StaffCareer | StaffActivity>(
    key: ArrayKey,
    index: number,
    row: T,
  ) {
    const list = draft.academic[key] as T[];
    changeAcademic(key, list.map((item, at) => (at === index ? row : item)) as never);
  }
  function addRow(key: ArrayKey, row: StaffEducation | StaffCareer | StaffActivity) {
    changeAcademic(key, [...draft.academic[key], row] as never);
  }
  function removeRow(key: ArrayKey, index: number) {
    changeAcademic(key, draft.academic[key].filter((_, at) => at !== index) as never);
  }
  async function save(): Promise<StaffProfile> {
    if (!dirty) return profile;
    const next = await api<StaffProfile>(`/admin/people/${profile.id}/draft`, {
      method: "PATCH",
      headers: matchVersion(profile.version),
      body: JSON.stringify(draft),
    });
    setProfile(next);
    setDraft(next.draft);
    setNotice("Đã lưu bản nháp hồ sơ.");
    return next;
  }
  async function run(action: "save" | "publish" | "preview" | "withdraw") {
    if (action === "withdraw" && !window.confirm("Gỡ hồ sơ khỏi website? Bản nháp vẫn được giữ."))
      return;
    const tab = action === "preview" ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = action === "withdraw" ? profile : await save();
      if (action === "publish") {
        const next = await api<StaffProfile>(`/admin/people/${profile.id}/publish`, {
          method: "POST",
          headers: matchVersion(saved.version),
          body: JSON.stringify({ draftVersion: saved.draftVersion }),
        });
        setProfile(next);
        setDraft(next.draft);
        setNotice("Hồ sơ đã được đăng công khai.");
      } else if (action === "withdraw") {
        const next = await api<StaffProfile>(`/admin/people/${profile.id}/withdraw`, {
          method: "POST",
          headers: matchVersion(profile.version),
        });
        setProfile(next);
        setNotice("Đã gỡ hồ sơ khỏi website.");
      } else if (action === "preview") {
        if (tab) tab.location.href = `/admin/staff/${profile.id}/preview`;
        else setError("Trình duyệt chặn tab xem trước.");
      }
    } catch (cause) {
      tab?.close();
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function educationList(key: "undergraduate" | "postgraduate", title: string) {
    return (
      <section className="staff-editor-section">
        <div className="staff-section-head">
          <div>
            <h2>{title}</h2>
            <p>Thêm một dòng cho mỗi bằng cấp hoặc giai đoạn đào tạo.</p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => addRow(key, emptyEducation())}
          >
            <Plus size={16} /> Thêm dòng
          </button>
        </div>
        <div className="staff-entry-list">
          {draft.academic[key].map((row, index) => (
            <div className="staff-entry-card" key={index}>
              <div className="staff-entry-card-head">
                <strong>{row.degree || `${title} ${index + 1}`}</strong>
                <button
                  className="icon-button danger-text"
                  type="button"
                  aria-label={`Xóa dòng ${index + 1}`}
                  onClick={() => removeRow(key, index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="staff-field-grid">
                {educationFields.map(({ key: field, label, max }) => (
                  <Field
                    key={field}
                    label={label}
                    value={row[field]}
                    max={max}
                    multiline={field === "thesis"}
                    onChange={(value) => updateRow(key, index, { ...row, [field]: value })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {!draft.academic[key].length && (
          <p className="field-hint">
            Chưa có dòng nào. Các mục để trống sẽ không hiển thị công khai.
          </p>
        )}
      </section>
    );
  }
  function activityList(
    key: Exclude<ArrayKey, "undergraduate" | "postgraduate" | "workHistory">,
    title: string,
  ) {
    return (
      <section className="staff-editor-section">
        <div className="staff-section-head">
          <div>
            <h2>{title}</h2>
            <p>Mỗi công trình hoặc hoạt động là một bản ghi riêng.</p>
          </div>
          <button
            type="button"
            className="button secondary"
            onClick={() => addRow(key, emptyActivity())}
          >
            <Plus size={16} /> Thêm dòng
          </button>
        </div>
        <div className="staff-entry-list">
          {draft.academic[key].map((row, index) => (
            <div className="staff-entry-card" key={index}>
              <div className="staff-entry-card-head">
                <strong>{row.title || `Mục ${index + 1}`}</strong>
                <button
                  className="icon-button danger-text"
                  type="button"
                  aria-label={`Xóa dòng ${index + 1}`}
                  onClick={() => removeRow(key, index)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="staff-field-grid">
                {activityFields.map(({ key: field, label, max }) => (
                  <Field
                    key={field}
                    label={label}
                    value={row[field]}
                    max={max}
                    multiline={field === "description"}
                    onChange={(value) => updateRow(key, index, { ...row, [field]: value })}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        {!draft.academic[key].length && <p className="field-hint">Chưa có dòng nào.</p>}
      </section>
    );
  }
  return (
    <div className="staff-editor">
      <header className="admin-topbar staff-editor-bar">
        <Link href="/admin/staff">
          <ArrowLeft size={16} /> Cán bộ
        </Link>
        <span className={`badge ${staffStatus(profile).toLowerCase()}`}>
          {busy
            ? "Đang xử lý…"
            : dirty
              ? "Chưa lưu"
              : notice.startsWith("Đã lưu")
                ? "Đã lưu nháp"
                : statusLabels[staffStatus(profile)]}
        </span>
        <div className="row-actions">
          <EnglishVersionButton
            kind="STAFF"
            sourceId={profile.id}
            locale={profile.locale}
            dirty={dirty || busy}
            sourceReady={!!draft.name.trim()}
          />
          <button className="button secondary" disabled={busy} onClick={() => run("preview")}>
            <Eye size={16} /> Xem trước
          </button>
          <button
            className="button secondary"
            data-admin-save
            title="Lưu bản nháp (Ctrl/Cmd+S). Chưa đăng công khai."
            disabled={busy || !dirty}
            onClick={() => run("save")}
          >
            <Save size={16} /> Lưu nháp
          </button>
          <button
            className="button primary"
            disabled={busy || draft.name.trim().length < 3}
            onClick={() => run("publish")}
          >
            <Send size={16} /> {profile.live ? "Cập nhật công khai" : "Đăng công khai"}
          </button>
        </div>
      </header>
      <div className="admin-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HỒ SƠ CÁN BỘ CÓ CẤU TRÚC</p>
            <h1>{draft.name || "Hồ sơ mới"}</h1>
            <p className="muted">
              {createFlow
                ? `Bước ${topic + 1}/${topics.length}: ${topics[topic].label}. `
                : "Chọn chủ đề bên dưới để chỉnh sửa. "}
              Các trường trống sẽ không hiển thị công khai.
            </p>
          </div>
        </div>
        {error && (
          <p className="alert error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="alert success" role="status">
            {notice}
          </p>
        )}
        <nav
          className={`staff-topic-nav ${createFlow ? "is-stepper" : ""}`}
          aria-label={createFlow ? "Các bước tạo hồ sơ" : "Chủ đề hồ sơ"}
        >
          {topics.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={topic === index ? "active" : ""}
              aria-current={topic === index ? "step" : undefined}
              onClick={() => !createFlow && setTopic(index)}
              disabled={createFlow && index > topic}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <fieldset disabled={busy} className="staff-editor-grid">
          <div className="staff-editor-main">
            {topic === 0 && (
              <>
                <section className="staff-editor-section">
                  <h2>Thông tin cá nhân & học thuật</h2>
                  <div className="staff-field-grid">
                    <Field
                      label="Họ và tên *"
                      value={draft.name}
                      onChange={(v) => change("name", v)}
                      max={160}
                    />
                    <Field
                      label="Học hàm / danh xưng"
                      value={draft.academicTitle}
                      onChange={(v) => change("academicTitle", v)}
                      max={100}
                    />
                    <Field
                      label="Học vị cao nhất"
                      value={draft.degree}
                      onChange={(v) => change("degree", v)}
                      max={100}
                    />
                    <Field
                      label="Năm nhận học vị"
                      value={draft.academic.highestDegreeYear}
                      onChange={(v) => changeAcademic("highestDegreeYear", v)}
                      max={60}
                    />
                    <Field
                      label="Chức danh khoa học"
                      value={draft.academic.academicRank}
                      onChange={(v) => changeAcademic("academicRank", v)}
                      max={120}
                    />
                    <Field
                      label="Năm phong chức danh"
                      value={draft.academic.academicRankYear}
                      onChange={(v) => changeAcademic("academicRankYear", v)}
                      max={60}
                    />
                    <Field
                      label="Ngày sinh"
                      value={draft.academic.birthDate}
                      onChange={(v) => changeAcademic("birthDate", v)}
                      max={80}
                    />
                    <Field
                      label="Nơi sinh"
                      value={draft.academic.birthPlace}
                      onChange={(v) => changeAcademic("birthPlace", v)}
                      max={200}
                    />
                    <Field
                      label="Chức vụ"
                      value={draft.position}
                      onChange={(v) => change("position", v)}
                      max={120}
                    />
                    <Field
                      label="Đơn vị"
                      value={draft.unit}
                      onChange={(v) => change("unit", v)}
                      max={160}
                    />
                    <Field
                      label="Đường dẫn hồ sơ"
                      value={draft.slug}
                      onChange={(v) => change("slug", v)}
                      max={160}
                    />
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() =>
                      change(
                        "slug",
                        slugify([draft.academicTitle, draft.name].filter(Boolean).join(" ")),
                      )
                    }
                  >
                    Tạo đường dẫn từ tên
                  </button>
                  <Field
                    label="Giới thiệu ngắn"
                    value={draft.summary}
                    onChange={(v) => change("summary", v)}
                    max={1000}
                    multiline
                  />
                  <Field
                    label="Lĩnh vực nghiên cứu chính"
                    value={draft.academic.researchInterests}
                    onChange={(v) => changeAcademic("researchInterests", v)}
                    max={3000}
                    multiline
                  />
                  <label className="staff-field">
                    Lĩnh vực chuyên môn <small>Mỗi dòng một lĩnh vực</small>
                    <textarea
                      rows={4}
                      value={draft.specialties.join("\n")}
                      onChange={(e) =>
                        change(
                          "specialties",
                          e.target.value
                            .split("\n")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        )
                      }
                    />
                  </label>
                </section>
                <section className="staff-editor-section">
                  <h2>Liên hệ công khai</h2>
                  <div className="staff-field-grid">
                    <Field label="Email" value={draft.email} onChange={(v) => change("email", v)} />
                    <Field
                      label="Điện thoại"
                      value={draft.phone}
                      onChange={(v) => change("phone", v)}
                    />
                    <Field
                      label="Văn phòng"
                      value={draft.office}
                      onChange={(v) => change("office", v)}
                    />
                    <Field
                      label="Website HTTPS"
                      value={draft.website}
                      onChange={(v) => change("website", v)}
                    />
                  </div>
                </section>
              </>
            )}
            {topic === 1 && (
              <>
                {educationList("undergraduate", "Đào tạo đại học")}
                {educationList("postgraduate", "Đào tạo sau đại học")}
                <section className="staff-editor-section">
                  <div className="staff-section-head">
                    <div>
                      <h2>Ngoại ngữ</h2>
                      <p>Thêm một dòng cho mỗi ngoại ngữ.</p>
                    </div>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() =>
                        changeAcademic("languages", [
                          ...draft.academic.languages,
                          { language: "", proficiency: "", certificate: "" },
                        ])
                      }
                    >
                      <Plus size={16} /> Thêm dòng
                    </button>
                  </div>
                  <div className="staff-entry-list">
                    {draft.academic.languages.map((row, index) => (
                      <div className="staff-entry-card" key={index}>
                        <div className="staff-entry-card-head">
                          <strong>{row.language || `Ngoại ngữ ${index + 1}`}</strong>
                          <button
                            type="button"
                            className="icon-button danger-text"
                            aria-label={`Xóa ngoại ngữ ${index + 1}`}
                            onClick={() =>
                              changeAcademic(
                                "languages",
                                draft.academic.languages.filter((_, at) => at !== index),
                              )
                            }
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="staff-field-grid">
                          <Field
                            label="Ngoại ngữ"
                            value={row.language}
                            onChange={(value) =>
                              changeAcademic(
                                "languages",
                                draft.academic.languages.map((item, at) =>
                                  at === index ? { ...item, language: value } : item,
                                ),
                              )
                            }
                          />
                          <Field
                            label="Mức độ thành thạo"
                            value={row.proficiency}
                            onChange={(value) =>
                              changeAcademic(
                                "languages",
                                draft.academic.languages.map((item, at) =>
                                  at === index ? { ...item, proficiency: value } : item,
                                ),
                              )
                            }
                          />
                          <Field
                            label="Chứng chỉ"
                            value={row.certificate}
                            onChange={(value) =>
                              changeAcademic(
                                "languages",
                                draft.academic.languages.map((item, at) =>
                                  at === index ? { ...item, certificate: value } : item,
                                ),
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            {topic === 2 && (
              <section className="staff-editor-section">
                <div className="staff-section-head">
                  <div>
                    <h2>Quá trình công tác</h2>
                    <p>Mỗi giai đoạn công tác là một dòng riêng.</p>
                  </div>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => addRow("workHistory", emptyCareer())}
                  >
                    <Plus size={16} /> Thêm dòng
                  </button>
                </div>
                <div className="staff-entry-list">
                  {draft.academic.workHistory.map((row, index) => (
                    <div className="staff-entry-card" key={index}>
                      <div className="staff-entry-card-head">
                        <strong>{row.role || row.institution || `Giai đoạn ${index + 1}`}</strong>
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label={`Xóa dòng ${index + 1}`}
                          onClick={() => removeRow("workHistory", index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="staff-field-grid">
                        {careerFields.map(({ key, label, max }) => (
                          <Field
                            key={key}
                            label={label}
                            value={row[key]}
                            max={max}
                            multiline={key === "description"}
                            onChange={(value) =>
                              updateRow("workHistory", index, { ...row, [key]: value })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {topic === 3 && activityList("researchProjects", "Đề tài và dự án nghiên cứu")}
            {topic === 4 && (
              <>
                {activityList("publications", "Công trình khoa học")}
                {activityList("books", "Sách và giáo trình")}
                {activityList("supervisions", "Hướng dẫn học viên")}
              </>
            )}
            {topic === 5 && (
              <>
                {activityList("trainingCourses", "Khóa học và tập huấn")}
                {activityList("awards", "Giải thưởng và khen thưởng")}
                {activityList("memberships", "Tổ chức khoa học")}
                {activityList("otherActivities", "Hoạt động chuyên môn khác")}
              </>
            )}
            {topic === 6 && (
              <>
                <section className="staff-editor-section">
                  <h2>Ảnh chân dung</h2>
                  {draft.portraitId && (
                    <img
                      className="staff-editor-portrait"
                      src={`/api/v1/admin/media/${draft.portraitId}`}
                      alt={draft.portraitAlt}
                    />
                  )}
                  <div className="row-actions">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setPicker(true)}
                    >
                      <ImagePlus size={16} /> {draft.portraitId ? "Đổi ảnh" : "Chọn ảnh"}
                    </button>
                    {draft.portraitId && (
                      <button
                        type="button"
                        className="text-button danger"
                        onClick={() => change("portraitId", null)}
                      >
                        Bỏ ảnh
                      </button>
                    )}
                  </div>
                  <Field
                    label="Mô tả ảnh"
                    value={draft.portraitAlt}
                    onChange={(v) => change("portraitAlt", v)}
                    max={300}
                  />
                </section>
                <section className="staff-editor-section">
                  <h2>Mẫu hiển thị</h2>
                  <div className="staff-template-options">
                    {Object.entries(staffTemplateLabels).map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="radio"
                          name="staff-template"
                          checked={draft.template === key}
                          onChange={() => change("template", key as StaffDetails["template"])}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </section>
                <section className="staff-editor-section">
                  <h2>Ghi chú nội bộ</h2>
                  <p className="field-hint">Không hiển thị công khai.</p>
                  {draft.privateFacts.map((fact, index) => (
                    <div className="staff-entry-card" key={index}>
                      <div className="staff-field-grid">
                        <Field
                          label="Nhãn"
                          value={fact.label}
                          onChange={(value) =>
                            change(
                              "privateFacts",
                              draft.privateFacts.map((item, at) =>
                                at === index ? { ...item, label: value } : item,
                              ),
                            )
                          }
                        />
                        <Field
                          label="Giá trị"
                          value={fact.value}
                          onChange={(value) =>
                            change(
                              "privateFacts",
                              draft.privateFacts.map((item, at) =>
                                at === index ? { ...item, value } : item,
                              ),
                            )
                          }
                          max={10000}
                          multiline
                        />
                      </div>
                      <button
                        type="button"
                        className="text-button danger"
                        onClick={() =>
                          change(
                            "privateFacts",
                            draft.privateFacts.filter((_, at) => at !== index),
                          )
                        }
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      change("privateFacts", [...draft.privateFacts, { label: "", value: "" }])
                    }
                  >
                    <Plus size={15} /> Thêm ghi chú riêng
                  </button>
                  <Field
                    label="Ghi chú chung"
                    value={draft.privateNotes}
                    onChange={(v) => change("privateNotes", v)}
                    max={20000}
                    multiline
                  />
                </section>
              </>
            )}
            <div className="staff-step-actions">
              {topic > 0 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setTopic(topic - 1)}
                >
                  <ArrowLeft size={16} /> Quay lại
                </button>
              )}
              {topic < topics.length - 1 && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setTopic(topic + 1)}
                >
                  Tiếp theo: {topics[topic + 1].label} <ArrowRight size={16} />
                </button>
              )}
              {topic === topics.length - 1 && (
                <button
                  type="button"
                  className="button primary"
                  disabled={draft.name.trim().length < 3}
                  onClick={() => run("publish")}
                >
                  <Send size={16} /> Đăng công khai
                </button>
              )}
            </div>
          </div>
          <aside className="staff-editor-aside">
            <section className="staff-editor-section">
              <h2>Tiến độ hồ sơ</h2>
              <p className="field-hint">
                {createFlow
                  ? "Tạo mới theo từng bước. Lưu nháp bất kỳ lúc nào."
                  : "Chọn một chủ đề để sửa nội dung."}
              </p>
              <ol className="staff-progress-list">
                {topics.map((item, index) => (
                  <li key={item.id} className={index === topic ? "active" : ""}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {item.label}
                  </li>
                ))}
              </ol>
            </section>
            {profile.live && (
              <section className="staff-editor-section">
                <h2>Xuất bản</h2>
                <Link
                  className="text-link"
                  href={`/${profile.locale}/can-bo/${profile.live.slug}`}
                  target="_blank"
                >
                  Xem hồ sơ công khai ↗
                </Link>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => run("withdraw")}
                >
                  Gỡ hồ sơ
                </button>
              </section>
            )}
          </aside>
        </fieldset>
      </div>
      {picker && (
        <MediaPicker
          onClose={() => setPicker(false)}
          onSelect={(asset, alt) => {
            setDraft((current) => ({ ...current, portraitId: asset.id, portraitAlt: alt }));
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
