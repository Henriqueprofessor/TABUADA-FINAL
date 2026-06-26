// ============================================================
// ARQUIVO: js/ui/aluno-ui.js
// DESCRIÇÃO: Interface do Aluno - Jogo e Visualização
// ============================================================

import { appState } from '../models/state.js';
import {
    adicionarParticipante,
    setPresence,
    removePresence,
    salvarResultado,
    salvarResultadoTemp,
    removerResultadoTemp,
    getOnce,
    gerarIdAluno,
    participantesRef,
    resultadosRef
} from '../services/firebase-service.js';
import {
    obterPerguntas,
    iniciarPartida,
    processarResposta,
    getProximaPergunta,
    criarObjetoPartida,
    verificarNotificacoes,
    verificarRecordes
} from '../models/game.js';
import { renderRankingIndividual } from '../ranking/ranking.js';
import { toast, escapeHtml, formatarTempo, isOnline } from '../utils/helpers.js';
import { soundManager } from '../utils/sounds.js';
import { confettiManager } from '../utils/confetti.js';
import { achievementManager } from '../utils/achievements.js';
import { notificationManager } from '../utils/notifications.js';
import { gamepadManager } from '../utils/gamepad.js';
import { syncService, addOfflinePartida } from '../services/sync-service.js';
import { VAGAS_POR_FASE, TOTAL_PERGUNTAS, TEMPO_PERGUNTA } from '../utils/constants.js';
import { MODALIDADE_CONFIG } from '../config/firebase-config.js';

// ========== VARIÁVEIS DO JOGO ==========
let partidaAtual = null;
let timerPergunta = null;
let animFrameId = null;
let tempoRestantePergunta = TEMPO_PERGUNTA;
let jogoAtivo = false;
let unsubscribeEstado = null;

// ========== INICIALIZAR UI DO ALUNO ==========
export function initAlunoUI(alunoId, alunoNome, alunoTurma) {
    // Esconder outras telas
    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById('tela-aluno').classList.remove('hidden');
    document.getElementById('online-stats').classList.remove('hidden');
    
    // Salvar dados do aluno
    appState.setAlunoData(alunoId, alunoNome, alunoTurma);
    
    // Atualizar display
    document.getElementById('aluno-nome-display').innerText = alunoNome;
    document.getElementById('aluno-turma-display').innerText = alunoTurma;
    
    // Configurar presença
    setPresence(alunoId, { nome: alunoNome, turma: alunoTurma, tipo: 'aluno' });
    
    // Registrar observador do estado
    if (unsubscribeEstado) unsubscribeEstado();
    unsubscribeEstado = appState.subscribe((data) => {
        if (appState.userType === 'aluno') {
            atualizarUIAluno(data);
        }
    });
    
    // Configurar eventos
    configurarEventosAluno();
    
    // Configurar gamepad
    gamepadManager.setGamepadCallbacks({
        onButtonPress: (index) => {
            if (!jogoAtivo) return;
            const mapeamento = {
                0: 0, 1: 1, 2: 2, 3: 3,
                4: 0, 5: 3
            };
            const opcao = mapeamento[index];
            if (opcao !== undefined) {
                window.responder(opcao);
            }
        }
    });
    
    // Carregar conquistas
    achievementManager.renderizarMedalhas(alunoId, 'medalhas-aluno');
}

