/* Theme Studio app-shell worker. Theme packages and preview art stay network-first
   so an edit never previews a stale player asset. The shell is network-first too:
   serving it from cache first kept a tab (and this worker's own query-keyed copy)
   on the previous release after a deploy, because a cache hit skipped the network
   entirely. The cache is now only an offline fallback. */
const CACHE = 'innioasis-studio-v96';
const SHELL = [
  './',
  './index.html',
  './studio.css',
  './studio.js',
  '../studio-drop-handoff.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  '../assets/native-y1/better-y.png',
  '../assets/native-y1/theme-default-cover.png',
  '../assets/native-y2/theme-default-cover.png',
  '../assets/bundled-themes/y1/theme1.png',
  '../assets/bundled-themes/y1/theme2.png',
  '../assets/bundled-themes/y1/theme3.png',
  '../assets/bundled-themes/y1/theme4.png',
  '../assets/bundled-themes/y2/theme1.png',
  '../assets/bundled-themes/y2/theme2.png',
  '../assets/bundled-themes/y2/theme3.png',
  '../assets/bundled-themes/y2/theme4.png',
  '../assets/bundled-themes/y2/theme5.png',
  '../assets/native-y1/theme-selected.png',
  '../assets/native-y1/theme-multiselect.png',
  '../assets/native-y2/theme-selected-light.png',
  '../assets/native-y2/theme-selected-dark.png',
  '../assets/native-y2/theme-multiselect-light.png',
  '../assets/native-y2/theme-multiselect-dark.png',
  '../assets/native-y1/theme-options/delete.png',
  '../assets/native-y1/theme-options/delete-selected.png',
  '../assets/native-y1/theme-options/multi-select.png',
  '../assets/native-y1/theme-options/multi-select-selected.png',
  '../assets/native-y1/theme-options/all-select.png',
  '../assets/native-y1/theme-options/all-select-selected.png',
  '../assets/native-y1/theme-options/rename.png',
  '../assets/native-y1/theme-options/rename-selected.png',
  '../assets/native-y1/theme-options/as-theme.png',
  '../assets/native-y1/theme-options/as-theme-selected.png',
  '../assets/native-y2/theme-options/delete.png',
  '../assets/native-y2/theme-options/delete-selected.png',
  '../assets/native-y2/theme-options/multi-select.png',
  '../assets/native-y2/theme-options/multi-select-selected.png',
  '../assets/native-y2/theme-options/all-select.png',
  '../assets/native-y2/theme-options/all-select-selected.png',
  '../assets/native-y2/theme-options/rename.png',
  '../assets/native-y2/theme-options/rename-selected.png',
  '../assets/native-y2/theme-options/as-theme.png',
  '../assets/native-y2/theme-options/as-theme-selected.png',
  '../assets/native-y2/theme-options/delete-dark.png',
  '../assets/native-y2/theme-options/delete-selected-dark.png',
  '../assets/native-y2/theme-options/multi-select-dark.png',
  '../assets/native-y2/theme-options/multi-select-selected-dark.png',
  '../assets/native-y2/theme-options/all-select-dark.png',
  '../assets/native-y2/theme-options/all-select-selected-dark.png',
  '../assets/native-y2/theme-options/rename-dark.png',
  '../assets/native-y2/theme-options/rename-selected-dark.png',
  '../assets/native-y2/theme-options/as-theme-dark.png',
  '../assets/native-y2/theme-options/as-theme-selected-dark.png'
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
