// js/modules/ranking.js
import { db } from '../config/firebase.js';
import { state } from './state.js';
import { lerDados, atualizarDados, removerDados, setDados } from './db.js';
import { exibirToast, atualizarTimerFase, mostrarTela } from './ui.js';
import { tocarSom } from './sound.js';
import { atualizarExibicaoMedalhas, carregarMedalhasLocal } from './medals.js';

// ============================================================
// CONSTANTES E FUNÇÕES AUXILIARES
// ============================================================

const VAGAS_POR_FASE = { 1: 30, 2: 20, 3: 10, 4: 5, 5: 5 };

// ===== CACHES PARA PERFORMANCE (Item 5) =====
const rankingHtmlCache = {};    // Guarda o HTML gerado para evitar re-renderização desnecessária
const rankingHistory = {};      // Guarda o histórico de IDs para calcular setas (subiu/desceu)

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

async function carregarMinPartidas() {
  const config = await lerDados('copaV2/configuracoes/minPartidasPorFase') || {};
  if (Object.keys(config).length === 0) {
    const def = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 };
    await setDados('copaV2/configuracoes/minPartidasPorFase', def);
    return def;
  }
  return config;
}

// ============================================================
// CÁLCULO DE RANKING (já utiliza state em memória)
// ============================================================

export function calcularRankingFase(fase) {
  const resultados = state.estadoAtual?.resultados?.[fase] || {};
  const participantes = state.estadoAtual?.participantes?.[fase] || {};
  const temp = state.estadoAtual?.resultados_temp?.[fase] || {};
  const mapa = new Map();

  for (const id in resultados) {
    const partidas = resultados[id];
    if (!partidas || partidas.length === 0) continue;
    const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
    const somaTempo = partidas.reduce((acc, p) => acc + (p.tempo || 0), 0);
    const mediaTempo = partidas.length > 0 ? somaTempo / partidas.length : Infinity;
    let melhorVelocidade = Infinity;
    for (let p of partidas) {
      if (p.acertos > 0 && p.tempo > 0) {
        const vel = p.tempo / p.acertos;
        if (vel < melhorVelocidade) melhorVelocidade = vel;
      }
    }
    if (melhorVelocidade === Infinity) melhorVelocidade = null;
    let nome = participantes[id]?.nome || 'Anônimo';
    let turma = participantes[id]?.turma || '?';
    if (!participantes[id]) {
      for (let f = fase - 1; f >= 1; f--) {
        if (state.estadoAtual?.participantes?.[f]?.[id]) {
          nome = state.estadoAtual.participantes[f][id].nome || nome;
          turma = state.estadoAtual.participantes[f][id].turma || turma;
          break;
        }
      }
    }
    mapa.set(id, {
      id,
      nome,
      turma,
      melhorPontuacao: melhor.pontos,
      totalPartidas: partidas.length,
      somaTempo,
      mediaTempo,
      melhorVelocidade,
      partidas, // <-- já temos os dados aqui, não precisa buscar de novo!
      melhorPartidaIndex: partidas.findIndex(p => p.pontos === melhor.pontos)
    });
  }

  for (const id in temp) {
    const data = temp[id];
    if (!data) continue;
    const existente = mapa.get(id);
    if (existente) {
      if (!existente.partidas || existente.partidas.length === 0) {
        existente.melhorPontuacao = data.pontos;
        existente.totalPartidas = 0;
        existente.somaTempo = data.tempo || 0;
        existente.mediaTempo = data.acertos > 0 ? data.tempo / data.acertos : Infinity;
        existente.melhorVelocidade = data.acertos > 0 ? data.tempo / data.acertos : null;
        existente.melhorPartidaIndex = -1;
      }
    } else {
      const nome = data.nome || 'Anônimo';
      const turma = data.turma || '?';
      mapa.set(id, {
        id,
        nome,
        turma,
        melhorPontuacao: data.pontos,
        totalPartidas: 0,
        somaTempo: data.tempo || 0,
        mediaTempo: data.acertos > 0 ? data.tempo / data.acertos : Infinity,
        melhorVelocidade: data.acertos > 0 ? data.tempo / data.acertos : null,
        partidas: [],
        melhorPartidaIndex: -1
      });
    }
  }

  let lista = Array.from(mapa.values());
  lista.sort((a, b) => {
    if (a.melhorPontuacao !== b.melhorPontuacao) return b.melhorPontuacao - a.melhorPontuacao;
    if (a.totalPartidas !== b.totalPartidas) return b.totalPartidas - a.totalPartidas;
    if (a.mediaTempo !== b.mediaTempo) return a.mediaTempo - b.mediaTempo;
    return a.nome.localeCompare(b.nome);
  });
  return lista;
}

// ============================================================
// RENDERIZAR RANKING (OTIMIZADO - Item 5)
// ============================================================

