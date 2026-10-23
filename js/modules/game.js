// js/modules/game.js
// ============================================================
// COPA TABUADA CEIB 2026 - MÓDULO DE JOGO
// ============================================================

import { state } from './state.js';
import { exibirToast, exibirModalResultados, atualizarNivelEstrelasUI } from './ui.js';
import { tocarSom } from './sound.js';
import { setDados, lerDados, atualizarDados, removerDados } from './db.js';
import { calcularRankingFase } from './ranking.js';
import { verificarEConcederMedalhas, atualizarExibicaoMedalhas } from './medals.js';
import { concederEstrelas, carregarEstrelasAluno } from './estrelas.js';
import { atualizarRecordeGeral } from './config.js';

// ============================================================
// CONSTANTES
// ============================================================
const TEMPO_PERGUNTA = 10;         // segundos por pergunta
const TOTAL_PERGUNTAS = 20;        // perguntas por partida
const PONTOS_MAX_PERGUNTA = 100;   // pontos se acertar instantaneamente

// ============================================================
// ESTADO INTERNO DO MÓDULO
// ============================================================
let timerPerguntaLocal = null;
let tempoRestanteLocal = TEMPO_PERGUNTA;
let respondendo = false;

// ============================================================
// GERAÇÃO DE PERGUNTAS
// ============================================================

function obterOperandosPorModalidade(modalidade) {
  switch (modalidade) {
    case '6-9':  return [6, 7, 8, 9];
    case '0-10': return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    case '2-5':
    default:     return [2, 3, 4, 5];
  }
}

function gerarDistratores(correto, a, b, targetIndex) {
  const menores = new Set();
  const maiores = new Set();

  // Função auxiliar para adicionar aos conjuntos separando maiores e menores
  const add = (val) => {
    if (val >= 0 && val !== correto && Number.isInteger(val)) {
      if (val < correto) menores.add(val);
      else maiores.add(val);
    }
  };

  // Candidatos baseados em diferenças comuns
  [1, 2, 3, 4, 5, 10, -1, -2, -3, -4, -5, -10].forEach(diff => add(correto + diff));
  // Candidatos baseados nos operandos da multiplicação
  add(correto + a); add(correto - a);
  add(correto + b); add(correto - b);
  add((a + 1) * b); add((a - 1) * b);
  add(a * (b + 1)); add(a * (b - 1));
  add(a + b);

  // Embaralha os candidatos dentro de cada grupo
  const menoresArr = Array.from(menores).sort(() => Math.random() - 0.5);
  const maioresArr = Array.from(maiores).sort(() => Math.random() - 0.5);

  // Define quantos números menores e maiores precisamos baseado na posição alvo (0, 1, 2 ou 3)
  let numMenores = 0;
  let numMaiores = 0;
  if (targetIndex === 0) { numMaiores = 3; }
  else if (targetIndex === 1) { numMaiores = 2; numMenores = 1; }
  else if (targetIndex === 2) { numMaiores = 1; numMenores = 2; }
  else if (targetIndex === 3) { numMenores = 3; }

  // Ajuste para resultados muito baixos (ex: se a resposta for 1 ou 0, não existem 3 números menores)
  if (correto < numMenores) {
      numMenores = correto;
      numMaiores = 3 - numMenores;
  }

  const opcoes = [correto];
  let pickedMenores = menoresArr.slice(0, numMenores);
  let pickedMaiores = maioresArr.slice(0, numMaiores);

  // Preenchimento de segurança caso falte algum número nos conjuntos pré-definidos
  while (pickedMenores.length < numMenores) {
    const val = correto - Math.floor(Math.random() * 15) - 1;
    if (val >= 0 && !pickedMenores.includes(val) && val !== correto) {
      pickedMenores.push(val);
    }
  }
  while (pickedMaiores.length < numMaiores) {
    const val = correto + Math.floor(Math.random() * 15) + 1;
    if (!pickedMaiores.includes(val) && val !== correto) {
      pickedMaiores.push(val);
    }
  }

  opcoes.push(...pickedMenores, ...pickedMaiores);

  // Fallback extremo (garante que sempre teremos 4 opções)
  while (opcoes.length < 4) {
    const val = Math.max(0, correto + Math.floor(Math.random() * 21) - 10);
    if (!opcoes.includes(val)) opcoes.push(val);
  }

  // === AQUI GARANTIMOS A ORDEM CRESCENTE ===
  opcoes.sort((x, y) => x - y);
  return opcoes;
}

