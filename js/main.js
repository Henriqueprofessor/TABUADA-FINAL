// js/main.js
import { db, auth, initConnectionMonitor, onConnectionChange, recriarPresencaOnline } from './config/firebase.js';
import { state } from './modules/state.js';
import { loginProfessor, logoutProfessor, getCurrentUser, onAuthStateChanged } from './modules/auth.js';
import { carregarEstado, atualizarDados, setDados, removerDados, lerDados, ouvirOnline } from './modules/db.js';
import { 
  mostrarTela, 
  exibirToast, 
  abrirModal, 
  fecharModal, 
  atualizarTimerFase, 
  initConnectionUI, 
  exibirToastReconexao, 
  mostrarCarregando, 
  esconderCarregando, 
  exibirErroCarregamento,
  aplicarTema,
  alternarTema,
  atualizarBannerAviso,
  definirCorPrimaria,
  carregarCorPrimaria,
  CORES_DISPONIVEIS
} from './modules/ui.js';
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
  removerTurma,
  carregarCache,
  carregarConfiguracoesDoCache,
  aplicarPreferenciasUI,
  atualizarCacheComDadosFirebase,
  setCacheItem,
  getCacheItem,
  salvarCache
} from './modules/config.js';
import { verificarVersao, iniciarListenerVersao } from './modules/version.js';
import { abrirInstalacao } from './modules/install.js';
import {
  publicarAviso,
  removerAviso,
  escutarAviso,
  pararEscutarAviso,
  exibirBannerAviso,
  removerBannerAviso,
  atualizarStatusAviso
} from './modules/aviso.js';
import { initGameLoop } from './modules/gameLoop.js';

// ============================================================
// FUNÇÕES DE CADASTRO DO ALUNO
// ============================================================

async function abrirModalTurma() {
  const modal = document.getElementById('modalTurma');
  if (!modal) return;
  
  modal.style.display = 'flex';
  
  // Busca turmas do Firebase SEMPRE
  let turmas = [];
  try {
    const firebaseTurmas = await lerDados('copaV2/turmas');
    if (firebaseTurmas && firebaseTurmas.length > 0) {
      turmas = firebaseTurmas;
      state.turmasCache = turmas;
    } else {
      turmas = ['Turma A', 'Turma B', 'Turma C'];
      state.turmasCache = turmas;
      await setDados('copaV2/turmas', turmas);
    }
  } catch (e) {
    console.warn('Erro ao carregar turmas, usando cache/padrão:', e);
    turmas = state.turmasCache || ['Turma A', 'Turma B', 'Turma C'];
    state.turmasCache = turmas;
  }

  const select = document.getElementById('selectTurma');
  if (select) {
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Selecione uma turma --';
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);
    
    turmas.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      select.appendChild(opt);
    });
  }

  const fase = state.estadoAtual?.fase || 1;
  const exigirSenha = (fase === 1 && state.exigirSenhaFase1);
  const senhaContainer = document.getElementById('senhaContainer');
  if (senhaContainer) {
    senhaContainer.style.display = exigirSenha ? 'block' : 'none';
  }
  
  document.getElementById('inputNomeAluno').value = '';
  document.getElementById('inputSenhaAluno').value = '';
  document.getElementById('erroAluno').textContent = '';
  setTimeout(() => document.getElementById('inputNomeAluno').focus(), 100);
}

function fecharModalTurma() {
  const modal = document.getElementById('modalTurma');
  if (modal) {
    modal.style.display = 'none';
  }
}

