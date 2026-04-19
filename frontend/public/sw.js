const CACHE_VERSION = "studious-cache-v1";
const APP_SHELL_URL = "/";

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => cache.addAll([APP_SHELL_URL]))
    );
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    if (requestUrl.pathname.startsWith("/api/")) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(APP_SHELL_URL, responseClone);
                    });
                    return networkResponse;
                })
                .catch(async () => {
                    const cache = await caches.open(CACHE_VERSION);
                    const cachedResponse =
                        (await cache.match(request)) || (await cache.match(APP_SHELL_URL));

                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    return new Response("Offline", {
                        status: 503,
                        statusText: "Offline",
                        headers: { "Content-Type": "text/plain" },
                    });
                })
        );
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                const responseClone = networkResponse.clone();
                caches.open(CACHE_VERSION).then((cache) => {
                    cache.put(request, responseClone);
                });
                return networkResponse;
            });
        })
    );
});
