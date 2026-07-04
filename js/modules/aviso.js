// js/modules/aviso.js
import { db } from '../config/firebase.js';
import { state } from './state.js';
import { exibirToast } from './ui.js';

// ============================================================
// FUNÇÕES DE PERSISTÊNCIA
// ============================================================

const AVISO_PATH = 'copaV2/aviso';

// Publica um novo aviso
export async function publicarAviso(mensagem, minutos) {
  if (!mensagem || mensagem.trim() === '') {
    exibirToast('❌ Digite uma mensagem para o aviso.');
    return false;
  }

  const minutosValidos = parseInt(minutos) || 0;
  if (minutosValidos <= 0) {
    exibirToast('❌ Defina um tempo válido (em minutos).');
    return false;
  }

  const agora = Date.now();
  const expiracao = agora + (minutosValidos * 60 * 1000);

  const aviso = {
    mensagem: mensagem.trim(),
    timestamp: agora,
    expiracao: expiracao,
    ativo: true,
  };

  try {
    await db.ref(AVISO_PATH).set(aviso);
    exibirToast(`✅ Aviso publicado! (válido por ${minutosValidos} minutos)`);
    return true;
  } catch (e) {
    exibirToast('❌ Erro ao publicar aviso.');
    console.error(e);
    return false;
  }
}

// Remove o aviso atual
export async function removerAviso() {
  try {
    await db.ref(AVISO_PATH).remove();
    exibirToast('🗑️ Aviso removido.');
    return true;
  } catch (e) {
    exibirToast('❌ Erro ao remover aviso.');
    console.error(e);
    return false;
  }
}

// Escuta mudanças no aviso (tempo real)
export function escutarAviso(callback) {
  const ref = db.ref(AVISO_PATH);
  ref.on('value', (snap) => {
    const dados = snap.val();
    if (dados && dados.ativo === true) {
      const agora = Date.now();
      if (dados.expiracao > agora) {
        callback(dados);
        return;
      } else {
        removerAviso();
        callback(null);
        return;
      }
    }
    callback(null);
  });
  return ref;
}

// Desconecta o listener
export function pararEscutarAviso(ref) {
  if (ref) ref.off();
}

// ============================================================
// FUNÇÕES DE UI (banner para o aluno)
// ============================================================

export function exibirBannerAviso(aviso) {
  const bannerExistente = document.getElementById('banner-aviso');
  if (bannerExistente) bannerExistente.remove();

  if (!aviso || !aviso.mensagem) return;

  const banner = document.createElement('div');
  banner.id = 'banner-aviso';
  banner.className = 'banner-aviso';
  banner.innerHTML = `
    <span class="banner-aviso-icone">📢</span>
    <span class="banner-aviso-texto">${aviso.mensagem}</span>
  `;
  document.body.prepend(banner);
}

export function removerBannerAviso() {
  const banner = document.getElementById('banner-aviso');
  if (banner) banner.remove();
}

// ============================================================
// ATUALIZAR STATUS NO PAINEL DO PROFESSOR
// ============================================================

export function atualizarStatusAviso(aviso) {
  const container = document.getElementById('aviso-status');
  if (!container) return;

  if (aviso && aviso.ativo === true && aviso.expiracao > Date.now()) {
    const agora = Date.now();
    const restanteMs = aviso.expiracao - agora;
    const minutosRest = Math.floor(restanteMs / 60000);
    const segundosRest = Math.floor((restanteMs % 60000) / 1000);

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f39c12; color: #000; padding: 12px 16px; border-radius: 8px; flex-wrap: wrap; gap: 10px;">
        <span><strong>📢 Aviso Ativo:</strong> "${aviso.mensagem}"</span>
        <span>⏱️ Expira em: <strong>${minutosRest}m ${segundosRest}s</strong></span>
      </div>
      <div style="margin-top: 8px; font-size: 12px; color: #94a3b8;">
        Publicado em: ${new Date(aviso.timestamp).toLocaleString('pt-BR')}
      </div>
    `;
  } else {
    container.innerHTML = `
      <div style="padding: 12px 16px; background: #2c3e50; border-radius: 8px; color: #94a3b8;">
        📭 Nenhum aviso ativo no momento.
      </div>
    `;
  }
}
