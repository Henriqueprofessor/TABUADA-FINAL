// js/main.js
import { db, auth, initConnectionMonitor, onConnectionChange, recriarPresencaOnline } from './config/firebase.js';
import { state } from './modules/state.js';
import { loginProfessor, logoutProfessor, getCurrentUser, onAuthStateChanged } from './modules/auth.js';
import { carregarEstado, atualizarDados, setDados, removerDados, lerDados, ouvirOnline } from './modules/db.js';
import { mostrarTela, exibirToast, abrirModal, fecharModal, atualizarTimerFase, initConnectionUI, exibirToastReconexao, mostrarCarregando, esconderCarregando, exibirErroCarregamento } from './modules/ui.js';
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
  carregarConfigBonusVelocidade,
  carregarRecordeGeral,
  carregarValorPartida,
  carregarMinPartidas,
  carregarColunasVisiveis,
  carregarConfigRankingPontos,
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
  // === MOSTRAR OVERLAY DE CARREGAMENTO (item 4) ===
  mostrarCarregando();

  // === INICIAR MONITOR DE CONEXÃO E BADGE (item 1) ===
  initConnectionMonitor();
  initConnectionUI(onConnectionChange);

  // === TRATAMENTO DE RECONEXÃO (item 2) ===
  // Registrar callback para quando a conexão for restabelecida
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
        if (state.jogoAtivo) {
          // Se estiver jogando, não recarrega o ranking para não atrapalhar
        } else {
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

  // Sons
  inicializarSons();

  // Versão
  setTimeout(() => verificarVersao(false), 2000);
  iniciarListenerVersao();

  // === TIMEOUT DE SEGURANÇA PARA CARREGAMENTO (item 4) ===
  let carregamentoConcluido = false;
  const timeoutId = setTimeout(() => {
    if (!carregamentoConcluido) {
      console.warn('⏳ Carregamento demorou mais que 10 segundos. Exibindo erro...');
      exibirErroCarregamento();
    }
  }, 10000);

  // Listeners Firebase
  carregarEstado((estado) => {
    // Dados carregados!
    carregamentoConcluido = true;
    clearTimeout(timeoutId);
    
    // Esconde o overlay
    esconderCarregando();
    
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
  
  // Iniciar relógio (apenas a hora, não a última sinc)
  iniciarRelogio();
  // Definir última sinc inicial
  atualizarUltimaSinc();

  // === BOTÃO RECARREGAR NO ERRO DE LOADING ===
  document.getElementById('btn-recarregar-loading')?.addEventListener('click', () => {
    location.reload();
  });
}

// ============================================================
// RELÓGIO EM TEMPO REAL (apenas hora)
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
// ATUALIZAR ÚLTIMA SINCRONIZAÇÃO (somente em eventos reais)
// ============================================================
function atualizarUltimaSinc() {
  const span = document.getElementById('last-sync-time');
  if (span) {
    const agora = new Date();
    span.innerText = agora.toLocaleString('pt-BR');
  }
  // Também atualiza o campo da torcida se existir
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
  }, 4000);
  exibirToast('👨‍🏫 Bem-vindo, Professor!');
  document.querySelector('.tab-btn[data-tab="controle"]')?.click();
  popularSelectFases();
}

