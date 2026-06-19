// service-worker.js
const CACHE_NAME = 'copa-tabuada-v1';
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

// Instalação: cacheia os assets
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

// Ativação: limpa caches antigos
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

// Intercepta requisições e serve do cache (estratégia: cache-first)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrou no cache, retorna
        if (response) return response;
        // Senão, faz a requisição de rede
        return fetch(event.request).then(fetchResponse => {
          // Se a requisição for bem-sucedida, cacheia a resposta para futuras visitas
          if (fetchResponse && fetchResponse.status === 200) {
            const responseClone = fetchResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return fetchResponse;
        }).catch(() => {
          // Se falhar (offline), tenta retornar uma página offline (opcional)
          // Aqui você pode retornar uma página especial, mas vamos retornar o index
          return caches.match('/TABUADA-FINAL/final.html');
        });
      })
  );
});
