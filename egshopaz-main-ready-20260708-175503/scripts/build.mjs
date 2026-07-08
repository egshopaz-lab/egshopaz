import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");

await rm(dist, { recursive: true, force: true });
await cp(path.join(root, "index.html"), path.join(dist, "index.html"));
await cp(path.join(root, "src"), path.join(dist, "src"), { recursive: true });

if (existsSync(path.join(root, "public"))) {
  await cp(path.join(root, "public"), dist, { recursive: true });
}

await writeFile(path.join(dist, "health.txt"), "ok\n", "utf8");
console.log("Build ready: dist/");
