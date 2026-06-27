// ============================================================
// ARQUIVO: js/models/state.js
// DESCRIÇÃO: Gerenciamento do Estado Global do Jogo
// ============================================================

import { listenToCopa, listenToConfiguracoes, carregarIntervalos } from '../services/firebase-service.js';
import { CONFIG_PADRAO } from '../config/firebase-config.js';
import { VAGAS_POR_FASE, MODALIDADE_CONFIG } from '../utils/constants.js';

class AppState {
    constructor() {
        this.data = null;
        this.configuracoes = { ...CONFIG_PADRAO };
        this.userType = null;
        this.alunoId = null;
        this.alunoNome = null;
        this.alunoTurma = null;
        this.faseSelecionadaProf = 1;
        this.modoTorcida = 'individual';
        this.intervalos = { individual: 4, equipes: 60 };
        this.listeners = [];
        this.isInitialized = false;
        this.tempoEsgotadoProcessado = false;
    }

    // ========== INICIALIZAR ==========
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        listenToCopa((data) => {
            this.data = data || this.getDefaultState();
            if (!this.data.resultados) this.data.resultados = {};
            if (!this.data.participantes) this.data.participantes = {};
            if (!this.data.classificados) this.data.classificados = {};
            if (!this.data.modalidade) this.data.modalidade = '2-5';
            if (this.data.status === 'pausado' && !this.data.tempoRestantePausa) {
                this.data.tempoRestantePausa = 0;
            }
            this.notify();
        });

        listenToConfiguracoes((config) => {
            if (config) {
                this.configuracoes = { ...this.configuracoes, ...config };
                this.atualizarConfiguracoesModulos();
                this.notify();
            }
        });

        carregarIntervalos().then(intervalos => {
            this.intervalos = intervalos;
        });
    }

    // ========== ESTADO PADRÃO ==========
    getDefaultState() {
        return {
            fase: 1,
            status: 'aguardando',
            tempoFase: 12,
            fim: 0,
            modalidade: '2-5',
            resultados: {},
            participantes: {},
            classificados: {},
            tempoRestantePausa: 0
        };
    }

    // ========== NOTIFICAR OBSERVADORES ==========
    notify() {
        this.listeners.forEach(fn => {
            try {
                fn(this.data);
            } catch (e) {
                console.warn('Erro ao notificar observador:', e);
            }
        });
    }

    // ========== REGISTRAR OBSERVADOR ==========
    subscribe(callback) {
        this.listeners.push(callback);
        if (this.data) callback(this.data);
        return () => {
            this.listeners = this.listeners.filter(fn => fn !== callback);
        };
    }

    // ========== ATUALIZAR CONFIGURAÇÕES DOS MÓDULOS ==========
    atualizarConfiguracoesModulos() {
        const config = this.configuracoes;
        if (window.soundManager) {
            window.soundManager.updateConfig({
                sons: config.sons,
                sonsCelebracao: config.sonsCelebracao,
                sonsErro: config.sonsErro
            });
        }
        if (window.confettiManager) {
            window.confettiManager.updateConfig({ confetes: config.confetes });
        }
        if (window.achievementManager) {
            window.achievementManager.updateConfig({ conquistas: config.conquistas });
        }
        if (window.notificationManager) {
            window.notificationManager.updateConfig({ notificacoes: config.notificacoes });
        }
        if (window.gamepadManager) {
            window.gamepadManager.updateConfig({ gamepad: config.gamepad });
        }
        if (window.syncService) {
            window.syncService.updateConfig({ syncOffline: config.syncOffline });
        }
        if (window.BonusCalculator) {
            window.BonusCalculator.updateConfig({ ativo: config.bonus });
        }
    }

    // ========== GETTERS ==========
    get fase() { return this.data?.fase || 1; }
    get status() { return this.data?.status || 'aguardando'; }
    get modalidade() { return this.data?.modalidade || '2-5'; }
    get participantes() { return this.data?.participantes || {}; }
    get resultados() { return this.data?.resultados || {}; }
    get classificados() { return this.data?.classificados || {}; }
    get tempoFase() { return this.data?.tempoFase || 12; }
    get fim() { return this.data?.fim || 0; }
    get tempoRestantePausa() { return this.data?.tempoRestantePausa || 0; }

    // ========== MÉTODOS DE UTILIDADE ==========
    isClassificado(fase, alunoId) {
        if (fase <= 1) return true;
        const classificados = this.data?.classificados?.[fase - 1] || [];
        return classificados.includes(alunoId);
    }

    getVagasFase(fase) {
        return VAGAS_POR_FASE[fase] || 30;
    }

    getModalidadeNome() {
        return MODALIDADE_CONFIG[this.modalidade]?.nome || 'Tabuada 2-5';
    }

    // ========== ATUALIZAR ESTADO ==========
    setUserType(type) {
        this.userType = type;
        sessionStorage.setItem('userType', type);
    }

    setAlunoData(id, nome, turma) {
        this.alunoId = id;
        this.alunoNome = nome;
        this.alunoTurma = turma;
        sessionStorage.setItem('alunoId', id);
        sessionStorage.setItem('alunoNome', nome);
        sessionStorage.setItem('alunoTurma', turma);
    }

    // ========== CARREGAR DADOS DA SESSÃO ==========
    loadFromSession() {
        this.userType = sessionStorage.getItem('userType') || null;
        this.alunoId = sessionStorage.getItem('alunoId') || null;
        this.alunoNome = sessionStorage.getItem('alunoNome') || null;
        this.alunoTurma = sessionStorage.getItem('alunoTurma') || null;
    }

    // ========== LIMPAR SESSÃO ==========
    clearSession() {
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('alunoId');
        sessionStorage.removeItem('alunoNome');
        sessionStorage.removeItem('alunoTurma');
        sessionStorage.removeItem('ultimaFase');
        this.userType = null;
        this.alunoId = null;
        this.alunoNome = null;
        this.alunoTurma = null;
    }
}

export const appState = new AppState();
