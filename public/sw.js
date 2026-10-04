const CACHE_NAME = 'igbe-attendance-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/pwa_icon_192.jpg', // Make sure this matches your manifest!
  '/pwa_icon_512.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept requests originating from our app's domain and GET methods
  if (!event.request.url.startsWith(self.location.origin) || event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. If it exists in cache, return it immediately and update in background safely
      if (cachedResponse) {
        event.waitUntil(
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                return caches.open(CACHE_NAME).then((cache) => {
                  return cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {/* Ignore background network sync errors */})
        );
        return cachedResponse;
      }

      // 2. Cache Miss: Fetch from network and clone safely
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        event.waitUntil(
          caches.open(CACHE_NAME).then((cache) => {
            return cache.put(event.request, responseToCache);
          })
        );

        return response;
      });
    })
  );
});
