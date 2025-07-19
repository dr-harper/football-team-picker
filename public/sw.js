const VERSION = __BUILD_VERSION__;
const BASE_URL = self.registration.scope.replace(/\/$/, '');
const CACHE_NAME = `teamshuffle-${VERSION}`;
const ASSETS = [
  `${BASE_URL}/`,
  `${BASE_URL}/index.html`,
  `${BASE_URL}/logo.png`,
  `${BASE_URL}/manifest.json`,
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
});
