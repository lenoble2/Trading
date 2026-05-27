self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('pwa-store').then((cache) => {
      return cache.addAll(['index.html', 'style.css', 'script.js', 'res/icon.png']);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});

