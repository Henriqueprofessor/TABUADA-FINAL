// ============================================================
// ARQUIVO: js/ranking/ranking.js
// DESCRIÇÃO: Ranking com todas as colunas (Ameaça, Delta Líder, Velocidades, etc)
// ============================================================

import { 
    resultadosRef, 
    resultadosTempRef, 
    participantesRef,
    classificadosRef,
    getOnce
} from '../services/firebase-service.js';
import { VAGAS_POR_FASE, TOTAL_FASES } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { calcularBonusFase, obterPontuacaoComBonus } from '../config/bonus-config.js';

// ========== CACHE ==========
const cache = new Map();

// ========== RENDERIZAR RANKING INDIVIDUAL ==========
export async function renderRankingIndividual(fase, containerId, exibirClassificacao = false) {
    const cacheKey = `ind_${fase}_${exibirClassificacao}`;
    
    if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < 2000) {
        const cached = cache.get(cacheKey);
        document.getElementById(containerId).innerHTML = cached.html;
        return;
    }

    try {
        const [snapFinal, snapTemp, snapParticipantes] = await Promise.all([
            getOnce(resultadosRef(fase)),
            getOnce(resultadosTempRef(fase)),
            getOnce(participantesRef(fase))
        ]);

        const resultados = snapFinal.val() || {};
        const temporarios = snapTemp.val() || {};
        const participantes = snapParticipantes.val() || {};

        // ========== CALCULAR RECORDE DE VELOCIDADE POR ALUNO ==========
        const recordeVelocMap = new Map();
        const todasFases = {};

        // Buscar todas as fases para calcular o recorde de velocidade
        for (let f = 1; f <= TOTAL_FASES; f++) {
            const snap = await getOnce(resultadosRef(f));
            todasFases[f] = snap.val() || {};
        }

        for (let f = 1; f <= TOTAL_FASES; f++) {
            const resultadosFase = todasFases[f] || {};
            for (const [id, partidas] of Object.entries(resultadosFase)) {
                if (!partidas || partidas.length === 0) continue;
                for (const partida of partidas) {
                    if (partida.acertos > 0 && partida.tempo > 0) {
                        const vel = partida.tempo / partida.acertos;
                        if (!recordeVelocMap.has(id) || vel < recordeVelocMap.get(id)) {
                            recordeVelocMap.set(id, vel);
                        }
                    }
                }
            }
        }

        // ========== MAPEAR DADOS ==========
        const mapa = new Map();
        const statusMap = new Map();

        // Processar temporários
        for (const [id, data] of Object.entries(temporarios)) {
            const participante = participantes[id] || {};
            mapa.set(id, {
                id,
                nome: participante.nome || data.nome || 'Anônimo',
                turma: participante.turma || data.turma || '?',
                pontos: data.pontos || 0,
                acertos: data.acertos || 0,
                tempo: data.tempo || 0,
                perguntas: data.perguntas || 0,
                isTemp: true,
                status: 'em_jogo',
                progresso: data.perguntas || 0,
                ultimaPosicao: null,
                partidas: 1,
                recordeVelocidade: recordeVelocMap.get(id) || null,
                velocidadeAtual: (data.acertos > 0 && data.tempo > 0) ? (data.tempo / data.acertos) : null
            });
        }

        // Processar resultados finais
        for (const [id, partidas] of Object.entries(resultados)) {
            if (!partidas || partidas.length === 0) continue;
            
            const melhor = [...partidas].sort((a, b) => b.pontos - a.pontos)[0];
            const participante = participantes[id] || {};
            const ultimaPartida = partidas[partidas.length - 1];
            
            const existente = mapa.get(id);
            const velocidadeAtual = (melhor.acertos > 0 && melhor.tempo > 0) ? (melhor.tempo / melhor.acertos) : null;
            
            if (!existente) {
                mapa.set(id, {
                    id,
                    nome: participante.nome || melhor.nome || 'Anônimo',
                    turma: participante.turma || melhor.turma || '?',
                    pontos: melhor.pontos || 0,
                    acertos: melhor.acertos || 0,
                    tempo: melhor.tempo || 0,
                    perguntas: 20,
                    isTemp: false,
                    partidas: partidas.length,
                    status: 'finalizado',
                    progresso: 20,
                    ultimaPosicao: ultimaPartida?.posicao || null,
                    recordeVelocidade: recordeVelocMap.get(id) || null,
                    velocidadeAtual: velocidadeAtual
                });
            } else {
                if (melhor.pontos > existente.pontos) {
                    existente.pontos = melhor.pontos;
                    existente.acertos = melhor.acertos;
                    existente.tempo = melhor.tempo;
                    existente.velocidadeAtual = velocidadeAtual;
                }
                existente.partidas = (existente.partidas || 0) + partidas.length;
                if (!existente.ultimaPosicao) {
                    existente.ultimaPosicao = ultimaPartida?.posicao || null;
                }
                if (!existente.recordeVelocidade) {
                    existente.recordeVelocidade = recordeVelocMap.get(id) || null;
                }
            }
        }

        // ========== ORDENAR ==========
        let lista = Array.from(mapa.values());
        lista.sort((a, b) => {
            if (b.pontos !== a.pontos) return b.pontos - a.pontos;
            if (b.acertos !== a.acertos) return b.acertos - a.acertos;
            return a.tempo - b.tempo;
        });

        // ========== GERAR HTML ==========
        const html = construirTabelaRankingCompleta(lista, fase, exibirClassificacao);
        document.getElementById(containerId).innerHTML = html;
        
        cache.set(cacheKey, { html, timestamp: Date.now() });

    } catch (error) {
        console.error('Erro ao renderizar ranking:', error);
        document.getElementById(containerId).innerHTML = `
            <p style="color: #e74c3c;">❌ Erro ao carregar ranking. Tente novamente.</p>
        `;
    }
}

