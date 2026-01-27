const cacheName = 'v1';
const cacheAssets = ['index.html', 'style.css', 'script.js'];

// Installieren und Dateien cachen
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      console.log('Service Worker: Caching Files');
      cache.addAll(cacheAssets);
    })
  );
});

// Offline-Abfrage: Falls kein Netz da ist, nimm die Dateien aus dem Cache
self.addEventListener('fetch', e => {
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});