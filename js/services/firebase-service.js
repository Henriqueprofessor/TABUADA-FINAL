// ============================================================
// ARQUIVO: js/services/firebase-service.js
// DESCRIÇÃO: Serviço Firebase - VERSÃO CORRIGIDA
// ============================================================

import { firebaseConfig } from '../config/firebase-config.js';

// ============================================================
// INICIALIZAR FIREBASE
// ============================================================

console.log('🔄 Inicializando Firebase...');

// Verificar se o Firebase está disponível
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase não está disponível!');
    throw new Error('Firebase não carregado. Verifique os scripts no HTML.');
}

// Inicializar
let app;
let db;

try {
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log('✅ Firebase inicializado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao inicializar Firebase:', error);
    throw error;
}

// ============================================================
// REFERÊNCIAS
// ============================================================

export const database = db;
export const copaRef = db.ref('copaV2');
export const onlineRef = db.ref('online');
export const configRef = db.ref('copaV2/configuracoes');

export const resultadosRef = (fase) => db.ref(`copaV2/resultados/${fase}`);
export const resultadosTempRef = (fase) => db.ref(`copaV2/resultados_temp/${fase}`);
export const participantesRef = (fase) => db.ref(`copaV2/participantes/${fase}`);
export const classificadosRef = (fase) => db.ref(`copaV2/classificados/${fase}`);

export const resultadoAlunoRef = (fase, alunoId) => db.ref(`copaV2/resultados/${fase}/${alunoId}`);
export const resultadoTempAlunoRef = (fase, alunoId) => db.ref(`copaV2/resultados_temp/${fase}/${alunoId}`);
export const participanteAlunoRef = (fase, alunoId) => db.ref(`copaV2/participantes/${fase}/${alunoId}`);

// ============================================================
// MÉTODOS
// ============================================================

export const updateCopa = (data) => copaRef.update(data);
export const setCopa = (data) => copaRef.set(data);
export const removeNode = (path) => db.ref(path).remove();
export const getOnce = (path) => db.ref(path).once('value');

// ============================================================
// LISTENERS
// ============================================================

export const listenToCopa = (callback) => {
    return copaRef.on('value', (snap) => callback(snap.val()));
};

export const listenToResultados = (fase, callback) => {
    return resultadosRef(fase).on('value', (snap) => callback(snap.val()));
};

export const listenToResultadosTemp = (fase, callback) => {
    return resultadosTempRef(fase).on('value', (snap) => callback(snap.val()));
};

export const listenToParticipantes = (fase, callback) => {
    return participantesRef(fase).on('value', (snap) => callback(snap.val()));
};

export const listenToClassificados = (fase, callback) => {
    return classificadosRef(fase).on('value', (snap) => callback(snap.val()));
};

export const listenToOnline = (callback) => {
    return onlineRef.on('value', (snap) => callback(snap.val()));
};

export const listenToConfiguracoes = (callback) => {
    return configRef.on('value', (snap) => callback(snap.val()));
};

// ============================================================
// PRESENÇA
// ============================================================

export const setPresence = (id, data) => {
    const presenceRef = db.ref(`online/${id}`);
    presenceRef.set(data);
    presenceRef.onDisconnect().remove();
};

export const removePresence = (id) => {
    db.ref(`online/${id}`).remove();
};

// ============================================================
// RESULTADOS
// ============================================================

export const salvarResultado = async (fase, alunoId, partida) => {
    const ref = resultadoAlunoRef(fase, alunoId);
    return ref.transaction((currentData) => {
        const lista = currentData || [];
        lista.push(partida);
        return lista;
    });
};

export const salvarResultadoTemp = (fase, alunoId, dados) => {
    return resultadoTempAlunoRef(fase, alunoId).set(dados);
};

export const removerResultadoTemp = (fase, alunoId) => {
    return resultadoTempAlunoRef(fase, alunoId).remove();
};

// ============================================================
// PARTICIPANTES
// ============================================================

export const adicionarParticipante = (fase, alunoId, dados) => {
    return participanteAlunoRef(fase, alunoId).set(dados);
};

export const removerParticipante = (fase, alunoId) => {
    return participanteAlunoRef(fase, alunoId).remove();
};

// ============================================================
// CLASSIFICADOS
// ============================================================

export const classificarAlunos = async (fase, ids) => {
    return classificadosRef(fase).set(ids);
};

export const isClassificado = async (fase, alunoId) => {
    const snap = await classificadosRef(fase).once('value');
    const ids = snap.val() || [];
    return ids.includes(alunoId);
};

// ============================================================
// CONFIGURAÇÕES
// ============================================================

export const salvarConfiguracoes = (config) => {
    return configRef.set(config);
};

export const salvarConfiguracao = (key, value) => {
    return db.ref(`copaV2/configuracoes/${key}`).set(value);
};

// ============================================================
// TURMAS
// ============================================================

export const carregarTurmas = async () => {
    const snap = await db.ref('copaV2/turmas').once('value');
    let turmas = snap.val();
    if (!turmas || !Array.isArray(turmas) || turmas.length === 0) {
        const TURMAS_PADRAO = ["901", "1001", "1002", "1003", "1004", "2001", "2002", "2003", "3001", "3002"];
        await db.ref('copaV2/turmas').set(TURMAS_PADRAO);
        return TURMAS_PADRAO;
    }
    return turmas;
};

export const adicionarTurma = async (novaTurma) => {
    const turmas = await carregarTurmas();
    if (!turmas.includes(novaTurma)) {
        turmas.push(novaTurma);
        await db.ref('copaV2/turmas').set(turmas);
        return true;
    }
    return false;
};

export const removerTurma = async (turma) => {
    let turmas = await carregarTurmas();
    turmas = turmas.filter(t => t !== turma);
    await db.ref('copaV2/turmas').set(turmas);
};

// ============================================================
// INTERVALOS
// ============================================================

export const carregarIntervalos = async () => {
    const snap = await db.ref('copaV2/configuracoes/intervalos').once('value');
    const config = snap.val();
    if (config) {
        return {
            individual: config.individual || 4,
            equipes: config.equipes || 60
        };
    }
    await db.ref('copaV2/configuracoes/intervalos').set({ individual: 4, equipes: 60 });
    return { individual: 4, equipes: 60 };
};

export const salvarIntervaloIndividual = (segundos) => {
    return db.ref('copaV2/configuracoes/intervalos/individual').set(segundos);
};

export const salvarIntervaloEquipes = (segundos) => {
    return db.ref('copaV2/configuracoes/intervalos/equipes').set(segundos);
};

// ============================================================
// UTILITÁRIOS
// ============================================================

export const gerarIdAluno = (nome, turma) => {
    return btoa(nome.toLowerCase() + '|' + turma).slice(0, 16);
};

// ============================================================
// EXPORTAR
// ============================================================

export default db;
