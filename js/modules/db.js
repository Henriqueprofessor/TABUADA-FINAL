import { db } from '../config/firebase.js';
import { state } from './state.js';

export function carregarEstado(callback) {
  return db.ref('copaV2').on('value', snap => {
    state.estadoAtual = snap.val() || { fase: 1, status: 'aguardando', tempoFase: 10, fim: 0, modalidade: "2-5", classificados: {}, resultados: {}, participantes: {} };
    if (callback) callback(state.estadoAtual);
  });
}

export async function atualizarDados(caminho, dados) {
  try {
    await db.ref(caminho).update(dados);
    return true;
  } catch (e) {
    console.warn('⚠️ Erro ao atualizar dados (offline):', caminho, e);
    return false;
  }
}

export async function setDados(caminho, dados) {
  try {
    await db.ref(caminho).set(dados);
    return true;
  } catch (e) {
    console.warn('⚠️ Erro ao definir dados (offline):', caminho, e);
    return false;
  }
}

export async function removerDados(caminho) {
  try {
    await db.ref(caminho).remove();
    return true;
  } catch (e) {
    console.warn('⚠️ Erro ao remover dados (offline):', caminho, e);
    return false;
  }
}

export async function lerDados(caminho) {
  try {
    const snap = await db.ref(caminho).once('value');
    return snap.val();
  } catch (e) {
    console.warn('⚠️ Erro ao ler dados (offline):', caminho, e);
    return null;
  }
}

export function ouvirOnline(callback) {
  db.ref('online').on('value', snap => callback(snap));
}

export function removerListener(ref) {
  ref.off();
}
