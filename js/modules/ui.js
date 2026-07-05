// js/modules/ui.js
import { state } from './state.js';

// ===== CONTROLE DE TELA =====
export function mostrarTela(tipo) {
  document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
  if (tipo === 'professor') document.getElementById('painel-professor').classList.remove('hidden');
  else if (tipo === 'aluno') document.getElementById('tela-aluno').classList.remove('hidden');
  else if (tipo === 'projecao') document.getElementById('tela-torcida').classList.remove('hidden');
  else {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('hidden'));
    document.getElementById('tela-aluno')?.classList.add('hidden');
    document.getElementById('painel-professor')?.classList.add('hidden');
    document.getElementById('tela-torcida')?.classList.add('hidden');
  }
}

// ===== TOAST =====
export function exibirToast(mensagem) {
  const t = document.getElementById('toast');
  if (t) {
    t.innerText = mensagem;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
  }
}

export function exibirToastReconexao() {
  const t = document.getElementById('toast');
  if (t) {
    t.innerText = '🔄 Conexão restaurada! Dados sincronizados.';
    t.classList.remove('hidden');
    t.style.background = '#2e7d32';
    setTimeout(() => {
      t.classList.add('hidden');
      t.style.background = '';
    }, 4000);
  }
}

// ===== TIMER =====
export function atualizarTimerFase(milissegundos) {
  const segundos = Math.floor(milissegundos / 1000);
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
  const timerDisplay = document.getElementById('timer-fase');
  const torcidaTimer = document.getElementById('torcida-timer');
  const alunoTimer = document.getElementById('timer-fase-aluno');
  if (timerDisplay) timerDisplay.innerText = timeStr;
  if (torcidaTimer) torcidaTimer.innerText = timeStr;
  if (alunoTimer) {
    alunoTimer.innerText = `⏱️ Tempo: ${timeStr}`;
    if (segundos < 60) alunoTimer.classList.add('urgente');
    else alunoTimer.classList.remove('urgente');
  }
}

// ===== MODAL =====
export function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}

export function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

export function atualizarDisplayVersao(versao) {
  const el = document.getElementById('version-number');
  if (el) el.textContent = versao || '--';
}

// ===== BADGE DE CONEXÃO =====
export function createConnectionBadge() {
  let badge = document.getElementById('connection-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'connection-badge';
    badge.className = 'connection-badge offline';
    badge.innerHTML = '⚡ Conectando...';
    document.body.prepend(badge);
  }
  return badge;
}

export function updateConnectionBadge(online) {
  const badge = createConnectionBadge();
  if (online) {
    badge.className = 'connection-badge online';
    badge.innerHTML = '🟢 Conectado';
  } else {
    badge.className = 'connection-badge offline';
    badge.innerHTML = '🔴 Desconectado';
  }
}

export function initConnectionUI(onConnectionChangeCallback) {
  createConnectionBadge();
  onConnectionChangeCallback(updateConnectionBadge);
}

// ===== OVERLAY DE CARREGAMENTO =====
export function mostrarCarregando() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
  state.carregando = true;
}

export function esconderCarregando() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
  state.carregando = false;
}

export function exibirErroCarregamento() {
  const errorEl = document.getElementById('loading-error');
  if (errorEl) {
    errorEl.classList.remove('hidden');
  }
}

// ===== CONTROLE DE TEMA (claro/escuro) =====
const TEMA_KEY = 'copa_theme';

export function aplicarTema() {
  let tema = localStorage.getItem(TEMA_KEY);
  if (!tema) {
    tema = 'tema-escuro';
    localStorage.setItem(TEMA_KEY, tema);
  }
  document.body.className = tema;
  atualizarIconeTema(tema);
  carregarCorPrimaria();
}

export function alternarTema() {
  const atual = document.body.className;
  const novoTema = atual === 'tema-escuro' ? 'tema-claro' : 'tema-escuro';
  document.body.className = novoTema;
  localStorage.setItem(TEMA_KEY, novoTema);
  atualizarIconeTema(novoTema);
  carregarCorPrimaria();
}

function atualizarIconeTema(tema) {
  const btn = document.getElementById('btn-tema');
  if (!btn) return;
  if (tema === 'tema-escuro') {
    btn.textContent = '☀️';
    btn.title = 'Alternar para tema claro';
  } else {
    btn.textContent = '🌙';
    btn.title = 'Alternar para tema escuro';
  }
}

// ===== COR PRIMÁRIA =====
const COR_PRIMARIA_KEY = 'copa_cor_primaria';

export const CORES_DISPONIVEIS = {
  '#3b82f6': { nome: 'Azul', icone: '🔵' },
  '#22c55e': { nome: 'Verde', icone: '🟢' },
  '#8b5cf6': { nome: 'Roxo', icone: '🟣' },
  '#ef4444': { nome: 'Vermelho', icone: '🔴' },
  '#f59e0b': { nome: 'Laranja', icone: '🟠' },
  '#eab308': { nome: 'Amarelo', icone: '🟡' },
  '#ec4899': { nome: 'Rosa', icone: '🩷' },
  '#64748b': { nome: 'Cinza', icone: '⚫' }
};

export function carregarCorPrimaria() {
  let cor = localStorage.getItem(COR_PRIMARIA_KEY);
  if (!cor) {
    cor = '#3b82f6';
    localStorage.setItem(COR_PRIMARIA_KEY, cor);
  }
  aplicarCorPrimaria(cor);
  document.querySelectorAll('.btn-cor').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.cor === cor);
  });
}

export function aplicarCorPrimaria(cor) {
  localStorage.setItem(COR_PRIMARIA_KEY, cor);
  document.documentElement.style.setProperty('--cor-primaria', cor);
  document.querySelectorAll('.btn-primary, .tab-btn.active, .btn-cor.selected').forEach(el => {});
  document.querySelectorAll('.btn-cor').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.cor === cor);
  });
}

export function definirCorPrimaria(cor) {
  if (!CORES_DISPONIVEIS[cor]) return;
  aplicarCorPrimaria(cor);
  exibirToast(`🎨 Cor alterada para ${CORES_DISPONIVEIS[cor].nome}!`);
}

// ===== BANNER DE AVISO =====
export function atualizarBannerAviso(aviso) {
  if (!aviso || !aviso.mensagem) {
    const banner = document.getElementById('banner-aviso');
    if (banner) banner.remove();
    return;
  }

  let banner = document.getElementById('banner-aviso');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'banner-aviso';
    banner.className = 'banner-aviso';
    document.body.prepend(banner);
  }

  banner.innerHTML = `
    <span class="banner-aviso-icone">📢</span>
    <span class="banner-aviso-texto">${aviso.mensagem}</span>
  `;
}
