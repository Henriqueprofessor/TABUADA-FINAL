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
// INTERVALOS DE ATUALIZAÇÃO (item 3)
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
    // mantém o padrão (4s)
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
    // mantém o padrão (60s)
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
  } catch (e) {}
}

export async function salvarConfigBonusVelocidade(ativo, pontos, precisaoMinima) {
  const config = { ativo, pontos, precisaoMinima };
  await db.ref(BONUS_VELOCIDADE_KEY).set(config);
  state.bonusVelocidadeConfig = config;
  exibirToast('✅ Bônus de velocidade salvo!');
}

// ============================================================
// RECORDE GERAL
// ============================================================
export async function carregarRecordeGeral() {
  try {
    const snap = await db.ref(RECORDE_GERAL_KEY).once('value');
    state.recordeGeral = snap.val() || null;
  } catch (e) {}
}

export async function atualizarRecordeGeral(jogadorId, velocidade, precisao, fase, partidaIndex) {
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
    exibirToast(`🚀 NOVO RECORDE DE VELOCIDADE! ${nome} com ${velocidade.toFixed(2)}s por pergunta!`);
    return true;
  }
  return false;
}

// ============================================================
// VALOR DA PARTIDA
// ============================================================
export async function carregarValorPartida() {
  try {
    const snap = await db.ref(VALOR_PARTIDA_KEY).once('value');
    state.VALOR_PARTIDA = snap.val() || 2000;
  } catch (e) { state.VALOR_PARTIDA = 2000; }
}

export async function salvarValorPartida(novoValor) {
  await db.ref(VALOR_PARTIDA_KEY).set(novoValor);
  state.VALOR_PARTIDA = novoValor;
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
    const config = {};
    for (let i = 1; i <= 5; i++) config[i] = 5;
    return config;
  }
}

export async function salvarMinPartidas() {
  const config = {};
  for (let i = 1; i <= 5; i++) {
    const input = document.getElementById(`min-partidas-fase-${i}`);
    if (input) {
      const val = parseInt(input.value);
      if (isNaN(val) || val < 1) {
        exibirToast(`❌ Valor inválido para Fase ${i}. Mínimo 1.`);
        return;
      }
      config[i] = val;
    } else {
      config[i] = 5;
    }
  }
  try {
    await db.ref(MIN_PARTIDAS_KEY).set(config);
    exibirToast('✅ Mínimo de partidas salvo com sucesso!');
  } catch (e) {
    exibirToast('❌ Erro ao salvar mínimo de partidas.');
    console.error(e);
  }
}

// ============================================================
// COLUNAS VISÍVEIS
// ============================================================
export async function carregarColunasVisiveis() {
  try {
    const snap = await db.ref(COLUNAS_KEY).once('value');
    state.colunasVisiveis = snap.val() || {};
  } catch (e) { state.colunasVisiveis = {}; }
}

export async function salvarColunasVisiveis() {
  const config = {};
  const colunasDef = [
    'futPos', 'pontuacaoAtual', 'deltaLider', 'velocRecorde',
    'progresso', 'partidas', 'tempo', 'mediaTempo', 'turma', 'projecaoPontos'
  ];
  colunasDef.forEach(id => {
    const checkbox = document.getElementById(`col-${id}`);
    config[id] = checkbox ? checkbox.checked : true;
  });
  try {
    await db.ref(COLUNAS_KEY).set(config);
    state.colunasVisiveis = config;
    exibirToast('✅ Colunas salvas!');
  } catch (e) {
    exibirToast('❌ Erro ao salvar colunas.');
    console.error(e);
  }
}

// ============================================================
// CONFIGURAÇÃO DE PONTOS
// ============================================================
export async function carregarConfigRankingPontos() {
  try {
    const snapAtivo = await db.ref('copaV2/configuracoes/rankingPontos/ativo').once('value');
    state.rankingPontosAtivo = snapAtivo.val() !== null ? snapAtivo.val() : true;
    const snapPadrao = await db.ref('copaV2/configuracoes/rankingPontos/tabelaPadrao').once('value');
    const snapFase5 = await db.ref('copaV2/configuracoes/rankingPontos/tabelaFase5').once('value');
    state.tabelaPontosPadrao = snapPadrao.val() || {};
    state.tabelaPontosFase5 = snapFase5.val() || {};
  } catch (e) {}
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
    exibirToast('✅ Configuração de pontos salva!');
  } catch (e) {
    exibirToast('❌ Erro ao salvar configuração de pontos.');
    console.error(e);
  }
}

// ============================================================
// TURMAS
// ============================================================
export async function adicionarTurma(novaTurma) {
  const turmas = await lerDados('copaV2/turmas') || [];
  if (!turmas.includes(novaTurma)) {
    turmas.push(novaTurma);
    await setDados('copaV2/turmas', turmas);
    exibirToast(`Turma ${novaTurma} adicionada!`);
  } else {
    exibirToast("Turma já existe!");
  }
}

export async function removerTurma(turma) {
  let turmas = await lerDados('copaV2/turmas') || [];
  turmas = turmas.filter(t => t !== turma);
  await setDados('copaV2/turmas', turmas);
  exibirToast(`Turma ${turma} removida!`);
}
