import { state } from './state.js';
import { db } from '../config/firebase.js';
import { lerDados, setDados } from './db.js';
import { exibirToast } from './ui.js';

export const NIVEL_ESTRELAS = [
  { min: 0, max: 4, icone: '⭐', nome: 'Aprendiz' },
  { min: 5, max: 14, icone: '🌟', nome: 'Curioso' },
  { min: 15, max: 29, icone: '🌟🌟', nome: 'Dedicado' },
  { min: 30, max: 49, icone: '🌟🌟🌟', nome: 'Esforçado' },
  { min: 50, max: 79, icone: '🌟🌟🌟🌟', nome: 'Notável' },
  { min: 80, max: 119, icone: '🌟🌟🌟🌟🌟', nome: 'Brilhante' },
  { min: 120, max: Infinity, icone: '💎', nome: 'Lenda' }
];

export function getNivelPorEstrelas(total) {
  for (const nivel of NIVEL_ESTRELAS) {
    if (total >= nivel.min && total <= nivel.max) {
      return nivel;
    }
  }
  return NIVEL_ESTRELAS[0];
}

export function getProximoNivel(total) {
  for (const nivel of NIVEL_ESTRELAS) {
    if (total < nivel.min) {
      return { nivel, faltam: nivel.min - total };
    }
  }
  return null;
}

export async function concederEstrelas(alunoId, acao, estrelas, fase, partidaIndex = null) {
  if (!alunoId) return;
  if (estrelas <= 0) return;

  const ref = `copaV2/estrelas/${alunoId}`;
  let dados = await lerDados(ref) || { total: 0, historico: [], flags: {} };

  // Evitar duplicidade de flags
  if (acao === 'avancou_fase') {
    if (dados.flags && dados.flags.avancouFase && dados.flags.avancouFase[fase]) {
      console.log(`⏭️ Aluno ${alunoId} já ganhou estrelas por avançar na fase ${fase}. Ignorando.`);
      return;
    }
  }
  if (acao === 'subiu_ranking') {
    if (dados.flags && dados.flags.subiuRanking && dados.flags.subiuRanking[fase]) {
      console.log(`⏭️ Aluno ${alunoId} já ganhou estrelas por subir na fase ${fase}. Ignorando.`);
      return;
    }
  }
  if (acao === 'recorde_pessoal') {
    if (dados.flags && dados.flags.recordePessoal === true) {
      console.log(`⏭️ Aluno ${alunoId} já ganhou estrelas por recorde pessoal. Ignorando.`);
      return;
    }
  }

  const entrada = {
    acao,
    estrelas,
    timestamp: Date.now(),
    fase,
    partidaIndex: partidaIndex || null
  };
  dados.historico.push(entrada);
  dados.total += estrelas;

  if (!dados.flags) dados.flags = {};
  if (acao === 'avancou_fase') {
    if (!dados.flags.avancouFase) dados.flags.avancouFase = {};
    dados.flags.avancouFase[fase] = true;
  }
  if (acao === 'subiu_ranking') {
    if (!dados.flags.subiuRanking) dados.flags.subiuRanking = {};
    dados.flags.subiuRanking[fase] = true;
  }
  if (acao === 'recorde_pessoal') {
    dados.flags.recordePessoal = true;
  }

  await setDados(ref, dados);

  if (state.alunoId === alunoId) {
    state.estrelas.total = dados.total;
    state.estrelas.historico = dados.historico;
    state.estrelas.flags = dados.flags;
  }

  if (state.alunoId === alunoId) {
    const acaoNome = {
      partida_completa: 'partida completa',
      acertos_18_19: '18 ou 19 acertos',
      acertos_20: 'perfeição (20 acertos)',
      subiu_ranking: 'subiu no ranking',
      avancou_fase: 'avançou de fase',
      recorde_pessoal: 'bateu o recorde pessoal'
    }[acao] || acao;
    exibirToast(`⭐ +${estrelas} estrelas por ${acaoNome}!`, 'sucesso');
  }

  console.log(`⭐ ${estrelas} estrelas concedidas a ${alunoId} por ${acao} (fase ${fase})`);
}
