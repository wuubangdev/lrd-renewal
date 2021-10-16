import { spawn } from "node:child_process";
import { resolve } from "node:path";
const cwd = resolve(import.meta.dirname, "../apps/api");
const windows = process.platform === "win32";
const executable = windows ? "mvnw.cmd" : "./mvnw";
const child = spawn(executable, process.argv.slice(2), { cwd, stdio: "inherit", shell: windows });
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
