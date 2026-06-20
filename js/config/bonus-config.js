// js/config/bonus-config.js
// Configuração do sistema de bônus/punição por velocidade

window.BONUS_CONFIG = {
    // ========== CONFIGURAÇÕES GERAIS ==========
    minimoPartidas: 5, // mínimo de partidas para aplicar bônus por velocidade
    minimoPartidasMin: 1,
    minimoPartidasMax: 20,
    ativo: true, // sistema ligado/desligado

    // ========== ESCALA DE BÔNUS/PUNIÇÃO ==========
    // Delta >= 0 → bônus máximo (manteve ou melhorou o recorde)
    // Delta < 0 → oscilou abaixo do recorde
    escalas: [
        { limite: 0.10, bonus: 100 },   // Oscilou pouco
        { limite: 0.20, bonus: 50 },    // Oscilou moderadamente
        { limite: 0.50, bonus: -100 },  // Oscilou significativamente
        { limite: Infinity, bonus: -200 } // Oscilou drasticamente
    ],
    bonusMaximo: 200, // bônus para delta >= 0
    punicaoMinimoPartidas: -100 // punição para quem tem menos que o mínimo
};

// Salva no localStorage para persistência
window.BONUS_CONFIG.salvar = function() {
    try {
        localStorage.setItem('bonus_config', JSON.stringify({
            minimoPartidas: window.BONUS_CONFIG.minimoPartidas,
            ativo: window.BONUS_CONFIG.ativo
        }));
    } catch (e) {
        console.warn('Erro ao salvar configuração de bônus:', e);
    }
};

// Carrega do localStorage
window.BONUS_CONFIG.carregar = function() {
    try {
        const salvo = localStorage.getItem('bonus_config');
        if (salvo) {
            const config = JSON.parse(salvo);
            if (config.minimoPartidas !== undefined) window.BONUS_CONFIG.minimoPartidas = config.minimoPartidas;
            if (config.ativo !== undefined) window.BONUS_CONFIG.ativo = config.ativo;
        }
    } catch (e) {
        console.warn('Erro ao carregar configuração de bônus:', e);
    }
};

// Função para calcular o bônus
window.BONUS_CONFIG.calcularBonus = function(quantidadePartidas, deltaVelocidade) {
    // Se o sistema estiver desativado, retorna 0
    if (!this.ativo) return 0;

    // REGRA 1: Mínimo de partidas
    if (quantidadePartidas < this.minimoPartidas) {
        return this.punicaoMinimoPartidas;
    }

    // REGRA 2: Delta >= 0 → bônus máximo
    if (deltaVelocidade >= 0) {
        return this.bonusMaximo;
    }

    // REGRA 3: Delta < 0 → aplicar escala com base na oscilação
    const oscilacao = Math.abs(deltaVelocidade);
    for (const escala of this.escalas) {
        if (oscilacao <= escala.limite) {
            return escala.bonus;
        }
    }
    return 0; // fallback
};

// Carrega ao iniciar
window.BONUS_CONFIG.carregar();
