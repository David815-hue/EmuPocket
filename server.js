const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 4173;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".bin": "application/octet-stream",
  ".wasm": "application/wasm",
};

function sendFile(filePath, response) {
  const extension = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[extension] || "application/octet-stream";

  response.writeHead(200, {
    "Content-Type": mimeType,
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Cache-Control": "no-cache",
  });

  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer((request, response) => {
  const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
  const relativePath = requestPath === "/" ? "/index.html" : requestPath;
  const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(ROOT, normalizedPath);

  if (!filePath.startsWith(ROOT)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    if (stats.isDirectory()) {
      sendFile(path.join(filePath, "index.html"), response);
      return;
    }

    sendFile(filePath, response);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Pocket Codex server running at http://127.0.0.1:${PORT}`);
});
