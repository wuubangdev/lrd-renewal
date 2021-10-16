"use client";
import { useEffect, useId, useState } from "react";
import { api } from "@/lib/browser-api";
import { MediaPicker } from "@/features/media/media-picker";
import type {
  BaseDraft,
  Contact,
  EducationDocument,
  EducationResult,
  Kind,
  Level,
} from "./contracts";
export function TextField({
  label,
  value,
  onChange,
  max = 180,
  rows = 0,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  rows?: number;
  type?: string;
  required?: boolean;
}) {
  const id = useId();
  return (
    <label htmlFor={id}>
      {label}
      {required ? " *" : ""}
      {rows ? (
        <textarea
          id={id}
          rows={rows}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          maxLength={max}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  min = 1,
  max = 1000,
  step = 1,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <label htmlFor={id}>
      {label}
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.valueAsNumber)}
      />
    </label>
  );
}
export function ContactFields({
  value,
  onChange,
}: {
  value: Contact;
  onChange: (c: Contact) => void;
}) {
  return (
    <div className="site-fields">
      <TextField
        label="Đầu mối liên hệ"
        required
        value={value.name}
        onChange={(v) => onChange({ ...value, name: v })}
      />
      <TextField
        label="Email liên hệ"
        required
        type="email"
        max={254}
        value={value.email}
        onChange={(v) => onChange({ ...value, email: v })}
      />
      <TextField
        label="Điện thoại"
        max={50}
        value={value.phone}
        onChange={(v) => onChange({ ...value, phone: v })}
      />
    </div>
  );
}
export function CommonFields<T extends BaseDraft>({
  value,
  onChange,
}: {
  value: T;
  onChange: (v: T) => void;
}) {
  const [picker, setPicker] = useState(false);
  const change = <K extends keyof T>(key: K, v: T[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="site-fields">
      <TextField
        label="Tên hiển thị"
        required
        value={value.title}
        onChange={(v) => change("title", v as T["title"])}
      />
      <TextField
        label="Đường dẫn"
        required
        value={value.slug}
        onChange={(v) => change("slug", v as T["slug"])}
      />
      <p className="field-hint">
        Chữ thường, số và dấu gạch nối. Đường dẫn cũ sẽ chuyển tới đường dẫn mới sau khi công khai.
      </p>
      <TextField
        label="Tóm tắt"
        required
        rows={3}
        max={600}
        value={value.summary}
        onChange={(v) => change("summary", v as T["summary"])}
      />
      <TextField
        label="Giới thiệu chi tiết"
        required
        rows={10}
        max={30000}
        value={value.description}
        onChange={(v) => change("description", v as T["description"])}
      />
      <p className="field-hint">
        Dùng đoạn văn và xuống dòng. Các mục khung đào tạo, điều kiện và lịch trình được nhập riêng
        để trình bày nhất quán.
      </p>
      <div className="academic-cover">
        {value.coverId && <img src={"/api/v1/admin/media/" + value.coverId} alt={value.coverAlt} />}
        <div className="row-actions">
          <button className="button secondary" type="button" onClick={() => setPicker(true)}>
            {value.coverId ? "Đổi ảnh" : "Chọn ảnh đại diện"}
          </button>
          {value.coverId && (
            <button
              className="button ghost"
              type="button"
              onClick={() => onChange({ ...value, coverId: null, coverAlt: "" })}
            >
              Bỏ ảnh
            </button>
          )}
        </div>
      </div>
      {value.coverId && (
        <TextField
          label="Mô tả ảnh"
          required
          max={300}
          value={value.coverAlt}
          onChange={(v) => change("coverAlt", v as T["coverAlt"])}
        />
      )}
      <ReferenceFields value={value} onChange={onChange} />
      {picker && (
        <MediaPicker
          onClose={() => setPicker(false)}
          onSelect={(asset, alt) => {
            onChange({ ...value, coverId: asset.id, coverAlt: alt });
            setPicker(false);
          }}
        />
      )}
    </div>
  );
}
export function EducationSelect({
  kind = "programs",
  locale,
  level,
  value,
  onChange,
  label = "Chương trình công khai",
}: {
  kind?: Kind;
  locale: string;
  level?: Level;
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<EducationDocument[]>([]),
    [selected, setSelected] = useState<EducationDocument | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function search(signal?: AbortSignal) {
    setBusy(true);
    setError("");
    try {
      const r = await api<EducationResult>(
        "/public/academics/" +
          kind +
          "?" +
          new URLSearchParams({ locale, level: level ?? "", q: query, size: "30" }),
        { signal },
      );
      setItems(r.items);
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const c = new AbortController();
    void search(c.signal);
    return () => c.abort();
  }, [kind, locale, level]); // Search text is submitted explicitly.
  useEffect(() => {
    let active = true;
    setSelected(null);
    if (value)
      api<EducationDocument[]>(
        "/public/academics/" + kind + "/lookup/by-id?locale=" + locale + "&ids=" + value,
      )
        .then((r) => {
          if (active) setSelected(r[0] ?? null);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [value, kind, locale]);
  const options =
    selected && !items.some((i) => i.id === selected.id) ? [selected, ...items] : items;
  return (
    <div className="article-select">
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Chọn nội dung…</option>
          {value && !options.some((i) => i.id === value) && (
            <option value={value}>Đã chọn · {value.slice(0, 8)} (không còn công khai)</option>
          )}
          {options.map((i) => (
            <option key={i.id} value={i.id}>
              {i.code} · {i.title}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-search">
        <input
          aria-label={"Tìm " + label.toLowerCase()}
          value={query}
          maxLength={200}
          placeholder="Tìm theo tên hoặc mã…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button type="button" className="button secondary" disabled={busy} onClick={() => search()}>
          Tìm
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

function ReferenceFields<T extends BaseDraft>({
  value,
  onChange,
}: {
  value: T;
  onChange: (value: T) => void;
}) {
  const resources = value.resources ?? [];
  return (
    <section className="site-fields academic-reference-fields">
      <h3>Tài liệu và nguồn thông tin</h3>
      <p className="field-hint">
        Liên kết tài liệu chính thức, biểu mẫu, thông báo hoặc khung đào tạo. Không cần tự đặt ngày
        hiệu lực khi nguồn không nêu.
      </p>
      {resources.map((r, index) => (
        <div key={index} className="academic-repeat">
          <TextField
            label={"Tên tài liệu " + (index + 1)}
            value={r.label}
            onChange={(label) =>
              onChange({
                ...value,
                resources: resources.map((x, i) => (i === index ? { ...x, label } : x)),
              })
            }
          />
          <TextField
            label={"URL tài liệu " + (index + 1)}
            type="text"
            max={2048}
            value={r.url}
            onChange={(url) =>
              onChange({
                ...value,
                resources: resources.map((x, i) => (i === index ? { ...x, url } : x)),
              })
            }
          />
          <button
            type="button"
            className="button ghost"
            onClick={() =>
              onChange({ ...value, resources: resources.filter((_, i) => i !== index) })
            }
          >
            Xóa tài liệu {index + 1}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={resources.length >= 20}
        onClick={() => onChange({ ...value, resources: [...resources, { label: "", url: "" }] })}
      >
        Thêm tài liệu
      </button>
      <label className="check-label">
        <input
          type="checkbox"
          checked={!!value.source}
          onChange={(e) =>
            onChange({
              ...value,
              source: e.target.checked
                ? {
                    url: "",
                    publishedOn: null,
                    retrievedOn: new Date().toLocaleDateString("en-CA", {
                      timeZone: "Asia/Ho_Chi_Minh",
                    }),
                  }
                : null,
            })
          }
        />
        Ghi nguồn tham khảo
      </label>
      {value.source && (
        <>
          <TextField
            label="URL nguồn chính thức"
            type="url"
            max={2048}
            value={value.source.url}
            onChange={(url) => onChange({ ...value, source: { ...value.source!, url } })}
          />
          <div className="academic-field-grid">
            <TextField
              label="Ngày đăng ở nguồn (nếu biết)"
              type="date"
              value={value.source.publishedOn ?? ""}
              onChange={(publishedOn) =>
                onChange({
                  ...value,
                  source: { ...value.source!, publishedOn: publishedOn || null },
                })
              }
            />
            <TextField
              label="Ngày đối chiếu nguồn"
              type="date"
              value={value.source.retrievedOn}
              onChange={(retrievedOn) =>
                onChange({ ...value, source: { ...value.source!, retrievedOn } })
              }
            />
          </div>
        </>
      )}
    </section>
  );
}
