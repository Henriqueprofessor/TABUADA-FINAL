// js/modules/medals.js
import { db } from '../config/firebase.js';
import { state } from './state.js';
import { exibirToast } from './ui.js';

// ============================================================
// DEFINIÇÃO DAS MEDALHAS
// ============================================================

export const MEDALS = [
  { id: 'iniciante', nome: 'Iniciante', icone: '⭐', condicao: (dados) => dados.totalPartidas >= 1 },
  { id: 'bronze', nome: 'Bronze', icone: '🥉', condicao: (dados) => dados.melhorPontuacao >= 1000 },
  { id: 'prata', nome: 'Prata', icone: '🥈', condicao: (dados) => dados.melhorPontuacao >= 1500 },
  { id: 'ouro', nome: 'Ouro', icone: '🥇', condicao: (dados) => dados.melhorPontuacao >= 1900 },
  { id: 'perfeicao', nome: 'Perfeição', icone: '💯', condicao: (dados) => dados.melhorAcertos === 20 },
  { id: 'velocista', nome: 'Velocista', icone: '⚡', condicao: (dados) => dados.melhorVelocidade < 1.5 },
  { id: 'determinado', nome: 'Determinado', icone: '🔥', condicao: (dados) => dados.totalPartidas >= 10 },
  { id: 'campeao', nome: 'Campeão', icone: '🏆', condicao: (dados) => dados.primeiroLugar === true },
  { id: 'evolucao', nome: 'Evolução', icone: '📈', condicao: (dados) => dados.evolucao500 === true },
];

// ============================================================
// FUNÇÕES DE PERSISTÊNCIA
// ============================================================

const MEDALS_STORAGE_KEY = 'copa_medals';

