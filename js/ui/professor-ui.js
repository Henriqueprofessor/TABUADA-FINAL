// ============================================================
// ARQUIVO: js/ui/professor-ui.js
// DESCRIÇÃO: Painel do Professor - COM CONTROLE OFFLINE
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
    getOnce
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
import { soundManager } from '../utils/sounds.js';
import { confettiManager } from '../utils/confetti.js';
import { achievementManager } from '../utils/achievements.js';
import { notificationManager } from '../utils/notifications.js';
import { gamepadManager } from '../utils/gamepad.js';
import { syncService } from '../services/sync-service.js';
import { CONFIG_PADRAO } from '../config/firebase-config.js';

// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
let timerFase = null;
let tempoEsgotadoProcessado = false;
const TOTAL_FASES = 5;
const VAGAS_POR_FASE = { 1: 30, 2: 20, 3: 10, 4: 5, 5: 5 };

// ============================================================
// CONSTANTE: CHAVE PARA SALVAR O VALOR DA PARTIDA NO FIREBASE
// ============================================================
const VALOR_PARTIDA_KEY = 'copaV2/configuracoes/valorPartida';

export function initProfessorUI() {
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
    
    // ============================================================
    // CARREGAR VALOR DA PARTIDA AO INICIAR
    // ============================================================
    carregarValorPartida();
}

// ============================================================
// FUNÇÃO AUXILIAR: ATUALIZAR DISPLAY DO TIMER
// ============================================================
function atualizarDisplayTimer(milissegundos, timerDisplay, torcidaTimer) {
    const segundos = Math.floor(milissegundos / 1000);
    const min = Math.floor(segundos / 60);
    const sec = segundos % 60;
    const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
    
    if (timerDisplay) timerDisplay.innerText = timeStr;
    if (torcidaTimer) torcidaTimer.innerText = timeStr;
}

// ============================================================
// ATUALIZAR UI - COM TIMER CORRIGIDO
// ============================================================
function atualizarUI() {
    if (!estadoAtual) return;
    const modalidadeNome = MODALIDADE_CONFIG[estadoAtual.modalidade]?.nome || "Tabuada 2-5";
    document.getElementById('modalidade-titulo').innerText = modalidadeNome;
    if (document.getElementById('torcida-modalidade')) document.getElementById('torcida-modalidade').innerText = modalidadeNome;
    document.getElementById('fase-atual-titulo').innerText = estadoAtual.fase;
    atualizarExibicaoFase();

    // ============================================================
    // TIMER DA FASE - CORRIGIDO
    // ============================================================
    if (timerFase) {
        clearInterval(timerFase);
        timerFase = null;
    }

    const timerDisplay = document.getElementById('timer-fase');
    const torcidaTimer = document.getElementById('torcida-timer');

    if (estadoAtual.status === 'em_andamento') {
        const agora = Date.now();
        let restante = Math.max(0, estadoAtual.fim - agora);
        
        // Atualizar imediatamente
        atualizarDisplayTimer(restante, timerDisplay, torcidaTimer);
        
        // Iniciar intervalo
        timerFase = setInterval(() => {
            const agora2 = Date.now();
            let restante2 = Math.max(0, estadoAtual.fim - agora2);
            
            if (restante2 <= 0) {
                // ⏰ TEMPO ESGOTADO - PARAR O TIMER
                clearInterval(timerFase);
                timerFase = null;
                
                // Congelar em 00:00
                atualizarDisplayTimer(0, timerDisplay, torcidaTimer);
                
                // Verificar se já foi processado
                if (!tempoEsgotadoProcessado) {
                    tempoEsgotadoProcessado = true;
                    toast("⏰ TEMPO ESGOTADO! Fase finalizada.");
                    avancarFase();
                }
                return;
            }
            
            atualizarDisplayTimer(restante2, timerDisplay, torcidaTimer);
        }, 1000);
        
    } else if (estadoAtual.status === 'pausado') {
        const tempoPausado = estadoAtual.tempoRestantePausa || 0;
        atualizarDisplayTimer(tempoPausado, timerDisplay, torcidaTimer);
    } else {
        const texto = estadoAtual.status === 'finalizado' ? 'FIM' : 'PAUSADO';
        if (timerDisplay) timerDisplay.innerText = texto;
        if (torcidaTimer) torcidaTimer.innerText = texto;
    }

    // ============================================================
    // RESTO DA UI
    // ============================================================
    const btnPararContinuar = document.getElementById('btn-continuar-parar-fase');
    if (btnPararContinuar) {
        if (estadoAtual.status === 'em_andamento') {
            btnPararContinuar.innerText = "⏹️ Parar Fase";
            btnPararContinuar.classList.remove('btn-success');
            btnPararContinuar.classList.add('btn-danger');
            btnPararContinuar.disabled = false;
            btnPararContinuar.onclick = () => pausarFase();
        } else if (estadoAtual.status === 'pausado') {
            btnPararContinuar.innerText = "▶️ Continuar Fase";
            btnPararContinuar.classList.remove('btn-danger');
            btnPararContinuar.classList.add('btn-success');
            btnPararContinuar.disabled = false;
            btnPararContinuar.onclick = () => continuarFase();
        } else {
            btnPararContinuar.disabled = true;
            btnPararContinuar.innerText = "⏹️ Parar Fase";
        }
    }
}

