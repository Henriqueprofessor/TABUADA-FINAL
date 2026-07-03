import { db, auth } from './config/firebase.js';
import { state } from './modules/state.js';
import { loginProfessor, logoutProfessor, getCurrentUser, onAuthStateChanged } from './modules/auth.js';
import { carregarEstado, atualizarDados, setDados, removerDados, lerDados, ouvirOnline } from './modules/db.js';
import { mostrarTela, exibirToast, abrirModal, fecharModal, atualizarTimerFase } from './modules/ui.js';
import { iniciarPartida } from './modules/game.js';
import { renderizarRanking, atualizarInfoAluno } from './modules/ranking.js';
import { inicializarSons, tocarSom } from './modules/sound.js';
import { abrirTutorial, fecharTutorial } from './modules/tutorial.js';
import { carregarConfigBonusVelocidade, carregarRecordeGeral, carregarValorPartida, carregarMinPartidas, carregarColunasVisiveis, carregarConfigRankingPontos } from './modules/config.js';
import { verificarVersao, iniciarListenerVersao } from './modules/version.js';
import { abrirInstalacao } from './modules/install.js';

// Inicialização
async function init() {
  // Carregar configurações
  await carregarValorPartida();
  await carregarConfigRankingPontos();
  await carregarConfigBonusVelocidade();
  await carregarRecordeGeral();
  await carregarColunasVisiveis();
  await carregarMinPartidas();

  // Sons
  inicializarSons();

  // Versão
  setTimeout(() => verificarVersao(false), 2000);
  iniciarListenerVersao();

  // Listeners Firebase
  carregarEstado((estado) => {
    atualizarUI();
    // Atualizar timer se necessário
  });

  ouvirOnline((snap) => {
    atualizarOnline(snap);
  });

  // Configurar eventos de botões
  configurarEventos();

  // Autenticação
  onAuthStateChanged((user) => {
    if (user) {
      console.log('Usuário logado:', user.email);
    } else {
      if (state.meuTipo === 'professor') {
        location.reload();
      }
    }
  });

  // Inicializar visibilidade
  mostrarTela('inicio');
}

function atualizarUI() {
  // Atualizar informações comuns (título, fase, timer, etc.)
  if (!state.estadoAtual) return;
  const fase = state.estadoAtual.fase;
  document.getElementById('fase-atual-titulo').innerText = `Fase ${fase} de 5`;
  // ... outras atualizações
}

function atualizarOnline(snap) {
  let total = 0;
  snap.forEach(() => total++);
  document.getElementById('jogadores-online').innerText = total;
}

function configurarEventos() {
  // Botões principais
  document.getElementById('btn-verificar-versao')?.addEventListener('click', () => verificarVersao(true));
  document.getElementById('btn-tutorial-inicial')?.addEventListener('click', () => abrirTutorial('aluno'));
  document.getElementById('btn-tutorial-aluno')?.addEventListener('click', () => abrirTutorial('aluno'));
  document.getElementById('btn-tutorial-torcida')?.addEventListener('click', () => abrirTutorial('torcida'));
  document.getElementById('btn-fechar-tutorial')?.addEventListener('click', fecharTutorial);
  document.getElementById('btn-instalar-app')?.addEventListener('click', abrirInstalacao);

  // Professor
  document.getElementById('btn-professor')?.addEventListener('click', () => {
    const user = getCurrentUser();
    if (user) entrarModoProfessor();
    else abrirModal('modalLoginProfessor');
  });
  document.getElementById('btnLoginProfessor')?.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    const result = await loginProfessor(email, senha);
    if (result.success) {
      fecharModal('modalLoginProfessor');
      entrarModoProfessor();
    } else {
      document.getElementById('loginErro').textContent = '❌ ' + result.message;
    }
  });
  document.getElementById('btnCancelarLogin')?.addEventListener('click', () => fecharModal('modalLoginProfessor'));
  document.getElementById('btn-logout-professor')?.addEventListener('click', async () => {
    if (confirm('Deseja realmente sair?')) {
      await logoutProfessor();
      exibirToast('👋 Até logo, Professor!');
      location.reload();
    }
  });

  // Aluno
  document.getElementById('btn-aluno')?.addEventListener('click', async () => {
    // lógica de login/cadastro do aluno (será implementada)
    exibirToast('🔧 Função em desenvolvimento');
  });

  // Torcida
  document.getElementById('btn-projecao')?.addEventListener('click', () => {
    // lógica de entrada na torcida
    exibirToast('📺 Modo Torcida ativado!');
    // ...
  });

  // Iniciar partida (aluno)
  document.getElementById('btn-iniciar-partida')?.addEventListener('click', iniciarPartida);

  // Modais
  document.getElementById('btn-fechar-modal-ranking')?.addEventListener('click', () => fecharModal('modal-ranking-aluno'));
  document.getElementById('btn-sair-modal-ranking')?.addEventListener('click', () => {
    fecharModal('modal-ranking-aluno');
    // sair do modo aluno
  });

  // Outros botões (sincronizar, etc.)
  document.getElementById('btn-sincronizar-global')?.addEventListener('click', () => {
    exibirToast('🔄 Sincronizado!');
  });

  // Ranking tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`tab-${tab}`).classList.remove('hidden');
      if (tab === 'ranking-geral') renderizarRanking(state.estadoAtual?.fase, 'ranking-geral-container');
      if (tab === 'ranking-fase') renderizarRanking(state.estadoAtual?.fase, 'ranking-parcial');
      // ...
    });
  });
}

function entrarModoProfessor() {
  state.meuTipo = 'professor';
  mostrarTela('professor');
  exibirToast('👨‍🏫 Bem-vindo, Professor!');
}

// Iniciar
document.addEventListener('DOMContentLoaded', init);
