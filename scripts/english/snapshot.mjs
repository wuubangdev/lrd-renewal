import { mkdir, writeFile } from "node:fs/promises";
import { createCmsClient } from "./cms-client.mjs";
const cms = createCmsClient();
await cms.login();
try {
  const records = [];
  const articles = (await cms.all("/admin/content")).filter(
    (x) => x.locale === "vi" && ["PUBLISHED", "CHANGED"].includes(x.status),
  );
  for (const x of articles) {
    const live = await cms.request(
      `/public/content/by-slug/${encodeURIComponent(x.slug)}?locale=vi`,
    );
    records.push({
      kind: "ARTICLE",
      publish: true,
      sourceId: x.id,
      sourceVersion: x.version,
      data: Object.fromEntries(
        [
          "title",
          "slug",
          "summary",
          "byline",
          "category",
          "document",
          "coverId",
          "coverAlt",
          "origin",
        ].map((k) => [k, live[k]]),
      ),
    });
  }
  const catalogs = [
    ["STAFF", "/admin/people"],
    ["LABORATORY", "/admin/laboratories"],
    ["PROGRAM", "/admin/academics/programs"],
    ["ADMISSION", "/admin/academics/admissions"],
    ...["NEWS", "EVENT", "JOB"].map((k) => ["EDITORIAL", `/admin/editorial?kind=${k}`]),
    ...["PROJECT", "JOURNAL_ARTICLE", "CONFERENCE_PAPER", "TEXTBOOK", "DOCUMENT"].map((k) => [
      "RESEARCH",
      `/admin/research?kind=${k}`,
    ]),
  ];
  for (const [kind, path] of catalogs) {
    for (const x of await cms.all(path + (path.includes("?") ? "&" : "?") + "locale=vi")) {
      let data = x.live;
      if (
        ["PROGRAM", "ADMISSION"].includes(kind) &&
        ["PUBLISHED", "CHANGED", "CLOSED", "RETIRED"].includes(x.status)
      ) {
        const live = await cms.request(
          `/public/academics/${kind === "PROGRAM" ? "programs" : "admissions"}/${x.content.slug}?locale=vi`,
        );
        data = live.content;
      }
      if (!data) continue;
      data = structuredClone(data);
      if (kind === "STAFF") {
        data.privateNotes = "";
        data.privateFacts = [];
      }
      records.push({
        kind,
        subtype: x.kind,
        sourceId: x.id,
        sourceVersion: x.version,
        code: x.code,
        level: x.level,
        status: x.status,
        data,
      });
    }
  }
  // Archived biographies/lab articles remain drafts, but their provenance links need English counterparts.
  const articleIds = new Set(records.filter((r) => r.kind === "ARTICLE").map((r) => r.sourceId));
  const backingIds = new Set(
    records.map((r) => r.data.sourceArticleId).filter((id) => id && !articleIds.has(id)),
  );
  for (const id of backingIds) {
    const x = await cms.request(`/admin/content/${id}`);
    if (x.locale !== "vi") throw new Error(`Unexpected source article locale: ${id}`);
    records.push({
      kind: "ARTICLE",
      publish: false,
      sourceId: x.id,
      sourceVersion: x.version,
      data: Object.fromEntries(
        [
          "title",
          "slug",
          "summary",
          "byline",
          "category",
          "document",
          "coverId",
          "coverAlt",
          "origin",
        ].map((k) => [k, x[k]]),
      ),
    });
  }
  for (const kind of ["HOME", "MENU"]) {
    const live = await cms.request(`/public/site/${kind.toLowerCase()}?locale=vi`);
    const admin = await cms.request(`/admin/site/${kind.toLowerCase()}?locale=vi`);
    records.push({ kind, sourceId: admin.id, sourceVersion: admin.version, data: live.content });
  }
  await mkdir("data/english", { recursive: true });
  await writeFile(
    "data/english/source.json",
    JSON.stringify(
      {
        schemaVersion: 1,
        capturedAt: new Date().toISOString(),
        sourceLocale: "vi",
        targetLocale: "en",
        records,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    JSON.stringify(
      records.reduce(
        (m, r) => (
          (m[r.kind + (r.subtype ? ":" + r.subtype : "")] =
            (m[r.kind + (r.subtype ? ":" + r.subtype : "")] ?? 0) + 1),
          m
        ),
        {},
      ),
    ),
  );
} finally {
  await cms.logout();
}
