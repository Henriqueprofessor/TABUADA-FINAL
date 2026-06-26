// ============================================================
// ARQUIVO: js/ui/aluno-ui.js
// DESCRIÇÃO: Interface do Aluno - VERSÃO ESTÁVEL
// ============================================================

import { appState } from '../models/state.js';
import {
    setPresence,
    removePresence,
    salvarResultado,
    salvarResultadoTemp,
    removerResultadoTemp,
    getOnce,
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
import { toast, isOnline } from '../utils/helpers.js';
import { soundManager } from '../utils/sounds.js';
import { confettiManager } from '../utils/confetti.js';
import { achievementManager } from '../utils/achievements.js';
import { notificationManager } from '../utils/notifications.js';
import { addOfflinePartida } from '../services/sync-service.js';
import { TOTAL_PERGUNTAS, TEMPO_PERGUNTA, VAGAS_POR_FASE } from '../utils/constants.js';
import { MODALIDADE_CONFIG } from '../config/firebase-config.js';

// ========== VARIÁVEIS ==========
let partidaAtual = null;
let timerPergunta = null;
let animFrameId = null;
let tempoRestantePergunta = TEMPO_PERGUNTA;
let jogoAtivo = false;
let unsubscribeEstado = null;
let timerFaseInterval = null;

// ========== INICIALIZAR ==========
export function initAlunoUI(alunoId, alunoNome, alunoTurma) {
    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.getElementById('tela-aluno').classList.remove('hidden');
    document.getElementById('online-stats').classList.remove('hidden');
    
    appState.setAlunoData(alunoId, alunoNome, alunoTurma);
    
    document.getElementById('aluno-nome-display').innerText = alunoNome;
    document.getElementById('aluno-turma-display').innerText = alunoTurma;
    
    setPresence(alunoId, { nome: alunoNome, turma: alunoTurma, tipo: 'aluno' });
    
    if (unsubscribeEstado) unsubscribeEstado();
    unsubscribeEstado = appState.subscribe((data) => {
        if (appState.userType === 'aluno') {
            atualizarUIAluno(data);
        }
    });
    
    configurarEventosAluno();
    achievementManager.renderizarMedalhas(alunoId, 'medalhas-aluno');
    
    iniciarTimerFase();
}

// ========== TIMER DA FASE ==========
function iniciarTimerFase() {
    if (timerFaseInterval) {
        clearInterval(timerFaseInterval);
        timerFaseInterval = null;
    }
    
    timerFaseInterval = setInterval(() => {
        const data = appState.data;
        if (!data) return;
        
        const timerDisplay = document.getElementById('timer-fase');
        if (!timerDisplay) return;
        
        if (data.status === 'em_andamento') {
            const restante = Math.max(0, data.fim - Date.now());
            const min = Math.floor(restante / 60000);
            const sec = Math.floor((restante % 60000) / 1000);
            timerDisplay.innerText = `${min}:${sec.toString().padStart(2, '0')}`;
        } else if (data.status === 'pausado') {
            const tempoPausado = data.tempoRestantePausa || 0;
            const min = Math.floor(tempoPausado / 60000);
            const sec = Math.floor((tempoPausado % 60000) / 1000);
            timerDisplay.innerText = `${min}:${sec.toString().padStart(2, '0')}`;
        } else {
            timerDisplay.innerText = data.status === 'finalizado' ? 'FIM' : 'PAUSADO';
        }
    }, 1000);
}

// ========== ATUALIZAR UI ==========
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
    } else {
        msgDiv.innerText = '✅ Fase liberada! Clique em JOGAR.';
        btnJogar.classList.remove('hidden');
    }
    
    atualizarMelhorResultado();
}

// ========== MELHOR RESULTADO ==========
async function atualizarMelhorResultado() {
    const data = appState.data;
    if (!data) return;
    
    try {
        const snap = await getOnce(resultadosRef(data.fase));
        const resultados = snap.val() || {};
        const partidas = resultados[appState.alunoId] || [];
        
        if (partidas.length > 0) {
            const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
            document.getElementById('aluno-melhor-score').innerText = melhor.pontos || 0;
        }
    } catch (e) {
        console.warn('Erro ao atualizar melhor resultado:', e);
    }
}

// ========== EVENTOS ==========
function configurarEventosAluno() {
    document.getElementById('btn-iniciar-partida')?.addEventListener('click', iniciarNovaPartida);
    
    document.getElementById('btn-sair-aluno')?.addEventListener('click', () => {
        if (jogoAtivo && !confirm('⚠️ Deseja sair mesmo assim?')) return;
        
        if (timerFaseInterval) {
            clearInterval(timerFaseInterval);
            timerFaseInterval = null;
        }
        
        removePresence(appState.alunoId);
        if (unsubscribeEstado) {
            unsubscribeEstado();
            unsubscribeEstado = null;
        }
        
        sessionStorage.clear();
        appState.userType = null;
        appState.alunoId = null;
        appState.alunoNome = null;
        appState.alunoTurma = null;
        
        window.location.href = window.location.pathname + '?t=' + Date.now();
    });
}