// ============================================================
// PAUSAR FASE
// ============================================================
async function pausarFase() {
    if (!estadoAtual || estadoAtual.status !== 'em_andamento') return;
    
    // PARAR O TIMER
    if (timerFase) {
        clearInterval(timerFase);
        timerFase = null;
    }
    
    const agora = Date.now();
    const tempoRestante = Math.max(0, estadoAtual.fim - agora);
    await updateCopa({ status: 'pausado', tempoRestantePausa: tempoRestante, fim: 0 });
    toast("⏸️ Fase pausada.");
}

// ============================================================
// CONTINUAR FASE
// ============================================================
async function continuarFase() {
    if (!estadoAtual || estadoAtual.status !== 'pausado') return;
    const tempoRestante = estadoAtual.tempoRestantePausa || 0;
    if (tempoRestante <= 0) { toast("⚠️ Tempo esgotado."); return; }
    const novoFim = Date.now() + tempoRestante;
    await updateCopa({ status: 'em_andamento', fim: novoFim, tempoRestantePausa: null });
    toast("▶️ Fase retomada!");
}

// ============================================================
// AVANÇAR FASE
// ============================================================
async function avancarFase() {
    // PARAR O TIMER
    if (timerFase) {
        clearInterval(timerFase);
        timerFase = null;
    }
    
    const faseAtual = estadoAtual.fase;
    if (faseAtual > TOTAL_FASES) { toast("Competição já finalizada!"); return; }
    const res = estadoAtual.resultados?.[faseAtual] || {};
    let lista = [];
    for (let id in res) {
        const partidas = res[id];
        if (partidas?.length) {
            const melhor = [...partidas].sort((a,b) => b.pontos - a.pontos)[0];
            lista.push({ id, pontos: melhor.pontos, acertos: melhor.acertos, tempo: melhor.tempo });
        }
    }
    lista.sort((a,b) => b.pontos - a.pontos || b.acertos - a.acertos || a.tempo - b.tempo);
    const vagas = VAGAS_POR_FASE[faseAtual];
    const classificadosIds = lista.slice(0, vagas).map(l => l.id);
    
    const { classificadosRef, participantesRef, set, removeNode, resultadosTempRef } = await import('../services/firebase-service.js');
    await set(classificadosRef(faseAtual), classificadosIds);
    
    const participantesAtual = estadoAtual.participantes?.[faseAtual] || {};
    const participantesProxima = {};
    for (let id of classificadosIds) {
        if (participantesAtual[id]) participantesProxima[id] = participantesAtual[id];
        else {
            for (let f = faseAtual-1; f >= 1; f--) {
                if (estadoAtual.participantes?.[f]?.[id]) {
                    participantesProxima[id] = estadoAtual.participantes[f][id];
                    break;
                }
            }
        }
    }
    if (Object.keys(participantesProxima).length > 0) await set(participantesRef(faseAtual+1), participantesProxima);
    await removeNode(resultadosTempRef(faseAtual));

    // Resetar flag de tempo esgotado
    tempoEsgotadoProcessado = false;

    if (faseAtual === TOTAL_FASES) {
        toast("🏆 COMPETIÇÃO FINALIZADA!");
        await updateCopa({ status: 'finalizado', fim: 0, tempoRestantePausa: null });
        return;
    }
    await updateCopa({ fase: faseAtual + 1, status: 'aguardando', fim: 0, tempoRestantePausa: null });
    toast(`✅ Fase ${faseAtual} finalizada! ${vagas} classificados para a fase ${faseAtual+1}.`);
}

