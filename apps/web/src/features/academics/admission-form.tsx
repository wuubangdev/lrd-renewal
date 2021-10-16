"use client";
import { Plus, Trash2 } from "lucide-react";
import { CommonFields, ContactFields, EducationSelect, NumberField, TextField } from "./fields";
import { type AdmissionDraft, type Level, fromLocalTime, toLocalTime } from "./contracts";
export function AdmissionForm({
  value: d,
  onChange,
  tab,
  locale,
  level,
  published,
}: {
  value: AdmissionDraft;
  onChange: (d: AdmissionDraft) => void;
  tab: string;
  locale: string;
  level: Level;
  published: boolean;
}) {
  const notice = !d.opensAt && !d.closesAt;
  const change = <K extends keyof AdmissionDraft>(key: K, value: AdmissionDraft[K]) =>
    onChange({ ...d, [key]: value });
  if (tab === "general")
    return (
      <>
        <CommonFields value={d} onChange={onChange} />
        <NumberField
          label="Năm tuyển sinh"
          value={d.year}
          min={2000}
          max={2200}
          onChange={(v) => change("year", v ?? 0)}
        />
      </>
    );
  if (tab === "contact")
    return <ContactFields value={d.contact} onChange={(v) => change("contact", v)} />;
  if (tab === "programs")
    return (
      <div className="academic-repeat-list">
        <p className="field-hint">
          Chọn chương trình cùng bậc học và ngôn ngữ đã công khai. Chỉ tiêu là số tùy chọn; để trống
          nếu chưa công bố.
        </p>
        {d.programs.map((p, index) => (
          <div className="academic-repeat" key={p.programId}>
            <div className="section-heading">
              <h3>Ngành / chương trình {index + 1}</h3>
              <button
                type="button"
                className="icon-button"
                aria-label={"Xóa chương trình " + (index + 1)}
                onClick={() =>
                  change(
                    "programs",
                    d.programs.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2 size={18} />
              </button>
            </div>
            <EducationSelect
              locale={locale}
              level={level}
              value={p.programId}
              onChange={(v) => {
                if (v && !d.programs.some((x) => x.programId === v))
                  change(
                    "programs",
                    d.programs.map((x, i) => (i === index ? { ...x, programId: v } : x)),
                  );
              }}
            />
            <NumberField
              label="Chỉ tiêu dự kiến"
              max={100000}
              value={p.quota}
              onChange={(v) =>
                change(
                  "programs",
                  d.programs.map((x, i) => (i === index ? { ...x, quota: v } : x)),
                )
              }
            />
          </div>
        ))}
        {d.programs.length < 30 && (
          <EducationSelect
            key={d.programs.length}
            label="Thêm chương trình vào đợt tuyển"
            locale={locale}
            level={level}
            value=""
            onChange={(v) => {
              if (v && !d.programs.some((x) => x.programId === v))
                change("programs", [...d.programs, { programId: v, quota: null }]);
            }}
          />
        )}
      </div>
    );
  if (tab === "requirements")
    return (
      <div className="site-fields">
        <TextField
          label="Điều kiện / đối tượng dự tuyển"
          required
          rows={8}
          max={10000}
          value={d.requirements}
          onChange={(v) => change("requirements", v)}
        />
        <TextField
          label="Phương thức xét tuyển"
          required
          rows={8}
          max={10000}
          value={d.selectionMethod}
          onChange={(v) => change("selectionMethod", v)}
        />
        <TextField
          label="Cổng nộp hồ sơ / thông báo chính thức (HTTPS)"
          required
          type="url"
          max={2048}
          value={d.applicationUrl}
          onChange={(v) => change("applicationUrl", v)}
        />
      </div>
    );
  return (
    <div className="site-fields">
      <p className="field-hint">
        Tất cả thời gian theo Việt Nam (UTC+07). Hệ thống ngừng nhận trạng thái “Đang nhận hồ sơ”
        đúng mốc đóng. Ví dụ chọn 00:00 ngày tiếp theo để nhận hết ngày trước đó.
      </p>
      {published && (
        <p className="alert">
          Mốc đăng ký đã công khai. Dùng thao tác “Gia hạn” ở đầu trang để dời hạn đóng và ghi lý
          do.
        </p>
      )}
      <p className="field-hint">
        Chỉ điền mốc thời gian có trong nguồn; có thể để trống mốc chưa xác định. Khi công khai, cần
        ghi URL nguồn ở tab Thông tin chung; trang public hiển thị “Theo thông báo” và không nhận là
        đang mở đăng ký.
      </p>
      {!published && !notice && (
        <button
          type="button"
          className="button ghost"
          onClick={() => onChange({ ...d, opensAt: null, closesAt: null })}
        >
          Chưa xác định lịch — theo thông báo
        </button>
      )}
      <fieldset disabled={published} className="academic-field-grid">
        <TextField
          label="Mở đăng ký"
          type="datetime-local"
          value={toLocalTime(d.opensAt)}
          onChange={(v) => change("opensAt", fromLocalTime(v))}
        />
        <TextField
          label="Đóng đăng ký"
          type="datetime-local"
          value={toLocalTime(d.closesAt)}
          onChange={(v) => change("closesAt", fromLocalTime(v))}
        />
      </fieldset>
      <h3>Các mốc trong đợt tuyển</h3>
      {d.schedule.map((m, index) => (
        <section className="academic-repeat" key={m.id}>
          <div className="section-heading">
            <h4>Mốc {index + 1}</h4>
            <button
              type="button"
              className="icon-button"
              aria-label={"Xóa mốc " + (index + 1)}
              onClick={() =>
                change(
                  "schedule",
                  d.schedule.filter((x) => x.id !== m.id),
                )
              }
            >
              <Trash2 size={18} />
            </button>
          </div>
          <div className="academic-field-grid">
            <TextField
              label="Tên mốc"
              required
              value={m.title}
              onChange={(v) =>
                change(
                  "schedule",
                  d.schedule.map((x) => (x.id === m.id ? { ...x, title: v } : x)),
                )
              }
            />
            <TextField
              label="Thời gian"
              required
              type="datetime-local"
              value={toLocalTime(m.at)}
              onChange={(v) =>
                change(
                  "schedule",
                  d.schedule.map((x) => (x.id === m.id ? { ...x, at: fromLocalTime(v) } : x)),
                )
              }
            />
          </div>
          <TextField
            label="Ghi chú"
            rows={2}
            max={1000}
            value={m.note}
            onChange={(v) =>
              change(
                "schedule",
                d.schedule.map((x) => (x.id === m.id ? { ...x, note: v } : x)),
              )
            }
          />
        </section>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={d.schedule.length >= 30}
        onClick={() =>
          change("schedule", [
            ...d.schedule,
            { id: crypto.randomUUID(), title: "", at: null, note: "" },
          ])
        }
      >
        <Plus size={17} />
        Thêm mốc thời gian
      </button>
    </div>
  );
}
