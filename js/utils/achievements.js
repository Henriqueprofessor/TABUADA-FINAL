// js/utils/achievements.js
// Sistema de Medalhas e Conquistas (Gamificação)

window.AchievementManager = (function() {

    // ========== DEFINIÇÃO DAS CONQUISTAS ==========
    const ACHIEVEMENTS = {
        FIRST_GAME: {
            id: 'first_game',
            nome: '🎮 Primeira Partida',
            descricao: 'Jogou sua primeira partida!',
            icone: '🎮',
            cor: '#3498db'
        },
        TEN_ACERTS: {
            id: 'ten_acerts',
            nome: '⭐ 10 Acertos',
            descricao: 'Acertou 10 perguntas em uma partida!',
            icone: '⭐',
            cor: '#f39c12'
        },
        PERFECT: {
            id: 'perfect',
            nome: '💯 Perfeição!',
            descricao: 'Acertou todas as 20 perguntas!',
            icone: '💯',
            cor: '#2ecc71'
        },
        CLASSIFIED: {
            id: 'classified',
            nome: '🏅 Classificado!',
            descricao: 'Classificou para a próxima fase!',
            icone: '🏅',
            cor: '#9b59b6'
        },
        FINALIST: {
            id: 'finalist',
            nome: '🏆 Finalista!',
            descricao: 'Chegou à grande final!',
            icone: '🏆',
            cor: '#e74c3c'
        },
        CHAMPION: {
            id: 'champion',
            nome: '👑 CAMPEÃO!',
            descricao: 'Venceu a Copa Tabuada CEIB 2026!',
            icone: '👑',
            cor: '#f1c40f'
        },
        SPEEDSTER: {
            id: 'speedster',
            nome: '⚡ Velocista',
            descricao: 'Respondeu todas as perguntas em menos de 30 segundos!',
            icone: '⚡',
            cor: '#1abc9c'
        },
        TEN_GAMES: {
            id: 'ten_games',
            nome: '🎯 Veterano',
            descricao: 'Jogou 10 partidas!',
            icone: '🎯',
            cor: '#e67e22'
        }
    };

    // ========== VERIFICAR CONQUISTAS ==========
    function verificarConquistas(alunoId, dados) {
        const conquistadas = obterConquistasAluno(alunoId);
        const novas = [];

        // 1. Primeira partida
        if (!conquistadas.includes('first_game') && dados.totalPartidas >= 1) {
            novas.push('first_game');
        }

        // 2. 10 acertos em uma partida
        if (!conquistadas.includes('ten_acerts') && dados.melhorAcertos >= 10) {
            novas.push('ten_acerts');
        }

        // 3. Perfeição (20 acertos)
        if (!conquistadas.includes('perfect') && dados.melhorAcertos >= 20) {
            novas.push('perfect');
        }

        // 4. Classificado para próxima fase
        if (!conquistadas.includes('classified') && dados.classificado) {
            novas.push('classified');
        }

        // 5. Finalista (chegou à fase 5)
        if (!conquistadas.includes('finalist') && dados.faseMaxima >= 5) {
            novas.push('finalist');
        }

        // 6. Campeão (venceu a competição)
        if (!conquistadas.includes('champion') && dados.campeao) {
            novas.push('champion');
        }

        // 7. Velocista (tempo total < 30s)
        if (!conquistadas.includes('speedster') && dados.melhorTempoTotal < 30 && dados.melhorAcertos >= 20) {
            novas.push('speedster');
        }

        // 8. Veterano (10 partidas)
        if (!conquistadas.includes('ten_games') && dados.totalPartidas >= 10) {
            novas.push('ten_games');
        }

        // Salvar novas conquistas
        if (novas.length > 0) {
            salvarConquistas(alunoId, conquistadas, novas);
            // Exibir popups
            novas.forEach(id => {
                const ach = ACHIEVEMENTS[id];
                if (ach) mostrarPopupMedalha(ach);
            });
        }

        return novas;
    }

    // ========== SALVAR CONQUISTAS NO LOCALSTORAGE ==========
    function obterConquistasAluno(alunoId) {
        const key = `achievements_${alunoId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    }

    function salvarConquistas(alunoId, existentes, novas) {
        const key = `achievements_${alunoId}`;
        const todas = [...existentes, ...novas];
        localStorage.setItem(key, JSON.stringify(todas));
    }

    // ========== EXIBIR POPUP DA MEDALHA ==========
    function mostrarPopupMedalha(achievement) {
        // Remove popups antigos
        const antigos = document.querySelectorAll('.medalha-popup');
        antigos.forEach(el => el.remove());

        const popup = document.createElement('div');
        popup.className = 'medalha-popup';
        popup.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border: 2px solid ${achievement.cor};
            border-radius: 20px;
            padding: 20px 30px;
            z-index: 99999;
            box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            animation: medalhaEntrada 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
            max-width: 350px;
            width: 90%;
            text-align: center;
            color: white;
        `;
        popup.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 5px;">${achievement.icone}</div>
            <div style="font-size: 20px; font-weight: bold; color: ${achievement.cor};">🏅 CONQUISTA DESBLOQUEADA!</div>
            <div style="font-size: 22px; font-weight: bold; margin: 8px 0;">${achievement.nome}</div>
            <div style="font-size: 14px; opacity: 0.8;">${achievement.descricao}</div>
            <div style="margin-top: 12px;">
                <button onclick="this.parentElement.parentElement.remove()" style="background: ${achievement.cor}; border: none; color: #fff; padding: 6px 20px; border-radius: 30px; cursor: pointer; font-weight: bold;">👏 Legal!</button>
            </div>
        `;
        document.body.appendChild(popup);

        // Remove após 8 segundos automaticamente
        setTimeout(() => {
            if (popup.parentNode) popup.remove();
        }, 8000);

        // Som de conquista
        if (window.soundManager) {
            window.soundManager.playCelebration();
        }
    }

    // ========== RENDERIZAR MEDALHAS DO ALUNO ==========
    function renderizarMedalhas(alunoId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const conquistas = obterConquistasAluno(alunoId);
        if (conquistas.length === 0) {
            container.innerHTML = '<p style="opacity:0.6; text-align:center;">Nenhuma medalha ainda. Continue jogando!</p>';
            return;
        }

        let html = '<div style="display: flex; flex-wrap: wrap; gap: 12px; justify-content: center;">';
        conquistas.forEach(id => {
            const ach = ACHIEVEMENTS[id];
            if (ach) {
                html += `
                    <div style="background: #1f3a4b; border-radius: 16px; padding: 12px 16px; text-align: center; min-width: 80px; border: 2px solid ${ach.cor};">
                        <div style="font-size: 32px;">${ach.icone}</div>
                        <div style="font-size: 12px; font-weight: bold; margin-top: 4px; color: #eee;">${ach.nome}</div>
                    </div>
                `;
            }
        });
        html += '</div>';
        container.innerHTML = html;
    }

    // ========== INJETAR CSS DA ANIMAÇÃO ==========
    function injectStyles() {
        if (document.getElementById('achievement-styles')) return;
        const style = document.createElement('style');
        style.id = 'achievement-styles';
        style.textContent = `
            @keyframes medalhaEntrada {
                0% { opacity: 0; transform: translateX(60px) scale(0.8); }
                100% { opacity: 1; transform: translateX(0) scale(1); }
            }
            .medalha-popup {
                animation: medalhaEntrada 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
            }
        `;
        document.head.appendChild(style);
    }

    // ========== EXPORTAÇÃO GLOBAL ==========
    injectStyles();

    window.achievementManager = {
        verificarConquistas,
        renderizarMedalhas,
        obterConquistasAluno,
        ACHIEVEMENTS
    };

    return window.achievementManager;
})();
