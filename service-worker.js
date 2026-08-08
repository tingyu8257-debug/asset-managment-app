const CACHE_VERSION = "core-satellite-v1.2.2";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./icons/icon.svg",
  "./icons/maskable-icon.svg",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./js/data.js",
  "./js/app-constants.js",
  "./js/asset-calculation-core.js",
  "./js/personal-finance-domain.js",
  "./js/cash-flow-domain.js",
  "./js/storage.js",
  "./js/position-math.js",
  "./js/finance-domain.js",
  "./js/research-domain.js",
  "./js/decision-domain.js",
  "./js/review-domain.js",
  "./js/app-labels.js",
  "./js/app-formatters.js",
  "./js/app-utils.js",
  "./js/data-management-service.js",
  "./js/portfolio-selectors.js",
  "./js/net-worth-selectors.js",
  "./js/calculation-service.js",
  "./js/cash-flow-service.js",
  "./js/investment-repositories.js",
  "./js/portfolio/stocks/stock-research-system.js",
  "./js/dashboard-view.js",
  "./js/cash-flow-view.js",
  "./js/investment-view.js",
  "./js/investment-form-controller.js",
  "./js/journal-view.js",
  "./js/review-view.js",
  "./js/portfolio/portfolio-registry.js",
  "./js/portfolio/portfolio-router.js",
  "./js/portfolio/stocks/stocks-module.js",
  "./js/personal-finance-view.js",
  "./js/personal-finance-form-controller.js",
  "./js/cash-flow-form-controller.js",
  "./js/pwa-registration.js",
  "./js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cached) => cached || fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        return response;
      }))
  );
});