export function carregarMedalhasLocal() {
  try {
    const data = localStorage.getItem(MEDALS_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

export function salvarMedalhasLocal(medalhas) {
  try {
    localStorage.setItem(MEDALS_STORAGE_KEY, JSON.stringify(medalhas));
  } catch (e) {}
}

export async function carregarMedalhasFirebase(alunoId) {
  if (!alunoId) return null;
  try {
    const snap = await db.ref(`copaV2/medalhas/${alunoId}`).once('value');
    return snap.val() || null;
  } catch (e) {
    console.warn('Erro ao carregar medalhas do Firebase:', e);
    return null;
  }
}

export async function salvarMedalhasFirebase(alunoId, medalhas) {
  if (!alunoId) return;
  try {
    await db.ref(`copaV2/medalhas/${alunoId}`).set(medalhas);
  } catch (e) {
    console.warn('Erro ao salvar medalhas no Firebase:', e);
  }
}

// ============================================================
// VERIFICAR E CONCEDER NOVAS MEDALHAS
// ============================================================

export function coletarDadosAluno() {
  const fase = state.estadoAtual?.fase || 1;
  const resultados = state.estadoAtual?.resultados?.[fase]?.[state.alunoId] || [];
  const totalPartidas = resultados.length;

  let melhorPontuacao = 0;
  let melhorAcertos = 0;
  let melhorVelocidade = Infinity;
  let primeiraPontuacao = 0;
  let ultimaPontuacao = 0;

  if (totalPartidas > 0) {
    const pontuacoes = resultados.map(p => p.pontos || 0);
    melhorPontuacao = Math.max(...pontuacoes);
    primeiraPontuacao = pontuacoes[0] || 0;
    ultimaPontuacao = pontuacoes[pontuacoes.length - 1] || 0;

    const acertos = resultados.map(p => p.acertos || 0);
    melhorAcertos = Math.max(...acertos);

    const velocidades = resultados
      .filter(p => p.acertos > 0 && p.tempo > 0)
      .map(p => p.tempo / p.acertos);
    if (velocidades.length > 0) {
      melhorVelocidade = Math.min(...velocidades);
    } else {
      melhorVelocidade = Infinity;
    }
  }

  const evolucao500 = (ultimaPontuacao - primeiraPontuacao) >= 500;
  let primeiroLugar = false;
  if (state.rankingPontosAtivo && state.estadoAtual) {
    const faseAtual = state.estadoAtual.fase;
    const ranking = calcularRankingFase(faseAtual);
    if (ranking.length > 0 && ranking[0].id === state.alunoId) {
      primeiroLugar = true;
    }
  }

  return {
    totalPartidas,
    melhorPontuacao,
    melhorAcertos,
    melhorVelocidade,
    evolucao500,
    primeiroLugar,
  };
}

async function calcularRankingFase(fase) {
  const { calcularRankingFase: calc } = await import('./ranking.js');
  return calc(fase);
}

export async function verificarEConcederMedalhas() {
  if (!state.alunoId) return;

  const dados = coletarDadosAluno();
  const medalhasAtuais = carregarMedalhasLocal();
  const novasMedalhas = [];

  for (const medal of MEDALS) {
    const jaTem = medalhasAtuais.some(m => m.id === medal.id);
    if (!jaTem && medal.condicao(dados)) {
      novasMedalhas.push({
        id: medal.id,
        nome: medal.nome,
        icone: medal.icone,
        data: new Date().toISOString(),
      });
    }
  }

  if (novasMedalhas.length > 0) {
    const todasMedalhas = [...medalhasAtuais, ...novasMedalhas];
    salvarMedalhasLocal(todasMedalhas);
    await salvarMedalhasFirebase(state.alunoId, todasMedalhas);

    for (const medal of novasMedalhas) {
      exibirToast(`${medal.icone} NOVA CONQUISTA! Você ganhou a medalha "${medal.nome}"!`, 'sucesso');
      mostrarPopupMedalha(medal);
    }

    atualizarExibicaoMedalhas();
  }

  return novasMedalhas;
}

// ============================================================
// EXIBIÇÃO DE MEDALHAS (REFATORADO COM TEMPLATES)
// ============================================================

export function atualizarExibicaoMedalhas() {
  const container = document.getElementById('medalhas-container');
  if (!container) return;

  const medalhas = carregarMedalhasLocal();
  if (medalhas.length === 0) {
    // Usa template vazio
    const template = document.getElementById('template-medalhas-vazio');
    if (template) {
      container.innerHTML = '';
      container.appendChild(template.content.cloneNode(true));
    } else {
      container.innerHTML = '<p style="color: #94a3b8; font-size: 14px;">Nenhuma conquista ainda. Continue jogando!</p>';
    }
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'medalhas-grid';
  const itemTemplate = document.getElementById('template-medalha-item');

  for (const medal of medalhas) {
    if (itemTemplate) {
      const clone = itemTemplate.content.cloneNode(true);
      const icone = clone.querySelector('.medalha-icone');
      const nome = clone.querySelector('.medalha-nome');
      const item = clone.querySelector('.medalha-item');
      if (icone) icone.textContent = medal.icone;
      if (nome) nome.textContent = medal.nome;
      if (item) item.title = `${medal.nome} - ${new Date(medal.data).toLocaleDateString('pt-BR')}`;
      grid.appendChild(clone);
    } else {
      // Fallback
      const div = document.createElement('div');
      div.className = 'medalha-item';
      div.title = `${medal.nome} - ${new Date(medal.data).toLocaleDateString('pt-BR')}`;
      div.innerHTML = `<span class="medalha-icone">${medal.icone}</span><span class="medalha-nome">${medal.nome}</span>`;
      grid.appendChild(div);
    }
  }

  container.innerHTML = '';
  container.appendChild(grid);
}

function mostrarPopupMedalha(medal) {
  let popup = document.getElementById('medalha-popup');
  if (popup) popup.remove();

  popup = document.createElement('div');
  popup.id = 'medalha-popup';
  popup.className = 'medalha-popup';
  popup.innerHTML = `
    <div class="medalha-popup-content">
      <div class="medalha-popup-icone">${medal.icone}</div>
      <div class="medalha-popup-titulo">🏅 NOVA CONQUISTA!</div>
      <div class="medalha-popup-nome">${medal.nome}</div>
      <div class="medalha-popup-desc">Você desbloqueou esta medalha!</div>
      <button class="btn-primary" onclick="this.closest('#medalha-popup').remove()">🎉 Que legal!</button>
    </div>
  `;
  document.body.appendChild(popup);

  setTimeout(() => {
    if (popup && popup.parentNode) popup.remove();
  }, 6000);
}
