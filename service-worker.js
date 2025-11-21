const CACHE_NAME = 'manageshop-v4';
const ASSETS = [
    './',
    './index.html',
    './app.js',
    './db_adapter.js',
    './login.js',
    './firebase.js',
    './manifest.json',
    './indexed_db.js',
    './notification.js',
    './notification.css',
    './sw-register.js'
];

// Install event
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Caching assets');
                return cache.addAll(ASSETS);
            })
    );
});

// Activate event
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(keys.map(key => {
                if (key !== CACHE_NAME) {
                    console.log('Clearing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});

// Fetch event
self.addEventListener('fetch', event => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Return cached response if found
                if (cachedResponse) {
                    return cachedResponse;
                }

                // Otherwise, try to fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Cache successful responses (excluding opaque responses)
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        // Network request failed (offline or error)
                        console.log('Fetch failed for:', event.request.url);

                        // For navigation requests, return index.html from cache
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }

                        // For other requests, re-throw to let browser handle it
                        throw error;
                    });
            })
    );
});
