import { abrirModal, fecharModal } from './ui.js';

const CONTEUDO_TUTORIAL_ALUNO = {
  objetivo: `<h3>🎯 Seja o grande campeão da Copa Tabuada CEIB 2026!</h3>
    <div class="destaque"><p>A competição tem <strong>5 fases</strong>. Em cada fase, você vai responder <strong>20 perguntas de multiplicação</strong>.</p>
    <p>Quanto mais rápido e certo você responder, <strong>mais pontos</strong> você ganha na partida.</p>
    <p>Você pode jogar <strong>várias partidas</strong> durante o tempo da fase (ex: 10 minutos).</p>
    <p><strong>Sua melhor pontuação</strong> em uma única partida será usada para definir sua posição no ranking da fase.</p></div>
    <h3>📊 Legenda de Desempenho (Cores)</h3>
    <div class="legenda-cores-container">
      <div class="item-legenda"><span class="bolinha-mini bolinha-mini-vermelha"></span> <strong>Vermelho:</strong> Ameaça ao líder / Recorde máximo!</div>
      <div class="item-legenda"><span class="bolinha-mini bolinha-mini-laranja"></span> <strong>Laranja:</strong> Superando seu recorde pessoal.</div>
      <div class="item-legenda"><span class="bolinha-mini bolinha-mini-amarela"></span> <strong>Amarelo:</strong> Abaixo do seu recorde pessoal.</div>
      <div class="item-legenda"><span class="bolinha-mini bolinha-mini-branca"></span> <strong>Branco:</strong> Empate técnico.</div>
      <div class="item-legenda"><span class="bolinha-mini bolinha-mini-cinza"></span> <strong>Cinza:</strong> Sem dados suficientes.</div>
    </div>
    <p>Os <strong>melhores colocados</strong> (ex: os 30 primeiros na Fase 1) <strong>avançam</strong> para a próxima fase.</p>
    <p>Quem chegar à Fase 5 e vencer pode ser o campeão da Copa <strong>ou</strong>, se o professor ativar o <strong>Ranking de Pontos</strong>, o campeão será quem <strong>somar mais pontos</strong> ao longo das 5 fases.</p>`,
  pontuacao: `<h3>📊 Como são calculados os pontos de uma partida?</h3>
    <ul><li>Cada pergunta vale até <strong>100 pontos</strong>, dependendo do tempo que você levou para responder.</li>
    <li>Quanto mais rápido, mais pontos você ganha.</li>
    <li>Se errar ou não responder a tempo, você <strong>não ganha pontos</strong> naquela pergunta.</li></ul>
    <h3>🏅 Qual é a sua posição na fase?</h3>
    <ul><li>A posição é definida pela <strong>maior pontuação</strong> que você fez em <strong>uma única partida</strong>.</li>
    <li>Em caso de empate, o sistema usa: <ol><li><strong>Número de partidas completas</strong> (quem jogou mais).</li>
    <li><strong>Menor tempo médio</strong> por partida.</li>
    <li><strong>Ordem alfabética</strong> (como último critério).</li></ol></li></ul>
    <h3>🚀 Como funciona a classificação para a próxima fase?</h3>
    <ul><li>O professor define um <strong>número mínimo de partidas</strong> (ex: 1) – você precisa jogar pelo menos esse número para ser classificado.</li>
    <li>Os <strong>melhores colocados</strong> (de acordo com o número de vagas da fase) avançam.</li></ul>
    <p>As vagas são:</p><ul><li><span class="badge-fase">Fase 1</span> 30 vagas</li>
    <li><span class="badge-fase">Fase 2</span> 20 vagas</li>
    <li><span class="badge-fase">Fase 3</span> 10 vagas</li>
    <li><span class="badge-fase">Fase 4</span> 5 vagas</li>
    <li><span class="badge-fase">Fase 5</span> 5 finalistas</li></ul>
    <h3>🏆 E o Ranking de Pontos (se ativado)?</h3>
    <ul><li>Se o professor ativar o <strong>Ranking de Pontos</strong>, cada fase também gera <strong>pontos para um ranking geral</strong>.</li>
    <li>A pontuação depende da sua posição na fase: <ul><li>1º lugar → 40 pontos</li><li>2º → 39</li><li>...</li><li>40º → 1 ponto</li><li>A partir do 41º → 0 pontos</li></ul></li>
    <li>As fases 1 a 4 usam a mesma tabela. A Fase 5 pode ter uma tabela diferente (o professor pode ajustar).</li>
    <li>O <strong>campeão geral</strong> será o jogador com o <strong>maior total de pontos</strong> somando todas as fases.</li>
    <li>Em caso de empate, vence quem teve a <strong>melhor posição na Fase 5</strong>.</li></ul>
    <h3>⚡ Bônus de Velocidade e Recorde Geral</h3>
    <ul><li>Em cada fase, o jogador com a <strong>maior velocidade</strong> (tempo médio por pergunta) e que atender à <strong>precisão mínima</strong> (ex: 80% de acertos) ganha um <strong>bônus em pontos</strong> (definido pelo professor).</li>
    <li>Esse bônus aparece no Ranking de Pontos com um <span class="raio-amarelo">⚡</span> amarelo ao lado da pontuação da fase.</li>
    <li>Além disso, o jogador com a <strong>maior velocidade de toda a competição</strong> (recorde geral) recebe um <span class="foguete-vermelho">🚀</span> que aparece na fase em que o recorde foi estabelecido e ao lado do nome em todos os rankings.</li>
    <li>O recorde geral é atualizado em tempo real e o foguete acompanha o detentor.</li></ul>`,
  dicas: `<h3>⚡ Dicas para ser campeão</h3>
    <ol><li><strong>Treine a tabuada</strong> antes de cada fase – revise as operações que vão cair.</li>
    <li><strong>Jogue o máximo de partidas</strong> que conseguir dentro do tempo – cada partida é uma chance de melhorar sua pontuação.</li>
    <li><strong>Foco e velocidade</strong> – responda rápido, mas com atenção para não errar.</li>
    <li><strong>Acompanhe sua posição</strong> no ranking ao vivo – veja se você está no grupo de classificação.</li>
    <li><strong>Não desanime</strong> se perder uma fase – você ainda pode acumular pontos para o Ranking de Pontos (se ativado), e isso pode te levar ao título geral.</li>
    <li><strong>Mantenha a calma</strong> – o tempo é curto, mas a prática leva à perfeição.</li></ol>
    <div class="destaque"><p>💡 <strong>Lembre-se:</strong> a melhor pontuação de uma única partida é o que conta para o ranking da fase. Então, se você fizer uma partida excelente, pode garantir sua vaga!</p></div>`,
  faq: `<h3>❓ Perguntas frequentes</h3>
    <p><strong>Posso jogar mais de uma vez na mesma fase?</strong></p><p>Sim! Você pode jogar quantas partidas quiser durante o tempo da fase. Apenas a <strong>melhor pontuação</strong> conta para o ranking.</p>
    <p><strong>O que acontece se eu não responder todas as 20 perguntas?</strong></p><p>A partida termina quando você responde as 20 perguntas ou quando o tempo de 10 segundos por pergunta acaba. Você ganha pontos apenas pelas perguntas respondidas corretamente.</p>
    <p><strong>Como sei se estou classificado?</strong></p><p>O ranking da fase é atualizado em tempo real. Se você estiver entre os primeiros (ex: Top 30 na Fase 1), você avança.</p>
    <p><strong>O que significa "Projeção" no ranking?</strong></p><p>É uma previsão de quantos pontos você ganharia no Ranking de Pontos se a fase terminasse agora, com base na sua posição atual.</p>
    <p><strong>E se eu perder o acesso ao meu dispositivo?</strong></p><p>Você precisa usar o <strong>mesmo dispositivo</strong> ou o mesmo navegador para manter seu progresso. Se trocar de aparelho, fale com o professor para ser liberado manualmente.</p>
    <p><strong>Onde vejo meu histórico de partidas?</strong></p><p>Na tela do aluno, em "Seu Melhor Resultado" e no histórico logo abaixo.</p>
    <p><strong>Como funciona o desempate no Ranking de Pontos?</strong></p><p>O desempate é pela melhor posição na Fase 5. Se ainda empatar, a ordem alfabética define.</p>
    <p><strong>O que significam os ícones ⚡ e 🚀?</strong></p><p><span class="raio-amarelo">⚡</span> = bônus de velocidade ganho na fase. <span class="foguete-vermelho">🚀</span> = recorde geral de velocidade da competição.</p>`
};

