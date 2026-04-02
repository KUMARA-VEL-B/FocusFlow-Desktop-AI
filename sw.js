// FocusFlow Desktop AI — Service Worker v1.0
const CACHE_NAME = 'focusflow-desktop-ai-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Install: cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET or cross-origin requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For API calls (weather), network first, no caching
  if (event.request.url.includes('wttr.in') || event.request.url.includes('openweathermap')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: 'Offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Cache-first strategy for app assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => caches.match('./index.html'))
  );
});

// Listen for messages to update
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
