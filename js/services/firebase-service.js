// ============================================================
// ARQUIVO: js/services/firebase-service.js
// DESCRIÇÃO: Serviço de comunicação com Firebase Realtime Database
// ============================================================

import { initializeApp } from 'firebase/app';
import { 
    getDatabase, 
    ref, 
    set, 
    update, 
    remove, 
    onValue, 
    push, 
    child, 
    onDisconnect, 
    serverTimestamp,
    get,
    query,
    orderByChild,
    limitToLast,
    equalTo
} from 'firebase/database';
import { firebaseConfig } from '../config/firebase-config.js';

// ========== INICIALIZAR FIREBASE ==========
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ========== REFERÊNCIAS PRINCIPAIS ==========
export const database = db;
export const copaRef = ref(db, 'copaV2');
export const onlineRef = ref(db, 'online');
export const configRef = ref(db, 'copaV2/configuracoes');

// ========== REFERÊNCIAS POR FASE ==========
export const resultadosRef = (fase) => ref(db, `copaV2/resultados/${fase}`);
export const resultadosTempRef = (fase) => ref(db, `copaV2/resultados_temp/${fase}`);
export const participantesRef = (fase) => ref(db, `copaV2/participantes/${fase}`);
export const classificadosRef = (fase) => ref(db, `copaV2/classificados/${fase}`);

// ========== REFERÊNCIAS POR ALUNO ==========
export const resultadoAlunoRef = (fase, alunoId) => ref(db, `copaV2/resultados/${fase}/${alunoId}`);
export const resultadoTempAlunoRef = (fase, alunoId) => ref(db, `copaV2/resultados_temp/${fase}/${alunoId}`);
export const participanteAlunoRef = (fase, alunoId) => ref(db, `copaV2/participantes/${fase}/${alunoId}`);

// ========== MÉTODOS GENÉRICOS ==========

// Atualizar dados da copa
export const updateCopa = (data) => update(copaRef, data);

// Definir dados da copa (substitui tudo)
export const setCopa = (data) => set(copaRef, data);

// Remover nó
export const removeNode = (path) => remove(ref(db, path));

// Obter dados uma vez
export const getOnce = (path) => get(ref(db, path));

// ========== LISTENERS ==========

// Escutar mudanças na copa
export const listenToCopa = (callback) => {
    return onValue(copaRef, (snap) => {
        const data = snap.val();
        callback(data);
    });
};

// Escutar mudanças nos resultados de uma fase
export const listenToResultados = (fase, callback) => {
    return onValue(resultadosRef(fase), (snap) => {
        callback(snap.val());
    });
};

// Escutar mudanças nos resultados temporários de uma fase
export const listenToResultadosTemp = (fase, callback) => {
    return onValue(resultadosTempRef(fase), (snap) => {
        callback(snap.val());
    });
};

// Escutar mudanças nos participantes de uma fase
export const listenToParticipantes = (fase, callback) => {
    return onValue(participantesRef(fase), (snap) => {
        callback(snap.val());
    });
};

// Escutar mudanças nos classificados de uma fase
export const listenToClassificados = (fase, callback) => {
    return onValue(classificadosRef(fase), (snap) => {
        callback(snap.val());
    });
};

// Escutar usuários online
export const listenToOnline = (callback) => {
    return onValue(onlineRef, (snap) => {
        callback(snap.val());
    });
};

// Escutar configurações
export const listenToConfiguracoes = (callback) => {
    return onValue(configRef, (snap) => {
        callback(snap.val());
    });
};

// ========== PRESENÇA (ONLINE) ==========

// Definir presença do usuário
export const setPresence = (id, data) => {
    const presenceRef = ref(db, `online/${id}`);
    set(presenceRef, data);
    onDisconnect(presenceRef).remove();
};

// Remover presença
export const removePresence = (id) => {
    remove(ref(db, `online/${id}`));
};

// ========== RESULTADOS ==========

