import { state } from './state.js';

// Mostrar/ocultar telas
export function mostrarTela(tipo) {
  console.log('🔄 mostrarTela chamado com tipo:', tipo);
  
  // Oculta todos os cards
  document.querySelectorAll('.card').forEach(c => {
    c.classList.add('hidden');
    console.log('  Ocultando:', c.id || c.className);
  });
  
  // Mostra a tela solicitada
  if (tipo === 'professor') {
    const el = document.getElementById('painel-professor');
    if (el) {
      el.classList.remove('hidden');
      console.log('✅ Mostrando painel-professor');
    } else {
      console.warn('⚠️ Elemento painel-professor não encontrado');
    }
  } else if (tipo === 'aluno') {
    const el = document.getElementById('tela-aluno');
    if (el) {
      el.classList.remove('hidden');
      console.log('✅ Mostrando tela-aluno');
    } else {
      console.warn('⚠️ Elemento tela-aluno não encontrado');
    }
  } else if (tipo === 'projecao') {
    const el = document.getElementById('tela-torcida');
    if (el) {
      el.classList.remove('hidden');
      console.log('✅ Mostrando tela-torcida');
    } else {
      console.warn('⚠️ Elemento tela-torcida não encontrado');
    }
  } else {
    // tela inicial (inicio)
    document.querySelectorAll('.card').forEach(c => c.classList.remove('hidden'));
    // Oculta as telas específicas que podem estar visíveis
    document.getElementById('tela-aluno')?.classList.add('hidden');
    document.getElementById('painel-professor')?.classList.add('hidden');
    document.getElementById('tela-torcida')?.classList.add('hidden');
    console.log('🏠 Mostrando tela inicial');
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

// ============================================================
// BADGE DE CONEXÃO
// ============================================================

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