// ============================================================
// RESETAR FASE
// ============================================================
async function resetarFase() {
    const faseAtual = estadoAtual.fase;
    if (!confirm(`⚠️ Resetar a Fase ${faseAtual}?`)) return;
    
    // PARAR O TIMER
    if (timerFase) {
        clearInterval(timerFase);
        timerFase = null;
    }
    
    const { resultadosRef, participantesRef, classificadosRef, resultadosTempRef, removeNode } = await import('../services/firebase-service.js');
    await removeNode(resultadosRef(faseAtual));
    await removeNode(participantesRef(faseAtual));
    await removeNode(resultadosTempRef(faseAtual));
    await removeNode(classificadosRef(faseAtual));
    await updateCopa({ status: 'aguardando', fim: 0, tempoRestantePausa: null });
    tempoEsgotadoProcessado = false;
    toast(`✅ Fase ${faseAtual} resetada!`);
}

// ============================================================
// VERIFICAR TEMPO ESGOTADO
// ============================================================
async function verificarTempoEsgotado() {
    if (!estadoAtual) return;
    if (estadoAtual.status === 'em_andamento' && Date.now() >= estadoAtual.fim) {
        if (!tempoEsgotadoProcessado) {
            tempoEsgotadoProcessado = true;
            
            // PARAR O TIMER
            if (timerFase) {
                clearInterval(timerFase);
                timerFase = null;
            }
            
            // CONGELAR DISPLAY EM 00:00
            const timerDisplay = document.getElementById('timer-fase');
            const torcidaTimer = document.getElementById('torcida-timer');
            if (timerDisplay) timerDisplay.innerText = '00:00';
            if (torcidaTimer) torcidaTimer.innerText = '00:00';
            
            toast("⏰ TEMPO ESGOTADO! Fase finalizada.");
            await avancarFase();
        }
        return true;
    }
    return false;
}

// ============================================================
// CARREGAR CONFIGURAÇÕES (INCLUINDO OFFLINE)
// ============================================================
async function carregarConfiguracoes() {
    const config = appState.configuracoes || CONFIG_PADRAO;
    
    setSwitch('cfg-confetes', config.confetes);
    setSwitch('cfg-notificacoes', config.notificacoes);
    setSwitch('cfg-brilho', config.brilho);
    setSwitch('cfg-sons', config.sons);
    setSwitch('cfg-sons-celebracao', config.sonsCelebracao);
    setSwitch('cfg-sons-erro', config.sonsErro);
    setSwitch('cfg-bonus', config.bonus);
    setSwitch('cfg-conquistas', config.conquistas);
    setSwitch('cfg-gamepad', config.gamepad);
    
    try {
        const snap = await db.ref('copaV2/configuracoes/syncOffline').once('value');
        const ativo = snap.val() !== null ? snap.val() : true;
        setSwitch('cfg-sync-offline', ativo);
        if (syncService) {
            syncService.updateConfig({ syncOffline: ativo });
        }
    } catch (e) {
        console.warn('Erro ao carregar configuração offline:', e);
    }
    
    await carregarValorPartida();
}

// ============================================================
// VALOR DA PARTIDA
// ============================================================
async function carregarValorPartida() {
    try {
        const snap = await db.ref(VALOR_PARTIDA_KEY).once('value');
        let valor = snap.val();
        if (valor === null || valor === undefined) {
            valor = 2000;
            await db.ref(VALOR_PARTIDA_KEY).set(valor);
        }
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

async function salvarValorPartida(novoValor) {
    if (!novoValor || novoValor < 1) {
        toast('❌ Digite um valor válido maior que 0.');
        return false;
    }
    try {
        await db.ref(VALOR_PARTIDA_KEY).set(novoValor);
        setValorPartida(novoValor);
        limparCacheRanking();
        const exibicao = document.getElementById('valor-partida-atual');
        if (exibicao) exibicao.textContent = novoValor;
        const feedback = document.getElementById('feedback-valor-partida');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.className = 'feedback-sucesso';
            feedback.textContent = `✅ Valor da partida atualizado para ${novoValor} pontos!`;
            setTimeout(() => { feedback.style.display = 'none'; }, 5000);
        }
        recarregarRankings();
        toast(`✅ Valor da partida atualizado para ${novoValor} pontos!`);
        return true;
    } catch (e) {
        console.error('Erro ao salvar valor da partida:', e);
        const feedback = document.getElementById('feedback-valor-partida');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.className = 'feedback-erro';
            feedback.textContent = `❌ Erro ao salvar: ${e.message}`;
        }
        toast('❌ Erro ao salvar valor da partida.');
        return false;
    }
}

