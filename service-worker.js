// Service Worker for caching static assets
const CACHE_NAME = 'upi-qr-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json'
    // Note: External CDN links and image URLs are generally not cached here,
    // though the browser handles some of them.
];

// Install event: cache all static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache and pre-caching assets');
                // Using skipWaiting to activate the new service worker immediately
                self.skipWaiting(); 
                return cache.addAll(urlsToCache);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Claim clients to immediately control open pages
    );
});

// Fetch event: serve cached assets first, falling back to network
self.addEventListener('fetch', (event) => {
    // We only cache the local files listed in urlsToCache
    const isLocalRequest = urlsToCache.some(url => event.request.url.includes(url.replace('./', '/')));

    if (isLocalRequest) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Cache hit - return response
                    if (response) {
                        return response;
                    }
                    // No cache hit - fetch from network
                    return fetch(event.request);
                })
        );
    }
    // For all other requests (like CDN links, remote images), just let the browser fetch them.
});
