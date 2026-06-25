// ============================================================
// ARQUIVO: js/services/sync-service.js
// DESCRIÇÃO: Sincronização Offline de Partidas
// ============================================================

import { salvarResultado, removerResultadoTemp, isOnline } from './firebase-service.js';
import { toast } from '../utils/helpers.js';

class SyncService {
    constructor() {
        this.config = {
            syncOffline: true
        };
        this.STORAGE_KEY = 'offline_partidas';
        this.inicializar();
    }

    // ========== INICIALIZAR ==========
    inicializar() {
        // Listener para quando ficar online
        window.addEventListener('online', () => {
            if (this.config.syncOffline) {
                console.log('[Sync] Conexão restabelecida, sincronizando...');
                this.sincronizarPartidas();
            }
        });

        // Sincronizar ao carregar a página (após 3 segundos)
        setTimeout(() => {
            if (this.config.syncOffline && navigator.onLine) {
                this.sincronizarPartidas();
            }
        }, 3000);
    }

    // ========== OBTER PARTIDAS OFFLINE ==========
    obterPartidasOffline() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn('[Sync] Erro ao obter partidas offline:', e);
            return [];
        }
    }

    // ========== SALVAR PARTIDAS OFFLINE ==========
    salvarPartidasOffline(partidas) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(partidas));
        } catch (e) {
            console.warn('[Sync] Erro ao salvar partidas offline:', e);
        }
    }

    // ========== ADICIONAR PARTIDA OFFLINE ==========
    adicionarPartidaOffline(alunoId, fase, dados) {
        if (!this.config.syncOffline) return;

        const partidas = this.obterPartidasOffline();
        partidas.push({
            alunoId,
            fase,
            dados,
            timestamp: Date.now(),
            tentativas: 0
        });
        this.salvarPartidasOffline(partidas);
        
        console.log('[Sync] Partida salva offline:', dados);
        toast('📶 Sem internet. Partida salva e será sincronizada automaticamente.');
    }

    // ========== VERIFICAR SE ESTÁ ONLINE ==========
    estaOnline() {
        return navigator.onLine;
    }

    // ========== SINCRONIZAR PARTIDAS ==========
    async sincronizarPartidas() {
        if (!this.config.syncOffline) return;
        if (!this.estaOnline()) {
            console.log('[Sync] Offline, não é possível sincronizar.');
            return;
        }

        const partidas = this.obterPartidasOffline();
        if (partidas.length === 0) return;

        console.log(`[Sync] Tentando sincronizar ${partidas.length} partidas...`);
        const toRemove = [];

        for (let i = 0; i < partidas.length; i++) {
            const item = partidas[i];
            item.tentativas++;

            try {
                // Verifica se a partida já existe no Firebase
                const ref = window.firebaseService?.resultadoAlunoRef?.(item.fase, item.alunoId);
                if (ref) {
                    await ref.transaction((currentData) => {
                        const lista = currentData || [];
                        // Evita duplicação usando timestamp
                        const jaExiste = lista.some(p => p.timestamp && p.timestamp === item.timestamp);
                        if (!jaExiste) {
                            const novaPartida = { ...item.dados };
                            if (!novaPartida.timestamp) novaPartida.timestamp = item.timestamp;
                            lista.push(novaPartida);
                        }
                        return lista;
                    });
                    
                    // Remove resultado temporário se existir
                    await removerResultadoTemp(item.fase, item.alunoId);
                    
                    toRemove.push(i);
                    console.log('[Sync] Partida sincronizada:', item.dados);
                } else {
                    // Fallback: tenta salvar diretamente
                    await salvarResultado(item.fase, item.alunoId, item.dados);
                    toRemove.push(i);
                }
            } catch (e) {
                console.warn('[Sync] Falha ao sincronizar partida, tentativa', item.tentativas, e);
                // Se tentativas > 5, remove para não travar a fila
                if (item.tentativas >= 5) {
                    toRemove.push(i);
                    console.warn('[Sync] Removendo partida após 5 tentativas falhas.');
                }
            }
        }

        // Remove as partidas sincronizadas (do final para o início)
        if (toRemove.length > 0) {
            const remaining = partidas.filter((_, idx) => !toRemove.includes(idx));
            this.salvarPartidasOffline(remaining);
            if (remaining.length > 0) {
                toast(`📶 ${remaining.length} partidas ainda aguardando sincronização.`);
            } else {
                toast('✅ Todas as partidas foram sincronizadas!');
            }
        }

        // Se ainda houver pendentes, agendar nova tentativa em 30 segundos
        const pendentes = this.obterPartidasOffline();
        if (pendentes.length > 0) {
            setTimeout(() => this.sincronizarPartidas(), 30000);
        }
    }

    // ========== LIMPAR PARTIDAS OFFLINE ==========
    limparPartidasOffline() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('[Sync] Partidas offline removidas.');
        } catch (e) {
            console.warn('[Sync] Erro ao limpar partidas offline:', e);
        }
    }

    // ========== OBTER ESTATÍSTICAS OFFLINE ==========
    obterEstatisticas() {
        const partidas = this.obterPartidasOffline();
        return {
            total: partidas.length,
            porFase: partidas.reduce((acc, p) => {
                acc[p.fase] = (acc[p.fase] || 0) + 1;
                return acc;
            }, {}),
            tentativasMedia: partidas.reduce((acc, p) => acc + p.tentativas, 0) / (partidas.length || 1)
        };
    }

    // ========== ATUALIZAR CONFIGURAÇÕES ==========
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (this.config.syncOffline && this.estaOnline()) {
            this.sincronizarPartidas();
        }
    }
}

// ========== EXPORTAR INSTÂNCIA ÚNICA ==========
export const syncService = new SyncService();

// ========== EXPORTAR FUNÇÕES DE CONVENIÊNCIA ==========
export const addOfflinePartida = (alunoId, fase, dados) => {
    syncService.adicionarPartidaOffline(alunoId, fase, dados);
};

export const syncOfflinePartidas = () => {
    syncService.sincronizarPartidas();
};

export const isOnline = () => {
    return syncService.estaOnline();
};