window.atualizarValorPartida = async function() {
    const input = document.getElementById('input-valor-partida');
    if (!input) {
        toast('❌ Campo não encontrado.');
        return;
    }
    const novoValor = parseInt(input.value);
    await salvarValorPartida(novoValor);
};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================
function setSwitch(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
}

function recarregarRankings() {
    const faseAtual = appState.fase || 1;
    const tabFase = document.getElementById('tab-ranking-fase');
    if (tabFase && !tabFase.classList.contains('hidden')) {
        const faseSelecionada = document.getElementById('select-fase-ranking')?.value || faseAtual;
        renderRankingIndividual(parseInt(faseSelecionada), 'ranking-parcial', true);
    }
    const tabGeral = document.getElementById('tab-ranking-geral');
    if (tabGeral && !tabGeral.classList.contains('hidden')) {
        renderRankingGeral('ranking-geral-container');
    }
    const tabTurmas = document.getElementById('tab-ranking-turmas');
    if (tabTurmas && !tabTurmas.classList.contains('hidden')) {
        renderRankingTurmas('ranking-turmas-container');
    }
}

// ============================================================
// CONFIGURAR SWITCHES
// ============================================================
function configurarSwitchesConfiguracoes() {
    document.getElementById('cfg-sync-offline')?.addEventListener('change', async function() {
        const ativo = this.checked;
        try {
            await db.ref('copaV2/configuracoes/syncOffline').set(ativo);
            if (syncService) {
                syncService.updateConfig({ syncOffline: ativo });
            }
            toast(ativo ? '✅ Sincronização offline ativada!' : '⏸️ Sincronização offline desativada.');
        } catch (e) {
            console.warn('Erro ao salvar configuração offline:', e);
            toast('❌ Erro ao salvar configuração.');
            this.checked = !ativo;
        }
    });
    
    document.getElementById('cfg-confetes')?.addEventListener('change', function() {
        if (confettiManager) {
            confettiManager.updateConfig({ confetes: this.checked });
        }
        salvarConfiguracao('confetes', this.checked);
    });
    
    document.getElementById('cfg-notificacoes')?.addEventListener('change', function() {
        if (notificationManager) {
            notificationManager.updateConfig({ notificacoes: this.checked });
        }
        salvarConfiguracao('notificacoes', this.checked);
    });
    
    document.getElementById('cfg-sons')?.addEventListener('change', function() {
        if (soundManager) {
            soundManager.updateConfig({ sons: this.checked });
        }
        salvarConfiguracao('sons', this.checked);
    });
    
    document.getElementById('cfg-conquistas')?.addEventListener('change', function() {
        if (achievementManager) {
            achievementManager.updateConfig({ conquistas: this.checked });
        }
        salvarConfiguracao('conquistas', this.checked);
    });
    
    document.getElementById('cfg-gamepad')?.addEventListener('change', function() {
        if (gamepadManager) {
            gamepadManager.updateConfig({ gamepad: this.checked });
        }
        salvarConfiguracao('gamepad', this.checked);
    });
}

async function salvarConfiguracao(key, value) {
    try {
        await db.ref(`copaV2/configuracoes/${key}`).set(value);
    } catch (e) {
        console.warn('Erro ao salvar configuração:', e);
    }
}

