// js/modules/game.js
import { state } from './state.js';
import { exibirToast } from './ui.js';
import { lerDados, atualizarDados, removerDados } from './db.js';
import { tocarSom } from './sound.js';
import { calcularRankingFase } from './ranking.js';
import { atualizarRecordeGeral } from './config.js';
import { verificarEConcederMedalhas, atualizarExibicaoMedalhas } from './medals.js';

// Gerar perguntas
export function gerarPerguntas(modalidade, fase) {
  const configs = {
    "2-5": { min: 2, max: 5 },
    "6-9": { min: 6, max: 9 },
    "0-10": { min: 0, max: 10 }
  };
  const config = configs[modalidade];
  if (!config) return [];
  let base = [];
  for (let i = config.min; i <= config.max; i++) base.push(i);
  const H = (fase === 5) ? [6,7,8,9] : [];
  let pool = [];
  const used = new Set();
  if (fase === 5) {
    for (let a of base) for (let b of H) { const key = `${a}x${b}`; if (!used.has(key)) { used.add(key); pool.push({a,b}); } }
    for (let a of H) for (let b of base) { const key = `${a}x${b}`; if (!used.has(key)) { used.add(key); pool.push({a,b}); } }
  } else {
    for (let a of base) for (let b of base) pool.push({a,b});
  }
  while (pool.length < 20) {
    const extra = pool.slice(0, 20 - pool.length);
    pool = pool.concat(extra);
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
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
  const posicoes = [];
  for (let i = 0; i < 5; i++) { posicoes.push(1,2,3,4); }
  shuffle(posicoes);
  const resultado = selecionadas.map((p, idx) => {
    const correta = p.a * p.b;
    const posAlvo = posicoes[idx];
    function gerarDistratoresParaPos(correta, pos) {
      let menores = [], maiores = [];
      for (let i = 0; i < 20; i++) {
        let d = Math.floor(Math.random() * correta);
        if (d !== correta && d >= 0 && !menores.includes(d)) menores.push(d);
      }
      menores.sort((a,b) => b - a);
      for (let i = 0; i < 20; i++) {
        let d = correta + Math.floor(Math.random() * 30) + 1;
        if (d !== correta && !maiores.includes(d)) maiores.push(d);
      }
      maiores.sort((a,b) => a - b);
      let escolhidos = [];
      if (pos === 1) {
        escolhidos = maiores.slice(0,3);
      } else if (pos === 4) {
        escolhidos = menores.slice(0,3);
      } else if (pos === 2) {
        let umMenor = menores.length > 0 ? menores[0] : Math.max(0, correta - 5);
        let doisMaiores = maiores.slice(0,2);
        escolhidos = [umMenor, ...doisMaiores];
      } else if (pos === 3) {
        let doisMenores = menores.slice(0,2);
        let umMaior = maiores.length > 0 ? maiores[0] : correta + 5;
        escolhidos = [...doisMenores, umMaior];
      }
      while (escolhidos.length < 3) {
        let d = Math.floor(Math.random() * 100);
        if (d !== correta && !escolhidos.includes(d) && d >= 0) escolhidos.push(d);
      }
      return escolhidos;
    }
    let novosDistratores = gerarDistratoresParaPos(correta, posAlvo);
    let novasOpcoes = [correta, ...novosDistratores];
    novasOpcoes.sort((a,b) => a - b);
    let tentativa = 0;
    while (novasOpcoes.indexOf(correta) + 1 !== posAlvo && tentativa < 20) {
      tentativa++;
      novosDistratores = gerarDistratoresParaPos(correta, posAlvo);
      novasOpcoes = [correta, ...novosDistratores];
      novasOpcoes.sort((a,b) => a - b);
    }
    return { a: p.a, b: p.b, opts: novasOpcoes, posicaoCorreta: posAlvo };
  });
  return resultado;
}

// Iniciar partida
export async function iniciarPartida() {
  if (state.jogoAtivo) return;
  if (!state.alunoId || !state.estadoAtual) {
    exibirToast('❌ Dados do aluno não disponíveis.');
    return;
  }
  if (state.estadoAtual.status !== 'em_andamento') { exibirToast('Fase inativa!'); return; }
  if (Date.now() >= state.estadoAtual.fim) { exibirToast('Tempo esgotado!'); return; }

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
}

function proximaPergunta() {
  if (state.perguntaIdx >= 20) { finalizarPartida(); return; }
  const p = state.perguntas[state.perguntaIdx];
  document.getElementById('pergunta').innerText = `${p.a} x ${p.b} = ?`;
  const btns = document.querySelectorAll('.opcao-vertical');
  p.opts.forEach((o, i) => {
    if (btns[i]) { btns[i].innerText = o; btns[i].disabled = false; }
  });
  document.getElementById('pergunta-num').innerText = state.perguntaIdx + 1;
  iniciarTimerPergunta();
}

function iniciarTimerPergunta() {
  state.tempoRestantePergunta = 10;
  const barra = document.getElementById('progresso-tempo');
  if (state.timerPergunta) clearInterval(state.timerPergunta);
  let inicio = performance.now();
  function atualizar(timestamp) {
    const decorrido = (timestamp - inicio) / 1000;
    state.tempoRestantePergunta = Math.max(0, 10 - decorrido);
    if (barra) barra.style.width = (state.tempoRestantePergunta * 10) + '%';
    if (state.tempoRestantePergunta > 0) {
      requestAnimationFrame(atualizar);
    } else {
      responder(-1);
    }
  }
  requestAnimationFrame(atualizar);
}

// Função responder (exportada globalmente)
export async function responder(idx) {
  if (!state.jogoAtivo || state.partidaFinalizada) return;
  if (state.timerPergunta) clearInterval(state.timerPergunta);
  const btns = document.querySelectorAll('.opcao-vertical');
  btns.forEach(b => b.disabled = true);
  const tempoGasto = 10 - Math.max(0, state.tempoRestantePergunta);
  state.tempoTotalPartida += tempoGasto;
  if (idx !== -1) {
    const resp = parseInt(btns[idx].innerText);
    const p = state.perguntas[state.perguntaIdx];
    if (resp === p.a * p.b) {
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
}

async function atualizarPontuacaoParcial() {
  if (!state.alunoId || !state.estadoAtual) return;
  const fase = state.estadoAtual.fase;
  await atualizarDados(`copaV2/resultados_temp/${fase}/${state.alunoId}`, {
    nome: state.alunoNome,
    turma: state.alunoTurma,
    pontos: state.pontosPartida,
    acertos: state.acertosPartida,
    tempo: state.tempoTotalPartida,
    perguntas: state.perguntaIdx,
    timestamp: Date.now()
  });
}

async function finalizarPartida() {
  if (state.partidaFinalizada) return;
  state.partidaFinalizada = true;
  state.jogoAtivo = false;
  document.body.classList.remove('em-jogo');
  document.getElementById('btn-ranking-aluno').disabled = false;
  document.getElementById('btn-ranking-pontos-aluno').disabled = false;
  document.getElementById('jogo-area').classList.add('hidden');
  document.getElementById('aguardando-aluno').classList.remove('hidden');

  const fase = state.estadoAtual.fase;
  const ref = `copaV2/resultados/${fase}/${state.alunoId}`;
  const partidas = await lerDados(ref) || [];
  partidas.push({ pontos: state.pontosPartida, acertos: state.acertosPartida, tempo: state.tempoTotalPartida });
  await atualizarDados(ref, partidas);
  await removerDados(`copaV2/resultados_temp/${fase}/${state.alunoId}`);

  if (state.acertosPartida > 0 && state.tempoTotalPartida > 0) {
    const precisao = (state.acertosPartida / 20) * 100;
    const velocidade = state.tempoTotalPartida / state.acertosPartida;
    const partidaIndex = partidas.length - 1;
    await atualizarRecordeGeral(state.alunoId, velocidade, precisao, fase, partidaIndex);
  }

  // === VERIFICAR MEDALHAS ===
  await verificarEConcederMedalhas();
  // Atualiza exibição das medalhas
  atualizarExibicaoMedalhas();

  // Atualiza o gráfico de evolução
  desenharGraficoEvolucao();

  // Exibir resultado
  exibirToast(`✅ Partida finalizada! Pontos: ${state.pontosPartida}`);
  const { atualizarInfoAluno } = await import('./ranking.js');
  atualizarInfoAluno();
}

// Exportar responder globalmente
window.responder = responder;

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

  // Linha de evolução
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

  // Pontos (bolinhas)
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

    // Valor acima do ponto
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pontuacoes[i], x, y - 12);
  }

  // Rótulos (P1, P2, ...)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < pontuacoes.length; i++) {
    const x = padding + (i / (pontuacoes.length - 1)) * graficoWidth;
    ctx.fillText(`P${i+1}`, x, canvas.height - padding + 20);
  }

  // Título
  ctx.fillStyle = '#ffd966';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Evolução da Pontuação por Partida', canvas.width/2, 20);
}
