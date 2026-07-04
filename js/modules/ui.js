import { state } from './state.js';

// Mostrar/ocultar telas
export function mostrarTela(tipo) {
  document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
  if (tipo === 'professor') document.getElementById('painel-professor').classList.remove('hidden');
  else if (tipo === 'aluno') document.getElementById('tela-aluno').classList.remove('hidden');
  else if (tipo === 'projecao') document.getElementById('tela-torcida').classList.remove('hidden');
  else {
    // tela inicial
    document.querySelectorAll('.card').forEach(c => c.classList.remove('hidden'));
    document.getElementById('tela-aluno')?.classList.add('hidden');
    document.getElementById('painel-professor')?.classList.add('hidden');
    document.getElementById('tela-torcida')?.classList.add('hidden');
  }
}

// Toast
export function exibirToast(mensagem) {
  const t = document.getElementById('toast');
  if (t) {
    t.innerText = mensagem;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
  }
}

// Toast especial para reconexão (item 2)
export function exibirToastReconexao() {
  const t = document.getElementById('toast');
  if (t) {
    t.innerText = '🔄 Conexão restaurada! Dados sincronizados.';
    t.classList.remove('hidden');
    t.style.background = '#2e7d32'; // verde
    setTimeout(() => {
      t.classList.add('hidden');
      t.style.background = ''; // reset
    }, 4000);
  }
}

// Atualizar timer de fase
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

// Modal genérico
export function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'flex';
}

export function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

// Atualizar informações de versão
export function atualizarDisplayVersao(versao) {
  const el = document.getElementById('version-number');
  if (el) el.textContent = versao || '--';
}

// ============================================================
// BADGE DE CONEXÃO (item 1)
// ============================================================

// Cria o elemento badge se não existir
export function createConnectionBadge() {
  let badge = document.getElementById('connection-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'connection-badge';
    badge.className = 'connection-badge offline';
    badge.innerHTML = '⚡ Conectando...';
    document.body.prepend(badge); // insere no topo do body
  }
  return badge;
}

// Atualiza o badge com base no status
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

// Função para iniciar o monitoramento e integrar com o Firebase
export function initConnectionUI(onConnectionChangeCallback) {
  // Cria o badge imediatamente
  createConnectionBadge();
  // Registra o callback para atualizar a UI
  onConnectionChangeCallback(updateConnectionBadge);
}

// ============================================================
// CONTROLE DO OVERLAY DE CARREGAMENTO (item 4)
// ============================================================

// Mostra o overlay de carregamento
export function mostrarCarregando() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
  state.carregando = true;
}

// Esconde o overlay de carregamento
export function esconderCarregando() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
  state.carregando = false;
}

// Exibe mensagem de erro no overlay (timeout)
export function exibirErroCarregamento() {
  const errorEl = document.getElementById('loading-error');
  if (errorEl) {
    errorEl.classList.remove('hidden');
  }
}
