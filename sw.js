// sw.js
// ============================================================
// COPA TABUADA CEIB 2026 - SERVICE WORKER
// ============================================================
// OTIMIZAÇÃO DE PERFORMANCE:
// Cacheia CSS, JS, imagens e ícones para que a segunda visita
// (e todas as seguintes) carregue em milissegundos, sem tocar
// na internet.
//
// IMPORTANTE: Sempre que fizer uma alteração grande no projeto,
// incremente SW_VERSION abaixo (ex: '3.0.0' → '3.0.1') para que
// os navegadores baixem os novos arquivos.
// ============================================================

const SW_VERSION = '3.0.0';

// Nomes dos caches (separados por estratégia)
const CACHE_STATIC = `copa-tabuada-static-v${SW_VERSION}`;
const CACHE_HTML   = `copa-tabuada-html-v${SW_VERSION}`;

// ============================================================
// LISTA DE ARQUIVOS PARA PRÉ-CACHE (baixados na instalação)
// ============================================================
// Caminhos relativos à localização deste sw.js (a raiz do projeto).
// Se um arquivo não existir, o precache daquele item é ignorado
// (não quebra os outros).
// ============================================================
const PRECACHE_URLS = [
  './',
  './index.html',
  './game.html',
  './tutorial-instalacao.html',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './js/config/firebase.js',
  './js/modules/state.js',
  './js/modules/ui.js',
  './js/modules/db.js',
  './js/modules/auth.js',
  './js/modules/game.js',
  './js/modules/ranking.js',
  './js/modules/sound.js',
  './js/modules/tutorial.js',
  './js/modules/config.js',
  './js/modules/version.js',
  './js/modules/install.js',
  './js/modules/aviso.js',
  './js/modules/gameLoop.js',
  './js/modules/estrelas.js',
  './js/modules/medals.js',
  './icons/logo-copa.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ============================================================
// INSTALL: baixa todos os arquivos e guarda no cache
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando versão', SW_VERSION);

  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => {
        // Baixa cada arquivo individualmente (com catch individual)
        // para que um arquivo faltante NÃO quebre a instalação.
        return Promise.all(
          PRECACHE_URLS.map((url) =>
            cache.add(url).catch((err) => {
              // Aviso silencioso: alguns assets podem não existir
              // (ex: ícones 192/512, arquivos opcionais)
              console.warn(`[SW] Não foi possível pré-cachear: ${url}`, err.message || err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Pré-cache concluído. Ativando imediatamente...');
        return self.skipWaiting();
      })
  );
});

// ============================================================
// ACTIVATE: limpa caches de versões antigas e assume controle
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando versão', SW_VERSION);

  event.waitUntil(
    caches.keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_STATIC && key !== CACHE_HTML) {
              console.log('[SW] Removendo cache antigo:', key);
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => {
        // Assume controle de todas as abas abertas
        return self.clients.claim();
      })
      .then(() => {
        console.log('[SW] Controle assumido.');
      })
  );
});

// ============================================================
// ESTRATÉGIA 1: Network-first (para HTML)
// ============================================================
// Tenta a rede primeiro; se falhar, usa o cache.
// Sempre atualiza o cache quando a rede responde.
async function networkFirstHTML(request) {
  try {
    const response = await fetch(request);

    // Guarda no cache apenas respostas válidas
    if (response && response.status === 200 && response.type === 'basic') {
      const cache = await caches.open(CACHE_HTML);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Sem internet → tenta o cache
    const cached = await caches.match(request);
    if (cached) {
      console.log('[SW] Offline, servindo HTML do cache:', request.url);
      return cached;
    }
    // Fallback final
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Offline</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#0a0f1e;color:#eee;"><h1>📡 Sem conexão</h1><p>Não foi possível carregar a página. Verifique sua internet e recarregue.</p><button onclick="location.reload()" style="background:#27ae60;color:#fff;border:none;padding:12px 24px;border-radius:30px;font-size:16px;cursor:pointer;margin-top:20px;">🔄 Tentar novamente</button></body></html>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=UTF-8' } }
    );
  }
}

// ============================================================
// ESTRATÉGIA 2: Stale-while-revalidate (para CSS/JS/imagens)
// ============================================================
// Responde do cache na hora (rapidez) e, em paralelo, busca a
// versão nova na internet e atualiza o cache para a próxima vez.
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      // Só guarda respostas OK do mesmo domínio
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_STATIC).then((cache) => {
          cache.put(request, clone);
        });
      }
      return response;
    })
    .catch(() => {
      // Falha de rede silenciosa (já temos o cache)
      return null;
    });

  // Se tiver cache, responde imediatamente. Senão, espera a rede.
  if (cached) return cached;

  const fresh = await fetchPromise;
  if (fresh) return fresh;

  // Nenhum dos dois disponíveis
  return new Response('Recurso indisponível offline.', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
  });
}

// ============================================================
// FETCH: intercepta todas as requisições
// ============================================================
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // 1) Só processa GET (POST/PUT etc. vão direto para a rede)
  if (request.method !== 'GET') return;

  // 2) Só processa requisições do mesmo domínio
  //    (Firebase, gstatic, mixkit, googleapis passam direto)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 3) version.json sempre vai para a rede (detector de atualizações)
  if (url.pathname.endsWith('/version.json')) return;

  // 4) HTML: network-first
  const accept = request.headers.get('accept') || '';
  const isHTML =
    accept.includes('text/html') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/');

  if (isHTML) {
    event.respondWith(networkFirstHTML(request));
    return;
  }

  // 5) Demais assets (CSS, JS, imagens, ícones): stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ============================================================
// MESSAGE: permite que a página peça para ativar uma nova versão
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
