import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createCmsClient } from "./cms-client.mjs";
import { hash, translateRecord, remapReferences } from "./transform.mjs";
import { pathFor, prefix } from "./seed.mjs";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => [k, canonical(value[k])]),
    );
  return typeof value === "string" ? value.trim() : value;
}
function publicPath(r) {
  const slug = encodeURIComponent(r.data.slug ?? "");
  return (
    {
      ARTICLE: `/public/content/by-slug/${slug}`,
      STAFF: `/public/people/${slug}`,
      LABORATORY: `/public/laboratories/${slug}`,
      PROGRAM: `/public/academics/programs/${slug}`,
      ADMISSION: `/public/academics/admissions/${slug}`,
      EDITORIAL: `/public/editorial/${slug}`,
      RESEARCH: `/public/research/${slug}`,
      HOME: "/public/site/home",
      MENU: "/public/site/menu",
    }[r.kind] + `?locale=en${r.kind === "EDITORIAL" ? "&kind=" + r.subtype : ""}`
  );
}
const cms = createCmsClient();
const directory = resolve(".runtime/english-seed", hash(cms.origin).slice(0, 12));
const source = JSON.parse(await readFile("data/english/source.json", "utf8"));
const dictionary = JSON.parse(await readFile("data/english/translations.json", "utf8"));
const state = JSON.parse(await readFile(resolve(directory, "state.json"), "utf8"));
const links = Object.fromEntries(Object.entries(state.records).map(([k, v]) => [k, v.id]));
const errors = [],
  counts = {};
let checked = 0;
await cms.login();
try {
  for (let offset = 0; offset < source.records.length; offset += 4) {
    await Promise.all(
      source.records.slice(offset, offset + 4).map(async (r) => {
        const key = r.kind + ":" + r.sourceId;
        try {
          const entry = state.records[key];
          assert.equal(entry.phase, "complete");
          let expected = remapReferences(translateRecord(r, dictionary), links);
          if (r.kind === "RESEARCH") expected.sourceKey = "";
          const admin = await cms.request(pathFor(r, entry.id));
          assert.equal(admin.locale, "en");
          assert.equal(admin.version, entry.version, "English version changed after seed");
          if (!["HOME", "MENU"].includes(r.kind)) {
            const link = await cms.request(`/admin/localization/links/${r.kind}/${r.sourceId}`);
            assert.equal(link?.targetId, entry.id);
          }
          let data;
          if (r.publish === false) {
            assert.equal(admin.publicUrl, null);
            assert.equal(admin.status, "DRAFT");
            data = admin;
          } else {
            const live = await cms.request(publicPath(r));
            data = live.details ?? live.content ?? live;
            if (live.authors)
              for (const a of live.authors)
                if (a.staffId) assert.match(a.staffUrl, /^\/en\/can-bo\//);
            if (["HOME", "MENU"].includes(r.kind))
              for (const url of Object.values(live.urls ?? {}))
                assert.ok(!String(url).startsWith("/vi/"), "Site link leaked to Vietnamese");
          }
          // Compare every expected field, including all rich nodes, table/list rows and object arrays.
          const selected = Object.fromEntries(Object.keys(expected).map((k) => [k, data[k]]));
          assert.deepEqual(
            canonical(selected),
            canonical(expected),
            "Full translated content differs from the prepared seed",
          );
          const viPath =
            prefix(r.kind) + (["HOME", "MENU"].includes(r.kind) ? "?locale=vi" : "/" + r.sourceId);
          const original = await cms.request(viPath);
          assert.equal(original.version, r.sourceVersion, "Vietnamese content was changed");
          const group =
            r.kind +
            (r.subtype ? ":" + r.subtype : "") +
            (r.publish === false ? ":ARCHIVED_DRAFT" : "");
          counts[group] = (counts[group] ?? 0) + 1;
          checked++;
        } catch (error) {
          errors.push({ key, slug: r.data.slug, error: error.message.split("\n")[0] });
        }
      }),
    );
    if (offset % 100 === 0)
      console.log(
        `Verified ${Math.min(offset + 4, source.records.length)}/${source.records.length}`,
      );
  }
  const report = {
    checkedAt: new Date().toISOString(),
    target: cms.origin,
    checked,
    counts,
    errors,
  };
  await writeFile(resolve(directory, "verification.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (errors.length) process.exitCode = 1;
} finally {
  await cms.logout();
}
