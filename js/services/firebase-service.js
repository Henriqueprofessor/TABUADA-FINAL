// js/services/firebase-service.js
// Serviço centralizado com listeners granulares

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
    const ref = getResultadosRef(fase);
    return alunoId ? ref.child(alunoId).remove() : ref.remove();
}
function removerParticipantes(fase, alunoId) {
    const ref = getParticipantesRef(fase);
    return alunoId ? ref.child(alunoId).remove() : ref.remove();
}
function removerResultadosTemp(fase, alunoId) {
    const ref = getResultadosTempRef(fase);
    return alunoId ? ref.child(alunoId).remove() : ref.remove();
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

// ========== LISTENERS GRANULARES ==========
function listenCopaMetadata(callback) {
    const ref = getCopaRef();
    const onData = (snap) => {
        const data = snap.val() || {};
        const metadata = {
            fase: data.fase || 1,
            status: data.status || 'aguardando',
            tempoFase: data.tempoFase || 12,
            fim: data.fim || 0,
            modalidade: data.modalidade || '2-5',
            tempoRestantePausa: data.tempoRestantePausa || 0,
            resultados: data.resultados || {},
            participantes: data.participantes || {},
            classificados: data.classificados || {}
        };
        callback(metadata);
    };
    ref.on('value', onData);
    return () => ref.off('value', onData);
}
function listenResultados(fase, callback) {
    const ref = getResultadosRef(fase);
    const handler = (snap) => { callback(snap.val()); };
    ref.on('value', handler);
    return () => ref.off('value', handler);
}
function listenParticipantes(fase, callback) {
    const ref = getParticipantesRef(fase);
    const handler = (snap) => { callback(snap.val()); };
    ref.on('value', handler);
    return () => ref.off('value', handler);
}
function listenClassificados(fase, callback) {
    const ref = getClassificadosRef(fase);
    const handler = (snap) => { callback(snap.val() || []); };
    ref.on('value', handler);
    return () => ref.off('value', handler);
}
function listenOnline(callback) {
    const ref = getOnlineRef();
    const handler = (snap) => { callback(snap.val()); };
    ref.on('value', handler);
    return () => ref.off('value', handler);
}
function listenIntervalos(callback) {
    const ref = getIntervalosRef();
    const handler = (snap) => { callback(snap.val()); };
    ref.on('value', handler);
    return () => ref.off('value', handler);
}
function listenConnected(callback) {
    const ref = getConnectedRef();
    const handler = (snap) => { callback(snap.val()); };
    ref.on('value', handler);
    return () => ref.off('value', handler);
}

// ========== TRANSACTION ==========
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
    // Listeners granulares
    listenCopaMetadata,
    listenResultados,
    listenParticipantes,
    listenClassificados,
    listenOnline,
    listenIntervalos,
    listenConnected,
    // Transaction
    transactionResultados
};
