// ============================================================
// ARQUIVO: js/config/firebase-config.js
// DESCRIÇÃO: Configuração do Firebase
// ============================================================

export const firebaseConfig = {
    apiKey: "AIzaSyAA_5rBa-eQ4611y3Kg8B-VBz0-o2HVhEE",
    authDomain: "final-copa-tabuada.firebaseapp.com",
    databaseURL: "https://final-copa-tabuada-default-rtdb.firebaseio.com",
    projectId: "final-copa-tabuada",
    storageBucket: "final-copa-tabuada.firebasestorage.app",
    messagingSenderId: "488825824115",
    appId: "1:488825824115:web:50e94f68253473aee91b06"
};

// ========== CONFIGURAÇÕES PADRÃO ==========
export const CONFIG_PADRAO = {
    confetes: true,
    notificacoes: true,
    brilho: true,
    sons: true,
    sonsCelebracao: true,
    sonsErro: true,
    bonus: true,
    conquistas: true,
    gamepad: true,
    syncOffline: true
};

// ========== CHAVES DO FIREBASE ==========
export const FIREBASE_KEYS = {
    COPA: 'copaV2',
    ONLINE: 'online',
    CONFIGURACOES: 'copaV2/configuracoes',
    RESULTADOS: 'copaV2/resultados',
    RESULTADOS_TEMP: 'copaV2/resultados_temp',
    PARTICIPANTES: 'copaV2/participantes',
    CLASSIFICADOS: 'copaV2/classificados',
    TURMAS: 'copaV2/turmas',
    INTERVALOS: 'copaV2/configuracoes/intervalos',
    VALOR_PARTIDA: 'copaV2/configuracoes/valorPartida'
};
