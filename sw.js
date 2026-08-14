/* Toddl service worker — cache-first so the app works fully
   offline after the first visit (planes, waiting rooms…). */

var CACHE = 'toddl-v1';
var ASSETS = [
  '.',
  'index.html',
  'css/style.css',
  'js/audio.js',
  'js/bubbles.js',
  'js/shapes.js',
  'js/colors.js',
  'js/garden.js',
  'js/main.js',
  'icons/icon.svg',
  'manifest.webmanifest'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      return cached || fetch(e.request);
    })
  );
});
