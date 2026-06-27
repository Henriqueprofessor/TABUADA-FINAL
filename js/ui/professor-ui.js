// ============================================================
// ARQUIVO: js/ui/professor-ui.js
// DESCRIÇÃO: Painel do Professor
// ============================================================

import { appState } from '../models/state.js';
import {
    updateCopa,
    setCopa,
    salvarConfiguracoes,
    carregarTurmas,
    adicionarTurma,
    removerTurma,
    salvarIntervaloIndividual,
    salvarIntervaloEquipes,
    listenToOnline,
    getOnce,
    participantesRef,
    resultadosRef,
    resultadosTempRef,
    classificadosRef,
    removeNode
} from '../services/firebase-service.js';
import {
    renderRankingIndividual,
    renderRankingTurmas,
    renderRankingGeral,
    setValorPartida,
    getValorPartida,
    limparCacheRanking
} from '../ranking/ranking.js';
import { toast, updateLastSyncTime, escapeHtml } from '../utils/helpers.js';
import { MODALIDADE_CONFIG, TOTAL_FASES, VAGAS_POR_FASE, VALOR_PARTIDA_KEY } from '../utils/constants.js';
import { soundManager } from '../utils/sounds.js';
import { confettiManager } from '../utils/confetti.js';
import { achievementManager } from '../utils/achievements.js';
import { notificationManager } from '../utils/notifications.js';
import { gamepadManager } from '../utils/gamepad.js';
import { syncService } from '../services/sync-service.js';
import { CONFIG_PADRAO } from '../config/firebase-config.js';
import { carregarValorPartidaDB, salvarValorPartidaDB } from '../services/firebase-service.js';

// ============================================================
// CONSTANTE: CHAVE PARA SALVAR O VALOR DA PARTIDA NO FIREBASE
// ============================================================
const VALOR_PARTIDA_KEY_DB = 'copaV2/configuracoes/valorPartida';

// ============================================================
// INICIALIZAR
// ============================================================
export function initProfessorUI() {
    console.log('✅ initProfessorUI chamado');

    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById('painel-professor').classList.remove('hidden');
    document.getElementById('online-stats').classList.remove('hidden');

    appState.subscribe((data) => {
        if (appState.userType === 'professor') {
            atualizarUIProfessor(data);
        }
    });

    configurarEventosProfessor();

    carregarTurmas().then(turmas => {
        renderListaTurmas(turmas);
    });

    listenToOnline((data) => {
        atualizarOnlineStats(data);
    });

    configurarSwitchesConfiguracoes();
    carregarConfiguracoes();
    carregarValorPartida();
    adicionarBlocoValorPartida();
}

