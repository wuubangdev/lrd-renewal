import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir, rename, open, unlink } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { verifyFullPackage } from "./verify-package.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const dataset = resolve(root, "data/reference-site");
const manifest = JSON.parse(await readFile(resolve(dataset, "manifest.json"), "utf8"));
await verifyFullPackage(dataset, manifest);
const hash = (data) => createHash("sha256").update(data).digest("hex");
const fingerprint = (data) => hash(JSON.stringify(data));
const base = new URL(process.env.SEED_BASE_URL ?? "http://localhost:8088");
if (
  !["http:", "https:"].includes(base.protocol) ||
  base.username ||
  base.password ||
  base.pathname !== "/" ||
  base.search ||
  base.hash
)
  throw new Error("SEED_BASE_URL must be an HTTP(S) origin without credentials or a path.");
const target = base.origin;
const directory = resolve(root, ".runtime/reference-seed", hash(target).slice(0, 12));
await mkdir(directory, { recursive: true });
const stateFile = resolve(directory, "state.json");
const lockFile = resolve(directory, "running.lock");
const apply = process.argv.includes("--apply");
const update = process.argv.includes("--update-if-unchanged");
const skipSite = process.argv.includes("--skip-site");

// Validate the whole package before any request or write to the CMS.
const keys = new Set();
for (const r of manifest.records) {
  if (keys.has(r.key) || !["programs", "admissions", "articles"].includes(r.kind))
    throw new Error("Invalid/duplicate record " + r.key);
  keys.add(r.key);
  if (r.locale !== "vi" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.content.slug))
    throw new Error("Invalid locale/slug: " + r.key);
}
function validateReferences(value) {
  if (!value || typeof value !== "object") return;
  if (value.$ref && !keys.has(value.$ref))
    throw new Error("Unknown record reference: " + value.$ref);
  if (value.$asset && !manifest.assets[value.$asset])
    throw new Error("Unknown image reference: " + value.$asset);
  Object.values(value).forEach(validateReferences);
}
validateReferences(manifest);
const images = new Map();
for (const [key, asset] of Object.entries(manifest.assets)) {
  if (!asset.file || !asset.sha256) throw new Error("Run npm run seed:assets first: " + key);
  const file = resolve(dataset, asset.file);
  if (!file.startsWith(resolve(dataset, "assets") + sep)) throw new Error("Unsafe asset path");
  const bytes = await readFile(file);
  if (bytes.length > 8 * 1024 * 1024 || hash(bytes) !== asset.sha256)
    throw new Error("Image checksum/size mismatch: " + key);
  images.set(key, bytes);
}
console.log(
  JSON.stringify(
    {
      target,
      apply,
      programs: manifest.records.filter((r) => r.kind === "programs").length,
      admissions: manifest.records.filter((r) => r.kind === "admissions").length,
      articles: manifest.records.filter((r) => r.kind === "articles").length,
      images: images.size,
      site: ["home/vi", "menu/vi"],
      ledger: stateFile,
    },
    null,
    2,
  ),
);
if (!apply) {
  console.log("Package verified. Use --apply to import via authenticated CMS APIs.");
  process.exit(0);
}

if (!process.env.LRD_ADMIN_EMAIL || !process.env.LRD_ADMIN_PASSWORD)
  throw new Error("Set LRD_ADMIN_EMAIL and LRD_ADMIN_PASSWORD in the environment.");
const lock = await open(lockFile, "wx").catch(() => {
  throw new Error(
    "Another seed is running, or a previous process stopped. Inspect " +
      lockFile +
      " before removing it.",
  );
});
await lock.writeFile(String(process.pid));
let state,
  authenticated = false;
const cookies = new Map(),
  report = {
    target,
    startedAt: new Date().toISOString(),
    created: [],
    updated: [],
    skipped: [],
    conflicts: [],
  };
const recordIds = new Map(),
  assetIds = new Map();

