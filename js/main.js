// ============================================================
// ARQUIVO: js/main.js
// DESCRIÇÃO: Ponto de entrada principal - VERSÃO CORRIGIDA
// ============================================================

// Importar tudo sem Firebase imports diretos
import { appState } from './models/state.js';
import { initProfessorUI } from './ui/professor-ui.js';
import { initAlunoUI } from './ui/aluno-ui.js';
import { initTorcidaUI } from './ui/torcida-ui.js';
import { 
    carregarTurmas, 
    carregarIntervalos,
    gerarIdAluno,
    adicionarParticipante,
    setPresence
} from './services/firebase-service.js';
import { toast, escapeHtml } from './utils/helpers.js';
import { soundManager } from './utils/sounds.js';
import { confettiManager } from './utils/confetti.js';
import { achievementManager } from './utils/achievements.js';
import { notificationManager } from './utils/notifications.js';
import { gamepadManager } from './utils/gamepad.js';

// ========== INICIALIZAÇÃO ==========
async function init() {
    console.log('🏆 Copa Tabuada CEIB 2026 - Iniciando...');
    
    // Carregar configurações do Firebase
    await carregarDadosIniciais();
    
    // Inicializar estado do app
    appState.init();
    appState.loadFromSession();
    
    // Verificar se já está logado
    if (appState.userType === 'aluno' && appState.alunoId) {
        // Aluno já logado - restaurar sessão
        document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
        document.getElementById('tela-aluno').classList.remove('hidden');
        document.getElementById('online-stats').classList.remove('hidden');
        
        // Atualizar presença
        setPresence(appState.alunoId, { 
            nome: appState.alunoNome, 
            turma: appState.alunoTurma, 
            tipo: 'aluno' 
        });
        
        initAlunoUI(appState.alunoId, appState.alunoNome, appState.alunoTurma);
        return;
    }
    
    // Se não estiver logado, mostrar menu principal
    mostrarMenuPrincipal();
    
    // Configurar eventos dos botões do menu
    configurarEventosMenu();
}

// ========== CARREGAR DADOS INICIAIS ==========
async function carregarDadosIniciais() {
    try {
        // Carregar turmas
        await carregarTurmas();
        
        // Carregar intervalos
        const intervalos = await carregarIntervalos();
        appState.intervalos = intervalos;
        
        console.log('✅ Dados iniciais carregados!');
    } catch (error) {
        console.error('❌ Erro ao carregar dados iniciais:', error);
        toast('⚠️ Erro ao carregar dados. Verifique sua conexão.');
    }
}

// ========== MOSTRAR MENU PRINCIPAL ==========
function mostrarMenuPrincipal() {
    document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
    document.querySelector('.container .card:first-child').classList.remove('hidden');
    document.getElementById('online-stats').classList.add('hidden');
}

// ========== CONFIGURAR EVENTOS DO MENU ==========
function configurarEventosMenu() {
    // Botão Professor
    document.getElementById('btn-professor')?.addEventListener('click', async () => {
        const senha = prompt('🔐 Digite a senha do Professor:');
        if (senha === '......') {
            appState.setUserType('professor');
            initProfessorUI();
            toast('👨‍🏫 Bem-vindo, Professor!');
        } else if (senha === null) {
            // Cancelou
        } else {
            toast('❌ Senha incorreta!');
        }
    });

    // Botão Aluno
    document.getElementById('btn-aluno')?.addEventListener('click', async () => {
        const data = appState.data;
        if (!data) {
            toast('⏳ Aguardando dados do jogo...');
            return;
        }
        
        if (data.status !== 'em_andamento' || Date.now() >= data.fim) {
            toast('⏳ A fase não foi iniciada ou já terminou.');
            return;
        }
        
        // Solicitar nome
        const nome = prompt('👤 Digite seu nome completo:');
        if (!nome || !nome.trim()) return;
        
        const nomeTrim = nome.trim();
        
        // Carregar turmas
        const turmas = await carregarTurmas();
        if (!turmas || turmas.length === 0) {
            toast('❌ Nenhuma turma cadastrada. Aguarde o professor.');
            return;
        }
        
        // Mostrar modal de seleção de turma
        mostrarModalTurma(nomeTrim, turmas);
    });

    // Botão Torcida
    document.getElementById('btn-projecao')?.addEventListener('click', () => {
        appState.setUserType('projecao');
        initTorcidaUI();
        toast('📺 Bem-vindo à Torcida!');
    });
}