// ============================================================
// ADICIONAR BLOCO "VALOR DA PARTIDA"
// ============================================================
function adicionarBlocoValorPartida() {
    if (document.getElementById('bloco-valor-partida')) return;

    const bloco = document.createElement('div');
    bloco.id = 'bloco-valor-partida';
    bloco.style.cssText = `
        background: #1e293b;
        padding: 24px;
        border-radius: 16px;
        margin: 20px;
        border: 1px solid #334155;
        max-width: 800px;
    `;

    bloco.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <span style="font-size: 28px;">💰</span>
            <h4 style="color: #f1f5f9; font-size: 18px; margin: 0;">Valor da Partida</h4>
            <span style="background: #3b82f6; color: white; font-size: 11px; padding: 2px 12px; border-radius: 30px; font-weight: 600;">NOVO</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px; line-height: 1.6;">
            Define quantos pontos uma partida completa vale. Este valor é usado para
            <strong>projetar a posição futura</strong> dos jogadores no ranking.
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: #0f172a; padding: 16px 20px; border-radius: 12px; border: 1px solid #2d3a4f;">
            <label for="input-valor-partida" style="color: #94a3b8; font-weight: 500; font-size: 14px;">Pontos por partida:</label>
            <input type="number" id="input-valor-partida" value="2000" min="1" max="10000" step="100"
                style="background: #1e293b; border: 1px solid #334155; color: #f1f5f9; padding: 10px 16px; border-radius: 10px; font-size: 16px; width: 180px; font-weight: 600;"/>
            <button id="btn-atualizar-valor-partida"
                style="background: #3b82f6; color: white; border: none; padding: 10px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.3s;">
                🔄 Atualizar
            </button>
            <span style="color: #64748b; font-size: 13px;">
                Valor atual: <strong id="valor-partida-atual" style="color: #4ade80; font-size: 15px;">2000</strong> pontos
            </span>
        </div>
        <div id="feedback-valor-partida" style="margin-top: 12px; padding: 8px 16px; border-radius: 8px; font-size: 14px; display: none;"></div>
        <div style="margin-top: 12px; padding: 12px 16px; background: #0f172a; border-radius: 8px; border-left: 3px solid #facc15;">
            <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                💡 <strong>Exemplo:</strong> Com 2000 pontos por partida, um jogador com
                <strong>1.00s</strong> de média projeta <strong>2000 pts</strong> na próxima partida,
                enquanto um com <strong>2.00s</strong> projeta <strong>1000 pts</strong>.
            </p>
        </div>
    `;

    const painel = document.getElementById('painel-professor');
    if (painel) {
        painel.insertBefore(bloco, painel.firstChild);
    }

    document.getElementById('btn-atualizar-valor-partida')?.addEventListener('click', window.atualizarValorPartida);
    document.getElementById('input-valor-partida')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') window.atualizarValorPartida();
    });
}

// ============================================================
// CARREGAR VALOR DA PARTIDA
// ============================================================
export async function carregarValorPartida() {
    try {
        const valor = await carregarValorPartidaDB();
        setValorPartida(valor);
        const input = document.getElementById('input-valor-partida');
        const exibicao = document.getElementById('valor-partida-atual');
        if (input) input.value = valor;
        if (exibicao) exibicao.textContent = valor;
        console.log(`✅ Valor da partida carregado: ${valor} pontos`);
    } catch (e) {
        console.warn('Erro ao carregar valor da partida:', e);
        setValorPartida(2000);
    }
}

// ============================================================
// SALVAR VALOR DA PARTIDA
// ============================================================
async function salvarValorPartida(novoValor) {
    if (!novoValor || novoValor < 1) {
        toast('❌ Digite um valor válido maior que 0.');
        return false;
    }

    try {
        await salvarValorPartidaDB(novoValor);
        setValorPartida(novoValor);
        limparCacheRanking();

        const exibicao = document.getElementById('valor-partida-atual');
        if (exibicao) exibicao.textContent = novoValor;

        const feedback = document.getElementById('feedback-valor-partida');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.style.background = '#14532d';
            feedback.style.color = '#4ade80';
            feedback.style.border = '1px solid #4ade80';
            feedback.textContent = `✅ Valor da partida atualizado para ${novoValor} pontos!`;
            setTimeout(() => { feedback.style.display = 'none'; }, 5000);
        }

        recarregarRankings();
        toast(`✅ Valor da partida atualizado para ${novoValor} pontos!`);
        return true;
    } catch (e) {
        console.error('Erro ao salvar valor da partida:', e);
        toast('❌ Erro ao salvar valor da partida.');
        return false;
    }
}

window.atualizarValorPartida = async function() {
    const input = document.getElementById('input-valor-partida');
    if (!input) {
        toast('❌ Erro: campo não encontrado.');
        return;
    }
    const novoValor = parseInt(input.value);
    await salvarValorPartida(novoValor);
};

function recarregarRankings() {
    const faseAtual = appState.fase || 1;
    const tabFase = document.getElementById('tab-ranking-fase');
    if (tabFase && !tabFase.classList.contains('hidden')) {
        const faseSelecionada = document.getElementById('select-fase-ranking')?.value || faseAtual;
        renderRankingIndividual(parseInt(faseSelecionada),
