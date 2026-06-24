// js/services/firebase-service.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, update, remove, onValue, push, child, onDisconnect, serverTimestamp } from 'firebase/database';
import { firebaseConfig } from '../config/firebase-config.js';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export const database = db;

// Referências principais
export const copaRef = ref(db, 'copaV2');
export const resultadosRef = (fase) => ref(db, `copaV2/resultados/${fase}`);
export const resultadosTempRef = (fase) => ref(db, `copaV2/resultados_temp/${fase}`);
export const participantesRef = (fase) => ref(db, `copaV2/participantes/${fase}`);
export const classificadosRef = (fase) => ref(db, `copaV2/classificados/${fase}`);
export const onlineRef = ref(db, 'online');
export const configRef = ref(db, 'copaV2/configuracoes');

// Métodos genéricos
export const updateCopa = (data) => update(copaRef, data);
export const setCopa = (data) => set(copaRef, data);
export const removeNode = (path) => remove(ref(db, path));

// Listeners com cancelamento
export const listenToCopa = (callback) => {
  return onValue(copaRef, (snap) => callback(snap.val()));
};

export const listenToOnline = (callback) => {
  return onValue(onlineRef, (snap) => callback(snap.val()));
};

// Presença
export const setPresence = (id, data) => {
  const presenceRef = ref(db, `online/${id}`);
  set(presenceRef, data);
  onDisconnect(presenceRef).remove();
};
export const removePresence = (id) => remove(ref(db, `online/${id}`));
