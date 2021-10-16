import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectStrings, translateRecord, remapReferences } from "./transform.mjs";
import { seed, validatePackage, checkVersion } from "./seed.mjs";

const article = {
  kind: "ARTICLE",
  sourceId: "a",
  sourceVersion: 1,
  publish: true,
  data: {
    title: "Giới thiệu",
    summary: "Thông tin",
    slug: "gioi-thieu",
    byline: "Nguyễn Văn A",
    coverId: "image",
    origin: { url: "https://lrd.ctu.edu.vn/source", author: "Nguyễn Văn A" },
    document: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [{ type: "tableCell", content: [{ type: "text", text: "Nghiên cứu" }] }],
            },
          ],
        },
        { type: "image", attrs: { assetId: "image", alt: "Phòng học" } },
        {
          type: "text",
          text: "Tài liệu",
          marks: [{ type: "link", attrs: { href: "/vi/tin-tuc/tai-lieu" } }],
        },
      ],
    },
  },
};
const dictionary = {
  "Giới thiệu": "Introduction",
  "Thông tin": "Information",
  "Nghiên cứu": "Research",
  "Phòng học": "Classroom",
  "Tài liệu": "Resources",
  "Tiến sĩ": "PhD",
  "Đang thực hiện": "Ongoing",
};

test("translates full nested document without losing table cells, media, byline or original source", () => {
  const result = translateRecord(article, dictionary);
  assert.equal(result.document.content[0].content[0].content[0].content[0].text, "Research");
  assert.equal(result.document.content[1].attrs.assetId, "image");
  assert.equal(result.document.content[1].attrs.alt, "Classroom");
  assert.equal(result.byline, "Nguyễn Văn A");
  assert.deepEqual(result.origin, article.data.origin);
  assert.equal(result.document.content.length, article.data.document.content.length);
});

test("all array sections translate, while staff names, research citations and authors remain intact", () => {
  const staff = {
    kind: "STAFF",
    data: {
      name: "Nguyễn Văn A",
      degree: "Tiến sĩ",
      sections: [{ title: "Nghiên cứu", blocks: [{ rows: [["Tài liệu"]] }] }],
    },
  };
  const result = translateRecord(staff, dictionary);
  assert.equal(result.name, staff.data.name);
  assert.equal(result.sections[0].blocks[0].rows[0][0], "Resources");
  assert.equal(result.degree, "PhD");
  assert.equal(
    translateRecord(
      { kind: "STAFF", data: { role: "Chủ nhiệm" } },
      { "Chủ nhiệm": "Principal investigator" },
    ).role,
    "Principal investigator",
  );
  assert.equal(
    translateRecord({ kind: "RESEARCH", data: { role: "PRINCIPAL_INVESTIGATOR" } }, {}).role,
    "PRINCIPAL_INVESTIGATOR",
  );
  const research = {
    kind: "RESEARCH",
    data: {
      level: "Cấp cơ sở",
      progress: "Đang thực hiện",
      authorsText: "Nguyễn Văn A",
      citation: "Nguyễn Văn A. Nghiên cứu",
    },
  };
  assert.equal(collectStrings([research]).includes(research.data.citation), false);
  assert.equal(collectStrings([research]).includes(research.data.level), true);
});

test("remaps authors, admissions, source articles, menus and featured IDs; rejects missing references", () => {
  const links = { "ARTICLE:a": "english-a", "STAFF:s": "english-s", "PROGRAM:p": "english-p" };
  const data = {
    contributors: [{ staffId: "s", name: "Nguyễn Văn A" }],
    sourceArticleId: "a",
    programs: [{ programId: "p", quota: 5 }],
    featuredIds: ["a"],
    action: { kind: "ARTICLE", target: "a" },
    resources: [{ url: "/vi/tin-tuc/gioi-thieu" }, { url: "https://lrd.ctu.edu.vn/source" }],
  };
  const result = remapReferences(data, links);
  assert.equal(result.contributors[0].staffId, "english-s");
  assert.equal(result.programs[0].programId, "english-p");
  assert.equal(result.programs[0].quota, 5);
  assert.equal(result.action.target, "english-a");
  assert.deepEqual(result.featuredIds, ["english-a"]);
  assert.equal(result.resources[0].url, "/en/tin-tuc/gioi-thieu");
  assert.equal(result.resources[1].url, data.resources[1].url);
  assert.throws(() => remapReferences(data, {}), /Missing English/);
});

