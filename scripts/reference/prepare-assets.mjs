import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const directory = fileURLToPath(new URL("../../data/reference-site/", import.meta.url));
const manifestPath = resolve(directory, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
await mkdir(resolve(directory, "assets"), { recursive: true });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function download(source) {
  if (/^data:image\/(png|jpeg);base64,[a-z\d+/=]+$/i.test(source)) {
    const bytes = Buffer.from(source.split(",")[1], "base64");
    if (bytes.length > 8 * 1024 * 1024) throw new Error("Embedded image exceeds 8 MB");
    return { bytes, type: source.slice(5, source.indexOf(";")) };
  }
  let url = new URL(source);
  for (let redirect = 0; redirect < 5; redirect++) {
    if (
      url.protocol !== "https:" ||
      !["lrd.ctu.edu.vn", "static.xx.fbcdn.net"].includes(url.hostname) ||
      url.username ||
      url.password
    )
      throw new Error("Image origin is outside the reviewed source: " + url.origin);
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without location");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok)
      throw new Error(`Image download failed (${response.status}): ${url.pathname}`);
    const type = response.headers.get("content-type")?.split(";")[0];
    if (!["image/jpeg", "image/png"].includes(type)) throw new Error("Unsupported image: " + type);
    const parts = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) throw new Error("Source image exceeds 8 MB");
      parts.push(chunk);
    }
    return { bytes: Buffer.concat(parts), type };
  }
  throw new Error("Too many redirects");
}

for (const [key, asset] of Object.entries(manifest.assets)) {
  if (!/^[a-z0-9-]+$/.test(key)) throw new Error("Invalid asset key");
  if (asset.file && asset.sha256) {
    const bytes = await readFile(resolve(directory, asset.file)).catch(() => null);
    if (bytes && digest(bytes) === asset.sha256) continue;
  }
  const { bytes, type } = await download(asset.resolvedUrl ?? asset.url);
  if (asset.sha256 && digest(bytes) !== asset.sha256)
    throw new Error("Source image changed; review before replacing: " + key);
  asset.file = "assets/" + key + (type === "image/png" ? ".png" : ".jpg");
  asset.sha256 = digest(bytes);
  asset.contentType = type;
  asset.size = bytes.length;
  await writeFile(resolve(directory, asset.file), bytes);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${key}: ${bytes.length} bytes`);
}
console.log(`Prepared ${Object.keys(manifest.assets).length} source images.`);
