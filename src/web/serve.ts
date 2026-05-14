import { spawn } from "node:child_process";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { cwd } from "node:process";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

function documentRoot(): string {
  const fromEnv = process.env.GNUCHANOS_WEB_ROOT;
  if (fromEnv) return resolve(fromEnv);
  const here = fileURLToPath(new URL(".", import.meta.url));
  return resolve(here, "..", "..");
}

const ALLOWED_ROOT_FILES = new Set([
  "index.html",
  "styles.css",
  "main.js",
  "i18n.js",
  "shell-apps.js",
  "games-library.js",
  "gnuchanos-wm.js",
  "gnuchanos.json",
  "games.json",
  "welcome-message.html",
  "favicon.svg",
  ".nojekyll",
  "CNAME",
]);

function isAllowedPublicPath(rel: string): boolean {
  const n = rel.replace(/\\/g, "/");
  if (ALLOWED_ROOT_FILES.has(n)) return true;
  if (n.startsWith("assets/")) return true;
  return false;
}

function safeFilePath(root: string, urlPath: string): string | null {
  const pathname = decodeURIComponent(new URL(urlPath, "http://127.0.0.1").pathname);
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  if (rel.includes("..")) return null;
  if (!isAllowedPublicPath(rel)) return null;
  const abs = normalize(resolve(root, rel));
  const rootNorm = normalize(resolve(root));
  if (!abs.startsWith(rootNorm)) return null;
  return abs;
}

function sendFile(res: ServerResponse, path: string): void {
  const ext = extname(path);
  res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
  createReadStream(path).pipe(res);
}

function handler(root: string) {
  return (req: IncomingMessage, res: ServerResponse): void => {
    const url = req.url ?? "/";
    if (url.startsWith("/api/")) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("No API in static MVP");
      return;
    }
    const abs = safeFilePath(root, url);
    if (!abs) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }
    if (!existsSync(abs)) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const st = statSync(abs);
    if (st.isDirectory()) {
      const indexPath = join(abs, "index.html");
      if (existsSync(indexPath)) {
        sendFile(res, indexPath);
        return;
      }
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    sendFile(res, abs);
  };
}

function openBrowser(url: string): void {
  if (process.env.OPEN_BROWSER === "0") return;
  const opts = { stdio: "ignore" as const, detached: true };
  try {
    if (process.platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { ...opts, shell: false });
    } else if (process.platform === "darwin") {
      spawn("open", [url], opts);
    } else {
      spawn("xdg-open", [url], opts);
    }
  } catch {
    // ignore
  }
}

const root = documentRoot();
if (!existsSync(join(root, "index.html"))) {
  console.error(`Web root has no index.html: ${root}`);
  console.error(`CWD: ${cwd()}`);
  process.exit(1);
}

const port = Number(process.env.PORT) || 8080;
const host = process.env.HOST ?? "127.0.0.1";

const server = createServer(handler(root));
server.listen(port, host, () => {
  const url = `http://${host}:${port}/`;
  console.log(`GNUCHANOS web: ${url}`);
  console.log(`Serving: ${root}`);
  openBrowser(url);
});
