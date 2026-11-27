/* Theme Studio app-shell worker. Theme packages and preview art stay network-first
   so an edit never previews a stale player asset. The shell is network-first too:
   serving it from cache first kept a tab (and this worker's own query-keyed copy)
   on the previous release after a deploy, because a cache hit skipped the network
   entirely. The cache is now only an offline fallback. */
const CACHE = 'innioasis-studio-v45';
const SHELL = [
  './',
  './index.html',
  './studio.css',
  './studio.js',
  '../studio-drop-handoff.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  const url = new URL(request.url);
  const isShell = SHELL.some((path) => url.pathname.endsWith(path.replace(/^\.\.?\/+/, '/')));
  if (!isShell) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached || caches.match(request, { ignoreSearch: true }))
      )
  );
});