// ========== ATUALIZAR UI DO ALUNO ==========
function atualizarUIAluno(data) {
    if (!data) return;
    
    const faseAtual = data.fase;
    const agora = Date.now();
    const encerrado = (data.status === 'em_andamento' && agora >= data.fim) || data.status === 'finalizado';
    const liberado = data.status === 'em_andamento' && !encerrado;
    
    document.getElementById('aluno-fase-info').innerText = `${faseAtual}/5`;
    
    const modalidadeNome = MODALIDADE_CONFIG[data.modalidade]?.nome || 'Tabuada 2-5';
    document.getElementById('aluno-modalidade').innerText = modalidadeNome;
    
    const msgDiv = document.getElementById('msg-status-aluno');
    const btnJogar = document.getElementById('btn-iniciar-partida');
    
    if (faseAtual > 1 && !appState.isClassificado(faseAtual, appState.alunoId)) {
        msgDiv.innerText = '❌ Você NÃO foi classificado para esta fase.';
        btnJogar.classList.add('hidden');
        return;
    }
    
    if (!liberado) {
        msgDiv.innerText = data.status === 'pausado' ? '⏸️ Fase pausada.' :
                          (data.status === 'finalizado' ? '🏆 Competição finalizada!' : '⏳ Aguardando liberação...');
        btnJogar.classList.add('hidden');
    } else if (encerrado) {
        msgDiv.innerText = '⏰ TEMPO ESGOTADO!';
        btnJogar.classList.add('hidden');
        if (!sessionStorage.getItem('modalExibido_' + faseAtual)) {
            sessionStorage.setItem('modalExibido_' + faseAtual, 'true');
            exibirResultadoFinal();
        }
    } else {
        msgDiv.innerText = '✅ Fase liberada! Clique em JOGAR.';
        btnJogar.classList.remove('hidden');
    }
    
    atualizarMelhorResultado();
    atualizarTimerAluno(data);
}

