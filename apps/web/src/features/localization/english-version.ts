"use client";

import { api, matchVersion } from "@/lib/browser-api";
import { draftOf, type AdminContent } from "@/lib/contracts";

export type EnglishKind =
  | "ARTICLE"
  | "STAFF"
  | "LABORATORY"
  | "PROGRAM"
  | "ADMISSION"
  | "EDITORIAL"
  | "RESEARCH"
  | "HOME"
  | "MENU";
type Data = Record<string, unknown>;
type Resource = {
  id: string;
  version: number;
  locale: string;
  code?: string;
  level?: string;
  kind?: string;
  draft?: Data;
  content?: Data;
};
export type EnglishLink = { kind: EnglishKind; sourceId: string; targetId: string };

const path = (kind: EnglishKind, id: string, locale = "vi") => {
  switch (kind) {
    case "ARTICLE":
      return `/admin/content/${id}`;
    case "STAFF":
      return `/admin/people/${id}`;
    case "LABORATORY":
      return `/admin/laboratories/${id}`;
    case "PROGRAM":
      return `/admin/academics/programs/${id}`;
    case "ADMISSION":
      return `/admin/academics/admissions/${id}`;
    case "EDITORIAL":
      return `/admin/editorial/${id}`;
    case "RESEARCH":
      return `/admin/research/${id}`;
    case "HOME":
      return `/admin/site/home?locale=${locale}`;
    case "MENU":
      return `/admin/site/menu?locale=${locale}`;
  }
};
export const englishEditorPath = (kind: EnglishKind, id: string) => {
  switch (kind) {
    case "ARTICLE":
      return `/admin/content/${id}`;
    case "STAFF":
      return `/admin/staff/${id}`;
    case "LABORATORY":
      return `/admin/laboratories/${id}`;
    case "PROGRAM":
      return `/admin/programs/${id}`;
    case "ADMISSION":
      return `/admin/admissions/${id}`;
    case "EDITORIAL":
      return `/admin/editorial/${id}`;
    case "RESEARCH":
      return `/admin/research/${id}`;
    case "HOME":
      return "/admin/site/home?locale=en";
    case "MENU":
      return "/admin/site/menu?locale=en";
  }
};

export async function englishLink(kind: EnglishKind, sourceId: string) {
  if (kind === "HOME" || kind === "MENU") return undefined;
  return api<EnglishLink | undefined>(`/admin/localization/links/${kind}/${sourceId}`);
}

async function create(kind: EnglishKind, source: Resource): Promise<Resource> {
  let endpoint: string;
  let body: Data;
  switch (kind) {
    case "ARTICLE":
      endpoint = "/admin/content";
      body = { locale: "en" };
      break;
    case "STAFF":
      endpoint = "/admin/people";
      body = { locale: "en" };
      break;
    case "LABORATORY":
      endpoint = "/admin/laboratories";
      body = { locale: "en" };
      break;
    case "PROGRAM":
      endpoint = "/admin/academics/programs";
      body = { code: source.code, level: source.level, locale: "en" };
      break;
    case "ADMISSION":
      endpoint = "/admin/academics/admissions";
      body = { code: source.code, level: source.level, locale: "en" };
      break;
    case "EDITORIAL":
      endpoint = "/admin/editorial";
      body = { kind: source.kind, locale: "en" };
      break;
    case "RESEARCH":
      endpoint = "/admin/research";
      body = { kind: source.kind, locale: "en" };
      break;
    default:
      throw new Error("Trang website dùng bản tiếng Anh đã có sẵn.");
  }
  return api<Resource>(endpoint, { method: "POST", body: JSON.stringify(body) });
}

async function translatedDraft(kind: EnglishKind, draft: Data): Promise<Data> {
  return api<Data>("/admin/localization/english", {
    method: "POST",
    body: JSON.stringify({ kind, source: draft }),
  });
}

async function linkTarget(kind: EnglishKind, sourceId: string, targetId: string) {
  await api<EnglishLink>("/admin/localization/links", {
    method: "PUT",
    body: JSON.stringify({ kind, sourceId, targetId }),
  });
}