export async function renderizarRanking(fase, containerId, tipo = 'individual', exibirClassificacao = false) {
  if (!state.estadoAtual) return;
  const container = document.getElementById(containerId);
  if (!container) return;

  if (tipo === 'turmas') {
    await renderRankingTurmas(containerId);
    return;
  }

  // ===== LEITURA DIRETA DA MEMÓRIA (sem await lerDados) =====
  const ranking = calcularRankingFase(fase);
  const snapTemp = state.estadoAtual?.resultados_temp?.[fase] || {};
  const snapFinal = state.estadoAtual?.resultados?.[fase] || {};

  const statusMap = new Map();
  for (const [id, data] of Object.entries(snapTemp)) {
    if (data) {
      statusMap.set(id, {
        status: 'em_jogo',
        progresso: data.perguntas || 0,
        nome: data.nome || "Anônimo",
        turma: data.turma || "?"
      });
    }
  }
  for (const id in snapFinal) {
    const partidas = snapFinal[id];
    if (partidas && partidas.length) {
      const existente = statusMap.get(id);
      if (!existente) {
        statusMap.set(id, {
          status: 'finalizado',
          progresso: 20,
          nome: "Anônimo",
          turma: "?"
        });
      } else if (existente.status === 'em_jogo' && existente.progresso >= 20) {
        existente.status = 'finalizado';
      }
    }
  }

  const recordeGeral = state.recordeGeral;
  let jogadorRecordeId = recordeGeral?.jogadorId || null;

  let jogadorBonusId = null;
  try {
    const snapBonus = await lerDados(`copaV2/configuracoes/bonusVelocidade/vencedores/${fase}`);
    if (snapBonus && snapBonus.id) jogadorBonusId = snapBonus.id;
  } catch (e) {}

  const minConfig = await carregarMinPartidas();
  const minPartidas = minConfig[fase] || 1;

  let listaComInfo = ranking.map(j => {
    const statusInfo = statusMap.get(j.id) || { status: 'aguardando', progresso: 0 };
    let progresso = statusInfo.progresso;
    if (statusInfo.status === 'aguardando') progresso = 0;
    return {
      ...j,
      progresso,
      status: statusInfo.status,
      isTemp: !!snapTemp[j.id],
      pontuacaoAtual: snapTemp[j.id]?.pontos || j.melhorPontuacao,
      ultimaPosicao: null // será calculado pelo histórico
    };
  });

  // ===== HISTÓRICO PARA SETAS (subiu/desceu) =====
  const containerKey = containerId;
  const previousIds = rankingHistory[containerKey] || [];
  const currentIds = listaComInfo.map(j => j.id);
  rankingHistory[containerKey] = currentIds;

  // Projeção de posição (Ritmo)
  let posProjetadaMap = new Map();
  if (state.estadoAtual.status !== 'finalizado') {
    let projecaoValida = false;
    for (let item of listaComInfo) {
      const pontuacaoBase = item.pontuacaoAtual || item.melhorPontuacao;
      const perguntasResp = item.progresso || 0;
      if (perguntasResp > 0 && pontuacaoBase > 0) {
        const ritmo = pontuacaoBase / perguntasResp;
        const proj = ritmo * 20;
        item.projecao = proj;
        if (proj > 0) projecaoValida = true;
      } else {
        item.projecao = 0;
      }
    }
    if (projecaoValida) {
      let itensComProj = listaComInfo.filter(item => item.projecao > 0);
      itensComProj.sort((a, b) => b.projecao - a.projecao);
      itensComProj.forEach((item, idx) => {
        posProjetadaMap.set(item.id, idx + 1);
      });
    }
  }

  const vagas = VAGAS_POR_FASE[fase] || 30;
  const maxMelhor = listaComInfo.length > 0 ? listaComInfo[0].melhorPontuacao : 0;

  // Medalhas
  let medalhasMap = new Map();
  for (let item of listaComInfo) {
    const medalhas = await lerDados(`copaV2/medalhas/${item.id}`) || [];
    if (medalhas.length > 0) {
      medalhasMap.set(item.id, medalhas.map(m => m.icone).join(' '));
    }
  }

  // ===== MONTAGEM DO HTML =====
  let html = `<table class="ranking-table"><thead><tr>
    <th>Pos</th>
    <th>Nome</th>
    <th>Melhor Pontuação</th>`;
  if (exibirClassificacao) html += '<th>Classificação</th>';
  html += '<th>Ritmo</th><th>Pontuação Atual</th><th>Delta Líder</th><th>Veloc. Recorde</th><th>Progresso</th><th>Partidas</th>';
  if (containerId === 'ranking-parcial') {
    html += '<th>Tempo Total</th><th>% Tempo</th>';
  }
  html += '<th>Turma</th>';
  if (state.rankingPontosAtivo && state.estadoAtual.status === 'em_andamento' && fase === state.estadoAtual.fase) {
    html += '<th>Projeção</th>';
  }
  html += '</tr></thead><tbody>';

  for (let idx = 0; idx < listaComInfo.length; idx++) {
    const j = listaComInfo[idx];
    const posAtual = idx + 1;
    const posAnterior = previousIds.indexOf(j.id) + 1;
    let classePos = '';
    if (posAnterior > 0) {
      if (posAtual < posAnterior) classePos = 'posicao-subiu';
      else if (posAtual > posAnterior) classePos = 'posicao-desceu';
    }

    const deltaLider = maxMelhor - j.melhorPontuacao;
    const deltaText = deltaLider === 0 ? "🏆 Líder" : `${deltaLider}`;
    let recordeStr = "-";
    if (j.melhorVelocidade !== null && j.melhorVelocidade > 0) recordeStr = j.melhorVelocidade.toFixed(2) + " s";
    let progressoHtml = "";
    if (j.status === 'em_jogo') progressoHtml = `${j.progresso}/20`;
    else if (j.status === 'finalizado') progressoHtml = `✅ Finalizado`;
    else progressoHtml = `—`;

    let futPosHtml = "—";
    if (j.status !== 'finalizado' && j.progresso < 20) {
      const posProjetada = posProjetadaMap.get(j.id);
      const projecao = j.projecao || 0;
      const recordePessoal = j.melhorPontuacao || 0;
      const recordeLider = maxMelhor || 0;
      if (projecao > 0 && j.progresso >= 4) {
        let icone = "", classe = "";
        if (posAtual === 1) {
          if (projecao > recordePessoal) { icone = "🔴"; classe = "fut-vermelho"; }
          else { icone = "🟡"; classe = "fut-amarelo"; }
        } else {
          if (projecao > recordeLider) { icone = "🔴"; classe = "fut-vermelho"; }
          else if (projecao > recordePessoal) { icone = "🟠"; classe = "fut-laranja"; }
          else { icone = "🟡"; classe = "fut-amarelo"; }
        }
        const posExibida = posProjetada !== undefined ? posProjetada : "—";
        futPosHtml = `<span class="${classe}">${posExibida}° ${icone}</span>`;
      }
    }

    let colunaClassificacao = "";
    if (exibirClassificacao) {
      const classificado = (posAtual <= vagas) && (j.totalPartidas >= minPartidas);
      if (fase === 5) {
        colunaClassificacao = classificado ? `<td class="classificado-sim">🏆 Finalista</td>` : `<td class="classificado-nao">Eliminado</td>`;
      } else {
        colunaClassificacao = classificado ? `<td class="classificado-sim">Top${vagas}</td>` : `<td class="classificado-nao">Eliminado</td>`;
      }
    }

    let nomeCompleto = escapeHtml(j.nome);
    if (jogadorRecordeId === j.id) {
      nomeCompleto += ' <span class="foguete-vermelho">🚀</span>';
    }
    if (jogadorBonusId === j.id && state.bonusVelocidadeConfig.ativo) {
      nomeCompleto += ' <span class="raio-amarelo">⚡</span>';
    }
    const medalhasStr = medalhasMap.get(j.id) || '';
    if (medalhasStr) {
      nomeCompleto += ` <span class="medalhas-ranking" title="Conquistas">${medalhasStr}</span>`;
    }

    let melhorDisplay = j.melhorPontuacao;
    if (containerId === 'ranking-parcial' && j.melhorPartidaIndex !== null && j.melhorPartidaIndex !== -1) {
      melhorDisplay += ` (P${j.melhorPartidaIndex + 1})`;
    }

    let tempoTotalStr = "–";
    let percentualTempo = "–";
    if (containerId === 'ranking-parcial') {
      const tempoFaseSegundos = (state.estadoAtual.tempoFase || 10) * 60;
      if (j.somaTempo > 0) tempoTotalStr = (j.somaTempo / 60).toFixed(1) + 'min';
      else if (j.totalPartidas > 0) tempoTotalStr = "0.0min";
      if (j.somaTempo > 0 && tempoFaseSegundos > 0) {
        const pct = (j.somaTempo / tempoFaseSegundos) * 100;
        percentualTempo = pct.toFixed(1) + '%';
      } else if (j.totalPartidas > 0) {
        percentualTempo = '0.0%';
      }
    }

    let projecaoHtml = "";
    if (state.rankingPontosAtivo && state.estadoAtual.status === 'em_andamento' && fase === state.estadoAtual.fase) {
      const tabela = getTabelaPontosPorFase(fase);
      const pts = tabela[posAtual] || 0;
      projecaoHtml = pts > 0 ? `${pts} pts` : "—";
    }

    html += `<tr>
      <td class="${classePos}">${posAtual}º</td>
      <td>${nomeCompleto}</td>
      <td>${melhorDisplay}</td>
      ${exibirClassificacao ? colunaClassificacao : ''}
      <td>${futPosHtml}</td>
      <td>${j.pontuacaoAtual || "–"}</td>
      <td>${deltaText}</td>
      <td>${recordeStr}</td>
      <td>${progressoHtml}</td>
      <td>${j.totalPartidas}</td>`;
    if (containerId === 'ranking-parcial') {
      html += `<td>${tempoTotalStr}</td><td>${percentualTempo}</td>`;
    }
    html += `<td>${escapeHtml(j.turma)}</td>`;
    if (projecaoHtml) html += `<td>${projecaoHtml}</td>`;
    html += `</tr>`;
  }
  html += '</tbody></table>';

  // ===== CACHE DE HTML PARA EVITAR RE-RENDER DESNECESSÁRIO =====
  const lastHTML = rankingHtmlCache[containerKey];
  if (lastHTML === html) {
    // Se o HTML é exatamente o mesmo, não mexe no DOM
    return;
  }
  rankingHtmlCache[containerKey] = html;
  container.innerHTML = html;
}

