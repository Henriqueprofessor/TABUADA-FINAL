// ============================================================
// ARQUIVO: js/ui/professor-ui.js
// DESCRIÇÃO: Interface do Professor com todos os controles
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
    listenToOnline
} from '../services/firebase-service.js';
import { renderRankingIndividual, renderRankingTurmas, renderRankingGeral } from '../ranking/ranking.js';
import { toast, updateLastSyncTime, escapeHtml } from '../utils/helpers.js';
import { soundManager } from '../utils/sounds.js';
import { confettiManager } from '../utils/confetti.js';
import { achievementManager } from '../utils/achievements.js';
import { notificationManager } from '../utils/notifications.js';
import { gamepadManager } from '../utils/gamepad.js';
import { syncService } from '../services/sync-service.js';
import { CONFIG_PADRAO } from '../config/firebase-config.js';

export function initProfessorUI() {
    // Esconder outras telas, mostrar painel professor
    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById('painel-professor').classList.remove('hidden');
    document.getElementById('online-stats').classList.remove('hidden');
    
    // Registrar observador do estado
    appState.subscribe((data) => {
        if (appState.userType === 'professor') {
            atualizarUIProfessor(data);
        }
    });
    
    // Configurar eventos dos botões
    configurarEventosProfessor();
    
    // Carregar turmas
    carregarTurmas().then(turmas => {
        renderListaTurmas(turmas);
    });
    
    // Iniciar listener de online
    listenToOnline((data) => {
        atualizarOnlineStats(data);
    });
    
    // Configurar switches de configurações
    configurarSwitchesConfiguracoes();
    
    // Carregar configurações
    carregarConfiguracoes();
}

// ========== ATUALIZAR UI DO PROFESSOR ==========
function atualizarUIProfessor(data) {
    if (!data) return;
    
    // Atualizar informações da fase
    document.getElementById('fase-atual-titulo').innerText = data.fase;
    document.getElementById('fase-progresso').innerText = `${data.fase}/${5}`;
    document.getElementById('prof-fase-info').innerText = `${data.fase}/5`;
    
    // Atualizar modalidade
    const modalidadeNome = appState.getModalidadeNome();
    document.getElementById('modalidade-titulo').innerText = modalidadeNome;
    
    // Atualizar timer
    atualizarTimerProfessor(data);
    
    // Atualizar botões
    atualizarBotoesProfessor(data);
    
    // Atualizar rankings (se as abas estiverem visíveis)
    atualizarRankingsProfessor();
    
    // Atualizar lista de alunos
    renderListaAlunosGerenciar();
}

// ========== ATUALIZAR TIMER ==========
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

// ========== ATUALIZAR BOTÕES ==========
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

// ========== ATUALIZAR RANKINGS ==========
function atualizarRankingsProfessor() {
    // Ranking geral
    const tabRankingGeral = document.getElementById('tab-ranking-geral');
    if (tabRankingGeral && !tabRankingGeral.classList.contains('hidden')) {
        renderRankingGeral('ranking-geral-container');
    }
    
    // Ranking por fase
    const tabRankingFase = document.getElementById('tab-ranking-fase');
    if (tabRankingFase && !tabRankingFase.classList.contains('hidden')) {
        const faseSelecionada = document.getElementById('select-fase-ranking')?.value || appState.fase;
        renderRankingIndividual(parseInt(faseSelecionada), 'ranking-parcial', true);
    }
    
    // Ranking por turmas
    const tabRankingTurmas = document.getElementById('tab-ranking-turmas');
    if (tabRankingTurmas && !tabRankingTurmas.classList.contains('hidden')) {
        renderRankingTurmas('ranking-turmas-container');
    }
}

// ========== ATUALIZAR ONLINE STATS ==========
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
    
    // Lista de participantes
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

