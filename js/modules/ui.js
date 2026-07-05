// js/modules/ui.js
import { state } from './state.js';

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

// ===== CONTROLE DE TEMA (claro/escuro) =====
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
// js/modules/ui.js (adicionar ao final)

// ============================================================
// MODAL DE RESULTADOS PÓS-PARTIDA (extraído do monolítico)
// ============================================================

export function exibirModalResultados(dados) {
  // dados: { posicao, posicaoAnterior, pontos, acertos, tempoTotal, ultimaPartida, fase, totalPartidas, ranking, id, nome, turma }
  const {
    posicao, posicaoAnterior, pontos, acertos, tempoTotal,
    ultimaPartida, fase, totalPartidas, ranking, id, nome, turma
  } = dados;

  // Calcula métricas
  const tempoMedio = acertos > 0 ? tempoTotal / acertos : 0;
  const precisao = (acertos / 20) * 100;
  let evolucaoPontos = null;
  if (ultimaPartida) {
    evolucaoPontos = pontos - ultimaPartida.pontos;
  }

  // Streak (sequência de acertos) – simulado com base na precisão
  const streak = Math.round(precisao / 5); // simplificação

  // Badges
  const badges = [];
  if (totalPartidas === 1) badges.push('🏅 Primeira partida!');
  if (tempoMedio < 1.5 && acertos > 0) badges.push('⚡ Velocista (média < 1.5s)');
  if (precisao === 100) badges.push('🎯 Precisão Máxima (100%)');
  if (evolucaoPontos !== null && evolucaoPontos > 0) badges.push('💪 Melhora contínua');
  if (streak >= 10) badges.push(`🔥 Streak de ${streak} acertos!`);
  // Recorde de velocidade (verificar se bateu o melhor)
  const melhorTempoMedio = state.melhorTempoMedio || Infinity;
  if (tempoMedio > 0 && tempoMedio < melhorTempoMedio) {
    badges.push(`⚡ Novo recorde de velocidade (${tempoMedio.toFixed(2)}s)!`);
    state.melhorTempoMedio = tempoMedio;
  }
  // Recorde de pontuação
  const melhorPontuacao = state.melhorPontuacao || 0;
  if (pontos > melhorPontuacao) {
    badges.push(`🎯 Novo recorde de pontuação (${pontos} pts)!`);
    state.melhorPontuacao = pontos;
  }

  // Mensagem personalizada
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
  } else if (evolucaoPontos !== null && evolucaoPontos > 0) {
    mensagem = '📈 Você evoluiu! Continue subindo!';
    mensagemEmoji = '📈';
  } else if (evolucaoPontos !== null && evolucaoPontos < 0) {
    mensagem = '😅 Nem sempre é perfeito. A próxima partida será melhor!';
    mensagemEmoji = '💪';
  } else {
    mensagem = '🔄 Consistência é a chave. Continue firme!';
    mensagemEmoji = '🔄';
  }

  // Informações de classificação
  const vagas = state.VAGAS_POR_FASE?.[fase] || 30;
  const minPartidas = state.minPartidasPorFase?.[fase] || 1;
  const dentroVagas = posicao <= vagas && totalPartidas >= minPartidas;
  let statusVaga = '';
  if (dentroVagas) {
    statusVaga = `✅ Você está na zona de classificação (Top ${vagas})!`;
  } else if (posicao > vagas) {
    const diff = posicao - vagas;
    statusVaga = `🎯 Faltam ${diff} posição${diff > 1 ? 'es' : ''} para entrar no Top ${vagas}!`;
  } else {
    statusVaga = `📋 Você precisa de mais ${minPartidas - totalPartidas} partida${minPartidas - totalPartidas > 1 ? 's' : ''} para ser elegível.`;
  }

  // Proximidade do colega acima
  let proximoColegaHtml = '';
  const minhaPosIndex = ranking.findIndex(p => p.id === id);
  if (minhaPosIndex > 0 && minhaPosIndex < ranking.length) {
    const jogadorAcima = ranking[minhaPosIndex - 1];
    if (jogadorAcima) {
      const diffPontos = jogadorAcima.pontos - (ranking[minhaPosIndex]?.pontos || pontos);
      proximoColegaHtml = `👤 Você está a ${diffPontos} pontos de ultrapassar ${escapeHtml(jogadorAcima.nome || 'o colega')}!`;
    }
  }

  // Velocidade vs líder
  let velocidadeVsLider = '';
  if (ranking.length > 0 && ranking[0].id !== id) {
    // Buscar velocidade do líder – simplificado, usamos tempo médio
    const liderId = ranking[0].id;
    const liderResultados = state.estadoAtual?.resultados?.[fase]?.[liderId] || [];
    if (liderResultados.length > 0) {
      const melhorLider = liderResultados.sort((a,b) => b.pontos - a.pontos)[0];
      if (melhorLider && melhorLider.acertos > 0) {
        const velLider = melhorLider.tempo / melhorLider.acertos;
        if (tempoMedio > 0 && velLider > 0) {
          const diff = tempoMedio - velLider;
          if (diff < -0.01) {
            velocidadeVsLider = `⚡ Você foi mais rápido que o líder nesta partida (${Math.abs(diff).toFixed(2)}s de vantagem)!`;
          } else if (diff > 0.01) {
            velocidadeVsLider = `⏱️ O líder ainda é mais rápido. Você está a ${diff.toFixed(2)}s do recorde dele.`;
          } else {
            velocidadeVsLider = `🤝 Você igualou a velocidade do líder!`;
          }
        }
      }
    }
  }

  // Bônus de velocidade (se houver)
  let bonusMessage = '';
  if (state.bonusVelocidadeConfig?.ativo) {
    const bonus = state.bonusVelocidadePorFase?.[fase]?.[id] || 0;
    if (bonus > 0) {
      bonusMessage = `⚡ Você ganhou +${bonus} pontos de bônus por velocidade!`;
    }
  }

  // Projeção de posição (ritmo)
  let projecaoPos = null;
  if (state.estadoAtual?.status === 'em_andamento' && fase === state.estadoAtual.fase) {
    const ritmo = pontos / 20;
    const proj = ritmo * 20;
    // posição projetada é a atual (simplificado)
    projecaoPos = posicao;
  }

  // Monta o HTML do modal
  const modalHtml = `
    <div class="modal-resultados" id="modal-pos-jogo">
      <h2 style="margin-top: 0;">🏁 RESULTADO DA PARTIDA</h2>
      <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 12px; margin: 10px 0;">
        <div style="font-size: 28px; font-weight: bold; display: flex; align-items: center; gap: 10px;">
          ${posicao <= 3 ? ['🥇','🥈','🥉'][posicao-1] : '🏆'} ${posicao}º lugar
          ${posicaoAnterior ? (posicao < posicaoAnterior ? '⬆️' : posicao > posicaoAnterior ? '⬇️' : '➡️') : ''}
        </div>
        <div style="font-size: 24px; font-weight: bold;">⭐ ${pontos} pts</div>
        <div style="font-size: 18px;">✅ ${acertos}/20</div>
      </div>

      <div class="mensagem-personalizada">
        <span class="emoji">${mensagemEmoji}</span> ${mensagem}
        ${bonusMessage ? `<br><span style="font-size: 16px;">${bonusMessage}</span>` : ''}
      </div>

      <div class="bloco">
        <div class="bloco-titulo">🎯 METAS E PROXIMIDADE</div>
        <div class="card-metrica">
          <span class="label">${statusVaga}</span>
        </div>
        ${proximoColegaHtml ? `<div class="card-metrica"><span class="label">${proximoColegaHtml}</span></div>` : ''}
        <div class="card-metrica">
          <span class="label">📋 Partidas jogadas:</span>
          <span class="valor">${totalPartidas} / ${minPartidas} ${totalPartidas >= minPartidas ? '✅ Elegível' : '⚠️ Faltam ' + (minPartidas - totalPartidas)}</span>
        </div>
        <div class="progresso-mini">
          <div class="fill" style="width: ${Math.min(100, (totalPartidas/minPartidas)*100)}%;"></div>
        </div>
      </div>

      <div class="bloco">
        <div class="bloco-titulo">💪 SUPERAÇÃO PESSOAL</div>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
          ${badges.map(b => `<span class="badge-selo ativo">${b}</span>`).join('')}
        </div>
        <div class="grid-2col">
          ${evolucaoPontos !== null ? `
            <div class="card-metrica">
              <span class="label">📈 Evolução vs última partida:</span>
              <span class="valor" style="color: ${evolucaoPontos >= 0 ? '#4ade80' : '#f87171'};">${evolucaoPontos >= 0 ? '+' : ''}${evolucaoPontos} pts</span>
            </div>
          ` : ''}
          ${tempoMedio > 0 ? `
            <div class="card-metrica">
              <span class="label">⚡ Tempo médio:</span>
              <span class="valor">${tempoMedio.toFixed(2)}s</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="bloco">
        <div class="bloco-titulo">📊 RAIO-X TÁTICO</div>
        <div class="grid-2col">
          <div class="card-metrica">
            <span class="label">🎯 Precisão:</span>
            <span class="valor">${precisao.toFixed(0)}%</span>
          </div>
          <div class="card-metrica">
            <span class="label">⏱️ Tempo total:</span>
            <span class="valor">${tempoTotal.toFixed(1)}s</span>
          </div>
          ${velocidadeVsLider ? `
            <div class="card-metrica" style="grid-column: 1 / -1;">
              <span class="label">⚡ Velocidade vs Líder:</span>
              <span class="valor">${velocidadeVsLider}</span>
            </div>
          ` : ''}
          ${projecaoPos ? `
            <div class="card-metrica">
              <span class="label">📈 Projeção de posição:</span>
              <span class="valor">${projecaoPos}º (ritmo atual)</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="frase-encerramento">
        💡 A fase ainda não acabou! Sua próxima tentativa pode te levar ao topo.
      </div>
      <div class="rodape-acoes">
        <button class="btn-success" id="btn-jogar-novamente">🔄 Jogar Novamente</button>
        <button class="btn-info" id="btn-ver-ranking">📊 Ver Ranking</button>
        <button class="btn-secondary" id="btn-fechar-modal">🔙 Fechar</button>
      </div>
    </div>
  `;

  // Remove modal anterior se existir
  const modalExistente = document.getElementById('modal-pos-jogo');
  if (modalExistente) modalExistente.remove();

  // Adiciona ao body
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Eventos dos botões
  document.getElementById('btn-fechar-modal')?.addEventListener('click', () => {
    document.getElementById('modal-pos-jogo')?.remove();
  });
  document.getElementById('btn-jogar-novamente')?.addEventListener('click', () => {
    document.getElementById('modal-pos-jogo')?.remove();
    // Dispara nova partida
    import('./game.js').then(({ iniciarPartida }) => iniciarPartida());
  });
  document.getElementById('btn-ver-ranking')?.addEventListener('click', () => {
    document.getElementById('modal-pos-jogo')?.remove();
    // Abre o ranking (modal já existe)
    const modalRanking = document.getElementById('modal-ranking-aluno');
    if (modalRanking) {
      modalRanking.style.display = 'flex';
      import('./ranking.js').then(({ atualizarRankingAluno }) => atualizarRankingAluno());
    }
  });

  // Fecha ao clicar fora
  document.getElementById('modal-pos-jogo')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      document.getElementById('modal-pos-jogo')?.remove();
    }
  });
}

// Função auxiliar para escapar HTML (já existe no ranking.js, mas usamos localmente)
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}
