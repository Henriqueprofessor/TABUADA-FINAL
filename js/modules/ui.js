import { state } from './state.js';
import { getNivelPorEstrelas, getProximoNivel } from './estrelas.js';
import { carregarMedalhasLocal } from './medals.js';

// ===== CONTROLE DE TELA =====
export function mostrarTela(tipo) {
  document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
  if (tipo === 'professor') document.getElementById('painel-professor').classList.remove('hidden');
  else if (tipo === 'aluno') document.getElementById('tela-aluno').classList.remove('hidden');
  else if (tipo === 'projecao') document.getElementById('tela-torcida').classList.remove('hidden');
  else {
    document.querySelectorAll('.card').forEach(c => c.classList.remove('hidden'));
    document.getElementById('tela-aluno')?.classList.add('hidden');
    document.getElementById('painel-professor')?.classList.add('hidden');
    document.getElementById('tela-torcida')?.classList.add('hidden');
  }
}

// ===== TOAST =====
export function exibirToast(mensagem, tipo = 'info') {
  const t = document.getElementById('toast');
  if (t) {
    t.innerText = mensagem;
    t.classList.remove('hidden');
    if (tipo === 'erro') {
      t.style.background = '#c0392b';
    } else if (tipo === 'sucesso') {
      t.style.background = '#27ae60';
    } else if (tipo === 'aviso') {
      t.style.background = '#f39c12';
    } else {
      t.style.background = '#e67e22';
    }
    setTimeout(() => {
      t.classList.add('hidden');
      t.style.background = '';
    }, 3000);
  }
}

export function exibirToastReconexao() {
  const t = document.getElementById('toast');
  if (t) {
    t.innerText = '🔄 Conexão restaurada! Dados sincronizados.';
    t.classList.remove('hidden');
    t.style.background = '#2e7d32';
    setTimeout(() => {
      t.classList.add('hidden');
      t.style.background = '';
    }, 4000);
  }
}

// ===== TIMER =====
export function atualizarTimerFase(milissegundos) {
  const segundos = Math.floor(milissegundos / 1000);
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
  const timerDisplay = document.getElementById('timer-fase');
  const torcidaTimer = document.getElementById('torcida-timer');
  const alunoTimer = document.getElementById('timer-fase-aluno');
  if (timerDisplay) timerDisplay.innerText = timeStr;
  if (torcidaTimer) torcidaTimer.innerText = timeStr;
  if (alunoTimer) {
    alunoTimer.innerText = `⏱️ Tempo: ${timeStr}`;
    if (segundos < 60) alunoTimer.classList.add('urgente');
    else alunoTimer.classList.remove('urgente');
  }
}

// ===== MODAL =====
export function abrirModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    const focusable = modal.querySelector('input, button:not([disabled])');
    if (focusable) focusable.focus();
  }
}

export function fecharModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
}

export function atualizarDisplayVersao(versao) {
  const el = document.getElementById('version-number');
  if (el) el.textContent = versao || '--';
}

// ===== BADGE DE CONEXÃO =====
export function createConnectionBadge() {
  let badge = document.getElementById('connection-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'connection-badge';
    badge.className = 'connection-badge offline';
    badge.innerHTML = '⚡ Conectando...';
    document.body.prepend(badge);
  }
  return badge;
}

export function updateConnectionBadge(online) {
  const badge = createConnectionBadge();
  if (online) {
    badge.className = 'connection-badge online';
    badge.innerHTML = '🟢 Conectado';
  } else {
    badge.className = 'connection-badge offline';
    badge.innerHTML = '🔴 Desconectado';
  }
}

export function initConnectionUI(onConnectionChangeCallback) {
  createConnectionBadge();
  onConnectionChangeCallback(updateConnectionBadge);
}

// ===== OVERLAY DE CARREGAMENTO =====
export function mostrarCarregando() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('hidden');
  }
  state.carregando = true;
}

export function esconderCarregando() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
  state.carregando = false;
}

export function exibirErroCarregamento() {
  const errorEl = document.getElementById('loading-error');
  if (errorEl) {
    errorEl.classList.remove('hidden');
  }
}

