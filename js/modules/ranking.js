// js/modules/ranking.js
import { state } from './state.js';
import { lerDados, atualizarDados, removerDados, setDados } from './db.js';
import { exibirToast, atualizarBolinhaUnica } from './ui.js';
import { tocarSom } from './sound.js';
import { carregarMinPartidas, atualizarRecordeGeral, bonusVelocidadeConfig } from './config.js';

// ============================================================
// CÁLCULO DO RANKING DE UMA FASE
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
    // Se não encontrou no participantes da fase, busca em fases anteriores
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
      somaTempo: somaTempo,
      mediaTempo: mediaTempo,
      melhorVelocidade: melhorVelocidade,
      partidas: partidas,
      // Guardar índice da melhor partida
      melhorPartidaIndex: partidas.findIndex(p => p.pontos === melhor.pontos)
    });
  }

  // Incluir dados temporários (partidas em andamento)
  for (const id in temp) {
    const data = temp[id];
    if (!data) continue;
    const existente = mapa.get(id);
    if (existente) {
      if (!existente.partidas || existente.partidas.length === 0) {
        existente.melhorPontuacao = data.pontos || 0;
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
        melhorPontuacao: data.pontos || 0,
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
// RENDERIZAR RANKING (genérico)
// ============================================================
export async function renderizarRanking(fase, containerId, tipo = 'individual', exibirClassificacao = false) {
  if (!state.estadoAtual) return;
  const container = document.getElementById(containerId);
  if (!container) return;

  if (tipo === 'turmas') {
    await renderRankingTurmas(containerId);
    return;
  }

  // Para ranking individual
  const snapFinal = await lerDados(`copaV2/resultados/${fase}`);
  const snapTemp = await lerDados(`copaV2/resultados_temp/${fase}`);
  const participantes = state.estadoAtual.participantes?.[fase] || {};

  // Mapa de status (em jogo, finalizado, etc.)
  const statusMap = new Map();
  if (snapTemp) {
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
  }
  if (snapFinal) {
    for (const [id, partidas] of Object.entries(snapFinal)) {
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
  }

  // Mapa de recorde de velocidade por jogador
  const recordeVelocMap = new Map();
  const resultadosFase = state.estadoAtual.resultados?.[fase] || {};
  for (const id in resultadosFase) {
    const partidas = resultadosFase[id];
    if (!partidas || partidas.length === 0) continue;
    let melhorPartida = null;
    let maxPontos = -1;
    for (const partida of partidas) {
      if (partida.pontos > maxPontos) {
        maxPontos = partida.pontos;
        melhorPartida = partida;
      }
    }
    if (melhorPartida && melhorPartida.acertos > 0) {
      const vel = melhorPartida.tempo / melhorPartida.acertos;
      recordeVelocMap.set(id, vel);
    }
  }

  const minConfig = await carregarMinPartidas();
  const minPartidas = minConfig[fase] || 1;

  // Montar lista de jogadores com seus dados
  let mapa = new Map();
  if (snapFinal) {
    for (const [id, partidas] of Object.entries(snapFinal)) {
      if (!partidas || partidas.length === 0) continue;
      const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
      const ultima = partidas[partidas.length - 1];
      let info = participantes[id];
      const nome = info?.nome || melhor.nome || "Anônimo";
      const turma = info?.turma || melhor.turma || "?";
      const statusInfo = statusMap.get(id) || { status: 'aguardando', progresso: 0 };
      let progresso = statusInfo.progresso;
      if (statusInfo.status === 'aguardando') progresso = 0;
      const ultimaPosicao = ultima?.posicao || null;
      let somaTempo = 0;
      for (let p of partidas) somaTempo += p.tempo || 0;
      let mediaTempo = null;
      if (partidas.length > 0 && somaTempo > 0) mediaTempo = somaTempo / partidas.length;
      const melhorIndex = partidas.findIndex(p => p.pontos === melhor.pontos);
      mapa.set(id, {
        id,
        nome,
        turma,
        melhorPontuacao: melhor.pontos,
        ultimaPontuacao: ultima.pontos,
        acertos: melhor.acertos,
        tempo: melhor.tempo,
        perguntas: 20,
        isTemp: false,
        partidas: partidas.length,
        status: statusInfo.status,
        progresso: progresso,
        ultimaPosicao: ultimaPosicao,
        recordeVelocidade: recordeVelocMap.get(id) || null,
        pontuacaoAtual: ultima.pontos,
        somaTempo: somaTempo,
        mediaTempo: mediaTempo,
        partidasData: partidas,
        melhorPartidaIndex: melhorIndex !== -1 ? melhorIndex + 1 : null
      });
    }
  }

  if (snapTemp) {
    for (const [id, data] of Object.entries(snapTemp)) {
      const existente = mapa.get(id);
      const statusInfo = statusMap.get(id) || { status: 'em_jogo', progresso: data.perguntas || 0 };
      if (!existente) {
        mapa.set(id, {
          id,
          nome: data.nome || "Anônimo",
          turma: data.turma || "?",
          melhorPontuacao: data.pontos || 0,
          ultimaPontuacao: null,
          acertos: data.acertos || 0,
          tempo: data.tempo || 0,
          perguntas: data.perguntas || 0,
          isTemp: true,
          partidas: 0,
          status: statusInfo.status,
          progresso: statusInfo.progresso,
          ultimaPosicao: null,
          recordeVelocidade: null,
          pontuacaoAtual: data.pontos || 0,
          somaTempo: data.tempo || 0,
          mediaTempo: data.acertos > 0 ? data.tempo / data.acertos : null,
          partidasData: [],
          melhorPartidaIndex: null
        });
      } else {
        existente.pontuacaoAtual = data.pontos || 0;
        existente.isTemp = true;
        if (statusInfo) {
          existente.status = statusInfo.status;
          existente.progresso = statusInfo.progresso;
        }
        if (data.tempo) existente.somaTempo += data.tempo;
        if (data.acertos > 0) {
          const tempMedia = data.tempo / data.acertos;
          if (existente.mediaTempo === null || tempMedia < existente.mediaTempo) {
            existente.mediaTempo = tempMedia;
          }
        }
      }
    }
  }

  let listaComId = Array.from(mapa.values());

  // Ordenar
  listaComId.sort((a, b) => b.melhorPontuacao - a.melhorPontuacao || b.acertos - a.acertos || a.tempo - b.tempo);

  if (listaComId.length === 0) {
    container.innerHTML = '<p>⏳ Nenhum resultado registrado ainda. Aguarde os primeiros jogadores...</p>';
    return;
  }

  // Recuperar posição anterior (para delta)
  for (let item of listaComId) {
    if (item.ultimaPosicao === null && item.partidas > 0) {
      const partidas = await lerDados(`copaV2/resultados/${fase}/${item.id}`);
      if (partidas && partidas.length > 0) {
        const ultima = partidas[partidas.length - 1];
        if (ultima.posicao !== undefined) item.ultimaPosicao = ultima.posicao;
      }
    }
  }

  const maxMelhor = listaComId[0]?.melhorPontuacao || 0;
  const vagas = { 1: 30, 2: 20, 3: 10, 4: 5, 5: 5 }[fase] || 30;

  // Buscar vencedor do bônus de velocidade
  let jogadorMaisRapidoFaseId = null;
  try {
    const snapVencedor = await lerDados(`copaV2/configuracoes/bonusVelocidade/vencedores/${fase}`);
    if (snapVencedor && snapVencedor.id) jogadorMaisRapidoFaseId = snapVencedor.id;
  } catch (e) {}

  // Se não tiver vencedor persistido, calcular em tempo real
  if (!jogadorMaisRapidoFaseId && state.bonusVelocidadeConfig?.ativo) {
    const elegiveis = listaComId.filter(item => {
      const partidasArray = item.partidasData || [];
      if (partidasArray.length === 0) return false;
      const melhorPartida = partidasArray.sort((a, b) => b.pontos - a.pontos)[0];
      if (!melhorPartida) return false;
      const precisao = (melhorPartida.acertos / 20) * 100;
      return precisao >= (state.bonusVelocidadeConfig.precisaoMinima || 80);
    });
    if (elegiveis.length > 0) {
      elegiveis.sort((a, b) => (a.melhorVelocidade || Infinity) - (b.melhorVelocidade || Infinity));
      jogadorMaisRapidoFaseId = elegiveis[0].id;
    }
  }

  // Recorde geral (foguete)
  let jogadorRecordeGeralId = null;
  if (state.recordeGeral && state.recordeGeral.jogadorId) {
    jogadorRecordeGeralId = state.recordeGeral.jogadorId;
  }

  // Construir HTML da tabela
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
  if (state.rankingPontosAtivo && state.estadoAtual?.status === 'em_andamento' && fase === state.estadoAtual?.fase) {
    html += '<th>Projeção</th>';
  }
  html += '</tr></thead><tbody>';

  const tempoFaseSegundos = (state.estadoAtual?.tempoFase || 10) * 60;

  for (let idx = 0; idx < listaComId.length; idx++) {
    const j = listaComId[idx];
    const posAtual = idx + 1;
    const posAnterior = j.ultimaPosicao || null;
    let classePos = '';
    if (posAnterior !== null && posAnterior > 0) {
      if (posAtual < posAnterior) classePos = 'posicao-subiu';
      else if (posAtual > posAnterior) classePos = 'posicao-desceu';
    }
    const deltaLider = maxMelhor - j.melhorPontuacao;
    const deltaText = deltaLider === 0 ? "🏆 Líder" : `${deltaLider}`;
    let recordeStr = "-";
    if (j.recordeVelocidade !== null && j.recordeVelocidade > 0) recordeStr = j.recordeVelocidade.toFixed(2) + " s";
    let progressoHtml = "";
    if (j.status === 'em_jogo') progressoHtml = `${j.progresso}/20`;
    else if (j.status === 'finalizado') progressoHtml = `✅ Finalizado`;
    else progressoHtml = "—";

    // Ritmo (futPos)
    let futPosHtml = "—";
    if (j.status !== 'finalizado' && j.progresso < 20) {
      const projecao = (j.pontuacaoAtual || 0) / (j.progresso || 1) * 20;
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
        futPosHtml = `<span class="${classe}">${posAtual}° ${icone}</span>`;
      }
    }

    // Projeção de pontos (se ranking de pontos ativo)
    let projecaoHtml = "";
    if (state.rankingPontosAtivo && state.estadoAtual?.status === 'em_andamento' && fase === state.estadoAtual?.fase) {
      const { getPontosPorPosicao } = await import('./config.js');
      const pts = getPontosPorPosicao(posAtual, fase);
      projecaoHtml = pts > 0 ? `${pts} pts` : "—";
    }

    // Classificação
    let colunaClassificacao = "";
    if (exibirClassificacao) {
      const classificado = (idx < vagas) && (j.partidas >= minPartidas);
      if (fase === 5) {
        colunaClassificacao = classificado ? `<td class="classificado-sim">🏆 Finalista</td>` : `<td class="classificado-nao">Eliminado</td>`;
      } else {
        colunaClassificacao = classificado ? `<td class="classificado-sim">Top${vagas}</td>` : `<td class="classificado-nao">Eliminado</td>`;
      }
    }

    // Nome com ícones
    let nomeComIcons = escapeHtml(j.nome);
    if (jogadorRecordeGeralId === j.id) {
      nomeComIcons += ' <span class="foguete-vermelho">🚀</span>';
    }
    if (jogadorMaisRapidoFaseId === j.id && state.bonusVelocidadeConfig?.ativo) {
      nomeComIcons += ' <span class="raio-amarelo">⚡</span>';
    }

    // Melhor pontuação com partida (apenas professor)
    let melhorDisplay = j.melhorPontuacao;
    if (containerId === 'ranking-parcial' && j.melhorPartidaIndex !== null) {
      melhorDisplay += ` (P${j.melhorPartidaIndex})`;
    }

    // % Tempo (apenas professor)
    let percentualTempo = "—";
    if (containerId === 'ranking-parcial') {
      if (j.somaTempo > 0 && tempoFaseSegundos > 0) {
        percentualTempo = ((j.somaTempo / tempoFaseSegundos) * 100).toFixed(1) + '%';
      } else if (j.partidas > 0) {
        percentualTempo = '0.0%';
      }
    }

    html += `<tr>
      <td class="${classePos}">${posAtual}º</td>
      <td>${nomeComIcons}</td>
      <td>${melhorDisplay}</td>
      ${colunaClassificacao}
      <td>${futPosHtml}</td>
      <td>${j.pontuacaoAtual || "–"}</td>
      <td>${deltaText}</td>
      <td>${recordeStr}</td>
      <td>${progressoHtml}</td>
      <td>${j.partidas}`;
    if (containerId === 'ranking-parcial') {
      let tempoTotalStr = "–";
      if (j.somaTempo > 0) tempoTotalStr = (j.somaTempo / 60).toFixed(1) + 'min';
      else if (j.partidas > 0) tempoTotalStr = "0.0min";
      html += `</td><td>${tempoTotalStr}</td><td>${percentualTempo}`;
    }
    html += `</td><td>${escapeHtml(j.turma)}</td>`;
    if (projecaoHtml) html += `<td>${projecaoHtml}</td>`;
    html += `</tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ============================================================
// RANKING POR TURMAS
// ============================================================
export async function renderRankingTurmas(containerId) {
  const container = document.getElementById(containerId);
  if (!container || !state.estadoAtual) return;

  let turmasMap = new Map();
  for (let fase = 1; fase <= 5; fase++) {
    const resultados = state.estadoAtual.resultados?.[fase] || {};
    const participantes = state.estadoAtual.participantes?.[fase] || {};
    for (let id in resultados) {
      const partidas = resultados[id];
      if (!partidas || partidas.length === 0) continue;
      const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
      let turma = participantes[id]?.turma;
      if (!turma && fase > 1 && state.estadoAtual.participantes?.[fase-1]?.[id]) {
        turma = state.estadoAtual.participantes[fase-1][id].turma;
      }
      if (!turma) turma = "?";
      let nome = participantes[id]?.nome;
      if (!nome && fase > 1 && state.estadoAtual.participantes?.[fase-1]?.[id]) {
        nome = state.estadoAtual.participantes[fase-1][id].nome;
      }
      if (!nome) nome = "Anônimo";

      if (!turmasMap.has(turma)) {
        turmasMap.set(turma, { alunos: new Map(), totalAlunos: 0, somaPontos: 0, melhorAlunoNome: "", melhorAlunoPontos: 0, totalPartidas: 0 });
      }
      let turmaData = turmasMap.get(turma);
      if (!turmaData.alunos.has(id) || melhor.pontos > turmaData.alunos.get(id).pontos) {
        turmaData.alunos.set(id, { pontos: melhor.pontos, nome: nome });
      }
      turmaData.totalPartidas += partidas.length;
    }
  }

  for (let [turma, data] of turmasMap) {
    let soma = 0, melhorPontos = 0, melhorNome = "";
    for (let [id, info] of data.alunos) {
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
  for (let [turma, data] of turmasMap) {
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
// RANKING DE PONTOS ACUMULADOS
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

    const snapBonus = await lerDados('copaV2/configuracoes/bonusVelocidade/porFase');
    const bonusPorFase = snapBonus || {};

    const recorde = state.recordeGeral;

    const jogadores = new Map();

    for (let f = 1; f <= 5; f++) {
      let pontosPorJogador = {};
      if (f < faseAtual || (f === faseAtual && (statusFase === 'finalizado' || statusFase === 'aguardando'))) {
        const historico = await lerDados(`copaV2/pontuacaoHistorico/${f}`) || {};
        for (const [id, pts] of Object.entries(historico)) {
          pontosPorJogador[id] = pts;
        }
        if (bonusPorFase[f]) {
          for (const [id, bonus] of Object.entries(bonusPorFase[f])) {
            if (pontosPorJogador[id] !== undefined) {
              pontosPorJogador[id] += bonus;
            }
          }
        }
      } else if (f === faseAtual && statusFase === 'em_andamento') {
        const ranking = calcularRankingFase(faseAtual);
        ranking.forEach((jogador, idx) => {
          const pos = idx + 1;
          const { getPontosPorPosicao } = require('./config.js');
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
        if (bonusPorFase[f] && bonusPorFase[f][id]) {
          jog.bonus[f] = bonusPorFase[f][id];
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
    for (let f = 5; f >= 1; f--) html += `<th>Fase ${f}</th>`;
    html += '</tr></thead><tbody>';

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
// AVANÇAR FASE
// ============================================================
export async function avancarFase() {
  if (state.timerFase) { clearInterval(state.timerFase); state.timerFase = null; }
  const faseAtual = state.estadoAtual?.fase;
  if (faseAtual > 5) { exibirToast('Competição já finalizada!'); return; }

  const minConfig = await carregarMinPartidas();
  const minPartidas = minConfig[faseAtual] || 1;

  // Processar pontuação da fase
  await processarPontuacaoFase(faseAtual);

  // Classificar
  const res = state.estadoAtual?.resultados?.[faseAtual] || {};
  let lista = [];
  for (let id in res) {
    const partidas = res[id];
    if (partidas?.length) {
      if (partidas.length < minPartidas) continue;
      const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
      lista.push({ id, pontos: melhor.pontos, acertos: melhor.acertos, tempo: melhor.tempo });
    }
  }
  lista.sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.tempo - b.tempo);
  const vagas = { 1: 30, 2: 20, 3: 10, 4: 5, 5: 5 }[faseAtual] || 30;
  const classificadosIds = lista.slice(0, vagas).map(l => l.id);
  await setDados(`copaV2/classificados/${faseAtual}`, classificadosIds);
  tocarSom('classificado');

  // Preparar participantes para a próxima fase
  const participantesAtual = state.estadoAtual?.participantes?.[faseAtual] || {};
  const participantesProxima = {};
  for (let id of classificadosIds) {
    if (participantesAtual[id]) participantesProxima[id] = participantesAtual[id];
    else {
      for (let f = faseAtual-1; f >= 1; f--) {
        if (state.estadoAtual?.participantes?.[f]?.[id]) {
          participantesProxima[id] = state.estadoAtual.participantes[f][id];
          break;
        }
      }
    }
  }
  if (Object.keys(participantesProxima).length > 0) {
    await setDados(`copaV2/participantes/${faseAtual+1}`, participantesProxima);
  }
  await removerDados(`copaV2/resultados_temp/${faseAtual}`);

  state.tempoEsgotadoProcessado = false;

  if (faseAtual === 5) {
    exibirToast('🏆 COMPETIÇÃO FINALIZADA!');
    await setDados('copaV2', { ...state.estadoAtual, fase: faseAtual, status: 'finalizado', fim: 0, tempoRestantePausa: null });
    mostrarFinalizacao();
    forcarAlunosParaMenu();
    return;
  }

  await setDados('copaV2', { ...state.estadoAtual, fase: faseAtual + 1, status: 'aguardando', fim: 0, tempoRestantePausa: null });
  exibirToast(`✅ Fase ${faseAtual} finalizada! ${vagas} classificados para a fase ${faseAtual+1}.`);
  forcarAlunosParaMenu();
}

// ============================================================
// RESETAR FASE
// ============================================================
export async function resetarFase() {
  const faseAtual = state.estadoAtual?.fase;
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
// FUNÇÕES AUXILIARES
// ============================================================
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function mostrarFinalizacao() {
  const cardProf = document.getElementById('competicao-finalizada-prof');
  if (cardProf) cardProf.classList.remove('hidden');
  const cardTorcida = document.getElementById('competicao-finalizada-torcida');
  if (cardTorcida) cardTorcida.classList.remove('hidden');
  // Aluno
  if (state.meuTipo === 'aluno') {
    exibirToast('🏆 Copa finalizada! Consulte o ranking.');
  }
}

function forcarAlunosParaMenu() {
  if (state.meuTipo === 'aluno') {
    // Recarregar após um tempo
    setTimeout(() => location.reload(), 3000);
  }
}

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

  const updatesHistorico = {};
  const updatesGlobal = {};
  const updatesPosicao = {};
  const { getPontosPorPosicao } = await import('./config.js');

  let globais = await lerDados('copaV2/pontuacaoGlobal') || {};
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

  await atualizarDados(`copaV2/pontuacaoHistorico/${fase}`, updatesHistorico);
  await atualizarDados('copaV2/pontuacaoGlobal', updatesGlobal);
  await atualizarDados(`copaV2/pontuacaoPosicao/${fase}`, updatesPosicao);

  // Processar bônus de velocidade
  const { processarBonusVelocidade } = await import('./config.js');
  await processarBonusVelocidade(fase);

  if (fase === 5) {
    const pos5 = await lerDados('copaV2/pontuacaoPosicao/5') || {};
    const globaisFinal = await lerDados('copaV2/pontuacaoGlobal') || {};
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

// ============================================================
// ATUALIZAR INFORMAÇÃO DO ALUNO (BOLINHA, POSIÇÃO, ETC.)
// ============================================================
export async function atualizarInfoAluno() {
  if (!state.alunoId || !state.estadoAtual) return;
  const faseAtual = state.estadoAtual.fase;

  try {
    const resultados = await lerDados(`copaV2/resultados/${faseAtual}`) || {};
    const dadosTemp = await lerDados(`copaV2/resultados_temp/${faseAtual}/${state.alunoId}`);

    let lista = [];
    for (const [id, partidas] of Object.entries(resultados)) {
      if (partidas && partidas.length > 0) {
        const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
        lista.push({ id, pontos: melhor.pontos });
      }
    }
    lista.sort((a, b) => b.pontos - a.pontos);
    const posicaoAtual = lista.findIndex(p => p.id === state.alunoId) + 1;

    const posSpan = document.getElementById('posicao-numero');
    if (posSpan) {
      posSpan.innerText = posicaoAtual > 0 ? posicaoAtual : '--';
      if (posicaoAtual === 1) posSpan.style.color = '#ffd700';
      else if (posicaoAtual === 2) posSpan.style.color = '#c0c0c0';
      else if (posicaoAtual === 3) posSpan.style.color = '#cd7f32';
      else posSpan.style.color = '#ffffff';
    }

    // Bolinha
    let projecao = 0, perguntasRespondidas = 0;
    if (dadosTemp && dadosTemp.perguntas > 0 && dadosTemp.pontos > 0) {
      const ritmo = dadosTemp.pontos / dadosTemp.perguntas;
      projecao = ritmo * 20;
      perguntasRespondidas = dadosTemp.perguntas;
    } else {
      const partidasAluno = resultados[state.alunoId] || [];
      if (partidasAluno.length > 0) {
        const melhor = partidasAluno.sort((a, b) => b.pontos - a.pontos)[0];
        projecao = melhor.pontos;
        perguntasRespondidas = 20;
      }
    }

    let recordePessoal = 0;
    const snap = await lerDados(`copaV2/resultados/${faseAtual}/${state.alunoId}`);
    if (snap && snap.length) {
      const melhor = snap.sort((a, b) => b.pontos - a.pontos)[0];
      recordePessoal = melhor.pontos;
    }
    if (recordePessoal === 0 && dadosTemp) recordePessoal = dadosTemp.pontos || 0;

    let recordeLider = 0;
    if (lista.length > 0) {
      const liderId = lista[0].id;
      const snapLider = await lerDados(`copaV2/resultados/${faseAtual}/${liderId}`);
      if (snapLider && snapLider.length) {
        const melhorLider = snapLider.sort((a, b) => b.pontos - a.pontos)[0];
        recordeLider = melhorLider.pontos;
      }
      if (recordeLider === 0) {
        const liderTemp = await lerDados(`copaV2/resultados_temp/${faseAtual}/${liderId}`);
        if (liderTemp) recordeLider = liderTemp.pontos || 0;
      }
    }

    let cor = 'cinza';
    if (perguntasRespondidas >= 4 && projecao > 0) {
      if (posicaoAtual === 1) {
        if (projecao > recordePessoal) cor = 'vermelha';
        else cor = 'amarela';
      } else {
        if (projecao > recordeLider) cor = 'vermelha';
        else if (projecao > recordePessoal) cor = 'laranja';
        else cor = 'amarela';
      }
    }
    atualizarBolinhaUnica(cor);

    // Velocidade média
    let velocidadeMedia = 0, acertos = 0, tempo = 0;
    if (dadosTemp && dadosTemp.acertos > 0 && dadosTemp.tempo > 0) {
      acertos = dadosTemp.acertos;
      tempo = dadosTemp.tempo;
      velocidadeMedia = tempo / acertos;
    } else {
      const partidasAluno = resultados[state.alunoId] || [];
      if (partidasAluno.length > 0) {
        const melhor = partidasAluno.sort((a, b) => b.pontos - a.pontos)[0];
        if (melhor.acertos > 0 && melhor.tempo > 0) {
          acertos = melhor.acertos;
          tempo = melhor.tempo;
          velocidadeMedia = tempo / acertos;
        }
      }
    }
    const velSpan = document.getElementById('velocidade-media');
    if (velSpan) {
      if (velocidadeMedia > 0 && acertos > 0) {
        velSpan.innerText = velocidadeMedia.toFixed(2) + 's';
        if (velocidadeMedia < 1.5) velSpan.style.color = '#2ecc71';
        else if (velocidadeMedia < 2.5) velSpan.style.color = '#f39c12';
        else velSpan.style.color = '#e74c3c';
      } else {
        velSpan.innerText = '--';
        velSpan.style.color = '#ffffff';
      }
    }

  } catch (e) {
    console.warn('Erro ao atualizar info do aluno:', e);
  }
}

// ============================================================
// RANKING GERAL (para o professor)
// ============================================================
export async function renderRankingGeral() {
  const container = document.getElementById('ranking-geral-container');
  if (!container || !state.estadoAtual) return;

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
      const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
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
        existente.totalPartidas += partidas.length;
        if (melhor.pontos > existente.melhorPontuacao) {
          existente.melhorPontuacao = melhor.pontos;
          existente.melhorGlobalFase = fase;
          existente.melhorGlobalPartidaIndex = melhorIndex + 1;
        }
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

  for (let [id, info] of jogadores) {
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

  for (let [id, info] of jogadores) {
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
  html += '</tbody></table>';
  container.innerHTML = html;
}

// ============================================================
// RANKING DO ALUNO (MODAL)
// ============================================================
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

// ============================================================
// LISTAS DE ALUNOS E TURMAS (UI helpers)
// ============================================================
export async function renderListaAlunosGerenciar() {
  const container = document.getElementById('lista-alunos-gerenciavel');
  if (!container || !state.estadoAtual) return;
  const faseAtual = state.estadoAtual.fase;
  const participantes = state.estadoAtual.participantes?.[faseAtual] || {};
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

  // Event listeners para editar/excluir
  document.querySelectorAll('.btn-editar-aluno').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const novoNome = prompt('Novo nome:', btn.dataset.nome);
      if (novoNome) {
        const novaTurma = prompt('Nova turma:', btn.dataset.turma);
        if (novaTurma) {
          await atualizarDados(`copaV2/participantes/${faseAtual}/${id}`, { nome: novoNome, turma: novaTurma });
          renderListaAlunosGerenciar();
        }
      }
    });
  });
  document.querySelectorAll('.btn-excluir-aluno').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (confirm('Excluir aluno?')) {
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
    container.innerHTML = '<p>📭 Nenhuma turma cadastrada.</p>';
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
      const turmaAntiga = btn.dataset.turma;
      const novaTurma = prompt('Digite o novo nome da turma:', turmaAntiga);
      if (novaTurma && novaTurma !== turmaAntiga) {
        let turmas = await lerDados('copaV2/turmas') || [];
        const index = turmas.indexOf(turmaAntiga);
        if (index !== -1) {
          turmas[index] = novaTurma;
          await setDados('copaV2/turmas', turmas);
          renderListaTurmas();
        }
      }
    });
  });
  document.querySelectorAll('.btn-excluir-turma').forEach(btn => {
    btn.addEventListener('click', async () => {
      const turma = btn.dataset.turma;
      if (confirm(`Remover turma "${turma}"?`)) {
        let turmas = await lerDados('copaV2/turmas') || [];
        turmas = turmas.filter(t => t !== turma);
        await setDados('copaV2/turmas', turmas);
        renderListaTurmas();
      }
    });
  });
}

export function renderizarConfigMinPartidas(minConfig) {
  const container = document.getElementById('min-partidas-container');
  if (!container) return;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    const valor = minConfig[i] !== undefined ? minConfig[i] : 5;
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
  colunasDef.opcionais.forEach(col => {
    const checked = state.colunasVisiveis && state.colunasVisiveis[col.id] !== undefined ? state.colunasVisiveis[col.id] : true;
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
// EXPORTAÇÕES ADICIONAIS
// ============================================================
export function getPontosPorPosicao(posicao, fase) {
  const { getPontosPorPosicao: get } = require('./config.js');
  return get(posicao, fase);
}

export async function processarBonusVelocidade(fase) {
  const { processarBonusVelocidade: processar } = await import('./config.js');
  return processar(fase);
}

export function adicionarTurma(novaTurma) {
  // Implementação simplificada – será chamada do main.js
  return import('./ui.js').then(m => m.adicionarTurma(novaTurma));
}
