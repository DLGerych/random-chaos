// Cache version - increment when you make changes to cached files
const VERSION = 'v1.0.0';
const CACHE_NAME = `chaos-picker-${VERSION}`;
const RUNTIME_CACHE = `chaos-picker-runtime-${VERSION}`;

// Core app files that must be cached
const CORE_ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/manifest.webmanifest'
];

// Maximum age for runtime cache (7 days)
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000;

// Install event - cache core assets
self.addEventListener('install', (event) => {
    console.log(`[Service Worker] Installing version ${VERSION}`);

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching core assets');
                return cache.addAll(CORE_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] Core assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Failed to cache core assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log(`[Service Worker] Activating version ${VERSION}`);

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        // Delete any cache that doesn't match current version
                        if (cacheName.startsWith('chaos-picker-') && cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip cross-origin requests
    if (url.origin !== location.origin) {
        return;
    }

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(request)
            .then((cachedResponse) => {
                // If we have a cached response, return it
                if (cachedResponse) {
                    console.log('[Service Worker] Serving from cache:', request.url);

                    // For non-core assets, fetch in background to update cache
                    if (!CORE_ASSETS.includes(url.pathname)) {
                        fetchAndCache(request);
                    }

                    return cachedResponse;
                }

                // No cached response, fetch from network
                console.log('[Service Worker] Fetching from network:', request.url);
                return fetchAndCache(request);
            })
            .catch((error) => {
                console.error('[Service Worker] Fetch failed:', error);

                // Return offline fallback for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/index.html');
                }

                // For other requests, return a basic offline response
                return new Response('Offline', {
                    status: 503,
                    statusText: 'Service Unavailable',
                    headers: new Headers({
                        'Content-Type': 'text/plain'
                    })
                });
            })
    );
});

// Helper function to fetch and cache responses
function fetchAndCache(request) {
    return fetch(request)
        .then((response) => {
            // Only cache successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
                return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            // Determine which cache to use
            const url = new URL(request.url);
            const cacheName = CORE_ASSETS.includes(url.pathname) ? CACHE_NAME : RUNTIME_CACHE;

            // Cache the response
            caches.open(cacheName)
                .then((cache) => {
                    cache.put(request, responseToCache);
                })
                .catch((error) => {
                    console.error('[Service Worker] Failed to cache response:', error);
                });

            return response;
        });
}

// Message event - handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[Service Worker] Received SKIP_WAITING message');
        self.skipWaiting();
    }

    if (event.data && event.data.type === 'CLEAR_CACHE') {
        console.log('[Service Worker] Clearing all caches');
        event.waitUntil(
            caches.keys()
                .then((cacheNames) => {
                    return Promise.all(
                        cacheNames.map((cacheName) => {
                            if (cacheName.startsWith('chaos-picker-')) {
                                return caches.delete(cacheName);
                            }
                        })
                    );
                })
                .then(() => {
                    console.log('[Service Worker] All caches cleared');
                })
        );
    }
});

// Periodic cache cleanup (remove old runtime cache entries)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.open(RUNTIME_CACHE)
            .then((cache) => {
                return cache.keys().then((requests) => {
                    const now = Date.now();
                    return Promise.all(
                        requests.map((request) => {
                            return cache.match(request).then((response) => {
                                if (response) {
                                    const dateHeader = response.headers.get('date');
                                    if (dateHeader) {
                                        const cacheTime = new Date(dateHeader).getTime();
                                        if (now - cacheTime > MAX_CACHE_AGE) {
                                            console.log('[Service Worker] Removing old cache entry:', request.url);
                                            return cache.delete(request);
                                        }
                                    }
                                }
                            });
                        })
                    );
                });
            })
            .catch((error) => {
                console.error('[Service Worker] Cache cleanup failed:', error);
            })
    );
});
