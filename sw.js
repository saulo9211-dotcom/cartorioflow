// CartórioFlow Service Worker
const CACHE_NAME = 'cartorioflow-v2';

// Apenas recursos estáticos que raramente mudam
const SHELL = [
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@300;400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL.map(url => new Request(url, {mode: 'no-cors'}))).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase: sempre network
  if(url.includes('firestore.googleapis.com') ||
     url.includes('firebase') ||
     url.includes('googleapis.com/identitytoolkit')){
    return;
  }

  // index.html: sempre network-first — garante atualização automática
  if(url.endsWith('/') || url.includes('index.html')){
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Demais recursos: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      if(cached) return cached;
      return fetch(event.request).then(response => {
        if(response && response.status === 200){
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