// ========== CONSTRUIR TABELA DE RANKING COMPLETA ==========
function construirTabelaRankingCompleta(lista, fase, exibirClassificacao) {
    if (lista.length === 0) {
        return '<p>⏳ Nenhum resultado registrado ainda. Aguarde os primeiros jogadores...</p>';
    }

    const vagas = VAGAS_POR_FASE[fase] || 30;
    const maxPontos = lista[0]?.pontos || 0;

    // ========== CABEÇALHO COM TODAS AS COLUNAS ==========
    let html = `<table class="ranking-table"><thead><tr>
        <th>Pos</th>
        <th>Nome</th>
        <th>Ameaça</th>
        <th>Pontuação</th>
        <th>Delta Líder</th>
        <th>Veloc. Média</th>
        <th>Veloc. Recorde</th>
        <th>Δ Veloc.</th>
        <th>Progresso</th>
        ${exibirClassificacao ? '<th>Classificação</th>' : ''}
        <th>Partidas</th>
        <th>Turma</th>
    </tr></thead><tbody>`;

    // ========== CORPO DA TABELA ==========
    for (let idx = 0; idx < lista.length; idx++) {
        const j = lista[idx];
        const posAtual = idx + 1;
        const posAnterior = j.ultimaPosicao || null;
        
        let classePos = '';
        if (posAnterior !== null && posAnterior > 0) {
            if (posAtual < posAnterior) classePos = 'posicao-subiu';
            else if (posAtual > posAnterior) classePos = 'posicao-desceu';
        }

        // ========== DELTA LÍDER ==========
        const deltaLider = maxPontos - j.pontos;
        const deltaText = deltaLider === 0 ? '🏆 Líder' : `+${deltaLider}`;

        // ========== VELOCIDADES ==========
        let velocidadeAtualStr = '-';
        let velocidadeAtualNum = null;
        if (j.velocidadeAtual !== null && j.velocidadeAtual > 0) {
            velocidadeAtualNum = j.velocidadeAtual;
            velocidadeAtualStr = velocidadeAtualNum.toFixed(2) + 's';
        } else if (j.acertos > 0 && j.tempo > 0) {
            velocidadeAtualNum = j.tempo / j.acertos;
            velocidadeAtualStr = velocidadeAtualNum.toFixed(2) + 's';
        }

        let recordeStr = '-';
        let recordeNum = j.recordeVelocidade;
        if (recordeNum !== null && recordeNum > 0) {
            recordeStr = recordeNum.toFixed(2) + 's';
        }

        // ========== Δ VELOCIDADE ==========
        let deltaVelocidadeHtml = '';
        if (velocidadeAtualNum !== null && recordeNum !== null && recordeNum > 0) {
            const diff = velocidadeAtualNum - recordeNum;
            const diffAbs = Math.abs(diff);
            const diffStr = diffAbs.toFixed(2);
            let icon = '', classe = '';
            if (diff < -0.01) { 
                icon = '🟢'; 
                classe = 'veloc-melhor'; 
            } else if (diff > 0.01) { 
                icon = '🔴'; 
                classe = 'veloc-pior'; 
            } else { 
                icon = '⚪'; 
                classe = 'veloc-igual'; 
            }
            deltaVelocidadeHtml = `<span class="${classe}">${icon} ${diffStr}s</span>`;
        } else {
            deltaVelocidadeHtml = '—';
        }

        // ========== AMEAÇA ==========
        let ameacaHtml = '—';

        // ========== PROGRESSO ==========
        let progressoHtml = '';
        if (j.status === 'em_jogo') {
            progressoHtml = `${j.progresso}/20`;
        } else if (j.status === 'finalizado') {
            progressoHtml = `✅ Finalizado`;
        } else {
            progressoHtml = '—';
        }

        // ========== CLASSIFICAÇÃO ==========
        let colunaClassificacao = '';
        if (exibirClassificacao) {
            const classificado = posAtual <= vagas;
            if (fase === 5) {
                colunaClassificacao = classificado 
                    ? `<td class="classificado-sim">🏆 Finalista</td>` 
                    : `<td class="classificado-nao">❌ Eliminado</td>`;
            } else {
                colunaClassificacao = classificado 
                    ? `<td class="classificado-sim">✅ Classificado</td>` 
                    : `<td class="classificado-nao">❌ Eliminado</td>`;
            }
        }

        // ========== LINHA ==========
        html += `<tr>
            <td class="${classePos}">${posAtual}º</td>
            <td>${escapeHtml(j.nome)}</td>
            <td>${ameacaHtml}</td>
            <td><strong>${j.pontos}</strong></td>
            <td>${deltaText}</td>
            <td>${velocidadeAtualStr}</td>
            <td>${recordeStr}</td>
            <td>${deltaVelocidadeHtml}</td>
            <td>${progressoHtml}</td>
            ${colunaClassificacao}
            <td>${j.partidas || 1}</td>
            <td>${escapeHtml(j.turma)}</td>
        </tr>`;
    }

    html += '</tbody></table>';
    return html;
}