// ============================================================
// RANKING DE TURMAS
// ============================================================

export async function renderRankingTurmas(containerId) {
  if (!state.estadoAtual) return;
  const container = document.getElementById(containerId);
  if (!container) return;

  let turmasMap = new Map();
  for (let fase = 1; fase <= 5; fase++) {
    const resultados = state.estadoAtual?.resultados?.[fase] || {};
    const participantes = state.estadoAtual?.participantes?.[fase] || {};
    for (let id in resultados) {
      const partidas = resultados[id];
      if (!partidas || partidas.length === 0) continue;
      const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
      let turma = participantes[id]?.turma;
      if (!turma && fase > 1 && state.estadoAtual?.participantes?.[fase-1]?.[id]) {
        turma = state.estadoAtual.participantes[fase-1][id].turma;
      }
      if (!turma) turma = "?";
      let nome = participantes[id]?.nome;
      if (!nome && fase > 1 && state.estadoAtual?.participantes?.[fase-1]?.[id]) {
        nome = state.estadoAtual.participantes[fase-1][id].nome;
      }
      if (!nome) nome = "Anônimo";
      if (!turmasMap.has(turma)) {
        turmasMap.set(turma, {
          alunos: new Map(),
          totalAlunos: 0,
          somaPontos: 0,
          melhorAlunoNome: "",
          melhorAlunoPontos: 0,
          totalPartidas: 0
        });
      }
      let turmaData = turmasMap.get(turma);
      if (!turmaData.alunos.has(id) || melhor.pontos > turmaData.alunos.get(id).pontos) {
        turmaData.alunos.set(id, { pontos: melhor.pontos, nome: nome });
      }
      turmaData.totalPartidas += partidas.length;
    }
  }
  for (let [turma, data] of turmasMap.entries()) {
    let soma = 0, melhorPontos = 0, melhorNome = "";
    for (let [id, info] of data.alunos.entries()) {
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
  let ranking = [];
  for (let [turma, data] of turmasMap.entries()) {
    let media = data.totalAlunos > 0 ? (data.somaPontos / data.totalAlunos) : 0;
    ranking.push({
      turma: turma,
      media: media,
      totalAlunos: data.totalAlunos,
      melhorNome: data.melhorAlunoNome,
      melhorPontos: data.melhorAlunoPontos,
      totalPartidas: data.totalPartidas
    });
  }
  ranking.sort((a, b) => b.media - a.media);
  if (ranking.length === 0) {
    container.innerHTML = '<p>📭 Nenhum dado registrado ainda.</p>';
    return;
  }
  let html = `<table class="ranking-table"><thead><tr>
    <th>Pos</th><th>Turma</th><th>Média da Turma</th><th>Participantes</th><th>Total de Partidas</th><th>Maior Pontuação (Aluno)</th>
  </tr></thead><tbody>`;
  ranking.forEach((r, idx) => {
    html += `<tr>
      <td>${idx+1}º</td>
      <td>${escapeHtml(r.turma)}</td>
      <td>${r.media.toFixed(1)} pts</td>
      <td>${r.totalAlunos}</td>
      <td>${r.totalPartidas}</td>
      <td>${escapeHtml(r.melhorNome)} (${r.melhorPontos} pts)</td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ============================================================
// RANKING DE PONTOS
// ============================================================

export async function renderizarRankingPontos(containerId = 'ranking-pontos-container') {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!state.rankingPontosAtivo) {
    container.innerHTML = '<p style="color: #94a3b8;">🏆 Ranking de pontos desativado. Ative na aba "🏆 Pontos Copa".</p>';
    return;
  }
  try {
    const faseAtual = state.estadoAtual?.fase || 1;
    const statusFase = state.estadoAtual?.status || 'aguardando';

    const snapBonus = await lerDados('copaV2/configuracoes/bonusVelocidade/porFase') || {};
    const recorde = state.recordeGeral;

    const jogadores = new Map();

    for (let f = 1; f <= 5; f++) {
      let pontosPorJogador = {};
      if (f < faseAtual || (f === faseAtual && (statusFase === 'finalizado' || statusFase === 'aguardando'))) {
        const historico = await lerDados(`copaV2/pontuacaoHistorico/${f}`) || {};
        for (const [id, pts] of Object.entries(historico)) {
          pontosPorJogador[id] = pts;
        }
        if (snapBonus[f]) {
          for (const [id, bonus] of Object.entries(snapBonus[f])) {
            if (pontosPorJogador[id] !== undefined) {
              pontosPorJogador[id] += bonus;
            }
          }
        }
      } else if (f === faseAtual && statusFase === 'em_andamento') {
        const ranking = calcularRankingFase(faseAtual);
        ranking.forEach((jogador, idx) => {
          const pos = idx + 1;
          const pts = getPontosPorPosicao(pos, f);
          if (pts > 0) {
            pontosPorJogador[jogador.id] = pts;
          }
        });
      } else {
        continue;
      }
      for (const [id, pts] of Object.entries(pontosPorJogador)) {
        if (!jogadores.has(id)) {
          jogadores.set(id, { id, fases: {}, total: 0, bonus: {}, recordeFase: {} });
        }
        const jog = jogadores.get(id);
        jog.fases[f] = pts;
        jog.total += pts;
        if (snapBonus[f] && snapBonus[f][id]) {
          jog.bonus[f] = snapBonus[f][id];
        }
        if (recorde && recorde.jogadorId === id && recorde.fase === f) {
          jog.recordeFase[f] = true;
        }
      }
    }

    for (const [id, jog] of jogadores) {
      for (let f = 1; f <= 5; f++) {
        if (!jog.fases[f]) jog.fases[f] = 0;
        if (!jog.bonus[f]) jog.bonus[f] = 0;
        if (!jog.recordeFase[f]) jog.recordeFase[f] = false;
      }
    }

    const participantes = state.estadoAtual?.participantes || {};
    for (const [id, jog] of jogadores) {
      let nome = 'Anônimo', turma = '?';
      for (let f = 1; f <= 5; f++) {
        if (participantes[f]?.[id]) {
          nome = participantes[f][id].nome || nome;
          turma = participantes[f][id].turma || turma;
          break;
        }
      }
      jog.nome = nome;
      jog.turma = turma;
    }

    const pos5Map = await lerDados('copaV2/pontuacaoPosicao/5') || {};
    const lista = Array.from(jogadores.values());
    for (const item of lista) {
      item.pos5 = pos5Map[item.id] || 999;
    }
    lista.sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      return a.pos5 - b.pos5;
    });

    if (lista.length === 0) {
      container.innerHTML = '<p>📭 Nenhum ponto registrado ainda.</p>';
      return;
    }

    let html = `<table class="ranking-table"><thead><tr>
      <th>Pos</th>
      <th>Nome</th>
      <th>Pontuação Geral</th>`;
    for (let f = 5; f >= 1; f--) {
      html += `<th>Fase ${f}</th>`;
    }
    html += `</tr></thead><tbody>`;

    lista.forEach((item, idx) => {
      const pos = idx + 1;
      const f1 = item.fases[1] || 0;
      const f2 = item.fases[2] || 0;
      const f3 = item.fases[3] || 0;
      const f4 = item.fases[4] || 0;
      const f5 = item.fases[5] || 0;
      const bonus1 = item.bonus[1] || 0;
      const bonus2 = item.bonus[2] || 0;
      const bonus3 = item.bonus[3] || 0;
      const bonus4 = item.bonus[4] || 0;
      const bonus5 = item.bonus[5] || 0;
      const rec1 = item.recordeFase[1] || false;
      const rec2 = item.recordeFase[2] || false;
      const rec3 = item.recordeFase[3] || false;
      const rec4 = item.recordeFase[4] || false;
      const rec5 = item.recordeFase[5] || false;

      const faseCell = (pts, bonus, recorde) => {
        let cell = pts;
        if (bonus > 0) cell += ` <span class="raio-amarelo">⚡</span>`;
        if (recorde) cell += ` <span class="foguete-vermelho">🚀</span>`;
        return cell;
      };

      html += `<tr>
        <td>${pos}º</td>
        <td>${escapeHtml(item.nome)}</td>
        <td><strong>${item.total}</strong></td>
        <td>${faseCell(f5, bonus5, rec5)}</td>
        <td>${faseCell(f4, bonus4, rec4)}</td>
        <td>${faseCell(f3, bonus3, rec3)}</td>
        <td>${faseCell(f2, bonus2, rec2)}</td>
        <td>${faseCell(f1, bonus1, rec1)}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<p>❌ Erro ao carregar ranking de pontos.</p>';
    console.error(e);
  }
}

// ============================================================
// RANKING GERAL
// ============================================================

export async function renderRankingGeral() {
  if (!state.estadoAtual) return;
  const container = document.getElementById('ranking-geral-container');
  if (!container) return;

  const todasFases = state.estadoAtual.resultados || {};
  const participantesPorFase = state.estadoAtual.participantes || {};
  const classificadosPorFase = state.estadoAtual.classificados || {};
  let jogadores = new Map();

  const tempoFaseSegundos = (state.estadoAtual.tempoFase || 10) * 60;

  for (let fase = 1; fase <= 5; fase++) {
    const resultadosFase = todasFases[fase] || {};
    const participantesFase = participantesPorFase[fase] || {};
    for (let id in resultadosFase) {
      const partidas = resultadosFase[id];
      if (!partidas || partidas.length === 0) continue;
      const melhor = [...partidas].sort((a, b) => b.pontos - a.pontos)[0];
      const melhorIndex = partidas.findIndex(p => p.pontos === melhor.pontos);
      let nome = participantesFase[id]?.nome;
      if (!nome && fase > 1 && participantesPorFase[fase-1]?.[id]) nome = participantesPorFase[fase-1][id].nome;
      if (!nome) nome = "Anônimo";
      let turma = participantesFase[id]?.turma;
      if (!turma && fase > 1 && participantesPorFase[fase-1]?.[id]) turma = participantesPorFase[fase-1][id].turma;
      if (!turma) turma = "?";

      if (!jogadores.has(id)) {
        jogadores.set(id, {
          id, nome, turma,
          melhorPontuacao: melhor.pontos,
          melhorAcertos: melhor.acertos,
          melhorTempo: melhor.tempo,
          ultimaFase: fase,
          faseEliminacao: null,
          totalPartidas: partidas.length,
          melhorVelocidade: null,
          tempoTotal: 0,
          mediaTempoGeral: null,
          fasesJogadas: new Set(),
          melhorGlobalFase: fase,
          melhorGlobalPartidaIndex: melhorIndex + 1
        });
      } else {
        const existente = jogadores.get(id);
        if (fase > existente.ultimaFase) {
          existente.ultimaFase = fase;
          existente.melhorPontuacao = melhor.pontos;
          existente.melhorAcertos = melhor.acertos;
          existente.melhorTempo = melhor.tempo;
          existente.melhorGlobalFase = fase;
          existente.melhorGlobalPartidaIndex = melhorIndex + 1;
        }
        if (melhor.pontos > existente.melhorPontuacao) {
          existente.melhorPontuacao = melhor.pontos;
          existente.melhorGlobalFase = fase;
          existente.melhorGlobalPartidaIndex = melhorIndex + 1;
        }
        existente.totalPartidas += partidas.length;
      }
      const jogador = jogadores.get(id);
      jogador.fasesJogadas.add(fase);
      let somaTempoFase = 0;
      for (let partida of partidas) {
        somaTempoFase += partida.tempo || 0;
        if (partida.acertos > 0) {
          const velocidade = partida.tempo / partida.acertos;
          if (jogador.melhorVelocidade === null || velocidade < jogador.melhorVelocidade) {
            jogador.melhorVelocidade = velocidade;
          }
        }
      }
      jogador.tempoTotal += somaTempoFase;
    }
  }

  for (let [id, info] of jogadores.entries()) {
    if (info.totalPartidas > 0 && info.tempoTotal > 0) {
      info.mediaTempoGeral = info.tempoTotal / info.totalPartidas;
    }
    const numFases = info.fasesJogadas.size;
    if (numFases > 0 && info.tempoTotal > 0 && tempoFaseSegundos > 0) {
      info.percentualTempoGeral = (info.tempoTotal / (numFases * tempoFaseSegundos)) * 100;
    } else {
      info.percentualTempoGeral = null;
    }
  }

  for (let [id, info] of jogadores.entries()) {
    const classificadosUltima = classificadosPorFase[info.ultimaFase] || [];
    if (!classificadosUltima.includes(id)) info.faseEliminacao = info.ultimaFase;
    else info.faseEliminacao = null;
  }

  let rankingArray = Array.from(jogadores.values());
  rankingArray.sort((a, b) => {
    if (a.ultimaFase !== b.ultimaFase) return b.ultimaFase - a.ultimaFase;
    return b.melhorPontuacao - a.melhorPontuacao || b.melhorAcertos - a.melhorAcertos || a.melhorTempo - b.melhorTempo;
  });

  if (rankingArray.length === 0) {
    container.innerHTML = '<p>Nenhum dado ainda.</p>';
    return;
  }

  let html = `<table class="ranking-table"><thead><tr>
    <th>Pos</th>
    <th>Nome</th>
    <th>Melhor Pontuação</th>
    <th>Melhor Velocidade</th>
    <th>Fase Máxima</th>
    <th>Status</th>
    <th>Turma</th>
    <th>Total Partidas</th>
    <th>Tempo Total</th>
    <th>% Tempo</th>
    <th>Méd. Temp. Part.</th>
  </tr></thead><tbody>`;

  rankingArray.forEach((r, i) => {
    let status = `🎯 Fase ${r.ultimaFase}`;
    if (r.faseEliminacao) status += ` (Eliminado na Fase ${r.faseEliminacao})`;
    else if (r.ultimaFase === 5) status = "🏆 Finalista";
    else status += ` (Classificado para Fase ${r.ultimaFase+1})`;

    const vel = r.melhorVelocidade !== null ? r.melhorVelocidade.toFixed(2) + " s" : "-";
    let tempoTotalStr = "–";
    if (r.tempoTotal > 0) tempoTotalStr = (r.tempoTotal / 60).toFixed(1) + 'min';
    else if (r.totalPartidas > 0) tempoTotalStr = "0.0min";

    let percentStr = "–";
    if (r.percentualTempoGeral !== null && r.percentualTempoGeral > 0) {
      percentStr = r.percentualTempoGeral.toFixed(1) + '%';
    } else if (r.totalPartidas > 0) {
      percentStr = '0.0%';
    }

    let mediaStr = "–";
    if (r.mediaTempoGeral !== null && r.mediaTempoGeral > 0) mediaStr = (r.mediaTempoGeral / 60).toFixed(1) + 'min';
    else if (r.totalPartidas > 0) mediaStr = "0.0min";

    let melhorDisplay = r.melhorPontuacao;
    if (r.melhorGlobalFase && r.melhorGlobalPartidaIndex) {
      melhorDisplay += ` (F${r.melhorGlobalFase}-P${r.melhorGlobalPartidaIndex})`;
    }

    html += `<tr>
      <td>${i+1}º</td>
      <td>${escapeHtml(r.nome)}</td>
      <td>${melhorDisplay}</td>
      <td>${vel}</td>
      <td>${r.ultimaFase}</td>
      <td>${status}</td>
      <td>${escapeHtml(r.turma)}</td>
      <td>${r.totalPartidas}</td>
      <td>${tempoTotalStr}</td>
      <td>${percentStr}</td>
      <td>${mediaStr}</td>
    </tr>`;
  });
  container.innerHTML = html + '</tbody></table>';
}

// ============================================================
// ATUALIZAR INFORMAÇÕES DO ALUNO
// ============================================================

export async function atualizarInfoAluno() {
  if (!state.alunoId || !state.estadoAtual) return;
  const fase = state.estadoAtual.fase;
  const resultados = await lerDados(`copaV2/resultados/${fase}`) || {};
  const snapTemp = await lerDados(`copaV2/resultados_temp/${fase}/${state.alunoId}`) || null;

  let lista = [];
  for (const [id, partidas] of Object.entries(resultados)) {
    if (partidas && partidas.length > 0) {
      const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
      lista.push({ id, pontos: melhor.pontos });
    }
  }
  lista.sort((a, b) => b.pontos - a.pontos);
  const posicao = lista.findIndex(p => p.id === state.alunoId) + 1;

  const posSpan = document.getElementById('posicao-numero');
  if (posSpan) {
    posSpan.innerText = posicao > 0 ? posicao : '--';
    if (posicao === 1) posSpan.style.color = '#ffd700';
    else if (posicao === 2) posSpan.style.color = '#c0c0c0';
    else if (posicao === 3) posSpan.style.color = '#cd7f32';
    else posSpan.style.color = '#ffffff';
  }

  let projecao = 0, perguntasRespondidas = 0;
  if (snapTemp && snapTemp.perguntas > 0 && snapTemp.pontos > 0) {
    const ritmo = snapTemp.pontos / snapTemp.perguntas;
    projecao = ritmo * 20;
    perguntasRespondidas = snapTemp.perguntas;
  } else {
    const partidasAluno = resultados[state.alunoId] || [];
    if (partidasAluno.length > 0) {
      const melhor = partidasAluno.sort((a, b) => b.pontos - a.pontos)[0];
      projecao = melhor.pontos;
      perguntasRespondidas = 20;
    }
  }

  let recordePessoal = 0;
  const partidasAluno = resultados[state.alunoId] || [];
  if (partidasAluno.length > 0) {
    const melhor = partidasAluno.sort((a, b) => b.pontos - a.pontos)[0];
    recordePessoal = melhor.pontos;
  }
  if (recordePessoal === 0 && snapTemp) recordePessoal = snapTemp.pontos || 0;

  let recordeLider = 0;
  if (lista.length > 0) {
    const liderId = lista[0].id;
    const partidasLider = resultados[liderId] || [];
    if (partidasLider.length > 0) {
      const melhor = partidasLider.sort((a, b) => b.pontos - a.pontos)[0];
      recordeLider = melhor.pontos;
    }
    if (recordeLider === 0) {
      const snapLiderTemp = await lerDados(`copaV2/resultados_temp/${fase}/${liderId}`);
      if (snapLiderTemp) recordeLider = snapLiderTemp.pontos || 0;
    }
  }

  let cor = 'cinza';
  if (perguntasRespondidas >= 4 && projecao > 0) {
    if (posicao === 1) {
      if (projecao > recordePessoal) cor = 'vermelha';
      else cor = 'amarela';
    } else {
      if (projecao > recordeLider) cor = 'vermelha';
      else if (projecao > recordePessoal) cor = 'laranja';
      else cor = 'amarela';
    }
  } else {
    cor = 'cinza';
  }
  const container = document.getElementById('pergunta-container');
  if (container) {
    container.classList.remove('brilho-amarela', 'brilho-laranja', 'brilho-vermelha', 'brilho-branca', 'brilho-cinza');
    container.classList.add('brilho-' + cor);
  }

  let velocidadeMedia = 0;
  if (snapTemp && snapTemp.acertos > 0 && snapTemp.tempo > 0) {
    velocidadeMedia = snapTemp.tempo / snapTemp.acertos;
  } else {
    const partidasAluno = resultados[state.alunoId] || [];
    if (partidasAluno.length > 0) {
      const melhor = partidasAluno.sort((a, b) => b.pontos - a.pontos)[0];
      if (melhor.acertos > 0 && melhor.tempo > 0) {
        velocidadeMedia = melhor.tempo / melhor.acertos;
      }
    }
  }
  const velSpan = document.getElementById('velocidade-media');
  if (velSpan) {
    if (velocidadeMedia > 0) {
      velSpan.innerText = velocidadeMedia.toFixed(2) + 's';
      if (velocidadeMedia < 1.5) velSpan.style.color = '#2ecc71';
      else if (velocidadeMedia < 2.5) velSpan.style.color = '#f39c12';
      else velSpan.style.color = '#e74c3c';
    } else {
      velSpan.innerText = '--';
      velSpan.style.color = '#ffffff';
    }
  }

  atualizarExibicaoMedalhas();

  const { desenharGraficoEvolucao } = await import('./game.js');
  desenharGraficoEvolucao();
}

// ============================================================
// FUNÇÕES DE CONTROLE DE FASE
// ============================================================

export function getTabelaPontosPorFase(fase) {
  if (fase === 5) return state.tabelaPontosFase5;
  return state.tabelaPontosPadrao;
}

export function getPontosPorPosicao(posicao, fase) {
  const tabela = getTabelaPontosPorFase(fase);
  return tabela[posicao] || 0;
}

export async function avancarFase() {
  if (state.timerFase) { clearInterval(state.timerFase); state.timerFase = null; }
  const faseAtual = state.estadoAtual.fase;
  if (faseAtual > 5) { exibirToast('Competição já finalizada!'); return; }

  const minConfig = await carregarMinPartidas();
  const minPartidas = minConfig[faseAtual] || 1;

  await processarPontuacaoFase(faseAtual);

  const res = state.estadoAtual.resultados?.[faseAtual] || {};
  let lista = [];
  for (let id in res) {
    const partidas = res[id];
    if (partidas?.length) {
      if (partidas.length < minPartidas) continue;
      const melhor = [...partidas].sort((a, b) => b.pontos - a.pontos)[0];
      lista.push({ id, pontos: melhor.pontos, acertos: melhor.acertos, tempo: melhor.tempo });
    }
  }
  lista.sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.tempo - b.tempo);
  const vagas = VAGAS_POR_FASE[faseAtual];
  const classificadosIds = lista.slice(0, vagas).map(l => l.id);
  await setDados(`copaV2/classificados/${faseAtual}`, classificadosIds);
  tocarSom('classificado');

  const participantesAtual = state.estadoAtual.participantes?.[faseAtual] || {};
  const participantesProxima = {};
  for (let id of classificadosIds) {
    if (participantesAtual[id]) participantesProxima[id] = participantesAtual[id];
    else {
      for (let f = faseAtual - 1; f >= 1; f--) {
        if (state.estadoAtual.participantes?.[f]?.[id]) {
          participantesProxima[id] = state.estadoAtual.participantes[f][id];
          break;
        }
      }
    }
  }
  if (Object.keys(participantesProxima).length > 0) await setDados(`copaV2/participantes/${faseAtual+1}`, participantesProxima);
  await removerDados(`copaV2/resultados_temp/${faseAtual}`);
  state.tempoEsgotadoProcessado = false;

  if (faseAtual === 5) {
    exibirToast('🏆 COMPETIÇÃO FINALIZADA!');
    await setDados('copaV2', { ...state.estadoAtual, status: 'finalizado', fim: 0, tempoRestantePausa: null });
    mostrarFinalizacao();
    forcarAlunosParaMenu();
    return;
  }
  await setDados('copaV2', { ...state.estadoAtual, fase: faseAtual + 1, status: 'aguardando', fim: 0, tempoRestantePausa: null });
  exibirToast(`✅ Fase ${faseAtual} finalizada! ${vagas} classificados para a fase ${faseAtual+1}.`);
  forcarAlunosParaMenu();
}

export async function resetarFase() {
  const faseAtual = state.estadoAtual.fase;
  if (!confirm(`⚠️ Resetar a Fase ${faseAtual}? Todos os resultados, cadastros e classificações desta fase serão apagados.`)) return;
  if (state.timerFase) { clearInterval(state.timerFase); state.timerFase = null; }
  await removerDados(`copaV2/resultados/${faseAtual}`);
  await removerDados(`copaV2/participantes/${faseAtual}`);
  await removerDados(`copaV2/resultados_temp/${faseAtual}`);
  await removerDados(`copaV2/classificados/${faseAtual}`);
  await removerDados(`copaV2/configuracoes/bonusVelocidade/porFase/${faseAtual}`);
  await setDados('copaV2', { ...state.estadoAtual, status: 'aguardando', fim: 0, tempoRestantePausa: null });
  state.tempoEsgotadoProcessado = false;
  exibirToast(`✅ Fase ${faseAtual} resetada!`);
}

// ============================================================
// FUNÇÕES AUXILIARES (lista de alunos, turmas, etc.)
// ============================================================

export async function renderListaAlunosGerenciar() {
  if (!state.estadoAtual) return;
  const faseAtual = state.estadoAtual.fase;
  const participantes = state.estadoAtual.participantes?.[faseAtual] || {};
  const container = document.getElementById('lista-alunos-gerenciavel');
  if (!container) return;
  const ids = Object.keys(participantes);
  if (ids.length === 0) { container.innerHTML = '<p>📭 Nenhum aluno cadastrado.</p>'; return; }
  let html = '';
  for (let id of ids) {
    const aluno = participantes[id];
    html += `<div class="aluno-item"><div class="aluno-info"><strong>${escapeHtml(aluno.nome)}</strong> (${escapeHtml(aluno.turma)})<br><small>ID: ${id.substring(0,8)}...</small></div>
      <div class="aluno-actions"><button class="btn-editar-aluno btn-warning" data-id="${id}" data-nome="${aluno.nome}" data-turma="${aluno.turma}">✏️ Editar</button>
      <button class="btn-excluir-aluno btn-danger" data-id="${id}">🗑️ Excluir</button></div></div>`;
  }
  container.innerHTML = html;
  document.querySelectorAll('.btn-editar-aluno').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      const novoNome = prompt("Novo nome:", btn.getAttribute('data-nome'));
      if (novoNome) {
        const novaTurma = prompt("Nova turma:", btn.getAttribute('data-turma'));
        if (novaTurma) await atualizarDados(`copaV2/participantes/${faseAtual}/${id}`, { nome: novoNome, turma: novaTurma });
        renderListaAlunosGerenciar();
      }
    });
  });
  document.querySelectorAll('.btn-excluir-aluno').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      if (confirm("Excluir aluno?")) {
        await removerDados(`copaV2/participantes/${faseAtual}/${id}`);
        await removerDados(`copaV2/resultados/${faseAtual}/${id}`);
        await removerDados(`copaV2/resultados_temp/${faseAtual}/${id}`);
        renderListaAlunosGerenciar();
      }
    });
  });
}

