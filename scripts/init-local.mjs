import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
function writeWebEnvironment(publicKey) {
  const path = resolve(root, "apps/web/.env.local");
  if (existsSync(path)) return;
  if (!publicKey)
    throw new Error(
      "Thiếu LRD_AUTH_PUBLIC_KEY trong .env. Hãy điền cấu hình trước khi chạy lại setup.",
    );
  mkdirSync(resolve(root, "apps/web"), { recursive: true });
  writeFileSync(
    path,
    "BACKEND_URL=http://127.0.0.1:8080\nSITE_URL=http://localhost:3000\nAUTH_PUBLIC_KEY=" +
      publicKey +
      "\nSESSION_COOKIE=LRD_SESSION\n",
    { mode: 0o600 },
  );
}
if (existsSync(resolve(root, ".env"))) {
  const configured = Object.fromEntries(
    readFileSync(resolve(root, ".env"), "utf8")
      .split(/\r?\n/)
      .filter((line) => line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
  writeWebEnvironment(configured.LRD_AUTH_PUBLIC_KEY);
  console.log(".env đã tồn tại. Giữ nguyên thông tin và khóa hiện tại.");
  process.exit(0);
}
const secret = () => randomBytes(24).toString("base64url");
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKey = keys.publicKey.export({ type: "spki", format: "der" }).toString("base64");
const privateKey = keys.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
const dbPassword = secret();
const values = {
  POSTGRES_DB: "lrd",
  POSTGRES_USER: "lrd",
  POSTGRES_PASSWORD: dbPassword,
  DB_URL: "jdbc:postgresql://localhost:55432/lrd",
  DB_USERNAME: "lrd",
  DB_PASSWORD: dbPassword,
  S3_ENDPOINT: "http://localhost:59000",
  S3_ACCESS_KEY: "lrd-local",
  S3_SECRET_KEY: secret(),
  S3_BUCKET: "lrd-media",
  LRD_ADMIN_EMAIL: "admin@lrd.local",
  LRD_ADMIN_PASSWORD: secret(),
  LRD_AUTH_PRIVATE_KEY: privateKey,
  LRD_AUTH_PUBLIC_KEY: publicKey,
  LRD_COOKIE_SECURE: "false",
  LRD_ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:8088",
};
writeFileSync(
  resolve(root, ".env"),
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n",
  { mode: 0o600 },
);
writeWebEnvironment(publicKey);
console.log(
  "Đã tạo cấu hình local và khóa riêng. Tài khoản khởi tạo nằm trong .env (không commit).",
);