// ========== RENDERIZAR RANKING POR TURMAS ==========
export async function renderRankingTurmas(containerId) {
    try {
        const turmasMap = new Map();
        
        for (let fase = 1; fase <= TOTAL_FASES; fase++) {
            const snapResultados = await getOnce(resultadosRef(fase));
            const snapParticipantes = await getOnce(participantesRef(fase));
            
            const resultados = snapResultados.val() || {};
            const participantes = snapParticipantes.val() || {};
            
            for (const [id, partidas] of Object.entries(resultados)) {
                if (!partidas || partidas.length === 0) continue;
                
                const melhor = [...partidas].sort((a, b) => b.pontos - a.pontos)[0];
                const participante = participantes[id] || {};
                const turma = participante.turma || '?';
                const nome = participante.nome || 'Anônimo';
                
                if (!turmasMap.has(turma)) {
                    turmasMap.set(turma, {
                        alunos: new Map(),
                        totalAlunos: 0,
                        somaPontos: 0,
                        melhorAlunoNome: '',
                        melhorAlunoPontos: 0,
                        totalPartidas: 0
                    });
                }
                
                const turmaData = turmasMap.get(turma);
                if (!turmaData.alunos.has(id) || melhor.pontos > turmaData.alunos.get(id).pontos) {
                    turmaData.alunos.set(id, { pontos: melhor.pontos, nome });
                }
                turmaData.totalPartidas += partidas.length;
            }
        }

        for (const [turma, data] of turmasMap.entries()) {
            let soma = 0;
            let melhorPontos = 0;
            let melhorNome = '';
            
            for (const [id, info] of data.alunos.entries()) {
                soma += info.pontos;
                if (info.pontos > melhorPontos) {
                    melhorPontos = info.pontos;
                    melhorNome = info.nome;
                }
            }
            
            data.somaPontos = soma;
            data.totalAlunos = data.alunos.size;
            data.melhorAlunoPontos = melhorPontos;
            data.melhorAlunoNome = melhorNome;
        }

        let ranking = Array.from(turmasMap.entries()).map(([turma, data]) => ({
            turma,
            media: data.totalAlunos > 0 ? (data.somaPontos / data.totalAlunos) : 0,
            totalAlunos: data.totalAlunos,
            melhorNome: data.melhorAlunoNome,
            melhorPontos: data.melhorAlunoPontos,
            totalPartidas: data.totalPartidas
        }));
        
        ranking.sort((a, b) => b.media - a.media);

        let html = `<table class="ranking-table"><thead><tr>
            <th>Pos</th>
            <th>Turma</th>
            <th>Média</th>
            <th>Participantes</th>
            <th>Maior Pontuação</th>
            <th>Total Partidas</th>
        </tr></thead><tbody>`;

        if (ranking.length === 0) {
            html += `<tr><td colspan="6" style="text-align:center; padding:20px;">📭 Nenhum dado registrado ainda.</td></tr>`;
        } else {
            ranking.forEach((r, idx) => {
                html += `<tr>
                    <td>${idx + 1}º</td>
                    <td><strong>${escapeHtml(r.turma)}</strong></td>
                    <td>${r.media.toFixed(1)} pts</td>
                    <td>${r.totalAlunos}</td>
                    <td>${escapeHtml(r.melhorNome)} (${r.melhorPontos} pts)</td>
                    <td>${r.totalPartidas}</td>
                </tr>`;
            });
        }

        html += '</tbody></table>';
        document.getElementById(containerId).innerHTML = html;

    } catch (error) {
        console.error('Erro ao renderizar ranking por turmas:', error);
        document.getElementById(containerId).innerHTML = `
            <p style="color: #e74c3c;">❌ Erro ao carregar ranking por turmas.</p>
        `;
    }
}

