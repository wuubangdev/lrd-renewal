"use client";
import { useRef, useState } from "react";
import { Upload, ImageIcon } from "lucide-react";
import type { Asset } from "@/lib/contracts";
import { uploadImage } from "./media-picker";
import { useMediaBrowser, MediaSearch, MediaMore } from "./use-media-browser";
export function MediaLibrary({ initial }: { initial: Asset[] }) {
  const browser = useMediaBrowser(initial),
    { assets } = browser;
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const asset = await uploadImage(file);
      browser.prepend(asset);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">TÀI NGUYÊN NỘI DUNG</p>
          <h1>Thư viện ảnh</h1>
          <p className="muted">Ảnh chỉ xuất hiện công khai khi được sử dụng trong bài đã đăng.</p>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png"
          hidden
          onChange={(e) => void upload(e.target.files?.[0])}
        />
        <button className="button primary" disabled={busy} onClick={() => input.current?.click()}>
          <Upload size={18} />
          {busy ? "Đang tải…" : "Tải ảnh lên"}
        </button>
      </div>
      {error && (
        <p role="alert" className="alert error">
          {error}
        </p>
      )}
      <MediaSearch browser={browser} />
      <div className="media-library">
        {assets.map((asset) => (
          <figure key={asset.id}>
            <img loading="lazy" src={asset.url} alt={asset.name} />
            <figcaption>
              <strong>{asset.name}</strong>
              <small>
                {asset.width} × {asset.height} · {Math.ceil(asset.size / 1024)} KB
              </small>
            </figcaption>
          </figure>
        ))}
      </div>
      <MediaMore browser={browser} />
      {!assets.length && (
        <div className="empty-state">
          <ImageIcon size={36} />
          <h2>Chưa có ảnh trong thư viện</h2>
          <p>Tải ảnh JPG hoặc PNG, tối đa 8 MB mỗi ảnh.</p>
        </div>
      )}
    </>
  );
}