// ===== CONTROLE DE TEMA =====
const TEMA_KEY = 'copa_theme';

export function aplicarTema() {
  let tema = localStorage.getItem(TEMA_KEY);
  if (!tema) {
    tema = 'tema-escuro';
    localStorage.setItem(TEMA_KEY, tema);
  }
  document.body.className = tema;
  atualizarIconeTema(tema);
  carregarCorPrimaria();
}

export function alternarTema() {
  const atual = document.body.className;
  const novoTema = atual === 'tema-escuro' ? 'tema-claro' : 'tema-escuro';
  document.body.className = novoTema;
  localStorage.setItem(TEMA_KEY, novoTema);
  atualizarIconeTema(novoTema);
  carregarCorPrimaria();
}

function atualizarIconeTema(tema) {
  const btn = document.getElementById('btn-tema');
  if (!btn) return;
  if (tema === 'tema-escuro') {
    btn.textContent = '☀️';
    btn.title = 'Alternar para tema claro';
  } else {
    btn.textContent = '🌙';
    btn.title = 'Alternar para tema escuro';
  }
}

// ===== COR PRIMÁRIA =====
const COR_PRIMARIA_KEY = 'copa_cor_primaria';

export const CORES_DISPONIVEIS = {
  '#3b82f6': { nome: 'Azul', icone: '🔵' },
  '#22c55e': { nome: 'Verde', icone: '🟢' },
  '#8b5cf6': { nome: 'Roxo', icone: '🟣' },
  '#ef4444': { nome: 'Vermelho', icone: '🔴' },
  '#f59e0b': { nome: 'Laranja', icone: '🟠' },
  '#eab308': { nome: 'Amarelo', icone: '🟡' },
  '#ec4899': { nome: 'Rosa', icone: '🩷' },
  '#64748b': { nome: 'Cinza', icone: '⚫' }
};

export function carregarCorPrimaria() {
  let cor = localStorage.getItem(COR_PRIMARIA_KEY);
  if (!cor) {
    cor = '#3b82f6';
    localStorage.setItem(COR_PRIMARIA_KEY, cor);
  }
  aplicarCorPrimaria(cor);
  document.querySelectorAll('.btn-cor').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.cor === cor);
  });
}

export function aplicarCorPrimaria(cor) {
  localStorage.setItem(COR_PRIMARIA_KEY, cor);
  document.documentElement.style.setProperty('--cor-primaria', cor);
  document.querySelectorAll('.btn-cor').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.cor === cor);
  });
}

export function definirCorPrimaria(cor) {
  if (!CORES_DISPONIVEIS[cor]) return;
  aplicarCorPrimaria(cor);
  exibirToast(`🎨 Cor alterada para ${CORES_DISPONIVEIS[cor].nome}!`, 'sucesso');
}

// ===== BANNER DE AVISO =====
export function atualizarBannerAviso(aviso) {
  if (!aviso || !aviso.mensagem) {
    const banner = document.getElementById('banner-aviso');
    if (banner) banner.remove();
    return;
  }

  let banner = document.getElementById('banner-aviso');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'banner-aviso';
    banner.className = 'banner-aviso';
    document.body.prepend(banner);
  }

  banner.innerHTML = `
    <span class="banner-aviso-icone">📢</span>
    <span class="banner-aviso-texto">${aviso.mensagem}</span>
  `;
}

