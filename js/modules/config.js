// js/modules/config.js
import { db } from '../config/firebase.js';
import { state } from './state.js';
import { exibirToast } from './ui.js';
import { setDados, lerDados, atualizarDados } from './db.js';

const BONUS_VELOCIDADE_KEY = 'copaV2/configuracoes/bonusVelocidade';
const RECORDE_GERAL_KEY = 'copaV2/configuracoes/recordeGeral';
const VALOR_PARTIDA_KEY = 'copaV2/configuracoes/valorPartida';
const MIN_PARTIDAS_KEY = 'copaV2/configuracoes/minPartidasPorFase';
const COLUNAS_KEY = 'copaV2/configuracoes/colunasVisiveis';

// ============================================================
// CACHE LOCAL
// ============================================================

const CACHE_KEY = 'copa_cache_v2';
const CACHE_VERSION = '2.0.0';

export function carregarCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (cache.versao !== CACHE_VERSION) {
      console.log('🔄 Versão do cache desatualizada. Ignorando cache antigo.');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cache;
  } catch (e) {
    console.warn('⚠️ Erro ao carregar cache:', e);
    return null;
  }
}

export function salvarCache(cache) {
  try {
    cache.versao = CACHE_VERSION;
    cache.ultimaAtualizacao = new Date().toISOString();
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('⚠️ Erro ao salvar cache:', e);
  }
}

export function getCacheItem(caminho, fallback = null) {
  try {
    const cache = carregarCache();
    if (!cache) return fallback;
    const partes = caminho.split('.');
    let atual = cache;
    for (const p of partes) {
      if (atual === undefined || atual === null) return fallback;
      atual = atual[p];
    }
    return atual !== undefined ? atual : fallback;
  } catch (e) {
    console.warn('⚠️ Erro ao ler cache item:', e);
    return fallback;
  }
}

export function setCacheItem(caminho, valor) {
  try {
    let cache = carregarCache() || {};
    const partes = caminho.split('.');
    let atual = cache;
    for (let i = 0; i < partes.length - 1; i++) {
      if (!atual[partes[i]]) atual[partes[i]] = {};
      atual = atual[partes[i]];
    }
    atual[partes[partes.length - 1]] = valor;
    salvarCache(cache);
  } catch (e) {
    console.warn('⚠️ Erro ao salvar cache item:', e);
  }
}

export function carregarConfiguracoesDoCache() {
  try {
    const cache = carregarCache();
    if (!cache) return;

    if (cache.configCompeticao) {
      state.senhaFase1 = cache.configCompeticao.senhaFase1 || null;
      state.exigirSenhaFase1 = cache.configCompeticao.exigirSenha !== undefined ? cache.configCompeticao.exigirSenha : true;
      state.modalidadeCache = cache.configCompeticao.modalidade || null;
      state.tempoFaseCache = cache.configCompeticao.tempoFase || null;
    }

    if (cache.aluno) {
      state.alunoNomeCache = cache.aluno.nome || null;
      state.alunoTurmaCache = cache.aluno.turma || null;
      state.alunoDeviceId = cache.aluno.deviceId || null;
    }

    if (cache.preferencias) {
      state.prefProfessorAba = cache.preferencias.professorAba || 'controle';
      state.prefTorcidaModo = cache.preferencias.torcidaModo || 'individual';
      state.prefTorcidaSubAba = cache.preferencias.torcidaSubAba || 'fase';
      state.prefTorcidaFase = cache.preferencias.torcidaFase || 1;
      state.prefColunasVisiveis = cache.preferencias.colunasVisiveis || {};
    }

    state.ultimaSincCache = cache.ultimaSinc || null;
  } catch (e) {
    console.warn('Erro ao carregar configurações do cache:', e);
  }
}

export function aplicarPreferenciasUI() {
  try {
    if (state.meuTipo === 'professor' && state.prefProfessorAba) {
      const tabBtn = document.querySelector(`.tab-btn[data-tab="${state.prefProfessorAba}"]`);
      if (tabBtn) {
        setTimeout(() => tabBtn.click(), 300);
      }
    }

    if (state.meuTipo === 'projecao') {
      if (state.prefTorcidaModo === 'equipes') {
        document.getElementById('btn-modo-equipes')?.click();
      } else {
        document.getElementById('btn-modo-individual')?.click();
      }
      if (state.prefTorcidaSubAba === 'pontos') {
        document.getElementById('btn-torcida-sub-pontos')?.click();
      } else {
        document.getElementById('btn-torcida-sub-fase')?.click();
      }
      const selectFase = document.getElementById('select-fase-torcida');
      if (selectFase && state.prefTorcidaFase) {
        selectFase.value = state.prefTorcidaFase;
        selectFase.dispatchEvent(new Event('change'));
      }
    }
  } catch (e) {
    console.warn('Erro ao aplicar preferências UI:', e);
  }
}

