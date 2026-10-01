// js/modules/medals.js
import { db } from '../config/firebase.js';
import { state } from './state.js';
import { exibirToast } from './ui.js';

// ============================================================
// DEFINIÇÃO DAS MEDALHAS (com descrições)
// ============================================================

export const MEDALS = [
  { 
    id: 'iniciante', 
    nome: 'Iniciante', 
    icone: '⭐', 
    descricao: 'Jogue sua primeira partida completa.',
    condicao: (dados) => dados.totalPartidas >= 1 
  },
  { 
    id: 'bronze', 
    nome: 'Bronze', 
    icone: '🥉', 
    descricao: 'Alcance 1000 pontos em uma única partida.',
    condicao: (dados) => dados.melhorPontuacao >= 1000 
  },
  { 
    id: 'prata', 
    nome: 'Prata', 
    icone: '🥈', 
    descricao: 'Alcance 1500 pontos em uma única partida.',
    condicao: (dados) => dados.melhorPontuacao >= 1500 
  },
  { 
    id: 'ouro', 
    nome: 'Ouro', 
    icone: '🥇', 
    descricao: 'Alcance 1900 pontos em uma única partida.',
    condicao: (dados) => dados.melhorPontuacao >= 1900 
  },
  { 
    id: 'perfeicao', 
    nome: 'Perfeição', 
    icone: '💯', 
    descricao: 'Acerte todas as 20 perguntas em uma partida.',
    condicao: (dados) => dados.melhorAcertos === 20 
  },
  { 
    id: 'velocista', 
    nome: 'Velocista', 
    icone: '⚡', 
    descricao: 'Faça uma partida com menos de 1,5s por pergunta.',
    condicao: (dados) => dados.melhorVelocidade < 1.5 
  },
  { 
    id: 'determinado', 
    nome: 'Determinado', 
    icone: '🔥', 
    descricao: 'Jogue 10 partidas completas.',
    condicao: (dados) => dados.totalPartidas >= 10 
  },
  { 
    id: 'campeao', 
    nome: 'Campeão', 
    icone: '🏆', 
    descricao: 'Fique em 1º lugar no ranking da fase.',
    condicao: (dados) => dados.primeiroLugar === true 
  },
  { 
    id: 'evolucao', 
    nome: 'Evolução', 
    icone: '📈', 
    descricao: 'Melhore 500 pontos entre duas partidas.',
    condicao: (dados) => dados.evolucao500 === true 
  },
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
// EXIBIÇÃO DE MEDALHAS (com contador)
// ============================================================

export function atualizarExibicaoMedalhas() {
  const container = document.getElementById('medalhas-container');
  if (!container) return;

  const medalhas = carregarMedalhasLocal();
  const total = MEDALS.length;
  const desbloqueadas = medalhas.length;

  // Atualiza o contador no título
  const contador = document.getElementById('medalhas-contador');
  if (contador) {
    contador.textContent = `(${desbloqueadas} de ${total})`;
  }

  if (medalhas.length === 0) {
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

// ============================================================
// MODAL "VER TODAS AS MEDALHAS"
// ============================================================

export function abrirModalMedalhas() {
  const modal = document.getElementById('modal-medalhas');
  const container = document.getElementById('medalhas-modal-conteudo');
  if (!modal || !container) {
    console.warn('Modal de medalhas não encontrado no DOM.');
    return;
  }

  const medalhas = carregarMedalhasLocal();
  const desbloqueadasMap = new Map(medalhas.map(m => [m.id, m]));

  let html = '';

  // ===== Seção: Desbloqueadas =====
  const desbloqueadas = MEDALS.filter(m => desbloqueadasMap.has(m.id));
  const bloqueadas = MEDALS.filter(m => !desbloqueadasMap.has(m.id));

  html += `<div style="margin-bottom: 24px;">`;
  html += `<h3 style="color: #4ade80; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">✅ Desbloqueadas (${desbloqueadas.length})</h3>`;

  if (desbloqueadas.length === 0) {
    html += `<p style="color: var(--texto-secundario); font-size: 14px; font-style: italic;">Nenhuma medalha desbloqueada ainda.</p>`;
  } else {
    html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">`;
    desbloqueadas.forEach(m => {
      const dados = desbloqueadasMap.get(m.id);
      const dataStr = dados?.data ? new Date(dados.data).toLocaleDateString('pt-BR') : '';
      html += `
        <div style="background: rgba(74, 222, 128, 0.08); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 12px 16px; display: flex; gap: 12px; align-items: flex-start;">
          <span style="font-size: 32px; line-height: 1;">${m.icone}</span>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--texto-principal); font-size: 15px;">${m.nome}</div>
            <div style="font-size: 12px; color: var(--texto-secundario); margin-top: 2px;">${m.descricao}</div>
            ${dataStr ? `<div style="font-size: 11px; color: #4ade80; margin-top: 4px;">🏅 ${dataStr}</div>` : ''}
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  html += `</div>`;

  // ===== Seção: Bloqueadas =====
  html += `<div>`;
  html += `<h3 style="color: #94a3b8; font-size: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">🔒 Bloqueadas (${bloqueadas.length})</h3>`;

  if (bloqueadas.length === 0) {
    html += `<p style="color: #facc15; font-size: 14px; font-weight: 600;">🎉 Parabéns! Você desbloqueou TODAS as medalhas!</p>`;
  } else {
    html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px;">`;
    bloqueadas.forEach(m => {
      html += `
        <div style="background: var(--bg-card-hover); border: 1px solid var(--borda-card); border-radius: 12px; padding: 12px 16px; display: flex; gap: 12px; align-items: flex-start; opacity: 0.85;">
          <span style="font-size: 32px; line-height: 1; filter: grayscale(1); opacity: 0.5;">${m.icone}</span>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: var(--texto-secundario); font-size: 15px;">${m.nome}</div>
            <div style="font-size: 12px; color: var(--texto-secundario); margin-top: 2px;">${m.descricao}</div>
          </div>
        </div>
      `;
    });
    html += `</div>`;
  }
  html += `</div>`;

  container.innerHTML = html;
  modal.style.display = 'flex';
}

export function fecharModalMedalhas() {
  const modal = document.getElementById('modal-medalhas');
  if (modal) modal.style.display = 'none';
}

// ============================================================
// POPUP DE NOVA MEDALHA (celebração)
// ============================================================

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

// ============================================================
// EXPOSIÇÃO GLOBAL (para uso em onclick no HTML)
// ============================================================
window.fecharModalMedalhas = fecharModalMedalhas;
