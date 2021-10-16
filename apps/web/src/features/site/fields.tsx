"use client";
import { useEffect, useState, useId } from "react";
import { ArrowUp, ArrowDown, Search } from "lucide-react";
import { type ContentSummary, type PageResult } from "@/lib/contracts";
import { useCategories } from "@/features/publishing/use-categories";
import { api } from "@/lib/browser-api";
import { EducationSelect } from "@/features/academics/fields";
import type { PublicLaboratory } from "@/features/directory/laboratory-contracts";
import type { Action, Block, SiteLink } from "./contracts";
export function Field({
  label,
  value,
  onChange,
  max = 160,
  multiline = false,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max?: number;
  multiline?: boolean;
  rows?: number;
}) {
  return (
    <label>
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={max}
          rows={rows}
        />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} />
      )}
    </label>
  );
}
export function MoveButtons({
  index,
  length,
  onMove,
  label,
}: {
  index: number;
  length: number;
  onMove: (to: number) => void;
  label: string;
}) {
  return (
    <div className="row-actions">
      <button
        type="button"
        className="icon-button"
        disabled={!index}
        aria-label={"Đưa " + label + " lên"}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp size={16} />
      </button>
      <button
        type="button"
        className="icon-button"
        disabled={index === length - 1}
        aria-label={"Đưa " + label + " xuống"}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown size={16} />
      </button>
    </div>
  );
}
export function moveItem<T>(items: T[], from: number, to: number) {
  const copy = [...items];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
export function ArticleSelect({
  value,
  onChange,
  locale,
  label = "Bài viết công khai",
}: {
  value: string;
  onChange: (v: string) => void;
  locale: string;
  label?: string;
}) {
  const [query, setQuery] = useState(""),
    [items, setItems] = useState<ContentSummary[]>([]),
    [selected, setSelected] = useState<ContentSummary | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    api<PageResult<ContentSummary>>("/public/content?locale=" + locale + "&size=30")
      .then((d) => {
        if (live) setItems(d.items);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [locale]);
  useEffect(() => {
    let live = true;
    setSelected(null);
    if (value)
      api<ContentSummary>("/public/content/" + value)
        .then((d) => {
          if (live) setSelected(d);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, [value]);
  async function search() {
    setBusy(true);
    setError("");
    try {
      const data = await api<PageResult<ContentSummary>>(
        "/public/content?locale=" + locale + "&size=30&q=" + encodeURIComponent(query),
      );
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const choices =
    selected && !items.some((i) => i.id === selected.id) ? [selected, ...items] : items;
  return (
    <div className="article-select">
      <label>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Chọn bài viết…</option>
          {value && !choices.some((i) => i.id === value) && (
            <option value={value}>Bài đã chọn (không còn công khai)</option>
          )}
          {choices.map((i) => (
            <option key={i.id} value={i.id}>
              {i.title}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-search">
        <input
          aria-label={"Tìm " + label.toLowerCase()}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm bài theo tiêu đề…"
          maxLength={200}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button
          type="button"
          className="icon-button"
          aria-label="Tìm bài viết"
          disabled={busy}
          onClick={search}
        >
          <Search size={18} />
        </button>
      </div>
      {error && (
        <p role="alert" className="field-hint">
          {error}
        </p>
      )}
    </div>
  );
}
const linkLabels: Record<SiteLink["kind"], string> = {
  HOME: "Trang chủ",
  NEWS: "Danh sách tin",
  EVENTS: "Danh sách hội thảo",
  JOBS: "Danh sách tuyển dụng",
  RESEARCH: "Nghiên cứu",
  PROJECTS: "Đề tài nghiên cứu",
  PUBLICATIONS: "Công bố khoa học",
  TEXTBOOKS: "Giáo trình & sách",
  DOCUMENTS: "Tài liệu",
  PEOPLE: "Đội ngũ cán bộ",
  LABS: "Phòng thí nghiệm",
  LABORATORY: "Một phòng thí nghiệm",
  ANCHOR: "Khối trên trang chủ",
  CATEGORY: "Chuyên mục tin",
  ARTICLE: "Bài viết công khai",
  EXTERNAL: "Website bên ngoài (HTTPS)",
  GROUP: "Nhóm menu",
  PROGRAMS: "Danh sách chương trình đào tạo",
  ADMISSIONS: "Danh sách tuyển sinh",
  PROGRAM: "Chương trình công khai",
  ADMISSION: "Đợt tuyển công khai",
};
export function LinkField({
  value,
  onChange,
  locale,
  allowGroup = false,
}: {
  value: SiteLink;
  onChange: (v: SiteLink) => void;
  locale: string;
  allowGroup?: boolean;
}) {
  const categoryOptions = useCategories();
  const [laboratories, setLaboratories] = useState<PublicLaboratory[]>([]);
  useEffect(() => {
    let active = true;
    api<PublicLaboratory[]>(`/public/laboratories?locale=${locale}`)
      .then((items) => {
        if (active) setLaboratories(items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [locale]);
  function kindChanged(kind: SiteLink["kind"]) {
    onChange({
      kind,
      target: kind === "ANCHOR" ? "gioi-thieu" : kind === "CATEGORY" ? "TIN_TUC" : "",
    });
  }
  return (
    <div className="link-field">
      <label>
        Loại liên kết
        <select
          value={value.kind}
          onChange={(e) => kindChanged(e.target.value as SiteLink["kind"])}
        >
          {Object.entries(linkLabels)
            .filter(([k]) => allowGroup || k !== "GROUP")
            .map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
        </select>
      </label>
      {value.kind === "EXTERNAL" && (
        <label>
          Địa chỉ HTTPS
          <input
            type="url"
            value={value.target}
            maxLength={2048}
            placeholder="https://…"
            onChange={(e) => onChange({ ...value, target: e.target.value })}
          />
        </label>
      )}
      {value.kind === "ANCHOR" && (
        <label>
          Khối đích
          <select
            value={value.target}
            onChange={(e) => onChange({ ...value, target: e.target.value })}
          >
            {Object.entries({
              "gioi-thieu": "Giới thiệu",
              "dao-tao": "Đào tạo",
              "tuyen-sinh": "Tuyển sinh đang mở",
              "tin-tuc": "Tin tức",
              "ket-noi": "Kết nối",
              "lien-he": "Chân trang / Liên hệ",
            }).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
      )}
      {value.kind === "CATEGORY" && (
        <label>
          Chuyên mục
          <select
            value={value.target}
            onChange={(e) => onChange({ ...value, target: e.target.value })}
          >
            {categoryOptions.map((category) => (
              <option key={category.code} value={category.code}>
                {locale === "en" ? category.nameEn : category.nameVi}
              </option>
            ))}
          </select>
        </label>
      )}
      {value.kind === "LABORATORY" && (
        <label>
          Phòng thí nghiệm công khai
          <select
            value={value.target}
            onChange={(e) => onChange({ ...value, target: e.target.value })}
          >
            <option value="">Chọn phòng thí nghiệm</option>
            {laboratories.map((lab) => (
              <option value={lab.id} key={lab.id}>
                {lab.details.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {(value.kind === "PROGRAM" || value.kind === "ADMISSION") && (
        <EducationSelect
          kind={value.kind === "PROGRAM" ? "programs" : "admissions"}
          locale={locale}
          value={value.target}
          onChange={(v) => onChange({ ...value, target: v })}
          label={value.kind === "PROGRAM" ? "Chương trình công khai" : "Đợt tuyển công khai"}
        />
      )}
      {value.kind === "ARTICLE" && (
        <ArticleSelect
          value={value.target}
          onChange={(v) => onChange({ ...value, target: v })}
          locale={locale}
        />
      )}
    </div>
  );
}
export function ActionField({
  value,
  onChange,
  locale,
}: {
  value: Action;
  onChange: (v: Action) => void;
  locale: string;
}) {
  return (
    <div className="action-field">
      <Field
        label="Nhãn nút"
        value={value.label}
        max={80}
        onChange={(v) => onChange({ ...value, label: v })}
      />
      <LinkField
        value={value.link}
        onChange={(v) => onChange({ ...value, link: v })}
        locale={locale}
      />
    </div>
  );
}
export function BlockField({
  value,
  onChange,
  locale,
  actionRequired = false,
}: {
  value: Block;
  onChange: (v: Block) => void;
  locale: string;
  actionRequired?: boolean;
}) {
  const id = useId();
  return (
    <>
      <Field
        label="Dòng dẫn"
        value={value.kicker}
        max={120}
        onChange={(v) => onChange({ ...value, kicker: v })}
      />
      <Field
        label="Tiêu đề"
        value={value.title}
        multiline
        rows={2}
        onChange={(v) => onChange({ ...value, title: v })}
      />
      <Field
        label="Nội dung"
        value={value.body}
        multiline
        max={2000}
        onChange={(v) => onChange({ ...value, body: v })}
      />
      {!actionRequired && (
        <label htmlFor={id} className="check-label">
          <input
            id={id}
            type="checkbox"
            checked={!!value.action}
            onChange={(e) =>
              onChange({
                ...value,
                action: e.target.checked
                  ? { label: "Tìm hiểu thêm", link: { kind: "NEWS", target: "" } }
                  : null,
              })
            }
          />
          Hiển thị nút liên kết
        </label>
      )}
      {value.action && (
        <ActionField
          value={value.action}
          onChange={(v) => onChange({ ...value, action: v })}
          locale={locale}
        />
      )}
    </>
  );
}
