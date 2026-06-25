// ============================================================
// ARQUIVO: js/ui/torcida-ui.js
// DESCRIÇÃO: Interface da Torcida - Visualização ao Vivo
// ============================================================

import { appState } from '../models/state.js';
import { setPresence, removePresence } from '../services/firebase-service.js';
import { renderRankingIndividual, renderRankingTurmas } from '../ranking/ranking.js';
import { toast, formatarTempo } from '../utils/helpers.js';
import { MODALIDADE_CONFIG } from '../config/firebase-config.js';

// ========== VARIÁVEIS ==========
let intervaloTorcidaIndividual = null;
let intervaloTorcidaEquipes = null;
let modoTorcida = 'individual';
let torcidaId = null;
let faseTorcidaSelecionada = 1;
let atualizandoSeletor = false;

// ========== INICIALIZAR UI DA TORCIDA ==========
export function initTorcidaUI() {
    // Gerar ID único para torcida
    torcidaId = 'torcida_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    
    // Registrar presença
    setPresence(torcidaId, { tipo: 'torcida', timestamp: Date.now() });
    
    // Esconder outras telas
    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById('tela-torcida').classList.remove('hidden');
    
    // Popular selects
    popularSelectFasesTorcida();
    
    // Registrar observador do estado
    appState.subscribe((data) => {
        if (appState.userType === 'projecao') {
            atualizarUITorcida(data);
        }
    });
    
    // Configurar eventos
    configurarEventosTorcida();
    
    // Iniciar atualizações
    iniciarAtualizacaoTorcida();
}

// ========== ATUALIZAR UI DA TORCIDA ==========
function atualizarUITorcida(data) {
    if (!data) return;
    
    // Atualizar informações da fase
    const faseAtual = data.fase;
    document.getElementById('fase-atual-titulo').innerText = faseAtual;
    document.getElementById('fase-progresso').innerText = `${faseAtual}/5`;
    document.getElementById('torcida-fase-info').innerText = `${faseAtual}/5`;
    
    // Atualizar modalidade
    const modalidadeNome = MODALIDADE_CONFIG[data.modalidade]?.nome || 'Tabuada 2-5';
    document.getElementById('torcida-modalidade').innerText = modalidadeNome;
    document.getElementById('modalidade-titulo').innerText = modalidadeNome;
    
    // Atualizar timer
    atualizarTimerTorcida(data);
    
    // Atualizar seletor de fase (se não estiver sendo manipulado)
    if (!atualizandoSeletor) {
        const select = document.getElementById('select-fase-torcida');
        if (select && parseInt(select.value) !== faseAtual) {
            select.value = faseAtual;
            faseTorcidaSelecionada = faseAtual;
            if (modoTorcida === 'individual') {
                atualizarRankingTorcida();
            }
        }
    }
    
    // Atualizar ranking
    if (modoTorcida === 'individual') {
        atualizarRankingTorcida();
    } else {
        atualizarRankingEquipesTorcida();
    }
}

// ========== ATUALIZAR TIMER DA TORCIDA ==========
function atualizarTimerTorcida(data) {
    const timerDisplay = document.getElementById('torcida-timer');
    if (!timerDisplay) return;
    
    if (data.status === 'em_andamento') {
        const restante = Math.max(0, data.fim - Date.now());
        if (restante <= 0) {
            timerDisplay.innerText = 'ENCERRADO';
        } else {
            const min = Math.floor(restante / 60000);
            const sec = Math.floor((restante % 60000) / 1000);
            timerDisplay.innerText = `${min}:${sec.toString().padStart(2, '0')}`;
        }
    } else if (data.status === 'pausado') {
        const tempoPausado = data.tempoRestantePausa || 0;
        const min = Math.floor(tempoPausado / 60000);
        const sec = Math.floor((tempoPausado % 60000) / 1000);
        timerDisplay.innerText = `${min}:${sec.toString().padStart(2, '0')}`;
    } else {
        timerDisplay.innerText = data.status === 'finalizado' ? 'FIM' : 'PAUSADO';
    }
}

// ========== POPULAR SELECT DE FASES ==========
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
        faseTorcidaSelecionada = appState.data.fase;
    }
}

