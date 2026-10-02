/* Wellness by Frank: offline cache for the app's own files. Bump VERSION when you change any file.
   Google Fonts are left to the browser's normal cache. */
const VERSION = 'wbf-2';
const SHELL = [
  './', 'index.html', 'app.css', 'manifest.webmanifest',
  'js/figure.js', 'js/exercises.js', 'js/programs.js', 'js/science.js', 'js/sound.js', 'js/figure3d.js', 'js/app.js',
  'vendor/three.module.min.js',
  'img/wellness-1.jpg', 'img/wellness-2.jpg', 'img/wellness-3.jpg', 'img/wellness-4.jpg',
  'img/icon-192.png', 'img/icon-512.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // cache first, refresh in the background
  e.respondWith(caches.open(VERSION).then((cache) => cache.match(req).then((hit) => {
    const net = fetch(req)
      .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => hit || Response.error());
    return hit || net;
  })));
});
