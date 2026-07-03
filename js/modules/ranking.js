import { state } from './state.js';
import { lerDados } from './db.js';

export function calcularRankingFase(fase) {
  const resultados = state.estadoAtual?.resultados?.[fase] || {};
  const participantes = state.estadoAtual?.participantes?.[fase] || {};
  const temp = state.estadoAtual?.resultados_temp?.[fase] || {};
  const mapa = new Map();

  for (const id in resultados) {
    const partidas = resultados[id];
    if (!partidas || partidas.length === 0) continue;
    const melhor = partidas.sort((a,b) => b.pontos - a.pontos)[0];
    const somaTempo = partidas.reduce((acc, p) => acc + (p.tempo || 0), 0);
    const mediaTempo = partidas.length > 0 ? somaTempo / partidas.length : Infinity;
    let melhorVelocidade = Infinity;
    for (let p of partidas) {
      if (p.acertos > 0 && p.tempo > 0) {
        const vel = p.tempo / p.acertos;
        if (vel < melhorVelocidade) melhorVelocidade = vel;
      }
    }
    if (melhorVelocidade === Infinity) melhorVelocidade = null;
    let nome = participantes[id]?.nome || 'Anônimo';
    let turma = participantes[id]?.turma || '?';
    mapa.set(id, {
      id, nome, turma,
      melhorPontuacao: melhor.pontos,
      totalPartidas: partidas.length,
      mediaTempo,
      melhorVelocidade,
      partidas
    });
  }
  // ... (incluir temp)
  let lista = Array.from(mapa.values());
  lista.sort((a,b) => {
    if (a.melhorPontuacao !== b.melhorPontuacao) return b.melhorPontuacao - a.melhorPontuacao;
    if (a.totalPartidas !== b.totalPartidas) return b.totalPartidas - a.totalPartidas;
    if (a.mediaTempo !== b.mediaTempo) return a.mediaTempo - b.mediaTempo;
    return a.nome.localeCompare(b.nome);
  });
  return lista;
}

// Renderizar ranking (função simplificada)
export async function renderizarRanking(fase, containerId, tipo = 'individual') {
  if (!state.estadoAtual) return;
  const container = document.getElementById(containerId);
  if (!container) return;
  const ranking = calcularRankingFase(fase);
  if (ranking.length === 0) {
    container.innerHTML = '<p>⏳ Nenhum resultado registrado ainda.</p>';
    return;
  }
  let html = `<table class="ranking-table"><thead><tr><th>Pos</th><th>Nome</th><th>Melhor Pontuação</th></tr></thead><tbody>`;
  ranking.forEach((j, i) => {
    html += `<tr><td>${i+1}º</td><td>${j.nome}</td><td>${j.melhorPontuacao}</td></tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

// Função para atualizar info do aluno (bolinha, posição)
export async function atualizarInfoAluno() {
  // (código original resumido)
}
