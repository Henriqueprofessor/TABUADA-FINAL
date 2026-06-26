// ============================================================
// ARQUIVO: js/config/firebase-config.js
// DESCRIÇÃO: Configuração do Firebase - VERSÃO CORRIGIDA
// ============================================================

// ============================================================
// CONFIGURAÇÕES DO FIREBASE (DECLARADO PRIMEIRO)
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

// ============================================================
// VERIFICAR SE O FIREBASE FOI CARREGADO
// ============================================================

// Verificar se o Firebase está disponível (carregado pelo HTML)
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase NÃO foi carregado!');
    console.error('Verifique se os scripts do Firebase estão no HTML.');
} else {
    console.log('✅ Firebase carregado com sucesso! Versão:', firebase.SDK_VERSION);
}

// ============================================================
// CONFIGURAÇÕES PADRÃO DO JOGO
// ============================================================

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

// ============================================================
// CONSTANTES DO JOGO
// ============================================================

export const TOTAL_FASES = 5;
export const TOTAL_PERGUNTAS = 20;

export const VAGAS_POR_FASE = {
    1: 30,
    2: 20,
    3: 10,
    4: 5,
    5: 5
};

export const MODALIDADE_CONFIG = {
    "2-5": { min: 2, max: 5, nome: "Tabuada 2️⃣➡️5️⃣" },
    "6-9": { min: 6, max: 9, nome: "Tabuada 6️⃣➡️9️⃣" },
    "0-10": { min: 0, max: 10, nome: "Tabuada 0️⃣➡️🔟 (Completa)" }
};

export const TURMAS_PADRAO = [
    "901", "1001", "1002", "1003", "1004",
    "2001", "2002", "2003", "3001", "3002"
];