// ============================================================
// CONFIGURAÇÃO DE EVENTOS
// ============================================================
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
  document.getElementById('btn-voltar-menu-prof')?.addEventListener('click', () => location.reload());

  // Aluno
  document.getElementById('btn-aluno')?.addEventListener('click', async () => {
    if (!state.estadoAtual || state.estadoAtual.status !== 'em_andamento' || Date.now() >= state.estadoAtual.fim) {
      exibirToast('⏳ A fase não foi iniciada ou já terminou.');
      return;
    }
    exibirToast('🔧 Função de aluno em desenvolvimento.');
  });

  // Torcida
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

  // Torcida - Modos
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

  // Torcida - Sub-abas
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

  // Torcida - Sair
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
    atualizarUltimaSinc(); // <-- atualiza a última sinc
    exibirToast('🔄 Sincronizado!');
  });

  // Ranking do aluno
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

  // Aluno - Iniciar partida
  document.getElementById('btn-iniciar-partida')?.addEventListener('click', iniciarPartida);
  document.getElementById('btn-sair-aluno')?.addEventListener('click', () => {
    if (state.alunoId) db.ref(`online/${state.alunoId}`).remove();
    location.reload();
  });

  // Abas do professor
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      document.getElementById(`tab-${tab}`).classList.remove('hidden');
      
      if (tab === 'ranking-geral') {
        renderRankingGeral();
      }
      if (tab === 'ranking-fase') {
        popularSelectFases();
        const fase = parseInt(document.getElementById('select-fase-ranking').value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
      }
      if (tab === 'ranking-turmas') {
        renderizarRanking(null, 'ranking-turmas-container', 'turmas', false);
      }
      if (tab === 'ranking-pontos') {
        renderizarRankingPontos();
      }
      if (tab === 'gerenciar-alunos') {
        renderListaAlunosGerenciar();
      }
      if (tab === 'gerenciar-turmas') {
        renderListaTurmas();
      }
      if (tab === 'configuracoes') {
        carregarMinPartidas().then(config => renderizarConfigMinPartidas(config));
        renderizarColunasVisiveis();
        renderizarPainelSom();
      }
    });
  });

  // Botão Sincronizar Global
  document.getElementById('btn-sincronizar-global')?.addEventListener('click', () => {
    db.ref('copaV2').once('value', snap => {
      state.estadoAtual = snap.val() || state.estadoAtual;
      atualizarUI();
      if (state.meuTipo === 'professor') {
        const fase = parseInt(document.getElementById('select-fase-ranking').value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
      }
      atualizarUltimaSinc(); // <-- atualiza a última sinc
      exibirToast('✅ Dados sincronizados!');
    });
  });

  // Outros botões do professor
  document.getElementById('btn-sync-prof')?.addEventListener('click', () => {
    atualizarUltimaSinc(); // <-- atualiza a última sinc
    exibirToast('🔄 Sincronizado!');
  });

  // Controle de fase
  document.getElementById('btn-iniciar-fase')?.addEventListener('click', async () => {
    if (!state.estadoAtual) return;
    const duracao = state.estadoAtual.tempoFase || 10;
    const fim = Date.now() + duracao * 60000;
    await setDados('copaV2', { ...state.estadoAtual, status: 'em_andamento', fim, tempoRestantePausa: null });
    atualizarUltimaSinc(); // <-- atualiza a última sinc
    exibirToast('▶️ Fase iniciada!');
  });

  document.getElementById('btn-continuar-parar-fase')?.addEventListener('click', async () => {
    if (state.estadoAtual?.status === 'em_andamento') {
      if (state.timerFase) clearInterval(state.timerFase);
      const agora = Date.now();
      const tempoRestante = Math.max(0, state.estadoAtual.fim - agora);
      await setDados('copaV2', { ...state.estadoAtual, status: 'pausado', tempoRestantePausa: tempoRestante, fim: 0 });
      atualizarUltimaSinc(); // <-- atualiza a última sinc
      exibirToast('⏸️ Fase pausada.');
    } else if (state.estadoAtual?.status === 'pausado') {
      const tempoRestante = state.estadoAtual.tempoRestantePausa || 0;
      if (tempoRestante <= 0) { exibirToast('⚠️ Tempo esgotado.'); return; }
      const novoFim = Date.now() + tempoRestante;
      await setDados('copaV2', { ...state.estadoAtual, status: 'em_andamento', fim: novoFim, tempoRestantePausa: null });
      atualizarUltimaSinc(); // <-- atualiza a última sinc
      exibirToast('▶️ Fase retomada!');
    }
  });

  document.getElementById('btn-avancar-fase')?.addEventListener('click', async () => {
    if (confirm('Finalizar fase?')) {
      await avancarFase();
      atualizarUltimaSinc(); // <-- atualiza a última sinc
    }
  });

  document.getElementById('btn-reset-fase')?.addEventListener('click', async () => {
    if (confirm('Resetar fase atual?')) {
      await resetarFase();
      atualizarUltimaSinc(); // <-- atualiza a última sinc
    }
  });

  document.getElementById('btn-reset-total')?.addEventListener('click', async () => {
    if (confirm('Resetar toda a competição?')) {
      await setDados('copaV2', { fase:1, status:'aguardando', tempoFase:10, fim:0, modalidade: state.estadoAtual?.modalidade || "2-5", resultados:{}, participantes:{}, classificados:{} });
      await removerDados('online');
      atualizarUltimaSinc(); // <-- atualiza a última sinc
      location.reload();
    }
  });

  // Salvar tempo
  document.getElementById('btn-salvar-tempo')?.addEventListener('click', async () => {
    const t = parseInt(document.getElementById('input-tempo-fase').value);
    if (t > 0) {
      await atualizarDados('copaV2/tempoFase', t);
      atualizarUltimaSinc(); // <-- atualiza a última sinc
    }
  });

  // Adicionar tempo extra
  document.getElementById('btn-adicionar-tempo-extra')?.addEventListener('click', async () => {
    if (state.estadoAtual?.status !== 'em_andamento') { exibirToast('⚠️ Fase não está em andamento.'); return; }
    const extra = parseInt(document.getElementById('input-tempo-extra').value);
    if (isNaN(extra) || extra < 1) { exibirToast('❌ Digite um valor válido.'); return; }
    const agora = Date.now();
    const novoFim = Math.max(agora + 1000, state.estadoAtual.fim) + extra * 60000;
    await atualizarDados('copaV2/fim', novoFim);
    atualizarUltimaSinc(); // <-- atualiza a última sinc
    exibirToast(`✅ ${extra} minuto(s) adicionado(s)!`);
  });

  // Intervalos
  document.getElementById('btn-atualizar-intervalo-individual')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('intervalo-individual').value);
    if (val >= 1) {
      state.intervaloIndividualSegundos = val;
      atualizarDados('copaV2/configuracoes/intervalos/individual', val);
      atualizarUltimaSinc(); // <-- atualiza a última sinc
      exibirToast(`✅ Intervalo individual: ${val}s`);
    }
  });
  document.getElementById('btn-atualizar-intervalo-equipes')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('intervalo-equipes').value);
    if (val >= 1) {
      state.intervaloEquipesSegundos = val;
      atualizarDados('copaV2/configuracoes/intervalos/equipes', val);
      atualizarUltimaSinc(); // <-- atualiza a última sinc
      exibirToast(`✅ Intervalo equipes: ${val}s`);
    }
  });

  // Gerenciar turmas
  document.getElementById('btn-adicionar-turma')?.addEventListener('click', async () => {
    const nova = prompt('Digite o nome da nova turma:');
    if (nova && nova.trim()) {
      await adicionarTurma(nova.trim());
      renderListaTurmas();
      atualizarUltimaSinc(); // <-- atualiza a última sinc
    }
  });

  // Configurações: salvar mínimo de partidas
  document.getElementById('btn-salvar-min-partidas')?.addEventListener('click', async () => {
    await salvarMinPartidas();
    atualizarUltimaSinc(); // <-- atualiza a última sinc
  });

  // Configurações: salvar colunas
  document.getElementById('btn-salvar-colunas')?.addEventListener('click', async () => {
    await salvarColunasVisiveis();
    atualizarUltimaSinc(); // <-- atualiza a última sinc
  });

  // Configurações: restaurar colunas
  document.getElementById('btn-restaurar-colunas')?.addEventListener('click', async () => {
    const config = {};
    ['futPos','pontuacaoAtual','deltaLider','velocRecorde','progresso','partidas','tempo','mediaTempo','turma','projecaoPontos'].forEach(id => {
      config[id] = true;
    });
    await db.ref('copaV2/configuracoes/colunasVisiveis').set(config);
    state.colunasVisiveis = config;
    renderizarColunasVisiveis();
    atualizarUltimaSinc(); // <-- atualiza a última sinc
    exibirToast('✅ Colunas restauradas para o padrão (todas visíveis)');
  });

  // Configurações: ranking de pontos
  document.getElementById('toggle-ranking-pontos')?.addEventListener('change', async function() {
    const ativo = this.checked;
    document.getElementById('status-ranking-pontos').innerText = ativo ? '✅ Ativado' : '❌ Desativado';
    document.getElementById('status-ranking-pontos').style.color = ativo ? '#4ade80' : '#f87171';
    await salvarConfigRankingPontos(ativo, state.tabelaPontosPadrao, state.tabelaPontosFase5);
    atualizarUltimaSinc(); // <-- atualiza a última sinc
    if (state.meuTipo === 'professor') renderizarRankingPontos();
    if (state.meuTipo === 'projecao') {
      if (state.abaTorcidaAtiva === 'fase') {
        if
