/* CampusCravings service worker — minimal offline shell.
 * Strategy: network-first for "/" and "/manifest.json" with cache fallback.
 * Other requests bypass the SW entirely (no caching, no interception).
 */
const CACHE_VERSION = "cc-shell-v1";
const CORE_ASSETS = ["/", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Only cache the marketing landing shell + manifest. Everything else is passed through.
  const isCacheable =
    url.pathname === "/" ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/icon.svg";

  if (!isCacheable) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache a copy of successful responses for offline fallback.
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match("/"))
      )
  );
});
