const CACHE_NAME = 'trinadha-paan-shop-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // You would add other static assets here like images, CSS, etc.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
