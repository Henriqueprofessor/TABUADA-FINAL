// ============================================================
// ARQUIVO: service-worker.js
// DESCRIÇÃO: Service Worker para PWA - Suporte Offline
// ============================================================

const CACHE_NAME = 'copa-tabuada-v3';
const OFFLINE_PAGE = '/TABUADA-FINAL/offline.html';

// ========== ARQUIVOS PARA CACHE ==========
const ASSETS = [
  // Páginas principais
  '/TABUADA-FINAL/',
  '/TABUADA-FINAL/final.html',
  '/TABUADA-FINAL/offline.html',
  
  // CSS
  '/TABUADA-FINAL/css/styles.css',
  
  // JavaScript - Módulos principais
  '/TABUADA-FINAL/js/main.js',
  '/TABUADA-FINAL/js/config/firebase-config.js',
  '/TABUADA-FINAL/js/config/bonus-config.js',
  '/TABUADA-FINAL/js/config/notification-config.js',
  '/TABUADA-FINAL/js/models/state.js',
  '/TABUADA-FINAL/js/models/game.js',
  '/TABUADA-FINAL/js/ranking/ranking.js',
  '/TABUADA-FINAL/js/services/firebase-service.js',
  '/TABUADA-FINAL/js/services/auth-service.js',
  '/TABUADA-FINAL/js/services/sync-service.js',
  '/TABUADA-FINAL/js/ui/professor-ui.js',
  '/TABUADA-FINAL/js/ui/aluno-ui.js',
  '/TABUADA-FINAL/js/ui/torcida-ui.js',
  '/TABUADA-FINAL/js/utils/helpers.js',
  '/TABUADA-FINAL/js/utils/constants.js',
  '/TABUADA-FINAL/js/utils/sounds.js',
  '/TABUADA-FINAL/js/utils/confetti.js',
  '/TABUADA-FINAL/js/utils/achievements.js',
  '/TABUADA-FINAL/js/utils/notifications.js',
  '/TABUADA-FINAL/js/utils/gamepad.js',
  
  // Firebase (CDN)
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js',
  
  // Bibliotecas externas
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1',
  
  // Manifest e ícones
  '/TABUADA-FINAL/manifest.json',
  'https://ui-avatars.com/api/?name=CT&background=0a0f1e&color=ffd966&size=192',
  'https://ui-avatars.com/api/?name=CT&background=0a0f1e&color=ffd966&size=512'
];

// ========== INSTALAÇÃO ==========
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cacheando assets');
        return cache.addAll(ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Cache concluído!');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[Service Worker] Erro ao cachear:', error);
      })
  );
});

// ========== ATIVAÇÃO ==========
self.addEventListener('activate', event => {
  console.log('[Service Worker] Ativando...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[Service Worker] Removendo cache antigo:', key);
              return caches.delete(key);
            })
      );
    }).then(() => {
      console.log('[Service Worker] Pronto para controlar os clientes!');
      return self.clients.claim();
    })
  );
});

// ========== INTERCEPTAÇÃO DE REQUISIÇÕES ==========
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // ========== IGNORAR CERTAS REQUISIÇÕES ==========
  // Ignora requisições que não são GET
  if (request.method !== 'GET') {
    event.respondWith(fetch(request));
    return;
  }

  // Ignora requisições para extensões do navegador
  if (url.protocol === 'chrome-extension:' || url.protocol === 'moz-extension:') {
    event.respondWith(fetch(request));
    return;
  }

  // Ignora requisições para Firebase (não cacheamos dados, apenas assets)
  if (url.hostname.includes('firebaseio.com')) {
    event.respondWith(fetch(request));
    return;
  }

  // ========== ESTRATÉGIA: CACHE FIRST, FALLBACK NETWORK ==========
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Se encontrou no cache, retorna
        if (cachedResponse) {
          // Atualiza o cache em background (stale-while-revalidate)
          fetch(request).then(freshResponse => {
            if (freshResponse && freshResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, freshResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }

        // Se não está no cache, tenta buscar da rede
        return fetch(request)
          .then(networkResponse => {
            // Se a resposta for válida, guarda no cache
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Se falhou (offline), tenta retornar a página offline
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match(OFFLINE_PAGE);
            }
            // Para imagens, retorna um placeholder
            if (request.headers.get('accept')?.includes('image')) {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#1f3a4b"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#ffd966" font-size="24">📱 Offline</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
            // Fallback genérico
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// ========== SINCERONIZAÇÃO EM BACKGROUND ==========
self.addEventListener('sync', event => {
  console.log('[Service Worker] Evento de sincronização:', event.tag);
  
  if (event.tag === 'sync-partidas') {
    event.waitUntil(sincronizarPartidasBackground());
  }
});

// ========== FUNÇÃO DE SINCRONIZAÇÃO EM BACKGROUND ==========
async function sincronizarPartidasBackground() {
  console.log('[Service Worker] Sincronizando partidas em background...');
  
  try {
    // Abrir o IndexedDB para ler as partidas offline
    const db = await abrirIndexedDB();
    const partidas = await buscarPartidasOffline(db);
    
    if (partidas.length === 0) {
      console.log('[Service Worker] Nenhuma partida para sincronizar.');
      return;
    }
    
    console.log(`[Service Worker] Sincronizando ${partidas.length} partidas...`);
    
    // Aqui você pode implementar a lógica de sincronização
    // ou notificar o usuário para abrir o app
    
    // Enviar mensagem para o cliente
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_AVAILABLE',
        count: partidas.length
      });
    });
    
  } catch (error) {
    console.error('[Service Worker] Erro na sincronização:', error);
  }
}

// ========== INDEXED DB HELPERS ==========
function abrirIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('CopaTabuadaOffline', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('partidas')) {
        db.createObjectStore('partidas', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function buscarPartidasOffline(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('partidas', 'readonly');
    const store = transaction.objectStore('partidas');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ========== RECEBER MENSAGENS DO CLIENTE ==========
self.addEventListener('message', event => {
  console.log('[Service Worker] Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'FORCE_SYNC') {
    event.waitUntil(sincronizarPartidasBackground());
  }
});
