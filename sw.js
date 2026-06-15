const CACHE_NAME = 'mini-rede-social-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './auth.html',
  './app.js',
  './auth.js',
  './utils.js',
  './style.css',
  './manifest.json',
  'https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white',
  'https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white',
  'https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black',
  'https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache addAll error:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
  self.clients.claim();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache first strategy for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          if (!response || response.status !== 200) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        }).catch(() => {
          if (request.mode === 'navigate') {
            return caches.match('./index.html') || caches.match('./auth.html');
          }
          return null;
        });
      })
    );
  }
});