export function atualizarCacheComDadosFirebase(estado) {
  try {
    if (!estado) return;
    let cache = carregarCache() || {};

    cache.configCompeticao = {
      senhaFase1: estado.senhaFase1 || cache.configCompeticao?.senhaFase1 || null,
      exigirSenha: estado.exigirSenhaFase1 !== undefined ? estado.exigirSenhaFase1 : cache.configCompeticao?.exigirSenha || true,
      modalidade: estado.modalidade || cache.configCompeticao?.modalidade || null,
      tempoFase: estado.tempoFase || cache.configCompeticao?.tempoFase || null,
    };

    state.senhaFase1 = cache.configCompeticao.senhaFase1;
    state.exigirSenhaFase1 = cache.configCompeticao.exigirSenha;
    state.modalidadeCache = cache.configCompeticao.modalidade;
    state.tempoFaseCache = cache.configCompeticao.tempoFase;

    if (state.alunoNome || state.alunoTurma) {
      cache.aluno = {
        nome: state.alunoNome || state.alunoNomeCache || '',
        turma: state.alunoTurma || state.alunoTurmaCache || '',
        deviceId: state.alunoDeviceId || cache.aluno?.deviceId || null,
      };
      state.alunoNomeCache = cache.aluno.nome;
      state.alunoTurmaCache = cache.aluno.turma;
      state.alunoDeviceId = cache.aluno.deviceId;
    }

    cache.preferencias = {
      professorAba: state.prefProfessorAba || 'controle',
      torcidaModo: state.prefTorcidaModo || 'individual',
      torcidaSubAba: state.prefTorcidaSubAba || 'fase',
      torcidaFase: state.prefTorcidaFase || 1,
      colunasVisiveis: state.prefColunasVisiveis || state.colunasVisiveis || {},
    };

    cache.ultimaSinc = new Date().toISOString();
    salvarCache(cache);
  } catch (e) {
    console.warn('Erro ao atualizar cache com dados Firebase:', e);
  }
}

// ============================================================
// INTERVALOS DE ATUALIZAÇÃO
// ============================================================
export async function carregarIntervaloIndividual() {
  try {
    const snap = await db.ref('copaV2/configuracoes/intervalos/individual').once('value');
    const valor = snap.val();
    if (valor && typeof valor === 'number' && valor >= 1) {
      state.intervaloIndividualSegundos = valor;
      console.log(`📊 Intervalo individual carregado: ${valor}s`);
    }
  } catch (e) {
    console.warn('Erro ao carregar intervalo individual:', e);
  }
}

export async function carregarIntervaloEquipes() {
  try {
    const snap = await db.ref('copaV2/configuracoes/intervalos/equipes').once('value');
    const valor = snap.val();
    if (valor && typeof valor === 'number' && valor >= 1) {
      state.intervaloEquipesSegundos = valor;
      console.log(`📊 Intervalo equipes carregado: ${valor}s`);
    }
  } catch (e) {
    console.warn('Erro ao carregar intervalo equipes:', e);
  }
}

// ============================================================
// BÔNUS DE VELOCIDADE
// ============================================================
export async function carregarConfigBonusVelocidade() {
  try {
    const snap = await db.ref(BONUS_VELOCIDADE_KEY).once('value');
    const config = snap.val();
    if (config) {
      state.bonusVelocidadeConfig = {
        ativo: config.ativo !== undefined ? config.ativo : true,
        pontos: config.pontos || 1,
        precisaoMinima: config.precisaoMinima || 80
      };
    } else {
      await db.ref(BONUS_VELOCIDADE_KEY).set(state.bonusVelocidadeConfig);
    }
  } catch (e) {
    console.warn('Erro ao carregar config de bônus:', e);
  }
}

export async function salvarConfigBonusVelocidade(ativo, pontos, precisaoMinima) {
  try {
    const config = { ativo, pontos, precisaoMinima };
    await db.ref(BONUS_VELOCIDADE_KEY).set(config);
    state.bonusVelocidadeConfig = config;
    exibirToast('✅ Bônus de velocidade salvo!', 'sucesso');
  } catch (e) {
    console.error('Erro ao salvar bônus:', e);
    exibirToast('❌ Erro ao salvar bônus.', 'erro');
  }
}

