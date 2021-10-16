"use client";
import { Plus, Trash2 } from "lucide-react";
import { CommonFields, ContactFields, NumberField, TextField } from "./fields";
import { degrees, type ProgramDraft, type Curriculum, type Accreditation } from "./contracts";
export function ProgramForm({
  value: d,
  onChange,
  tab,
}: {
  value: ProgramDraft;
  onChange: (d: ProgramDraft) => void;
  tab: string;
}) {
  const change = <K extends keyof ProgramDraft>(key: K, value: ProgramDraft[K]) =>
    onChange({ ...d, [key]: value });
  function curriculum(id: string, next: Curriculum) {
    change(
      "curricula",
      d.curricula.map((c) => (c.id === id ? next : c)),
    );
  }
  function accreditation(id: string, next: Accreditation) {
    change(
      "accreditations",
      d.accreditations.map((c) => (c.id === id ? next : c)),
    );
  }
  if (tab === "general")
    return (
      <>
        <CommonFields value={d} onChange={onChange} />
        <div className="academic-field-grid">
          <label>
            Văn bằng
            <select
              value={d.degree}
              onChange={(e) => change("degree", e.target.value as ProgramDraft["degree"])}
            >
              {Object.entries(degrees).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <TextField
            label="Đơn vị đào tạo"
            required
            value={d.unit}
            onChange={(v) => change("unit", v)}
          />
          <NumberField
            label="Thời lượng (tháng)"
            max={240}
            value={d.durationMonths}
            onChange={(v) => change("durationMonths", v)}
          />
          <NumberField
            label="Tổng tín chỉ chương trình"
            value={d.credits}
            onChange={(v) => change("credits", v)}
          />
        </div>
      </>
    );
  if (tab === "outcomes")
    return (
      <div className="academic-repeat-list">
        <p className="field-hint">
          Mỗi chuẩn đầu ra và cơ hội nghề nghiệp là một dòng riêng; tối đa 30 mục mỗi nhóm.
        </p>
        {(
          [
            ["outcomes", "Chuẩn đầu ra", "Thêm chuẩn đầu ra"],
            ["careers", "Cơ hội nghề nghiệp", "Thêm cơ hội"],
          ] as const
        ).map(([key, title, addLabel]) => (
          <section className="academic-repeat" key={key}>
            <div className="staff-section-head">
              <h3>{title}</h3>
              <button
                type="button"
                className="button secondary"
                disabled={d[key].length >= 30}
                onClick={() => change(key, [...d[key], ""])}
              >
                <Plus size={16} /> {addLabel}
              </button>
            </div>
            {d[key].map((line, index) => (
              <div className="staff-inline-row" key={index}>
                <TextField
                  label={`${title} ${index + 1}`}
                  max={1000}
                  value={line}
                  onChange={(value) =>
                    change(
                      key,
                      d[key].map((item, at) => (at === index ? value : item)),
                    )
                  }
                />
                <button
                  type="button"
                  className="icon-button danger-text"
                  aria-label={`Xóa ${title.toLowerCase()} ${index + 1}`}
                  onClick={() =>
                    change(
                      key,
                      d[key].filter((_, at) => at !== index),
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>
    );
  if (tab === "contact")
    return <ContactFields value={d.contact} onChange={(v) => change("contact", v)} />;
  if (tab === "curricula")
    return (
      <div className="academic-repeat-list">
        <p className="field-hint">
          Mỗi khóa áp dụng có tối đa một khung hiện hành. Giữ các khung cũ để người học tra cứu;
          cung cấp học phần hoặc tài liệu HTTPS cho từng khung.
        </p>
        {d.curricula.map((c, index) => (
          <section className="academic-repeat" key={c.id}>
            <div className="section-heading">
              <h3>Khung chương trình {index + 1}</h3>
              <button
                type="button"
                className="icon-button"
                aria-label={"Xóa khung " + (index + 1)}
                onClick={() =>
                  change(
                    "curricula",
                    d.curricula.filter((i) => i.id !== c.id),
                  )
                }
              >
                <Trash2 size={18} />
              </button>
            </div>
            <div className="academic-field-grid">
              <TextField
                label="Tên phiên bản"
                required
                max={160}
                value={c.name}
                onChange={(v) => curriculum(c.id, { ...c, name: v })}
              />
              <TextField
                label="Khóa áp dụng"
                required
                max={80}
                value={c.cohort}
                onChange={(v) => curriculum(c.id, { ...c, cohort: v })}
              />
              <TextField
                label="Hiệu lực từ"
                required
                type="date"
                value={c.effectiveFrom ?? ""}
                onChange={(v) => curriculum(c.id, { ...c, effectiveFrom: v || null })}
              />
              <TextField
                label="Hiệu lực đến"
                type="date"
                value={c.effectiveTo ?? ""}
                onChange={(v) => curriculum(c.id, { ...c, effectiveTo: v || null })}
              />
            </div>
            <label className="check-label">
              <input
                type="checkbox"
                checked={c.current}
                onChange={(e) => curriculum(c.id, { ...c, current: e.target.checked })}
              />
              Khung hiện hành cho khóa này
            </label>
            <TextField
              label="Tài liệu khung chương trình (HTTPS)"
              type="url"
              max={2048}
              value={c.documentUrl}
              onChange={(v) => curriculum(c.id, { ...c, documentUrl: v })}
            />
            <div className="academic-course-list">
              {c.courses.map((course, i) => (
                <fieldset className="academic-course" key={course.id}>
                  <legend>Học phần {i + 1}</legend>
                  <TextField
                    label="Mã học phần"
                    max={30}
                    value={course.code}
                    onChange={(v) =>
                      curriculum(c.id, {
                        ...c,
                        courses: c.courses.map((x) => (x.id === course.id ? { ...x, code: v } : x)),
                      })
                    }
                  />
                  <TextField
                    label="Tên học phần"
                    value={course.name}
                    onChange={(v) =>
                      curriculum(c.id, {
                        ...c,
                        courses: c.courses.map((x) => (x.id === course.id ? { ...x, name: v } : x)),
                      })
                    }
                  />
                  <NumberField
                    label="Tín chỉ"
                    max={30}
                    min={0.1}
                    step={0.1}
                    value={course.credits}
                    onChange={(v) =>
                      curriculum(c.id, {
                        ...c,
                        courses: c.courses.map((x) =>
                          x.id === course.id ? { ...x, credits: v ?? 0 } : x,
                        ),
                      })
                    }
                  />
                  <NumberField
                    label="Học kỳ"
                    max={16}
                    value={course.semester}
                    onChange={(v) =>
                      curriculum(c.id, {
                        ...c,
                        courses: c.courses.map((x) =>
                          x.id === course.id ? { ...x, semester: v ?? 0 } : x,
                        ),
                      })
                    }
                  />
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={course.elective}
                      onChange={(e) =>
                        curriculum(c.id, {
                          ...c,
                          courses: c.courses.map((x) =>
                            x.id === course.id ? { ...x, elective: e.target.checked } : x,
                          ),
                        })
                      }
                    />
                    Tự chọn
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={"Xóa học phần " + (i + 1)}
                    onClick={() =>
                      curriculum(c.id, {
                        ...c,
                        courses: c.courses.filter((x) => x.id !== course.id),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </fieldset>
              ))}
            </div>
            <div className="section-heading">
              <button
                type="button"
                className="button secondary"
                disabled={c.courses.length >= 150}
                onClick={() =>
                  curriculum(c.id, {
                    ...c,
                    courses: [
                      ...c.courses,
                      {
                        id: crypto.randomUUID(),
                        code: "",
                        name: "",
                        credits: 3,
                        semester: 1,
                        elective: false,
                      },
                    ],
                  })
                }
              >
                <Plus size={16} />
                Thêm học phần
              </button>
              <small>
                {c.courses.length} học phần ·{" "}
                {c.courses.reduce((sum, x) => sum + x.credits, 0).toLocaleString("vi-VN")} tín chỉ
                kê khai
              </small>
            </div>
          </section>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={d.curricula.length >= 20}
          onClick={() =>
            change("curricula", [
              ...d.curricula,
              {
                id: crypto.randomUUID(),
                name: "",
                cohort: "",
                current: false,
                effectiveFrom: null,
                effectiveTo: null,
                documentUrl: "",
                courses: [],
              },
            ])
          }
        >
          <Plus size={17} />
          Thêm khung chương trình
        </button>
      </div>
    );
  return (
    <div className="academic-repeat-list">
      <p className="field-hint">
        Nhập chứng nhận đã có minh chứng. Website tính hiệu lực theo ngày Việt Nam; để trống ngày
        hết hạn sẽ hiển thị “Chưa ghi ngày hết hạn”.
      </p>
      {d.accreditations.map((c, index) => (
        <section key={c.id} className="academic-repeat">
          <div className="section-heading">
            <h3>Chứng nhận {index + 1}</h3>
            <button
              type="button"
              className="icon-button"
              aria-label={"Xóa chứng nhận " + (index + 1)}
              onClick={() =>
                change(
                  "accreditations",
                  d.accreditations.filter((x) => x.id !== c.id),
                )
              }
            >
              <Trash2 size={18} />
            </button>
          </div>
          <div className="academic-field-grid">
            <TextField
              label="Tên chứng nhận"
              required
              value={c.name}
              onChange={(v) => accreditation(c.id, { ...c, name: v })}
            />
            <TextField
              label="Tổ chức cấp"
              required
              value={c.organization}
              onChange={(v) => accreditation(c.id, { ...c, organization: v })}
            />
            <TextField
              label="Ngày cấp"
              required
              type="date"
              value={c.issuedAt ?? ""}
              onChange={(v) => accreditation(c.id, { ...c, issuedAt: v || null })}
            />
            <TextField
              label="Ngày hết hạn"
              type="date"
              value={c.expiresAt ?? ""}
              onChange={(v) => accreditation(c.id, { ...c, expiresAt: v || null })}
            />
          </div>
          <TextField
            label="Minh chứng (HTTPS)"
            required
            type="url"
            max={2048}
            value={c.evidenceUrl}
            onChange={(v) => accreditation(c.id, { ...c, evidenceUrl: v })}
          />
        </section>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={d.accreditations.length >= 20}
        onClick={() =>
          change("accreditations", [
            ...d.accreditations,
            {
              id: crypto.randomUUID(),
              name: "",
              organization: "",
              issuedAt: null,
              expiresAt: null,
              evidenceUrl: "",
            },
          ])
        }
      >
        <Plus size={17} />
        Thêm chứng nhận
      </button>
    </div>
  );
}