export async function renderListaTurmas() {
  const container = document.getElementById('lista-turmas-gerenciavel');
  if (!container) return;
  const turmas = await lerDados('copaV2/turmas') || [];
  if (turmas.length === 0) {
    container.innerHTML = '<p>📭 Nenhuma turma cadastrada. Adicione usando o botão acima.</p>';
    return;
  }
  let html = '<ul style="list-style: none; padding: 0;">';
  turmas.forEach(turma => {
    html += `<li style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #2c3e50;">
      <span>🏷️ ${escapeHtml(turma)}</span>
      <div>
        <button class="btn-editar-turma btn-warning" data-turma="${turma}" style="padding: 4px 12px; margin: 0 4px;">✏️ Editar</button>
        <button class="btn-excluir-turma btn-danger" data-turma="${turma}" style="padding: 4px 12px; margin: 0 4px;">🗑️ Excluir</button>
      </div>
    </li>`;
  });
  html += '</ul>';
  container.innerHTML = html;
  document.querySelectorAll('.btn-editar-turma').forEach(btn => {
    btn.addEventListener('click', async () => {
      const turmaAntiga = btn.getAttribute('data-turma');
      const novaTurma = prompt("Digite o novo nome da turma:", turmaAntiga);
      if (novaTurma && novaTurma !== turmaAntiga) {
        let turmas = await lerDados('copaV2/turmas') || [];
        const index = turmas.indexOf(turmaAntiga);
        if (index !== -1) {
          turmas[index] = novaTurma;
          await setDados('copaV2/turmas', turmas);
          exibirToast(`Turma alterada de ${turmaAntiga} para ${novaTurma}`);
          renderListaTurmas();
        }
      }
    });
  });
  document.querySelectorAll('.btn-excluir-turma').forEach(btn => {
    btn.addEventListener('click', async () => {
      const turma = btn.getAttribute('data-turma');
      if (confirm(`Remover turma "${turma}"?`)) {
        let turmas = await lerDados('copaV2/turmas') || [];
        turmas = turmas.filter(t => t !== turma);
        await setDados('copaV2/turmas', turmas);
        exibirToast(`Turma ${turma} removida!`);
        renderListaTurmas();
      }
    });
  });
}