// ============================================================
// CONFIGURAR EVENTOS
// ============================================================
function configurarEventosProfessor() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tab = btn.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
            const tabContent = document.getElementById(`tab-${tab}`);
            if (tabContent) tabContent.classList.remove('hidden');
            if (tab === 'ranking-geral') {
                renderRankingGeral('ranking-geral-container');
            } else if (tab === 'ranking-fase') {
                const faseSelecionada = document.getElementById('select-fase-ranking')?.value || appState.fase;
                renderRankingIndividual(parseInt(faseSelecionada), 'ranking-parcial', true);
                popularSelectFases();
            } else if (tab === 'ranking-turmas') {
                renderRankingTurmas('ranking-turmas-container');
            } else if (tab === 'gerenciar-alunos') {
                renderListaAlunosGerenciar();
            } else if (tab === 'gerenciar-turmas') {
                carregarTurmas().then(turmas => renderListaTurmas(turmas));
            } else if (tab === 'configuracoes') {
                carregarConfiguracoes();
            }
        });
    });
    
    document.getElementById('btn-iniciar-fase')?.addEventListener('click', () => {
        const duracao = parseInt(document.getElementById('input-tempo-fase')?.value) || 12;
        const fim = Date.now() + duracao * 60000;
        updateCopa({ status: 'em_andamento', fim, tempoRestantePausa: null });
        tempoEsgotadoProcessado = false;
        toast('▶️ Fase iniciada!');
    });
    
    document.getElementById('btn-avancar-fase')?.addEventListener('click', async () => {
        if (confirm('⚠️ Finalizar fase e classificar alunos?')) {
            await avancarFase();
        }
    });
    
    document.getElementById('btn-reset-fase')?.addEventListener('click', async () => {
        await resetarFase();
    });
    
    document.getElementById('btn-reset-total')?.addEventListener('click', () => {
        if (confirm('⚠️ Resetar toda a competição?')) {
            resetarCompeticao();
        }
    });
    
    document.getElementById('btn-aplicar-modalidade')?.addEventListener('click', async () => {
        const novaModalidade = document.getElementById('select-modalidade')?.value;
        if (!novaModalidade) return;
        if (confirm(`⚠️ Mudar para ${appState.getModalidadeNome()} irá REINICIAR toda a competição. Continuar?`)) {
            await setCopa({
                fase: 1,
                status: 'aguardando',
                tempoFase: 12,
                fim: 0,
                modalidade: novaModalidade,
                resultados: {},
                participantes: {},
                classificados: {}
            });
            toast('✅ Modalidade alterada. Competição reiniciada.');
            setTimeout(() => location.reload(), 1500);
        }
    });
    
    document.getElementById('btn-salvar-tempo')?.addEventListener('click', () => {
        const t = parseInt(document.getElementById('input-tempo-fase')?.value);
        if (t > 0) updateCopa({ tempoFase: t });
    });
    
    document.getElementById('btn-sync-prof')?.addEventListener('click', updateLastSyncTime);
    document.getElementById('btn-voltar-menu-prof')?.addEventListener('click', () => location.reload());
    
    document.getElementById('btn-adicionar-turma')?.addEventListener('click', async () => {
        const novaTurma = prompt('Digite o nome da nova turma:');
        if (novaTurma && novaTurma.trim()) {
            await adicionarTurma(novaTurma.trim());
            const turmas = await carregarTurmas();
            renderListaTurmas(turmas);
        }
    });
    
    document.getElementById('btn-atualizar-lista-alunos')?.addEventListener('click', renderListaAlunosGerenciar);
    
    document.getElementById('select-fase-ranking')?.addEventListener('change', (e) => {
        const fase = parseInt(e.target.value);
        if (!isNaN(fase)) {
            renderRankingIndividual(fase, 'ranking-parcial', true);
        }
    });
    
    document.getElementById('btn-atualizar-intervalo-individual')?.addEventListener('click', () => {
        const val = parseInt(document.getElementById('intervalo-individual')?.value);
        if (val >= 1) {
            salvarIntervaloIndividual(val);
            toast(`Intervalo individual alterado para ${val} segundos`);
        }
    });
    
    document.getElementById('btn-atualizar-intervalo-equipes')?.addEventListener('click', () => {
        const val = parseInt(document.getElementById('intervalo-equipes')?.value);
        if (val >= 1) {
            salvarIntervaloEquipes(val);
            toast(`Intervalo por equipes alterado para ${val} segundos`);
        }
    });
    
    document.getElementById('btn-atualizar-ranking-turmas')?.addEventListener('click', () => {
        renderRankingTurmas('ranking-turmas-container');
    });
    
    document.getElementById('btn-toggle-auto-ranking')?.addEventListener('click', () => {
        const btn = document.getElementById('btn-toggle-auto-ranking');
        const ativo = btn.innerText.includes('Pausar');
        btn.innerText = ativo ? '▶️ Retomar Atualização' : '⏸️ Pausar Atualização';
        toast(ativo ? 'Auto atualização pausada' : 'Auto atualização retomada');
        if (ativo) {
            // Se estava ativo e foi pausado, para a atualização
        } else {
            // Se estava pausado e foi retomado
        }
    });
    
    document.getElementById('btn-salvar-config')?.addEventListener('click', salvarConfiguracoesGerais);
    document.getElementById('btn-restaurar-padrao')?.addEventListener('click', restaurarConfiguracoesPadrao);
}