function gerarPerguntas(modalidade) {
  const operandos = obterOperandosPorModalidade(modalidade);
  const perguntas = [];
  const chavesUsadas = new Set();
  let tentativas = 0;
  const LIMITE_TENTATIVAS = 800;

  // Gera um gabarito de posições: 5x(0), 5x(1), 5x(2), 5x(3) e embaralha
  // Isso garante os 25% de distribuição
  let targetIndices = [0,0,0,0,0, 1,1,1,1,1, 2,2,2,2,2, 3,3,3,3,3];
  for (let i = targetIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [targetIndices[i], targetIndices[j]] = [targetIndices[j], targetIndices[i]];
  }
  let qIndex = 0;

  // Tenta gerar perguntas únicas primeiro
  while (perguntas.length < TOTAL_PERGUNTAS && tentativas < LIMITE_TENTATIVAS) {
    tentativas++;
    const a = operandos[Math.floor(Math.random() * operandos.length)];
    const b = Math.floor(Math.random() * 11);
    const chave = `${a}x${b}`;
    if (chavesUsadas.has(chave)) continue;
    chavesUsadas.add(chave);
    const resposta = a * b;
    
    perguntas.push({
      a,
      b,
      pergunta: `${a} x ${b}`,
      resposta,
      opcoes: gerarDistratores(resposta, a, b, targetIndices[qIndex])
    });
    qIndex++;
  }

  // Se não alcançou 20 (modalidade limitada), permite repetição, mas mantém o balanceamento
  while (perguntas.length < TOTAL_PERGUNTAS) {
    const a = operandos[Math.floor(Math.random() * operandos.length)];
    const b = Math.floor(Math.random() * 11);
    const resposta = a * b;
    perguntas.push({
      a,
      b,
      pergunta: `${a} x ${b}`,
      resposta,
      opcoes: gerarDistratores(resposta, a, b, targetIndices[qIndex])
    });
    qIndex++;
  }

  return perguntas;
}

// ============================================================
// ATUALIZAÇÃO DO BRILHO (feedback visual da pergunta)
// ============================================================

function atualizarBrilhoDuranteJogo() {
  const container = document.getElementById('pergunta-container');
  const barra = document.getElementById('progresso-tempo');
  if (!container) return;

  const perguntasRespondidas = state.perguntaIdx;
  let projecao = 0;
  if (perguntasRespondidas > 0 && state.pontosPartida > 0) {
    projecao = (state.pontosPartida / perguntasRespondidas) * TOTAL_PERGUNTAS;
  }

  const fase = state.estadoAtual?.fase || 1;
  const partidasAnteriores = state.estadoAtual?.resultados?.[fase]?.[state.alunoId] || [];
  const recordePessoal = partidasAnteriores.length > 0
    ? Math.max(...partidasAnteriores.map(p => p.pontos || 0))
    : 0;

  let recordeLider = 0;
  try {
    const ranking = calcularRankingFase(fase);
    if (ranking.length > 0) recordeLider = ranking[0].melhorPontuacao || 0;
  } catch (e) {
    // Silencioso
  }

  let cor = 'cinza';
  if (perguntasRespondidas >= 4 && projecao > 0) {
    if (projecao > recordeLider)      cor = 'roxo';
    else if (projecao > recordePessoal) cor = 'verde';
    else                                cor = 'amarelo';
  }

  container.classList.remove('brilho-roxo', 'brilho-verde', 'brilho-amarelo', 'brilho-cinza');
  container.classList.add('brilho-' + cor);

  if (barra) {
    barra.classList.remove(
      'progresso-tempo-roxo', 'progresso-tempo-verde',
      'progresso-tempo-amarelo', 'progresso-tempo-cinza'
    );
    barra.classList.add('progresso-tempo-' + cor);
  }
}

