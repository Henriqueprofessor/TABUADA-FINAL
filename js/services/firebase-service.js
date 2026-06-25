// ============================================================
// ARQUIVO: js/services/firebase-service.js
// DESCRIÇÃO: Serviço de comunicação com Firebase - Versão CDN
// ============================================================

import { firebaseConfig } from '../config/firebase-config.js';

// ========== INICIALIZAR FIREBASE ==========
// Usando a versão compat do Firebase (já carregada no HTML)
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ========== REFERÊNCIAS PRINCIPAIS ==========
export const database = db;
export const copaRef = db.ref('copaV2');
export const onlineRef = db.ref('online');
export const configRef = db.ref('copaV2/configuracoes');

// ========== REFERÊNCIAS POR FASE ==========
export const resultadosRef = (fase) => db.ref(`copaV2/resultados/${fase}`);
export const resultadosTempRef = (fase) => db.ref(`copaV2/resultados_temp/${fase}`);
export const participantesRef = (fase) => db.ref(`copaV2/participantes/${fase}`);
export const classificadosRef = (fase) => db.ref(`copaV2/classificados/${fase}`);

// ========== REFERÊNCIAS POR ALUNO ==========
export const resultadoAlunoRef = (fase, alunoId) => db.ref(`copaV2/resultados/${fase}/${alunoId}`);
export const resultadoTempAlunoRef = (fase, alunoId) => db.ref(`copaV2/resultados_temp/${fase}/${alunoId}`);
export const participanteAlunoRef = (fase, alunoId) => db.ref(`copaV2/participantes/${fase}/${alunoId}`);

// ========== MÉTODOS GENÉRICOS ==========

// Atualizar dados da copa
export const updateCopa = (data) => copaRef.update(data);

// Definir dados da copa (substitui tudo)
export const setCopa = (data) => copaRef.set(data);

// Remover nó
export const removeNode = (path) => db.ref(path).remove();

// Obter dados uma vez
export const getOnce = (path) => db.ref(path).once('value');

// ========== LISTENERS ==========

// Escutar mudanças na copa
export const listenToCopa = (callback) => {
    return copaRef.on('value', (snap) => {
        callback(snap.val());
    });
};

// Escutar mudanças nos resultados de uma fase
export const listenToResultados = (fase, callback) => {
    return resultadosRef(fase).on('value', (snap) => {
        callback(snap.val());
    });
};

// Escutar mudanças nos resultados temporários de uma fase
export const listenToResultadosTemp = (fase, callback) => {
    return resultadosTempRef(fase).on('value', (snap) => {
        callback(snap.val());
    });
};

// Escutar mudanças nos participantes de uma fase
export const listenToParticipantes = (fase, callback) => {
    return participantesRef(fase).on('value', (snap) => {
        callback(snap.val());
    });
};

// Escutar mudanças nos classificados de uma fase
export const listenToClassificados = (fase, callback) => {
    return classificadosRef(fase).on('value', (snap) => {
        callback(snap.val());
    });
};

// Escutar usuários online
export const listenToOnline = (callback) => {
    return onlineRef.on('value', (snap) => {
        callback(snap.val());
    });
};

// Escutar configurações
export const listenToConfiguracoes = (callback) => {
    return configRef.on('value', (snap) => {
        callback(snap.val());
    });
};

// ========== PRESENÇA (ONLINE) ==========

// Definir presença do usuário
export const setPresence = (id, data) => {
    const presenceRef = db.ref(`online/${id}`);
    presenceRef.set(data);
    presenceRef.onDisconnect().remove();
};

// Remover presença
export const removePresence = (id) => {
    db.ref(`online/${id}`).remove();
};

// ========== RESULTADOS ==========

// Salvar resultado de uma partida
export const salvarResultado = async (fase, alunoId, partida) => {
    const ref = resultadoAlunoRef(fase, alunoId);
    return ref.transaction((currentData) => {
        const lista = currentData || [];
        lista.push(partida);
        return lista;
    });
};

// Salvar resultado temporário (durante a partida)
export const salvarResultadoTemp = (fase, alunoId, dados) => {
    return resultadoTempAlunoRef(fase, alunoId).set(dados);
};

// Remover resultado temporário
export const removerResultadoTemp = (fase, alunoId) => {
    return resultadoTempAlunoRef(fase, alunoId).remove();
};

// ========== PARTICIPANTES ==========

// Adicionar participante
export const adicionarParticipante = (fase, alunoId, dados) => {
    return participanteAlunoRef(fase, alunoId).set(dados);
};

// Remover participante
export const removerParticipante = (fase, alunoId) => {
    return participanteAlunoRef(fase, alunoId).remove();
};

// ========== CLASSIFICADOS ==========

// Classificar alunos para a próxima fase
export const classificarAlunos = async (fase, ids) => {
    return classificadosRef(fase).set(ids);
};

// Verificar se um aluno está classificado
export const isClassificado = async (fase, alunoId) => {
    const snap = await classificadosRef(fase).once('value');
    const ids = snap.val() || [];
    return ids.includes(alunoId);
};

// ========== CONFIGURAÇÕES ==========

// Salvar configurações gerais
export const salvarConfiguracoes = (config) => {
    return configRef.set(config);
};

// Salvar configuração específica
export const salvarConfiguracao = (key, value) => {
    return db.ref(`copaV2/configuracoes/${key}`).set(value);
};

// ========== TURMAS ==========

// Carregar turmas
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

// Adicionar turma
export const adicionarTurma = async (novaTurma) => {
    const turmas = await carregarTurmas();
    if (!turmas.includes(novaTurma)) {
        turmas.push(novaTurma);
        await db.ref('copaV2/turmas').set(turmas);
        return true;
    }
    return false;
};

// Remover turma
export const removerTurma = async (turma) => {
    let turmas = await carregarTurmas();
    turmas = turmas.filter(t => t !== turma);
    await db.ref('copaV2/turmas').set(turmas);
};

// ========== INTERVALOS ==========

// Carregar intervalos de atualização
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

// Salvar intervalo individual
export const salvarIntervaloIndividual = (segundos) => {
    return db.ref('copaV2/configuracoes/intervalos/individual').set(segundos);
};

// Salvar intervalo equipes
export const salvarIntervaloEquipes = (segundos) => {
    return db.ref('copaV2/configuracoes/intervalos/equipes').set(segundos);
};

// ========== UTILITÁRIOS ==========

// Gerar ID único para aluno
export const gerarIdAluno = (nome, turma) => {
    return btoa(nome.toLowerCase() + '|' + turma).slice(0, 16);
};

// ========== EXPORTAR INSTÂNCIA DO DATABASE ==========
export default db;

// ========== VERIFICAR SE ESTÁ ONLINE ==========
export const isOnline = () => {
    return navigator.onLine;
};
