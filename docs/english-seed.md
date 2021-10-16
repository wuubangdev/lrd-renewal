# English content seed

## Scope

The seed package in `data/english` is derived from Vietnamese CMS data, rather than a replacement set of sample articles. It keeps the entire rich document tree, images, tables, lists and typed object arrays. Only human-readable text is translated. Names, author lists, citations, source URLs, DOI/ISBN, dates, slugs, codes, templates and enum values are preserved.

Snapshot: 16 October 2026. Public sources:

| Domain             | Records |
| ------------------ | ------: |
| Articles           |      77 |
| Staff              |      17 |
| Laboratories       |       2 |
| Programmes         |       4 |
| Admissions         |       4 |
| News profiles      |       4 |
| Conferences/events |       9 |
| Jobs               |       6 |
| Research projects  |      85 |
| Journal articles   |     335 |
| Conference papers  |      68 |
| Textbooks/books    |      11 |
| Documents          |       2 |
| Homepage + menu    |       2 |

Nineteen archived staff/laboratory source articles also receive **draft** English counterparts. These preserve provenance links without republishing biographies as duplicate news articles. Other Vietnamese drafts and test fixtures are excluded. Private staff notes/facts are cleared before export and are never sent to the translator.

The English objects use the same media assets. Links are remapped to English article/programme/staff IDs; research contributor roles, admission quotas and all array rows remain intact. Internal `/vi/` links become `/en/`; external original sources stay unchanged. Research `sourceKey` is cleared because its import identifier is globally unique. CMS translation links connect each Vietnamese source to its English version.

## Translation provenance and review

Gemini was not configured when this package was prepared. Bulk text uses **local machine translation**, with curated overrides for navigation, homepage copy, article titles, degree names and other academic terminology. It is seed content for review; the technical verification does not certify linguistic accuracy of every historical article or scientific title. Editors should review the English text before a production release. Original bibliographic citations are deliberately retained for accurate attribution.

The optional preparation tool uses [VietAI/EnViT5](https://huggingface.co/VietAI/envit5-translation), with a pinned [CTranslate2 int8 conversion](https://huggingface.co/luigi000/envit5-translation-ct2-int8) (OpenRAIL; upstream license/use conditions apply). Revision and file SHA-256 hashes are recorded in `data/english/model.json`. No model weights are committed or added to the product containers. The web application continues to use its existing Gemini integration when configured by an administrator.

Files:

- `source.json`: Vietnamese source snapshots and source identity/version.
- `strings.json`: deduplicated translatable fields.
- `translations.json`: cached full English translations; requires no translation service to replay.
- `overrides.json`: reviewed terminology and editorial copy, takes precedence over model output.
- `model.json`: model provenance and checksums.

## Run

The API and PostgreSQL must be running, with the corresponding Vietnamese data present. The exported snapshot is tied to those source IDs/media assets; after importing into another database, capture its sources again. Use an administrator configured through the existing local `.env`; never put credentials in the seed package.

```sh
npm run test:english-seed
npm run seed:english:check           # offline validation; does not write to the CMS
npm run seed:english                 # save, link and publish public counterparts
npm run seed:english:verify          # read-only verification against public APIs
```

All product writes go through the authenticated CMS APIs, domain validation, CSRF, optimistic versions and normal publish actions. SQL inserts are not used. The homepage/menu are translated from the Vietnamese published versions; the previous English configuration is backed up in the ignored runtime folder and remains in CMS release history.

Progress is stored per target origin in `.runtime/english-seed/<hash>/state.json`. Repeating a completed run performs no content writes. If interrupted, rerun the same command; saved records resume at the publish step. An edited English target, changed translation link, changed Vietnamese source version, different administrator/database or missing relation stops the run rather than overwriting work. A `running.lock` prevents overlapping runs; remove a stale lock only after confirming the earlier process has stopped.

For reviewed translation changes, apply `node --env-file=.env scripts/english/seed.mjs --apply --update-if-unchanged`. This still rejects English objects edited since the previous seed. Preserve the ledger; deleting it does not authorize overwriting existing CMS translations.

## Refresh translation data

```sh
npm run seed:english:snapshot
npm run seed:english:prepare
python scripts/english/download-model.py
# Use an isolated Python environment; these are optional preparation dependencies:
pip install ctranslate2==4.8.3 sentencepiece==0.2.2
python scripts/english/translate-local.py
npm run seed:english:check
```

Model files live in `.runtime/envit5-model`; sentence checkpoints are in `.runtime/english-segments.json`. Long fields are split before inference, keeping every source span, rather than truncated at the model input limit. Existing English fragments are retained. Review cached output and update `overrides.json` as needed. After editing overrides, run `python scripts/english/translate-local.py --rebuild` to regenerate the full cache from sentence checkpoints before applying. Snapshot capture is read-only for content but authenticates a CMS session.

Replaying cached translations changes data immediately; Docker images do not need to be rebuilt for data-only changes.

## Verified local result — 16 October 2026

Applied to `http://localhost:8088`. All **645 records** passed read-back verification: 624 public articles/domain objects, 19 archived source article drafts and 2 site documents. The verifier compared every translated field and nested rich node/array, checked translation links and English contributor URLs, and confirmed that all Vietnamese source versions were unchanged. No verification errors were reported.

- Import/seed tests: **12 passed**.
- Browser tests (`english-seed.spec.ts`, `localization.spec.ts`): **6 passed**. These cover English home/navigation, article language switching, all three leadership spotlights, research authors, mobile programmes/admissions/events/news, image loading and opening an English counterpart from the CMS.
- TypeScript check and `git diff --check`: passed.
- Public entry point: [English website](http://localhost:8088/en).

The full local verification result is stored at `.runtime/english-seed/<target-hash>/verification.json`. Translation quality still requires editorial review before production; the checks above verify data integrity and application behaviour.
