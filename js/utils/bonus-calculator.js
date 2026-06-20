// js/utils/bonus-calculator.js
// Calculadora de bônus para rankings

window.BonusCalculator = (function() {
    const config = window.BONUS_CONFIG;

    // ========== CALCULAR BÔNUS DA FASE ==========
    function calcularBonusFase(alunoId, fase, partidas) {
        if (!partidas || partidas.length === 0) return 0;

        // Calcular velocidade recorde da fase
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

        // Calcular velocidade média
        const velocidadeMedia = somaTempo / totalAcertos;
        const delta = velocidadeMedia - recordeVelocidade;

        // Calcular bônus usando a configuração
        return config.calcularBonus(partidas.length, delta);
    }

    // ========== CALCULAR BÔNUS POR FASE (armazenado) ==========
    async function calcularBonusParaFase(alunoId, fase) {
        // Buscar partidas do aluno na fase
        const snap = await window.firebaseService.getResultadosRef(fase).child(alunoId).once('value');
        const partidas = snap.val() || [];
        return calcularBonusFase(alunoId, fase, partidas);
    }

    // ========== CALCULAR BÔNUS ACUMULADO ==========
    function calcularBonusTotal(alunoId, resultados) {
        let totalBonus = 0;
        for (let fase = 1; fase <= window.TOTAL_FASES; fase++) {
            const partidas = resultados[fase]?.[alunoId] || [];
            if (partidas.length === 0) continue;
            totalBonus += calcularBonusFase(alunoId, fase, partidas);
        }
        return totalBonus;
    }

    // ========== OBTER PONTUAÇÃO TOTAL COM BÔNUS ==========
    function obterPontuacaoComBonus(melhorPontuacao, bonus) {
        return melhorPontuacao + bonus;
    }

    // ========== EXPORTAÇÃO ==========
    return {
        calcularBonusFase,
        calcularBonusParaFase,
        calcularBonusTotal,
        obterPontuacaoComBonus,
        getConfig: () => config
    };
})();