const CONTEUDO_TUTORIAL_TORCIDA = {
  visao: `<h3>📺 Acompanhe a Copa Tabuada CEIB 2026 ao vivo!</h3>
    <div class="destaque"><p>A tela da torcida mostra os <strong>rankings atualizados em tempo real</strong>.</p>
    <p>Você pode alternar entre:</p><ul><li><strong>👤 Ranking Individual</strong>: posição de cada jogador na fase atual (ou em fases anteriores).</li>
    <li><strong>👥 Ranking por Equipes</strong>: média das melhores pontuações dos alunos de cada turma.</li></ul>
    <p>Além disso, há duas <strong>sub-abas</strong>:</p><ul><li><strong>📊 Fase</strong>: mostra o ranking da fase selecionada (com projeção de pontos, se ativado).</li>
    <li><strong>🏆 Pontos</strong>: mostra o ranking geral de pontos acumulados (se o professor ativar essa funcionalidade).</li></ul>
    <p>Os dados são atualizados automaticamente a cada <strong>4 segundos</strong> (ranking individual) e a cada <strong>60 segundos</strong> (ranking por equipes).</p>
    <p><strong>Ícones:</strong> <span class="raio-amarelo">⚡</span> = bônus de velocidade da fase | <span class="foguete-vermelho">🚀</span> = recorde geral de velocidade</p></div>`,
  colunas: `<h3>📊 Como ler o Ranking da Fase</h3><p><strong>Entenda cada coluna do ranking individual:</strong></p>
    <table><thead><tr><th>Coluna</th><th>O que significa</th></tr></thead>
    <tbody><tr><td><strong>Pos</strong></td><td>Posição atual do jogador na fase.</td></tr>
    <tr><td><strong>Nome</strong></td><td>Nome do aluno. Ao lado, <span class="raio-amarelo">⚡</span> (mais rápido da fase) e <span class="foguete-vermelho">🚀</span> (recorde geral).</td></tr>
    <tr><td><strong>Melhor Pontuação</strong></td><td>A maior pontuação que o aluno obteve em <strong>uma única partida</strong> dentro da fase.</td></tr>
    <tr><td><strong>Classificação</strong></td><td>Indica se o jogador está dentro da zona de classificação para a próxima fase (ex: "Top 30").</td></tr>
    <tr><td><strong>Ritmo</strong></td><td>Projeção da posição futura e desempenho com base no ritmo atual (🔴 Líder/Recorde, 🟠 Melhora, 🟡 Estável).</td></tr>
    <tr><td><strong>Pontuação Atual</strong></td><td>Pontuação da partida em andamento (se houver).</td></tr>
    <tr><td><strong>Delta Líder</strong></td><td>Diferença de pontos entre o jogador e o líder da fase.</td></tr>
    <tr><td><strong>Veloc. Recorde</strong></td><td>Melhor tempo médio por acerto (quanto menor, melhor).</td></tr>
    <tr><td><strong>Progresso</strong></td><td>Quantas perguntas o jogador já respondeu na partida atual (de 20).</td></tr>
    <tr><td><strong>Partidas</strong></td><td>Número total de partidas completas pelo jogador na fase.</td></tr>
    <tr><td><strong>Tempo</strong></td><td>Tempo total gasto nas partidas.</td></tr>
    <tr><td><strong>Méd. Temp. Part.</strong></td><td>Tempo médio por partida.</td></tr>
    <tr><td><strong>Turma</strong></td><td>Turma do aluno.</td></tr>
    <tr><td><strong>Projeção</strong></td><td>(se o Ranking de Pontos estiver ativado) Quantos pontos o jogador ganharia se a fase terminasse agora, com base na posição atual.</td></tr></tbody></table>`,
  pontos: `<h3>🏆 Ranking de Pontos (se ativado)</h3>
    <div class="destaque"><p>Se o professor ativar o <strong>Ranking de Pontos</strong>, a torcida terá acesso a uma aba extra.</p>
    <p>Nela, você verá:</p><ul><li><strong>Posição</strong> geral.</li>
    <li><strong>Nome</strong> do jogador.</li>
    <li><strong>Pontuação Geral</strong> (soma de todas as fases).</li>
    <li><strong>Fase 5</strong> a <strong>Fase 1</strong> – a pontuação que o jogador obteve em cada fase, com <span class="raio-amarelo">⚡</span> indicando bônus de velocidade na fase e <span class="foguete-vermelho">🚀</span> indicando a fase onde o recorde geral foi estabelecido.</li></ul>
    <p>O campeão da Copa será o jogador com a <strong>maior pontuação geral</strong>.</p>
    <p>Em caso de empate, vence quem teve a <strong>melhor posição na Fase 5</strong>.</p>
    <p>💡 <em>Esta aba só aparece se o professor ativar a funcionalidade no painel de controle.</em></p></div>`,
  faq: `<h3>❓ FAQ da Torcida</h3>
    <p><strong>Como saber se a atualização está funcionando?</strong></p><p>Observe o campo <strong>"Última atualização"</strong> no topo da tela. Ele mostra o horário da última sincronização.</p>
    <p><strong>O que significa a "Projeção" na coluna?</strong></p><p>É uma previsão de quantos pontos o jogador ganharia no Ranking de Pontos <strong>se a fase terminasse agora</strong>, com base na posição atual.</p>
    <p><strong>Por que alguns jogadores têm "—" em algumas colunas?</strong></p><p>Significa que o dado ainda não está disponível (ex: o jogador não completou nenhuma partida ou não está em jogo no momento).</p>
    <p><strong>Posso ver rankings de fases anteriores?</strong></p><p>Sim! No modo "Ranking Individual", você pode selecionar qualquer fase (1 a 5) no seletor superior.</p>
    <p><strong>O que é o "Ranking por Equipes"?</strong></p><p>Ele calcula a <strong>média das melhores pontuações</strong> de todos os alunos de cada turma, mostrando qual turma está com o melhor desempenho geral.</p>
    <p><strong>O ranking de pontos é obrigatório?</strong></p><p>Não. Ele só aparece se o professor ativar a opção no painel de controle. Se estiver desativado, a aba "🏆 Pontos" não será exibida.</p>
    <p><strong>O que significam os ícones ⚡ e 🚀?</strong></p><p><span class="raio-amarelo">⚡</span> = bônus de velocidade da fase | <span class="foguete-vermelho">🚀</span> = recorde geral de velocidade.</p>`
};

