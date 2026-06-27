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
// CARREGAR CONFIGURAÇÕES
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
        const snap = await getOnce(db.ref('copaV2/configuracoes/syncOffline'));
        const ativo = snap.val() !== null ? snap.val() : true;
        setSwitch('cfg-sync-offline', ativo);
        if (syncService) {
            syncService.updateConfig({ syncOffline: ativo });
        }
    } catch (e) {
        console.warn('Erro ao carregar configuração offline:', e);
    }
}

function setSwitch(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
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
            toast('❌ Erro ao salvar configuração.');
            this.checked = !ativo;
        }
    });

    document.getElementById('cfg-confetes')?.addEventListener('change', function() {
        if (confettiManager) confettiManager.updateConfig({ confetes: this.checked });
        salvarConfiguracao('confetes', this.checked);
    });

    document.getElementById('cfg-notificacoes')?.addEventListener('change', function() {
        if (notificationManager) notificationManager.updateConfig({ notificacoes: this.checked });
        salvarConfiguracao('notificacoes', this.checked);
    });

    document.getElementById('cfg-sons')?.addEventListener('change', function() {
        if (soundManager) soundManager.updateConfig({ sons: this.checked });
        salvarConfiguracao('sons', this.checked);
    });

    document.getElementById('cfg-conquistas')?.addEventListener('change', function() {
        if (achievementManager) achievementManager.updateConfig({ conquistas: this.checked });
        salvarConfiguracao('conquistas', this.checked);
    });

    document.getElementById('cfg-gamepad')?.addEventListener('change', function() {
        if (gamepadManager) gamepadManager.updateConfig({ gamepad: this.checked });
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
// ATUALIZAR UI DO PROFESSOR
// ============================================================
function atualizarUIProfessor(data) {
    if (!data) return;

    document.getElementById('fase-atual-titulo').innerText = data.fase;
    document.getElementById('fase-progresso').innerText = `${data.fase}/5`;
    document.getElementById('prof-fase-info').innerText = `${data.fase}/5`;

    const modalidadeNome = MODALIDADE_CONFIG[data.modalidade]?.nome || 'Tabuada 2-5';
    document.getElementById('modalidade-titulo').innerText = modalidadeNome;

    atualizarTimerProfessor(data);
    atualizarBotoesProfessor(data);
    atualizarRankingsProfessor();
    renderListaAlunosGerenciar();
}

function atualizarTimerProfessor(data) {
    const timerDisplay = document.getElementById('timer-fase');
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

function atualizarBotoesProfessor(data) {
    const btnPararContinuar = document.getElementById('btn-continuar-parar-fase');
    if (!btnPararContinuar) return;

    if (data.status === 'em_andamento') {
        btnPararContinuar.innerText = '⏹️ Parar Fase';
        btnPararContinuar.className = 'btn-danger';
        btnPararContinuar.disabled = false;
        btnPararContinuar.onclick = () => pausarFase();
    } else if (data.status === 'pausado') {
        btnPararContinuar.innerText = '▶️ Continuar Fase';
        btnPararContinuar.className = 'btn-success';
        btnPararContinuar.disabled = false;
        btnPararContinuar.onclick = () => continuarFase();
    } else {
        btnPararContinuar.disabled = true;
        btnPararContinuar.innerText = '⏹️ Parar Fase';
    }
}

function atualizarRankingsProfessor() {
    const tabRankingGeral = document.getElementById('tab-ranking-geral');
    if (tabRankingGeral && !tabRankingGeral.classList.contains('hidden')) {
        renderRankingGeral('ranking-geral-container');
    }

    const tabRankingFase = document.getElementById('tab-ranking-fase');
    if (tabRankingFase && !tabRankingFase.classList.contains('hidden')) {
        const faseSelecionada = document.getElementById('select-fase-ranking')?.value || appState.fase;
        renderRankingIndividual(parseInt(faseSelecionada), 'ranking-parcial', true);
    }

    const tabRankingTurmas = document.getElementById('tab-ranking-turmas');
    if (tabRankingTurmas && !tabRankingTurmas.classList.contains('hidden')) {
        renderRankingTurmas('ranking-turmas-container');
    }
}

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
// FUNÇÕES DE CONTROLE DA FASE
// ============================================================
async function pausarFase() {
    const data = appState.data;
    if (!data || data.status !== 'em_andamento') return;
    const agora = Date.now();
    const tempoRestante = Math.max(0, data.fim - agora);
    await updateCopa({ status: 'pausado', tempoRestantePausa: tempoRestante, fim: 0 });
    toast('⏸️ Fase pausada.');
}

async function continuarFase() {
    const data = appState.data;
    if (!data || data.status !== 'pausado') return;
    const tempoRestante = data.tempoRestantePausa || 0;
    if (tempoRestante <= 0) { toast('⚠️ Tempo esgotado.'); return; }
    const novoFim = Date.now() + tempoRestante;
    await updateCopa({ status: 'em_andamento', fim: novoFim, tempoRestantePausa: null });
    toast('▶️ Fase retomada!');
}

async function resetarFase() {
    const faseAtual = appState.fase;
    if (!confirm(`⚠️ Resetar a Fase ${faseAtual}?`)) return;
    await removeNode(resultadosRef(faseAtual));
    await removeNode(participantesRef(faseAtual));
    await removeNode(resultadosTempRef(faseAtual));
    await removeNode(classificadosRef(faseAtual));
    await updateCopa({ status: 'aguardando', fim: 0, tempoRestantePausa: null });
    toast(`✅ Fase ${faseAtual} resetada!`);
}

async function avancarFase() {
    const faseAtual = appState.fase;
    const data = appState.data;
    if (faseAtual > 5) { toast('🏆 Competição já finalizada!'); return; }

    const resultados = data?.resultados?.[faseAtual] || {};
    let lista = [];
    for (const [id, partidas] of Object.entries(resultados)) {
        if (partidas?.length) {
            const melhor = [...partidas].sort((a, b) => b.pontos - a.pontos)[0];
            lista.push({ id, pontos: melhor.pontos, acertos: melhor.acertos, tempo: melhor.tempo });
        }
    }
    lista.sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.tempo - b.tempo);

    const vagas = VAGAS_POR_FASE[faseAtual] || 30;
    const classificadosIds = lista.slice(0, vagas).map(l => l.id);

    await classificadosRef(faseAtual).set(classificadosIds);

    const participantesAtual = data?.participantes?.[faseAtual] || {};
    const participantesProxima = {};
    for (const id of classificadosIds) {
        if (participantesAtual[id]) {
            participantesProxima[id] = participantesAtual[id];
        } else {
            for (let f = faseAtual - 1; f >= 1; f--) {
                if (data?.participantes?.[f]?.[id]) {
                    participantesProxima[id] = data.participantes[f][id];
                    break;
                }
            }
        }
    }
    if (Object.keys(participantesProxima).length > 0) {
        await participantesRef(faseAtual + 1).set(participantesProxima);
    }

    await removeNode(resultadosTempRef(faseAtual));

    if (faseAtual === 5) {
        toast('🏆 COMPETIÇÃO FINALIZADA!');
        await updateCopa({ status: 'finalizado', fim: 0, tempoRestantePausa: null });
        return;
    }

    await updateCopa({ fase: faseAtual + 1, status: 'aguardando', fim: 0, tempoRestantePausa: null });
    toast(`✅ Fase ${faseAtual} finalizada! ${vagas} classificados.`);
}

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
// LISTA DE ALUNOS
// ============================================================
function renderListaAlunosGerenciar() {
    const container = document.getElementById('lista-alunos-gerenciavel');
    if (!container) return;

    const data = appState.data;
    const faseAtual = data?.fase || 1;
    const participantes = data?.participantes?.[faseAtual] || {};
    const ids = Object.keys(participantes);

    if (ids.length === 0) {
        container.innerHTML = '<p>📭 Nenhum aluno cadastrado.</p>';
        return;
    }

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
                    await participantesRef(faseAtual).child(id).set({ nome: novoNome, turma: novaTurma });
                    renderListaAlunosGerenciar();
                }
            }
        });
    });

    container.querySelectorAll('.btn-excluir-aluno').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            if (confirm('Excluir aluno?')) {
                await participantesRef(faseAtual).child(id).remove();
                await resultadosRef(faseAtual).child(id).remove();
                await resultadosTempRef(faseAtual).child(id).remove();
                renderListaAlunosGerenciar();
            }
        });
    });
}