test("preflight rejects missing translations and overlong API fields before mutations", () => {
  const source = { schemaVersion: 1, sourceLocale: "vi", targetLocale: "en", records: [article] };
  assert.equal(validatePackage(source, dictionary), 1);
  assert.throws(() => validatePackage(source, {}), /translations missing/);
  assert.throws(
    () => validatePackage(source, { ...dictionary, "Thông tin": "x".repeat(361) }),
    /exceeds 360/,
  );
  assert.throws(
    () => checkVersion({ version: 2 }, { version: 3, id: "edited" }),
    /Refusing to overwrite/,
  );
});

function fakeCms(records) {
  const data = new Map(
    records.map((r) => [
      "/api" + { ARTICLE: "/admin/content", STAFF: "/admin/people" }[r.kind] + "/" + r.sourceId,
      { id: r.sourceId, locale: "vi", version: r.sourceVersion },
    ]),
  );
  const links = new Map();
  let nextId = 0,
    writes = 0,
    fail = true;
  return {
    origin: "http://localhost:8088",
    data,
    links,
    get writes() {
      return writes;
    },
    login: async () => {},
    logout: async () => {},
    request: async (path) => {
      if (path === "/auth/me") return { id: "admin" };
      if (path.startsWith("/admin/localization/links/"))
        return links.get(path.split("/").slice(-2).join(":"));
      const result = data.get("/api" + path);
      if (!result) throw new Error("Missing " + path);
      return structuredClone(result);
    },
    mutate: async (path, body, version, method) => {
      if (path === "/admin/localization/links") {
        links.set(body.kind + ":" + body.sourceId, body);
        writes++;
        return body;
      }
      if (path.endsWith("/publish") && path.includes("/people/") && fail) {
        fail = false;
        throw new Error("Simulated unavailable publish");
      }
      writes++;
      if (method !== "PATCH" && !path.endsWith("/publish")) {
        const result = { id: "en-" + ++nextId, locale: "en", version: 0, draftVersion: 0 };
        data.set("/api" + path + "/" + result.id, result);
        return structuredClone(result);
      }
      const base = "/api" + path.replace(/\/(draft|publish)$/, "");
      const current = data.get(base);
      assert.equal(current.version, version);
      const result = {
        ...current,
        version: version + 1,
        ...(method === "PATCH"
          ? { draft: body, draftVersion: current.draftVersion + 1 }
          : { live: current.draft }),
      };
      data.set(base, result);
      return structuredClone(result);
    },
  };
}

test("API seed resumes after publish failure, keeps archived drafts, and repeated runs make no content writes", async () => {
  const records = [
    article,
    {
      ...article,
      sourceId: "archived",
      publish: false,
      data: { ...article.data, slug: "archived" },
    },
    {
      kind: "STAFF",
      sourceId: "s",
      sourceVersion: 1,
      data: { name: "Nguyễn Văn A", sourceArticleId: "archived", degree: "Tiến sĩ" },
    },
  ];
  const source = { schemaVersion: 1, sourceLocale: "vi", targetLocale: "en", records };
  const cms = fakeCms(records);
  const directory = await mkdtemp(join(tmpdir(), "lrd-english-"));
  try {
    await assert.rejects(
      seed({ source, dictionary, cms, directory }),
      /Simulated unavailable publish/,
    );
    const resumed = await seed({ source, dictionary, cms, directory });
    const staff = cms.data.get("/api/admin/people/" + resumed.links["STAFF:s"]);
    assert.equal(staff.live.sourceArticleId, resumed.links["ARTICLE:archived"]);
    assert.equal(
      cms.data.get("/api/admin/content/" + resumed.links["ARTICLE:archived"]).live,
      undefined,
    );
    const before = cms.writes;
    const unchanged = await seed({ source, dictionary, cms, directory });
    assert.equal(cms.writes, before);
    assert.equal(unchanged.counts.unchanged, 3);
    staff.version++;
    cms.data.set("/api/admin/people/" + staff.id, staff);
    await assert.rejects(seed({ source, dictionary, cms, directory }), /Refusing to overwrite/);
    const ledger = JSON.parse(await readFile(join(directory, "state.json"), "utf8"));
    assert.equal(ledger.actorId, "admin");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("preflight rejects generated abstracts that add unsupported research results", () => {
  const source = { schemaVersion: 1, sourceLocale: "vi", targetLocale: "en", records: [article] };
  assert.throws(
    () =>
      validatePackage(source, {
        ...dictionary,
        "Nghiên cứu":
          "OBJECTIVE To investigate. METHODS The data were collected. CONCLUSION The results were significant.",
      }),
    /requires review/,
  );
});
