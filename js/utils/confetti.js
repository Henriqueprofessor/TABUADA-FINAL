// js/utils/confetti.js
// Gerenciador de confetes (canvas-confetti via CDN)

window.ConfettiManager = (function() {

    // Verifica se a biblioteca canvas-confetti está disponível
    function isConfettiAvailable() {
        return typeof confetti !== 'undefined';
    }

    // Lança uma chuva de confetes
    function fire(option = {}) {
        if (!isConfettiAvailable()) {
            console.warn('Biblioteca canvas-confetti não carregada.');
            return;
        }
        const defaults = {
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        };
        confetti({ ...defaults, ...option });
    }

    // Lança confetes em comemoração (mais intenso)
    function fireCelebration() {
        if (!isConfettiAvailable()) return;
        const duration = 2 * 1000;
        const end = Date.now() + duration;
        (function frame() {
            fire({ particleCount: 7, startVelocity: 30, spread: 80, origin: { y: 0.5 } });
            fire({ particleCount: 7, startVelocity: 30, spread: 80, origin: { y: 0.5 } });
            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    }

    // Lança confetes para acerto (moderado)
    function fireHit() {
        if (!isConfettiAvailable()) return;
        fire({ particleCount: 30, spread: 50, origin: { y: 0.5 } });
    }

    // Lança confetes para recorde (intenso)
    function fireRecord() {
        if (!isConfettiAvailable()) return;
        fire({ particleCount: 60, spread: 90, origin: { y: 0.4 } });
        setTimeout(() => {
            fire({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
        }, 300);
    }

    // Expor funções globalmente
    window.confettiManager = {
        fire,
        fireCelebration,
        fireHit,
        fireRecord
    };

    return window.confettiManager;
})();