// ========== RENDERIZAR RANKING GERAL ==========
export async function renderRankingGeral(containerId) {
    try {
        const todosAlunos = new Map();
        
        for (let fase = 1; fase <= TOTAL_FASES; fase++) {
            const snapResultados = await getOnce(resultadosRef(fase));
            const snapParticipantes = await getOnce(participantesRef(fase));
            const snapClassificados = await getOnce(classificadosRef(fase));
            
            const resultados = snapResultados.val() || {};
            const participantes = snapParticipantes.val() || {};
            const classificados = snapClassificados.val() || [];
            
            for (const [id, partidas] of Object.entries(resultados)) {
                if (!partidas || partidas.length === 0) continue;
                
                const melhor = [...partidas].sort((a, b) => b.pontos - a.pontos)[0];
                const participante = participantes[id] || {};
                const nome = participante.nome || 'Anônimo';
                const turma = participante.turma || '?';
                
                if (!todosAlunos.has(id)) {
                    todosAlunos.set(id, {
                        id,
                        nome,
                        turma,
                        melhorPontuacao: melhor.pontos,
                        melhorAcertos: melhor.acertos,
                        melhorTempo: melhor.tempo,
                        ultimaFase: fase,
                        totalPartidas: partidas.length,
                        faseEliminacao: null,
                        melhorVelocidade: null
                    });
                } else {
                    const existente = todosAlunos.get(id);
                    if (fase > existente.ultimaFase) {
                        existente.ultimaFase = fase;
                        if (melhor.pontos > existente.melhorPontuacao) {
                            existente.melhorPontuacao = melhor.pontos;
                            existente.melhorAcertos = melhor.acertos;
                            existente.melhorTempo = melhor.tempo;
                        }
                    }
                    existente.totalPartidas += partidas.length;
                }
                
                const jogador = todosAlunos.get(id);
                for (const partida of partidas) {
                    if (partida.acertos > 0 && partida.tempo > 0) {
                        const velocidade = partida.tempo / partida.acertos;
                        if (jogador.melhorVelocidade === null || velocidade < jogador.melhorVelocidade) {
                            jogador.melhorVelocidade = velocidade;
                        }
                    }
                }
            }
        }

        for (const [id, info] of todosAlunos.entries()) {
            const snapClassificados = await getOnce(classificadosRef(info.ultimaFase));
            const classificados = snapClassificados.val() || [];
            if (!classificados.includes(id)) {
                info.faseEliminacao = info.ultimaFase;
            }
        }

        let ranking = Array.from(todosAlunos.values());
        ranking.sort((a, b) => {
            if (a.ultimaFase !== b.ultimaFase) return b.ultimaFase - a.ultimaFase;
            return b.melhorPontuacao - a.melhorPontuacao || 
                   b.melhorAcertos - a.melhorAcertos || 
                   a.melhorTempo - b.melhorTempo;
        });

        let html = `<table class="ranking-table"><thead><tr>
            <th>Pos</th>
            <th>Nome</th>
            <th>Turma</th>
            <th>Melhor Pontuação</th>
            <th>Melhor Velocidade</th>
            <th>Fase Máxima</th>
            <th>Status</th>
            <th>Partidas</th>
        </tr></thead><tbody>`;

        if (ranking.length === 0) {
            html += `<tr><td colspan="8" style="text-align:center; padding:20px;">📭 Nenhum dado registrado ainda.</td></tr>`;
        } else {
            ranking.forEach((r, idx) => {
                let status = `🎯 Fase ${r.ultimaFase}`;
                if (r.faseEliminacao) {
                    status += ` (Eliminado na Fase ${r.faseEliminacao})`;
                } else if (r.ultimaFase === 5) {
                    status = '🏆 Finalista';
                } else {
                    status += ` (Classificado)`;
                }
                
                const vel = r.melhorVelocidade !== null 
                    ? r.melhorVelocidade.toFixed(2) + 's' 
                    : '-';

                html += `<tr>
                    <td>${idx + 1}º</td>
                    <td><strong>${escapeHtml(r.nome)}</strong></td>
                    <td>${escapeHtml(r.turma)}</td>
                    <td>${r.melhorPontuacao}</td>
                    <td>${vel}</td>
                    <td>${r.ultimaFase}</td>
                    <td>${status}</td>
                    <td>${r.totalPartidas}</td>
                </tr>`;
            });
        }

        html += '</tbody></table>';
        document.getElementById(containerId).innerHTML = html;

    } catch (error) {
        console.error('Erro ao renderizar ranking geral:', error);
        document.getElementById(containerId).innerHTML = `
            <p style="color: #e74c3c;">❌ Erro ao carregar ranking geral.</p>
        `;
    }
}

// ========== LIMPAR CACHE ==========
export function limparCacheRanking() {
    cache.clear();
}