async function confirmarCadastroAluno() {
  const nome = document.getElementById('inputNomeAluno').value.trim();
  const select = document.getElementById('selectTurma');
  const turma = select ? select.value : '';
  const senha = document.getElementById('inputSenhaAluno').value.trim();

  if (!nome) {
    document.getElementById('erroAluno').textContent = '❌ Digite seu nome.';
    return;
  }
  if (nome.length < 2) {
    document.getElementById('erroAluno').textContent = '❌ Nome muito curto.';
    return;
  }
  if (!turma) {
    document.getElementById('erroAluno').textContent = '❌ Selecione uma turma.';
    return;
  }

  const fase = state.estadoAtual?.fase || 1;
  if (fase === 1 && state.exigirSenhaFase1) {
    if (!senha || senha.length !== 2 || isNaN(senha)) {
      document.getElementById('erroAluno').textContent = '❌ Digite a senha numérica de 2 dígitos.';
      return;
    }
    const senhaSalva = await lerDados('copaV2/configuracoes/senhaFase1');
    if (senhaSalva && senhaSalva !== senha) {
      document.getElementById('erroAluno').textContent = '❌ Senha incorreta. Tente novamente.';
      return;
    }
  }

  let deviceId = state.alunoDeviceId;
  if (!deviceId) {
    deviceId = 'aluno_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    state.alunoDeviceId = deviceId;
    setCacheItem('aluno.deviceId', deviceId);
  }

  const faseAtual = state.estadoAtual.fase;
  await atualizarDados(`copaV2/participantes/${faseAtual}/${deviceId}`, {
    nome: nome,
    turma: turma,
    timestamp: Date.now()
  });

  state.alunoId = deviceId;
  state.alunoNome = nome;
  state.alunoTurma = turma;
  state.alunoNomeCache = nome;
  state.alunoTurmaCache = turma;
  setCacheItem('aluno.nome', nome);
  setCacheItem('aluno.turma', turma);

  fecharModalTurma();
  entrarModoAluno(true);
}

// ============================================================
// FUNÇÕES DE ENTRADA EM MODOS
// ============================================================