// ============================================================
// CARREGAR PERGUNTA
// ============================================================

function carregarPergunta() {
  if (state.perguntaIdx >= TOTAL_PERGUNTAS) {
    finalizarPartida();
    return;
  }

  const pergunta = state.perguntas[state.perguntaIdx];
  if (!pergunta) {
    finalizarPartida();
    return;
  }

  const elPergunta = document.getElementById('pergunta');
  if (elPergunta) elPergunta.textContent = `${pergunta.a} x ${pergunta.b} = ?`;

  const elNum = document.getElementById('pergunta-num');
  if (elNum) elNum.textContent = String(state.perguntaIdx + 1);

  const botoes = document.querySelectorAll('.opcao-vertical');
  botoes.forEach((btn, i) => {
    if (pergunta.opcoes[i] !== undefined) {
      btn.textContent = String(pergunta.opcoes[i]);
    }
    btn.disabled = false;
    btn.classList.remove('correto', 'errado', 'destaque-correto', 'joystick-selecionado');
  });

  respondendo = false;
  tempoRestanteLocal = TEMPO_PERGUNTA;

  const barra = document.getElementById('progresso-tempo');
  if (barra) barra.style.width = '100%';

  atualizarBrilhoDuranteJogo();

  if (timerPerguntaLocal) clearInterval(timerPerguntaLocal);
  timerPerguntaLocal = setInterval(() => {
    tempoRestanteLocal -= 0.1;

    if (tempoRestanteLocal <= 0) {
      tempoRestanteLocal = 0;
      if (barra) barra.style.width = '0%';
      clearInterval(timerPerguntaLocal);
      timerPerguntaLocal = null;
      if (!respondendo) {
        responder(-1); // timeout
      }
      return;
    }

    const pct = (tempoRestanteLocal / TEMPO_PERGUNTA) * 100;
    if (barra) barra.style.width = pct.toFixed(2) + '%';
  }, 100);
}

// ============================================================
// INICIAR PARTIDA
// ============================================================

export async function iniciarPartida() {
  if (!state.estadoAtual) {
    exibirToast('⏳ Aguarde o carregamento dos dados.', 'aviso');
    return;
  }
  if (!state.alunoId) {
    exibirToast('❌ Você precisa se identificar primeiro.', 'erro');
    return;
  }
  if (state.estadoAtual.status !== 'em_andamento') {
    exibirToast('⏳ A fase não está em andamento.', 'aviso');
    return;
  }
  if (Date.now() >= state.estadoAtual.fim) {
    exibirToast('⏰ O tempo da fase acabou.', 'aviso');
    return;
  }
  if (state.jogoAtivo) {
    // Já tem uma partida em andamento
    return;
  }

  // Recalcula posição antes da partida (para detectar subida de ranking)
  try {
    const ranking = calcularRankingFase(state.estadoAtual.fase);
    const idx = ranking.findIndex(j => j.id === state.alunoId);
    state.posicaoAntesPartida = idx >= 0 ? idx + 1 : null;
  } catch (e) {
    state.posicaoAntesPartida = null;
  }

  // Reset de estado
  state.jogoAtivo = true;
  state.partidaFinalizada = false;
  state.perguntas = gerarPerguntas(state.estadoAtual.modalidade || '2-5');
  state.perguntaIdx = 0;
  state.pontosPartida = 0;
  state.acertosPartida = 0;
  state.tempoTotalPartida = 0;
  state.historicoPerguntas = [];

  // UI
  document.body.classList.add('em-jogo');
  const jogoArea = document.getElementById('jogo-area');
  const aguardando = document.getElementById('aguardando-aluno');
  if (jogoArea) jogoArea.classList.remove('hidden');
  if (aguardando) aguardando.classList.add('hidden');

  const elPts = document.getElementById('pontuacao-acumulada');
  if (elPts) elPts.textContent = '0';
  const elVel = document.getElementById('velocidade-media');
  if (elVel) elVel.textContent = '0.00';

  tocarSom('inicio_fase');

  // Cria entrada em resultados_temp (para ranking em tempo real)
  try {
    await atualizarDados(
      `copaV2/resultados_temp/${state.estadoAtual.fase}/${state.alunoId}`,
      {
        nome: state.alunoNome || 'Anônimo',
        turma: state.alunoTurma || '?',
        pontos: 0,
        perguntas: 0,
        acertos: 0,
        tempo: 0
      }
    );
  } catch (e) {
    console.warn('Erro ao criar resultado temporário:', e);
  }

  carregarPergunta();
}