// ============================================================
// RECORDE GERAL
// ============================================================
export async function carregarRecordeGeral() {
  try {
    const snap = await db.ref(RECORDE_GERAL_KEY).once('value');
    state.recordeGeral = snap.val() || null;
  } catch (e) {
    console.warn('Erro ao carregar recorde geral:', e);
  }
}

export async function atualizarRecordeGeral(jogadorId, velocidade, precisao, fase, partidaIndex) {
  try {
    if (!jogadorId || velocidade <= 0) return false;
    if (precisao < state.bonusVelocidadeConfig.precisaoMinima) return false;
    let recorde = state.recordeGeral;
    if (!recorde || velocidade < recorde.velocidade) {
      let nome = 'Anônimo', turma = '?';
      for (let f = fase; f >= 1; f--) {
        if (state.estadoAtual?.participantes?.[f]?.[jogadorId]) {
          nome = state.estadoAtual.participantes[f][jogadorId].nome || nome;
          turma = state.estadoAtual.participantes[f][jogadorId].turma || turma;
          break;
        }
      }
      const novoRecorde = { jogadorId, velocidade, precisao, fase, partidaIndex, nome, turma, timestamp: Date.now() };
      await db.ref(RECORDE_GERAL_KEY).set(novoRecorde);
      state.recordeGeral = novoRecorde;
      exibirToast(`🚀 NOVO RECORDE DE VELOCIDADE! ${nome} com ${velocidade.toFixed(2)}s por pergunta!`, 'sucesso');
      return true;
    }
    return false;
  } catch (e) {
    console.warn('Erro ao atualizar recorde geral:', e);
    return false;
  }
}

// ============================================================
// VALOR DA PARTIDA
// ============================================================
export async function carregarValorPartida() {
  try {
    const snap = await db.ref(VALOR_PARTIDA_KEY).once('value');
    state.VALOR_PARTIDA = snap.val() || 2000;
  } catch (e) {
    state.VALOR_PARTIDA = 2000;
    console.warn('Erro ao carregar valor da partida, usando padrão:', e);
  }
}

export async function salvarValorPartida(novoValor) {
  try {
    await db.ref(VALOR_PARTIDA_KEY).set(novoValor);
    state.VALOR_PARTIDA = novoValor;
    exibirToast(`✅ Valor da partida atualizado para ${novoValor}`, 'sucesso');
  } catch (e) {
    console.error('Erro ao salvar valor da partida:', e);
    exibirToast('❌ Erro ao salvar valor.', 'erro');
  }
}

// ============================================================
// MÍNIMO DE PARTIDAS
// ============================================================
export async function carregarMinPartidas() {
  try {
    const snap = await db.ref(MIN_PARTIDAS_KEY).once('value');
    let config = snap.val();
    if (!config || Object.keys(config).length === 0) {
      config = {};
      for (let i = 1; i <= 5; i++) config[i] = 5;
      await db.ref(MIN_PARTIDAS_KEY).set(config);
    }
    return config;
  } catch (e) {
    console.warn('Erro ao carregar min partidas, usando padrão:', e);
    const config = {};
    for (let i = 1; i <= 5; i++) config[i] = 5;
    return config;
  }
}

export async function salvarMinPartidas() {
  try {
    const config = {};
    for (let i = 1; i <= 5; i++) {
      const input = document.getElementById(`min-partidas-fase-${i}`);
      if (input) {
        const val = parseInt(input.value);
        if (isNaN(val) || val < 1) {
          exibirToast(`❌ Valor inválido para Fase ${i}. Mínimo 1.`, 'erro');
          return;
        }
        config[i] = val;
      } else {
        config[i] = 5;
      }
    }
    await db.ref(MIN_PARTIDAS_KEY).set(config);
    exibirToast('✅ Mínimo de partidas salvo com sucesso!', 'sucesso');
  } catch (e) {
    console.error('Erro ao salvar min partidas:', e);
    exibirToast('❌ Erro ao salvar mínimo de partidas.', 'erro');
  }
}

// ============================================================
// COLUNAS VISÍVEIS
// ============================================================
export async function carregarColunasVisiveis() {
  try {
    const snap = await db.ref(COLUNAS_KEY).once('value');
    state.colunasVisiveis = snap.val() || {};
    state.prefColunasVisiveis = state.colunasVisiveis;
    setCacheItem('preferencias.colunasVisiveis', state.colunasVisiveis);
  } catch (e) {
    state.colunasVisiveis = {};
    console.warn('Erro ao carregar colunas visíveis:', e);
  }
}

