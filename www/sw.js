/* Toddl service worker — cache-first so the app works fully
   offline after the first visit (planes, waiting rooms…). */

var CACHE = 'toddl-__TODDL_VERSION__';   // stamped per build
var WORDS = ['dog', 'cat', 'bird', 'fish', 'turtle', 'apple', 'banana',
  'strawberry', 'flower', 'tree', 'star', 'moon', 'car', 'boat',
  'teddy-bear', 'ball', 'circle', 'square', 'triangle', 'heart',
  'red', 'blue', 'yellow', 'green', 'one', 'two', 'three', 'four', 'five',
  'spring', 'summer', 'autumn', 'winter',
  'pea', 'lettuce', 'carrot', 'tomato', 'blueberry', 'pumpkin',
  'broccoli', 'cabbage', 'orange'];
var GARDEN = ['watering-can', 'strawberry', 'pea', 'lettuce', 'carrot', 'tomato',
  'blueberry', 'pumpkin', 'apple', 'broccoli', 'cabbage', 'orange'];
var ASSETS = [
  '.',
  'index.html',
  'css/style.css',
  'js/audio.js',
  'js/scenery.js',
  'js/bubbles.js',
  'js/shapes.js',
  'js/colors.js',
  'js/garden.js',
  'js/piano.js',
  'js/main.js',
  'icons/icon.svg',
  'icons/icon-192.webp',
  'icons/icon-512.webp',
  'manifest.webmanifest',
  'version.json'
].concat(WORDS.map(function (w) { return 'audio/words/' + w + '.mp3'; }))
 .concat(['scene.webp', 'sceneglow.webp', 'orion.webp']
   .map(function (g) { return 'img/galaxy/' + g; }))
 .concat(GARDEN.map(function (g) { return 'img/garden/' + g + '.webp'; }));

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (cache) {
      // straight from the network, never the HTTP cache: an update
      // must really be the new build
      return cache.addAll(ASSETS.map(function (u) {
        return new Request(u, { cache: 'reload' });
      }));
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
  var path = new URL(e.request.url).pathname;
  // version.json always comes from the network, so the grown-ups'
  // Update button can see a newer build; cached copy when offline.
  if (/\/version\.json$/.test(path)) {
    e.respondWith(fetch(e.request).catch(function () {
      return caches.match(e.request, { ignoreSearch: true });
    }));
    return;
  }
  // assets carry a ?v= build stamp; the cache keys are the bare paths
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (cached) {
      return cached || fetch(e.request);
    })
  );
});