// ========== ATUALIZAR TIMER DO ALUNO ==========
function atualizarTimerAluno(data) {
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

// ========== ATUALIZAR MELHOR RESULTADO ==========
async function atualizarMelhorResultado() {
    const data = appState.data;
    if (!data) return;
    
    const faseAtual = data.fase;
    const alunoId = appState.alunoId;
    
    try {
        const snap = await getOnce(resultadosRef(faseAtual));
        const resultados = snap.val() || {};
        const partidas = resultados[alunoId] || [];
        
        if (partidas.length > 0) {
            const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
            document.getElementById('aluno-melhor-score').innerText = melhor.pontos || 0;
            
            let histHtml = '<ul>';
            partidas.slice().reverse().forEach(p => {
                histHtml += `<li>🏆 Pontos: ${p.pontos} | Acertos: ${p.acertos} | ${p.tempo ? formatarTempo(p.tempo * 1000) : '-'}</li>`;
            });
            histHtml += '</ul>';
            document.getElementById('historico-aluno').innerHTML = histHtml;
        }
        
        achievementManager.renderizarMedalhas(alunoId, 'medalhas-aluno');
        
    } catch (error) {
        console.warn('Erro ao atualizar melhor resultado:', error);
    }
}

// ========== CONFIGURAR EVENTOS ==========
function configurarEventosAluno() {
    document.getElementById('btn-iniciar-partida')?.addEventListener('click', iniciarNovaPartida);
    
    // ========== BOTÃO SAIR - CORRIGIDO ==========
    document.getElementById('btn-sair-aluno')?.addEventListener('click', () => {
        if (jogoAtivo) {
            if (!confirm('⚠️ Você está em uma partida. Deseja sair mesmo assim?')) return;
        }
        
        // Remover presença
        removePresence(appState.alunoId);
        
        // Cancelar inscrição do estado
        if (unsubscribeEstado) {
            unsubscribeEstado();
            unsubscribeEstado = null;
        }
        
        // LIMPAR OS DADOS DA SESSÃO
        sessionStorage.removeItem('userType');
        sessionStorage.removeItem('alunoId');
        sessionStorage.removeItem('alunoNome');
        sessionStorage.removeItem('alunoTurma');
        sessionStorage.removeItem('ultimaFase');
        
        // Resetar o estado do app
        appState.userType = null;
        appState.alunoId = null;
        appState.alunoNome = null;
        appState.alunoTurma = null;
        
        // Recarregar a página para voltar ao menu inicial
        window.location.href = window.location.pathname + '?t=' + Date.now();
    });
}

// ========== INICIAR NOVA PARTIDA ==========
async function iniciarNovaPartida() {
    if (jogoAtivo) return;
    
    const data = appState.data;
    if (!data) {
        toast('⏳ Aguardando dados do jogo...');
        return;
    }
    
    if (data.status !== 'em_andamento') {
        toast('⏸️ Fase inativa!');
        return;
    }
    
    if (Date.now() >= data.fim) {
        toast('⏰ Tempo esgotado!');
        return;
    }
    
    if (data.fase > 1 && !appState.isClassificado(data.fase, appState.alunoId)) {
        toast('❌ Não classificado para esta fase!');
        return;
    }
    
    try {
        const snap = await getOnce(resultadosRef(data.fase));
        const resultados = snap.val() || {};
        const partidas = resultados[appState.alunoId] || [];
        
        if (partidas.length > 0 && (data.fim - Date.now()) < 30000) {
            if (!confirm('⏰ Pouco tempo restante. Deseja tentar melhorar sua pontuação?')) {
                return;
            }
        }
    } catch (e) {
        console.warn('Erro ao verificar partidas existentes:', e);
    }
    
    const perguntas = obterPerguntas(data.modalidade);
    partidaAtual = iniciarPartida(perguntas);
    jogoAtivo = true;
    
    document.getElementById('jogo-area').classList.remove('hidden');
    document.getElementById('aguardando-aluno').classList.add('hidden');
    document.getElementById('pontuacao-acumulada').innerText = '0';
    
    soundManager.playGameStart();
    mostrarProximaPergunta();
}

// ========== MOSTRAR PRÓXIMA PERGUNTA ==========
function mostrarProximaPergunta() {
    if (!partidaAtual || partidaAtual.finalizada) {
        finalizarPartida();
        return;
    }
    
    const pergunta = getProximaPergunta(partidaAtual);
    if (!pergunta) {
        finalizarPartida();
        return;
    }
    
    document.getElementById('pergunta').innerText = `${pergunta.a} x ${pergunta.b} = ?`;
    document.getElementById('pergunta-num').innerText = `${partidaAtual.indice + 1}/${TOTAL_PERGUNTAS}`;
    
    const btns = document.querySelectorAll('.opcao');
    pergunta.opts.forEach((o, i) => {
        if (btns[i]) {
            btns[i].innerText = o;
            btns[i].disabled = false;
        }
    });
    
    tempoRestantePergunta = TEMPO_PERGUNTA;
    iniciarTimerPergunta();
}

// ========== INICIAR TIMER DA PERGUNTA ==========
function iniciarTimerPergunta() {
    if (timerPergunta) {
        clearInterval(timerPergunta);
        timerPergunta = null;
    }
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    
    const barra = document.getElementById('progresso-tempo');
    let inicio = performance.now();
    
    function atualizarBarra(timestamp) {
        const decorrido = (timestamp - inicio) / 1000;
        tempoRestantePergunta = Math.max(0, TEMPO_PERGUNTA - decorrido);
        if (barra) barra.style.width = (tempoRestantePergunta / TEMPO_PERGUNTA * 100) + '%';
        
        if (tempoRestantePergunta > 0) {
            animFrameId = requestAnimationFrame(atualizarBarra);
        } else {
            window.responder(-1);
        }
    }
    animFrameId = requestAnimationFrame(atualizarBarra);
    
    timerPergunta = setInterval(() => {
        if (tempoRestantePergunta <= 0) {
            clearInterval(timerPergunta);
            timerPergunta = null;
        }
    }, 100);
}

// ========== RESPONDER PERGUNTA ==========
window.responder = async function(idx) {
    console.log('responder chamado com idx:', idx);
    
    if (!jogoAtivo || !partidaAtual || partidaAtual.finalizada) {
        console.log('Jogo não está ativo');
        return;
    }
    
    if (timerPergunta) {
        clearInterval(timerPergunta);
        timerPergunta = null;
    }
    if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
    }
    
    let opcaoSelecionada = null;
    if (idx >= 0) {
        const btns = document.querySelectorAll('.opcao');
        if (btns[idx]) {
            opcaoSelecionada = parseInt(btns[idx].innerText);
            console.log('Opção selecionada:', opcaoSelecionada);
        }
    }
    
    const resultado = processarResposta(partidaAtual, opcaoSelecionada);
    if (!resultado) return;
    
    console.log('Resultado:', resultado);
    
    if (resultado.acertou) {
        soundManager.playCorrect();
    } else {
        soundManager.playWrong();
    }
    
    if (resultado.acertou && confettiManager.config.confetes) {
        confettiManager.fireHit();
    }
    
    const notificacoes = verificarNotificacoes(partidaAtual, resultado);
    for (const notifId of notificacoes) {
        notificationManager.mostrar(notifId, {
            pontos: partidaAtual.pontos,
            tempo: resultado.tempoGasto
        });
    }
    
    document.getElementById('pontuacao-acumulada').innerText = partidaAtual.pontos;
    
    await salvarProgressoTemporario();
    
    if (resultado.finalizada) {
        setTimeout(() => finalizarPartida(), 300);
    } else {
        setTimeout(() => mostrarProximaPergunta(), 300);
    }
};