// ============================================================
// RESPONDER
// ============================================================

function responder(index) {
  if (!state.jogoAtivo || state.partidaFinalizada) return;
  if (respondendo) return;
  respondendo = true;

  if (timerPerguntaLocal) {
    clearInterval(timerPerguntaLocal);
    timerPerguntaLocal = null;
  }

  const pergunta = state.perguntas[state.perguntaIdx];
  if (!pergunta) {
    finalizarPartida();
    return;
  }

  const botoes = document.querySelectorAll('.opcao-vertical');
  const tempoGasto = Math.max(0, TEMPO_PERGUNTA - tempoRestanteLocal);

  let acertou = false;
  let pontosGanhos = 0;
  let respostaEscolhida = '(tempo esgotado)';

  if (index >= 0 && index < 4 && pergunta.opcoes[index] !== undefined) {
    const escolhida = pergunta.opcoes[index];
    respostaEscolhida = String(escolhida);

    if (escolhida === pergunta.resposta) {
      acertou = true;
      // Pontos proporcionais ao tempo restante
      pontosGanhos = Math.round((tempoRestanteLocal / TEMPO_PERGUNTA) * PONTOS_MAX_PERGUNTA);
      if (pontosGanhos < 0) pontosGanhos = 0;
      if (botoes[index]) botoes[index].classList.add('correto');
      tocarSom('acerto');
    } else {
      if (botoes[index]) botoes[index].classList.add('errado');
      const idxCorreto = pergunta.opcoes.indexOf(pergunta.resposta);
      if (idxCorreto >= 0 && botoes[idxCorreto]) {
        botoes[idxCorreto].classList.add('destaque-correto');
      }
      tocarSom('erro');
    }
  } else {
    // Timeout
    const idxCorreto = pergunta.opcoes.indexOf(pergunta.resposta);
    if (idxCorreto >= 0 && botoes[idxCorreto]) {
      botoes[idxCorreto].classList.add('destaque-correto');
    }
    tocarSom('tempo_esgotado');
  }

  // Registra histórico
  state.historicoPerguntas.push({
    pergunta: `${pergunta.a} x ${pergunta.b}`,
    acertou,
    respostaEscolhida,
    respostaCorreta: String(pergunta.resposta),
    tempoGasto
  });

  if (acertou) {
    state.pontosPartida += pontosGanhos;
    state.acertosPartida += 1;
  }
  state.tempoTotalPartida += tempoGasto;

  // Atualiza UI
  const elPts = document.getElementById('pontuacao-acumulada');
  if (elPts) elPts.textContent = String(state.pontosPartida);

  const velMedia = state.acertosPartida > 0
    ? state.tempoTotalPartida / state.acertosPartida
    : 0;
  const elVel = document.getElementById('velocidade-media');
  if (elVel) elVel.textContent = velMedia.toFixed(2) + 's';

  // Atualiza resultado temporário em tempo real
  atualizarDados(
    `copaV2/resultados_temp/${state.estadoAtual.fase}/${state.alunoId}`,
    {
      nome: state.alunoNome || 'Anônimo',
      turma: state.alunoTurma || '?',
      pontos: state.pontosPartida,
      perguntas: state.perguntaIdx + 1,
      acertos: state.acertosPartida,
      tempo: state.tempoTotalPartida
    }
  ).catch(() => {});

  // Desabilita botões
  botoes.forEach(btn => { btn.disabled = true; });

  // Delay antes de avançar
  const delayAcerto = (typeof state.tempoFeedbackAcerto === 'number' ? state.tempoFeedbackAcerto : 0.5) * 1000;
  const delayErro = (typeof state.tempoFeedbackErro === 'number' ? state.tempoFeedbackErro : 0.5) * 1000;
  const delay = acertou ? delayAcerto : delayErro;

  setTimeout(() => {
    state.perguntaIdx += 1;
    carregarPergunta();
  }, delay);
}

