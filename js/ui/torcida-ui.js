// ============================================================
// ARQUIVO: js/ui/torcida-ui.js
// DESCRIÇÃO: Interface da Torcida
// ============================================================

import { appState } from '../models/state.js';
import { setPresence, removePresence } from '../services/firebase-service.js';
import { renderRankingIndividual, renderRankingTurmas } from '../ranking/ranking.js';
import { toast, formatarTempo } from '../utils/helpers.js';
import { MODALIDADE_CONFIG } from '../utils/constants.js';

// ========== VARIÁVEIS ==========
let intervaloTorcidaIndividual = null;
let intervaloTorcidaEquipes = null;
let modoTorcida = 'individual';
let torcidaId = null;

// ========== INICIALIZAR ==========
export function initTorcidaUI() {
    torcidaId = 'torcida_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

    setPresence(torcidaId, { tipo: 'torcida', timestamp: Date.now() });

    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById('tela-torcida').classList.remove('hidden');

    popularSelectFasesTorcida();

    appState.subscribe((data) => {
        if (appState.userType === 'projecao') {
            atualizarUITorcida(data);
        }
    });

    configurarEventosTorcida();
    iniciarAtualizacaoTorcida();
}

// ========== ATUALIZAR UI ==========
function atualizarUITorcida(data) {
    if (!data) return;

    const faseAtual = data.fase;
    document.getElementById('fase-atual-titulo').innerText = faseAtual;
    document.getElementById('fase-progresso').innerText = `${faseAtual}/5`;
    document.getElementById('torcida-fase-info').innerText = `${faseAtual}/5`;

    const modalidadeNome = MODALIDADE_CONFIG[data.modalidade]?.nome || 'Tabuada 2-5';
    document.getElementById('torcida-modalidade').innerText = modalidadeNome;
    document.getElementById('modalidade-titulo').innerText = modalidadeNome;

    atualizarTimerTorcida(data);

    if (modoTorcida === 'individual') {
        atualizarRankingTorcida();
    } else {
        atualizarRankingEquipesTorcida();
    }
}

// ========== TIMER ==========
function atualizarTimerTorcida(data) {
    const timerDisplay = document.getElementById('torcida-timer');
    if (!timerDisplay) return;

    if (data.status === 'em_andamento') {
        const restante = Math.max(0, data.fim - Date.now());
        if (restante <= 0) {
            timerDisplay.innerText = 'ENCERRADO';
        } else {
            timerDisplay.innerText = formatarTempo(restante);
        }
    } else if (data.status === 'pausado') {
        const tempoPausado = data.tempoRestantePausa || 0;
        timerDisplay.innerText = formatarTempo(tempoPausado);
    } else {
        timerDisplay.innerText = data.status === 'finalizado' ? 'FIM' : 'PAUSADO';
    }
}

// ========== POPULAR SELECT ==========
function popularSelectFasesTorcida() {
    const select = document.getElementById('select-fase-torcida');
    if (!select) return;

    let options = '';
    for (let i = 1; i <= 5; i++) {
        options += `<option value="${i}">Fase ${i}</option>`;
    }
    select.innerHTML = options;

    if (appState.data) {
        select.value = appState.data.fase;
    }
}

// ========== ATUALIZAR RANKINGS ==========
async function atualizarRankingTorcida() {
    if (modoTorcida !== 'individual') return;
    if (!appState.data) return;

    const fase = parseInt(document.getElementById('select-fase-torcida')?.value) || appState.data.fase;
    await renderRankingIndividual(fase, 'ranking-torcida-container', true);

    const infoSpan = document.getElementById('fase-torcida-info');
    if (infoSpan) {
        infoSpan.innerText = (fase === appState.data.fase) ? '(Fase atual)' : '(Fase anterior)';
    }

    document.getElementById('torcida-last-update').innerText = new Date().toLocaleTimeString('pt-BR');
}

async function atualizarRankingEquipesTorcida() {
    if (modoTorcida !== 'equipes') return;
    if (!appState.data) return;

    await renderRankingTurmas('ranking-torcida-container');
    document.getElementById('torcida-last-update').innerText = new Date().toLocaleTimeString('pt-BR');
}

// ========== EVENTOS ==========
function configurarEventosTorcida() {
    document.getElementById('btn-modo-individual')?.addEventListener('click', () => {
        modoTorcida = 'individual';
        document.getElementById('btn-modo-individual').classList.add('ativo');
        document.getElementById('btn-modo-equipes').classList.remove('ativo');
        document.querySelector('.fase-selector').style.display = 'block';
        atualizarRankingTorcida();
        reiniciarIntervalosTorcida();
    });

    document.getElementById('btn-modo-equipes')?.addEventListener('click', () => {
        modoTorcida = 'equipes';
        document.getElementById('btn-modo-equipes').classList.add('ativo');
        document.getElementById('btn-modo-individual').classList.remove('ativo');
        document.querySelector('.fase-selector').style.display = 'none';
        atualizarRankingEquipesTorcida();
        reiniciarIntervalosTorcida();
    });

    document.getElementById('select-fase-torcida')?.addEventListener('change', () => {
        if (modoTorcida === 'individual') {
            atualizarRankingTorcida();
        }
    });

    document.getElementById('btn-sync-torcida')?.addEventListener('click', () => {
        toast('🔄 Sincronizando...');
        if (modoTorcida === 'individual') {
            atualizarRankingTorcida();
        } else {
            atualizarRankingEquipesTorcida();
        }
    });

    document.getElementById('btn-sair-torcida')?.addEventListener('click', () => {
        if (torcidaId) {
            removePresence(torcidaId);
        }
        pararAtualizacaoTorcida();
        location.reload();
    });
}

// ========== CONTROLE DE ATUALIZAÇÃO ==========
function iniciarAtualizacaoTorcida() {
    const intervalos = appState.intervalos || { individual: 4, equipes: 60 };

    if (intervaloTorcidaIndividual) clearInterval(intervaloTorcidaIndividual);
    intervaloTorcidaIndividual = setInterval(() => {
        if (appState.userType === 'projecao' && modoTorcida === 'individual') {
            const telaVisivel = document.getElementById('tela-torcida') &&
                               !document.getElementById('tela-torcida').classList.contains('hidden');
            if (telaVisivel) {
                atualizarRankingTorcida();
            }
        }
    }, (intervalos.individual || 4) * 1000);

    if (intervaloTorcidaEquipes) clearInterval(intervaloTorcidaEquipes);
    intervaloTorcidaEquipes = setInterval(() => {
        if (appState.userType === 'projecao' && modoTorcida === 'equipes') {
            const telaVisivel = document.getElementById('tela-torcida') &&
                               !document.getElementById('tela-torcida').classList.contains('hidden');
            if (telaVisivel) {
                atualizarRankingEquipesTorcida();
            }
        }
    }, (intervalos.equipes || 60) * 1000);

    const spanInd = document.getElementById('torcida-individual-intervalo');
    const spanEq = document.getElementById('torcida-equipes-intervalo');
    if (spanInd) spanInd.innerText = intervalos.individual || 4;
    if (spanEq) spanEq.innerText = intervalos.equipes || 60;
}

function reiniciarIntervalosTorcida() {
    pararAtualizacaoTorcida();
    iniciarAtualizacaoTorcida();
}

function pararAtualizacaoTorcida() {
    if (intervaloTorcidaIndividual) {
        clearInterval(intervaloTorcidaIndividual);
        intervaloTorcidaIndividual = null;
    }
    if (intervaloTorcidaEquipes) {
        clearInterval(intervaloTorcidaEquipes);
        intervaloTorcidaEquipes = null;
    }
}