// ========== SALVAR PROGRESSO TEMPORÁRIO ==========
async function salvarProgressoTemporario() {
    if (!partidaAtual || !appState.alunoId) return;
    
    const data = appState.data;
    if (!data) return;
    
    try {
        await salvarResultadoTemp(data.fase, appState.alunoId, {
            nome: appState.alunoNome,
            turma: appState.alunoTurma,
            pontos: partidaAtual.pontos,
            acertos: partidaAtual.acertos,
            tempo: partidaAtual.tempoTotal,
            perguntas: partidaAtual.indice,
            timestamp: Date.now()
        });
    } catch (e) {
        console.warn('Erro ao salvar progresso temporário:', e);
    }
}

// ========== FINALIZAR PARTIDA ==========
async function finalizarPartida() {
    if (!jogoAtivo || !partidaAtual) return;
    
    jogoAtivo = false;
    partidaAtual.finalizada = true;
    
    document.getElementById('jogo-area').classList.add('hidden');
    document.getElementById('aguardando-aluno').classList.remove('hidden');
    
    soundManager.playFanfare();
    
    const data = appState.data;
    const faseAtual = data?.fase || 1;
    const alunoId = appState.alunoId;
    
    const objetoPartida = criarObjetoPartida(partidaAtual);
    
    try {
        if (isOnline()) {
            await salvarResultado(faseAtual, alunoId, objetoPartida);
            await removerResultadoTemp(faseAtual, alunoId);
            toast('✅ Partida finalizada com sucesso!');
        } else {
            addOfflinePartida(alunoId, faseAtual, objetoPartida);
            toast('📶 Sem internet. Partida salva localmente.');
        }
    } catch (e) {
        console.warn('Erro ao salvar partida:', e);
        addOfflinePartida(alunoId, faseAtual, objetoPartida);
        toast('⚠️ Erro ao salvar. Partida salva localmente.');
    }
    
    try {
        const snap = await getOnce(resultadosRef(faseAtual));
        const resultados = snap.val() || {};
        const partidas = resultados[alunoId] || [];
        const recordes = verificarRecordes(partidaAtual, partidas);
        
        if (recordes.recordeFase) {
            notificationManager.mostrar('recordeFase', { pontos: partidaAtual.pontos });
            if (confettiManager.config.confetes) {
                confettiManager.fireRecord();
            }
        }
        if (recordes.recordeGeral) {
            notificationManager.mostrar('recordeGeral', { pontos: partidaAtual.pontos });
            if (confettiManager.config.confetes) {
                confettiManager.fireCelebration();
            }
        }
    } catch (e) {
        console.warn('Erro ao verificar recordes:', e);
    }
    
    const stats = {
        totalPartidas: (await getOnce(resultadosRef(faseAtual))).val()?.[alunoId]?.length || 0,
        melhorAcertos: partidaAtual.acertos,
        classificado: appState.isClassificado(faseAtual, alunoId),
        faseMaxima: faseAtual,
        melhorTempoTotal: partidaAtual.tempoTotal,
        campeao: faseAtual === 5 && partidaAtual.acertos === TOTAL_PERGUNTAS
    };
    achievementManager.verificarConquistas(alunoId, stats);
    
    await atualizarMelhorResultado();
    exibirModalResultado();
}

