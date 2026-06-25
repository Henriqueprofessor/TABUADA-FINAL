// ============================================================
// ARQUIVO: js/utils/notifications.js
// DESCRIÇÃO: Sistema de Notificações Visuais durante o jogo
// ============================================================

import { soundManager } from './sounds.js';
import { confettiManager } from './confetti.js';
import { NOTIFICATION_CONFIG } from '../config/notification-config.js';

class NotificationManager {
    constructor() {
        this.config = {
            notificacoes: true,
            duracaoPadrao: 3,
            notificacoesSequencias: true,
            notificacoesRecordes: true,
            notificacoesVelocidade: true,
            notificacoesIncentivo: true,
            limiteRapido: 1.5
        };
        this.notificacaoAtiva = false;
        this.timerId = null;
        this.container = null;
        this.criarContainer();
        this.injetarStyles();
    }

    // ========== CRIAR CONTAINER ==========
    criarContainer() {
        if (document.getElementById('notification-container')) return;
        
        const div = document.createElement('div');
        div.id = 'notification-container';
        div.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 99998;
            pointer-events: none;
            text-align: center;
            display: none;
            width: 100%;
            max-width: 500px;
            padding: 20px;
        `;
        document.body.appendChild(div);
        this.container = div;
    }

    // ========== INJETAR ESTILOS ==========
    injetarStyles() {
        if (document.getElementById('notification-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes notificationIn {
                0% { opacity: 0; transform: scale(0.8) translateY(20px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes brilhoPulse {
                0% { opacity: 0.3; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.1); }
                100% { opacity: 0.3; transform: scale(1); }
            }
            .notification-popup {
                pointer-events: none;
            }
            @media (prefers-reduced-motion: reduce) {
                .notification-popup { animation: none; }
                .notification-popup div[style*="animation"] { animation: none; }
            }
        `;
        document.head.appendChild(style);
    }

    // ========== VERIFICAR SE NOTIFICAÇÃO DEVE SER EXIBIDA ==========
    deveExibir(notificationId) {
        if (!this.config.notificacoes) return false;
        
        const notif = NOTIFICATION_CONFIG.notificacoes[notificationId];
        if (!notif || !notif.ativo) return false;

        // Verifica categoria da notificação
        const categorias = {
            seq5: this.config.notificacoesSequencias,
            seq10: this.config.notificacoesSequencias,
            seq15: this.config.notificacoesSequencias,
            seq20: this.config.notificacoesSequencias,
            recordeFase: this.config.notificacoesRecordes,
            recordeGeral: this.config.notificacoesRecordes,
            rapido: this.config.notificacoesVelocidade,
            relampago: this.config.notificacoesVelocidade,
            erro3: this.config.notificacoesIncentivo,
            erro5: this.config.notificacoesIncentivo
        };

        return categorias[notificationId] !== false;
    }

