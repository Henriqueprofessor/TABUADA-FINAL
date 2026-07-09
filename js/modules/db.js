import { db } from '../config/firebase.js';
import { state } from './state.js';
import { exibirToast } from './ui.js';

// ============================================================
// CARREGAR ESTADO
// ============================================================

export function carregarEstado(callback) {
  try {
    return db.ref('copaV2').on('value', snap => {
      state.estadoAtual = snap.val() || { fase: 1, status: 'aguardando', tempoFase: 10, fim: 0, modalidade: "2-5", classificados: {}, resultados: {}, participantes: {} };
      if (callback) callback(state.estadoAtual);
    });
  } catch (error) {
    console.error('Erro ao carregar estado:', error);
    exibirToast('❌ Erro ao carregar dados do servidor. Verifique sua conexão.');
    if (callback) callback(null);
    return null;
  }
}

// ============================================================
// ATUALIZAR DADOS (CORRIGIDO PARA VALORES PRIMITIVOS)
// ============================================================

export async function atualizarDados(caminho, dados) {
  try {
    // Se dados for um valor primitivo (string, number, boolean, null), usa set
    if (typeof dados !== 'object' || dados === null || Array.isArray(dados)) {
      await db.ref(caminho).set(dados);
    } else {
      // Se for objeto, usa update
      await db.ref(caminho).update(dados);
    }
    return true;
  } catch (e) {
    console.warn('⚠️ Erro ao atualizar dados:', caminho, e);
    return false;
  }
}

export async function setDados(caminho, dados) {
  try {
    await db.ref(caminho).set(dados);
    return true;
  } catch (e) {
    console.warn('⚠️ Erro ao definir dados:', caminho, e);
    return false;
  }
}

export async function removerDados(caminho) {
  try {
    await db.ref(caminho).remove();
    return true;
  } catch (e) {
    console.warn('⚠️ Erro ao remover dados:', caminho, e);
    return false;
  }
}

export async function lerDados(caminho) {
  try {
    const snap = await db.ref(caminho).once('value');
    return snap.val();
  } catch (e) {
    console.warn('⚠️ Erro ao ler dados:', caminho, e);
    return null;
  }
}

// ============================================================
// OUVIDOR DE ONLINE
// ============================================================

export function ouvirOnline(callback) {
  try {
    db.ref('online').on('value', snap => callback(snap));
  } catch (error) {
    console.error('Erro ao ouvir online:', error);
    exibirToast('❌ Erro ao monitorar conexões online.');
  }
}

export function removerListener(ref) {
  try {
    if (ref) ref.off();
  } catch (error) {
    console.warn('Erro ao remover listener:', error);
  }
}
