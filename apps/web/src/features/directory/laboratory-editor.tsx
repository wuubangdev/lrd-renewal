"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Eye, ImagePlus, Plus, Save, Send, Trash2 } from "lucide-react";
import { api, matchVersion } from "@/lib/browser-api";
import { EnglishVersionButton } from "@/features/localization/english-version-button";
import { MediaPicker } from "@/features/media/media-picker";
import { staffTemplateLabels } from "./contracts";
import type {
  LabContent,
  LabCourse,
  LabEquipment,
  LabPublication,
  LaboratoryDetails,
  LaboratoryProfile,
} from "./laboratory-contracts";
const topics = [
  "Giới thiệu & liên hệ",
  "Thiết bị",
  "Học phần",
  "Nghiên cứu",
  "Công bố",
  "Hiển thị",
];
function Field({
  label,
  value,
  change,
  multiline = false,
  max = 20000,
}: {
  label: string;
  value: string;
  change: (value: string) => void;
  multiline?: boolean;
  max?: number;
}) {
  return (
    <label className="staff-field">
      {label}
      {multiline ? (
        <textarea
          rows={5}
          maxLength={max}
          value={value || ""}
          onChange={(event) => change(event.target.value)}
        />
      ) : (
        <input
          maxLength={max}
          value={value || ""}
          onChange={(event) => change(event.target.value)}
        />
      )}
    </label>
  );
}
const blankEquipment = (): LabEquipment => ({
  name: "",
  quantity: "",
  description: "",
  imageId: null,
  imageAlt: "",
});
const blankCourse = (): LabCourse => ({
  name: "",
  code: "",
  level: "UNDERGRADUATE",
  description: "",
});
const blankPublication = (): LabPublication => ({ citation: "", year: "", url: "" });
export function LaboratoryEditor({ initial }: { initial: LaboratoryProfile }) {
  const [profile, setProfile] = useState(initial);
  const [draft, setDraft] = useState(initial.draft);
  const [topic, setTopic] = useState(0);
  const [picker, setPicker] = useState<"cover" | number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const createFlow = initial.version === 0 && !profile.live;
  const dirty = JSON.stringify(draft) !== JSON.stringify(profile.draft);
  useEffect(() => {
    const protect = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  function change<K extends keyof LaboratoryDetails>(key: K, value: LaboratoryDetails[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
  }
  function content<K extends keyof LabContent>(key: K, value: LabContent[K]) {
    setDraft((current) => ({ ...current, content: { ...current.content, [key]: value } }));
    setNotice("");
  }
  function equipment(index: number, value: LabEquipment) {
    content(
      "equipment",
      draft.content.equipment.map((row, at) => (at === index ? value : row)),
    );
  }
  function course(index: number, value: LabCourse) {
    content(
      "courses",
      draft.content.courses.map((row, at) => (at === index ? value : row)),
    );
  }
  function publication(index: number, value: LabPublication) {
    content(
      "publications",
      draft.content.publications.map((row, at) => (at === index ? value : row)),
    );
  }
  async function save() {
    if (!dirty) return profile;
    const next = await api<LaboratoryProfile>(`/admin/laboratories/${profile.id}/draft`, {
      method: "PATCH",
      headers: matchVersion(profile.version),
      body: JSON.stringify(draft),
    });
    setProfile(next);
    setDraft(next.draft);
    setNotice("Đã lưu bản nháp.");
    return next;
  }
  async function run(action: "save" | "publish" | "preview" | "withdraw") {
    if (action === "withdraw" && !window.confirm("Gỡ phòng thí nghiệm khỏi website?")) return;
    const tab = action === "preview" ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const saved = action === "withdraw" ? profile : await save();
      if (action === "publish") {
        const next = await api<LaboratoryProfile>(`/admin/laboratories/${profile.id}/publish`, {
          method: "POST",
          headers: matchVersion(saved.version),
          body: JSON.stringify({ draftVersion: saved.draftVersion }),
        });
        setProfile(next);
        setDraft(next.draft);
        setNotice("Phòng thí nghiệm đã được đăng công khai.");
      } else if (action === "withdraw") {
        const next = await api<LaboratoryProfile>(`/admin/laboratories/${profile.id}/withdraw`, {
          method: "POST",
          headers: matchVersion(profile.version),
        });
        setProfile(next);
        setNotice("Đã gỡ trang công khai.");
      } else if (action === "preview") {
        if (tab) tab.location.href = `/admin/laboratories/${profile.id}/preview`;
        else setError("Trình duyệt chặn tab xem trước.");
      }
    } catch (cause) {
      tab?.close();
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="staff-editor">
      <header className="admin-topbar staff-editor-bar">
        <Link href="/admin/laboratories">
          <ArrowLeft size={16} /> Phòng thí nghiệm
        </Link>
        <span className={`badge ${profile.live ? "published" : "draft"}`}>
          {busy
            ? "Đang xử lý…"
            : dirty
              ? "Chưa lưu"
              : notice.startsWith("Đã lưu")
                ? "Đã lưu nháp"
                : profile.live
                  ? "Công khai"
                  : "Bản nháp"}
        </span>
        <div className="row-actions">
          <EnglishVersionButton
            kind="LABORATORY"
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
          {!createFlow && (
            <button
              className="button primary"
              disabled={busy || draft.name.trim().length < 3 || !draft.summary.trim()}
              onClick={() => run("publish")}
            >
              <Send size={16} /> Đăng công khai
            </button>
          )}
        </div>
      </header>
      <div className="admin-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CƠ SỞ VẬT CHẤT CÓ CẤU TRÚC</p>
            <h1>{draft.name || "Phòng thí nghiệm mới"}</h1>
            <p className="muted">
              {createFlow
                ? `Bước ${topic + 1}/${topics.length}: ${topics[topic]}. `
                : "Chọn chủ đề để chỉnh sửa. "}
              Mỗi thiết bị, học phần và công bố là một dòng riêng.
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
          className="staff-topic-nav"
          aria-label={createFlow ? "Các bước tạo phòng thí nghiệm" : "Chủ đề phòng thí nghiệm"}
        >
          {topics.map((label, index) => (
            <button
              type="button"
              key={label}
              className={topic === index ? "active" : ""}
              disabled={createFlow && index > topic}
              onClick={() => !createFlow && setTopic(index)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </button>
          ))}
        </nav>
        <fieldset disabled={busy} className="staff-editor-grid">
          <div className="staff-editor-main">
            {topic === 0 && (
              <>
                <section className="staff-editor-section">
                  <h2>Thông tin chính</h2>
                  <div className="staff-field-grid">
                    <Field
                      label="Tên phòng *"
                      value={draft.name}
                      change={(v) => change("name", v)}
                      max={200}
                    />
                    <Field
                      label="Tên ngắn / tiếng Anh"
                      value={draft.shortName}
                      change={(v) => change("shortName", v)}
                      max={120}
                    />
                    <Field
                      label="Đường dẫn *"
                      value={draft.slug}
                      change={(v) => change("slug", v)}
                      max={160}
                    />
                    <Field
                      label="Người phụ trách"
                      value={draft.lead}
                      change={(v) => change("lead", v)}
                      max={200}
                    />
                    <Field
                      label="Địa điểm"
                      value={draft.location}
                      change={(v) => change("location", v)}
                      max={300}
                    />
                    <Field
                      label="Email liên hệ"
                      value={draft.email}
                      change={(v) => change("email", v)}
                      max={160}
                    />
                    <Field
                      label="Điện thoại"
                      value={draft.phone}
                      change={(v) => change("phone", v)}
                      max={80}
                    />
                  </div>
                  <Field
                    label="Giới thiệu ngắn *"
                    value={draft.summary}
                    change={(v) => change("summary", v)}
                    multiline
                    max={1000}
                  />
                  <Field
                    label="Giới thiệu chi tiết"
                    value={draft.content.overview}
                    change={(v) => content("overview", v)}
                    multiline
                  />
                </section>
                <section className="staff-editor-section">
                  <h2>Chức năng và nhiệm vụ</h2>
                  <Field
                    label="Chức năng"
                    value={draft.content.functions}
                    change={(v) => content("functions", v)}
                    multiline
                  />
                  <Field
                    label="Nhiệm vụ"
                    value={draft.content.duties}
                    change={(v) => content("duties", v)}
                    multiline
                  />
                </section>
              </>
            )}
            {topic === 1 && (
              <section className="staff-editor-section">
                <div className="staff-section-head">
                  <div>
                    <h2>Trang thiết bị</h2>
                    <p>Thêm từng thiết bị, số lượng và ảnh minh họa.</p>
                  </div>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      content("equipment", [...draft.content.equipment, blankEquipment()])
                    }
                  >
                    <Plus size={16} /> Thêm thiết bị
                  </button>
                </div>
                <div className="staff-entry-list">
                  {draft.content.equipment.map((row, index) => (
                    <div className="staff-entry-card" key={index}>
                      <div className="staff-entry-card-head">
                        <strong>{row.name || `Thiết bị ${index + 1}`}</strong>
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label={`Xóa thiết bị ${index + 1}`}
                          onClick={() =>
                            content(
                              "equipment",
                              draft.content.equipment.filter((_, at) => at !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="staff-field-grid">
                        <Field
                          label="Tên thiết bị"
                          value={row.name}
                          change={(v) => equipment(index, { ...row, name: v })}
                          max={300}
                        />
                        <Field
                          label="Số lượng"
                          value={row.quantity}
                          change={(v) => equipment(index, { ...row, quantity: v })}
                          max={80}
                        />
                      </div>
                      <Field
                        label="Mô tả"
                        value={row.description}
                        change={(v) => equipment(index, { ...row, description: v })}
                        multiline
                        max={2000}
                      />
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setPicker(index)}
                      >
                        <ImagePlus size={16} />{" "}
                        {row.imageId ? "Đổi ảnh thiết bị" : "Chọn ảnh thiết bị"}
                      </button>
                      {row.imageId && (
                        <img
                          className="staff-block-image"
                          src={`/api/v1/admin/media/${row.imageId}`}
                          alt={row.imageAlt}
                        />
                      )}
                      <Field
                        label="Mô tả ảnh"
                        value={row.imageAlt}
                        change={(v) => equipment(index, { ...row, imageAlt: v })}
                        max={300}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {topic === 2 && (
              <section className="staff-editor-section">
                <div className="staff-section-head">
                  <div>
                    <h2>Học phần giảng dạy</h2>
                    <p>Mỗi học phần có bậc học, mã và mô tả riêng.</p>
                  </div>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => content("courses", [...draft.content.courses, blankCourse()])}
                  >
                    <Plus size={16} /> Thêm học phần
                  </button>
                </div>
                <div className="staff-entry-list">
                  {draft.content.courses.map((row, index) => (
                    <div className="staff-entry-card" key={index}>
                      <div className="staff-entry-card-head">
                        <strong>{row.name || `Học phần ${index + 1}`}</strong>
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label={`Xóa học phần ${index + 1}`}
                          onClick={() =>
                            content(
                              "courses",
                              draft.content.courses.filter((_, at) => at !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="staff-field-grid">
                        <Field
                          label="Tên học phần"
                          value={row.name}
                          change={(v) => course(index, { ...row, name: v })}
                          max={300}
                        />
                        <Field
                          label="Mã học phần"
                          value={row.code}
                          change={(v) => course(index, { ...row, code: v })}
                          max={40}
                        />
                        <label className="staff-field">
                          Bậc học
                          <select
                            value={row.level}
                            onChange={(event) =>
                              course(index, {
                                ...row,
                                level: event.target.value as LabCourse["level"],
                              })
                            }
                          >
                            <option value="UNDERGRADUATE">Đại học</option>
                            <option value="POSTGRADUATE">Sau đại học</option>
                          </select>
                        </label>
                      </div>
                      <Field
                        label="Mô tả"
                        value={row.description}
                        change={(v) => course(index, { ...row, description: v })}
                        multiline
                        max={1000}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}
            {topic === 3 && (
              <>
                <section className="staff-editor-section">
                  <h2>Định hướng nghiên cứu</h2>
                  <Field
                    label="Giới thiệu hoạt động nghiên cứu"
                    value={draft.content.researchDescription}
                    change={(v) => content("researchDescription", v)}
                    multiline
                  />
                </section>
                <section className="staff-editor-section">
                  <div className="staff-section-head">
                    <div>
                      <h2>Lĩnh vực nghiên cứu</h2>
                      <p>Mỗi lĩnh vực là một dòng riêng.</p>
                    </div>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => content("researchAreas", [...draft.content.researchAreas, ""])}
                    >
                      <Plus size={16} /> Thêm lĩnh vực
                    </button>
                  </div>
                  {draft.content.researchAreas.map((area, index) => (
                    <div className="staff-inline-row" key={index}>
                      <Field
                        label={`Lĩnh vực ${index + 1}`}
                        value={area}
                        change={(v) =>
                          content(
                            "researchAreas",
                            draft.content.researchAreas.map((item, at) =>
                              at === index ? v : item,
                            ),
                          )
                        }
                        max={1000}
                      />
                      <button
                        type="button"
                        className="icon-button danger-text"
                        aria-label={`Xóa lĩnh vực ${index + 1}`}
                        onClick={() =>
                          content(
                            "researchAreas",
                            draft.content.researchAreas.filter((_, at) => at !== index),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </section>
              </>
            )}
            {topic === 4 && (
              <section className="staff-editor-section">
                <div className="staff-section-head">
                  <div>
                    <h2>Công bố khoa học</h2>
                    <p>Nhập trích dẫn, năm và liên kết cho từng công trình.</p>
                  </div>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      content("publications", [...draft.content.publications, blankPublication()])
                    }
                  >
                    <Plus size={16} /> Thêm công bố
                  </button>
                </div>
                <div className="staff-entry-list">
                  {draft.content.publications.map((row, index) => (
                    <div className="staff-entry-card" key={index}>
                      <div className="staff-entry-card-head">
                        <strong>{row.citation || `Công bố ${index + 1}`}</strong>
                        <button
                          type="button"
                          className="icon-button danger-text"
                          aria-label={`Xóa công bố ${index + 1}`}
                          onClick={() =>
                            content(
                              "publications",
                              draft.content.publications.filter((_, at) => at !== index),
                            )
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <Field
                        label="Trích dẫn"
                        value={row.citation}
                        change={(v) => publication(index, { ...row, citation: v })}
                        multiline
                        max={5000}
                      />
                      <div className="staff-field-grid">
                        <Field
                          label="Năm"
                          value={row.year}
                          change={(v) => publication(index, { ...row, year: v })}
                          max={60}
                        />
                        <Field
                          label="Liên kết HTTPS"
                          value={row.url}
                          change={(v) => publication(index, { ...row, url: v })}
                          max={500}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {topic === 5 && (
              <>
                <section className="staff-editor-section">
                  <h2>Ảnh và cách hiển thị</h2>
                  {draft.coverId && (
                    <img
                      className="staff-editor-portrait"
                      src={`/api/v1/admin/media/${draft.coverId}`}
                      alt={draft.coverAlt}
                    />
                  )}
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setPicker("cover")}
                  >
                    <ImagePlus size={16} /> {draft.coverId ? "Đổi ảnh bìa" : "Chọn ảnh bìa"}
                  </button>
                  <Field
                    label="Mô tả ảnh"
                    value={draft.coverAlt}
                    change={(v) => change("coverAlt", v)}
                    max={300}
                  />
                  <div className="staff-template-options">
                    {Object.entries(staffTemplateLabels).map(([key, label]) => (
                      <label key={key}>
                        <input
                          type="radio"
                          name="lab-template"
                          checked={draft.template === key}
                          onChange={() => change("template", key as LaboratoryDetails["template"])}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </section>
                <section className="staff-editor-section">
                  <h2>Thông tin bổ sung</h2>
                  <Field
                    label="Ghi chú công khai khác"
                    value={draft.content.additionalNotes}
                    change={(v) => content("additionalNotes", v)}
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
                  Tiếp theo: {topics[topic + 1]} <ArrowRight size={16} />
                </button>
              )}
              {topic === topics.length - 1 && (
                <button
                  type="button"
                  className="button primary"
                  disabled={draft.name.trim().length < 3 || !draft.summary.trim()}
                  onClick={() => run("publish")}
                >
                  <Send size={16} /> Đăng công khai
                </button>
              )}
            </div>
          </div>
          <aside className="staff-editor-aside">
            <section className="staff-editor-section">
              <h2>Hồ sơ phòng thí nghiệm</h2>
              <p className="field-hint">
                {createFlow
                  ? "Tạo hồ sơ theo từng bước; có thể lưu nháp bất kỳ lúc nào."
                  : "Chọn chủ đề để sửa thông tin."}
              </p>
              <ol className="staff-progress-list">
                {topics.map((label, index) => (
                  <li key={label} className={topic === index ? "active" : ""}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {label}
                  </li>
                ))}
              </ol>
            </section>
            {profile.live && (
              <section className="staff-editor-section">
                <Link
                  className="text-link"
                  href={`/${profile.locale}/phong-thi-nghiem/${profile.live.slug}`}
                  target="_blank"
                >
                  Xem trang công khai ↗
                </Link>
                <button
                  type="button"
                  className="text-button danger"
                  onClick={() => run("withdraw")}
                >
                  Gỡ trang công khai
                </button>
              </section>
            )}
          </aside>
        </fieldset>
      </div>
      {picker !== null && (
        <MediaPicker
          onClose={() => setPicker(null)}
          onSelect={(asset, alt) => {
            if (picker === "cover")
              setDraft((current) => ({ ...current, coverId: asset.id, coverAlt: alt }));
            else
              equipment(picker, {
                ...draft.content.equipment[picker],
                imageId: asset.id,
                imageAlt: alt,
              });
            setPicker(null);
          }}
        />
      )}
    </div>
  );
}