// ============================================================
// LISTA DE TURMAS
// ============================================================
function renderListaTurmas(turmas) {
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
                    await db.ref('copaV2/turmas').set(turmas);
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

// ============================================================
// CONFIGURAR EVENTOS DO PROFESSOR
// ============================================================
function configurarEventosProfessor() {
    // Abas
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
            }
        });
    });

    // Botões de controle
    document.getElementById('btn-iniciar-fase')?.addEventListener('click', () => {
        const duracao = parseInt(document.getElementById('input-tempo-fase')?.value) || 12;
        const fim = Date.now() + duracao * 60000;
        updateCopa({ status: 'em_andamento', fim, tempoRestantePausa: null });
        toast('▶️ Fase iniciada!');
    });

    document.getElementById('btn-avancar-fase')?.addEventListener('click', async () => {
        if (confirm('⚠️ Finalizar fase e classificar alunos?')) {
            await avancarFase();
        }
    });

    document.getElementById('btn-reset-fase')?.addEventListener('click', async () => {
        if (confirm(`⚠️ Resetar a Fase ${appState.fase}?`)) {
            await resetarFase();
        }
    });

    document.getElementById('btn-reset-total')?.addEventListener('click', () => {
        if (confirm('⚠️ Resetar toda a competição?')) {
            resetarCompeticao();
        }
    });

    document.getElementById('btn-aplicar-modalidade')?.addEventListener('click', async () => {
        const novaModalidade = document.getElementById('select-modalidade')?.value;
        if (!novaModalidade) return;
        if (confirm(`⚠️ Mudar para ${MODALIDADE_CONFIG[novaModalidade]?.nome} irá REINICIAR toda a competição. Continuar?`)) {
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
    document.getElementById('btn-sincronizar-global')?.addEventListener('click', updateLastSyncTime);

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
