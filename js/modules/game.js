// js/modules/game.js
import { state } from './state.js';
import { exibirToast } from './ui.js';
import { lerDados, atualizarDados, removerDados } from './db.js';
import { tocarSom } from './sound.js';
import { calcularRankingFase } from './ranking.js';
import { atualizarRecordeGeral } from './config.js';
import { verificarEConcederMedalhas, atualizarExibicaoMedalhas } from './medals.js';

// ============================================================
// GERAR PERGUNTAS COM DISTRATORES INTELIGENTES (Item 7)
// ============================================================

export function gerarPerguntas(modalidade, fase) {
  const configs = {
    "2-5": { min: 2, max: 5 },
    "6-9": { min: 6, max: 9 },
    "0-10": { min: 0, max: 10 }
  };
  const config = configs[modalidade];
  if (!config) return [];

  // Base de números para a tabuada
  let base = [];
  for (let i = config.min; i <= config.max; i++) base.push(i);

  // Fase 5: inclui números 6-9 como segundo fator (tabuada "difícil")
  const H = (fase === 5) ? [6,7,8,9] : [];

  // Pool de pares (a, b) sem repetição direta
  let pool = [];
  const used = new Set();
  if (fase === 5) {
    for (let a of base) for (let b of H) {
      const key = `${a}x${b}`;
      if (!used.has(key)) { used.add(key); pool.push({a,b}); }
    }
    for (let a of H) for (let b of base) {
      const key = `${a}x${b}`;
      if (!used.has(key)) { used.add(key); pool.push({a,b}); }
    }
  } else {
    for (let a of base) for (let b of base) {
      const key = `${a}x${b}`;
      if (!used.has(key)) { used.add(key); pool.push({a,b}); }
    }
  }

  // Se pool for menor que 20, duplica aleatoriamente
  while (pool.length < 20) {
    const extra = pool.slice(0, 20 - pool.length);
    pool = pool.concat(extra);
  }

  // Embaralha
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // Seleciona 20 perguntas com o mínimo de repetição consecutiva
  let selecionadas = [];
  let tentativas = 0;
  const maxTentativas = 100;
  while (selecionadas.length < 20 && tentativas < maxTentativas) {
    tentativas++;
    const copia = shuffle([...pool]);
    let candidatas = [];
    for (let i = 0; i < copia.length && candidatas.length < 20; i++) {
      const p = copia[i];
      if (candidatas.length > 0) {
        const ultima = candidatas[candidatas.length - 1];
        if (ultima.a === p.a && ultima.b === p.b) continue;
      }
      candidatas.push({ a: p.a, b: p.b });
    }
    if (candidatas.length === 20) {
      selecionadas = candidatas;
      break;
    }
  }
  while (selecionadas.length < 20) {
    const p = pool[Math.floor(Math.random() * pool.length)];
    if (selecionadas.length > 0) {
      const ultima = selecionadas[selecionadas.length - 1];
      if (ultima.a === p.a && ultima.b === p.b) continue;
    }
    selecionadas.push({ a: p.a, b: p.b });
  }

  // ============================================================
  // GERAR DISTRATORES INTELIGENTES (Item 7)
  // ============================================================

  function gerarDistratoresInteligentes(correta, posAlvo, count = 3) {
    // Evita distratores iguais ao correto ou repetidos
    const distratores = new Set();

    // Define um intervalo razoável: ±20% do valor correto, com limite mínimo 1 e máximo 100
    const margem = Math.max(2, Math.round(correta * 0.2));
    const minVal = Math.max(0, correta - margem * 2);
    const maxVal = Math.min(100, correta + margem * 2);

    // Tenta gerar distratores variados
    let tentativas = 0;
    while (distratores.size < count && tentativas < 200) {
      tentativas++;
      // Gera um valor dentro do intervalo, com viés para valores próximos
      let offset = 0;
      const r = Math.random();
      if (r < 0.4) offset = Math.floor(Math.random() * (margem + 1));       // perto
      else if (r < 0.7) offset = Math.floor(Math.random() * (margem * 2 + 1)) + margem; // médio
      else offset = Math.floor(Math.random() * (margem * 4 + 1)) + margem * 2; // longe, mas dentro do limite

      // Decide se soma ou subtrai
      const sinal = Math.random() < 0.5 ? 1 : -1;
      let candidato = correta + sinal * offset;

      // Garante que não fique negativo nem ultrapasse 100
      candidato = Math.max(0, Math.min(100, candidato));

      // Não pode ser igual ao correto, nem repetido
      if (candidato !== correta && !distratores.has(candidato)) {
        distratores.add(candidato);
      }
    }

    // Se ainda faltar distratores, preenche com números aleatórios longe do correto
    while (distratores.size < count) {
      let candidato = Math.floor(Math.random() * 101);
      if (candidato !== correta && !distratores.has(candidato)) {
        distratores.add(candidato);
      }
    }

    // Converte para array e embaralha
    let resultado = Array.from(distratores);
    shuffle(resultado);
    return resultado;
  }

  // Gera as opções para cada pergunta
  const resultado = selecionadas.map((p, idx) => {
    const correta = p.a * p.b;

    // Determina a posição correta de forma alternada para variar
    // Usamos o índice para distribuir as posições (1 a 4)
    const posAlvo = (idx % 4) + 1; // 1,2,3,4,1,2,3,4,...

    // Gera 3 distratores inteligentes
    const distratores = gerarDistratoresInteligentes(correta, posAlvo, 3);

    // Monta as 4 opções (correta + 3 distratores)
    let opcoes = [correta, ...distratores];
    // Embaralha para não ficar sempre na mesma posição
    shuffle(opcoes);

    // Encontra a nova posição da resposta correta
    const novaPos = opcoes.indexOf(correta) + 1;

    return {
      a: p.a,
      b: p.b,
      opts: opcoes,
      posicaoCorreta: novaPos
    };
  });

  return resultado;
}

