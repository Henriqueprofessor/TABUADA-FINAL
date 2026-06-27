// ============================================================
// ARQUIVO: js/utils/notifications.js
// ============================================================

import { soundManager } from './sounds.js';
import { confettiManager } from './confetti.js';

const NOTIFICACOES = {
    seq5: { icone: '🎉', mensagem: '5 acertos seguidos! Continue assim!', cor: '#9b59b6', confete: false, som: false },
    seq10: { icone: '🔥', mensagem: '10 ACERTOS SEGUIDOS! Imparável!', cor: '#f1c40f', confete: true, som: false },
    seq15: { icone: '🚀', mensagem: '15 ACERTOS! Você é uma máquina!', cor: '#e67e22', confete: false, som: false },
    seq20: { icone: '👑', mensagem: 'PERFEIÇÃO! 20/20! INCRÍVEL!', cor: '#f1c40f', confete: true, som: true },
    rapido: { icone: '⚡', mensagem: 'RESPOSTA RÁPIDA! {tempo}s!', cor: '#2ecc71', confete: false, som: false },
    relampago: { icone: '🎯', mensagem: 'RESPOSTA RELÂMPAGO! {tempo}s!', cor: '#f1c40f', confete: true, som: false },
    erro3: { icone: '💪', mensagem: '💪 Continue tentando! Você consegue!', cor: '#7f8c8d', confete: false, som: false },
    erro5: { icone: '🌟', mensagem: '🌟 Não desista! A próxima vai dar certo!', cor: '#7f8c8d', confete: false, som: false }
};

class NotificationManager {
    constructor() {
        this.config = { notificacoes: true };
        this.notificacaoAtiva = false;
        this.timerId = null;
    }

    mostrar(notificationId, dados = {}) {
        if (!this.config.notificacoes || this.notificacaoAtiva) return;

        const notif = NOTIFICACOES[notificationId];
        if (!notif) return;

        this.notificacaoAtiva = true;
        let mensagem = notif.mensagem;
        if (dados.tempo !== undefined) {
            mensagem = mensagem.replace(/\{tempo\}/g, dados.tempo.toFixed(1));
        }

        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 3px solid ${notif.cor};
            border-radius: 24px; padding: 24px 32px;
            z-index: 99998; text-align: center;
            box-shadow: 0 10px 60px rgba(0,0,0,0.8);
            max-width: 500px; width: 90%;
            color: white;
            animation: notificationIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;
        div.innerHTML = `
            <div style="font-size:56px;">${notif.icone}</div>
            <div style="font-size:24px;font-weight:bold;color:${notif.cor};">${mensagem}</div>
            <div style="margin-top:16px;font-size:14px;opacity:0.6;">⏱️ Próxima pergunta em <span id="notif-timer" style="font-weight:bold;font-size:20px;">3.0</span>s</div>
        `;
        document.body.appendChild(div);

        if (notif.confete && confettiManager.config.confetes) {
            confettiManager.fireHit();
        }
        if (notif.som && soundManager.config.sonsCelebracao) {
            soundManager.playCelebration();
        }

        let tempo = 3.0;
        const timerSpan = document.getElementById('notif-timer');
        this.timerId = setInterval(() => {
            tempo -= 0.1;
            if (tempo <= 0) {
                clearInterval(this.timerId);
                this.timerId = null;
                div.remove();
                this.notificacaoAtiva = false;
                if (typeof window._onNotificationEnd === 'function') {
                    window._onNotificationEnd();
                }
                return;
            }
            if (timerSpan) timerSpan.innerText = tempo.toFixed(1);
        }, 100);
    }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}

export const notificationManager = new NotificationManager();
