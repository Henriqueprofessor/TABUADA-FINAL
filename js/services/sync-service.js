// js/services/sync-service.js
// Sincronização offline de partidas

window.SyncService = (function() {
    const STORAGE_KEY = 'offline_partidas';

    // Obtém lista de partidas pendentes
    function getOfflinePartidas() {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    }

    // Salva lista de partidas pendentes
    function saveOfflinePartidas(partidas) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(partidas));
    }

    // Adiciona uma partida à fila offline
    function addOfflinePartida(alunoId, fase, dados) {
        const partidas = getOfflinePartidas();
        partidas.push({
            alunoId,
            fase,
            dados,
            timestamp: Date.now(),
            tentativas: 0
        });
        saveOfflinePartidas(partidas);
        console.log('[Sync] Partida salva offline:', dados);
        window.toast('📶 Sem internet. Partida salva e será sincronizada automaticamente.');
    }

    // Verifica se está online
    function isOnline() {
        return navigator.onLine;
    }

    // Sincroniza partidas pendentes com o Firebase
    async function syncOfflinePartidas() {
        if (!isOnline()) {
            console.log('[Sync] Offline, não é possível sincronizar.');
            return;
        }

        const partidas = getOfflinePartidas();
        if (partidas.length === 0) return;

        console.log(`[Sync] Tentando sincronizar ${partidas.length} partidas...`);
        const toRemove = [];

        for (let i = 0; i < partidas.length; i++) {
            const item = partidas[i];
            item.tentativas++;
            try {
                const ref = window.firebaseService.getResultadosRef(item.fase).child(item.alunoId);
                await ref.transaction((currentData) => {
                    const lista = currentData || [];
                    // Evita duplicação usando timestamp
                    const jaExiste = lista.some(p => p.timestamp && p.timestamp === item.timestamp);
                    if (!jaExiste) {
                        // Adiciona os dados da partida (sem o timestamp, mas podemos incluir)
                        const novaPartida = { ...item.dados };
                        // timestamp já está no item.dados? Vamos garantir
                        if (!novaPartida.timestamp) novaPartida.timestamp = item.timestamp;
                        lista.push(novaPartida);
                    }
                    return lista;
                });
                toRemove.push(i);
                console.log('[Sync] Partida sincronizada:', item.dados);
            } catch (e) {
                console.warn('[Sync] Falha ao sincronizar partida, tentativa', item.tentativas, e);
                // Se tentativas > 3, mantém mas não bloqueia a fila
                if (item.tentativas >= 5) {
                    // Após 5 tentativas, removemos para não travar a fila
                    toRemove.push(i);
                    console.warn('[Sync] Removendo partida após 5 tentativas falhas.');
                }
            }
        }

        // Remove as partidas sincronizadas (do final para o início)
        if (toRemove.length > 0) {
            const remaining = partidas.filter((_, idx) => !toRemove.includes(idx));
            saveOfflinePartidas(remaining);
        }

        // Se ainda houver pendentes, agendar nova tentativa em 30 segundos
        const pendentes = getOfflinePartidas();
        if (pendentes.length > 0) {
            setTimeout(syncOfflinePartidas, 30000);
        }
    }

    // Listener para quando ficar online
    window.addEventListener('online', () => {
        console.log('[Sync] Conexão restabelecida, sincronizando...');
        syncOfflinePartidas();
    });

    // Inicializar: sincronizar ao carregar a página
    setTimeout(syncOfflinePartidas, 3000);

    return {
        addOfflinePartida,
        syncOfflinePartidas,
        isOnline,
        getOfflinePartidas
    };
})();
