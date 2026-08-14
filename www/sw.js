/* Toddl service worker — cache-first so the app works fully
   offline after the first visit (planes, waiting rooms…). */

var CACHE = 'toddl-v3';
var WORDS = ['dog', 'cat', 'bird', 'fish', 'turtle', 'apple', 'banana',
  'strawberry', 'flower', 'tree', 'star', 'moon', 'car', 'boat',
  'teddy-bear', 'ball', 'circle', 'square', 'triangle', 'heart',
  'red', 'blue', 'yellow', 'green', 'one', 'two', 'three', 'four', 'five'];
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
  'icons/icon-192.webp',
  'icons/icon-512.webp',
  'manifest.webmanifest'
].concat(WORDS.map(function (w) { return 'audio/words/' + w + '.mp3'; }));

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
