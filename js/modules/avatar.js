// js/modules/avatar.js
import { db } from '../config/firebase.js';
import { state } from './state.js';
import { exibirToast } from './ui.js';

// ============================================================
// LISTA DE EMOJIS DISPONÍVEIS PARA AVATAR
// ============================================================

export const AVATAR_EMOJIS = [
  '⭐', '🎓', '🏀', '⚽', '🎮', '🎵', '🌟', '🚀', '🎨',
  '🦁', '🐱', '🌺', '🌈', '🦄', '🐼', '🐧', '🐰', '🦊',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐵', '🐔', '🐧', '🐦',
  '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🐴', '🦄', '🐝',
  '🐞', '🦋', '🐙', '🦑', '🐬', '🐳', '🐊', '🦕', '🦖'
];

// ============================================================
// CORES PRÉ-DEFINIDAS PARA TURMAS (sugestão)
// ============================================================

export const CORES_TURMAS = {
  '901': '#FFD700', // Amarelo
  '902': '#4A90D9', // Azul
  '903': '#E74C3C', // Vermelho
  '904': '#2ECC71', // Verde
  '905': '#9B59B6', // Roxo
  '906': '#F39C12', // Laranja
  '907': '#1ABC9C', // Turquesa
  '908': '#E67E22', // Laranja escuro
  '909': '#3498DB', // Azul claro
  '910': '#E74C3C', // Vermelho
};

// ============================================================
// FUNÇÕES DE COR DA TURMA
// ============================================================

// Obtém a cor de uma turma (do Firebase ou gerada)
export async function obterCorTurma(turma) {
  if (!turma) return '#95a5a6'; // cinza padrão

  try {
    // Tenta buscar do Firebase
    const snap = await db.ref(`copaV2/turmas_cores/${turma}`).once('value');
    const cor = snap.val();
    if (cor) return cor;

    // Se não tiver, gera automaticamente com base no nome
    const corGerada = gerarCorPorNome(turma);
    // Salva a cor gerada no Firebase para consistência
    await db.ref(`copaV2/turmas_cores/${turma}`).set(corGerada);
    return corGerada;
  } catch (e) {
    console.warn('Erro ao obter cor da turma:', e);
    return gerarCorPorNome(turma);
  }
}

// Gera uma cor automaticamente a partir do nome da turma
function gerarCorPorNome(nome) {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Converte para cor HSL (matiz variável, saturação e luminosidade fixas)
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
}

// Salva a cor de uma turma
export async function salvarCorTurma(turma, cor) {
  if (!turma || !cor) return false;
  try {
    await db.ref(`copaV2/turmas_cores/${turma}`).set(cor);
    exibirToast(`✅ Cor da turma ${turma} atualizada!`);
    return true;
  } catch (e) {
    exibirToast('❌ Erro ao salvar cor da turma.');
    console.error(e);
    return false;
  }
}

// ============================================================
// FUNÇÕES DE AVATAR DO ALUNO
// ============================================================

// Obtém o avatar de um aluno (do Firebase ou localStorage)
export async function obterAvatarAluno(alunoId) {
  if (!alunoId) return '⭐'; // padrão

  // Primeiro tenta do state (cache)
  if (state.avatarAluno) return state.avatarAluno;

  try {
    const snap = await db.ref(`copaV2/participantes/avatar/${alunoId}`).once('value');
    const avatar = snap.val();
    if (avatar) {
      state.avatarAluno = avatar;
      return avatar;
    }
    return '⭐'; // padrão
  } catch (e) {
    console.warn('Erro ao obter avatar:', e);
    return '⭐';
  }
}

// Salva o avatar do aluno
export async function salvarAvatarAluno(alunoId, avatar) {
  if (!alunoId || !avatar) return false;
  try {
    await db.ref(`copaV2/participantes/avatar/${alunoId}`).set(avatar);
    state.avatarAluno = avatar;
    exibirToast(`✅ Avatar atualizado!`);
    return true;
  } catch (e) {
    exibirToast('❌ Erro ao salvar avatar.');
    console.error(e);
    return false;
  }
}

