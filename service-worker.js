const CACHE_NAME = "kids-star-rewards-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./assets/css/styles.css?v=20260225k",
  "./assets/js/date-utils.js?v=20260225k",
  "./assets/js/store.js?v=20260225k",
  "./assets/js/sync-auth-client.js?v=20260225k",
  "./assets/js/modals.js?v=20260225k",
  "./assets/js/app.js?v=20260225k",
  "./manifest.json",
  "./assets/icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache the service worker script itself.
  if (url.pathname.endsWith("/service-worker.js") || url.pathname.endsWith("service-worker.js")) {
    return;
  }

  // Use network-first for HTML to avoid stale UI/app bundles.
  const isHtmlRequest =
    event.request.mode === "navigate" ||
    event.request.headers.get("accept")?.includes("text/html");

  if (isHtmlRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") return response;
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        return response;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