// Salvar resultado de uma partida
export const salvarResultado = async (fase, alunoId, partida) => {
    const ref = resultadoAlunoRef(fase, alunoId);
    await ref.transaction((currentData) => {
        const lista = currentData || [];
        lista.push(partida);
        return lista;
    });
};

// Salvar resultado temporário (durante a partida)
export const salvarResultadoTemp = (fase, alunoId, dados) => {
    return set(resultadoTempAlunoRef(fase, alunoId), dados);
};

// Remover resultado temporário
export const removerResultadoTemp = (fase, alunoId) => {
    return remove(resultadoTempAlunoRef(fase, alunoId));
};

// ========== PARTICIPANTES ==========

// Adicionar participante
export const adicionarParticipante = (fase, alunoId, dados) => {
    return set(participanteAlunoRef(fase, alunoId), dados);
};

// Remover participante
export const removerParticipante = (fase, alunoId) => {
    return remove(participanteAlunoRef(fase, alunoId));
};

// ========== CLASSIFICADOS ==========

// Classificar alunos para a próxima fase
export const classificarAlunos = async (fase, ids) => {
    const ref = classificadosRef(fase);
    return set(ref, ids);
};

// Verificar se um aluno está classificado
export const isClassificado = async (fase, alunoId) => {
    const snap = await get(classificadosRef(fase));
    const ids = snap.val() || [];
    return ids.includes(alunoId);
};

// ========== CONFIGURAÇÕES ==========

// Salvar configurações gerais
export const salvarConfiguracoes = (config) => {
    return set(configRef, config);
};

// Salvar configuração específica
export const salvarConfiguracao = (key, value) => {
    return set(ref(db, `copaV2/configuracoes/${key}`), value);
};

// ========== TURMAS ==========

// Carregar turmas
export const carregarTurmas = async () => {
    const snap = await get(ref(db, 'copaV2/turmas'));
    let turmas = snap.val();
    if (!turmas || !Array.isArray(turmas) || turmas.length === 0) {
        const TURMAS_PADRAO = ["901", "1001", "1002", "1003", "1004", "2001", "2002", "2003", "3001", "3002"];
        await set(ref(db, 'copaV2/turmas'), TURMAS_PADRAO);
        return TURMAS_PADRAO;
    }
    return turmas;
};

// Adicionar turma
export const adicionarTurma = async (novaTurma) => {
    const turmas = await carregarTurmas();
    if (!turmas.includes(novaTurma)) {
        turmas.push(novaTurma);
        await set(ref(db, 'copaV2/turmas'), turmas);
        return true;
    }
    return false;
};

// Remover turma
export const removerTurma = async (turma) => {
    let turmas = await carregarTurmas();
    turmas = turmas.filter(t => t !== turma);
    await set(ref(db, 'copaV2/turmas'), turmas);
};

// ========== INTERVALOS ==========

// Carregar intervalos de atualização
export const carregarIntervalos = async () => {
    const snap = await get(ref(db, 'copaV2/configuracoes/intervalos'));
    const config = snap.val();
    if (config) {
        return {
            individual: config.individual || 4,
            equipes: config.equipes || 60
        };
    }
    await set(ref(db, 'copaV2/configuracoes/intervalos'), { individual: 4, equipes: 60 });
    return { individual: 4, equipes: 60 };
};

// Salvar intervalo individual
export const salvarIntervaloIndividual = (segundos) => {
    return set(ref(db, 'copaV2/configuracoes/intervalos/individual'), segundos);
};

// Salvar intervalo equipes
export const salvarIntervaloEquipes = (segundos) => {
    return set(ref(db, 'copaV2/configuracoes/intervalos/equipes'), segundos);
};

// ========== UTILITÁRIOS ==========

// Gerar ID único para aluno
export const gerarIdAluno = (nome, turma) => {
    return btoa(nome.toLowerCase() + '|' + turma).slice(0, 16);
};

// ========== EXPORTAR INSTÂNCIA DO DATABASE ==========
export default db;