// ============================================================
// FUNÇÃO PARA RENDERIZAR O AVATAR (HTML)
// ============================================================

// Gera o HTML para exibir um avatar com cor e emoji
export function gerarAvatarHTML(avatar, cor, tamanho = '32px') {
  const emoji = avatar || '⭐';
  const corFundo = cor || '#95a5a6';
  const tamanhoNum = parseInt(tamanho) || 32;
  const fontSize = Math.round(tamanhoNum * 0.55);

  return `
    <span class="avatar-container" style="
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${tamanho}px;
      height: ${tamanho}px;
      border-radius: 50%;
      background: ${corFundo};
      font-size: ${fontSize}px;
      line-height: 1;
      flex-shrink: 0;
      border: 2px solid rgba(255,255,255,0.3);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    ">
      ${emoji}
    </span>
  `;
}

// Gera o HTML para um avatar pequeno (para listas)
export function gerarAvatarPequeno(avatar, cor) {
  return gerarAvatarHTML(avatar, cor, '24px');
}

// Gera o HTML para um avatar grande (para perfil)
export function gerarAvatarGrande(avatar, cor) {
  return gerarAvatarHTML(avatar, cor, '64px');
}

// ============================================================
// FUNÇÕES DE UI (popup para escolha de avatar)
// ============================================================

// Exibe um popup para o aluno escolher seu avatar
export function mostrarPopupAvatar() {
  // Verifica se já existe um popup
  let popup = document.getElementById('popup-avatar');
  if (popup) popup.remove();

  // Obtém o avatar atual
  const avatarAtual = state.avatarAluno || '⭐';

  popup = document.createElement('div');
  popup.id = 'popup-avatar';
  popup.className = 'popup-avatar-overlay';
  popup.innerHTML = `
    <div class="popup-avatar-content">
      <h3>🎨 Escolha seu Avatar</h3>
      <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">
        Escolha um emoji para representar você na Copa Tabuada!
      </p>
      <div class="popup-avatar-grid" id="popup-avatar-grid">
        ${AVATAR_EMOJIS.map(emoji => `
          <div class="popup-avatar-option ${emoji === avatarAtual ? 'selected' : ''}" data-avatar="${emoji}">
            ${emoji}
          </div>
        `).join('')}
      </div>
      <div style="display: flex; gap: 12px; justify-content: center; margin-top: 16px;">
        <button id="btn-popup-avatar-salvar" class="btn-success">💾 Salvar</button>
        <button id="btn-popup-avatar-fechar" class="btn-secondary">❌ Fechar</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  // Evento de seleção
  popup.querySelectorAll('.popup-avatar-option').forEach(el => {
    el.addEventListener('click', function() {
      popup.querySelectorAll('.popup-avatar-option').forEach(e => e.classList.remove('selected'));
      this.classList.add('selected');
    });
  });

  // Evento de salvar
  popup.querySelector('#btn-popup-avatar-salvar').addEventListener('click', async () => {
    const selected = popup.querySelector('.popup-avatar-option.selected');
    if (!selected) {
      exibirToast('❌ Selecione um avatar.');
      return;
    }
    const avatar = selected.dataset.avatar;
    await salvarAvatarAluno(state.alunoId, avatar);
    popup.remove();
    // Atualiza a exibição do avatar na tela do aluno
    atualizarAvatarAlunoUI();
  });

  // Evento de fechar
  popup.querySelector('#btn-popup-avatar-fechar').addEventListener('click', () => {
    popup.remove();
  });

  // Fecha ao clicar fora
  popup.addEventListener('click', (e) => {
    if (e.target === popup) popup.remove();
  });
}

// Atualiza a exibição do avatar na tela do aluno
export function atualizarAvatarAlunoUI() {
  const container = document.getElementById('avatar-aluno-display');
  if (!container) return;

  const avatar = state.avatarAluno || '⭐';
  const turma = state.alunoTurma || '';
  const cor = state.corTurma || '#95a5a6';

  container.innerHTML = gerarAvatarGrande(avatar, cor);
}
