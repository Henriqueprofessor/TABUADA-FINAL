// js/config/notification-config.js
// Configuração centralizada de notificações do jogo

window.NOTIFICATION_CONFIG = {
    // ========== CONFIGURAÇÕES GERAIS ==========
    DURACAO_PADRAO: 3, // segundos
    DURACAO_MIN: 0.5,
    DURACAO_MAX: 5,
    LIMITE_RAPIDO_PADRAO: 1.5, // segundos (para notificação #7)
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
            cor: '#9b59b6', // Roxo
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
            cor: '#f1c40f', // Dourado
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
            cor: '#e67e22', // Laranja
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
            cor: '#f1c40f', // Dourado
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
            cor: '#3498db', // Azul
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
            cor: '#e74c3c', // Vermelho
            duracao: 3,
            ativo: true,
            efeito: 'brilho-maximo',
            confete: true,
            som: true
        },
        // 7. Resposta rápida (< limite configurável)
        rapido: {
            id: 'rapido',
            nome: 'Resposta rápida',
            icone: '⚡',
            mensagem: 'RESPOSTA RÁPIDA! {tempo}s!',
            cor: '#2ecc71', // Verde
            duracao: 3,
            ativo: true,
            efeito: 'piscada-rapida',
            confete: false,
            som: false,
            limiteRapido: 1.5 // configurável
        },
        // 8. Resposta relâmpago (< 1s)
        relampago: {
            id: 'relampago',
            nome: 'Resposta relâmpago',
            icone: '🎯',
            mensagem: 'RESPOSTA RELÂMPAGO! {tempo}s!',
            cor: '#f1c40f', // Dourado
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
            cor: '#7f8c8d', // Cinza
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
            cor: '#7f8c8d', // Cinza
            duracao: 3,
            ativo: true,
            efeito: 'nenhum',
            confete: false,
            som: false
        }
    }
};

// Salva no localStorage para persistência
window.NOTIFICATION_CONFIG.salvar = function() {
    try {
        localStorage.setItem('notification_config', JSON.stringify(window.NOTIFICATION_CONFIG.notificacoes));
        localStorage.setItem('notification_config_geral', JSON.stringify({
            duracaoPadrao: window.NOTIFICATION_CONFIG.DURACAO_PADRAO,
            limiteRapido: window.NOTIFICATION_CONFIG.notificacoes.rapido.limiteRapido
        }));
    } catch (e) {
        console.warn('Erro ao salvar configuração de notificações:', e);
    }
};

// Carrega do localStorage
window.NOTIFICATION_CONFIG.carregar = function() {
    try {
        const salvo = localStorage.getItem('notification_config');
        if (salvo) {
            const config = JSON.parse(salvo);
            Object.keys(config).forEach(key => {
                if (window.NOTIFICATION_CONFIG.notificacoes[key]) {
                    Object.assign(window.NOTIFICATION_CONFIG.notificacoes[key], config[key]);
                }
            });
        }
        const geral = localStorage.getItem('notification_config_geral');
        if (geral) {
            const g = JSON.parse(geral);
            if (g.duracaoPadrao) window.NOTIFICATION_CONFIG.DURACAO_PADRAO = g.duracaoPadrao;
            if (g.limiteRapido) window.NOTIFICATION_CONFIG.notificacoes.rapido.limiteRapido = g.limiteRapido;
        }
    } catch (e) {
        console.warn('Erro ao carregar configuração de notificações:', e);
    }
};

// Carrega ao iniciar
window.NOTIFICATION_CONFIG.carregar();
