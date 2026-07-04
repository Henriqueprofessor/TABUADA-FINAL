// js/main.js
import { db, auth, initConnectionMonitor, onConnectionChange, recriarPresencaOnline } from './config/firebase.js';
import { state } from './modules/state.js';
import { loginProfessor, logoutProfessor, getCurrentUser, onAuthStateChanged } from './modules/auth.js';
import { carregarEstado, atualizarDados, setDados, removerDados, lerDados, ouvirOnline } from './modules/db.js';
import { mostrarTela, exibirToast, abrirModal, fecharModal, atualizarTimerFase, initConnectionUI, exibirToastReconexao } from './modules/ui.js';
import { iniciarPartida } from './modules/game.js';
import { 
  renderizarRanking, 
  atualizarInfoAluno, 
  renderizarRankingPontos,
  renderRankingGeral,
  atualizarRankingAluno,
  avancarFase,
  resetarFase,
  renderListaAlunosGerenciar,
  renderListaTurmas,
  renderizarConfigMinPartidas,
  renderizarColunasVisiveis
} from './modules/ranking.js';
import { inicializarSons, renderizarPainelSom } from './modules/sound.js';
import { abrirTutorial, fecharTutorial } from './modules/tutorial.js';
import {
  carregarValorPartida,
  carregarConfigRankingPontos,
  carregarConfigBonusVelocidade,
  carregarRecordeGeral,
  carregarColunasVisiveis,
  carregarMinPartidas,
  carregarIntervaloIndividual,
  carregarIntervaloEquipes,
  salvarMinPartidas,
  salvarColunasVisiveis,
  salvarConfigRankingPontos,
  salvarValorPartida,
  adicionarTurma,
  removerTurma
} from './modules/config.js';
import { verificarVersao, iniciarListenerVersao } from './modules/version.js';
import { abrirInstalacao } from './modules/install.js';

