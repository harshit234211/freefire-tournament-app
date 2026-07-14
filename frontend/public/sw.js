// Cache version - increment to force all clients to update
const CACHE_NAME = 'fragarena-cache-v3';
const urlsToCache = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// On install: clear old caches and cache new assets
self.addEventListener('install', event => {
  self.skipWaiting(); // Force immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// On activate: delete ALL old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }))
    ).then(() => self.clients.claim())
  );
});

// Fetch: NEVER cache API calls or Next.js JS chunks - always network first
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Skip caching for: API calls, Next.js chunks, auth requests
  if (
    url.includes('onrender.com') ||
    url.includes('/_next/') ||
    url.includes('/api/') ||
    url.includes('vercel.app/_next')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For static assets only: network first, then cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