export function renderizarConfigMinPartidas(config) {
  const container = document.getElementById('min-partidas-container');
  if (!container) return;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const valor = config[i] !== undefined ? config[i] : 5;
    html += `
      <div style="display: flex; align-items: center; gap: 15px; background: #0f172a; padding: 8px 16px; border-radius: 8px; border: 1px solid #2d3a4f;">
        <label style="color: #f1f5f9; font-weight: 500; min-width: 70px;">Fase ${i}</label>
        <input type="number" id="min-partidas-fase-${i}" min="1" max="20" value="${valor}" 
          style="background: #1e293b; border: 1px solid #334155; color: #f1f5f9; padding: 6px 10px; border-radius: 6px; width: 70px; text-align: center;">
        <span style="color: #94a3b8; font-size: 13px;">partidas mínimas</span>
      </div>
    `;
  }
  container.innerHTML = html;
}

export function renderizarColunasVisiveis() {
  const container = document.getElementById('colunas-visiveis-container');
  if (!container) return;
  const colunasDef = {
    obrigatorias: [
      { id: 'posicao', label: 'Posição' },
      { id: 'nome', label: 'Nome' },
      { id: 'melhorPontuacao', label: 'Melhor Pontuação' },
      { id: 'classificacao', label: 'Classificação' }
    ],
    opcionais: [
      { id: 'futPos', label: 'Ritmo' },
      { id: 'pontuacaoAtual', label: 'Pontuação Atual' },
      { id: 'deltaLider', label: 'Delta Líder' },
      { id: 'velocRecorde', label: 'Veloc. Recorde' },
      { id: 'progresso', label: 'Progresso' },
      { id: 'partidas', label: 'Partidas' },
      { id: 'tempo', label: 'Tempo' },
      { id: 'mediaTempo', label: 'Méd. Temp. Part.' },
      { id: 'turma', label: 'Turma' },
      { id: 'projecaoPontos', label: 'Projeção' }
    ]
  };
  let html = '';
  colunasDef.obrigatorias.forEach(col => {
    html += `
      <div class="checkbox-item disabled">
        <input type="checkbox" checked disabled>
        <label>${col.label} *</label>
      </div>
    `;
  });
  const colunasVisiveis = state.colunasVisiveis || {};
  colunasDef.opcionais.forEach(col => {
    const checked = colunasVisiveis[col.id] !== undefined ? colunasVisiveis[col.id] : true;
    html += `
      <div class="checkbox-item">
        <input type="checkbox" id="col-${col.id}" ${checked ? 'checked' : ''}>
        <label for="col-${col.id}">${col.label}</label>
      </div>
    `;
  });
  container.innerHTML = html;
}