// Expõe globalmente (usado pelos onclick do HTML)
window.responder = responder;

// ============================================================
// CONCESSÃO DE ESTRELAS POR PARTIDA
// ============================================================

async function concederEstrelasPorPartida(posicaoAntes, posicaoDepois) {
  if (!state.alunoId) return;

  const acoes = state.configEstrelas.acoes || {};
  const fase = state.estadoAtual.fase;

  // Partida completa
  if ((acoes.partida_completa || 0) > 0) {
    await concederEstrelas(state.alunoId, 'partida_completa', acoes.partida_completa, fase);
  }

  // Acertos 18/19
  if ((state.acertosPartida === 18 || state.acertosPartida === 19) && (acoes.acertos_18_19 || 0) > 0) {
    await concederEstrelas(state.alunoId, 'acertos_18_19', acoes.acertos_18_19, fase);
  }

  // Acertos 20 (perfeição)
  if (state.acertosPartida === 20 && (acoes.acertos_20 || 0) > 0) {
    await concederEstrelas(state.alunoId, 'acertos_20', acoes.acertos_20, fase);
  }

  // Subiu no ranking
  if ((acoes.subiu_ranking || 0) > 0 && posicaoAntes && posicaoDepois) {
    if (posicaoDepois < posicaoAntes) {
      await concederEstrelas(state.alunoId, 'subiu_ranking', acoes.subiu_ranking, fase);
    }
  }
}

// ============================================================
// PREPARAR DADOS DO MODAL DE RESULTADO
// ============================================================

async function prepararDadosModal(partidasAtuais) {
  const fase = state.estadoAtual.fase;
  const alunoId = state.alunoId;

  // Posição atual (após salvar)
  let minhaPosicao = 1;
  let ranking = [];
  try {
    ranking = calcularRankingFase(fase);
    const idx = ranking.findIndex(j => j.id === alunoId);
    minhaPosicao = idx >= 0 ? idx + 1 : 1;
  } catch (e) {
    console.warn('Erro ao calcular ranking para modal:', e);
  }

  // Evolução (se houver partida anterior)
  let evolucao = null;
  if (partidasAtuais.length >= 2) {
    const anterior = partidasAtuais[partidasAtuais.length - 2];
    const atual = partidasAtuais[partidasAtuais.length - 1];

    const velAnterior = anterior.acertos > 0 ? (anterior.tempo / anterior.acertos) : 0;
    const velAtual = atual.acertos > 0 ? (atual.tempo / atual.acertos) : 0;

    const deltaPontos = (atual.pontos || 0) - (anterior.pontos || 0);
    const deltaAcertos = (atual.acertos || 0) - (anterior.acertos || 0);

    // Projeção simples: trajetória linear (limitada)
    const projecaoPontos = Math.max(0, Math.min(2000, (atual.pontos || 0) + deltaPontos));
    const projecaoAcertos = Math.max(0, Math.min(20, (atual.acertos || 0) + deltaAcertos));

    evolucao = {
      pontos: { atual: atual.pontos || 0, delta: deltaPontos },
      acertos: { atual: atual.acertos || 0, delta: deltaAcertos },
      tempoMedio: { atual: velAtual, delta: velAtual - velAnterior },
      precisao: {
        atual: Math.round(((atual.acertos || 0) / TOTAL_PERGUNTAS) * 100),
        delta: Math.round((deltaAcertos / TOTAL_PERGUNTAS) * 100)
      },
      projecao: {
        pontos: projecaoPontos,
        acertos: projecaoAcertos
      },
      recordes: []
    };

    if (deltaPontos > 0) evolucao.recordes.push('🎯 Novo recorde de pontos!');
    if (deltaAcertos > 0) evolucao.recordes.push('✅ Mais acertos!');
    if (velAtual > 0 && velAnterior > 0 && velAtual < velAnterior) {
      evolucao.recordes.push('⚡ Mais rápido!');
    }
  }

  // Estrelas ganhas (só as desta partida, baseado no histórico recente)
  const estrelasGanhas = {};
  const historico = state.estrelas.historico || [];
  const agora = Date.now();
  // Considera estrelas concedidas nos últimos 15 segundos (durante o finalizarPartida)
  historico.forEach(e => {
    if (e.timestamp && (agora - e.timestamp) < 15000 && e.fase === fase) {
      estrelasGanhas[e.acao] = (estrelasGanhas[e.acao] || 0) + e.estrelas;
    }
  });

  return {
    posicao: minhaPosicao,
    posicaoAnterior: state.posicaoAntesPartida,
    pontos: state.pontosPartida,
    acertos: state.acertosPartida,
    tempoTotal: state.tempoTotalPartida,
    fase,
    totalPartidas: partidasAtuais.length,
    ranking,
    id: alunoId,
    nome: state.alunoNome || 'Aluno',
    turma: state.alunoTurma || '?',
    historico: state.historicoPerguntas,
    estrelasGanhas,
    evolucao
  };
}