// ========== ATUALIZAR RANKING DA TORCIDA ==========
async function atualizarRankingTorcida() {
    if (modoTorcida !== 'individual') return;
    if (!appState.data) return;
    
    const fase = parseInt(document.getElementById('select-fase-torcida')?.value) || appState.data.fase;
    faseTorcidaSelecionada = fase;
    
    await renderRankingIndividual(fase, 'ranking-torcida-container', true);
    
    const infoSpan = document.getElementById('fase-torcida-info');
    if (infoSpan) {
        infoSpan.innerText = (fase === appState.data.fase) ? '(Fase atual)' : '(Fase anterior)';
    }
    
    document.getElementById('torcida-last-update').innerText = new Date().toLocaleTimeString('pt-BR');
}

// ========== ATUALIZAR RANKING POR EQUIPES ==========
async function atualizarRankingEquipesTorcida() {
    if (modoTorcida !== 'equipes') return;
    if (!appState.data) return;
    
    await renderRankingTurmas('ranking-torcida-container');
    document.getElementById('torcida-last-update').innerText = new Date().toLocaleTimeString('pt-BR');
}

// ========== CONFIGURAR EVENTOS ==========
function configurarEventosTorcida() {
    // Modo Individual
    document.getElementById('btn-modo-individual')?.addEventListener('click', () => {
        modoTorcida = 'individual';
        document.getElementById('btn-modo-individual').classList.add('ativo');
        document.getElementById('btn-modo-equipes').classList.remove('ativo');
        
        // Mostrar seletor de fase
        document.querySelector('.fase-selector').style.display = 'block';
        
        atualizarRankingTorcida();
        reiniciarIntervalosTorcida();
    });
    
    // Modo Equipes
    document.getElementById('btn-modo-equipes')?.addEventListener('click', () => {
        modoTorcida = 'equipes';
        document.getElementById('btn-modo-equipes').classList.add('ativo');
        document.getElementById('btn-modo-individual').classList.remove('ativo');
        
        // Esconder seletor de fase
        document.querySelector('.fase-selector').style.display = 'none';
        
        atualizarRankingEquipesTorcida();
        reiniciarIntervalosTorcida();
    });
    
    // Select de fase
    document.getElementById('select-fase-torcida')?.addEventListener('change', (e) => {
        if (modoTorcida === 'individual') {
            atualizandoSeletor = true;
            const fase = parseInt(e.target.value);
            if (!isNaN(fase) && fase >= 1 && fase <= 5) {
                faseTorcidaSelecionada = fase;
                atualizarRankingTorcida();
            }
            setTimeout(() => { atualizandoSeletor = false; }, 100);
        }
    });
    
    // Sincronizar
    document.getElementById('btn-sync-torcida')?.addEventListener('click', () => {
        toast('Sincronizando...');
        if (modoTorcida === 'individual') {
            atualizarRankingTorcida();
        } else {
            atualizarRankingEquipesTorcida();
        }
    });
    
    // Sair
    document.getElementById('btn-sair-torcida')?.addEventListener('click', () => {
        if (torcidaId) {
            removePresence(torcidaId);
        }
        pararAtualizacaoTorcida();
        location.reload();
    });
}

// ========== INICIAR ATUALIZAÇÃO DA TORCIDA ==========
function iniciarAtualizacaoTorcida() {
    const intervalos = appState.intervalos || { individual: 4, equipes: 60 };
    
    // Intervalo Individual
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
    
    // Intervalo Equipes
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
    
    // Atualizar labels dos intervalos
    const spanInd = document.getElementById('torcida-individual-intervalo');
    const spanEq = document.getElementById('torcida-equipes-intervalo');
    if (spanInd) spanInd.innerText = intervalos.individual || 4;
    if (spanEq) spanEq.innerText = intervalos.equipes || 60;
}

// ========== REINICIAR INTERVALOS ==========
function reiniciarIntervalosTorcida() {
    pararAtualizacaoTorcida();
    iniciarAtualizacaoTorcida();
}

// ========== PARAR ATUALIZAÇÃO ==========
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

// ========== EXPORTAR FUNÇÕES ==========
export { 
    iniciarAtualizacaoTorcida, 
    pararAtualizacaoTorcida, 
    reiniciarIntervalosTorcida,
    atualizarRankingTorcida,
    atualizarRankingEquipesTorcida
};