// ============================================================
// FUNÇÕES DE PONTUAÇÃO E BÔNUS
// ============================================================

async function processarPontuacaoFase(fase) {
  if (!state.rankingPontosAtivo) return;
  const minConfig = await carregarMinPartidas();
  const minPartidas = minConfig[fase] || 1;
  const ranking = calcularRankingFase(fase);
  let filtrados = ranking;
  if (fase === 5) {
    filtrados = ranking.filter(j => {
      const resultados = state.estadoAtual?.resultados?.[fase] || {};
      const partidas = resultados[j.id] || [];
      return partidas.length >= minPartidas;
    });
  }
  const pontosPorFaseRef = `copaV2/pontuacaoHistorico/${fase}`;
  const globalRef = 'copaV2/pontuacaoGlobal';
  const posicaoRef = `copaV2/pontuacaoPosicao/${fase}`;
  const globais = await lerDados(globalRef) || {};
  const updatesHistorico = {};
  const updatesGlobal = {};
  const updatesPosicao = {};
  filtrados.forEach((jogador, idx) => {
    const posicao = idx + 1;
    const pontos = getPontosPorPosicao(posicao, fase);
    if (pontos > 0 || posicao <= 40) {
      updatesHistorico[jogador.id] = pontos;
      globais[jogador.id] = (globais[jogador.id] || 0) + pontos;
      updatesGlobal[jogador.id] = globais[jogador.id];
      updatesPosicao[jogador.id] = posicao;
    }
  });
  await setDados(pontosPorFaseRef, updatesHistorico);
  await setDados(globalRef, updatesGlobal);
  await setDados(posicaoRef, updatesPosicao);

  await processarBonusVelocidade(fase);

  if (fase === 5) {
    const pos5 = await lerDados('copaV2/pontuacaoPosicao/5') || {};
    const globaisFinal = await lerDados(globalRef) || {};
    let ordenados = Object.keys(globaisFinal).map(id => ({ id, total: globaisFinal[id] }));
    ordenados.sort((a, b) => {
      if (a.total !== b.total) return b.total - a.total;
      const posA = pos5[a.id] || 999;
      const posB = pos5[b.id] || 999;
      return posA - posB;
    });
    await setDados('copaV2/pontuacaoRankingFinal', ordenados.map(p => p.id));
  }
  exibirToast(`✅ Pontos da Fase ${fase} processados!`);
}