// ========== MOSTRAR MODAL DE TURMA ==========
function mostrarModalTurma(nome, turmas) {
    // Remover modal existente
    const modalExistente = document.querySelector('.modal-turma');
    if (modalExistente) modalExistente.remove();
    
    const modalDiv = document.createElement('div');
    modalDiv.className = 'modal-turma';
    modalDiv.innerHTML = `
        <h3>🏫 Selecione sua turma</h3>
        <p style="margin-bottom: 5px; color: #aaa;">Olá, ${escapeHtml(nome)}!</p>
        <select id="select-turma-aluno">
            ${turmas.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('')}
        </select>
        <div style="display: flex; gap: 10px; justify-content: center; margin-top: 10px;">
            <button id="btn-confirmar-turma" class="btn-success">✅ Confirmar</button>
            <button id="btn-cancelar-turma" class="btn-danger">❌ Cancelar</button>
        </div>
    `;
    document.body.appendChild(modalDiv);
    
    // Eventos
    document.getElementById('btn-confirmar-turma')?.addEventListener('click', () => {
        const select = document.getElementById('select-turma-aluno');
        if (select) {
            const turma = select.value;
            modalDiv.remove();
            finalizarLoginAluno(nome, turma);
        }
    });
    
    document.getElementById('btn-cancelar-turma')?.addEventListener('click', () => {
        modalDiv.remove();
    });
}

// ========== FINALIZAR LOGIN DO ALUNO ==========
async function finalizarLoginAluno(nome, turma) {
    const data = appState.data;
    if (!data) {
        toast('❌ Erro ao acessar dados do jogo.');
        return;
    }
    
    // Gerar ID único
    const alunoId = gerarIdAluno(nome, turma);
    
    // Verificar se está classificado (fases > 1)
    if (data.fase > 1 && !appState.isClassificado(data.fase, alunoId)) {
        alert('❌ Você NÃO foi classificado para esta fase.');
        return;
    }
    
    // Verificar se o aluno já existe em fases anteriores
    const participantesAtual = data.participantes?.[data.fase] || {};
    let dadosAluno = participantesAtual[alunoId];
    
    if (!dadosAluno && data.fase > 1) {
        // Buscar em fases anteriores
        for (let f = data.fase - 1; f >= 1; f--) {
            if (data.participantes?.[f]?.[alunoId]) {
                dadosAluno = data.participantes[f][alunoId];
                break;
            }
        }
    }
    
    if (!dadosAluno) {
        dadosAluno = { nome, turma };
    }
    
    // Salvar participante na fase atual
    await adicionarParticipante(data.fase, alunoId, dadosAluno);
    
    // Iniciar UI do aluno
    appState.setUserType('aluno');
    appState.setAlunoData(alunoId, nome, turma);
    
    // Inicializar interface do aluno
    initAlunoUI(alunoId, nome, turma);
    
    toast(`👋 Bem-vindo, ${nome}!`);
}

// ========== INICIAR QUANDO O DOM ESTIVER PRONTO ==========
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar módulos que precisam de carregamento imediato
    soundManager.initAudio();
    confettiManager.carregarBiblioteca();
    gamepadManager.init();
    
    // Iniciar o jogo
    init();
});

// ========== EXPORTAR PARA USO GLOBAL ==========
export { init };
