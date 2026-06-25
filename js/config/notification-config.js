// ============================================================
// ARQUIVO: js/config/notification-config.js
// DESCRIÇÃO: Configuração do Sistema de Notificações Visuais
// ============================================================

export const NOTIFICATION_CONFIG = {
    // ========== CONFIGURAÇÕES GERAIS ==========
    DURACAO_PADRAO: 3,        // segundos
    DURACAO_MIN: 0.5,
    DURACAO_MAX: 5,
    
    LIMITE_RAPIDO_PADRAO: 1.5, // segundos (para notificação de resposta rápida)
    LIMITE_RAPIDO_MIN: 0.5,
    LIMITE_RAPIDO_MAX: 5,

    // ========== DEFINIÇÃO DAS NOTIFICAÇÕES ==========
    notificacoes: {
        // 1. 5 acertos seguidos
        seq5: {
            id: 'seq5',
            nome: '5 acertos seguidos',
            icone: '🎉',
            mensagem: '5 acertos seguidos! Continue assim!',
            cor: '#9b59b6',
            duracao: 3,
            ativo: true,
            efeito: 'brilho-sutil',
            confete: false,
            som: false
        },
        // 2. 10 acertos seguidos
        seq10: {
            id: 'seq10',
            nome: '10 acertos seguidos',
            icone: '🔥',
            mensagem: '10 ACERTOS SEGUIDOS! Imparável!',
            cor: '#f1c40f',
            duracao: 3,
            ativo: true,
            efeito: 'brilho-medio',
            confete: true,
            som: false
        },
        // 3. 15 acertos seguidos
        seq15: {
            id: 'seq15',
            nome: '15 acertos seguidos',
            icone: '🚀',
            mensagem: '15 ACERTOS! Você é uma máquina!',
            cor: '#e67e22',
            duracao: 3,
            ativo: true,
            efeito: 'brilho-forte',
            confete: false,
            som: false
        },
        // 4. 20 acertos seguidos (perfeição)
        seq20: {
            id: 'seq20',
            nome: '20 acertos seguidos (Perfeição)',
            icone: '👑',
            mensagem: 'PERFEIÇÃO! 20/20! INCRÍVEL!',
            cor: '#f1c40f',
            duracao: 3,
            ativo: true,
            efeito: 'brilho-maximo',
            confete: true,
            som: true
        },
        // 5. Recorde da fase
        recordeFase: {
            id: 'recordeFase',
            nome: 'Recorde da fase',
            icone: '⭐',
            mensagem: 'NOVO RECORDE DA FASE! {pontos} pts!',
            cor: '#3498db',
            duracao: 3,
            ativo: true,
            efeito: 'brilho-azul',
            confete: true,
            som: false
        },
        // 6. Recorde geral
        recordeGeral: {
            id: 'recordeGeral',
            nome: 'Recorde geral',
            icone: '🏆',
            mensagem: 'NOVO RECORDE GERAL! {pontos} pts!',
            cor: '#e74c3c',
            duracao: 3,
            ativo: true,
            efeito: 'brilho-maximo',
            confete: true,
            som: true
        },
        // 7. Resposta rápida
        rapido: {
            id: 'rapido',
            nome: 'Resposta rápida',
            icone: '⚡',
            mensagem: 'RESPOSTA RÁPIDA! {tempo}s!',
            cor: '#2ecc71',
            duracao: 3,
            ativo: true,
            efeito: 'piscada-rapida',
            confete: false,
            som: false,
            limiteRapido: 1.5
        },
        // 8. Resposta relâmpago
        relampago: {
            id: 'relampago',
            nome: 'Resposta relâmpago',
            icone: '🎯',
            mensagem: 'RESPOSTA RELÂMPAGO! {tempo}s!',
            cor: '#f1c40f',
            duracao: 3,
            ativo: true,
            efeito: 'brilho-rapido',
            confete: true,
            som: false,
            limiteRelampago: 1.0
        },
        // 9. 3 erros seguidos (incentivo)
        erro3: {
            id: 'erro3',
            nome: '3 erros seguidos',
            icone: '💪',
            mensagem: '💪 Continue tentando! Você consegue!',
            cor: '#7f8c8d',
            duracao: 3,
            ativo: true,
            efeito: 'nenhum',
            confete: false,
            som: false
        },
        // 10. 5 erros seguidos (incentivo)
        erro5: {
            id: 'erro5',
            nome: '5 erros seguidos',
            icone: '🌟',
            mensagem: '🌟 Não desista! A próxima vai dar certo!',
            cor: '#7f8c8d',
            duracao: 3,
            ativo: true,
            efeito: 'nenhum',
            confete: false,
            som: false
        }
    }
};

