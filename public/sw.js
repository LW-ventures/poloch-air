// Minimaler Service Worker: App-Hülle offline verfügbar, Daten kommen immer frisch aus dem Netz.
const CACHE = 'polochair-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Seite selbst und Versionsdatei immer beim Server nachfragen (GitHub Pages hält sie sonst ~10 min zwischengespeichert),
  // damit neue Versionen sofort ankommen. Die Code-Dateien haben eindeutige Namen und dürfen normal gecacht werden.
  const fresh = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/version.json');
  if (url.pathname.endsWith('/version.json')) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  // Netzwerk zuerst, bei Funkloch aus dem Cache
  e.respondWith(
    fetch(e.request, fresh ? { cache: 'no-cache' } : undefined)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))),
  );
});