function entrarModoProfessor() {
  state.meuTipo = 'professor';
  mostrarTela('professor');
  const abaAtiva = document.querySelector('.tab-btn.active');
  if (abaAtiva) {
    state.prefProfessorAba = abaAtiva.dataset.tab;
    setCacheItem('preferencias.professorAba', state.prefProfessorAba);
  }
  if (state.intervaloRankingProfessor) clearInterval(state.intervaloRankingProfessor);
  state.intervaloRankingProfessor = setInterval(() => {
    if (state.meuTipo === 'professor' && state.atualizacaoRankingAuto) {
      const selectFase = document.getElementById('select-fase-ranking');
      if (selectFase) {
        const fase = parseInt(selectFase.value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
      }
    }
  }, 4000);
  exibirToast('👨‍🏫 Bem-vindo, Professor!', 'sucesso');
  document.querySelector('.tab-btn[data-tab="controle"]')?.click();
  popularSelectFases();
  atualizarStatusAviso(state.avisoAtual);
  carregarCorPrimaria();
}

function entrarModoAluno(cadastrado = false) {
  if (!state.estadoAtual || state.estadoAtual.status !== 'em_andamento' || Date.now() >= state.estadoAtual.fim) {
    exibirToast('⏳ A fase não foi iniciada ou já terminou.', 'aviso');
  } else {
    exibirToast('🎮 Modo Aluno ativado!', 'sucesso');
  }
  
  state.meuTipo = 'aluno';
  mostrarTela('aluno');
  
  if (state.avisoAtual && state.avisoAtual.ativo === true && state.avisoAtual.expiracao > Date.now()) {
    exibirBannerAviso(state.avisoAtual);
  } else {
    removerBannerAviso();
  }
  
  carregarCorPrimaria();
  preencherSeletorCores('seletor-cores-aluno');
  
  if (state.alunoId) {
    document.getElementById('aluno-nome-display').textContent = state.alunoNome || 'Aluno';
    document.getElementById('aluno-turma-display').textContent = state.alunoTurma || '-';
    document.getElementById('aluno-modalidade').textContent = state.estadoAtual?.modalidade || '--';
    document.getElementById('aluno-fase-info').textContent = `Fase ${state.estadoAtual?.fase || 1}/5`;
    atualizarInfoAluno();
    if (state.estadoAtual && state.estadoAtual.status === 'em_andamento' && Date.now() < state.estadoAtual.fim) {
      document.getElementById('btn-iniciar-partida').classList.remove('hidden');
      document.getElementById('msg-status-aluno').textContent = 'Pronto para jogar!';
    } else {
      document.getElementById('btn-iniciar-partida').classList.add('hidden');
      document.getElementById('msg-status-aluno').textContent = 'Aguardando fase...';
    }
  }
}

function entrarModoTorcida() {
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
  exibirToast('📺 Modo Torcida ativado!', 'sucesso');
}

// ============================================================
// DEMAIS FUNÇÕES (POPULAR SELECTS, ATUALIZAR UI, ETC)
// ============================================================

function preencherSeletorCores(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  
  for (const [cor, info] of Object.entries(CORES_DISPONIVEIS)) {
    const btn = document.createElement('button');
    btn.className = 'btn-cor';
    btn.dataset.cor = cor;
    btn.style.backgroundColor = cor;
    btn.title = info.nome;
    btn.innerHTML = `<span style="font-size: 18px; line-height: 1;">${info.icone}</span>`;
    btn.style.color = '#fff';
    btn.style.textShadow = '0 1px 3px rgba(0,0,0,0.5)';
    btn.addEventListener('click', function() {
      definirCorPrimaria(cor);
      document.querySelectorAll('.btn-cor').forEach(b => b.classList.remove('selected'));
      this.classList.add('selected');
    });
    container.appendChild(btn);
  }
  
  const corAtual = localStorage.getItem('copa_cor_primaria') || '#3b82f6';
  container.querySelectorAll('.btn-cor').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.cor === corAtual);
  });
}

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
  if (state.meuTipo === 'aluno' && state.alunoId) {
    if (state.estadoAtual.status === 'em_andamento' && Date.now() < state.estadoAtual.fim) {
      document.getElementById('btn-iniciar-partida').classList.remove('hidden');
      document.getElementById('msg-status-aluno').textContent = 'Pronto para jogar!';
    } else {
      document.getElementById('btn-iniciar-partida').classList.add('hidden');
      document.getElementById('msg-status-aluno').textContent = 'Aguardando fase...';
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
// CONFIGURAÇÃO DE EVENTOS
// ============================================================

function configurarEventos() {
  document.getElementById('btn-tema')?.addEventListener('click', alternarTema);

  document.getElementById('btn-verificar-versao')?.addEventListener('click', () => verificarVersao(true));
  document.getElementById('btn-tutorial-inicial')?.addEventListener('click', () => abrirTutorial('aluno'));
  document.getElementById('btn-tutorial-aluno')?.addEventListener('click', () => abrirTutorial('aluno'));
  document.getElementById('btn-tutorial-torcida')?.addEventListener('click', () => abrirTutorial('torcida'));
  document.getElementById('btn-fechar-tutorial')?.addEventListener('click', fecharTutorial);
  document.getElementById('btn-instalar-app')?.addEventListener('click', abrirInstalacao);

  // Botão Professor
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
      exibirToast('👋 Até logo, Professor!', 'sucesso');
      location.reload();
    }
  });
  document.getElementById('btn-voltar-menu-prof')?.addEventListener('click', () => location.reload());

  // Botão Aluno
  document.getElementById('btn-aluno')?.addEventListener('click', () => {
    const deviceId = state.alunoDeviceId || getCacheItem('aluno.deviceId');
    if (deviceId) {
      const faseAtual = state.estadoAtual?.fase || 1;
      lerDados(`copaV2/participantes/${faseAtual}/${deviceId}`).then(dados => {
        if (dados && dados.nome) {
          state.alunoId = deviceId;
          state.alunoNome = dados.nome;
          state.alunoTurma = dados.turma || '?';
          state.alunoNomeCache = dados.nome;
          state.alunoTurmaCache = dados.turma || '?';
          entrarModoAluno(true);
        } else {
          abrirModalTurma();
        }
      }).catch(() => {
        abrirModalTurma();
      });
    } else {
      abrirModalTurma();
    }
  });

  // Botão Confirmar Aluno
  document.getElementById('btnConfirmarAluno')?.addEventListener('click', confirmarCadastroAluno);
  document.getElementById('btnCancelarAluno')?.addEventListener('click', fecharModalTurma);

  // Botão Torcida
  document.getElementById('btn-projecao')?.addEventListener('click', entrarModoTorcida);

  // Modos da Torcida
  document.getElementById('btn-modo-individual')?.addEventListener('click', function() {
    state.modoTorcida = 'individual';
    state.prefTorcidaModo = 'individual';
    setCacheItem('preferencias.torcidaModo', 'individual');
    this.classList.add('ativo');
    document.getElementById('btn-modo-equipes').classList.remove('ativo');
    document.getElementById('torcida-fase-selector').style.display = 'block';
    if (state.abaTorcidaAtiva === 'fase') atualizarTorcidaIndividual();
  });
  document.getElementById('btn-modo-equipes')?.addEventListener('click', function() {
    state.modoTorcida = 'equipes';
    state.prefTorcidaModo = 'equipes';
    setCacheItem('preferencias.torcidaModo', 'equipes');
    this.classList.add('ativo');
    document.getElementById('btn-modo-individual').classList.remove('ativo');
    document.getElementById('torcida-fase-selector').style.display = 'none';
    if (state.abaTorcidaAtiva === 'fase') atualizarTorcidaEquipes();
  });

  document.getElementById('btn-torcida-sub-fase')?.addEventListener('click', function() {
    state.abaTorcidaAtiva = 'fase';
    state.prefTorcidaSubAba = 'fase';
    setCacheItem('preferencias.torcidaSubAba', 'fase');
    this.classList.add('ativo');
    document.getElementById('btn-torcida-sub-pontos').classList.remove('ativo');
    document.getElementById('torcida-fase-selector').style.display = 'block';
    if (state.modoTorcida === 'individual') atualizarTorcidaIndividual();
    else atualizarTorcidaEquipes();
  });
  document.getElementById('btn-torcida-sub-pontos')?.addEventListener('click', async function() {
    state.abaTorcidaAtiva = 'pontos';
    state.prefTorcidaSubAba = 'pontos';
    setCacheItem('preferencias.torcidaSubAba', 'pontos');
    this.classList.add('ativo');
    document.getElementById('btn-torcida-sub-fase').classList.remove('ativo');
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
    exibirToast('🔄 Sincronizado!', 'sucesso');
  });

  // Ranking do Aluno
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

  // Iniciar Partida
  document.getElementById('btn-iniciar-partida')?.addEventListener('click', iniciarPartida);
  document.getElementById('btn-sair-aluno')?.addEventListener('click', () => {
    if (state.alunoId) db.ref(`online/${state.alunoId}`).remove();
    location.reload();
  });

  // Abas do Professor
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const tab = this.dataset.tab;
      if (!tab) return;

      state.prefProfessorAba = tab;
      setCacheItem('preferencias.professorAba', tab);

      document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

      const targetTab = document.getElementById(`tab-${tab}`);
      if (targetTab) {
        targetTab.classList.remove('hidden');
      } else {
        console.warn(`Aba ${tab} não encontrada`);
        return;
      }

      if (tab === 'ranking-geral') {
        renderRankingGeral();
      }
      if (tab === 'ranking-fase') {
        popularSelectFases();
        const selectFase = document.getElementById('select-fase-ranking');
        if (selectFase) {
          const fase = parseInt(selectFase.value) || state.estadoAtual?.fase || 1;
          renderizarRanking(fase, 'ranking-parcial', 'individual', true);
        } else {
          const fase = state.estadoAtual?.fase || 1;
          renderizarRanking(fase, 'ranking-parcial', 'individual', true);
        }
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
        atualizarStatusAviso(state.avisoAtual);
        preencherSeletorCores('seletor-cores');
      }
    });
  });

  // Avisos
  document.getElementById('btn-publicar-aviso')?.addEventListener('click', async () => {
    const mensagem = document.getElementById('input-aviso-mensagem').value.trim();
    const minutos = parseInt(document.getElementById('input-aviso-tempo').value) || 0;
    if (minutos < 1) {
      exibirToast('❌ Defina um tempo válido (mínimo 1 minuto).', 'erro');
      return;
    }
    await publicarAviso(mensagem, minutos);
    document.getElementById('input-aviso-mensagem').value = '';
  });

  document.getElementById('btn-remover-aviso')?.addEventListener('click', async () => {
    await removerAviso();
  });

  // Sincronizar Global
  document.getElementById('btn-sincronizar-global')?.addEventListener('click', () => {
    db.ref('copaV2').once('value', snap => {
      state.estadoAtual = snap.val() || state.estadoAtual;
      atualizarUI();
      if (state.meuTipo === 'professor') {
        const fase = parseInt(document.getElementById('select-fase-ranking').value) || state.estadoAtual?.fase || 1;
        renderizarRanking(fase, 'ranking-parcial', 'individual', true);
      }
      atualizarUltimaSinc();
      exibirToast('✅ Dados sincronizados!', 'sucesso');
    });
  });

  document.getElementById('btn-sync-prof')?.addEventListener('click', () => {
    atualizarUltimaSinc();
    exibirToast('🔄 Sincronizado!', 'sucesso');
  });

  // Controles da Fase
  document.getElementById('btn-iniciar-fase')?.addEventListener('click', async () => {
    if (!state.estadoAtual) return;
    const duracao = state.estadoAtual.tempoFase || 10;
    const fim = Date.now() + duracao * 60000;
    await setDados('copaV2', { ...state.estadoAtual, status: 'em_andamento', fim, tempoRestantePausa: null });
    atualizarUltimaSinc();
    exibirToast('▶️ Fase iniciada!', 'sucesso');
  });

  document.getElementById('btn-continuar-parar-fase')?.addEventListener('click', async () => {
    if (state.estadoAtual?.status === 'em_andamento') {
      if (state.timerFase) clearInterval(state.timerFase);
      const agora = Date.now();
      const tempoRestante = Math.max(0, state.estadoAtual.fim - agora);
      await setDados('copaV2', { ...state.estadoAtual, status: 'pausado', tempoRestantePausa: tempoRestante, fim: 0 });
      atualizarUltimaSinc();
      exibirToast('⏸️ Fase pausada.', 'aviso');
    } else if (state.estadoAtual?.status === 'pausado') {
      const tempoRestante = state.estadoAtual.tempoRestantePausa || 0;
      if (tempoRestante <= 0) { exibirToast('⚠️ Tempo esgotado.', 'erro'); return; }
      const novoFim = Date.now() + tempoRestante;
      await setDados('copaV2', { ...state.estadoAtual, status: 'em_andamento', fim: novoFim, tempoRestantePausa: null });
      atualizarUltimaSinc();
      exibirToast('▶️ Fase retomada!', 'sucesso');
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
    if (state.estadoAtual?.status !== 'em_andamento') { exibirToast('⚠️ Fase não está em andamento.', 'aviso'); return; }
    const extra = parseInt(document.getElementById('input-tempo-extra').value);
    if (isNaN(extra) || extra < 1) { exibirToast('❌ Digite um valor válido.', 'erro'); return; }
    const agora = Date.now();
    const novoFim = Math.max(agora + 1000, state.estadoAtual.fim) + extra * 60000;
    await atualizarDados('copaV2/fim', novoFim);
    atualizarUltimaSinc();
    exibirToast(`✅ ${extra} minuto(s) adicionado(s)!`, 'sucesso');
  });

  // Intervalos
  document.getElementById('btn-atualizar-intervalo-individual')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('intervalo-individual').value);
    if (val >= 1) {
      state.intervaloIndividualSegundos = val;
      atualizarDados('copaV2/configuracoes/intervalos/individual', val);
      atualizarUltimaSinc();
      exibirToast(`✅ Intervalo individual: ${val}s`, 'sucesso');
    }
  });
  document.getElementById('btn-atualizar-intervalo-equipes')?.addEventListener('click', () => {
    const val = parseInt(document.getElementById('intervalo-equipes').value);
    if (val >= 1) {
      state.intervaloEquipesSegundos = val;
      atualizarDados('copaV2/configuracoes/intervalos/equipes', val);
      atualizarUltimaSinc();
      exibirToast(`✅ Intervalo equipes: ${val}s`, 'sucesso');
    }
  });

  // Turmas
  document.getElementById('btn-adicionar-turma')?.addEventListener('click', async () => {
    const nova = prompt('Digite o nome da nova turma:');
    if (nova && nova.trim()) {
      await adicionarTurma(nova.trim());
      renderListaTurmas();
      state.turmasCache = await lerDados('copaV2/turmas') || [];
      // Atualiza o select do modal de turma se estiver aberto
      const modal = document.getElementById('modalTurma');
      if (modal && modal.style.display === 'flex') {
        await abrirModalTurma();
      }
      atualizarUltimaSinc();
    }
  });

  // Configurações
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
    state.prefColunasVisiveis = config;
    setCacheItem('preferencias.colunasVisiveis', config);
    renderizarColunasVisiveis();
    atualizarUltimaSinc();
    exibirToast('✅ Colunas restauradas para o padrão (todas visíveis)', 'sucesso');
  });

  // Ranking Pontos
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
      exibirToast('❌ Tabela para Fases 1-4 vazia ou inválida.', 'erro');
      return;
    }
    if (Object.keys(objFase5).length === 0) {
      exibirToast('❌ Tabela para Fase 5 vazia ou inválida.', 'erro');
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
    exibirToast('Padrão restaurado para Fases 1-4', 'sucesso');
  });
  document.getElementById('btn-restaurar-padrao-fase5')?.addEventListener('click', function() {
    document.getElementById('textarea-pontos-fase5').value = formatPontuacaoText(getPontuacaoDefault());
    exibirToast('Padrão restaurado para Fase 5', 'sucesso');
  });

  // Bônus Velocidade
  document.getElementById('btn-salvar-bonus-velocidade')?.addEventListener('click', async function() {
    const ativo = document.getElementById('toggle-bonus-velocidade').checked;
    const pontos = parseInt(document.getElementById('input-bonus-velocidade').value) || 1;
    const precisaoMinima = parseInt(document.getElementById('input-precisao-bonus').value) || 80;
    if (pontos < 1) { exibirToast('❌ Pontos do bônus devem ser no mínimo 1.', 'erro'); return; }
    if (precisaoMinima < 50 || precisaoMinima > 100) { exibirToast('❌ Precisão mínima deve estar entre 50% e 100%.', 'erro'); return; }
    await salvarConfigBonusVelocidade(ativo, pontos, precisaoMinima);
    document.getElementById('feedback-bonus-velocidade').style.display = 'block';
    document.getElementById('feedback-bonus-velocidade').className = 'feedback-sucesso';
    document.getElementById('feedback-bonus-velocidade').textContent = '✅ Configuração de bônus salva!';
    atualizarUltimaSinc();
    setTimeout(() => document.getElementById('feedback-bonus-velocidade').style.display = 'none', 5000);
  });

  // Valor Partida
  document.getElementById('btn-atualizar-valor-partida')?.addEventListener('click', async function() {
    const novoValor = parseInt(document.getElementById('input-valor-partida').value);
    if (!novoValor || novoValor < 1) { exibirToast('❌ Digite um valor válido maior que 0.', 'erro'); return; }
    await salvarValorPartida(novoValor);
    document.getElementById('valor-partida-atual').textContent = novoValor;
    document.getElementById('feedback-valor-partida').style.display = 'block';
    document.getElementById('feedback-valor-partida').className = 'feedback-sucesso';
    document.getElementById('feedback-valor-partida').textContent = `✅ Valor da partida atualizado para ${novoValor} pontos!`;
    atualizarUltimaSinc();
    setTimeout(() => document.getElementById('feedback-valor-partida').style.display = 'none', 5000);
  });

  // Senha
  document.getElementById('btn-gerar-senha')?.addEventListener('click', () => {
    if (state.senhaBloqueada) { exibirToast('❌ Senha bloqueada após iniciar a fase.', 'erro'); return; }
    const num = Math.floor(Math.random() * 90) + 10;
    document.getElementById('input-senha-fase1').value = num;
    exibirToast(`🎲 Senha gerada: ${num}`, 'sucesso');
  });
  document.getElementById('btn-salvar-senha')?.addEventListener('click', async () => {
    if (state.senhaBloqueada) { exibirToast('❌ Senha bloqueada após iniciar a fase.', 'erro'); return; }
    const senha = document.getElementById('input-senha-fase1').value.trim();
    if (!/^\d{2}$/.test(senha)) { exibirToast('❌ Digite uma senha de 2 dígitos (ex: 42).', 'erro'); return; }
    const exigir = document.getElementById('toggle-exigir-senha').checked;
    await db.ref('copaV2/configuracoes/senhaFase1').set(senha);
    await db.ref('copaV2/configuracoes/exigirSenhaFase1').set(exigir);
    state.senhaFase1 = senha;
    state.exigirSenhaFase1 = exigir;
    setCacheItem('configCompeticao.senhaFase1', senha);
    setCacheItem('configCompeticao.exigirSenha', exigir);
    atualizarUltimaSinc();
    exibirToast('✅ Senha salva!', 'sucesso');
  });
  document.getElementById('toggle-exigir-senha')?.addEventListener('change', () => {
    if (!state.senhaBloqueada) {
      document.getElementById('btn-salvar-senha').click();
    } else {
      document.getElementById('toggle-exigir-senha').checked = true;
      exibirToast('❌ Não é possível alterar após iniciar a fase.', 'erro');
    }
  });

  // Liberar Aluno
  document.getElementById('btn-liberar-aluno')?.addEventListener('click', async () => {
    const nome = document.getElementById('input-liberar-nome').value.trim();
    const turma = document.getElementById('input-liberar-turma').value.trim();
    if (!nome || !turma) { exibirToast('❌ Preencha nome e turma.', 'erro'); return; }
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
    if (!idEncontrado) { exibirToast('❌ Aluno não encontrado. Verifique nome e turma.', 'erro'); return; }
    await atualizarDados(`copaV2/participantes/${faseAtual}/${idEncontrado}`, { liberado: true });
    exibirToast(`✅ ${nome} liberado para a Fase ${faseAtual}!`, 'sucesso');
    atualizarListaLiberados();
    atualizarUltimaSinc();
  });
}