async function processarBonusVelocidade(fase) {
  if (!state.bonusVelocidadeConfig.ativo) return;
  const vencedorRef = `copaV2/configuracoes/bonusVelocidade/vencedores/${fase}`;
  const snapVencedor = await lerDados(vencedorRef);
  if (snapVencedor) return;

  const resultados = state.estadoAtual?.resultados?.[fase] || {};
  if (Object.keys(resultados).length === 0) return;

  const minConfig = await carregarMinPartidas();
  const minPartidas = minConfig[fase] || 1;
  const candidatos = [];
  for (const [id, partidas] of Object.entries(resultados)) {
    if (!partidas || partidas.length === 0) continue;
    if (partidas.length < minPartidas) continue;

    let melhorVelocidade = Infinity;
    let melhorPrecisao = 0;
    let melhorPartidaIndex = -1;
    for (let i = 0; i < partidas.length; i++) {
      const p = partidas[i];
      if (p.acertos === 0 || p.tempo === 0) continue;
      const precisao = (p.acertos / 20) * 100;
      if (precisao < state.bonusVelocidadeConfig.precisaoMinima) continue;
      const vel = p.tempo / p.acertos;
      if (vel < melhorVelocidade) {
        melhorVelocidade = vel;
        melhorPrecisao = precisao;
        melhorPartidaIndex = i;
      }
    }
    if (melhorVelocidade !== Infinity) {
      let nome = 'Anônimo', turma = '?';
      for (let f = fase; f >= 1; f--) {
        if (state.estadoAtual?.participantes?.[f]?.[id]) {
          nome = state.estadoAtual.participantes[f][id].nome || nome;
          turma = state.estadoAtual.participantes[f][id].turma || turma;
          break;
        }
      }
      candidatos.push({ id, nome, turma, velocidade: melhorVelocidade, precisao: melhorPrecisao, partidaIndex: melhorPartidaIndex });
    }
  }

  if (candidatos.length === 0) return;
  candidatos.sort((a, b) => a.velocidade - b.velocidade);
  const vencedor = candidatos[0];

  const { atualizarRecordeGeral } = await import('./config.js');
  await atualizarRecordeGeral(vencedor.id, vencedor.velocidade, vencedor.precisao, fase, vencedor.partidaIndex);

  const bonusPath = `copaV2/configuracoes/bonusVelocidade/porFase/${fase}`;
  const bonusData = await lerDados(bonusPath) || {};
  bonusData[vencedor.id] = state.bonusVelocidadeConfig.pontos;
  await setDados(bonusPath, bonusData);

  await setDados(vencedorRef, {
    id: vencedor.id,
    pontos: state.bonusVelocidadeConfig.pontos,
    velocidade: vencedor.velocidade,
    nome: vencedor.nome,
    turma: vencedor.turma
  });

  const histRef = `copaV2/pontuacaoHistorico/${fase}/${vencedor.id}`;
  const ptsAtuais = await lerDados(histRef) || 0;
  await setDados(histRef, ptsAtuais + state.bonusVelocidadeConfig.pontos);

  exibirToast(`⚡ ${vencedor.nome} ganhou +${state.bonusVelocidadeConfig.pontos} pontos de bônus por velocidade!`);
}

