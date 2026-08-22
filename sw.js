const CACHE = 'ot-board-v3';
const CORE = ['./', './index.html', './support.js', './manifest.json', './icon-192.png', './icon-512.png'];
const VENDOR = [
  'https://unpkg.com/react@18.3.1/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(async (c) => {
    await c.addAll(CORE).catch(() => {});
    await Promise.all(VENDOR.map((u) => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
  }));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function put(req, res) {
  if (res && (res.status === 200 || res.type === 'opaque')) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.includes('api.github.com')) return;

  // The app shell must always be fresh when the network is up, otherwise a
  // deployed update never reaches the phone. Cache is the offline fallback only.
  const isShell = req.mode === 'navigate' || /\/(index\.html|support\.js)(\?|$)/.test(req.url) || req.url.endsWith('/');
  if (isShell) {
    e.respondWith(
      fetch(req).then((res) => put(req, res)).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  // Icons, fonts, vendor bundles: cache-first, refreshed in the background.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => put(req, res)).catch(() => hit);
      return hit || net;
    })
  );
});