// ============================================================
// MODAL DE RESULTADOS PÓS-PARTIDA (COM ABAS)
// ============================================================
export function exibirModalResultados(dados) {
  const {
    posicao, posicaoAnterior, pontos, acertos, tempoTotal,
    ultimaPartida, fase, totalPartidas, ranking, id, nome, turma,
    historico, estrelasGanhas = {}, evolucao = null
  } = dados;

  const tempoMedio = acertos > 0 ? tempoTotal / acertos : 0;
  const precisao = (acertos / 20) * 100;

  // ====== MENSAGEM MOTIVACIONAL (RESUMO) ======
  let mensagem = '';
  let mensagemEmoji = '';
  if (posicao === 1) {
    mensagem = '🏆 VOCÊ É O LÍDER! Continue assim para manter a coroa!';
    mensagemEmoji = '👑';
  } else if (posicao <= 3) {
    mensagem = '🥇 Você está no pódio! O topo está logo ali.';
    mensagemEmoji = '🚀';
  } else if (posicao <= 10) {
    mensagem = '🔥 Você está no Top 10! Continue pressionando!';
    mensagemEmoji = '💪';
  } else {
    mensagem = '🔄 Consistência é a chave. Continue firme!';
    mensagemEmoji = '🔄';
  }

  // Se evoluiu, complementa
  let mensagemEvolucao = '';
  if (evolucao && evolucao.pontos && evolucao.pontos.delta > 0) {
    mensagemEvolucao = `📈 Você melhorou ${evolucao.pontos.delta} pontos em relação à última partida!`;
  } else if (evolucao && evolucao.pontos && evolucao.pontos.delta < 0) {
    mensagemEvolucao = `😅 Você perdeu ${Math.abs(evolucao.pontos.delta)} pontos. A próxima será melhor!`;
  }

  // ====== ESTRELAS GANHAS (RESUMO) ======
  const acoesLabels = {
    partida_completa: 'Partida completa',
    acertos_18_19: '18 ou 19 acertos',
    acertos_20: 'Perfeição (20 acertos)',
    subiu_ranking: 'Subiu no ranking',
    avancou_fase: 'Avançou de fase',
    recorde_pessoal: 'Recorde pessoal'
  };
  const estrelasLista = Object.entries(estrelasGanhas)
    .filter(([_, qtd]) => qtd > 0)
    .map(([acao, qtd]) => `${acoesLabels[acao] || acao}: +${qtd}⭐`);

  // ====== BADGES RÁPIDOS ======
  const badges = [];
  if (tempoMedio < 1.5 && acertos > 0) badges.push('⚡ Velocista');
  if (precisao === 100) badges.push('🎯 Perfeição');
  if (acertos >= 18) badges.push(`🔥 ${acertos} acertos`);
  if (posicao === 1) badges.push('👑 Líder');
  if (evolucao && evolucao.pontos && evolucao.pontos.delta > 50) badges.push('📈 Evolução forte');

  // ====== DICA RÁPIDA ======
  let dicaRapida = '';
  if (historico && historico.length > 0) {
    const erros = historico.filter(h => !h.acertou);
    if (erros.length > 0) {
      // Contar frequência de cada operação errada
      const freq = {};
      erros.forEach(e => {
        const op = e.pergunta || '';
        if (op) freq[op] = (freq[op] || 0) + 1;
      });
      const maisFreq = Object.entries(freq).sort((a,b) => b[1] - a[1])[0];
      if (maisFreq) {
        dicaRapida = `💡 Dica: Treine a operação "${maisFreq[0]}" – você errou ${maisFreq[1]} vez(es) nesta partida.`;
      }
    }
  }
  if (!dicaRapida && acertos < 15) {
    dicaRapida = '💡 Dica: Respire fundo e leia cada pergunta com calma.';
  } else if (!dicaRapida) {
    dicaRapida = '💡 Continue assim! Você está no caminho certo.';
  }

  // ============================================================
  // CONTEÚDO DAS ABAS (RESUMO, EVOLUÇÃO, ANÁLISE, CONQUISTAS)
  // ============================================================

  // ===== ABA RESUMO (ENXUTA) =====
  const vagas = state.VAGAS_POR_FASE?.[fase] || 30;
  const minPartidas = state.minPartidasPorFase?.[fase] || 1;
  const dentroVagas = posicao <= vagas && totalPartidas >= minPartidas;
  let statusVaga = '';
  if (dentroVagas) {
    statusVaga = `✅ Zona de classificação (Top ${vagas})!`;
  } else if (posicao > vagas) {
    const diff = posicao - vagas;
    statusVaga = `🎯 Faltam ${diff} para o Top ${vagas}!`;
  } else {
    statusVaga = `📋 Faltam ${minPartidas - totalPartidas} partida(s) para ser elegível.`;
  }

  const resumoHtml = `
    <div class="mensagem-personalizada" style="margin-bottom: 8px;">
      <span class="emoji">${mensagemEmoji}</span> ${mensagem}
      ${mensagemEvolucao ? `<br><span style="font-size: 16px;">${mensagemEvolucao}</span>` : ''}
    </div>
    <div class="resumo-rapido">
      <span class="badge-rapido">🏆 <span class="destaque">${posicao}º</span> lugar</span>
      <span class="badge-rapido">⭐ <span class="destaque">${pontos}</span> pts</span>
      <span class="badge-rapido">✅ <span class="destaque">${acertos}/20</span></span>
      <span class="badge-rapido">⚡ <span class="destaque">${tempoMedio > 0 ? tempoMedio.toFixed(2) + 's' : '--'}</span></span>
      ${badges.map(b => `<span class="badge-rapido" style="background: #3b82f622; border:1px solid #3b82f644;">${b}</span>`).join('')}
    </div>
    ${estrelasLista.length > 0 ? `<div class="estrelas-ganhas-rapido">${estrelasLista.map(s => `<span class="estrela-item">⭐ ${s}</span>`).join('')}</div>` : ''}
    <div style="margin: 8px 0;">
      <span style="color: var(--texto-secundario); font-size: 14px;">${statusVaga}</span>
    </div>
    <div style="margin: 6px 0; padding: 8px 12px; background: var(--bg-card-hover); border-radius: 8px; border-left: 3px solid #3b82f6;">
      <span style="font-size: 14px; color: var(--texto-secundario);">${dicaRapida}</span>
    </div>
  `;

  // ===== ABA EVOLUÇÃO =====
  let evolucaoHtml = '';
  if (evolucao && totalPartidas >= 2) {
    const p = evolucao;
    const variacaoClasse = (delta) => delta > 0 ? 'positiva' : delta < 0 ? 'negativa' : 'neutra';
    const variacaoSinal = (delta) => delta > 0 ? '+' : '';
    const evolGrid = `
      <div class="evolucao-grid">
        <div class="evolucao-item">
          <div class="rotulo">📊 Pontos</div>
          <div class="valor-atual">${p.pontos.atual}</div>
          <div class="variacao ${variacaoClasse(p.pontos.delta)}">${variacaoSinal(p.pontos.delta)}${p.pontos.delta}</div>
        </div>
        <div class="evolucao-item">
          <div class="rotulo">✅ Acertos</div>
          <div class="valor-atual">${p.acertos.atual}</div>
          <div class="variacao ${variacaoClasse(p.acertos.delta)}">${variacaoSinal(p.acertos.delta)}${p.acertos.delta}</div>
        </div>
        <div class="evolucao-item">
          <div class="rotulo">⚡ Tempo médio</div>
          <div class="valor-atual">${p.tempoMedio.atual.toFixed(2)}s</div>
          <div class="variacao ${p.tempoMedio.delta < 0 ? 'positiva' : 'negativa'}">${p.tempoMedio.delta < 0 ? '−' : '+'}${Math.abs(p.tempoMedio.delta).toFixed(2)}s</div>
        </div>
        <div class="evolucao-item">
          <div class="rotulo">🎯 Precisão</div>
          <div class="valor-atual">${p.precisao.atual}%</div>
          <div class="variacao ${variacaoClasse(p.precisao.delta)}">${variacaoSinal(p.precisao.delta)}${p.precisao.delta}%</div>
        </div>
      </div>
    `;

    // Projeção
    let projecaoHtml = '';
    if (evolucao.projecao) {
      projecaoHtml = `
        <div class="projecao-box">
          <div>
            <div class="projecao-label">🔮 Projeção para a próxima partida</div>
            <div class="projecao-valor">~${Math.round(evolucao.projecao.pontos)} pts</div>
            <div class="projecao-detalhe">${evolucao.projecao.acertos} acertos estimados</div>
          </div>
          <div style="font-size: 14px; color: var(--texto-secundario);">
            ${evolucao.projecao.acertos >= 20 ? '🎯 Busque a perfeição!' : '💪 Continue evoluindo!'}
          </div>
        </div>
      `;
    }

    // Recordes batidos
    let recordesHtml = '';
    if (evolucao.recordes && evolucao.recordes.length > 0) {
      recordesHtml = `
        <div class="recordes-lista">
          ${evolucao.recordes.map(r => `<span class="recorde-item novo">${r}</span>`).join('')}
        </div>
      `;
    }

    evolucaoHtml = `
      <h4 style="margin: 0 0 8px 0;">📈 Evolução (Partida ${totalPartidas-1} → Partida ${totalPartidas})</h4>
      ${evolGrid}
      ${recordesHtml}
      ${projecaoHtml}
      <div style="margin-top: 8px; font-size: 13px; color: var(--texto-secundario);">
        <canvas id="grafico-evolucao-modal" width="600" height="150" style="width:100%; height:auto; max-width:600px; background: transparent;"></canvas>
      </div>
    `;
  } else {
    evolucaoHtml = `
      <div style="text-align:center; padding:20px; color: var(--texto-secundario);">
        <p>📊 Jogue mais partidas para ver sua evolução!</p>
        <p style="font-size: 14px;">Acompanhe seu progresso comparando partidas.</p>
      </div>
    `;
  }

  // ===== ABA ANÁLISE =====
  let errosHtml = '';
  let padroesHtml = '';
  let recomendacoesHtml = '';

  if (historico && historico.length > 0) {
    const erros = historico.filter(h => !h.acertou);
    if (erros.length > 0) {
      // Lista de erros
      errosHtml = `
        <div class="bloco">
          <div class="bloco-titulo">❌ Erros na partida (${erros.length})</div>
          <ul class="lista-erros">
            ${erros.map(e => `
              <li>
                <span class="pergunta">${escapeHtml(e.pergunta)}</span>
                <span>Escolheu: <span class="resposta-errada">${escapeHtml(e.respostaEscolhida)}</span></span>
                <span>Correto: <span class="resposta-correta">${escapeHtml(e.respostaCorreta)}</span></span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;

      // Padrões de erro (frequência por operação)
      const freq = {};
      erros.forEach(e => {
        const op = e.pergunta || '';
        if (op) freq[op] = (freq[op] || 0) + 1;
      });
      const freqSorted = Object.entries(freq).sort((a,b) => b[1] - a[1]);
      if (freqSorted.length > 0) {
        padroesHtml = `
          <div class="bloco">
            <div class="bloco-titulo">🧩 Padrões de erro</div>
            <div class="padroes-erro-container">
              ${freqSorted.map(([op, count]) => `
                <div class="padrao-erro-item">
                  <span class="operacao">${escapeHtml(op)}</span>
                  <span class="status repetido">Errou ${count} vez(es)</span>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      // Recomendações
      const opsMaisErradas = freqSorted.slice(0, 2).map(([op]) => op);
      if (opsMaisErradas.length > 0) {
        recomendacoesHtml = `
          <div class="bloco">
            <div class="bloco-titulo">💡 Recomendações</div>
            <div class="recomendacao-box">
              <div class="recomendacao-titulo">🎯 Foco nas operações que você errou</div>
              <div class="recomendacao-texto">
                Você errou ${opsMaisErradas.join(' e ')}. Que tal treinar essas tabuadas com flashcards ou jogos?
                ${precisao < 70 ? 'Tente responder com mais calma e revisar as contas antes de confirmar.' : ''}
                ${tempoMedio > 2.5 ? 'Tente responder mais rápido – confie na sua intuição!' : ''}
              </div>
            </div>
          </div>
        `;
      }
    } else {
      errosHtml = `<div class="bloco"><div class="bloco-titulo">✅ Nenhum erro! Parabéns!</div></div>`;
    }
  }

  // ===== ABA CONQUISTAS =====
  let estrelasDetalheHtml = '';
  if (estrelasLista.length > 0) {
    estrelasDetalheHtml = `
      <div class="bloco">
        <div class="bloco-titulo">⭐ Estrelas ganhas nesta partida</div>
        <ul style="list-style:none; padding:0;">
          ${estrelasLista.map(item => `<li style="padding:4px 0;">${item}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  let medalhasHtml = '';
  const medalhas = carregarMedalhasLocal();
  if (medalhas.length > 0) {
    medalhasHtml = `
      <div class="bloco">
        <div class="bloco-titulo">🏅 Suas conquistas</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px;">
          ${medalhas.map(m => `<span class="medalha-item"><span class="medalha-icone">${m.icone}</span> ${m.nome}</span>`).join('')}
        </div>
      </div>
    `;
  } else {
    medalhasHtml = `
      <div class="bloco">
        <div class="bloco-titulo">🏅 Conquistas</div>
        <p style="color:#94a3b8;">Nenhuma conquista desbloqueada ainda.</p>
      </div>
    `;
  }

  // Selos (badges)
  const selosHtml = badges.length > 0 ? `
    <div class="bloco">
      <div class="bloco-titulo">🏅 Selos desta partida</div>
      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px;">
        ${badges.map(b => `<span class="badge-selo ativo">${b}</span>`).join('')}
      </div>
    </div>
  ` : '';

  // ============================================================
  // HTML DO MODAL COMPLETO
  // ============================================================
  const modalHtml = `
    <div class="modal-resultados" id="modal-pos-jogo">
      <h2 style="margin-top: 0;">🏁 RESULTADO DA PARTIDA</h2>

      <!-- Cabeçalho resumido (sempre visível) -->
      <div class="resumo-cabecalho" style="margin-bottom: 12px;">
        <div class="item">
          <span class="label">Posição</span>
          <span class="valor ${posicao === 1 ? 'valor-ouro' : posicao === 2 ? 'valor-prata' : posicao === 3 ? 'valor-bronze' : ''}">${posicao <= 3 ? ['🥇','🥈','🥉'][posicao-1] : '🏆'} ${posicao}º</span>
        </div>
        <div class="item">
          <span class="label">Pontos</span>
          <span class="valor">⭐ ${pontos}</span>
        </div>
        <div class="item">
          <span class="label">Acertos</span>
          <span class="valor">✅ ${acertos}/20</span>
        </div>
        <div class="item">
          <span class="label">Tempo médio</span>
          <span class="valor">⚡ ${tempoMedio > 0 ? tempoMedio.toFixed(2) + 's' : '--'}</span>
        </div>
      </div>

      <!-- Abas -->
      <div class="abas-resultado" role="tablist">
        <button class="aba-btn active" data-aba="resumo" role="tab" aria-selected="true">📋 Resumo</button>
        <button class="aba-btn" data-aba="evolucao" role="tab" aria-selected="false">📈 Evolução</button>
        <button class="aba-btn" data-aba="analise" role="tab" aria-selected="false">🔍 Análise</button>
        <button class="aba-btn" data-aba="conquistas" role="tab" aria-selected="false">🏅 Conquistas</button>
      </div>

      <!-- Conteúdo das abas -->
      <div id="aba-resumo" class="aba-conteudo">${resumoHtml}</div>
      <div id="aba-evolucao" class="aba-conteudo hidden">${evolucaoHtml}</div>
      <div id="aba-analise" class="aba-conteudo hidden">
        ${errosHtml}
        ${padroesHtml}
        ${recomendacoesHtml}
      </div>
      <div id="aba-conquistas" class="aba-conteudo hidden">
        ${estrelasDetalheHtml}
        ${medalhasHtml}
        ${selosHtml}
      </div>

      <!-- Rodapé com botões -->
      <div class="rodape-acoes">
        <button class="btn-success" id="btn-jogar-novamente">🔄 Jogar Novamente</button>
        <button class="btn-info" id="btn-ver-ranking">📊 Ver Ranking</button>
        <button class="btn-secondary" id="btn-fechar-modal">🔙 Fechar</button>
      </div>
    </div>
  `;

  // Inserir no DOM
  const modalExistente = document.getElementById('modal-pos-jogo');
  if (modalExistente) modalExistente.remove();
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // ===== EVENTOS DAS ABAS =====
  document.querySelectorAll('.aba-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const aba = this.dataset.aba;
      document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.add('hidden'));
      const target = document.getElementById(`aba-${aba}`);
      if (target) target.classList.remove('hidden');

      // Se a aba for "evolucao", desenhar o gráfico no canvas do modal
      if (aba === 'evolucao') {
        setTimeout(() => {
          const canvas = document.getElementById('grafico-evolucao-modal');
          if (canvas) {
            import('./game.js').then(({ desenharGraficoEvolucaoModal }) => {
              desenharGraficoEvolucaoModal(canvas);
            });
          }
        }, 100);
      }
    });
  });

  // ===== BOTÕES =====
  document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
    document.getElementById('modal-pos-jogo')?.remove();
  });
  document.getElementById('btn-jogar-novamente')?.addEventListener('click', () => {
    document.getElementById('modal-pos-jogo')?.remove();
    import('./game.js').then(({ iniciarPartida }) => iniciarPartida());
  });
  document.getElementById('btn-ver-ranking')?.addEventListener('click', () => {
    document.getElementById('modal-pos-jogo')?.remove();
    const modalRanking = document.getElementById('modal-ranking-aluno');
    if (modalRanking) {
      modalRanking.style.display = 'flex';
      import('./ranking.js').then(({ atualizarRankingAluno }) => atualizarRankingAluno());
    }
  });

  document.getElementById('modal-pos-jogo')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('modal-pos-jogo')?.remove();
    }
  });
}

