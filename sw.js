/* Wellness by Frank: offline cache for the app's own files. Bump VERSION when you change any file.
   Frank's videos (media/) are left to the browser's normal cache: phones ask for videos in pieces,
   which a cache can't answer. */
const VERSION = 'wbf-11';
// kept when the worker installs: what the app needs to open and train offline. Frank's photos too: Workouts and
// Frank show them, also on a phone that never opened those tabs online
const SHELL = [
  './', 'index.html', 'app.css', 'manifest.webmanifest',
  'fonts/fonts.css', 'fonts/Nunito-latin.woff2', 'fonts/Nunito-latin-ext.woff2', 'fonts/GildaDisplay-latin.woff2', 'fonts/GildaDisplay-latin-ext.woff2',
  'js/figure.js', 'js/exercises.js', 'js/programs.js', 'js/science.js', 'js/sound.js', 'js/figure3d.js', 'js/media.js', 'js/app.js',
  'vendor/three.module.min.js', 'vendor/jsm/GLTFLoader.js', 'vendor/jsm/BufferGeometryUtils.js', 'vendor/jsm/RoomEnvironment.js',
  'assets/coach-m.glb',
  'img/wellness-1.jpg', 'img/wellness-2.jpg', 'img/wellness-3.jpg', 'img/wellness-4.jpg',
  'img/icon-192.png'
];
// kept from the first time the app uses them, not at install: the other coach (1.1 MB most phones never load) and
// the install icon. A phone that has them gets them again with a new VERSION.
const LAZY = [
  'assets/coach-f.glb',
  'img/icon-512.png'
];
const HOME = new URL('./', location.href).href;
// 'no-cache' asks the server, not the browser's HTTP cache (Pages lets it keep files 10 minutes, long enough to put
// old files under a new VERSION). A file the browser already has is checked, not downloaded again: Pages answers 304.
const fresh = (u) => new Request(u, { cache: 'no-cache' });
const keep = (cache, u) => cache.match(u).then((hit) => hit || cache.add(fresh(u))).catch(() => null);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map(fresh))
    .then(() => Promise.all(LAZY.map((u) => caches.match(u).then((had) => had && keep(c, u))))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// A first visit: the page loaded files before this worker took over (the other coach). It lists what it loaded,
// and the LAZY files among them are kept as if they had come through here.
self.addEventListener('message', (e) => {
  const used = e.data && e.data.used;
  if (!Array.isArray(used)) return;
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(LAZY.filter((u) => used.indexOf(new URL(u, HOME).href) !== -1).map((u) => keep(c, u)))));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (req.headers.has('range') || req.destination === 'video' || req.destination === 'audio') return;
  // a page is kept once, without what a shared link adds after '?' (utm_source, fbclid)
  const nav = req.mode === 'navigate', key = nav ? req.url.split('?')[0] : req;
  const cache = caches.open(VERSION);
  // the copy first; the network refreshes it, and the worker stays awake until it has
  const net = fetch(req, { cache: 'no-cache' });
  e.waitUntil(net.then((res) => {
    if (res.status !== 200) return null;
    const copy = res.clone();
    return cache.then((c) => c.put(key, copy));
  }).catch(() => null));
  // no copy and no network: a page in the app's folder opens the app
  const home = () => (nav && new URL('./', key).href === HOME ? cache.then((c) => c.match('./')) : null);
  e.respondWith(cache.then((c) => c.match(req, { ignoreSearch: nav }))
    .then((hit) => hit || net.catch(home))
    .then((res) => res || Response.error()));
});