// ========== CONFIGURAR EVENTOS ==========
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
            
            // Atualizar conteúdo da aba
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
    
    // Controle da Fase
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
    
    // Modalidade
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
    
    // Tempo
    document.getElementById('btn-salvar-tempo')?.addEventListener('click', () => {
        const t = parseInt(document.getElementById('input-tempo-fase')?.value);
        if (t > 0) updateCopa({ tempoFase: t });
    });
    
    // Sincronização
    document.getElementById('btn-sync-prof')?.addEventListener('click', updateLastSyncTime);
    document.getElementById('btn-sincronizar-global')?.addEventListener('click', updateLastSyncTime);
    
    // Voltar
    document.getElementById('btn-voltar-menu-prof')?.addEventListener('click', () => location.reload());
    
    // Gerenciar turmas
    document.getElementById('btn-adicionar-turma')?.addEventListener('click', async () => {
        const novaTurma = prompt('Digite o nome da nova turma:');
        if (novaTurma && novaTurma.trim()) {
            await adicionarTurma(novaTurma.trim());
            const turmas = await carregarTurmas();
            renderListaTurmas(turmas);
        }
    });
    
    // Atualizar lista de alunos
    document.getElementById('btn-atualizar-lista-alunos')?.addEventListener('click', renderListaAlunosGerenciar);
    
    // Ranking por fase - select
    document.getElementById('select-fase-ranking')?.addEventListener('change', (e) => {
        const fase = parseInt(e.target.value);
        if (!isNaN(fase)) {
            renderRankingIndividual(fase, 'ranking-parcial', true);
        }
    });
    
    // Intervalos
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
    
    // Atualizar ranking turmas
    document.getElementById('btn-atualizar-ranking-turmas')?.addEventListener('click', () => {
        renderRankingTurmas('ranking-turmas-container');
    });
    
    // Auto atualização ranking
    document.getElementById('btn-toggle-auto-ranking')?.addEventListener('click', () => {
        const btn = document.getElementById('btn-toggle-auto-ranking');
        const ativo = btn.innerText.includes('Pausar');
        btn.innerText = ativo ? '▶️ Retomar Atualização' : '⏸️ Pausar Atualização';
        toast(ativo ? 'Auto atualização pausada' : 'Auto atualização retomada');
    });
    
    // Salvar configurações
    document.getElementById('btn-salvar-config')?.addEventListener('click', salvarConfiguracoesGerais);
    document.getElementById('btn-restaurar-padrao')?.addEventListener('click', restaurarConfiguracoesPadrao);
}

// ========== CONFIGURAR SWITCHES DE CONFIGURAÇÕES ==========
function configurarSwitchesConfiguracoes() {
    // Os switches serão populados quando as configurações forem carregadas
}

// ========== CARREGAR CONFIGURAÇÕES ==========
function carregarConfiguracoes() {
    const config = appState.configuracoes || CONFIG_PADRAO;
    
    // Efeitos Visuais
    setSwitch('cfg-confetes', config.confetes);
    setSwitch('cfg-notificacoes', config.notificacoes);
    setSwitch('cfg-brilho', config.brilho);
    
    // Áudio
    setSwitch('cfg-sons', config.sons);
    setSwitch('cfg-sons-celebracao', config.sonsCelebracao);
    setSwitch('cfg-sons-erro', config.sonsErro);
    
    // Gamificação
    setSwitch('cfg-bonus', config.bonus);
    setSwitch('cfg-conquistas', config.conquistas);
    
    // Acessibilidade
    setSwitch('cfg-gamepad', config.gamepad);
    
    // Offline
    setSwitch('cfg-sync-offline', config.syncOffline);
}

function setSwitch(id, value) {
    const el = document.getElementById(id);
    if (el) el.checked = value;
}

// ========== SALVAR CONFIGURAÇÕES GERAIS ==========
async function salvarConfiguracoesGerais() {
    const config = {
        // Efeitos Visuais
        confetes: document.getElementById('cfg-confetes')?.checked || false,
        notificacoes: document.getElementById('cfg-notificacoes')?.checked || false,
        brilho: document.getElementById('cfg-brilho')?.checked || false,
        
        // Áudio
        sons: document.getElementById('cfg-sons')?.checked || false,
        sonsCelebracao: document.getElementById('cfg-sons-celebracao')?.checked || false,
        sonsErro: document.getElementById('cfg-sons-erro')?.checked || false,
        
        // Gamificação
        bonus: document.getElementById('cfg-bonus')?.checked || false,
        conquistas: document.getElementById('cfg-conquistas')?.checked || false,
        
        // Acessibilidade
        gamepad: document.getElementById('cfg-gamepad')?.checked || false,
        
        // Offline
        syncOffline: document.getElementById('cfg-sync-offline')?.checked || false
    };
    
    await salvarConfiguracoes(config);
    toast('✅ Configurações salvas com sucesso!');
}

// ========== RESTAURAR CONFIGURAÇÕES PADRÃO ==========
async function restaurarConfiguracoesPadrao() {
    if (!confirm('⚠️ Restaurar todas as configurações para o padrão?')) return;
    
    await salvarConfiguracoes(CONFIG_PADRAO);
    carregarConfiguracoes();
    toast('✅ Configurações restauradas para o padrão!');
}

// ========== PAUSAR FASE ==========
async function pausarFase() {
    const data = appState.data;
    if (!data || data.status !== 'em_andamento') return;
    
    const agora = Date.now();
    const tempoRestante = Math.max(0, data.fim - agora);
    await updateCopa({ status: 'pausado', tempoRestantePausa: tempoRestante, fim: 0 });
    toast('⏸️ Fase pausada.');
}

