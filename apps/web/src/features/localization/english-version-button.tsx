"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirmNavigation } from "@/components/unsaved-changes";
import { Languages, ExternalLink } from "lucide-react";
import {
  englishEditorPath,
  englishLink,
  generateEnglishVersion,
  type EnglishKind,
} from "./english-version";

export function EnglishVersionButton({
  kind,
  sourceId,
  locale,
  dirty = false,
  sourceReady = true,
}: {
  kind: EnglishKind;
  sourceId: string;
  locale: string;
  dirty?: boolean;
  sourceReady?: boolean;
}) {
  const router = useRouter();
  const confirmNavigation = useConfirmNavigation();
  const [targetId, setTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const site = kind === "HOME" || kind === "MENU";
  useEffect(() => {
    if (locale !== "vi" || site) return;
    let active = true;
    void englishLink(kind, sourceId)
      .then((link) => {
        if (active) setTargetId(link?.targetId ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [kind, sourceId, locale, site]);
  if (locale !== "vi") return null;
  async function run(replace: boolean) {
    if (
      replace &&
      !window.confirm(
        "Dịch lại từ bản tiếng Việt? Bản nháp tiếng Anh hiện tại sẽ bị thay thế; nội dung đang công khai không đổi.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const result = await generateEnglishVersion(kind, sourceId, replace);
      setTargetId(result.id);
      if (!confirmNavigation()) return;
      router.push(result.href);
      router.refresh();
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="english-version-control">
      {targetId && !site ? (
        <>
          <a className="button secondary" href={englishEditorPath(kind, targetId)}>
            <ExternalLink size={16} /> Bản tiếng Anh
          </a>
          <button
            className="button ghost"
            type="button"
            disabled={busy || dirty || !sourceReady}
            onClick={() => run(true)}
            title={dirty ? "Lưu bản nháp tiếng Việt trước" : "Dịch lại và thay bản nháp tiếng Anh"}
          >
            <Languages size={16} /> Dịch lại
          </button>
        </>
      ) : (
        <button
          className="button secondary"
          type="button"
          disabled={busy || dirty || !sourceReady}
          onClick={() => run(site)}
          title={dirty ? "Lưu bản nháp tiếng Việt trước" : "Tạo bản nháp tiếng Anh bằng Gemini"}
        >
          <Languages size={16} />{" "}
          {busy ? "Đang dịch…" : site ? "Tạo bản tiếng Anh" : "Tạo bản Anh bằng AI"}
        </button>
      )}
      {error && (
        <small className="error-text" role="alert">
          {error}
        </small>
      )}
    </span>
  );
}
