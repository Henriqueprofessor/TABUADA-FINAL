// ============================================================
// ARQUIVO: js/services/firebase-service.js
// DESCRIÇÃO: Serviço Firebase - Comunicação com o Realtime Database
// ============================================================

import { firebaseConfig, FIREBASE_KEYS } from '../config/firebase-config.js';
import { TURMAS_PADRAO } from '../utils/constants.js';

// ============================================================
// INICIALIZAR FIREBASE
// ============================================================

if (typeof firebase === 'undefined') {
    console.error('❌ Firebase não está disponível!');
    throw new Error('Firebase não carregado. Verifique os scripts no HTML.');
}

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
export const copaRef = db.ref(FIREBASE_KEYS.COPA);
export const onlineRef = db.ref(FIREBASE_KEYS.ONLINE);
export const configRef = db.ref(FIREBASE_KEYS.CONFIGURACOES);

export const resultadosRef = (fase) => db.ref(`${FIREBASE_KEYS.RESULTADOS}/${fase}`);
export const resultadosTempRef = (fase) => db.ref(`${FIREBASE_KEYS.RESULTADOS_TEMP}/${fase}`);
export const participantesRef = (fase) => db.ref(`${FIREBASE_KEYS.PARTICIPANTES}/${fase}`);
export const classificadosRef = (fase) => db.ref(`${FIREBASE_KEYS.CLASSIFICADOS}/${fase}`);

export const resultadoAlunoRef = (fase, alunoId) => db.ref(`${FIREBASE_KEYS.RESULTADOS}/${fase}/${alunoId}`);
export const resultadoTempAlunoRef = (fase, alunoId) => db.ref(`${FIREBASE_KEYS.RESULTADOS_TEMP}/${fase}/${alunoId}`);
export const participanteAlunoRef = (fase, alunoId) => db.ref(`${FIREBASE_KEYS.PARTICIPANTES}/${fase}/${alunoId}`);

// ============================================================
// MÉTODOS GERAIS
// ============================================================

export const updateCopa = (data) => copaRef.update(data);
export const setCopa = (data) => copaRef.set(data);
export const removeNode = (path) => db.ref(path).remove();
export const getOnce = (ref) => ref.once('value');

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
    const presenceRef = db.ref(`${FIREBASE_KEYS.ONLINE}/${id}`);
    presenceRef.set(data);
    presenceRef.onDisconnect().remove();
};

export const removePresence = (id) => {
    db.ref(`${FIREBASE_KEYS.ONLINE}/${id}`).remove();
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
    return db.ref(`${FIREBASE_KEYS.CONFIGURACOES}/${key}`).set(value);
};

// ============================================================
// TURMAS
// ============================================================

export const carregarTurmas = async () => {
    const snap = await db.ref(FIREBASE_KEYS.TURMAS).once('value');
    let turmas = snap.val();
    if (!turmas || !Array.isArray(turmas) || turmas.length === 0) {
        await db.ref(FIREBASE_KEYS.TURMAS).set(TURMAS_PADRAO);
        return TURMAS_PADRAO;
    }
    return turmas;
};

export const adicionarTurma = async (novaTurma) => {
    const turmas = await carregarTurmas();
    if (!turmas.includes(novaTurma)) {
        turmas.push(novaTurma);
        await db.ref(FIREBASE_KEYS.TURMAS).set(turmas);
        return true;
    }
    return false;
};

export const removerTurma = async (turma) => {
    let turmas = await carregarTurmas();
    turmas = turmas.filter(t => t !== turma);
    await db.ref(FIREBASE_KEYS.TURMAS).set(turmas);
};

// ============================================================
// INTERVALOS
// ============================================================

export const carregarIntervalos = async () => {
    const snap = await db.ref(FIREBASE_KEYS.INTERVALOS).once('value');
    const config = snap.val();
    if (config) {
        return {
            individual: config.individual || 4,
            equipes: config.equipes || 60
        };
    }
    await db.ref(FIREBASE_KEYS.INTERVALOS).set({ individual: 4, equipes: 60 });
    return { individual: 4, equipes: 60 };
};

export const salvarIntervaloIndividual = (segundos) => {
    return db.ref(`${FIREBASE_KEYS.INTERVALOS}/individual`).set(segundos);
};

export const salvarIntervaloEquipes = (segundos) => {
    return db.ref(`${FIREBASE_KEYS.INTERVALOS}/equipes`).set(segundos);
};

// ============================================================
// VALOR DA PARTIDA
// ============================================================

export const carregarValorPartidaDB = async () => {
    const snap = await db.ref(FIREBASE_KEYS.VALOR_PARTIDA).once('value');
    let valor = snap.val();
    if (valor === null || valor === undefined) {
        valor = 2000;
        await db.ref(FIREBASE_KEYS.VALOR_PARTIDA).set(valor);
    }
    return valor;
};

export const salvarValorPartidaDB = async (valor) => {
    if (!valor || valor < 1) throw new Error('Valor inválido');
    await db.ref(FIREBASE_KEYS.VALOR_PARTIDA).set(valor);
    return valor;
};

// ============================================================
// UTILITÁRIOS
// ============================================================

export const gerarIdAluno = (nome, turma) => {
    return btoa(nome.toLowerCase() + '|' + turma).slice(0, 16);
};

export default db;