// ============================================================
// FUNÇÕES DE FINALIZAÇÃO E UTILITÁRIOS
// ============================================================

function mostrarFinalizacao() {
  const cardProf = document.getElementById('competicao-finalizada-prof');
  if (cardProf) cardProf.classList.remove('hidden');
  const cardTorcida = document.getElementById('competicao-finalizada-torcida');
  if (cardTorcida) cardTorcida.classList.remove('hidden');
  exibirModalFinalizacaoAluno();
}

function exibirModalFinalizacaoAluno() {
  if (state.meuTipo !== 'aluno') return;
  const modalHtml = `
    <div class="modal-resultados" id="modal-finalizacao">
      <h2>🏆 COPA FINALIZADA!</h2>
      <div style="font-size: 64px; margin: 15px 0;">🎉</div>
      <p>A competição chegou ao fim.</p>
      <div class="dica">
        <p>📊 Consulte o <strong>Ranking de Pontos</strong> para ver sua classificação final.</p>
        <p style="font-size: 0.9rem; opacity: 0.7;">Se o Ranking de Pontos estiver desativado, o campeão é definido pelo ranking da Fase 5.</p>
      </div>
      <button class="fechar" id="btn-fechar-finalizacao">Voltar ao Menu</button>
    </div>
  `;
  const modalExistente = document.getElementById('modal-finalizacao');
  if (modalExistente) modalExistente.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('btn-fechar-finalizacao')?.addEventListener('click', () => {
    document.getElementById('modal-finalizacao')?.remove();
    location.reload();
  });
}

function forcarAlunosParaMenu() {
  if (state.meuTipo === 'aluno') {
    exibirModalFinalizacaoAluno();
  }
}

export async function atualizarRankingAluno() {
  if (state.meuTipo !== 'aluno') return;
  if (!state.estadoAtual) return;
  if (state.jogoAtivo) return;

  const subtabs = document.querySelectorAll('.modal-sub-tabs .sub-tab');
  let ativa = 'fase';
  subtabs.forEach(tab => {
    if (tab.classList.contains('active')) ativa = tab.dataset.subtab;
  });

  if (ativa === 'fase') {
    const faseAtual = state.estadoAtual.fase;
    await renderizarRanking(faseAtual, 'ranking-aluno-container', 'individual', true);
  } else {
    await renderizarRankingPontos('ranking-aluno-container');
  }
}
