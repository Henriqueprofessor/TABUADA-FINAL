// Estado global da aplicação
export const state = {
  meuTipo: null,           // 'professor', 'aluno', 'projecao'
  alunoId: null,
  alunoNome: null,
  alunoTurma: null,
  estadoAtual: null,       // snapshot do nó copaV2
  jogoAtivo: false,
  perguntas: [],
  perguntaIdx: 0,
  pontosPartida: 0,
  acertosPartida: 0,
  tempoTotalPartida: 0,
  timerPergunta: null,
  tempoRestantePergunta: 10,
  timerFase: null,
  partidaFinalizada: false,
  posicaoAntesPartida: null,
  // Ranking e configurações
  rankingPontosAtivo: false,
  tabelaPontosPadrao: {},
  tabelaPontosFase5: {},
  bonusVelocidadeConfig: { ativo: true, pontos: 1, precisaoMinima: 80 },
  recordeGeral: null,
  colunasVisiveis: null,
  // Intervalos
  intervaloIndividualSegundos: 4,
  intervaloEquipesSegundos: 60,
  // Outros
  faseSelecionadaProf: 1,
  modoTorcida: 'individual',
  abaTorcidaAtiva: 'fase',
  torcidaId: null,
  faseTorcidaSelecionada: 1,
  atualizacaoRankingAuto: true,
  tempoEsgotadoProcessado: false,
  VALOR_PARTIDA: 2000,
  // Controles de listener
  intervaloTorcidaIndividual: null,
  intervaloTorcidaEquipes: null,
  intervaloRankingProfessor: null,
  intervaloRankingAluno: null,
  intervaloTempoReal: null,
  listenerCopa: null,
  listenerOnline: null,
  // Senha
  senhaBloqueada: false,
};
