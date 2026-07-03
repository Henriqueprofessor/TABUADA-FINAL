import { db } from '../config/firebase.js';
import { state } from './state.js';

// Carregar estado completo da competição
export function carregarEstado(callback) {
  return db.ref('copaV2').on('value', snap => {
    state.estadoAtual = snap.val() || { fase: 1, status: 'aguardando', tempoFase: 10, fim: 0, modalidade: "2-5", classificados: {}, resultados: {}, participantes: {} };
    if (callback) callback(state.estadoAtual);
  });
}

// Atualizar dados
export async function atualizarDados(caminho, dados) {
  await db.ref(caminho).update(dados);
}

export async function setDados(caminho, dados) {
  await db.ref(caminho).set(dados);
}

export async function removerDados(caminho) {
  await db.ref(caminho).remove();
}

export async function lerDados(caminho) {
  const snap = await db.ref(caminho).once('value');
  return snap.val();
}

// Listener para mudanças em tempo real (ex: online)
export function ouvirOnline(callback) {
  db.ref('online').on('value', snap => callback(snap));
}

// Desconectar listener
export function removerListener(ref) {
  ref.off();
}