    // ========== MOSTRAR NOTIFICAÇÃO ==========
    mostrar(notificationId, dados = {}) {
        if (this.notificacaoAtiva) return;
        if (!this.deveExibir(notificationId)) return;

        const notif = NOTIFICATION_CONFIG.notificacoes[notificationId];
        if (!notif) return;

        const duracao = notif.duracao || this.config.duracaoPadrao;
        const icone = notif.icone || '📢';
        let mensagem = notif.mensagem;

        // Substitui placeholders
        if (dados.pontos !== undefined) {
            mensagem = mensagem.replace(/\{pontos\}/g, dados.pontos);
        }
        if (dados.tempo !== undefined) {
            mensagem = mensagem.replace(/\{tempo\}/g, dados.tempo.toFixed(1));
        }

        this.notificacaoAtiva = true;
        this.criarContainer();

        const div = document.createElement('div');
        div.className = 'notification-popup';
        div.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 3px solid ${notif.cor || '#f1c40f'};
            border-radius: 24px;
            padding: 24px 32px;
            box-shadow: 0 10px 60px rgba(0,0,0,0.8);
            animation: notificationIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
        `;

        // Efeito de brilho de fundo
        const brilho = document.createElement('div');
        brilho.style.cssText = `
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, ${notif.cor}33 0%, transparent 70%);
            animation: brilhoPulse 1.5s ease-in-out infinite;
            pointer-events: none;
        `;
        div.appendChild(brilho);

        // Conteúdo
        div.innerHTML += `
            <div style="position: relative; z-index: 1;">
                <div style="font-size: 56px; margin-bottom: 8px;">${icone}</div>
                <div style="font-size: 24px; font-weight: bold; color: ${notif.cor}; text-shadow: 0 0 30px ${notif.cor}44;">
                    ${mensagem}
                </div>
                <div style="margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 12px;">
                    <div style="font-size: 14px; opacity: 0.6;">Próxima pergunta em</div>
                    <div id="notification-timer" style="font-size: 28px; font-weight: bold; color: ${notif.cor}; min-width: 40px;">
                        ${duracao.toFixed(1)}
                    </div>
                    <div style="font-size: 14px; opacity: 0.6;">s</div>
                </div>
                <div style="width: 100%; height: 4px; background: #2c3e50; border-radius: 4px; margin-top: 12px; overflow: hidden;">
                    <div id="notification-progress" style="width: 100%; height: 100%; background: ${notif.cor}; border-radius: 4px; transition: width 0.1s linear;"></div>
                </div>
            </div>
        `;

        if (this.container) {
            this.container.innerHTML = '';
            this.container.appendChild(div);
            this.container.style.display = 'block';
        }

        // Efeitos especiais
        if (notif.confete && confettiManager.config.confetes) {
            if (notificationId === 'seq20' || notificationId === 'recordeGeral') {
                confettiManager.fireCelebration();
            } else {
                confettiManager.fireHit();
            }
        }

        if (notif.som && soundManager.config.sonsCelebracao) {
            soundManager.playCelebration();
        }

        // Inicia contagem regressiva
        let tempoRestante = duracao;
        const progressBar = document.getElementById('notification-progress');
        const timerDisplay = document.getElementById('notification-timer');

        if (this.timerId) clearInterval(this.timerId);
        this.timerId = setInterval(() => {
            tempoRestante -= 0.1;
            if (tempoRestante <= 0) {
                clearInterval(this.timerId);
                this.timerId = null;
                this.esconder();
                return;
            }
            if (timerDisplay) timerDisplay.innerText = tempoRestante.toFixed(1);
            if (progressBar) progressBar.style.width = (tempoRestante / duracao * 100) + '%';
        }, 100);

        // Fecha automaticamente após a duração
        setTimeout(() => {
            if (this.timerId) {
                clearInterval(this.timerId);
                this.timerId = null;
            }
            this.esconder();
        }, duracao * 1000 + 100);
    }

    // ========== ESCONDER NOTIFICAÇÃO ==========
    esconder() {
        if (!this.notificacaoAtiva) return;
        this.notificacaoAtiva = false;
        if (this.container) {
            this.container.style.display = 'none';
            this.container.innerHTML = '';
        }
        // Chama o callback de fim (para iniciar próxima pergunta)
        if (typeof window._onNotificationEnd === 'function') {
            window._onNotificationEnd();
        }
    }

    // ========== VERIFICAR SE ESTÁ ATIVA ==========
    isAtiva() {
        return this.notificacaoAtiva;
    }

    // ========== ATUALIZAR CONFIGURAÇÕES ==========
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }

    // ========== VERIFICAR SE É RESPOSTA RÁPIDA ==========
    isRespostaRapida(tempoGasto) {
        return tempoGasto <= this.config.limiteRapido;
    }

    // ========== VERIFICAR SE É RESPOSTA RELÂMPAGO ==========
    isRespostaRelampago(tempoGasto) {
        const limiteRelampago = NOTIFICATION_CONFIG.notificacoes.relampago?.limiteRelampago || 1.0;
        return tempoGasto <= limiteRelampago;
    }
}

// ========== EXPORTAR INSTÂNCIA ÚNICA ==========
export const notificationManager = new NotificationManager();
