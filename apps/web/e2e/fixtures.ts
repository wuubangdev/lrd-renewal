import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const runtimeDirectory = resolve(__dirname, "../../../.runtime");
mkdirSync(runtimeDirectory, { recursive: true });

/** Record only resources created by a test so local cleanup can use exact IDs. */
export function recordFixture(
  kind:
    | "program"
    | "admission"
    | "article"
    | "asset"
    | "account"
    | "research"
    | "editorial"
    | "staff"
    | "laboratory",
  id: string,
) {
  const file = resolve(runtimeDirectory, "e2e-fixtures.json");
  const entries: { kind: string; id: string }[] = existsSync(file)
    ? JSON.parse(readFileSync(file, "utf8"))
    : [];
  if (!entries.some((entry) => entry.kind === kind && entry.id === id)) {
    entries.push({ kind, id });
    writeFileSync(file, JSON.stringify(entries, null, 2));
  }
}
