const CACHE_NAME = "hive-os-shell-v2";

const STATIC_ASSETS_TO_PRECACHE = [
  "/",
  "/sign-in",
  "/logos/hive-mark.png",
  "/branding/hive-blue.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS_TO_PRECACHE).catch(() => {
          // Tolerant of missing pre-cache routes during build
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  // Immediately purge any previous caches to prevent stale chunks
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key.startsWith("hive-os-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. In local development, never intercept any requests via service worker
  if (
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.endsWith(".localhost") ||
    url.port === "3000" ||
    url.port === "3001"
  ) {
    return;
  }

  // 2. Next.js chunks, Turbopack, HMR, and build files must NEVER be cached by SW
  if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.includes("turbopack") ||
    url.pathname.includes("hot-update") ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/broadcasting/") ||
    url.protocol === "ws:" ||
    url.protocol === "wss:"
  ) {
    return;
  }

  // 3. Public chat must use its own live page, never the ERP's cached shell
  if (url.pathname === "/embed/support-bot" || url.pathname.startsWith("/embed/support-bot/")) {
    return;
  }

  // 4. Skip non-GET requests (handled by Axios/Fetch mutation queue)
  if (request.method !== "GET") {
    return;
  }

  // 5. Static assets (images, fonts, branding icons): Cache-First with revalidation
  if (
    url.pathname.startsWith("/branding/") ||
    url.pathname.startsWith("/logos/") ||
    url.pathname.startsWith("/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ttf|eot|ico)$/i)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Fetch in background to keep cache fresh
            fetch(request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  cache.put(request, networkResponse.clone());
                }
              })
              .catch(() => {});
            return cachedResponse;
          }
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 6. Navigation requests (HTML pages): Network-First, fallback to Cache
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.open(CACHE_NAME).then((cache) => {
            return cache.match(request).then((cached) => {
              if (cached) return cached;
              return cache.match("/sign-in").then((signIn) => {
                if (signIn) return signIn;
                return cache.match("/");
              });
            });
          });
        })
    );
  }
});
