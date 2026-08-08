const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const html = read("index.html");
const manifest = JSON.parse(read("manifest.webmanifest"));
const serviceWorker = read("service-worker.js");
const pagesWorkflow = read(".github/workflows/pages.yml");

assert(html.includes('rel="manifest" href="manifest.webmanifest"'));
assert(html.includes("viewport-fit=cover"));
assert(html.includes('js/pwa-registration.js'));
assert(html.includes('id="pwa-status"'));
assert(html.includes('data-header-quick-actions-toggle'));

assert.strictEqual(manifest.display, "standalone");
assert.strictEqual(manifest.id, "./index.html");
assert.strictEqual(manifest.start_url, "./index.html#dashboard");
assert.strictEqual(manifest.theme_color, "#0c2438");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2);
assert(manifest.icons.some((icon) => icon.src === "icons/icon-192.png" && icon.sizes === "192x192"));
assert(manifest.icons.some((icon) => icon.purpose === "maskable"));

[
  "./index.html",
  "./css/style.css",
  "./manifest.webmanifest",
  "./js/app.js",
  "./js/pwa-registration.js",
  "./js/storage.js",
  "./js/data-management-service.js",
  "./js/portfolio/stocks/stocks-module.js",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
].forEach((asset) => {
  assert(serviceWorker.includes(`"${asset}"`), `${asset} should be cached by the service worker`);
});

assert(serviceWorker.includes("request.method !== \"GET\""));
assert(serviceWorker.includes("request.mode === \"navigate\""));
assert(serviceWorker.includes("caches.delete"));
assert(serviceWorker.includes("SKIP_WAITING"));
assert(!serviceWorker.includes(".then(() => self.skipWaiting())"));
assert(serviceWorker.includes("core-satellite-v1.2.7"));

assert(pagesWorkflow.includes("actions/configure-pages@v5"));
assert(pagesWorkflow.includes("actions/upload-pages-artifact@v4"));
assert(pagesWorkflow.includes("actions/deploy-pages@v4"));
assert(pagesWorkflow.includes("path: \"_site\""));

console.log("Milestone J PWA automated tests passed.");
