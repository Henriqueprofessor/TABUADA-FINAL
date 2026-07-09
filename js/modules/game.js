import { state } from './state.js';
import { exibirToast, exibirModalResultados } from './ui.js';
import { lerDados, atualizarDados, removerDados } from './db.js';
import { tocarSom } from './sound.js';
import { calcularRankingFase, atualizarInfoAluno } from './ranking.js';
import { atualizarRecordeGeral } from './config.js';
import { verificarEConcederMedalhas, atualizarExibicaoMedalhas } from './medals.js';
import { concederEstrelas } from './estrelas.js';

// ============================================================
// GERAR PERGUNTAS COM DISTRATORES INTELIGENTES
// ============================================================

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

  function gerarDistratoresInteligentes(correta, count = 3) {
    const distratores = new Set();
    const margem = Math.max(2, Math.round(correta * 0.2));
    let tentativas = 0;
    while (distratores.size < count && tentativas < 200) {
      tentativas++;
      let offset = 0;
      const r = Math.random();
      if (r < 0.4) offset = Math.floor(Math.random() * (margem + 1));
      else if (r < 0.7) offset = Math.floor(Math.random() * (margem * 2 + 1)) + margem;
      else offset = Math.floor(Math.random() * (margem * 4 + 1)) + margem * 2;
      const sinal = Math.random() < 0.5 ? 1 : -1;
      let candidato = correta + sinal * offset;
      candidato = Math.max(0, Math.min(100, candidato));
      if (candidato !== correta && !distratores.has(candidato)) {
        distratores.add(candidato);
      }
    }
    while (distratores.size < count) {
      let candidato = Math.floor(Math.random() * 101);
      if (candidato !== correta && !distratores.has(candidato)) {
        distratores.add(candidato);
      }
    }
    let resultado = Array.from(distratores);
    shuffle(resultado);
    return resultado;
  }

  const resultado = selecionadas.map((p) => {
    const correta = p.a * p.b;
    const distratores = gerarDistratoresInteligentes(correta, 3);
    let opcoes = [correta, ...distratores];
    opcoes.sort((a, b) => a - b);
    const posicaoCorreta = opcoes.indexOf(correta) + 1;
    return {
      a: p.a,
      b: p.b,
      opts: opcoes,
      posicaoCorreta: posicaoCorreta
    };
  });

  return resultado;
}

// ============================================================
// INICIAR PARTIDA
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
    state.timerPergunta = null;
    state.historicoPerguntas = [];

    document.body.classList.add('em-jogo');

    // ===== ELEMENTOS DO JOGO COM VERIFICAÇÕES =====
    const jogoArea = document.getElementById('jogo-area');
    const aguardando = document.getElementById('aguardando-aluno');
    const btnRanking = document.getElementById('btn-ranking-aluno');
    const btnRankingPontos = document.getElementById('btn-ranking-pontos-aluno');
    const principal = document.getElementById('tela-aluno-principal');
    const detalhes = document.getElementById('tela-aluno-detalhes');

    if (jogoArea) jogoArea.classList.remove('hidden');
    if (aguardando) aguardando.classList.add('hidden');
    if (btnRanking) btnRanking.disabled = true;
    if (btnRankingPontos) btnRankingPontos.disabled = true;
    if (principal) principal.style.display = 'none';
    if (detalhes) detalhes.style.display = 'none';

    proximaPergunta();
  } catch (error) {
    console.error('Erro ao iniciar partida:', error);
    exibirToast('❌ Erro ao iniciar partida. Tente novamente.');
    state.jogoAtivo = false;
    document.body.classList.remove('em-jogo');
    const principal = document.getElementById('tela-aluno-principal');
    if (principal) principal.style.display = 'block';
  }
}

// ============================================================
// PRÓXIMA PERGUNTA
// ============================================================

function proximaPergunta() {
  atualizarInfoAluno();

  if (state.perguntaIdx >= 20) {
    finalizarPartida();
    return;
  }

  try {
    const p = state.perguntas[state.perguntaIdx];
    const perguntaEl = document.getElementById('pergunta');
    if (perguntaEl) perguntaEl.innerText = `${p.a} x ${p.b} = ?`;
    
    const btns = document.querySelectorAll('.opcao-vertical');
    p.opts.forEach((o, i) => {
      if (btns[i]) {
        btns[i].innerText = o;
        btns[i].disabled = false;
        btns[i].dataset.correct = (i + 1 === p.posicaoCorreta) ? 'true' : 'false';
        btns[i].classList.remove('correto', 'errado', 'destaque-correto');
      }
    });
    
    const perguntaNum = document.getElementById('pergunta-num');
    if (perguntaNum) perguntaNum.innerText = state.perguntaIdx + 1;
    
    iniciarTimerPergunta();
  } catch (error) {
    console.error('Erro ao exibir pergunta:', error);
    exibirToast('❌ Erro ao carregar pergunta. Reinicie a partida.');
  }
}

