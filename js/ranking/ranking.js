// js/ranking/ranking.js
import { appState } from '../models/state.js';
import { database, resultadosRef, resultadosTempRef } from '../services/firebase-service.js';
import { VAGAS_POR_FASE, TOTAL_FASES } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';

// Cache simples para evitar re-renderizações desnecessárias
const cache = new Map();

export async function renderRankingIndividual(fase, containerId, exibirClassificacao = false) {
  const cacheKey = `ind_${fase}_${exibirClassificacao}`;
  // Verificar se o cache é recente (ex: 2 segundos)
  if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).timestamp < 2000) {
    document.getElementById(containerId).innerHTML = cache.get(cacheKey).html;
    return;
  }

  // Buscar dados do Firebase (resultados finais e temporários)
  const [snapFinal, snapTemp] = await Promise.all([
    resultadosRef(fase).once('value'),
    resultadosTempRef(fase).once('value')
  ]);

  // Processar dados (similar à lógica atual)
  // ... (código de processamento)

  // Gerar HTML
  let html = construirTabelaRanking(lista, fase, exibirClassificacao);
  document.getElementById(containerId).innerHTML = html;
  cache.set(cacheKey, { html, timestamp: Date.now() });
}

export async function renderRankingTurmas(containerId) {
  // Similar, processa todos os resultados por turma
}

function construirTabelaRanking(lista, fase, exibirClassificacao) {
  // Lógica de construção da tabela com as colunas desejadas
}
