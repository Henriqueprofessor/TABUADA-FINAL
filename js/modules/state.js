export const state = {
  meuTipo: null,
  alunoId: null,
  alunoNome: null,
  alunoTurma: null,
  estadoAtual: null,
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
  rankingPontosAtivo: false,
  tabelaPontosPadrao: {},
  tabelaPontosFase5: {},
  bonusVelocidadeConfig: { ativo: true, pontos: 1, precisaoMinima: 80 },
  recordeGeral: null,
  colunasVisiveis: null,
  intervaloIndividualSegundos: 4,
  intervaloEquipesSegundos: 60,
  faseSelecionadaProf: 1,
  modoTorcida: 'individual',
  abaTorcidaAtiva: 'fase',
  torcidaId: null,
  faseTorcidaSelecionada: 1,
  atualizacaoRankingAuto: true,
  tempoEsgotadoProcessado: false,
  VALOR_PARTIDA: 2000,
  intervaloTorcidaIndividual: null,
  intervaloTorcidaEquipes: null,
  intervaloRankingProfessor: null,
  intervaloRankingAluno: null,
  intervaloTempoReal: null,
  listenerCopa: null,
  listenerOnline: null,
  senhaBloqueada: false,
  carregando: true,
  historicoPerguntas: [],

  // ===== FEEDBACK VISUAL (separado) =====
  tempoFeedbackAcerto: 0.5,
  tempoFeedbackErro: 0.5,

  // Cache
  senhaFase1: null,
  exigirSenhaFase1: true,
  modalidadeCache: null,
  tempoFaseCache: null,
  alunoNomeCache: null,
  alunoTurmaCache: null,
  alunoDeviceId: null,
  prefProfessorAba: 'controle',
  prefTorcidaModo: 'individual',
  prefTorcidaSubAba: 'fase',
  prefTorcidaFase: 1,
  prefColunasVisiveis: {},
  cacheVersao: '2.0.0',
  ultimaSincCache: null,

  // Aviso
  avisoAtual: null,
  listenerAviso: null,

  // ===== SISTEMA DE ESTRELAS =====
  estrelas: {
    total: 0,
    historico: [],
    flags: {
      avancouFase: {},
      subiuRanking: {},
      recordePessoal: false
    }
  },
  configEstrelas: {
    acoes: {
      partida_completa: 1,
      acertos_18_19: 2,
      acertos_20: 5,
      subiu_ranking: 3,
      avancou_fase: 10,
      recorde_pessoal: 4
    },
    visibilidade: 'todos'
  }
};
