"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, X, ImageIcon, Check } from "lucide-react";
import { api } from "@/lib/browser-api";
import type { Asset } from "@/lib/contracts";
import { useMediaBrowser, MediaSearch, MediaMore } from "./use-media-browser";
export async function uploadImage(file: File) {
  if (!["image/jpeg", "image/png"].includes(file.type)) throw new Error("Chọn ảnh JPG hoặc PNG.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Ảnh phải nhỏ hơn 8 MB.");
  const body = new FormData();
  body.append("file", file);
  return api<Asset>("/admin/media", { method: "POST", body });
}
export function MediaPicker({
  onSelect,
  onClose,
}: {
  onSelect: (asset: Asset, alt: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLInputElement>(null);
  const browser = useMediaBrowser(),
    { assets } = browser;
  const [selected, setSelected] = useState<Asset | null>(null);
  const [alt, setAlt] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const asset = await uploadImage(file);
      browser.prepend(asset);
      setSelected(asset);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tải ảnh chưa thành công.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog ref={dialog} className="media-dialog" onCancel={onClose}>
      <header>
        <div>
          <p className="eyebrow">THƯ VIỆN ẢNH</p>
          <h2>Chọn ảnh từ thư viện</h2>
        </div>
        <button
          className="icon-button"
          aria-label="Đóng thư viện ảnh"
          title="Đóng thư viện ảnh"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      <div className="media-dialog-body">
        <div className="media-upload-row">
          <p>JPG, PNG · Tối đa 8 MB</p>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png"
            hidden
            onChange={(e) => void upload(e.target.files?.[0])}
            aria-label="Tệp ảnh"
          />
          <button className="button" disabled={busy} onClick={() => input.current?.click()}>
            <Upload size={18} />
            {busy ? "Đang tải ảnh…" : "Tải ảnh lên"}
          </button>
        </div>
        {error && (
          <p role="alert" className="alert error">
            {error}
          </p>
        )}
        <MediaSearch browser={browser} />
        <div className="media-grid">
          {assets.map((asset) => (
            <button
              className={"media-choice" + (selected?.id === asset.id ? " selected" : "")}
              key={asset.id}
              onClick={() => setSelected(asset)}
              aria-pressed={selected?.id === asset.id}
            >
              <img loading="lazy" src={asset.url} alt={asset.name} />
              <span>{asset.name}</span>
              {selected?.id === asset.id && <Check className="selection-check" size={20} />}
            </button>
          ))}
        </div>
        <MediaMore browser={browser} />
        {!assets.length && !busy && (
          <div className="empty-state">
            <ImageIcon size={32} />
            <p>Tải lên ảnh đầu tiên của bạn.</p>
          </div>
        )}
      </div>
      <footer>
        <label htmlFor="image-alt">
          Mô tả ảnh <span className="required">*</span>
          <input
            id="image-alt"
            value={alt}
            maxLength={300}
            onChange={(e) => setAlt(e.target.value)}
            placeholder="Mô tả nội dung ảnh cho người đọc"
          />
        </label>
        <div>
          <button className="button" onClick={onClose}>
            Hủy
          </button>
          <button
            className="button primary"
            disabled={!selected || !alt.trim() || busy}
            onClick={() => selected && onSelect(selected, alt.trim())}
          >
            Sử dụng ảnh
          </button>
        </div>
      </footer>
    </dialog>
  );
}
