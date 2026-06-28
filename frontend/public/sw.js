const CACHE_VERSION = "gmtch-tune-os-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const ASSET_CACHE = `${CACHE_VERSION}-assets`;

const CORE_ASSETS = [
  "/",
  "/login",
  "/web",
  "/manifest.webmanifest",
  "/brand/gmtch-logo.png",
  "/brand/gmtch-isotipo.png",
  "/pwa/icon-192.png",
  "/pwa/icon-512.png",
  "/pwa/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) =>
      Promise.allSettled(
        CORE_ASSETS.map((asset) =>
          cache.add(new Request(asset, { cache: "reload" }))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("gmtch-tune-os-") && !key.startsWith(CACHE_VERSION))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isSafeStaticRequest = (request) => {
  if (request.method !== "GET") return false;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api")) return false;
  if (url.pathname.startsWith("/uploads")) return false;
  if (url.pathname.includes("token=")) return false;

  return true;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isSafeStaticRequest(request)) return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/login")))
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/pwa/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy));
          return response;
        });
      })
    );
  }
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "GMTCH Tune OS";
  const options = {
    body: payload.body || "Nueva alerta operativa",
    icon: payload.icon || "/pwa/icon-192.png",
    badge: payload.badge || "/pwa/icon-192.png",
    data: {
      url: payload.url || payload.data?.url || "/login"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/login";
  const normalizedUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const sameOriginClient = clients.find((client) => {
        try {
          return new URL(client.url).origin === self.location.origin;
        } catch {
          return false;
        }
      });

      if (sameOriginClient) {
        sameOriginClient.focus();
        return sameOriginClient.navigate(normalizedUrl);
      }

      return self.clients.openWindow(normalizedUrl);
    })
  );
});
