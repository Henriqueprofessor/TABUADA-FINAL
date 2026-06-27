// ============================================================
// ARQUIVO: js/services/sync-service.js
// DESCRIÇÃO: Sincronização Offline
// ============================================================

import { salvarResultado, removerResultadoTemp } from './firebase-service.js';
import { toast, isOnline } from '../utils/helpers.js';

class SyncService {
    constructor() {
        this.config = { syncOffline: true };
        this.STORAGE_KEY = 'offline_partidas';
        this.inicializar();
    }

    inicializar() {
        window.addEventListener('online', () => {
            if (this.config.syncOffline) {
                console.log('[Sync] Conexão restabelecida, sincronizando...');
                this.sincronizarPartidas();
            }
        });

        setTimeout(() => {
            if (this.config.syncOffline && isOnline()) {
                this.sincronizarPartidas();
            }
        }, 3000);
    }

    obterPartidasOffline() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    salvarPartidasOffline(partidas) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(partidas));
        } catch (e) { /* ignora */ }
    }

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

    estaOnline() {
        return isOnline();
    }

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
                await salvarResultado(item.fase, item.alunoId, item.dados);
                await removerResultadoTemp(item.fase, item.alunoId);
                toRemove.push(i);
                console.log('[Sync] Partida sincronizada:', item.dados);
            } catch (e) {
                console.warn('[Sync] Falha ao sincronizar partida, tentativa', item.tentativas, e);
                if (item.tentativas >= 5) {
                    toRemove.push(i);
                    console.warn('[Sync] Removendo partida após 5 tentativas falhas.');
                }
            }
        }

        if (toRemove.length > 0) {
            const remaining = partidas.filter((_, idx) => !toRemove.includes(idx));
            this.salvarPartidasOffline(remaining);
            if (remaining.length > 0) {
                toast(`📶 ${remaining.length} partidas ainda aguardando sincronização.`);
            } else {
                toast('✅ Todas as partidas foram sincronizadas!');
            }
        }

        const pendentes = this.obterPartidasOffline();
        if (pendentes.length > 0) {
            setTimeout(() => this.sincronizarPartidas(), 30000);
        }
    }

    limparPartidasOffline() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (e) { /* ignora */ }
    }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (this.config.syncOffline && this.estaOnline()) {
            this.sincronizarPartidas();
        }
    }
}

export const syncService = new SyncService();

export const addOfflinePartida = (alunoId, fase, dados) => {
    syncService.adicionarPartidaOffline(alunoId, fase, dados);
};

export const syncOfflinePartidas = () => {
    syncService.sincronizarPartidas();
};