// ============================================================
// RENDERIZAR LISTA DE ALUNOS E TURMAS (VERSÕES SIMPLIFICADAS)
// ============================================================
function renderListaAlunosGerenciar() {
    const container = document.getElementById('lista-alunos-gerenciavel');
    if (!container) return;
    const data = appState.data;
    const faseAtual = data?.fase || 1;
    const participantes = data?.participantes?.[faseAtual] || {};
    const ids = Object.keys(participantes);
    if (ids.length === 0) { container.innerHTML = '<p>📭 Nenhum aluno cadastrado.</p>'; return; }
    let html = '';
    for (const id of ids) {
        const aluno = participantes[id];
        html += `
            <div class="aluno-item">
                <div class="aluno-info">
                    <strong>${escapeHtml(aluno.nome)}</strong> (${escapeHtml(aluno.turma)})
                    <br><small>ID: ${id.substring(0, 8)}...</small>
                </div>
                <div class="aluno-actions">
                    <button class="btn-editar-aluno btn-warning" data-id="${id}" data-nome="${aluno.nome}" data-turma="${aluno.turma}">✏️ Editar</button>
                    <button class="btn-excluir-aluno btn-danger" data-id="${id}">🗑️ Excluir</button>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
    container.querySelectorAll('.btn-editar-aluno').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const novoNome = prompt('Novo nome:', btn.getAttribute('data-nome'));
            if (novoNome) {
                const novaTurma = prompt('Nova turma:', btn.getAttribute('data-turma'));
                if (novaTurma) {
                    const { update } = await import('../services/firebase-service.js');
                    await update(participantesRef(faseAtual), { [id]: { nome: novoNome, turma: novaTurma } });
                    renderListaAlunosGerenciar();
                }
            }
        });
    });
    container.querySelectorAll('.btn-excluir-aluno').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm(`Excluir aluno?`)) {
                const { removeNode } = await import('../services/firebase-service.js');
                await removeNode(participantesRef(faseAtual) + '/' + id);
                await removeNode(resultadosRef(faseAtual) + '/' + id);
                await removeNode(resultadosTempRef(faseAtual) + '/' + id);
                renderListaAlunosGerenciar();
            }
        });
    });
}

async function renderListaTurmas(turmas) {
    const container = document.getElementById('lista-turmas-gerenciavel');
    if (!container) return;
    if (!turmas || turmas.length === 0) {
        container.innerHTML = '<p>📭 Nenhuma turma cadastrada.</p>';
        return;
    }
    let html = '<ul style="list-style: none; padding: 0;">';
    turmas.forEach(turma => {
        html += `
            <li style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #2c3e50;">
                <span>🏷️ ${escapeHtml(turma)}</span>
                <div>
                    <button class="btn-editar-turma btn-warning" data-turma="${turma}" style="padding: 4px 12px; margin: 0 4px;">✏️ Editar</button>
                    <button class="btn-excluir-turma btn-danger" data-turma="${turma}" style="padding: 4px 12px; margin: 0 4px;">🗑️ Excluir</button>
                </div>
            </li>
        `;
    });
    html += '</ul>';
    container.innerHTML = html;
    container.querySelectorAll('.btn-editar-turma').forEach(btn => {
        btn.addEventListener('click', async () => {
            const turmaAntiga = btn.getAttribute('data-turma');
            const novaTurma = prompt('Digite o novo nome da turma:', turmaAntiga);
            if (novaTurma && novaTurma !== turmaAntiga) {
                let turmas = await carregarTurmas();
                const index = turmas.indexOf(turmaAntiga);
                if (index !== -1) {
                    turmas[index] = novaTurma;
                    const { set } = await import('../services/firebase-service.js');
                    await set(db.ref('copaV2/turmas'), turmas);
                    toast(`Turma alterada de ${turmaAntiga} para ${novaTurma}`);
                    renderListaTurmas(turmas);
                }
            }
        });
    });
    container.querySelectorAll('.btn-excluir-turma').forEach(btn => {
        btn.addEventListener('click', async () => {
            const turma = btn.getAttribute('data-turma');
            if (confirm(`Remover turma "${turma}"?`)) {
                await removerTurma(turma);
                const turmas = await carregarTurmas();
                renderListaTurmas(turmas);
            }
        });
    });
}

function popularSelectFases() {
    const select = document.getElementById('select-fase-ranking');
    if (!select) return;
    let options = '';
    for (let i = 1; i <= 5; i++) {
        options += `<option value="${i}">Fase ${i}</option>`;
    }
    select.innerHTML = options;
    select.value = appState.faseSelecionadaProf || appState.fase;
}

async function salvarConfiguracoesGerais() {
    const config = {
        confetes: document.getElementById('cfg-confetes')?.checked || false,
        notificacoes: document.getElementById('cfg-notificacoes')?.checked || false,
        brilho: document.getElementById('cfg-brilho')?.checked || false,
        sons: document.getElementById('cfg-sons')?.checked || false,
        sonsCelebracao: document.getElementById('cfg-sons-celebracao')?.checked || false,
        sonsErro: document.getElementById('cfg-sons-erro')?.checked || false,
        bonus: document.getElementById('cfg-bonus')?.checked || false,
        conquistas: document.getElementById('cfg-conquistas')?.checked || false,
        gamepad: document.getElementById('cfg-gamepad')?.checked || false,
        syncOffline: document.getElementById('cfg-sync-offline')?.checked || false
    };
    await salvarConfiguracoes(config);
    toast('✅ Configurações salvas!');
}

async function restaurarConfiguracoesPadrao() {
    if (!confirm('⚠️ Restaurar configurações padrão?')) return;
    await salvarConfiguracoes(CONFIG_PADRAO);
    carregarConfiguracoes();
    toast('✅ Configurações restauradas!');
}

// ============================================================
// RESETAR COMPETIÇÃO
// ============================================================
async function resetarCompeticao() {
    const modalidade = appState.modalidade || '2-5';
    await setCopa({
        fase: 1,
        status: 'aguardando',
        tempoFase: 12,
        fim: 0,
        modalidade: modalidade,
        resultados: {},
        participantes: {},
        classificados: {}
    });
    toast('✅ Competição resetada!');
    setTimeout(() => location.reload(), 1000);
}

// ============================================================
// ATUALIZAR ONLINE STATS
// ============================================================
function atualizarOnlineStats(data) {
    let totalAlunos = 0;
    let totalTorcida = 0;
    
    if (data) {
        Object.values(data).forEach(val => {
            if (val && val.tipo === 'torcida') totalTorcida++;
            else totalAlunos++;
        });
    }
    
    const totalOnline = totalAlunos + totalTorcida;
    document.getElementById('jogadores-online').innerText = totalOnline;
    document.getElementById('prof-online-count').innerText = totalOnline;
    
    const listaDiv = document.getElementById('lista-participantes');
    if (!listaDiv) return;
    
    let html = '<div class="online-list"><strong>👥 Jogadores:</strong><ul style="list-style:none; margin:5px 0 10px 0;">';
    
    if (data) {
        let temAlunos = false;
        Object.entries(data).forEach(([id, val]) => {
            if (!val || val.tipo === 'torcida') return;
            temAlunos = true;
            html += `<li>🟢 ${escapeHtml(val.nome)} (${escapeHtml(val.turma)})</li>`;
        });
        if (!temAlunos) html += '<li>Nenhum jogador online</li>';
    } else {
        html += '<li>Nenhum jogador online</li>';
    }
    
    html += '</ul><strong>📺 Espectadores:</strong><ul style="list-style:none; margin:5px 0 0 0;">';
    
    if (data) {
        let temTorcida = false;
        Object.entries(data).forEach(([id, val]) => {
            if (val && val.tipo === 'torcida') {
                temTorcida = true;
                html += `<li>👀 Espectador conectado</li>`;
            }
        });
        if (!temTorcida) html += '<li>Nenhum espectador online</li>';
    } else {
        html += '<li>Nenhum espectador online</li>';
    }
    
    html += '</ul></div>';
    listaDiv.innerHTML = html;
}

// ============================================================
// ATUALIZAR UI PROFESSOR
// ============================================================
function atualizarUIProfessor(data) {
    if (!data) return;
    
    document.getElementById('fase-atual-titulo').innerText = data.fase;
    document.getElementById('fase-progresso').innerText = `${data.fase}/5`;
    document.getElementById('prof-fase-info').innerText = `${data.fase}/5`;
    
    const modalidadeNome = appState.getModalidadeNome();
    document.getElementById('modalidade-titulo').innerText = modalidadeNome;
    
    atualizarUI();
    renderListaAlunosGerenciar();
}