// ============================================================
// NÍVEL DE ESTRELAS (UI)
// ============================================================
export function atualizarNivelEstrelasUI() {
  const container = document.getElementById('nivel-estrelas-aluno');
  if (!container) return;

  const total = state.estrelas.total || 0;
  const nivel = getNivelPorEstrelas(total);
  const proximo = getProximoNivel(total);

  let html = `
    <div class="nivel-estrelas-titulo">
      <span class="icone-nivel">${nivel.icone}</span>
      <span class="nome-nivel">${nivel.nome}</span>
      <span style="font-size: 16px; color: #94a3b8; margin-left: auto;">⭐ ${total} estrelas</span>
    </div>
  `;

  if (proximo) {
    const progresso = ((total - nivel.min) / (proximo.nivel.min - nivel.min)) * 100;
    const pct = Math.min(100, Math.max(0, progresso));
    html += `
      <div class="nivel-estrelas-barra">
        <div class="barra-fundo">
          <div class="barra-preenchida" style="width: ${pct}%;"></div>
        </div>
        <span class="texto-progresso">${Math.round(pct)}%</span>
      </div>
      <div class="nivel-estrelas-proxima-meta">
        🎯 Próximo nível: ${proximo.nivel.icone} ${proximo.nivel.nome} (faltam ${proximo.faltam} estrelas)
      </div>
    `;
    const dicas = {
      partida_completa: 'Jogue mais partidas (+1 estrela cada)',
      acertos_18_19: 'Tente acertar 18 ou 19 perguntas em uma partida (+2)',
      acertos_20: 'Busque a perfeição: 20 acertos (+5)',
      subiu_ranking: 'Suba posições no ranking (+3)',
      avancou_fase: 'Avance de fase (+10)',
      recorde_pessoal: 'Bata seu próprio recorde (+4)'
    };
    const dica = dicas[Object.keys(state.configEstrelas.acoes).find(key => state.configEstrelas.acoes[key] > 0 && total < 120)] || 'Continue jogando para acumular estrelas!';
    html += `<div class="nivel-estrelas-dica">💡 ${dica}</div>`;
  } else {
    html += `<div class="nivel-estrelas-proxima-meta">🏆 Você atingiu o nível máximo! Parabéns!</div>`;
  }

  container.innerHTML = html;
}

// ===== ESCAPE HTML (CORRIGIDO) =====
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}
