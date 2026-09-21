const CACHE_NAME = "kq-bookkeeping-v4";

// Separate cache for HTML/RSC responses so page staleness can be reasoned
// about (and cleared) independently of immutable build assets.
const PAGE_CACHE_NAME = "kq-bookkeeping-pages-v4";

const CURRENT_CACHES = [CACHE_NAME, PAGE_CACHE_NAME];

// Only assets that are unconditionally 200 for both logged-in and logged-out
// visitors. "/" and "/login" used to be precached here, but the auth proxy
// redirects one or the other depending on session state, and `cache.addAll`
// rejects on a redirected response — which failed `install` outright, leaving
// every user with no service worker at all.
const PRECACHE_URLS = ["/manifest.json"];

/** Only responses safe to replay later: same-origin, 200, not a redirect. */
function isCacheable(response) {
  return (
    response &&
    response.ok &&
    response.type === "basic" &&
    !response.redirected
  );
}

function putInCache(cacheName, request, response) {
  if (!isCacheable(response)) return;
  const clone = response.clone();
  // Swallow failures: a cache write is best-effort and a rejection here would
  // surface as an unhandled rejection inside the worker.
  caches
    .open(cacheName)
    .then((cache) => cache.put(request, clone))
    .catch(() => {});
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // Precaching is an optimization, never a reason to fail activation.
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => !CURRENT_CACHES.includes(name))
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API/Supabase requests
  if (event.request.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.hostname.includes("supabase")) return;

  // Static assets: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg")
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          // Guarded by isCacheable: a chunk that transiently 404s mid-deploy
          // used to be cached, and cache-first then served that 404 forever.
          putInCache(CACHE_NAME, event.request, response);
          return response;
        });
      })
    );
    return;
  }

  // Pages: network-first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Never cache the auth redirect — storing the 307-to-/login and
        // replaying it offline would bounce a signed-in user to the login page.
        putInCache(PAGE_CACHE_NAME, event.request, response);
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
