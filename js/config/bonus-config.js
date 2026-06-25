// ============================================================
// ARQUIVO: js/config/bonus-config.js
// DESCRIÇÃO: Configuração do Sistema de Bônus por Velocidade
// ============================================================

export const BONUS_CONFIG = {
    // ========== CONFIGURAÇÕES GERAIS ==========
    // Mínimo de partidas para aplicar bônus por velocidade
    minimoPartidas: 5,
    
    // Mínimo de partidas para não ser penalizado
    minimoPartidasMin: 1,
    minimoPartidasMax: 20,
    
    // Sistema ligado/desligado (controlado pelo professor)
    ativo: true,
    
    // ========== ESCALA DE BÔNUS/PUNIÇÃO ==========
    // Delta >= 0 → bônus máximo (manteve ou melhorou o recorde)
    // Delta < 0 → oscilou abaixo do recorde
    escalas: [
        { limite: 0.10, bonus: 100 },   // Oscilou pouco
        { limite: 0.20, bonus: 50 },    // Oscilou moderadamente
        { limite: 0.50, bonus: -100 },  // Oscilou significativamente
        { limite: Infinity, bonus: -200 } // Oscilou drasticamente
    ],
    
    bonusMaximo: 200,           // Bônus para delta >= 0
    punicaoMinimoPartidas: -100 // Punição para quem tem menos que o mínimo
};

// ============================================================
// FUNÇÃO PARA CALCULAR BÔNUS
// ============================================================

export function calcularBonus(quantidadePartidas, deltaVelocidade, config = BONUS_CONFIG) {
    // Se o sistema estiver desativado, retorna 0
    if (!config.ativo) return 0;

    // REGRA 1: Mínimo de partidas
    if (quantidadePartidas < config.minimoPartidas) {
        return config.punicaoMinimoPartidas;
    }

    // REGRA 2: Delta >= 0 → bônus máximo
    if (deltaVelocidade >= 0) {
        return config.bonusMaximo;
    }

    // REGRA 3: Delta < 0 → aplicar escala com base na oscilação
    const oscilacao = Math.abs(deltaVelocidade);
    for (const escala of config.escalas) {
        if (oscilacao <= escala.limite) {
            return escala.bonus;
        }
    }
    return 0;
}

// ============================================================
// FUNÇÃO PARA CALCULAR BÔNUS DE UMA FASE
// ============================================================

export function calcularBonusFase(partidas, config = BONUS_CONFIG) {
    if (!partidas || partidas.length === 0) return 0;

    let recordeVelocidade = Infinity;
    let somaTempo = 0;
    let totalAcertos = 0;

    partidas.forEach(p => {
        if (p.acertos > 0) {
            const velocidade = p.tempo / p.acertos;
            if (velocidade < recordeVelocidade) {
                recordeVelocidade = velocidade;
            }
            somaTempo += p.tempo || 0;
            totalAcertos += p.acertos || 0;
        }
    });

    if (recordeVelocidade === Infinity || totalAcertos === 0) return 0;

    const velocidadeMedia = somaTempo / totalAcertos;
    const delta = velocidadeMedia - recordeVelocidade;

    return calcularBonus(partidas.length, delta, config);
}

// ============================================================
// FUNÇÃO PARA CALCULAR BÔNUS TOTAL (TODAS AS FASES)
// ============================================================

export function calcularBonusTotal(resultados, alunoId, config = BONUS_CONFIG) {
    let totalBonus = 0;
    const TOTAL_FASES = 5;
    
    for (let fase = 1; fase <= TOTAL_FASES; fase++) {
        const partidas = resultados[fase]?.[alunoId] || [];
        if (partidas.length === 0) continue;
        totalBonus += calcularBonusFase(partidas, config);
    }
    
    return totalBonus;
}

// ============================================================
// FUNÇÃO PARA OBTER PONTUAÇÃO COM BÔNUS
// ============================================================

export function obterPontuacaoComBonus(pontos, bonus) {
    return pontos + bonus;
}

// ============================================================
// CONFIGURAÇÕES PARA O PAINEL DO PROFESSOR
// ============================================================

export const BONUS_CONFIG_UI = {
    titulo: "⭐ Sistema de Bônus por Velocidade",
    descricao: "Adiciona pontos extras por velocidade e consistência nas partidas",
    campos: [
        {
            id: "cfg-bonus-ativo",
            tipo: "switch",
            label: "⭐ Ativar Sistema de Bônus",
            descricao: "Habilita/desabilita todo o sistema de bônus no ranking",
            padrao: true
        },
        {
            id: "cfg-bonus-min-partidas",
            tipo: "range",
            label: "📊 Mínimo de Partidas para Bônus",
            descricao: "Quantas partidas o aluno precisa jogar para receber bônus (1 a 20)",
            min: 1,
            max: 20,
            padrao: 5,
            unidade: "partidas"
        },
        {
            id: "cfg-bonus-maximo",
            tipo: "range",
            label: "🏆 Bônus Máximo",
            descricao: "Pontos extras por manter ou melhorar o recorde de velocidade",
            min: 0,
            max: 500,
            padrao: 200,
            unidade: "pts"
        },
        {
            id: "cfg-bonus-punicao",
            tipo: "range",
            label: "⚠️ Punição por Poucas Partidas",
            descricao: "Pontos deduzidos quando o aluno não atinge o mínimo de partidas",
            min: -500,
            max: 0,
            padrao: -100,
            unidade: "pts"
        }
    ]
};