// ============================================================
// FUNÇÕES AUXILIARES
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
// INIT
// ============================================================

async function init() {
  try {
    aplicarTema();
    mostrarCarregando();
    carregarConfiguracoesDoCache();

    initConnectionMonitor();
    initConnectionUI(onConnectionChange);

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
          atualizarCacheComDadosFirebase(state.estadoAtual);
        } catch (e) {
          console.warn('Erro ao recarregar estado na reconexão:', e);
          exibirToast('⚠️ Falha ao sincronizar dados. Tente recarregar.', 'erro');
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
    try {
      await carregarValorPartida();
      await carregarConfigRankingPontos();
      await carregarConfigBonusVelocidade();
      await carregarRecordeGeral();
      await carregarColunasVisiveis();
      await carregarMinPartidas();
    } catch (e) {
      console.warn('Erro ao carregar configurações:', e);
      exibirToast('⚠️ Algumas configurações podem não estar disponíveis.', 'aviso');
    }

    // Carregar turmas para cache
    try {
      state.turmasCache = await lerDados('copaV2/turmas') || ['Turma A', 'Turma B', 'Turma C'];
    } catch (e) {
      state.turmasCache = ['Turma A', 'Turma B', 'Turma C'];
    }

    inicializarSons();
    setTimeout(() => verificarVersao(false), 2000);
    iniciarListenerVersao();

    state.listenerAviso = escutarAviso((aviso) => {
      state.avisoAtual = aviso;
      atualizarStatusAviso(aviso);
      if (state.meuTipo === 'aluno') {
        if (aviso && aviso.ativo === true && aviso.expiracao > Date.now()) {
          exibirBannerAviso(aviso);
        } else {
          removerBannerAviso();
        }
      }
    });

    let carregamentoConcluido = false;
    const timeoutId = setTimeout(() => {
      if (!carregamentoConcluido) {
        console.warn('⏳ Carregamento demorou mais que 10 segundos. Exibindo erro...');
        exibirErroCarregamento();
      }
    }, 10000);

    carregarEstado((estado) => {
      carregamentoConcluido = true;
      clearTimeout(timeoutId);
      try {
        atualizarCacheComDadosFirebase(estado);
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
        aplicarPreferenciasUI();

        preencherSeletorCores('seletor-cores');
        preencherSeletorCores('seletor-cores-aluno');

        // Se já houver deviceId, tenta entrar automaticamente no modo aluno (se estiver na tela inicial)
        const deviceId = state.alunoDeviceId || getCacheItem('aluno.deviceId');
        if (deviceId && state.estadoAtual && state.estadoAtual.status === 'em_andamento') {
          const faseAtual = state.estadoAtual.fase;
          lerDados(`copaV2/participantes/${faseAtual}/${deviceId}`).then(dados => {
            if (dados && dados.nome) {
              state.alunoId = deviceId;
              state.alunoNome = dados.nome;
              state.alunoTurma = dados.turma || '?';
              state.alunoNomeCache = dados.nome;
              state.alunoTurmaCache = dados.turma || '?';
              // Não entra automaticamente, apenas deixa pronto
            }
          }).catch(() => {});
        }
      } catch (e) {
        console.error('Erro ao processar dados do Firebase:', e);
        exibirToast('❌ Erro ao carregar dados. Recarregue a página.', 'erro');
      }
    });

    ouvirOnline((snap) => {
      atualizarOnline(snap);
    });

    configurarEventos();

    onAuthStateChanged((user) => {
      if (user) {
        console.log('Usuário logado:', user.email);
      } else {
        if (state.meuTipo === 'professor') {
          location.reload();
        }
      }
    });

    mostrarTela('inicio');
    popularSelectFases();
    popularSelectFasesTorcida();
    iniciarRelogio();
    atualizarUltimaSinc();

    document.getElementById('btn-recarregar-loading')?.addEventListener('click', () => {
      location.reload();
    });

    if (state.senhaFase1) {
      const inputSenha = document.getElementById('input-senha-fase1');
      if (inputSenha) inputSenha.value = state.senhaFase1;
    }
    if (state.exigirSenhaFase1 !== undefined) {
      const toggle = document.getElementById('toggle-exigir-senha');
      if (toggle) toggle.checked = state.exigirSenhaFase1;
    }
    if (state.modalidadeCache) {
      const select = document.getElementById('select-modalidade');
      if (select) select.value = state.modalidadeCache;
    }
    if (state.tempoFaseCache) {
      const inputTempo = document.getElementById('input-tempo-fase');
      if (inputTempo) inputTempo.value = state.tempoFaseCache;
    }

    // Inicializa o loop do joystick
    initGameLoop();

  } catch (error) {
    console.error('Erro fatal no init:', error);
    exibirToast('❌ Erro ao iniciar o jogo. Recarregue a página.', 'erro');
    esconderCarregando();
  }
}

document.addEventListener('DOMContentLoaded', init);