// ============================================================
// INICIALIZAÇÃO
// ============================================================
async function init() {
  // === INICIAR MONITOR DE CONEXÃO E BADGE (item 1) ===
  initConnectionMonitor();
  initConnectionUI(onConnectionChange);

  // === TRATAMENTO DE RECONEXÃO (item 2) ===
  onConnectionChange(async (online) => {
    if (online) {
      if (!window._wasOnline) {
        window._wasOnline = true;
        return;
      }
      console.log('🔄 Reconectado ao Firebase! Recarregando dados...');
      exibirToastReconexao();

      try {
        const snap = await db.ref('copaV2').once('value');
        state.estadoAtual = snap.val() || state.estadoAtual;
        atualizarUI();
      } catch (e) {
        console.warn('Erro ao recarregar estado na reconexão:', e);
      }

      if (state.meuTipo === 'professor' && auth.currentUser) {
        const uid = auth.currentUser.uid || 'professor';
        recriarPresencaOnline(uid, 'professor');
      } else if (state.meuTipo === 'aluno' && state.alunoId) {
        recriarPresencaOnline(state.alunoId, 'aluno');
      } else if (state.meuTipo === 'projecao' && state.torcidaId) {
        recriarPresencaOnline(state.torcidaId, 'torcida');
      }

      if (state.meuTipo === 'professor') {
        const fase = parseInt(document.getElementById('select-fase-ranking')?.value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
        renderListaAlunosGerenciar();
        renderListaTurmas();
      } else if (state.meuTipo === 'aluno') {
        if (!state.jogoAtivo) {
          atualizarInfoAluno();
          if (document.getElementById('modal-ranking-aluno').style.display === 'flex') {
            atualizarRankingAluno();
          }
        }
      } else if (state.meuTipo === 'projecao') {
        if (state.abaTorcidaAtiva === 'fase') {
          if (state.modoTorcida === 'individual') atualizarTorcidaIndividual();
          else atualizarTorcidaEquipes();
        } else {
          atualizarTorcidaPontos();
        }
      }
      atualizarUltimaSinc();
    } else {
      window._wasOnline = false;
    }
  });

  // Carregar configurações
  await carregarValorPartida();
  await carregarConfigRankingPontos();
  await carregarConfigBonusVelocidade();
  await carregarRecordeGeral();
  await carregarColunasVisiveis();
  await carregarMinPartidas();

  // === CARREGAR INTERVALOS DO FIREBASE (item 3) ===
  await carregarIntervaloIndividual();
  await carregarIntervaloEquipes();

  // Sons
  inicializarSons();

  // Versão
  setTimeout(() => verificarVersao(false), 2000);
  iniciarListenerVersao();

  // Listeners Firebase
  carregarEstado((estado) => {
    atualizarUI();
    popularSelectFases();
    popularSelectFasesTorcida();

    if (state.meuTipo === 'projecao') {
      if (state.abaTorcidaAtiva === 'fase') {
        if (state.modoTorcida === 'individual') atualizarTorcidaIndividual();
        else atualizarTorcidaEquipes();
      } else {
        atualizarTorcidaPontos();
      }
    }

    if (state.meuTipo === 'professor') {
      const tabFase = document.getElementById('tab-ranking-fase');
      if (tabFase && !tabFase.classList.contains('hidden')) {
        const fase = parseInt(document.getElementById('select-fase-ranking').value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
      }
    }
    atualizarUltimaSinc();
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
  popularSelectFases();
  popularSelectFasesTorcida();
  iniciarRelogio();
  atualizarUltimaSinc();
}

// ============================================================
// RELÓGIO EM TEMPO REAL
// ============================================================
function iniciarRelogio() {
  function atualizarRelogio() {
    const clock = document.getElementById('clock-display');
    if (clock) {
      const agora = new Date();
      clock.innerText = agora.toLocaleTimeString('pt-BR');
    }
  }
  atualizarRelogio();
  setInterval(atualizarRelogio, 1000);
}

// ============================================================
// ATUALIZAR ÚLTIMA SINCRONIZAÇÃO
// ============================================================
function atualizarUltimaSinc() {
  const span = document.getElementById('last-sync-time');
  if (span) {
    const agora = new Date();
    span.innerText = agora.toLocaleString('pt-BR');
  }
  const torcidaUpdate = document.getElementById('torcida-last-update');
  if (torcidaUpdate) {
    const agora = new Date();
    torcidaUpdate.innerText = agora.toLocaleTimeString('pt-BR');
  }
}

// ============================================================
// ATUALIZAÇÃO DA UI
// ============================================================
function atualizarUI() {
  if (!state.estadoAtual) return;
  const fase = state.estadoAtual.fase;
  document.getElementById('fase-atual-titulo').innerText = `Fase ${fase} de 5`;
  const configs = { "2-5": "Tabuada 2️⃣➡️5️⃣", "6-9": "Tabuada 6️⃣➡️9️⃣", "0-10": "Tabuada 0️⃣➡️🔟" };
  document.getElementById('modalidade-titulo').innerText = configs[state.estadoAtual.modalidade] || state.estadoAtual.modalidade;
  if (state.estadoAtual.status === 'em_andamento' && state.estadoAtual.fim > 0) {
    const restante = state.estadoAtual.fim - Date.now();
    if (restante > 0) atualizarTimerFase(restante);
  }
  if (state.meuTipo === 'professor') {
    document.getElementById('prof-fase-info').innerText = `Fase ${fase}`;
    document.getElementById('select-modalidade').value = state.estadoAtual.modalidade;
    const hasResults = Object.keys(state.estadoAtual.resultados).some(f => Object.keys(state.estadoAtual.resultados[f] || {}).length > 0);
    document.getElementById('select-modalidade').disabled = (fase > 1 || hasResults);
  }
  if (state.meuTipo === 'projecao') {
    document.getElementById('torcida-modalidade').innerText = configs[state.estadoAtual.modalidade] || state.estadoAtual.modalidade;
    document.getElementById('torcida-fase-info').innerText = `${fase}/5`;
    if (fase === 5 && state.estadoAtual.status === 'finalizado') {
      document.getElementById('competicao-finalizada-torcida').classList.remove('hidden');
    } else {
      document.getElementById('competicao-finalizada-torcida').classList.add('hidden');
    }
  }
}

function atualizarOnline(snap) {
  let total = 0;
  snap.forEach(() => total++);
  document.getElementById('jogadores-online').innerText = total;
  if (state.meuTipo === 'professor') {
    document.getElementById('prof-online-count').innerText = total;
  }
}

// ============================================================
// POPULAR SELECTORES DE FASES
// ============================================================
function popularSelectFases() {
  const select = document.getElementById('select-fase-ranking');
  if (!select) return;
  let options = '';
  for (let i = 1; i <= 5; i++) options += `<option value="${i}">Fase ${i}</option>`;
  select.innerHTML = options;
  if (state.estadoAtual) select.value = state.estadoAtual.fase;
  select.removeEventListener('change', onSelectFaseProfessorChange);
  select.addEventListener('change', onSelectFaseProfessorChange);
}

function onSelectFaseProfessorChange() {
  if (state.meuTipo !== 'professor') return;
  const fase = parseInt(document.getElementById('select-fase-ranking').value);
  if (!isNaN(fase) && fase >= 1 && fase <= 5) {
    renderizarRanking(fase, 'ranking-parcial', 'individual', true);
  }
}

function popularSelectFasesTorcida() {
  const select = document.getElementById('select-fase-torcida');
  if (!select) return;
  let options = '';
  for (let i = 1; i <= 5; i++) options += `<option value="${i}">Fase ${i}</option>`;
  select.innerHTML = options;
  if (state.estadoAtual) select.value = state.estadoAtual.fase;
  select.removeEventListener('change', onSelectFaseTorcidaChange);
  select.addEventListener('change', onSelectFaseTorcidaChange);
}

function onSelectFaseTorcidaChange() {
  if (state.meuTipo !== 'projecao' || state.modoTorcida !== 'individual' || state.abaTorcidaAtiva !== 'fase') return;
  const fase = parseInt(document.getElementById('select-fase-torcida').value);
  if (!isNaN(fase) && fase >= 1 && fase <= 5) {
    state.faseTorcidaSelecionada = fase;
    atualizarTorcidaIndividual();
  }
}

// ============================================================
// FUNÇÕES DA TORCIDA
// ============================================================
async function atualizarTorcidaIndividual() {
  if (state.meuTipo !== 'projecao' || state.abaTorcidaAtiva !== 'fase' || state.modoTorcida !== 'individual') return;
  if (!state.estadoAtual) return;
  let fase = parseInt(document.getElementById('select-fase-torcida').value);
  if (isNaN(fase) || fase < 1 || fase > 5) fase = state.estadoAtual.fase;
  state.faseTorcidaSelecionada = fase;
  await renderizarRanking(fase, 'ranking-torcida-container', 'individual', true);
  const infoSpan = document.getElementById('fase-torcida-info');
  if (infoSpan) infoSpan.innerText = (fase === state.estadoAtual.fase) ? '(Fase atual)' : '(Fase anterior)';
}

async function atualizarTorcidaEquipes() {
  if (state.meuTipo !== 'projecao' || state.abaTorcidaAtiva !== 'fase' || state.modoTorcida !== 'equipes') return;
  if (!state.estadoAtual) return;
  await renderizarRanking(null, 'ranking-torcida-container', 'turmas', false);
}

async function atualizarTorcidaPontos() {
  if (state.meuTipo !== 'projecao' || state.abaTorcidaAtiva !== 'pontos') return;
  if (!state.estadoAtual) return;
  await renderizarRankingPontos('ranking-torcida-container');
}

function iniciarAtualizacaoTorcida() {
  if (state.intervaloTorcidaIndividual) clearInterval(state.intervaloTorcidaIndividual);
  if (state.intervaloTorcidaEquipes) clearInterval(state.intervaloTorcidaEquipes);
  
  state.intervaloTorcidaIndividual = setInterval(() => {
    if (state.meuTipo === 'projecao' && state.abaTorcidaAtiva === 'fase' && state.modoTorcida === 'individual') {
      atualizarTorcidaIndividual();
    } else if (state.meuTipo === 'projecao' && state.abaTorcidaAtiva === 'pontos') {
      atualizarTorcidaPontos();
    }
  }, state.intervaloIndividualSegundos * 1000);

  state.intervaloTorcidaEquipes = setInterval(() => {
    if (state.meuTipo === 'projecao' && state.abaTorcidaAtiva === 'fase' && state.modoTorcida === 'equipes') {
      atualizarTorcidaEquipes();
    }
  }, state.intervaloEquipesSegundos * 1000);

  document.getElementById('torcida-individual-intervalo').innerText = state.intervaloIndividualSegundos;
  document.getElementById('torcida-equipes-intervalo').innerText = state.intervaloEquipesSegundos;

  popularSelectFasesTorcida();
  state.abaTorcidaAtiva = 'fase';
  document.getElementById('btn-torcida-sub-fase').classList.add('ativo');
  document.getElementById('btn-torcida-sub-pontos').classList.remove('ativo');
  document.getElementById('torcida-fase-selector').style.display = 'block';
  if (state.modoTorcida === 'individual') atualizarTorcidaIndividual();
  else atualizarTorcidaEquipes();
}

function pararAtualizacaoTorcida() {
  if (state.intervaloTorcidaIndividual) clearInterval(state.intervaloTorcidaIndividual);
  if (state.intervaloTorcidaEquipes) clearInterval(state.intervaloTorcidaEquipes);
  state.intervaloTorcidaIndividual = null;
  state.intervaloTorcidaEquipes = null;
}

// ============================================================
// MODO PROFESSOR
// ============================================================
function entrarModoProfessor() {
  state.meuTipo = 'professor';
  mostrarTela('professor');
  if (state.intervaloRankingProfessor) clearInterval(state.intervaloRankingProfessor);
  state.intervaloRankingProfessor = setInterval(() => {
    if (state.meuTipo === 'professor' && state.atualizacaoRankingAuto) {
      const fase = parseInt(document.getElementById('select-fase-ranking').value) || state.estadoAtual?.fase || 1;
      renderizarRanking(fase, 'ranking-parcial', 'individual', true);
    }
  }, state.intervaloIndividualSegundos * 1000);
  exibirToast('👨‍🏫 Bem-vindo, Professor!');
  document.querySelector('.tab-btn[data-tab="controle"]')?.click();
  popularSelectFases();
}

// ============================================================
// CONFIGURAÇÃO DE EVENTOS
// ============================================================
function configurarEventos() {
  document.getElementById('btn-verificar-versao')?.addEventListener('click', () => verificarVersao(true));
  document.getElementById('btn-tutorial-inicial')?.addEventListener('click', () => abrirTutorial('aluno'));
  document.getElementById('btn-tutorial-aluno')?.addEventListener('click', () => abrirTutorial('aluno'));
  document.getElementById('btn-tutorial-torcida')?.addEventListener('click', () => abrirTutorial('torcida'));
  document.getElementById('btn-fechar-tutorial')?.addEventListener('click', fecharTutorial);
  document.getElementById('btn-instalar-app')?.addEventListener('click', abrirInstalacao);

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
  document.getElementById('btn-voltar-menu-prof')?.addEventListener('click', () => location.reload());

  document.getElementById('btn-aluno')?.addEventListener('click', async () => {
    if (!state.estadoAtual || state.estadoAtual.status !== 'em_andamento' || Date.now() >= state.estadoAtual.fim) {
      exibirToast('⏳ A fase não foi iniciada ou já terminou.');
      return;
    }
    exibirToast('🔧 Função de aluno em desenvolvimento.');
  });

  document.getElementById('btn-projecao')?.addEventListener('click', () => {
    state.torcidaId = 'torcida_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    const torcidaRef = db.ref(`online/${state.torcidaId}`);
    torcidaRef.set({ tipo: 'torcida', timestamp: Date.now() });
    torcidaRef.onDisconnect().remove();
    sessionStorage.setItem('torcidaId', state.torcidaId);

    state.meuTipo = 'projecao';
    mostrarTela('projecao');
    state.abaTorcidaAtiva = 'fase';
    state.modoTorcida = 'individual';
    document.getElementById('btn-modo-individual').classList.add('ativo');
    document.getElementById('btn-modo-equipes').classList.remove('ativo');
    document.getElementById('btn-torcida-sub-fase').classList.add('ativo');
    document.getElementById('btn-torcida-sub-pontos').classList.remove('ativo');
    document.getElementById('torcida-fase-selector').style.display = 'block';
    iniciarAtualizacaoTorcida();
    exibirToast('📺 Modo Torcida ativado!');
  });

  document.getElementById('btn-modo-individual')?.addEventListener('click', function() {
    state.modoTorcida = 'individual';
    this.classList.add('ativo');
    document.getElementById('btn-modo-equipes').classList.remove('ativo');
    document.getElementById('torcida-fase-selector').style.display = 'block';
    if (state.abaTorcidaAtiva === 'fase') atualizarTorcidaIndividual();
  });
  document.getElementById('btn-modo-equipes')?.addEventListener('click', function() {
    state.modoTorcida = 'equipes';
    this.classList.add('ativo');
    document.getElementById('btn-modo-individual').classList.remove('ativo');
    document.getElementById('torcida-fase-selector').style.display = 'none';
    if (state.abaTorcidaAtiva === 'fase') atualizarTorcidaEquipes();
  });

  document.getElementById('btn-torcida-sub-fase')?.addEventListener('click', function() {
    this.classList.add('ativo');
    document.getElementById('btn-torcida-sub-pontos').classList.remove('ativo');
    state.abaTorcidaAtiva = 'fase';
    document.getElementById('torcida-fase-selector').style.display = 'block';
    if (state.modoTorcida === 'individual') atualizarTorcidaIndividual();
    else atualizarTorcidaEquipes();
  });
  document.getElementById('btn-torcida-sub-pontos')?.addEventListener('click', async function() {
    this.classList.add('ativo');
    document.getElementById('btn-torcida-sub-fase').classList.remove('ativo');
    state.abaTorcidaAtiva = 'pontos';
    document.getElementById('torcida-fase-selector').style.display = 'none';
    await atualizarTorcidaPontos();
  });

  document.getElementById('btn-sair-torcida')?.addEventListener('click', () => {
    if (state.torcidaId) {
      db.ref(`online/${state.torcidaId}`).remove();
      sessionStorage.removeItem('torcidaId');
    }
    pararAtualizacaoTorcida();
    location.reload();
  });
  document.getElementById('btn-sync-torcida')?.addEventListener('click', () => {
    if (state.abaTorcidaAtiva === 'fase') {
      if (state.modoTorcida === 'individual') atualizarTorcidaIndividual();
      else atualizarTorcidaEquipes();
    } else {
      atualizarTorcidaPontos();
    }
    atualizarUltimaSinc();
    exibirToast('🔄 Sincronizado!');
  });

  document.getElementById('btn-ranking-aluno')?.addEventListener('click', () => {
    abrirModal('modal-ranking-aluno');
    if (state.intervaloRankingAluno) clearInterval(state.intervaloRankingAluno);
    state.intervaloRankingAluno = setInterval(() => {
      if (document.getElementById('modal-ranking-aluno').style.display === 'flex' && !state.jogoAtivo) {
        atualizarRankingAluno();
      }
    }, state.intervaloIndividualSegundos * 1000);
  });
  document.getElementById('btn-ranking-pontos-aluno')?.addEventListener('click', () => {
    abrirModal('modal-ranking-aluno');
    document.querySelector('.modal-sub-tabs .sub-tab[data-subtab="pontos"]')?.click();
  });
  document.getElementById('btn-fechar-modal-ranking')?.addEventListener('click', () => {
    fecharModal('modal-ranking-aluno');
    if (state.intervaloRankingAluno) clearInterval(state.intervaloRankingAluno);
  });
  document.getElementById('btn-sair-modal-ranking')?.addEventListener('click', () => {
    fecharModal('modal-ranking-aluno');
    if (state.alunoId) db.ref(`online/${state.alunoId}`).remove();
    location.reload();
  });

  document.getElementById('btn-iniciar-partida')?.addEventListener('click', iniciarPartida);
  document.getElementById('btn-sair-aluno')?.addEventListener('click', () => {
    if (state.alunoId) db.ref(`online/${state.alunoId}`).remove();
    location.reload();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`tab-${tab}`).classList.remove('hidden');
      
      if (tab === 'ranking-geral') renderRankingGeral();
      if (tab === 'ranking-fase') {
        popularSelectFases();
        const fase = parseInt(document.getElementById('select-fase-ranking').value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
      }
      if (tab === 'ranking-turmas') {
        renderizarRanking(null, 'ranking-turmas-container', 'turmas', false);
      }
      if (tab === 'ranking-pontos') renderizarRankingPontos();
      if (tab === 'gerenciar-alunos') renderListaAlunosGerenciar();
      if (tab === 'gerenciar-turmas') renderListaTurmas();
      if (tab === 'configuracoes') {
        carregarMinPartidas().then(config => renderizarConfigMinPartidas(config));
        renderizarColunasVisiveis();
        renderizarPainelSom();
      }
    });
  });

  document.getElementById('btn-sincronizar-global')?.addEventListener('click', () => {
    db.ref('copaV2').once('value', snap => {
      state.estadoAtual = snap.val() || state.estadoAtual;
      atualizarUI();
      if (state.meuTipo === 'professor') {
        const fase = parseInt(document.getElementById('select-fase-ranking').value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
      }
      atualizarUltimaSinc();
      exibirToast('✅ Dados sincronizados!');
    });
  });

  document.getElementById('btn-sync-prof')?.addEventListener('click', () => {
    atualizarUltimaSinc();
    exibirToast('🔄 Sincronizado!');
  });

  document.getElementById('btn-iniciar-fase')?.addEventListener('click', async () => {
    if (!state.estadoAtual) return;
    const duracao = state.estadoAtual.tempoFase || 10;
    const fim = Date.now() + duracao * 60000;
    await setDados('copaV2', { ...state.estadoAtual, status: 'em_andamento', fim, tempoRestantePausa: null });
    atualizarUltimaSinc();
    exibirToast('▶️ Fase iniciada!');
  });

  document.getElementById('btn-continuar-parar-fase')?.addEventListener('click', async () => {
    if (state.estadoAtual?.status === 'em_andamento') {
      if (state.timerFase) clearInterval(state.timerFase);
      const agora = Date.now();
      const tempoRestante = Math.max(0, state.estadoAtual.fim - agora);
      await setDados('copaV2', { ...state.estadoAtual, status: 'pausado', tempoRestantePausa: tempoRestante, fim: 0 });
      atualizarUltimaSinc();
      exibirToast('⏸️ Fase pausada.');
    } else if (state.estadoAtual?.status === 'pausado') {
      const tempoRestante = state.estadoAtual.tempoRestantePausa || 0;
      if (tempoRestante <= 0) { exibirToast('⚠️ Tempo esgotado.'); return; }
      const novoFim = Date.now() + tempoRestante;
      await setDados('copaV2', { ...state.estadoAtual, status: 'em_andamento', fim: novoFim, tempoRestantePausa: null });
      atualizarUltimaSinc();
      exibirToast('▶️ Fase retomada!');
    }
  });

  document.getElementById('btn-avancar-fase')?.addEventListener('click', async () => {
    if (confirm('Finalizar fase?')) {
      await avancarFase();
      atualizarUltimaSinc();
    }
  });

  document.getElementById('btn-reset-fase')?.addEventListener('click', async () => {
    if (confirm('Resetar fase atual?')) {
      await resetarFase();
      atualizarUltimaSinc();
    }
  });

  document.getElementById('btn-reset-total')?.addEventListener('click', async () => {
    if (confirm('Resetar toda a competição?')) {
      await setDados('copaV2', { fase:1, status:'aguardando', tempoFase:10, fim:0, modalidade: state.estadoAtual?.modalidade || "2-5", resultados:{}, participantes:{}, classificados:{} });
      await removerDados('online');
      atualizarUltimaSinc();
      location.reload();
    }
  });

  document.getElementById('btn-salvar-tempo')?.addEventListener('click', async () => {
    const t = parseInt(document.getElementById('input-tempo-fase').value);
    if (t > 0) {
      await atualizarDados('copaV2/tempoFase', t);
      atualizarUltimaSinc();
    }
  });

  document.getElementById('btn-adicionar-tempo-extra')?.addEventListener('click', async () => {
    if (state.estadoAtual?.status !== 'em_andamento') { exibirToast('⚠️ Fase não está em andamento.'); return; }
    const extra = parseInt(document.getElementById('input-tempo-extra').value);
    if (isNaN(extra) || extra < 1) { exibirToast('❌ Digite um valor válido.'); return; }
    const agora = Date.now();
    const novoFim = Math.max(agora + 1000, state.estadoAtual.fim) + extra * 60000;
    await atualizarDados('copaV2/fim', novoFim);
    atualizarUltimaSinc();
    exibirToast(`✅ ${extra} minuto(s) adicionado(s)!`);
  });

  document.getElementById('btn-atualizar-intervalo-individual')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('intervalo-individual').value);
    if (val >= 1) {
      state.intervaloIndividualSegundos = val;
      atualizarDados('copaV2/configuracoes/intervalos/individual', val);
      atualizarUltimaSinc();
      exibirToast(`✅ Intervalo individual: ${val}s`);
    }
  });
  document.getElementById('btn-atualizar-intervalo-equipes')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('intervalo-equipes').value);
    if (val >= 1) {
      state.intervaloEquipesSegundos = val;
      atualizarDados('copaV2/configuracoes/intervalos/equipes', val);
      atualizarUltimaSinc();
      exibirToast(`✅ Intervalo equipes: ${val}s`);
    }
  });

  document.getElementById('btn-adicionar-turma')?.addEventListener('click', async () => {
    const nova = prompt('Digite o nome da nova turma:');
    if (nova && nova.trim()) {
      await adicionarTurma(nova.trim());
      renderListaTurmas();
      atualizarUltimaSinc();
    }
  });

  document.getElementById('btn-salvar-min-partidas')?.addEventListener('click', async () => {
    await salvarMinPartidas();
    atualizarUltimaSinc();
  });

  document.getElementById('btn-salvar-colunas')?.addEventListener('click', async () => {
    await salvarColunasVisiveis();
    atualizarUltimaSinc();
  });

  document.getElementById('btn-restaurar-colunas')?.addEventListener('click', async () => {
    const config = {};
    ['futPos','pontuacaoAtual','deltaLider','velocRecorde','progresso','partidas','tempo','mediaTempo','turma','projecaoPontos'].forEach(id => {
      config[id] = true;
    });
    await db.ref('copaV2/configuracoes/colunasVisiveis').set(config);
    state.colunasVisiveis = config;
    renderizarColunasVisiveis();
    atualizarUltimaSinc();
    exibirToast('✅ Colunas restauradas para o padrão (todas visíveis)');
  });

  document.getElementById('toggle-ranking-pontos')?.addEventListener('change', async function() {
    const ativo = this.checked;
    document.getElementById('status-ranking-pontos').innerText = ativo ? '✅ Ativado' : '❌ Desativado';
    document.getElementById('status-ranking-pontos').style.color = ativo ? '#4ade80' : '#f87171';
    await salvarConfigRankingPontos(ativo, state.tabelaPontosPadrao, state.tabelaPontosFase5);
    atualizarUltimaSinc();
    if (state.meuTipo === 'professor') renderizarRankingPontos();
    if (state.meuTipo === 'projecao') {
      if (state.abaTorcidaAtiva === 'fase') {
        if (state.modoTorcida === 'individual') atualizarTorcidaIndividual();
        else atualizarTorcidaEquipes();
      } else {
        atualizarTorcidaPontos();
      }
    }
    if (state.meuTipo === 'aluno' && document.getElementById('modal-ranking-aluno').style.display === 'flex') {
      atualizarRankingAluno();
    }
  });

  document.getElementById('btn-salvar-pontuacao')?.addEventListener('click', async function() {
    const textPadrao = document.getElementById('textarea-pontos-padrao').value;
    const textFase5 = document.getElementById('textarea-pontos-fase5').value;
    const objPadrao = parsePontuacaoText(textPadrao);
    const objFase5 = parsePontuacaoText(textFase5);
    if (Object.keys(objPadrao).length === 0) {
      exibirToast('❌ Tabela para Fases 1-4 vazia ou inválida.');
      return;
    }
    if (Object.keys(objFase5).length === 0) {
      exibirToast('❌ Tabela para Fase 5 vazia ou inválida.');
      return;
    }
    const ativo = document.getElementById('toggle-ranking-pontos').checked;
    await salvarConfigRankingPontos(ativo, objPadrao, objFase5);
    document.getElementById('textarea-pontos-padrao').value = formatPontuacaoText(objPadrao);
    document.getElementById('textarea-pontos-fase5').value = formatPontuacaoText(objFase5);
    atualizarUltimaSinc();
  });

  document.getElementById('btn-restaurar-padrao')?.addEventListener('click', function() {
    document.getElementById('textarea-pontos-padrao').value = formatPontuacaoText(getPontuacaoDefault());
    exibirToast('Padrão restaurado para Fases 1-4');
  });
  document.getElementById('btn-restaurar-padrao-fase5')?.addEventListener('click', function() {
    document.getElementById('textarea-pontos-fase5').value = formatPontuacaoText(getPontuacaoDefault());
    exibirToast('Padrão restaurado para Fase 5');
  });

  document.getElementById('btn-salvar-bonus-velocidade')?.addEventListener('click', async function() {
    const ativo = document.getElementById('toggle-bonus-velocidade').checked;
    const pontos = parseInt(document.getElementById('input-bonus-velocidade').value) || 1;
    const precisaoMinima = parseInt(document.getElementById('input-precisao-bonus').value) || 80;
    if (pontos < 1) { exibirToast('❌ Pontos do bônus devem ser no mínimo 1.'); return; }
    if (precisaoMinima < 50 || precisaoMinima > 100) { exibirToast('❌ Precisão mínima deve estar entre 50% e 100%.'); return; }
    await salvarConfigBonusVelocidade(ativo, pontos, precisaoMinima);
    document.getElementById('feedback-bonus-velocidade').style.display = 'block';
    document.getElementById('feedback-bonus-velocidade').className = 'feedback-sucesso';
    document.getElementById('feedback-bonus-velocidade').textContent = '✅ Configuração de bônus salva!';
    atualizarUltimaSinc();
    setTimeout(() => document.getElementById('feedback-bonus-velocidade').style.display = 'none', 5000);
  });

  document.getElementById('btn-atualizar-valor-partida')?.addEventListener('click', async function() {
    const novoValor = parseInt(document.getElementById('input-valor-partida').value);
    if (!novoValor || novoValor < 1) { exibirToast('❌ Digite um valor válido maior que 0.'); return; }
    await salvarValorPartida(novoValor);
    document.getElementById('valor-partida-atual').textContent = novoValor;
    document.getElementById('feedback-valor-partida').style.display = 'block';
    document.getElementById('feedback-valor-partida').className = 'feedback-sucesso';
    document.getElementById('feedback-valor-partida').textContent = `✅ Valor da partida atualizado para ${novoValor} pontos!`;
    atualizarUltimaSinc();
    setTimeout(() => document.getElementById('feedback-valor-partida').style.display = 'none', 5000);
  });

  document.getElementById('btn-gerar-senha')?.addEventListener('click', () => {
    if (state.senhaBloqueada) { exibirToast('❌ Senha bloqueada após iniciar a fase.'); return; }
    const num = Math.floor(Math.random() * 90) + 10;
    document.getElementById('input-senha-fase1').value = num;
    exibirToast(`🎲 Senha gerada: ${num}`);
  });
  document.getElementById('btn-salvar-senha')?.addEventListener('click', async () => {
    if (state.senhaBloqueada) { exibirToast('❌ Senha bloqueada após iniciar a fase.'); return; }
    const senha = document.getElementById('input-senha-fase1').value.trim();
    if (!/^\d{2}$/.test(senha)) { exibirToast('❌ Digite uma senha de 2 dígitos (ex: 42).'); return; }
    const exigir = document.getElementById('toggle-exigir-senha').checked;
    await db.ref('copaV2/configuracoes/senhaFase1').set(senha);
    await db.ref('copaV2/configuracoes/exigirSenhaFase1').set(exigir);
    atualizarUltimaSinc();
    exibirToast('✅ Senha salva!');
  });
  document.getElementById('toggle-exigir-senha')?.addEventListener('change', () => {
    if (!state.senhaBloqueada) {
      document.getElementById('btn-salvar-senha').click();
    } else {
      document.getElementById('toggle-exigir-senha').checked = true;
      exibirToast('❌ Não é possível alterar após iniciar a fase.');
    }
  });

  document.getElementById('btn-liberar-aluno')?.addEventListener('click', async () => {
    const nome = document.getElementById('input-liberar-nome').value.trim();
    const turma = document.getElementById('input-liberar-turma').value.trim();
    if (!nome || !turma) { exibirToast('❌ Preencha nome e turma.'); return; }
    const faseAtual = state.estadoAtual.fase;
    let idEncontrado = null;
    for (let f = 1; f <= faseAtual; f++) {
      const participantes = await lerDados(`copaV2/participantes/${f}`) || {};
      for (const [id, dados] of Object.entries(participantes)) {
        if (dados.nome === nome && dados.turma === turma) {
          idEncontrado = id;
          break;
        }
      }
      if (idEncontrado) break;
    }
    if (!idEncontrado) { exibirToast('❌ Aluno não encontrado. Verifique nome e turma.'); return; }
    await atualizarDados(`copaV2/participantes/${faseAtual}/${idEncontrado}`, { liberado: true });
    exibirToast(`✅ ${nome} liberado para a Fase ${faseAtual}!`);
    atualizarListaLiberados();
    atualizarUltimaSinc();
  });
}