async function mapLinkedArticle(draft: Data, key: "articleId" | "sourceArticleId") {
  const articleId = draft[key];
  if (typeof articleId !== "string" || !articleId) return;
  const english = await generateEnglishVersion("ARTICLE", articleId);
  draft[key] = english.id;
}

async function mapSiteReferences(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(mapSiteReferences));
  if (!value || typeof value !== "object") return value;
  const source = value as Data;
  const translated: Data = {};
  for (const [key, child] of Object.entries(source))
    translated[key] = await mapSiteReferences(child);
  if (typeof source.kind === "string" && typeof source.target === "string") {
    const kind = source.kind as EnglishKind;
    if (["ARTICLE", "LABORATORY", "PROGRAM", "ADMISSION"].includes(kind)) {
      const link = await englishLink(kind, source.target);
      if (link) translated.target = link.targetId;
    }
  }
  return translated;
}

export async function generateEnglishVersion(
  kind: EnglishKind,
  sourceId: string,
  replace = false,
): Promise<{ id: string; href: string }> {
  const site = kind === "HOME" || kind === "MENU";
  const source = await api<Resource>(path(kind, sourceId));
  if (source.locale !== "vi") throw new Error("Chỉ tạo bản tiếng Anh từ bản tiếng Việt.");
  const existing = site ? undefined : await englishLink(kind, sourceId);
  if (existing && !replace)
    return { id: existing.targetId, href: englishEditorPath(kind, existing.targetId) };

  const raw =
    kind === "ARTICLE" ? draftOf(source as AdminContent) : site ? source.content : source.draft;
  if (!raw) throw new Error("Không tìm thấy bản nháp tiếng Việt.");
  const safeSource = structuredClone(raw) as Data;
  if (kind === "STAFF") {
    safeSource.privateNotes = "";
    safeSource.privateFacts = [];
  }
  const translated = await translatedDraft(kind, safeSource);
  // Imported research keys identify the original source record globally, not its translations.
  if (kind === "RESEARCH") translated.sourceKey = "";
  if (site) {
    Object.assign(translated, await mapSiteReferences(translated));
    if (kind === "HOME" && Array.isArray(translated.featuredIds)) {
      translated.featuredIds = await Promise.all(
        (translated.featuredIds as string[]).map(
          async (id) => (await englishLink("ARTICLE", id))?.targetId,
        ),
      ).then((ids) => ids.filter((id): id is string => !!id));
    }
  }
  if (kind === "EDITORIAL" && translated.articleId) await mapLinkedArticle(translated, "articleId");
  if (["STAFF", "LABORATORY", "RESEARCH"].includes(kind) && translated.sourceArticleId)
    await mapLinkedArticle(translated, "sourceArticleId");
  if (kind === "ADMISSION" && Array.isArray(translated.programs)) {
    const programs = translated.programs as { programId: string; quota: number | null }[];
    translated.programs = await Promise.all(
      programs.map(async (program) => {
        const linked = await englishLink("PROGRAM", program.programId);
        return linked ? { ...program, programId: linked.targetId } : null;
      }),
    ).then((items) => items.filter((item) => item !== null));
  }
  if (kind === "RESEARCH" && Array.isArray(translated.contributors)) {
    translated.contributors = await Promise.all(
      (translated.contributors as { staffId: string | null }[]).map(async (person) => {
        if (!person.staffId) return person;
        const linked = await englishLink("STAFF", person.staffId);
        return { ...person, staffId: linked?.targetId ?? null };
      }),
    );
  }
  const target = site
    ? await api<Resource>(path(kind, sourceId, "en"))
    : existing
      ? await api<Resource>(path(kind, existing.targetId, "en"))
      : await create(kind, source);
  const endpoint =
    kind === "ARTICLE" || ["STAFF", "LABORATORY", "EDITORIAL", "RESEARCH"].includes(kind)
      ? `${path(kind, target.id, "en")}/draft`
      : path(kind, target.id, "en");
  await api(endpoint, {
    method: "PATCH",
    headers: matchVersion(target.version),
    body: JSON.stringify(translated),
  });
  if (!site && !existing) await linkTarget(kind, sourceId, target.id);
  return { id: target.id, href: englishEditorPath(kind, target.id) };
}
