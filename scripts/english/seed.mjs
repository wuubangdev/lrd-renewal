import { readFile, writeFile, mkdir, rename, open, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { translationIssue } from "./quality.mjs";
import { createCmsClient } from "./cms-client.mjs";
import { hash, collectStrings, translateRecord, remapReferences } from "./transform.mjs";

export const prefix = (kind) =>
  ({
    ARTICLE: "/admin/content",
    STAFF: "/admin/people",
    LABORATORY: "/admin/laboratories",
    PROGRAM: "/admin/academics/programs",
    ADMISSION: "/admin/academics/admissions",
    EDITORIAL: "/admin/editorial",
    RESEARCH: "/admin/research",
    HOME: "/admin/site/home",
    MENU: "/admin/site/menu",
  })[kind];
export function pathFor(record, id, operation = "") {
  const site = ["HOME", "MENU"].includes(record.kind);
  return (
    prefix(record.kind) +
    (site ? "" : "/" + id) +
    (operation ? "/" + operation : "") +
    (site ? "?locale=en" : "")
  );
}
export function checkVersion(entry, current) {
  if (entry.version !== current.version)
    throw new Error(
      `English ${current.id} was edited after the last seed operation. Refusing to overwrite it.`,
    );
}
export function validatePackage(source, dictionary) {
  if (source.schemaVersion !== 1 || source.sourceLocale !== "vi" || source.targetLocale !== "en")
    throw new Error("Unsupported English seed package");
  const keys = new Set();
  for (const r of source.records) {
    if (!prefix(r.kind) || !r.sourceId) throw new Error("Invalid source record");
    const key = r.kind + ":" + r.sourceId;
    if (keys.has(key)) throw new Error(`Duplicate ${key}`);
    keys.add(key);
  }
  const pending = collectStrings(source.records).filter((s) => !dictionary[s]?.trim());
  if (pending.length)
    throw new Error(
      `${pending.length} translations missing; prepare/review translations before applying.`,
    );
  for (const text of collectStrings(source.records)) {
    const issue = translationIssue(text, dictionary[text]);
    if (issue) throw new Error(`Translation requires review (${issue}): ${text.slice(0, 160)}`);
  }
  const links = Object.fromEntries(
    source.records.map((r) => [r.kind + ":" + r.sourceId, r.sourceId]),
  );
  for (const r of source.records) {
    const data = remapReferences(translateRecord(r, dictionary), links);
    const limits =
      {
        ARTICLE: { title: 200, summary: 360, coverAlt: 300, byline: 200 },
        STAFF: {
          name: 160,
          academicTitle: 100,
          degree: 100,
          position: 120,
          unit: 160,
          office: 160,
          summary: 1000,
          portraitAlt: 300,
        },
        LABORATORY: {
          name: 200,
          shortName: 120,
          lead: 200,
          location: 300,
          summary: 1000,
          coverAlt: 300,
        },
        PROGRAM: { title: 180, summary: 600, description: 30000, coverAlt: 300 },
        ADMISSION: {
          title: 180,
          summary: 600,
          description: 30000,
          requirements: 10000,
          selectionMethod: 10000,
          coverAlt: 300,
        },
        EDITORIAL: {
          title: 220,
          summary: 1200,
          thumbnailAlt: 300,
          location: 300,
          organizer: 200,
          employer: 200,
          position: 200,
          theme: 500,
          audience: 1000,
        },
        RESEARCH: {
          title: 500,
          summary: 3000,
          venue: 300,
          publisher: 300,
          volume: 300,
          level: 160,
          period: 160,
          progress: 160,
          coverAlt: 300,
        },
      }[r.kind] ?? {};
    for (const [key, max] of Object.entries(limits))
      if ((data[key]?.length ?? 0) > max)
        throw new Error(
          `${r.data.slug}: English ${key} exceeds ${max} characters (${data[key].length}). Edit the translation.`,
        );
    if (r.kind === "STAFF") {
      const academic = data.academic;
      for (const [k, max] of Object.entries({
        highestDegreeYear: 60,
        academicRank: 120,
        academicRankYear: 60,
        birthDate: 80,
        birthPlace: 200,
        researchInterests: 3000,
      }))
        if ((academic[k]?.length ?? 0) > max)
          throw new Error(`${data.slug}: academic.${k} exceeds ${max}`);
      for (const [group, rows] of Object.entries(academic))
        if (Array.isArray(rows))
          for (const [i, row] of rows.entries()) {
            const bounds = {
              degree: 120,
              period: 120,
              institution: 300,
              major: 200,
              graduationYear: 60,
              thesis: 2000,
              mode: 120,
              title: 1000,
              organization: 300,
              role: 200,
              description: group === "workHistory" ? 3000 : 10000,
              url: 500,
              language: 120,
              proficiency: 200,
              certificate: 200,
            };
            for (const [k, max] of Object.entries(bounds))
              if ((row[k]?.length ?? 0) > max)
                throw new Error(`${data.slug}: academic.${group}[${i}].${k} exceeds ${max}`);
          }
    }
    if (r.kind === "ARTICLE") {
      let chars = 0;
      function check(node) {
        chars += node.text?.length ?? 0;
        if (["image", "inlineImage"].includes(node.type) && node.attrs?.alt?.length > 300)
          throw new Error(`${r.data.slug}: English image alt exceeds 300 characters.`);
        for (const child of node.content ?? []) check(child);
      }
      check(data.document);
      if (chars > 200000)
        throw new Error(`${r.data.slug}: English document exceeds 200000 characters.`);
    }
  }
  return source.records.length;
}

export async function seed({ source, dictionary, cms, directory, update = false }) {
  await mkdir(directory, { recursive: true });
  const lock = resolve(directory, "running.lock");
  const handle = await open(lock, "wx").catch(() => {
    throw new Error(
      `Another English seed is running, or a previous run was interrupted. Check before removing ${lock}`,
    );
  });
  let signedIn = false;
  try {
    const statePath = resolve(directory, "state.json");
    let state = await readFile(statePath, "utf8")
      .then(JSON.parse)
      .catch((e) => {
        if (e.code === "ENOENT") return { schemaVersion: 1, target: cms.origin, records: {} };
        throw e;
      });
    if (state.schemaVersion !== 1 || state.target !== cms.origin)
      throw new Error("Seed ledger belongs to a different target");
    async function checkpoint() {
      await writeFile(statePath + ".tmp", JSON.stringify(state, null, 2) + "\n");
      await rename(statePath + ".tmp", statePath);
    }
    await cms.login();
    signedIn = true;
    const actor = await cms.request("/auth/me");
    if (state.actorId && state.actorId !== actor.id)
      throw new Error("Seed ledger belongs to a different administrator");
    state.actorId = actor.id;
    await checkpoint();
    // Validate all source identities before creating anything in another database accidentally.
    for (const r of source.records) {
      const path =
        prefix(r.kind) + (["HOME", "MENU"].includes(r.kind) ? "?locale=vi" : "/" + r.sourceId);
      const current = await cms.request(path);
      if (current.locale !== "vi") throw new Error(`Source is not Vietnamese: ${r.sourceId}`);
      if (current.version !== r.sourceVersion)
        throw new Error(
          `Vietnamese ${r.sourceId} changed since the snapshot. Refresh/review the seed package first.`,
        );
    }
    const order = [
      "ARTICLE",
      "STAFF",
      "LABORATORY",
      "PROGRAM",
      "ADMISSION",
      "EDITORIAL",
      "RESEARCH",
      "HOME",
      "MENU",
    ];
    const records = [...source.records].sort(
      (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind),
    );
    const links = {};
    // Allocate IDs first, so all relations can be mapped without dropping any reference.
    for (const r of records) {
      const key = r.kind + ":" + r.sourceId;
      let entry = state.records[key];
      if (!entry) {
        const site = ["HOME", "MENU"].includes(r.kind);
        if (!site && (await cms.request(`/admin/localization/links/${r.kind}/${r.sourceId}`)))
          throw new Error(
            `${key} already has an English version outside this seed ledger. Keep the existing CMS translation.`,
          );
        const current = site
          ? await cms.request(pathFor(r))
          : await cms.mutate(prefix(r.kind), {
              locale: "en",
              ...(r.code ? { code: r.code, level: r.level } : {}),
              ...(r.subtype ? { kind: r.subtype } : {}),
            });
        if (site)
          await writeFile(
            resolve(directory, `${r.kind.toLowerCase()}-before-seed.json`),
            JSON.stringify(current, null, 2) + "\n",
            { flag: "wx" },
          ).catch((e) => {
            if (e.code !== "EEXIST") throw e;
          });
        entry = { id: current.id, version: current.version, phase: "created" };
        state.records[key] = entry;
        await checkpoint();
      }
      links[key] = entry.id;
    }
    const counts = { created: 0, updated: 0, unchanged: 0 };
    for (const [index, r] of records.entries()) {
      const key = r.kind + ":" + r.sourceId,
        entry = state.records[key];
      const data = remapReferences(translateRecord(r, dictionary), links);
      if (r.kind === "RESEARCH") data.sourceKey = "";
      const digest = hash({ data, publish: r.publish !== false, status: r.status });
      let current = await cms.request(pathFor(r, entry.id));
      checkVersion(entry, current);
      if (entry.phase === "complete" && entry.digest === digest) {
        counts.unchanged++;
        continue;
      }
      if (entry.digest && entry.digest !== digest && !update)
        throw new Error(`Seed input changed for ${key}; review then use --update-if-unchanged.`);
      const isNew = !entry.digest;
      const saveOperation = ["PROGRAM", "ADMISSION", "HOME", "MENU"].includes(r.kind)
        ? ""
        : "draft";
      if (entry.phase === "created" || entry.phase === "complete" || entry.digest !== digest) {
        current = await cms.mutate(
          pathFor(r, entry.id, saveOperation),
          data,
          current.version,
          "PATCH",
        );
        entry.version = current.version;
        entry.digest = digest;
        entry.phase = "saved";
        await checkpoint();
      }
      if (!["HOME", "MENU"].includes(r.kind)) {
        const existing = await cms.request(`/admin/localization/links/${r.kind}/${r.sourceId}`);
        if (existing && existing.targetId !== entry.id)
          throw new Error(`Translation link changed for ${key}`);
        if (!existing)
          await cms.mutate(
            "/admin/localization/links",
            { kind: r.kind, sourceId: r.sourceId, targetId: entry.id },
            undefined,
            "PUT",
          );
      }
      if (entry.phase === "saved" && r.publish !== false) {
        current = await cms.mutate(
          pathFor(r, entry.id, "publish"),
          { draftVersion: current.draftVersion },
          current.version,
        );
        entry.version = current.version;
        entry.phase = "published";
        await checkpoint();
      }
      if (r.status === "CLOSED" && r.kind === "ADMISSION" && current.admissionStatus !== "CLOSED") {
        current = await cms.mutate(
          pathFor(r, entry.id, "close"),
          { reason: "English version of the closed Vietnamese admission notice." },
          current.version,
        );
        entry.version = current.version;
        await checkpoint();
      }
      if (r.status === "RETIRED" && r.kind === "PROGRAM" && current.status !== "RETIRED") {
        current = await cms.mutate(
          pathFor(r, entry.id, "retire"),
          { reason: "English version of the retired Vietnamese programme." },
          current.version,
        );
        entry.version = current.version;
        await checkpoint();
      }
      entry.phase = "complete";
      await checkpoint();
      counts[isNew ? "created" : "updated"]++;
      if (index % 20 === 0 || index === records.length - 1)
        console.log(
          `${index + 1}/${records.length}: ${r.kind} ${data.title ?? data.name ?? r.kind}`,
        );
    }
    state.completedAt = new Date().toISOString();
    await checkpoint();
    console.log(JSON.stringify(counts));
    return { counts, links, state };
  } finally {
    try {
      if (signedIn) await cms.logout();
    } finally {
      await handle.close();
      await unlink(lock);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const source = JSON.parse(await readFile("data/english/source.json", "utf8"));
  const dictionary = JSON.parse(await readFile("data/english/translations.json", "utf8"));
  const count = validatePackage(source, dictionary);
  const cms = createCmsClient();
  const directory = resolve(".runtime/english-seed", hash(cms.origin).slice(0, 12));
  console.log(
    `Validated ${count} English records for ${cms.origin}. ${process.argv.includes("--apply") ? "Applying" : "Dry run; use --apply to save and publish"}.`,
  );
  if (process.argv.includes("--apply"))
    await seed({
      source,
      dictionary,
      cms,
      directory,
      update: process.argv.includes("--update-if-unchanged"),
    });
}
