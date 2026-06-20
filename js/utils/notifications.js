// js/utils/notifications.js
// Sistema de notificações visuais durante o jogo

window.NotificationManager = (function() {
    // ========== ESTADO ==========
    let notificacaoAtiva = false;
    let timerId = null;
    let container = null;
    let config = window.NOTIFICATION_CONFIG || { notificacoes: {} };

    // ========== CRIAR CONTAINER ==========
    function criarContainer() {
        if (document.getElementById('notification-container')) return;
        const div = document.createElement('div');
        div.id = 'notification-container';
        div.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9998;
            pointer-events: none;
            text-align: center;
            display: none;
            width: 100%;
            max-width: 500px;
            padding: 20px;
        `;
        document.body.appendChild(div);
        container = div;
    }

    // ========== MOSTRAR NOTIFICAÇÃO ==========
    function mostrar(notificationId, dados = {}) {
        if (notificacaoAtiva) return;
        const notif = config.notificacoes[notificationId];
        if (!notif || !notif.ativo) return;

        const duracao = notif.duracao || 3;
        const icone = notif.icone || '📢';
        let mensagem = notif.mensagem;

        // Substitui placeholders
        if (dados.pontos) mensagem = mensagem.replace('{pontos}', dados.pontos);
        if (dados.tempo) mensagem = mensagem.replace('{tempo}', dados.tempo.toFixed(1));

        // Cria o elemento da notificação
        notificacaoAtiva = true;
        criarContainer();

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

        container.innerHTML = '';
        container.appendChild(div);
        container.style.display = 'block';

        // Efeitos especiais
        if (notif.confete && window.confettiManager) {
            if (notificationId === 'seq20' || notificationId === 'recordeGeral') {
                window.confettiManager.fireCelebration();
            } else {
                window.confettiManager.fireHit();
            }
        }

        if (notif.som && window.soundManager) {
            window.soundManager.playCelebration();
        }

        // Inicia contagem regressiva
        let tempoRestante = duracao;
        const progressBar = document.getElementById('notification-progress');
        const timerDisplay = document.getElementById('notification-timer');

        if (timerId) clearInterval(timerId);
        timerId = setInterval(() => {
            tempoRestante -= 0.1;
            if (tempoRestante <= 0) {
                clearInterval(timerId);
                timerId = null;
                esconder();
                return;
            }
            if (timerDisplay) timerDisplay.innerText = tempoRestante.toFixed(1);
            if (progressBar) progressBar.style.width = (tempoRestante / duracao * 100) + '%';
        }, 100);

        // Fecha automaticamente após a duração
        setTimeout(() => {
            if (timerId) {
                clearInterval(timerId);
                timerId = null;
            }
            esconder();
        }, duracao * 1000 + 100);
    }

    // ========== ESCONDER NOTIFICAÇÃO ==========
    function esconder() {
        if (!notificacaoAtiva) return;
        notificacaoAtiva = false;
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
        // Chama o callback de fim (para iniciar próxima pergunta)
        if (typeof window._onNotificationEnd === 'function') {
            window._onNotificationEnd();
        }
    }

    // ========== VERIFICAR SE ESTÁ ATIVA ==========
    function isAtiva() {
        return notificacaoAtiva;
    }

    // ========== INJETAR CSS ==========
    function injectStyles() {
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

    // ========== INICIALIZAÇÃO ==========
    injectStyles();
    criarContainer();

    // ========== EXPORTAÇÃO ==========
    return {
        mostrar,
        esconder,
        isAtiva,
        config: () => config
    };
})();