// ============================================================
// FUNÇÕES AUXILIARES PARA PONTUAÇÃO
// ============================================================
function getPontuacaoDefault() {
  const obj = {};
  for (let i = 1; i <= 40; i++) obj[i] = 41 - i;
  return obj;
}

function parsePontuacaoText(text) {
  const obj = {};
  const pairs = text.split(',').map(s => s.trim());
  for (const pair of pairs) {
    const parts = pair.split(':').map(s => s.trim());
    if (parts.length === 2) {
      const pos = parseInt(parts[0]);
      const pts = parseInt(parts[1]);
      if (!isNaN(pos) && !isNaN(pts) && pos > 0 && pts >= 0) {
        obj[pos] = pts;
      }
    }
  }
  return obj;
}

function formatPontuacaoText(obj) {
  const keys = Object.keys(obj).map(Number).sort((a,b) => a - b);
  return keys.map(k => `${k}:${obj[k]}`).join(', ');
}

// ============================================================
// ATUALIZAR LISTA DE LIBERADOS
// ============================================================
async function atualizarListaLiberados() {
  const container = document.getElementById('lista-liberados');
  if (!container) return;
  const faseAtual = state.estadoAtual?.fase || 1;
  const participantes = await lerDados(`copaV2/participantes/${faseAtual}`) || {};
  let liberados = [];
  for (const [id, dados] of Object.entries(participantes)) {
    if (dados.liberado === true) {
      liberados.push(`${dados.nome} (${dados.turma})`);
    }
  }
  if (liberados.length === 0) {
    container.innerText = 'Nenhum aluno liberado.';
    container.style.color = '#94a3b8';
  } else {
    container.innerText = liberados.join(', ');
    container.style.color = '#4ade80';
  }
}

// ============================================================
// INICIAR
// ============================================================
document.addEventListener('DOMContentLoaded', init);