// ============================================================
// TIMER DA PERGUNTA (10 segundos)
// ============================================================

function iniciarTimerPergunta() {
  if (state.timerPergunta) {
    clearInterval(state.timerPergunta);
    state.timerPergunta = null;
  }

  state.tempoRestantePergunta = 10;
  const barra = document.getElementById('progresso-tempo');

  state.timerPergunta = setInterval(() => {
    state.tempoRestantePergunta -= 0.1;
    if (state.tempoRestantePergunta < 0) state.tempoRestantePergunta = 0;
    if (barra) {
      const pct = (state.tempoRestantePergunta / 10) * 100;
      barra.style.width = pct + '%';
      barra.setAttribute('aria-valuenow', Math.round(pct));
    }
    if (state.tempoRestantePergunta <= 0) {
      clearInterval(state.timerPergunta);
      state.timerPergunta = null;
      responder(-1);
    }
  }, 100);
}

// ============================================================
// RESPONDER (exportado globalmente)
// ============================================================

export async function responder(idx) {
  if (!state.jogoAtivo || state.partidaFinalizada) return;

  if (state.timerPergunta) {
    clearInterval(state.timerPergunta);
    state.timerPergunta = null;
  }

  try {
    const btns = document.querySelectorAll('.opcao-vertical');
    btns.forEach(b => b.disabled = true);

    const tempoGasto = 10 - Math.max(0, state.tempoRestantePergunta);
    state.tempoTotalPartida += tempoGasto;

    const p = state.perguntas[state.perguntaIdx];
    const correta = p.a * p.b;
    let acertou = false;
    let respostaEscolhida = null;

    if (idx !== -1) {
      const resp = parseInt(btns[idx].innerText);
      respostaEscolhida = resp;
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
      respostaEscolhida = null;
    }

    state.historicoPerguntas.push({
      pergunta: `${p.a} x ${p.b}`,
      respostaEscolhida: respostaEscolhida,
      respostaCorreta: correta,
      acertou: acertou
    });

    if (idx !== -1) {
      const btnEscolhido = btns[idx];
      if (acertou) {
        btnEscolhido.classList.add('correto');
      } else {
        btnEscolhido.classList.add('errado');
        for (let i = 0; i < btns.length; i++) {
          if (parseInt(btns[i].innerText) === correta) {
            btns[i].classList.add('destaque-correto');
            break;
          }
        }
      }
    } else {
      for (let i = 0; i < btns.length; i++) {
        if (parseInt(btns[i].innerText) === correta) {
          btns[i].classList.add('destaque-correto');
          break;
        }
      }
    }

    const pontuacaoAcumulada = document.getElementById('pontuacao-acumulada');
    if (pontuacaoAcumulada) pontuacaoAcumulada.innerText = state.pontosPartida;
    
    state.perguntaIdx++;
    atualizarInfoAluno();

    // ===== FEEDBACK SEPARADO =====
    let delay = 0.5;
    if (idx === -1) {
      delay = state.tempoFeedbackErro * 1000;
    } else if (acertou) {
      delay = state.tempoFeedbackAcerto * 1000;
    } else {
      delay = state.tempoFeedbackErro * 1000;
    }

    setTimeout(() => {
      btns.forEach(b => {
        b.classList.remove('correto', 'errado', 'destaque-correto');
        b.disabled = false;
      });

      if (state.perguntaIdx >= 20) {
        finalizarPartida();
      } else {
        proximaPergunta();
      }
    }, delay);

    await atualizarPontuacaoParcial();
  } catch (error) {
    console.error('Erro ao responder:', error);
    exibirToast('❌ Erro ao processar resposta. Tente novamente.');
  }
}

window.responder = responder;

// ============================================================
// ATUALIZAR PONTUAÇÃO PARCIAL
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
  }
}

// ============================================================
// FINALIZAR PARTIDA
// ============================================================

