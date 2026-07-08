import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const rootArg = process.argv[2] && !/^\d+$/.test(process.argv[2]) ? process.argv[2] : ".";
const portArg = process.argv[3] || (/^\d+$/.test(process.argv[2] || "") ? process.argv[2] : "5173");
const root = path.resolve(process.cwd(), rootArg);
const port = Number(portArg);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
};

createServer(async (req, res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url || "/", `http://localhost:${port}`).pathname);
    const requested = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.normalize(path.join(root, requested));
    if (!filePath.startsWith(root)) throw new Error("Invalid path");
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    const body = await readFile(path.join(root, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  }
}).listen(port, "0.0.0.0", () => {
  console.log(`EG Shop running at http://localhost:${port}`);
});

