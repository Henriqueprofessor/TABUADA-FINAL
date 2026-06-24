// js/models/game.js
import { MODALIDADE_CONFIG, TOTAL_PERGUNTAS } from '../utils/constants.js';

let poolCache = {};

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
    perguntas,
    indice: 0,
    pontos: 0,
    acertos: 0,
    tempoTotal: 0,
    tempoRestantePergunta: 10,
    finalizada: false
  };
}

export function responder(partida, idx) {
  const p = partida.perguntas[partida.indice];
  const resp = parseInt(document.querySelectorAll('.opcao')[idx].innerText); // dependência de UI, melhor passar o valor
  const correta = p.a * p.b;
  let ganhou = 0;
  if (resp === correta) {
    partida.acertos++;
    ganhou = Math.round(100 * (partida.tempoRestantePergunta / 10));
    partida.pontos += ganhou;
  }
  partida.tempoTotal += (10 - partida.tempoRestantePergunta);
  partida.indice++;
  return { ganhou, correta };
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