async function checkpoint() {
  const temp = stateFile + ".tmp";
  await writeFile(temp, JSON.stringify(state, null, 2) + "\n");
  await rename(temp, stateFile);
}
async function request(path, { method = "GET", data, version, headers = {} } = {}) {
  const h = new Headers(headers);
  if (cookies.size) h.set("Cookie", [...cookies].map(([k, v]) => k + "=" + v).join("; "));
  h.set("Origin", target);
  if (version !== undefined) h.set("If-Match", '"' + version + '"');
  let body;
  if (data instanceof FormData) body = data;
  else if (data !== undefined) {
    body = JSON.stringify(data);
    h.set("Content-Type", "application/json");
  }
  const response = await fetch(target + "/api/v1" + path, {
    method,
    headers: h,
    body,
    redirect: "error",
    signal: AbortSignal.timeout(60000),
  });
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(";")[0],
      at = pair.indexOf("=");
    if (at > 0) cookies.set(pair.slice(0, at), pair.slice(at + 1));
  }
  const text = await response.text();
  let value;
  try {
    value = text ? JSON.parse(text) : null;
  } catch {
    value = null;
  }
  if (!response.ok) {
    const error = new Error(
      `${method} ${path}: HTTP ${response.status} ${value?.detail ?? value?.message ?? ""}`,
    );
    error.status = response.status;
    throw error;
  }
  return value;
}
async function mutate(path, data, version, method = "POST") {
  const csrf = await request("/auth/csrf");
  return request(path, {
    method,
    data,
    version,
    headers: { [csrf.headerName]: csrf.token, "Idempotency-Key": randomUUID() },
  });
}
function resolveReferences(value) {
  if (Array.isArray(value)) return value.map(resolveReferences);
  if (!value || typeof value !== "object") return value;
  if (value.$ref) {
    const id = recordIds.get(value.$ref);
    if (!id) throw new Error("Unresolved record: " + value.$ref);
    return id;
  }
  if (value.$asset) {
    const id = assetIds.get(value.$asset);
    if (!id) throw new Error("Unresolved image: " + value.$asset);
    return id;
  }
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveReferences(v)]));
}
async function all(path) {
  const items = [];
  for (let page = 0; ; page++) {
    const result = await request(path + "?size=50&page=" + page);
    items.push(...result.items);
    if (items.length >= result.total || !result.items.length) return items;
  }
}
try {
  state = await readFile(stateFile, "utf8")
    .then(JSON.parse)
    .catch((e) => {
      if (e.code === "ENOENT") return { target, version: 1, records: {}, assets: {}, site: {} };
      throw e;
    });
  if (state.target !== target || state.version !== 1)
    throw new Error("Seed ledger belongs to a different target/version.");
  const actor = await mutate("/auth/login", {
    email: process.env.LRD_ADMIN_EMAIL,
    password: process.env.LRD_ADMIN_PASSWORD,
  });
  authenticated = true;
  if (!actor.permissions.includes("site:manage") || !actor.permissions.includes("academics:manage"))
    throw new Error("An administrator with Site and Academics permissions is required.");
  if (state.actorId && state.actorId !== actor.id)
    throw new Error(
      "This ledger belongs to a different administrator/database; use a separate ledger after reviewing the target.",
    );
  state.actorId = actor.id;
  await checkpoint();
  const catalogs = {
    programs: await all("/admin/academics/programs"),
    admissions: await all("/admin/academics/admissions"),
    articles: await all("/admin/content"),
  };
  const uploaded = await request("/admin/media");
  for (const [key, asset] of Object.entries(manifest.assets)) {
    let entry = state.assets[key];
    if (entry) {
      if (entry.sha256 !== asset.sha256) throw new Error("Reviewed image changed: " + key);
      // A missing original asset is an explicit conflict; never silently reattach another image.
      if (!uploaded.some((a) => a.id === entry.id)) {
        const check = await fetch(target + "/api/v1/admin/media/" + entry.id, {
          headers: { Cookie: [...cookies].map(([k, v]) => k + "=" + v).join("; ") },
          redirect: "error",
        });
        await check.body?.cancel();
        if (!check.ok) throw new Error("Previously imported image is missing: " + key);
      }
    } else {
      const same = Object.values(state.assets).find((a) => a.sha256 === asset.sha256);
      if (same) entry = same;
      else {
        const form = new FormData();
        form.set(
          "file",
          new Blob([images.get(key)], { type: asset.contentType }),
          basename(asset.file),
        );
        const created = await mutate("/admin/media", form);
        entry = { id: created.id, sha256: asset.sha256, source: asset.url };
        report.created.push({ kind: "image", key, id: entry.id });
      }
      state.assets[key] = entry;
      await checkpoint();
    }
    assetIds.set(key, entry.id);
  }
  for (const record of manifest.records) {
    const prefix =
      record.kind === "articles" ? "/admin/content" : "/admin/academics/" + record.kind;
    let entry = state.records[record.key];
    const digest = fingerprint(record);
    if (!entry) {
      const existing = catalogs[record.kind].find(
        (x) =>
          x.locale === record.locale &&
          (record.kind === "articles" ? x.slug === record.content.slug : x.code === record.code),
      );
      if (existing) {
        recordIds.set(record.key, existing.id);
        report.skipped.push({
          key: record.key,
          id: existing.id,
          reason: "Existing content adopted as a reference only; not overwritten.",
        });
        continue;
      }
      const created = await mutate(
        prefix,
        record.kind === "articles"
          ? { locale: record.locale }
          : { locale: record.locale, code: record.code, level: record.level },
      );
      entry = { id: created.id, version: created.version, phase: "created", fingerprint: digest };
      state.records[record.key] = entry;
      await checkpoint();
      report.created.push({ kind: record.kind, key: record.key, id: entry.id });
    }
    recordIds.set(record.key, entry.id);
    let current = await request(prefix + "/" + entry.id);
    if (current.version !== entry.version) {
      report.conflicts.push({
        key: record.key,
        id: entry.id,
        reason: "Changed in CMS since the last import; preserved.",
      });
      continue;
    }
    if (entry.phase === "saved" && entry.fingerprint !== digest) {
      report.conflicts.push({
        key: record.key,
        id: entry.id,
        reason: "Package changed after saving an unfinished import; review the saved draft in CMS.",
      });
      continue;
    }
    if (entry.phase === "complete" && (entry.fingerprint === digest || !update)) {
      report.skipped.push({
        key: record.key,
        id: entry.id,
        reason:
          entry.fingerprint === digest
            ? "Already imported."
            : "Package changed; use --update-if-unchanged after review.",
      });
      continue;
    }
    if (entry.phase === "created" || entry.phase === "complete") {
      current = await mutate(
        prefix + "/" + entry.id + (record.kind === "articles" ? "/draft" : ""),
        resolveReferences(record.content),
        current.version,
        "PATCH",
      );
      entry.phase = "saved";
      entry.version = current.version;
      entry.fingerprint = digest;
      await checkpoint();
    }
    current = await mutate(
      prefix + "/" + entry.id + "/publish",
      { draftVersion: current.draftVersion },
      current.version,
    );
    entry.version = current.version;
    entry.phase = "complete";
    entry.publicUrl = current.publicUrl;
    await checkpoint();
    report.updated.push({ key: record.key, id: entry.id, url: current.publicUrl });
    console.log(record.key + ": " + current.publicUrl);
  }
  // Preserve the full previous Site drafts before publishing the reviewed new navigation/home.
  for (const kind of skipSite ? [] : ["home", "menu"]) {
    let current = await request("/admin/site/" + kind + "?locale=vi");
    const digest = fingerprint(manifest.site[kind]);
    let entry = state.site[kind];
    if (entry && current.version !== entry.version) {
      report.conflicts.push({ key: kind, reason: "Site changed in CMS; preserved." });
      continue;
    }
    if (entry?.phase === "saved" && entry.fingerprint !== digest) {
      report.conflicts.push({
        key: kind,
        reason: "Package changed after saving an unfinished Site import; review the draft in CMS.",
      });
      continue;
    }
    if (entry?.phase === "complete" && (entry.fingerprint === digest || !update)) {
      report.skipped.push({ key: kind, reason: "Site already imported." });
      continue;
    }
    if (!entry) {
      entry = { version: current.version, phase: "created", before: current };
      state.site[kind] = entry;
      await checkpoint();
    }
    if (entry.phase !== "saved") {
      current = await mutate(
        "/admin/site/" + kind + "?locale=vi",
        resolveReferences(manifest.site[kind]),
        current.version,
        "PATCH",
      );
      entry.version = current.version;
      entry.phase = "saved";
      entry.fingerprint = digest;
      await checkpoint();
    }
    current = await mutate(
      "/admin/site/" + kind + "/publish?locale=vi",
      { draftVersion: current.draftVersion },
      current.version,
    );
    entry.version = current.version;
    entry.phase = "complete";
    await checkpoint();
    report.updated.push({ key: kind });
  }
  report.completedAt = new Date().toISOString();
  await writeFile(resolve(directory, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        created: report.created.length,
        published: report.updated.length,
        skipped: report.skipped.length,
        conflicts: report.conflicts,
        report: resolve(directory, "report.json"),
      },
      null,
      2,
    ),
  );
  if (report.conflicts.length) process.exitCode = 2;
} finally {
  if (authenticated) await mutate("/auth/logout").catch(() => {});
  await lock.close();
  await unlink(lockFile);
}
