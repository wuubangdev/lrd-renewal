import { readFile, writeFile } from "node:fs/promises";
import { collectStrings } from "./transform.mjs";
const source = JSON.parse(await readFile("data/english/source.json", "utf8"));
const strings = collectStrings(source.records);
await writeFile("data/english/strings.json", JSON.stringify(strings, null, 2) + "\n");
console.log(
  `${strings.length} unique strings; ${strings.reduce((n, s) => n + s.length, 0)} characters.`,
);
