"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { api } from "@/lib/browser-api";

type Result = { created: number; ids: string[] };

export function SpreadsheetImport({
  title,
  endpoint,
  params,
  itemHref,
}: {
  title: string;
  endpoint: string;
  params?: Record<string, string>;
  itemHref: (id: string) => string;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function download() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch(`/api/v1${endpoint}/template`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Không tải được mẫu. Vui lòng đăng nhập lại hoặc kiểm tra quyền.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title.toLowerCase().replace(/\s+/g, "-")}-template.xlsx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!file) return;
    setError("");
    setResult(null);
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      for (const [key, value] of Object.entries(params ?? {})) body.append(key, value);
      const imported = await api<Result>(`${endpoint}/import`, { method: "POST", body });
      setResult(imported);
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="spreadsheet-import" aria-label={`Nhập nhanh ${title} bằng Excel`}>
      <div className="spreadsheet-import__intro">
        <FileSpreadsheet size={22} aria-hidden="true" />
        <div>
          <strong>Nhập nhanh bằng Excel</strong>
          <p>Tải mẫu, điền dữ liệu vào các sheet, rồi tải file lên. Mỗi hàng ở sheet chính tạo một bản nháp.</p>
        </div>
      </div>
      <div className="spreadsheet-import__actions">
        <button className="button secondary" type="button" disabled={busy} onClick={download}>
          <Download size={17} /> Tải mẫu .xlsx
        </button>
        <label className="spreadsheet-import__file">
          <span>Chọn file đã điền</span>
          <input ref={fileInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => { setFile(event.target.files?.[0] ?? null); setResult(null); setError(""); }} />
        </label>
        <button className="button primary" type="button" disabled={!file || busy} onClick={upload}>
          <Upload size={17} /> {busy ? "Đang xử lý…" : "Nhập dữ liệu"}
        </button>
      </div>
      {file && <p className="spreadsheet-import__filename">Đã chọn: {file.name}</p>}
      {error && <p className="alert error" role="alert">{error}</p>}
      {result && <div className="spreadsheet-import__result" role="status">
        <strong>Đã tạo {result.created} bản nháp.</strong>
        {result.ids.length === 1 && <Link href={itemHref(result.ids[0])}>Mở bản nháp →</Link>}
        <span>Kiểm tra nội dung trước khi công khai.</span>
      </div>}
    </section>
  );
}
