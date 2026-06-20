// service-worker.js
const CACHE_NAME = 'copa-tabuada-v2';
const ASSETS = [
  '/TABUADA-FINAL/',
  '/TABUADA-FINAL/final.html',
  '/TABUADA-FINAL/css/styles.css',
  '/TABUADA-FINAL/js/config/firebase-config.js',
  '/TABUADA-FINAL/js/services/firebase-service.js',
  '/TABUADA-FINAL/js/services/auth-service.js',
  '/TABUADA-FINAL/js/utils/constants.js',
  '/TABUADA-FINAL/js/utils/helpers.js',
  '/TABUADA-FINAL/js/utils/sounds.js',
  '/TABUADA-FINAL/js/utils/achievements.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

// Instalação
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições (com filtros)
self.addEventListener('fetch', event => {
  const request = event.request;

  // Ignora requisições que não são GET ou não são HTTP/HTTPS
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    event.respondWith(fetch(request));
    return;
  }

  // Ignora requisições para extensões (chrome-extension://, moz-extension://)
  if (request.url.startsWith('chrome-extension://') || request.url.startsWith('moz-extension://')) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;
        return fetch(request).then(fetchResponse => {
          if (fetchResponse && fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return fetchResponse;
        }).catch(() => {
          return caches.match('/TABUADA-FINAL/final.html');
        });
      })
  );
});