export async function salvarColunasVisiveis() {
  try {
    const config = {};
    const colunasDef = [
      'futPos', 'pontuacaoAtual', 'deltaLider', 'velocRecorde',
      'progresso', 'partidas', 'tempo', 'mediaTempo', 'turma', 'projecaoPontos'
    ];
    colunasDef.forEach(id => {
      const checkbox = document.getElementById(`col-${id}`);
      config[id] = checkbox ? checkbox.checked : true;
    });
    await db.ref(COLUNAS_KEY).set(config);
    state.colunasVisiveis = config;
    state.prefColunasVisiveis = config;
    setCacheItem('preferencias.colunasVisiveis', config);
    exibirToast('✅ Colunas salvas!', 'sucesso');
  } catch (e) {
    console.error('Erro ao salvar colunas:', e);
    exibirToast('❌ Erro ao salvar colunas.', 'erro');
  }
}

// ============================================================
// FUNÇÃO AUXILIAR PARA TABELA DE PONTOS PADRÃO
// ============================================================
export function getPontuacaoDefault() {
  const obj = {};
  for (let i = 1; i <= 40; i++) obj[i] = 41 - i;
  return obj;
}

// ============================================================
// CONFIGURAÇÃO DE PONTOS (CORRIGIDA)
// ============================================================
export async function carregarConfigRankingPontos() {
  try {
    const snapAtivo = await db.ref('copaV2/configuracoes/rankingPontos/ativo').once('value');
    state.rankingPontosAtivo = snapAtivo.val() !== null ? snapAtivo.val() : true;
    
    const snapPadrao = await db.ref('copaV2/configuracoes/rankingPontos/tabelaPadrao').once('value');
    const snapFase5 = await db.ref('copaV2/configuracoes/rankingPontos/tabelaFase5').once('value');
    
    let tabelaPadrao = snapPadrao.val() || {};
    if (Object.keys(tabelaPadrao).length === 0) {
      tabelaPadrao = getPontuacaoDefault();
      await db.ref('copaV2/configuracoes/rankingPontos/tabelaPadrao').set(tabelaPadrao);
    }
    
    let tabelaFase5 = snapFase5.val() || {};
    if (Object.keys(tabelaFase5).length === 0) {
      tabelaFase5 = getPontuacaoDefault();
      await db.ref('copaV2/configuracoes/rankingPontos/tabelaFase5').set(tabelaFase5);
    }
    
    state.tabelaPontosPadrao = tabelaPadrao;
    state.tabelaPontosFase5 = tabelaFase5;
  } catch (e) {
    console.warn('Erro ao carregar configuração de pontos, usando padrão:', e);
    state.tabelaPontosPadrao = getPontuacaoDefault();
    state.tabelaPontosFase5 = getPontuacaoDefault();
  }
}

export async function salvarConfigRankingPontos(ativo, tabelaPadrao, tabelaFase5) {
  try {
    const updates = {};
    updates['copaV2/configuracoes/rankingPontos/ativo'] = ativo;
    updates['copaV2/configuracoes/rankingPontos/tabelaPadrao'] = tabelaPadrao;
    updates['copaV2/configuracoes/rankingPontos/tabelaFase5'] = tabelaFase5;
    await db.ref().update(updates);
    state.rankingPontosAtivo = ativo;
    state.tabelaPontosPadrao = tabelaPadrao;
    state.tabelaPontosFase5 = tabelaFase5;
    exibirToast('✅ Configuração de pontos salva!', 'sucesso');
  } catch (e) {
    console.error('Erro ao salvar config de pontos:', e);
    exibirToast('❌ Erro ao salvar configuração de pontos.', 'erro');
  }
}

// ============================================================
// TURMAS
// ============================================================
export async function adicionarTurma(novaTurma) {
  try {
    const turmas = await lerDados('copaV2/turmas') || [];
    if (!turmas.includes(novaTurma)) {
      turmas.push(novaTurma);
      await setDados('copaV2/turmas', turmas);
      exibirToast(`Turma ${novaTurma} adicionada!`, 'sucesso');
    } else {
      exibirToast('Turma já existe!', 'aviso');
    }
  } catch (e) {
    console.error('Erro ao adicionar turma:', e);
    exibirToast('❌ Erro ao adicionar turma.', 'erro');
  }
}

export async function removerTurma(turma) {
  try {
    let turmas = await lerDados('copaV2/turmas') || [];
    turmas = turmas.filter(t => t !== turma);
    await setDados('copaV2/turmas', turmas);
    exibirToast(`Turma ${turma} removida!`, 'sucesso');
  } catch (e) {
    console.error('Erro ao remover turma:', e);
    exibirToast('❌ Erro ao remover turma.', 'erro');
  }
}
