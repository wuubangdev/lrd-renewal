"use client";
import { useState } from "react";
import { Check, Copy, Mail, Share2 } from "lucide-react";

export function ShareActions({ url, title }: { url: string; title: string }) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 3000);
    } catch {
      setCopyStatus("error");
    }
  }
  return (
    <div className="share-actions" aria-label="Chia sẻ bài viết">
      <span className="share-actions-label">
        <Share2 size={17} aria-hidden="true" /> Chia sẻ
      </span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chia sẻ lên Facebook"
      >
        Facebook
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chia sẻ lên LinkedIn"
      >
        LinkedIn
      </a>
      <a
        href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`}
        aria-label="Chia sẻ qua email"
      >
        <Mail size={16} aria-hidden="true" /> Email
      </a>
      <button type="button" onClick={copy} aria-label="Sao chép liên kết">
        {copyStatus === "copied" ? (
          <Check size={16} aria-hidden="true" />
        ) : (
          <Copy size={16} aria-hidden="true" />
        )}
        {copyStatus === "copied" ? "Đã sao chép" : "Sao chép liên kết"}
      </button>
      <span
        className={copyStatus === "error" ? "share-copy-error" : "sr-only"}
        role="status"
        aria-live="polite"
      >
        {copyStatus === "copied"
          ? "Đã sao chép liên kết"
          : copyStatus === "error"
            ? "Không thể sao chép liên kết trên trình duyệt này."
            : ""}
      </span>
    </div>
  );
}
