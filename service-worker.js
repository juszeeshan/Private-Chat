/* Network-first service worker.
   Always tries the network first so updates to the hosted files show up
   immediately; only falls back to the cache when the device is offline.
   Never caches (or serves cached) requests to the Apps Script backend
   (script.google.com / script.googleusercontent.com / googleusercontent.com)
   -- those must always hit the network directly, live data only. */

const CACHE_NAME = 'chat-cache-v1';
const NO_CACHE_HOSTS = ['script.google', 'googleusercontent'];

self.addEventListener('install', function (event) {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })
      );
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = req.url;
  if (NO_CACHE_HOSTS.some(function (h) { return url.indexOf(h) !== -1; })) {
    event.respondWith(fetch(req));
    return;
  }

  event.respondWith(
    fetch(req).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); }).catch(function () {});
      return res;
    }).catch(function () {
      return caches.match(req).then(function (cached) { return cached || Promise.reject('offline, not cached'); });
    })
  );
});
