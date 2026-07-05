// ============================================================
// SERVICE WORKER – Copa Tabuada CEIB 2026
// ============================================================

const CACHE_STATIC_NAME = 'copa-tabuada-v1.2';
const CACHE_DYNAMIC_NAME = 'copa-tabuada-dynamic-v1.2';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/final.html',
  '/tutorial-instalacao.html',
  '/manifest.json',
  '/css/style.css',
  '/js/main.js',
  '/js/config/firebase.js',
  '/js/modules/auth.js',
  '/js/modules/aviso.js',
  '/js/modules/config.js',
  '/js/modules/db.js',
  '/js/modules/game.js',
  '/js/modules/gameLoop.js',
  '/js/modules/install.js',
  '/js/modules/medals.js',
  '/js/modules/ranking.js',
  '/js/modules/sound.js',
  '/js/modules/state.js',
  '/js/modules/tutorial.js',
  '/js/modules/ui.js',
  '/js/modules/version.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', event => {
  console.log('[SW] Instalando...');
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then(cache => {
        console.log('[SW] Cacheando assets estáticos');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  console.log('[SW] Ativando...');
  event.waitUntil(
    caches.keys()
      .then(keys => {
        return Promise.all(
          keys.filter(key => key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME)
              .map(key => caches.delete(key))
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_DYNAMIC_NAME)
                  .then(cache => cache.put(event.request, networkResponse.clone()));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_DYNAMIC_NAME)
                .then(cache => cache.put(event.request, responseClone));
            }
            return networkResponse;
          })
          .catch(() => {
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/index.html');
            }
            return new Response('Recurso indisponível offline', { status: 503 });
          });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
