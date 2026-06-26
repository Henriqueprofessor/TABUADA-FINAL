// ============================================================
// ARQUIVO: js/models/game.js
// DESCRIÇÃO: Lógica do Jogo - PONTUAÇÃO CORRIGIDA
// ============================================================

import { MODALIDADE_CONFIG, TOTAL_PERGUNTAS, TEMPO_PERGUNTA } from '../utils/constants.js';
import { shuffleArray, randInt } from '../utils/helpers.js';

const poolCache = {};

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
        
        shuffleArray(opts);
        pool.push({ a, b, opts });
    }
    
    return pool;
}

export function obterPerguntas(modalidade) {
    if (!poolCache[modalidade]) {
        poolCache[modalidade] = gerarPool(modalidade);
    }
    
    const pool = poolCache[modalidade];
    const shuffled = [...pool];
    shuffleArray(shuffled);
    return shuffled.slice(0, TOTAL_PERGUNTAS);
}

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

export function processarResposta(partida, opcaoSelecionada) {
    console.log('🔍 processarResposta - tempoRestante:', partida.tempoRestantePergunta);
    
    const p = partida.perguntas[partida.indice];
    if (!p) return null;

    const respostaCorreta = p.a * p.b;
    const acertou = opcaoSelecionada === respostaCorreta;
    
    // ============================================================
    // CÁLCULO DA PONTUAÇÃO - CORRIGIDO
    // tempoRestantePergunta: 10 → 100 pontos (resposta imediata)
    // tempoRestantePergunta: 5  → 50 pontos
    // tempoRestantePergunta: 0  → 0 pontos
    // ============================================================
    const tempoGasto = TEMPO_PERGUNTA - partida.tempoRestantePergunta;
    let pontosGanhos = 0;
    
    if (acertou) {
        partida.acertos++;
        partida.sequenciaAcertos++;
        if (partida.sequenciaAcertos > partida.maiorSequencia) {
            partida.maiorSequencia = partida.sequenciaAcertos;
        }
        
        // CORREÇÃO: usa o tempoRestantePergunta que é atualizado pelo timer
        const percentual = Math.max(0, partida.tempoRestantePergunta / TEMPO_PERGUNTA);
        pontosGanhos = Math.round(100 * percentual);
        
        // Garantir que se acertou com tempo > 0, ganhe pelo menos 1 ponto
        if (pontosGanhos === 0 && partida.tempoRestantePergunta > 0) {
            pontosGanhos = 1;
        }
        
        partida.pontos += pontosGanhos;
        console.log(`✅ Acertou! Tempo restante: ${partida.tempoRestantePergunta}s → ${pontosGanhos} pontos`);
    } else {
        partida.erros++;
        partida.sequenciaAcertos = 0;
        console.log(`❌ Errou! Resposta correta: ${respostaCorreta}`);
    }
    
    partida.tempoTotal += tempoGasto;
    partida.respostas.push({
        pergunta: `${p.a} x ${p.b}`,
        resposta: opcaoSelecionada,
        correta: respostaCorreta,
        acertou,
        tempo: tempoGasto,
        pontos: pontosGanhos,
        tempoRestante: partida.tempoRestantePergunta
    });
    
    partida.indice++;
    
    const finalizada = partida.indice >= TOTAL_PERGUNTAS;
    if (finalizada) {
        partida.finalizada = true;
    }
    
    return {
        acertou,
        respostaCorreta,
        pontosGanhos,
        tempoGasto,
        progresso: partida.indice,
        total: TOTAL_PERGUNTAS,
        finalizada: finalizada,
        sequenciaAtual: partida.sequenciaAcertos,
        maiorSequencia: partida.maiorSequencia,
        tempoRestante: partida.tempoRestantePergunta
    };
}

export function getProximaPergunta(partida) {
    if (partida.finalizada || partida.indice >= TOTAL_PERGUNTAS) {
        return null;
    }
    return partida.perguntas[partida.indice];
}

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

export function verificarNotificacoes(partida, ultimoResultado) {
    if (!ultimoResultado) return [];
    
    const notificacoes = [];
    const seq = partida.sequenciaAcertos;
    const erros = partida.erros;
    
    if (seq === 5) notificacoes.push('seq5');
    else if (seq === 10) notificacoes.push('seq10');
    else if (seq === 15) notificacoes.push('seq15');
    else if (seq === 20) notificacoes.push('seq20');
    
    if (erros === 3 && !ultimoResultado.acertou) notificacoes.push('erro3');
    else if (erros === 5 && !ultimoResultado.acertou) notificacoes.push('erro5');
    
    if (ultimoResultado.acertou) {
        if (ultimoResultado.tempoGasto <= 1.0) notificacoes.push('relampago');
        else if (ultimoResultado.tempoGasto <= 1.5) notificacoes.push('rapido');
    }
    
    return notificacoes;
}

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
