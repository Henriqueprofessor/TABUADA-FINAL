// ============================================================
// ARQUIVO: js/utils/constants.js
// DESCRIÇÃO: Constantes globais do jogo
// ============================================================

// ========== CONFIGURAÇÕES DO JOGO ==========
export const TOTAL_FASES = 5;
export const TOTAL_PERGUNTAS = 20;
export const TEMPO_PERGUNTA = 10; // segundos

// ========== VAGAS POR FASE ==========
export const VAGAS_POR_FASE = {
    1: 30,
    2: 20,
    3: 10,
    4: 5,
    5: 5
};

// ========== MODALIDADES DE TABUADA ==========
export const MODALIDADE_CONFIG = {
    "2-5": { 
        min: 2, 
        max: 5, 
        nome: "Tabuada 2️⃣➡️5️⃣",
        descricao: "Tabuada do 2 ao 5 - Nível Fácil"
    },
    "6-9": { 
        min: 6, 
        max: 9, 
        nome: "Tabuada 6️⃣➡️9️⃣",
        descricao: "Tabuada do 6 ao 9 - Nível Médio"
    },
    "0-10": { 
        min: 0, 
        max: 10, 
        nome: "Tabuada 0️⃣➡️🔟 (Completa)",
        descricao: "Tabuada do 0 ao 10 - Nível Difícil"
    }
};

// ========== TURMAS PADRÃO ==========
export const TURMAS_PADRAO = [
    "901", "1001", "1002", "1003", "1004",
    "2001", "2002", "2003", "3001", "3002"
];

// ========== MENSAGENS DO JOGO ==========
export const MENSAGENS = {
    aguardando: "⏳ Aguardando liberação do professor...",
    em_andamento: "✅ Fase liberada! Clique em JOGAR.",
    pausado: "⏸️ Fase pausada pelo professor.",
    finalizado: "🏆 Competição finalizada!",
    tempo_esgotado: "⏰ TEMPO ESGOTADO!",
    nao_classificado: "❌ Você NÃO foi classificado para esta fase.",
    sem_internet: "📶 Sem conexão com a internet. Partida será salva localmente.",
    sincronizado: "✅ Partida sincronizada com sucesso!"
};

// ========== CORES DO JOGO ==========
export const CORES = {
    primaria: "#ffd966",
    secundaria: "#1f3a4b",
    fundo: "#0a0f1e",
    card: "rgba(12,20,35,0.9)",
    sucesso: "#27ae60",
    erro: "#e74c3c",
    alerta: "#f39c12",
    info: "#3498db",
    destaque: "#e67e22"
};
