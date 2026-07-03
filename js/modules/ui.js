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