async function finalizarPartida() {
  if (state.partidaFinalizada) return;
  state.partidaFinalizada = true;
  state.jogoAtivo = false;

  document.body.classList.remove('em-jogo');

  // ===== RE-EXIBIR A TELA PRINCIPAL =====
  const principal = document.getElementById('tela-aluno-principal');
  const detalhes = document.getElementById('tela-aluno-detalhes');
  const jogoArea = document.getElementById('jogo-area');
  const aguardando = document.getElementById('aguardando-aluno');
  const btnRanking = document.getElementById('btn-ranking-aluno');
  const btnRankingPontos = document.getElementById('btn-ranking-pontos-aluno');

  if (principal) principal.style.display = 'block';
  if (detalhes) detalhes.style.display = 'none';
  if (jogoArea) jogoArea.classList.add('hidden');
  if (aguardando) aguardando.classList.remove('hidden');
  if (btnRanking) btnRanking.disabled = false;
  if (btnRankingPontos) btnRankingPontos.disabled = false;

  try {
    const fase = state.estadoAtual.fase;
    const ref = `copaV2/resultados/${fase}/${state.alunoId}`;
    const partidas = await lerDados(ref) || [];
    const novaPartida = {
      pontos: state.pontosPartida,
      acertos: state.acertosPartida,
      tempo: state.tempoTotalPartida
    };
    partidas.push(novaPartida);
    await atualizarDados(ref, partidas);
    await removerDados(`copaV2/resultados_temp/${fase}/${state.alunoId}`);

    if (state.acertosPartida > 0 && state.tempoTotalPartida > 0) {
      const precisao = (state.acertosPartida / 20) * 100;
      const velocidade = state.tempoTotalPartida / state.acertosPartida;
      const partidaIndex = partidas.length - 1;
      await atualizarRecordeGeral(state.alunoId, velocidade, precisao, fase, partidaIndex);
    }

    await verificarEConcederMedalhas();
    atualizarExibicaoMedalhas();
    await atualizarInfoAluno();

    // ===== CONCEDER ESTRELAS =====
    try {
      const resultadosFase = state.estadoAtual?.resultados?.[fase] || {};
      let ranking = [];
      for (const [id, partidas] of Object.entries(resultadosFase)) {
        if (partidas && partidas.length > 0) {
          const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
          ranking.push({ id, pontos: melhor.pontos });
        }
      }
      ranking.sort((a, b) => b.pontos - a.pontos);
      const posicaoAtual = ranking.findIndex(p => p.id === state.alunoId) + 1;

      await concederEstrelas(state.alunoId, 'partida_completa', state.configEstrelas.acoes.partida_completa, fase, partidas.length - 1);

      if (state.acertosPartida === 18 || state.acertosPartida === 19) {
        await concederEstrelas(state.alunoId, 'acertos_18_19', state.configEstrelas.acoes.acertos_18_19, fase, partidas.length - 1);
      }
      if (state.acertosPartida === 20) {
        await concederEstrelas(state.alunoId, 'acertos_20', state.configEstrelas.acoes.acertos_20, fase, partidas.length - 1);
      }

      if (state.posicaoAntesPartida !== null && posicaoAtual < state.posicaoAntesPartida) {
        await concederEstrelas(state.alunoId, 'subiu_ranking', state.configEstrelas.acoes.subiu_ranking, fase, partidas.length - 1);
      }

      let melhorPontuacaoAnterior = 0;
      if (partidas.length > 1) {
        const anteriores = partidas.slice(0, -1);
        melhorPontuacaoAnterior = Math.max(...anteriores.map(p => p.pontos || 0));
      }
      if (state.pontosPartida > melhorPontuacaoAnterior) {
        await concederEstrelas(state.alunoId, 'recorde_pessoal', state.configEstrelas.acoes.recorde_pessoal, fase, partidas.length - 1);
      }
    } catch (e) {
      console.warn('Erro ao conceder estrelas:', e);
    }

    const resultadosFaseFinal = state.estadoAtual?.resultados?.[fase] || {};
    let rankingFinal = [];
    for (const [id, partidas] of Object.entries(resultadosFaseFinal)) {
      if (partidas && partidas.length > 0) {
        const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
        rankingFinal.push({ id, pontos: melhor.pontos });
      }
    }
    rankingFinal.sort((a, b) => b.pontos - a.pontos);
    const posicaoAtualFinal = rankingFinal.findIndex(p => p.id === state.alunoId) + 1;

    let posicaoAnterior = state.posicaoAntesPartida || null;
    let ultimaPartida = null;
    if (partidas.length > 1) {
      ultimaPartida = partidas[partidas.length - 2];
    }

    const dadosModal = {
      posicao: posicaoAtualFinal > 0 ? posicaoAtualFinal : 0,
      posicaoAnterior: posicaoAnterior,
      pontos: state.pontosPartida,
      acertos: state.acertosPartida,
      tempoTotal: state.tempoTotalPartida,
      ultimaPartida: ultimaPartida,
      fase: fase,
      totalPartidas: partidas.length,
      ranking: rankingFinal,
      id: state.alunoId,
      nome: state.alunoNome,
      turma: state.alunoTurma,
      historico: state.historicoPerguntas
    };

    exibirModalResultados(dadosModal);
    desenharGraficoEvolucao();

    exibirToast(`✅ Partida finalizada! Pontos: ${state.pontosPartida}`);

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

  ctx.strokeStyle = '#4a5568';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, canvas.height - padding);
  ctx.lineTo(canvas.width - padding, canvas.height - padding);
  ctx.stroke();

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