// ========== INICIAR JOGO ==========
async function iniciarNovaPartida() {
    if (jogoAtivo) return;
    
    const data = appState.data;
    if (!data) { toast('⏳ Aguardando dados...'); return; }
    if (data.status !== 'em_andamento') { toast('⏸️ Fase inativa!'); return; }
    if (Date.now() >= data.fim) { toast('⏰ Tempo esgotado!'); return; }
    if (data.fase > 1 && !appState.isClassificado(data.fase, appState.alunoId)) {
        toast('❌ Não classificado!');
        return;
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

// ========== MOSTRAR PERGUNTA ==========
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
    document.getElementById('pergunta-num').innerText = partidaAtual.indice + 1;
    
    const btns = document.querySelectorAll('.opcao');
    pergunta.opts.forEach((o, i) => {
        if (btns[i]) {
            btns[i].innerText = o;
            btns[i].disabled = false;
        }
    });
    
    tempoRestantePergunta = TEMPO_PERGUNTA;
    const barra = document.getElementById('progresso-tempo');
    if (barra) {
        barra.style.width = '100%';
        barra.style.background = '#27ae60';
    }
    
    iniciarTimerPergunta();
}

// ========== TIMER DA PERGUNTA ==========
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
        
        if (barra) {
            const percentual = (tempoRestantePergunta / TEMPO_PERGUNTA) * 100;
            barra.style.width = percentual + '%';
            
            if (percentual < 20) {
                barra.style.background = '#e74c3c';
            } else if (percentual < 50) {
                barra.style.background = '#f39c12';
            } else {
                barra.style.background = '#27ae60';
            }
        }
        
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

// ========== RESPONDER ==========
window.responder = async function(idx) {
    if (!jogoAtivo || !partidaAtual || partidaAtual.finalizada) return;
    
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
        }
    }
    
    const resultado = processarResposta(partidaAtual, opcaoSelecionada);
    if (!resultado) return;
    
    if (resultado.acertou) {
        soundManager.playCorrect();
        if (confettiManager.config.confetes) confettiManager.fireHit();
    } else {
        soundManager.playWrong();
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

// ========== SALVAR PROGRESSO ==========
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
        console.warn('Erro ao salvar progresso:', e);
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
            toast('✅ Partida finalizada!');
        } else {
            addOfflinePartida(alunoId, faseAtual, objetoPartida);
            toast('📶 Salvo localmente.');
        }
    } catch (e) {
        addOfflinePartida(alunoId, faseAtual, objetoPartida);
        toast('⚠️ Salvo localmente.');
    }
    
    await atualizarMelhorResultado();
    exibirModalResultado();
}

// ========== MODAL RESULTADO ==========
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
            <h2>🏁 RESULTADO</h2>
            <div style="font-size:48px;margin:10px 0;">${emoji}</div>
            <div style="font-size:28px;font-weight:bold;">${posFinal}º lugar</div>
            <hr style="border-color:#2c3e50;margin:15px 0;">
            <div style="font-size:24px;font-weight:bold;">⭐ ${pontos} pts</div>
            <div>✅ Acertos: ${acertos}/20</div>
            <div>⏱️ Tempo médio: ${tempoMedio.toFixed(1)}s</div>
            <div style="margin-top:20px;">
                <button class="fechar" id="btn-fechar-modal">Fechar</button>
                ${appState.data?.status === 'em_andamento' && Date.now() < (appState.data?.fim || 0) ? 
                    '<button class="jogar-novamente" id="btn-jogar-novamente" style="background:#27ae60;">🔄 Tentar melhorar</button>' : ''}
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

// ========== BUSCAR POSIÇÃO ==========
async function buscarPosicaoAluno() {
    try {
        const data = appState.data;
        if (!data) return 0;
        
        const snap = await getOnce(resultadosRef(data.fase));
        const resultados = snap.val() || {};
        
        let lista = [];
        for (const [id, partidas] of Object.entries(resultados)) {
            if (partidas?.length) {
                const melhor = partidas.sort((a, b) => b.pontos - a.pontos)[0];
                lista.push({ id, pontos: melhor.pontos });
            }
        }
        
        lista.sort((a, b) => b.pontos - a.pontos);
        return lista.findIndex(p => p.id === appState.alunoId) + 1;
    } catch (e) {
        return 0;
    }
}
