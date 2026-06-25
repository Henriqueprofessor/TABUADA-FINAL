// ============================================================
// ARQUIVO: js/models/game.js
// DESCRIÇÃO: Lógica do Jogo (Perguntas, Partidas, Pontuação)
// ============================================================

import { MODALIDADE_CONFIG, TOTAL_PERGUNTAS, TEMPO_PERGUNTA } from '../utils/constants.js';
import { shuffleArray, randInt } from '../utils/helpers.js';

// ========== CACHE DE PERGUNTAS ==========
const poolCache = {};

// ========== GERAR POOL DE PERGUNTAS ==========
function gerarPool(modalidade) {
    const config = MODALIDADE_CONFIG[modalidade];
    if (!config) return [];
    
    const { min, max } = config;
    const pool = [];
    
    for (let i = 0; i < 100; i++) {
        let a = randInt(min, max);
        let b = randInt(min, max);
        let r = a * b;
        
        let opts = [r];
        while (opts.length < 4) {
            let x = r + randInt(-5, 5);
            if (x >= 0 && !opts.includes(x)) opts.push(x);
        }
        
        // Embaralha as opções para distribuição aleatória da correta
        shuffleArray(opts);
        pool.push({ a, b, opts });
    }
    
    return pool;
}

// ========== OBTER PERGUNTAS PARA UMA PARTIDA ==========
export function obterPerguntas(modalidade) {
    if (!poolCache[modalidade]) {
        poolCache[modalidade] = gerarPool(modalidade);
    }
    
    const pool = poolCache[modalidade];
    const shuffled = [...pool];
    shuffleArray(shuffled);
    return shuffled.slice(0, TOTAL_PERGUNTAS);
}

// ========== INICIAR PARTIDA ==========
export function iniciarPartida(perguntas) {
    return {
        perguntas: perguntas || [],
        indice: 0,
        pontos: 0,
        acertos: 0,
        erros: 0,
        tempoTotal: 0,
        tempoRestantePergunta: TEMPO_PERGUNTA,
        finalizada: false,
        sequenciaAcertos: 0,
        maiorSequencia: 0,
        respostas: []
    };
}

// ========== PROCESSAR RESPOSTA ==========
export function processarResposta(partida, opcaoSelecionada) {
    const p = partida.perguntas[partida.indice];
    if (!p) return null;

    const respostaCorreta = p.a * p.b;
    const acertou = opcaoSelecionada === respostaCorreta;
    const tempoGasto = TEMPO_PERGUNTA - partida.tempoRestantePergunta;
    
    let pontosGanhos = 0;
    
    if (acertou) {
        partida.acertos++;
        partida.sequenciaAcertos++;
        if (partida.sequenciaAcertos > partida.maiorSequencia) {
            partida.maiorSequencia = partida.sequenciaAcertos;
        }
        // Pontuação baseada no tempo restante
        pontosGanhos = Math.round(100 * (partida.tempoRestantePergunta / TEMPO_PERGUNTA));
        partida.pontos += pontosGanhos;
    } else {
        partida.erros++;
        partida.sequenciaAcertos = 0;
    }
    
    partida.tempoTotal += tempoGasto;
    partida.respostas.push({
        pergunta: `${p.a} x ${p.b}`,
        resposta: opcaoSelecionada,
        correta: respostaCorreta,
        acertou,
        tempo: tempoGasto,
        pontos: pontosGanhos
    });
    
    partida.indice++;
    
    // Verifica se a partida terminou
    if (partida.indice >= TOTAL_PERGUNTAS) {
        partida.finalizada = true;
    }
    
    return {
        acertou,
        respostaCorreta,
        pontosGanhos,
        tempoGasto,
        progresso: partida.indice,
        total: TOTAL_PERGUNTAS,
        finalizada: partida.finalizada,
        sequenciaAtual: partida.sequenciaAcertos,
        maiorSequencia: partida.maiorSequencia
    };
}

// ========== OBTER PRÓXIMA PERGUNTA ==========
export function getProximaPergunta(partida) {
    if (partida.finalizada || partida.indice >= TOTAL_PERGUNTAS) {
        return null;
    }
    return partida.perguntas[partida.indice];
}

// ========== CALCULAR ESTATÍSTICAS DA PARTIDA ==========
export function calcularEstatisticas(partida) {
    const total = partida.perguntas.length;
    const respondidas = partida.respostas.length;
    
    return {
        totalPerguntas: total,
        respondidas: respondidas,
        acertos: partida.acertos,
        erros: partida.erros,
        pontos: partida.pontos,
        tempoTotal: partida.tempoTotal,
        tempoMedio: partida.tempoTotal / Math.max(1, respondidas),
        taxaAcerto: total > 0 ? (partida.acertos / total) * 100 : 0,
        maiorSequencia: partida.maiorSequencia,
        finalizada: partida.finalizada
    };
}

// ========== CRIAR OBJETO DE PARTIDA PARA SALVAR ==========
export function criarObjetoPartida(partida) {
    const stats = calcularEstatisticas(partida);
    return {
        pontos: stats.pontos,
        acertos: stats.acertos,
        erros: stats.erros,
        tempo: stats.tempoTotal,
        tempoMedio: stats.tempoMedio,
        taxaAcerto: stats.taxaAcerto,
        maiorSequencia: stats.maiorSequencia,
        timestamp: Date.now(),
        respostas: partida.respostas
    };
}

// ========== VERIFICAR NOTIFICAÇÕES ==========
export function verificarNotificacoes(partida, ultimoResultado) {
    if (!ultimoResultado) return [];
    
    const notificacoes = [];
    const seq = partida.sequenciaAcertos;
    const erros = partida.erros;
    
    // Notificações de sequência de acertos
    if (seq === 5) notificacoes.push('seq5');
    else if (seq === 10) notificacoes.push('seq10');
    else if (seq === 15) notificacoes.push('seq15');
    else if (seq === 20) notificacoes.push('seq20');
    
    // Notificações de erros (incentivo)
    if (erros === 3 && !ultimoResultado.acertou) notificacoes.push('erro3');
    else if (erros === 5 && !ultimoResultado.acertou) notificacoes.push('erro5');
    
    // Notificações de velocidade
    if (ultimoResultado.acertou) {
        if (ultimoResultado.tempoGasto <= 1.0) notificacoes.push('relampago');
        else if (ultimoResultado.tempoGasto <= 1.5) notificacoes.push('rapido');
    }
    
    return notificacoes;
}

// ========== VERIFICAR RECORDES ==========
export function verificarRecordes(partida, resultadosAnteriores) {
    if (!resultadosAnteriores || resultadosAnteriores.length === 0) {
        return { recordeFase: true, recordeGeral: true };
    }
    
    const melhorAnterior = Math.max(...resultadosAnteriores.map(r => r.pontos || 0));
    const pontuacaoAtual = partida.pontos;
    
    return {
        recordeFase: pontuacaoAtual > melhorAnterior,
        recordeGeral: pontuacaoAtual > (resultadosAnteriores[0]?.pontos || 0)
    };
}

// ========== EXPORTAR PADRÃO ==========
export default {
    obterPerguntas,
    iniciarPartida,
    processarResposta,
    getProximaPergunta,
    calcularEstatisticas,
    criarObjetoPartida,
    verificarNotificacoes,
    verificarRecordes
};