// ========== EXIBIR MODAL DE RESULTADO ==========
async function exibirModalResultado() {
    if (!partidaAtual) return;
    
    const pos = await buscarPosicaoAluno();
    const posFinal = pos || 0;
    const pontos = partidaAtual.pontos;
    const acertos = partidaAtual.acertos;
    const tempoMedio = partidaAtual.tempoTotal / Math.max(1, partidaAtual.indice);
    
    let emoji = '';
    if (posFinal === 1) emoji = '🥇';
    else if (posFinal === 2) emoji = '🥈';
    else if (posFinal === 3) emoji = '🥉';
    else emoji = '🏆';
    
    const htmlModal = `
        <div class="modal-resultados" id="modal-pos-jogo">
            <h2>🏁 RESULTADO DA PARTIDA</h2>
            <div style="font-size: 48px; margin: 10px 0;">${emoji}</div>
            <div style="font-size: 28px; font-weight: bold;">${posFinal}º lugar</div>
            <hr style="border-color: #2c3e50; margin: 15px 0;">
            <div style="font-size: 24px; font-weight: bold;">⭐ ${pontos} pts</div>
            <div>✅ Acertos: ${acertos}/20</div>
            <div>⏱️ Tempo médio: ${tempoMedio.toFixed(1)} s/pergunta</div>
            <div style="margin-top: 20px;">
                <button class="fechar" id="btn-fechar-modal">Fechar</button>
                ${appState.data?.status === 'em_andamento' && Date.now() < (appState.data?.fim || 0) ? 
                    '<button class="jogar-novamente" id="btn-jogar-novamente" style="background: #27ae60;">🔄 Tentar melhorar</button>' : 
                    ''}
            </div>
        </div>
    `;
    
    const modalExistente = document.getElementById('modal-pos-jogo');
    if (modalExistente) modalExistente.remove();
    document.body.insertAdjacentHTML('beforeend', htmlModal);
    
    document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
        document.getElementById('modal-pos-jogo')?.remove();
    });
    
    document.getElementById('btn-jogar-novamente')?.addEventListener('click', () => {
        document.getElementById('modal-pos-jogo')?.remove();
        iniciarNovaPartida();
    });
}

// ========== BUSCAR POSIÇÃO DO ALUNO ==========
async function buscarPosicaoAluno() {
    try {
        const data = appState.data;
        if (!data) return 0;
        
        const faseAtual = data.fase;
        const snap = await getOnce(resultadosRef(faseAtual));
        const resultados = snap.val() || {};
        
        let lista = [];
        for (const [id, partidas] of Object.entries(resultados)) {
            if (partidas?.length) {
                const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
                lista.push({ id, pontos: melhor.pontos });
            }
        }
        
        lista.sort((a, b) => b.pontos - a.pontos);
        const pos = lista.findIndex(p => p.id === appState.alunoId) + 1;
        return pos;
    } catch (e) {
        console.warn('Erro ao buscar posição:', e);
        return 0;
    }
}

// ========== EXIBIR RESULTADO FINAL DA FASE ==========
async function exibirResultadoFinal() {
    const data = appState.data;
    if (!data) return;
    
    const faseAtual = data.fase;
    const vagas = VAGAS_POR_FASE[faseAtual] || 30;
    
    try {
        const snap = await getOnce(resultadosRef(faseAtual));
        const resultados = snap.val() || {};
        
        let lista = [];
        for (const [id, partidas] of Object.entries(resultados)) {
            if (partidas?.length) {
                const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
                lista.push({ id, pontos: melhor.pontos });
            }
        }
        lista.sort((a, b) => b.pontos - a.pontos);
        
        const pos = lista.findIndex(p => p.id === appState.alunoId) + 1;
        const classificado = pos > 0 && pos <= vagas;
        
        let modalHtml = `
            <div class="modal-resultados ${classificado ? 'modal-classificado' : 'modal-eliminado'}" id="modal-fim-tempo">
                <h2>${classificado ? '✅ PARABÉNS! VOCÊ CLASSIFICOU!' : '❌ VOCÊ FOI ELIMINADO'}</h2>
                <div style="font-size: 48px; margin: 15px 0;">${classificado ? '🏆' : '😢'}</div>
                <div>Sua posição final: <strong>${pos}º lugar</strong></div>
                <div>${classificado ? `Classificado para a Fase ${faseAtual + 1}` : 'Continue treinando para a próxima competição!'}</div>
                <div class="dica">${classificado ? 'Prepare-se para a próxima fase!' : 'Continue treinando e tente novamente na próxima competição.'}</div>
                <button class="fechar" id="btn-fechar-modal-fim">Voltar ao Menu</button>
            </div>
        `;
        
        const modalExistente = document.getElementById('modal-fim-tempo');
        if (modalExistente) modalExistente.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        document.getElementById('btn-fechar-modal-fim')?.addEventListener('click', () => {
            document.getElementById('modal-fim-tempo')?.remove();
            location.reload();
        });
        
    } catch (e) {
        console.warn('Erro ao exibir resultado final:', e);
    }
}