// ============================================================
// FINALIZAR PARTIDA
// ============================================================

async function finalizarPartida() {
  if (state.partidaFinalizada) return;
  state.partidaFinalizada = true;
  state.jogoAtivo = false;

  if (timerPerguntaLocal) {
    clearInterval(timerPerguntaLocal);
    timerPerguntaLocal = null;
  }

  const fase = state.estadoAtual.fase;
  const alunoId = state.alunoId;

  const resultadoPartida = {
    pontos: state.pontosPartida,
    acertos: state.acertosPartida,
    tempo: state.tempoTotalPartida,
    timestamp: Date.now(),
    historico: state.historicoPerguntas
  };

  let partidasAtuais = [];
  try {
    const ref = `copaV2/resultados/${fase}/${alunoId}`;
    partidasAtuais = await lerDados(ref) || [];
    partidasAtuais.push(resultadoPartida);
    await setDados(ref, partidasAtuais);
  } catch (e) {
    console.error('Erro ao salvar resultado:', e);
    exibirToast('⚠️ Erro ao salvar resultado. Verifique sua conexão.', 'erro');
  }

  // Remove temp
  try {
    await removerDados(`copaV2/resultados_temp/${fase}/${alunoId}`);
  } catch (e) { /* silencioso */ }

  // Garante que o participante está registrado
  try {
    await atualizarDados(`copaV2/participantes/${fase}/${alunoId}`, {
      nome: state.alunoNome || 'Anônimo',
      turma: state.alunoTurma || '?'
    });
  } catch (e) { /* silencioso */ }

  // Medalhas
  try {
    await verificarEConcederMedalhas();
    atualizarExibicaoMedalhas();
  } catch (e) {
    console.warn('Erro ao verificar medalhas:', e);
  }

  // Recorde geral (velocidade)
  if (state.acertosPartida > 0 && state.tempoTotalPartida > 0) {
    try {
      const velocidade = state.tempoTotalPartida / state.acertosPartida;
      const precisao = (state.acertosPartida / TOTAL_PERGUNTAS) * 100;
      await atualizarRecordeGeral(
        alunoId, velocidade, precisao, fase, partidasAtuais.length - 1
      );
    } catch (e) {
      console.warn('Erro ao atualizar recorde geral:', e);
    }
  }

  // Força refresh do estado (para posição/ranking ficarem corretos)
  try {
    const snap = await lerDados('copaV2');
    if (snap) state.estadoAtual = snap;
  } catch (e) { /* silencioso */ }

  // Calcula nova posição
  let posicaoDepois = null;
  try {
    const ranking = calcularRankingFase(fase);
    const idx = ranking.findIndex(j => j.id === alunoId);
    posicaoDepois = idx >= 0 ? idx + 1 : null;
  } catch (e) { /* silencioso */ }

  // Estrelas (depois do refresh, para usar posições corretas)
  try {
    await concederEstrelasPorPartida(state.posicaoAntesPartida, posicaoDepois);
  } catch (e) {
    console.warn('Erro ao conceder estrelas:', e);
  }

  // Prepara dados do modal
  const dadosModal = await prepararDadosModal(partidasAtuais);

  // UI
  document.body.classList.remove('em-jogo');
  const jogoArea = document.getElementById('jogo-area');
  const aguardando = document.getElementById('aguardando-aluno');
  if (jogoArea) jogoArea.classList.add('hidden');
  if (aguardando) aguardando.classList.remove('hidden');

  // Recarrega estrelas e atualiza nível na UI
  try {
    await carregarEstrelasAluno(alunoId);
    atualizarNivelEstrelasUI();
  } catch (e) { /* silencioso */ }

  // Atualiza estatísticas da tela do aluno
  atualizarEstatisticasAluno();

  // Redesenha gráfico se estiver visível
  const graficoContainer = document.getElementById('grafico-aluno-container');
  if (graficoContainer && !graficoContainer.classList.contains('hidden')) {
    desenharGraficoEvolucao();
  }

  // Exibe modal
  try {
    exibirModalResultados(dadosModal);
  } catch (e) {
    console.error('Erro ao exibir modal de resultado:', e);
    exibirToast('✅ Partida finalizada!', 'sucesso');
  }

  tocarSom('fim_fase');
}

