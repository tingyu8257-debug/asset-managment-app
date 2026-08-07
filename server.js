const fs = require("fs");
const http = require("http");
const path = require("path");

function sendStaticFile(request, response) {
  const url = new URL(request.url, "http://localhost");
  const relative = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const root = path.resolve(__dirname);
  const filePath = path.resolve(root, relative);

  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".svg": "image/svg+xml; charset=utf-8",
    ".png": "image/png"
  };
  response.writeHead(200, { "Content-Type": types[extension] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(response);
}

function createNativeServer() {
  return http.createServer(sendStaticFile);
}

function startServer(options = {}) {
  const port = Number(options.port ?? process.env.PORT) || 3000;
  const server = createNativeServer().listen(port);
  console.log(`Core-Satellite server running at http://localhost:${port}`);
  return server;
}

if (require.main === module) startServer();

module.exports = { createNativeServer, startServer };