export function abrirTutorial(tipo) {
  const modal = document.getElementById('modal-tutorial');
  const titulo = document.getElementById('tutorial-titulo');
  const tabsContainer = document.getElementById('tutorial-tabs');
  if (!modal) return;
  if (tipo === 'aluno') {
    titulo.innerText = '📘 Tutorial - Aluno';
    tabsContainer.innerHTML = `
      <div class="sub-tab active" data-tab-tut="objetivo">🎯 Objetivo</div>
      <div class="sub-tab" data-tab-tut="pontuacao">📊 Pontuação + Bônus</div>
      <div class="sub-tab" data-tab-tut="dicas">⚡ Dicas</div>
      <div class="sub-tab" data-tab-tut="faq">❓ FAQ</div>
    `;
    mostrarAbaTutorial('objetivo', CONTEUDO_TUTORIAL_ALUNO);
  } else if (tipo === 'torcida') {
    titulo.innerText = '📘 Tutorial - Torcida';
    tabsContainer.innerHTML = `
      <div class="sub-tab active" data-tab-tut="visao">📺 Visão Geral</div>
      <div class="sub-tab" data-tab-tut="colunas">📊 Colunas</div>
      <div class="sub-tab" data-tab-tut="pontos">🏆 Pontos</div>
      <div class="sub-tab" data-tab-tut="faq">❓ FAQ</div>
    `;
    mostrarAbaTutorial('visao', CONTEUDO_TUTORIAL_TORCIDA);
  }
  modal.style.display = 'flex';
  document.querySelectorAll('[data-tab-tut]').forEach(tab => {
    tab.addEventListener('click', function() {
      const aba = this.dataset.tabTut;
      const conteudo = tipo === 'aluno' ? CONTEUDO_TUTORIAL_ALUNO : CONTEUDO_TUTORIAL_TORCIDA;
      mostrarAbaTutorial(aba, conteudo);
    });
  });
}

function mostrarAbaTutorial(aba, conteudo) {
  const container = document.getElementById('tut-conteudo');
  if (!container) return;
  container.innerHTML = conteudo[aba] || '<p>Conteúdo não encontrado.</p>';
  document.querySelectorAll('[data-tab-tut]').forEach(el => {
    el.classList.remove('active');
    if (el.dataset.tabTut === aba) el.classList.add('active');
  });
}

export function fecharTutorial() {
  const modal = document.getElementById('modal-tutorial');
  if (modal) modal.style.display = 'none';
}