// ============================================================
// ESTATÍSTICAS DO ALUNO (painel da tela)
// ============================================================

async function atualizarEstatisticasAluno() {
  if (!state.alunoId || !state.estadoAtual) return;
  const fase = state.estadoAtual.fase;

  try {
    const partidas = await lerDados(`copaV2/resultados/${fase}/${state.alunoId}`) || [];
    const totalPartidas = partidas.length;
    const melhorScore = totalPartidas > 0
      ? Math.max(...partidas.map(p => p.pontos || 0))
      : 0;

    let melhorVel = null;
    const validas = partidas.filter(p => (p.acertos || 0) > 0 && (p.tempo || 0) > 0);
    if (validas.length > 0) {
      melhorVel = Math.min(...validas.map(p => p.tempo / p.acertos));
    }

    const elScore = document.getElementById('aluno-melhor-score');
    const elTotal = document.getElementById('aluno-total-partidas');
    const elVel = document.getElementById('aluno-melhor-velocidade');

    if (elScore) elScore.textContent = String(melhorScore);
    if (elTotal) elTotal.textContent = String(totalPartidas);
    if (elVel) {
      elVel.textContent = (melhorVel !== null && isFinite(melhorVel))
        ? melhorVel.toFixed(2) + 's'
        : '--';
    }
  } catch (e) {
    console.warn('Erro ao atualizar estatísticas do aluno:', e);
  }
}

// ============================================================
// GRÁFICO DE EVOLUÇÃO (canvas)
// ============================================================