// ============================================================
// INICIAR PARTIDA (com tratamento de erros - Item 6)
// ============================================================

export async function iniciarPartida() {
  if (state.jogoAtivo) return;

  try {
    if (!state.alunoId || !state.estadoAtual) {
      exibirToast('❌ Dados do aluno não disponíveis.');
      return;
    }
    if (state.estadoAtual.status !== 'em_andamento') {
      exibirToast('⏳ Fase não está em andamento.');
      return;
    }
    if (Date.now() >= state.estadoAtual.fim) {
      exibirToast('⏰ Tempo esgotado!');
      return;
    }

    state.perguntas = gerarPerguntas(state.estadoAtual.modalidade, state.estadoAtual.fase);
    state.perguntaIdx = 0;
    state.pontosPartida = 0;
    state.acertosPartida = 0;
    state.tempoTotalPartida = 0;
    state.partidaFinalizada = false;
    state.jogoAtivo = true;

    document.body.classList.add('em-jogo');
    document.getElementById('jogo-area').classList.remove('hidden');
    document.getElementById('aguardando-aluno').classList.add('hidden');
    document.getElementById('btn-ranking-aluno').disabled = true;
    document.getElementById('btn-ranking-pontos-aluno').disabled = true;

    proximaPergunta();
  } catch (error) {
    console.error('Erro ao iniciar partida:', error);
    exibirToast('❌ Erro ao iniciar partida. Tente novamente.');
    state.jogoAtivo = false;
    document.body.classList.remove('em-jogo');
  }
}

// ============================================================
// PRÓXIMA PERGUNTA
// ============================================================