// ========== CONTINUAR FASE ==========
async function continuarFase() {
    const data = appState.data;
    if (!data || data.status !== 'pausado') return;
    
    const tempoRestante = data.tempoRestantePausa || 0;
    if (tempoRestante <= 0) {
        toast('⚠️ Tempo esgotado.');
        return;
    }
    
    const novoFim = Date.now() + tempoRestante;
    await updateCopa({ status: 'em_andamento', fim: novoFim, tempoRestantePausa: null });
    toast('▶️ Fase retomada!');
}

// ========== RESETAR FASE ==========
async function resetarFase() {
    const faseAtual = appState.fase;
    const { resultadosRef, participantesRef, classificadosRef, resultadosTempRef, removeNode } = await import('../services/firebase-service.js');
    
    await removeNode(resultadosRef(faseAtual));
    await removeNode(participantesRef(faseAtual));
    await removeNode(resultadosTempRef(faseAtual));
    await removeNode(classificadosRef(faseAtual));
    await updateCopa({ status: 'aguardando', fim: 0, tempoRestantePausa: null });
    
    toast(`✅ Fase ${faseAtual} resetada!`);
}

// ========== AVANÇAR FASE ==========
async function avancarFase() {
    const faseAtual = appState.fase;
    const data = appState.data;
    
    if (faseAtual > 5) {
        toast('🏆 Competição já finalizada!');
        return;
    }
    
    const resultados = data?.resultados?.[faseAtual] || {};
    let lista = [];
    
    for (const [id, partidas] of Object.entries(resultados)) {
        if (partidas?.length) {
            const melhor = [...partidas].sort((a, b) => b.pontos - a.pontos)[0];
            lista.push({ id, pontos: melhor.pontos, acertos: melhor.acertos, tempo: melhor.tempo });
        }
    }
    
    lista.sort((a, b) => b.pontos - a.pontos || b.acertos - a.acertos || a.tempo - b.tempo);
    
    const vagas = { 1: 30, 2: 20, 3: 10, 4: 5, 5: 5 }[faseAtual] || 30;
    const classificadosIds = lista.slice(0, vagas).map(l => l.id);
    
    const { classificadosRef, participantesRef, set, removeNode, resultadosTempRef } = await import('../services/firebase-service.js');
    
    await set(classificadosRef(faseAtual), classificadosIds);
    
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
        await set(participantesRef(faseAtual + 1), participantesProxima);
    }
    
    await removeNode(resultadosTempRef(faseAtual));
    
    if (faseAtual === 5) {
        toast('🏆 COMPETIÇÃO FINALIZADA!');
        await updateCopa({ status: 'finalizado', fim: 0, tempoRestantePausa: null });
        return;
    }
    
    await updateCopa({ fase: faseAtual + 1, status: 'aguardando', fim: 0, tempoRestantePausa: null });
    toast(`✅ Fase ${faseAtual} finalizada! ${vagas} classificados para a fase ${faseAtual + 1}.`);
}

// ========== RESETAR COMPETIÇÃO ==========
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

// ========== RENDERIZAR LISTA DE ALUNOS ==========
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
    
    // Eventos de editar e excluir
    container.querySelectorAll('.btn-editar-aluno').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const novoNome = prompt('Novo nome:', btn.getAttribute('data-nome'));
            if (novoNome) {
                const novaTurma = prompt('Nova turma:', btn.getAttribute('data-turma'));
                if (novaTurma) {
                    const { update } = await import('../services/firebase-service.js');
                    const { participantesRef } = await import('../services/firebase-service.js');
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
                const { participantesRef, resultadosRef, resultadosTempRef } = await import('../services/firebase-service.js');
                await removeNode(participantesRef(faseAtual) + '/' + id);
                await removeNode(resultadosRef(faseAtual) + '/' + id);
                await removeNode(resultadosTempRef(faseAtual) + '/' + id);
                renderListaAlunosGerenciar();
            }
        });
    });
}

// ========== RENDERIZAR LISTA DE TURMAS ==========
function renderListaTurmas(turmas) {
    const container = document.getElementById('lista-turmas-gerenciavel');
    if (!container) return;
    
    if (!turmas || turmas.length === 0) {
        container.innerHTML = '<p>📭 Nenhuma turma cadastrada. Adicione usando o botão acima.</p>';
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
    
    // Eventos
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
                    await set(ref(db, 'copaV2/turmas'), turmas);
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

// ========== POPULAR SELECT DE FASES ==========
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