function desenharLinhasNoCanvas(canvas, partidas) {
  if (!canvas || !partidas || partidas.length === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const pontos = partidas.map(p => p.pontos || 0);
  const maxP = Math.max(...pontos, 100);
  const padding = 40;
  const plotW = w - padding * 2;
  const plotH = h - padding * 2;

  // Eixos
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.stroke();

  // Grid horizontal + labels Y
  ctx.font = '10px sans-serif';
  for (let i = 0; i <= 4; i++) {
    const y = padding + (plotH * i / 4);
    ctx.strokeStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(w - padding, y);
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const valor = Math.round(maxP - (maxP * i / 4));
    ctx.fillText(String(valor), padding - 6, y);
  }

  // Linha / Ponto
  if (pontos.length === 1) {
    const x = padding + plotW / 2;
    const y = h - padding - (pontos[0] / maxP) * plotH;
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Linha
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    pontos.forEach((p, i) => {
      const x = padding + (plotW * i / (pontos.length - 1));
      const y = h - padding - (p / maxP) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Pontos
    pontos.forEach((p, i) => {
      const x = padding + (plotW * i / (pontos.length - 1));
      const y = h - padding - (p / maxP) * plotH;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Labels X
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  partidas.forEach((p, i) => {
    const x = pontos.length === 1
      ? padding + plotW / 2
      : padding + (plotW * i / (pontos.length - 1));
    ctx.fillText(`P${i + 1}`, x, h - padding + 6);
  });
}

export function desenharGraficoEvolucao() {
  const canvas = document.getElementById('grafico-evolucao');
  if (!canvas) return;
  if (!state.alunoId || !state.estadoAtual) return;

  const fase = state.estadoAtual.fase;
  const partidas = state.estadoAtual?.resultados?.[fase]?.[state.alunoId] || [];
  if (partidas.length === 0) return;

  desenharLinhasNoCanvas(canvas, partidas);
}

export function desenharGraficoEvolucaoModal(canvas) {
  if (!canvas) return;
  if (!state.alunoId || !state.estadoAtual) return;

  const fase = state.estadoAtual.fase;
  const partidas = state.estadoAtual?.resultados?.[fase]?.[state.alunoId] || [];
  if (partidas.length === 0) return;

  desenharLinhasNoCanvas(canvas, partidas);
}

// ============================================================
// HISTÓRICO DE PARTIDAS
// ============================================================

async function renderizarHistorico() {
  const container = document.getElementById('historico-aluno-lista');
  if (!container) return;

  if (!state.alunoId || !state.estadoAtual) {
    container.innerHTML = '<p style="color: #94a3b8;">Aguardando dados...</p>';
    return;
  }

  try {
    const fase = state.estadoAtual.fase;
    const partidas = await lerDados(`copaV2/resultados/${fase}/${state.alunoId}`) || [];

    if (partidas.length === 0) {
      container.innerHTML = '<p style="color: #94a3b8;">Nenhuma partida registrada nesta fase.</p>';
      return;
    }

    let html = '<table style="width:100%; border-collapse:collapse; font-size:13px;">';
    html += '<thead><tr style="border-bottom:2px solid #334155;">';
    html += '<th style="padding:6px; text-align:left;">Partida</th>';
    html += '<th style="padding:6px; text-align:left;">Pontos</th>';
    html += '<th style="padding:6px; text-align:left;">Acertos</th>';
    html += '<th style="padding:6px; text-align:left;">Tempo médio</th>';
    html += '</tr></thead><tbody>';

    partidas.forEach((p, i) => {
      const tempoMedio = (p.acertos || 0) > 0
        ? ((p.tempo || 0) / p.acertos).toFixed(2) + 's'
        : '--';
      html += '<tr style="border-bottom:1px solid #1e293b;">';
      html += `<td style="padding:6px;">P${i + 1}</td>`;
      html += `<td style="padding:6px;">${p.pontos || 0}</td>`;
      html += `<td style="padding:6px;">${p.acertos || 0}/20</td>`;
      html += `<td style="padding:6px;">${tempoMedio}</td>`;
      html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (e) {
    console.warn('Erro ao carregar histórico:', e);
    container.innerHTML = '<p style="color: #f87171;">Erro ao carregar histórico.</p>';
  }
}

// ============================================================
// LISTENERS DE BOTÕES (Histórico / Evolução)
// ============================================================

(function registrarListenersBotoes() {
  const btnHistorico = document.getElementById('btn-historico-aluno');
  if (btnHistorico) {
    btnHistorico.addEventListener('click', () => {
      const container = document.getElementById('historico-aluno-container');
      if (!container) return;
      container.classList.toggle('hidden');
      if (!container.classList.contains('hidden')) {
        renderizarHistorico();
      }
    });
  }

  const btnGrafico = document.getElementById('btn-grafico-aluno');
  if (btnGrafico) {
    btnGrafico.addEventListener('click', () => {
      const container = document.getElementById('grafico-aluno-container');
      if (!container) return;
      container.classList.toggle('hidden');
      if (!container.classList.contains('hidden')) {
        // Aguarda o display para garantir dimensões corretas
        setTimeout(() => desenharGraficoEvolucao(), 50);
      }
    });
  }
})();