// ============================================================
// FUNÇÃO PARA VERIFICAR SE NOTIFICAÇÃO ESTÁ ATIVA
// ============================================================

export function isNotificationActive(notificationId, config = NOTIFICATION_CONFIG) {
    const notif = config.notificacoes[notificationId];
    return notif ? notif.ativo : false;
}

// ============================================================
// FUNÇÃO PARA OBTER NOTIFICAÇÃO POR ID
// ============================================================

export function getNotification(notificationId, config = NOTIFICATION_CONFIG) {
    return config.notificacoes[notificationId] || null;
}

// ============================================================
// FUNÇÃO PARA ATUALIZAR CONFIGURAÇÃO DE UMA NOTIFICAÇÃO
// ============================================================

export function updateNotificationConfig(notificationId, updates, config = NOTIFICATION_CONFIG) {
    if (config.notificacoes[notificationId]) {
        Object.assign(config.notificacoes[notificationId], updates);
        return true;
    }
    return false;
}

// ============================================================
// CONFIGURAÇÕES PARA O PAINEL DO PROFESSOR
// ============================================================

export const NOTIFICATION_CONFIG_UI = {
    titulo: "📢 Notificações Visuais",
    descricao: "Popups animados que aparecem durante o jogo para motivar os alunos",
    campos: [
        {
            id: "cfg-notificacoes-geral",
            tipo: "switch",
            label: "📢 Ativar Notificações Visuais",
            descricao: "Habilita/desabilita todas as notificações visuais do jogo",
            padrao: true
        },
        {
            id: "cfg-notificacoes-duracao",
            tipo: "range",
            label: "⏱️ Duração das Notificações",
            descricao: "Tempo que cada notificação fica visível na tela (0.5 a 5 segundos)",
            min: 0.5,
            max: 5,
            padrao: 3,
            unidade: "s",
            step: 0.1
        },
        {
            id: "cfg-notificacoes-sequencias",
            tipo: "switch",
            label: "📊 Notificações de Sequências",
            descricao: "Exibe notificações para sequências de acertos (5, 10, 15, 20)",
            padrao: true
        },
        {
            id: "cfg-notificacoes-recordes",
            tipo: "switch",
            label: "🏆 Notificações de Recordes",
            descricao: "Exibe notificações para recordes da fase e gerais",
            padrao: true
        },
        {
            id: "cfg-notificacoes-velocidade",
            tipo: "switch",
            label: "⚡ Notificações de Velocidade",
            descricao: "Exibe notificações para respostas rápidas e relâmpago",
            padrao: true
        },
        {
            id: "cfg-notificacoes-incentivo",
            tipo: "switch",
            label: "💪 Notificações de Incentivo",
            descricao: "Exibe mensagens de incentivo quando o aluno erra várias vezes",
            padrao: true
        },
        {
            id: "cfg-notificacoes-limite-rapido",
            tipo: "range",
            label: "⚡ Limite para Resposta Rápida",
            descricao: "Tempo máximo (em segundos) para considerar uma resposta como 'rápida'",
            min: 0.5,
            max: 5,
            padrao: 1.5,
            unidade: "s",
            step: 0.1
        }
    ]
};
