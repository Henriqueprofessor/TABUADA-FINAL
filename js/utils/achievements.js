// ============================================================
// ARQUIVO: js/utils/achievements.js
// ============================================================

import { soundManager } from './sounds.js';
import { confettiManager } from './confetti.js';

class AchievementManager {
    constructor() {
        this.config = { conquistas: true };
        this.ACHIEVEMENTS = {
            first_game: { id: 'first_game', nome: '🎮 Primeira Partida', descricao: 'Jogou sua primeira partida!', icone: '🎮', cor: '#3498db' },
            ten_acerts: { id: 'ten_acerts', nome: '⭐ 10 Acertos', descricao: 'Acertou 10 perguntas em uma partida!', icone: '⭐', cor: '#f39c12' },
            perfect: { id: 'perfect', nome: '💯 Perfeição!', descricao: 'Acertou todas as 20 perguntas!', icone: '💯', cor: '#2ecc71' },
            classified: { id: 'classified', nome: '🏅 Classificado!', descricao: 'Classificou para a próxima fase!', icone: '🏅', cor: '#9b59b6' },
            finalist: { id: 'finalist', nome: '🏆 Finalista!', descricao: 'Chegou à grande final!', icone: '🏆', cor: '#e74c3c' },
            champion: { id: 'champion', nome: '👑 CAMPEÃO!', descricao: 'Venceu a Copa Tabuada CEIB 2026!', icone: '👑', cor: '#f1c40f' },
            speedster: { id: 'speedster', nome: '⚡ Velocista', descricao: 'Respondeu todas em menos de 30s!', icone: '⚡', cor: '#1abc9c' },
            ten_games: { id: 'ten_games', nome: '🎯 Veterano', descricao: 'Jogou 10 partidas!', icone: '🎯', cor: '#e67e22' }
        };
    }

    obterConquistas(alunoId) {
        if (!alunoId) return [];
        try {
            const data = localStorage.getItem(`achievements_${alunoId}`);
            return data ? JSON.parse(data) : [];
        } catch (e) { return []; }
    }

    salvarConquistas(alunoId, conquistas) {
        try {
            localStorage.setItem(`achievements_${alunoId}`, JSON.stringify(conquistas));
        } catch (e) { /* ignora */ }
    }

    verificarConquistas(alunoId, dados) {
        if (!this.config.conquistas || !alunoId) return [];

        const conquistadas = this.obterConquistas(alunoId);
        const novas = [];

        if (!conquistadas.includes('first_game') && dados.totalPartidas >= 1) novas.push('first_game');
        if (!conquistadas.includes('ten_acerts') && dados.melhorAcertos >= 10) novas.push('ten_acerts');
        if (!conquistadas.includes('perfect') && dados.melhorAcertos >= 20) novas.push('perfect');
        if (!conquistadas.includes('classified') && dados.classificado) novas.push('classified');
        if (!conquistadas.includes('finalist') && dados.faseMaxima >= 5) novas.push('finalist');
        if (!conquistadas.includes('champion') && dados.campeao) novas.push('champion');
        if (!conquistadas.includes('speedster') && dados.melhorTempoTotal < 30 && dados.melhorAcertos >= 20) novas.push('speedster');
        if (!conquistadas.includes('ten_games') && dados.totalPartidas >= 10) novas.push('ten_games');

        if (novas.length > 0) {
            const todas = [...conquistadas, ...novas];
            this.salvarConquistas(alunoId, todas);
            novas.forEach(id => {
                const ach = this.ACHIEVEMENTS[id];
                if (ach) this.mostrarPopup(ach);
            });
        }
        return novas;
    }

    mostrarPopup(ach) {
        const popup = document.createElement('div');
        popup.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: #1a1a2e; border: 2px solid ${ach.cor};
            border-radius: 20px; padding: 20px 30px;
            z-index: 99999; box-shadow: 0 10px 40px rgba(0,0,0,0.6);
            max-width: 350px; text-align: center; color: white;
            animation: medalhaEntrada 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        `;
        popup.innerHTML = `
            <div style="font-size:48px;">${ach.icone}</div>
            <div style="font-size:20px;font-weight:bold;color:${ach.cor};">🏅 CONQUISTA DESBLOQUEADA!</div>
            <div style="font-size:22px;font-weight:bold;margin:8px 0;">${ach.nome}</div>
            <div style="font-size:14px;opacity:0.8;">${ach.descricao}</div>
            <button onclick="this.parentElement.remove()" style="background:${ach.cor};border:none;color:#fff;padding:6px 20px;border-radius:30px;cursor:pointer;font-weight:bold;margin-top:12px;">👏 Legal!</button>
        `;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 8000);
        if (soundManager.config.sonsCelebracao) soundManager.playCelebration();
        if (confettiManager.config.confetes) confettiManager.fireCelebration();
    }

    renderizarMedalhas(alunoId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        const conquistas = this.obterConquistas(alunoId);
        if (conquistas.length === 0) {
            container.innerHTML = '<p style="opacity:0.6;text-align:center;">Nenhuma medalha ainda. Continue jogando!</p>';
            return;
        }
        let html = '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;">';
        conquistas.forEach(id => {
            const ach = this.ACHIEVEMENTS[id];
            if (ach) {
                html += `<div style="background:#1f3a4b;border-radius:16px;padding:12px 16px;text-align:center;min-width:80px;border:2px solid ${ach.cor};">
                    <div style="font-size:32px;">${ach.icone}</div>
                    <div style="font-size:12px;font-weight:bold;margin-top:4px;color:#eee;">${ach.nome}</div>
                </div>`;
            }
        });
        html += '</div>';
        container.innerHTML = html;
    }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}

export const achievementManager = new AchievementManager();