function proximaPergunta() {
  if (state.perguntaIdx >= 20) {
    finalizarPartida();
    return;
  }

  try {
    const p = state.perguntas[state.perguntaIdx];
    document.getElementById('pergunta').innerText = `${p.a} x ${p.b} = ?`;
    const btns = document.querySelectorAll('.opcao-vertical');
    p.opts.forEach((o, i) => {
      if (btns[i]) {
        btns[i].innerText = o;
        btns[i].disabled = false;
        btns[i].dataset.correct = (i + 1 === p.posicaoCorreta) ? 'true' : 'false';
      }
    });
    document.getElementById('pergunta-num').innerText = state.perguntaIdx + 1;
    iniciarTimerPergunta();
  } catch (error) {
    console.error('Erro ao exibir pergunta:', error);
    exibirToast('❌ Erro ao carregar pergunta. Reinicie a partida.');
  }
}

// ============================================================
// TIMER DA PERGUNTA
// ============================================================

function iniciarTimerPergunta() {
  state.tempoRestantePergunta = 10;
  const barra = document.getElementById('progresso-tempo');
  if (state.timerPergunta) clearInterval(state.timerPergunta);

  let inicio = performance.now();
  function atualizar(timestamp) {
    const decorrido = (timestamp - inicio) / 1000;
    state.tempoRestantePergunta = Math.max(0, 10 - decorrido);
    if (barra) {
      barra.style.width = (state.tempoRestantePergunta * 10) + '%';
      barra.setAttribute('aria-valuenow', Math.round(state.tempoRestantePergunta * 10));
    }
    if (state.tempoRestantePergunta > 0) {
      requestAnimationFrame(atualizar);
    } else {
      responder(-1);
    }
  }
  requestAnimationFrame(atualizar);
}

// ============================================================
// RESPONDER (exportado globalmente)
// ============================================================

export async function responder(idx) {
  if (!state.jogoAtivo || state.partidaFinalizada) return;
  if (state.timerPergunta) clearInterval(state.timerPergunta);

  try {
    const btns = document.querySelectorAll('.opcao-vertical');
    btns.forEach(b => b.disabled = true);

    const tempoGasto = 10 - Math.max(0, state.tempoRestantePergunta);
    state.tempoTotalPartida += tempoGasto;

    let acertou = false;
    if (idx !== -1) {
      const resp = parseInt(btns[idx].innerText);
      const p = state.perguntas[state.perguntaIdx];
      const correta = p.a * p.b;
      if (resp === correta) {
        acertou = true;
        state.acertosPartida++;
        const pontosGanhos = Math.round(100 * (Math.max(0, state.tempoRestantePergunta) / 10));
        state.pontosPartida += pontosGanhos;
        tocarSom('acerto');
      } else {
        tocarSom('erro');
      }
    } else {
      tocarSom('tempo_esgotado');
    }

    document.getElementById('pontuacao-acumulada').innerText = state.pontosPartida;
    state.perguntaIdx++;

    if (state.perguntaIdx >= 20) {
      await finalizarPartida();
    } else {
      btns.forEach(b => b.disabled = false);
      await atualizarPontuacaoParcial();
      setTimeout(proximaPergunta, 200);
    }
  } catch (error) {
    console.error('Erro ao responder:', error);
    exibirToast('❌ Erro ao processar resposta. Tente novamente.');
  }
}

// Exportar para o escopo global (onclick)
window.responder = responder;

// ============================================================
// ATUALIZAR PONTUAÇÃO PARCIAL (com tratamento de erros)
// ============================================================

