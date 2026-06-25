// ============================================================
// ARQUIVO: js/utils/confetti.js
// DESCRIÇÃO: Gerenciador de Confetes (canvas-confetti via CDN)
// ============================================================

class ConfettiManager {
    constructor() {
        this.config = {
            confetes: true
        };
        this.carregado = false;
        this.carregarBiblioteca();
    }

    // ========== CARREGAR BIBLIOTECA CANVAS-CONFETTI ==========
    carregarBiblioteca() {
        // Verifica se já está carregada
        if (typeof confetti !== 'undefined') {
            this.carregado = true;
            return;
        }

        // Verifica se já existe um script carregando
        if (document.querySelector('script[src*="canvas-confetti"]')) {
            // Aguarda o carregamento
            const checkLoaded = setInterval(() => {
                if (typeof confetti !== 'undefined') {
                    this.carregado = true;
                    clearInterval(checkLoaded);
                    console.log('[Confetti] Biblioteca carregada!');
                }
            }, 100);
            return;
        }

        // Carrega a biblioteca do CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1';
        script.async = true;
        script.onload = () => {
            this.carregado = true;
            console.log('[Confetti] Biblioteca carregada com sucesso!');
        };
        script.onerror = () => {
            console.warn('[Confetti] Falha ao carregar biblioteca. Confetes desativados.');
            this.config.confetes = false;
        };
        document.head.appendChild(script);
    }

    // ========== VERIFICAR SE ESTÁ DISPONÍVEL ==========
    isAvailable() {
        return this.carregado && typeof confetti !== 'undefined' && this.config.confetes;
    }

    // ========== LANÇAR CONFETES ==========
    fire(option = {}) {
        if (!this.isAvailable()) return;

        const defaults = {
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        };

        try {
            confetti({ ...defaults, ...option });
        } catch (e) {
            console.warn('[Confetti] Erro ao lançar confetes:', e);
        }
    }

    // ========== LANÇAR CONFETES EM COMEMORAÇÃO ==========
    fireCelebration() {
        if (!this.isAvailable()) return;

        const duration = 2 * 1000;
        const end = Date.now() + duration;

        (function frame() {
            try {
                confetti({ 
                    particleCount: 7, 
                    startVelocity: 30, 
                    spread: 80, 
                    origin: { y: 0.5 } 
                });
                confetti({ 
                    particleCount: 7, 
                    startVelocity: 30, 
                    spread: 80, 
                    origin: { y: 0.5 } 
                });
                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            } catch (e) {
                // Silencia erros
            }
        })();
    }

    // ========== LANÇAR CONFETES PARA ACERTO ==========
    fireHit() {
        if (!this.isAvailable()) return;
        this.fire({ 
            particleCount: 30, 
            spread: 50, 
            origin: { y: 0.5 } 
        });
    }

    // ========== LANÇAR CONFETES PARA RECORDE ==========
    fireRecord() {
        if (!this.isAvailable()) return;
        
        this.fire({ 
            particleCount: 60, 
            spread: 90, 
            origin: { y: 0.4 } 
        });
        
        setTimeout(() => {
            this.fire({ 
                particleCount: 40, 
                spread: 70, 
                origin: { y: 0.6 } 
            });
        }, 300);
    }

    // ========== ATUALIZAR CONFIGURAÇÕES ==========
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}

// ========== EXPORTAR INSTÂNCIA ÚNICA ==========
export const confettiManager = new ConfettiManager();
