// js/services/firebase-service.js
// Serviço centralizado para operações com o Firebase

// ========== REFERÊNCIAS ==========
function getCopaRef() { return db.ref('copaV2'); }
function getResultadosRef(fase) { return db.ref(`copaV2/resultados/${fase}`); }
function getResultadosTempRef(fase) { return db.ref(`copaV2/resultados_temp/${fase}`); }
function getParticipantesRef(fase) { return db.ref(`copaV2/participantes/${fase}`); }
function getClassificadosRef(fase) { return db.ref(`copaV2/classificados/${fase}`); }
function getOnlineRef() { return db.ref('online'); }
function getConfigRef() { return db.ref('copaV2/configuracoes'); }
function getIntervalosRef() { return db.ref('copaV2/configuracoes/intervalos'); }
function getTurmasRef() { return db.ref('copaV2/turmas'); }
function getPresenceRef(id) { return db.ref(`online/${id}`); }
function getConnectedRef() { return db.ref('.info/connected'); }

// ========== OPERAÇÕES DE ESCRITA ==========
function updateCopa(data) {
  return getCopaRef().update(data);
}

function setCopa(data) {
  return getCopaRef().set(data);
}

function setTurmas(turmas) {
  return getTurmasRef().set(turmas);
}

function removerResultados(fase, alunoId) {
  if (alunoId) {
    return getResultadosRef(fase).child(alunoId).remove();
  }
  return getResultadosRef(fase).remove();
}

function removerParticipantes(fase, alunoId) {
  if (alunoId) {
    return getParticipantesRef(fase).child(alunoId).remove();
  }
  return getParticipantesRef(fase).remove();
}

function removerResultadosTemp(fase, alunoId) {
  if (alunoId) {
    return getResultadosTempRef(fase).child(alunoId).remove();
  }
  return getResultadosTempRef(fase).remove();
}

function removerClassificados(fase) {
  return getClassificadosRef(fase).remove();
}

function setPresence(id, data) {
  const ref = getPresenceRef(id);
  ref.set(data);
  ref.onDisconnect().remove();
}

function removePresence(id) {
  getPresenceRef(id).remove();
}

// ========== OPERAÇÕES DE LEITURA (ONCE) ==========
function getTurmasOnce() {
  return getTurmasRef().once('value').then(snap => snap.val());
}

function getIntervalosOnce() {
  return getIntervalosRef().once('value').then(snap => snap.val());
}

function getResultadosOnce(fase) {
  return getResultadosRef(fase).once('value').then(snap => snap.val());
}

function getResultadosTempOnce(fase) {
  return getResultadosTempRef(fase).once('value').then(snap => snap.val());
}

function getParticipantesOnce(fase) {
  return getParticipantesRef(fase).once('value').then(snap => snap.val());
}

function getClassificadosOnce(fase) {
  return getClassificadosRef(fase).once('value').then(snap => snap.val());
}

function getOnlineOnce() {
  return getOnlineRef().once('value').then(snap => snap.val());
}

// ========== LISTENERS EM TEMPO REAL ==========
function listenCopa(callback) {
  const ref = getCopaRef();
  ref.on('value', snap => callback(snap.val()));
  // Retorna função para remover o listener
  return () => ref.off();
}

function listenOnline(callback) {
  const ref = getOnlineRef();
  ref.on('value', snap => callback(snap.val()));
  return () => ref.off();
}

function listenIntervalos(callback) {
  const ref = getIntervalosRef();
  ref.on('value', snap => callback(snap.val()));
  return () => ref.off();
}

function listenConnected(callback) {
  const ref = getConnectedRef();
  ref.on('value', snap => callback(snap.val()));
  return () => ref.off();
}

// ========== TRANSACTION (atualização atômica) ==========
function transactionResultados(fase, alunoId, updateFn) {
  return getResultadosRef(fase).child(alunoId).transaction(updateFn);
}

// ========== EXPORTAÇÃO GLOBAL ==========
window.firebaseService = {
  // Referências
  getCopaRef,
  getResultadosRef,
  getResultadosTempRef,
  getParticipantesRef,
  getClassificadosRef,
  getOnlineRef,
  getConfigRef,
  getIntervalosRef,
  getTurmasRef,
  getPresenceRef,
  getConnectedRef,
  // Escrita
  updateCopa,
  setCopa,
  setTurmas,
  removerResultados,
  removerParticipantes,
  removerResultadosTemp,
  removerClassificados,
  setPresence,
  removePresence,
  // Leitura
  getTurmasOnce,
  getIntervalosOnce,
  getResultadosOnce,
  getResultadosTempOnce,
  getParticipantesOnce,
  getClassificadosOnce,
  getOnlineOnce,
  // Listeners
  listenCopa,
  listenOnline,
  listenIntervalos,
  listenConnected,
  // Transaction
  transactionResultados
};