async function atualizarPontuacaoParcial() {
  if (!state.alunoId || !state.estadoAtual) return;
  const fase = state.estadoAtual.fase;
  try {
    await atualizarDados(`copaV2/resultados_temp/${fase}/${state.alunoId}`, {
      nome: state.alunoNome,
      turma: state.alunoTurma,
      pontos: state.pontosPartida,
      acertos: state.acertosPartida,
      tempo: state.tempoTotalPartida,
      perguntas: state.perguntaIdx,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('Erro ao salvar pontuação parcial:', error);
    // Não exibe toast para não poluir a tela durante o jogo
  }
}

// ============================================================
// FINALIZAR PARTIDA (com tratamento de erros)
// ============================================================

async function finalizarPartida() {
  if (state.partidaFinalizada) return;
  state.partidaFinalizada = true;
  state.jogoAtivo = false;

  document.body.classList.remove('em-jogo');
  document.getElementById('btn-ranking-aluno').disabled = false;
  document.getElementById('btn-ranking-pontos-aluno').disabled = false;
  document.getElementById('jogo-area').classList.add('hidden');
  document.getElementById('aguardando-aluno').classList.remove('hidden');

  try {
    const fase = state.estadoAtual.fase;
    const ref = `copaV2/resultados/${fase}/${state.alunoId}`;
    const partidas = await lerDados(ref) || [];
    partidas.push({
      pontos: state.pontosPartida,
      acertos: state.acertosPartida,
      tempo: state.tempoTotalPartida
    });
    await atualizarDados(ref, partidas);
    await removerDados(`copaV2/resultados_temp/${fase}/${state.alunoId}`);

    if (state.acertosPartida > 0 && state.tempoTotalPartida > 0) {
      const precisao = (state.acertosPartida / 20) * 100;
      const velocidade = state.tempoTotalPartida / state.acertosPartida;
      const partidaIndex = partidas.length - 1;
      await atualizarRecordeGeral(state.alunoId, velocidade, precisao, fase, partidaIndex);
    }

    // Verificar medalhas
    await verificarEConcederMedalhas();
    atualizarExibicaoMedalhas();

    // Atualizar gráfico
    const { desenharGraficoEvolucao } = await import('./game.js');
    desenharGraficoEvolucao();

    exibirToast(`✅ Partida finalizada! Pontos: ${state.pontosPartida}`);
    const { atualizarInfoAluno } = await import('./ranking.js');
    atualizarInfoAluno();

  } catch (error) {
    console.error('Erro ao finalizar partida:', error);
    exibirToast('❌ Erro ao salvar resultados. Contate o professor.');
  }
}

// ============================================================
// GRÁFICO DE EVOLUÇÃO
// ============================================================

export function desenharGraficoEvolucao() {
  const canvas = document.getElementById('grafico-evolucao');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const fase = state.estadoAtual?.fase || 1;
  const resultados = state.estadoAtual?.resultados?.[fase]?.[state.alunoId] || [];
  if (resultados.length < 2) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Jogue mais partidas para ver sua evolução!', canvas.width/2, canvas.height/2);
    return;
  }

  const pontuacoes = resultados.map(p => p.pontos || 0);
  const maxPontos = Math.max(2000, Math.max(...pontuacoes) + 200);
  const padding = 40;
  const graficoWidth = canvas.width - padding * 2;
  const graficoHeight = canvas.height - padding * 2;

  // Eixos
  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

  // Linha
  ctx.beginPath();
  ctx.strokeStyle = '#ffd966';
  ctx.lineWidth = 3;
  for (let i = 0; i < pontuacoes.length; i++) {
    const x = padding + (i / (pontuacoes.length - 1)) * graficoWidth;
    const y = canvas.height - padding - (pontuacoes[i] / maxPontos) * graficoHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Pontos
  for (let i = 0; i < pontuacoes.length; i++) {
    const x = padding + (i / (pontuacoes.length - 1)) * graficoWidth;
    const y = canvas.height - padding - (pontuacoes[i] / maxPontos) * graficoHeight;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffd966';
    ctx.fill();
    ctx.strokeStyle = '#0a0f1e';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pontuacoes[i], x, y - 12);
  }

  // Rótulos
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < pontuacoes.length; i++) {
    const x = padding + (i / (pontuacoes.length - 1)) * graficoWidth;
    ctx.fillText(`P${i+1}`, x, canvas.height - padding + 20);
  }

  ctx.fillStyle = '#ffd966';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Evolução da Pontuação por Partida', canvas.width/2, 20);
}
