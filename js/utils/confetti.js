// ============================================================
// ARQUIVO: js/utils/confetti.js
// ============================================================

class ConfettiManager {
    constructor() {
        this.config = { confetes: true };
        this.carregado = false;
    }

    carregarBiblioteca() {
        if (typeof confetti !== 'undefined') {
            this.carregado = true;
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1';
        script.async = true;
        script.onload = () => { this.carregado = true; };
        document.head.appendChild(script);
    }

    isAvailable() {
        return this.carregado && typeof confetti !== 'undefined' && this.config.confetes;
    }

    fire(opts = {}) {
        if (!this.isAvailable()) return;
        try {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, ...opts });
        } catch (e) { /* ignora */ }
    }

    fireCelebration() {
        if (!this.isAvailable()) return;
        const end = Date.now() + 2000;
        (function frame() {
            try {
                confetti({ particleCount: 7, startVelocity: 30, spread: 80, origin: { y: 0.5 } });
                if (Date.now() < end) requestAnimationFrame(frame);
            } catch (e) { /* ignora */ }
        })();
    }

    fireHit() {
        this.fire({ particleCount: 30, spread: 50, origin: { y: 0.5 } });
    }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}

export const confettiManager = new ConfettiManager();
