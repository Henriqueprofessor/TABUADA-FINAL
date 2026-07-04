// js/modules/treino.js
import { state } from './state.js';
import { exibirToast, mostrarTela } from './ui.js';
import { tocarSom } from './sound.js';
import { gerarPerguntas } from './game.js';

export const MODALIDADES_TREINO = {
  '2-5': { label: 'Tabuada 2 a 5', min: 2, max: 5 },
  '6-9': { label: 'Tabuada 6 a 9', min: 6, max: 9 },
  '0-10': { label: 'Tabuada 0 a 10 (Completa)', min: 0, max: 10 },
  'especifica': { label: 'Tabuada específica', min: 0, max: 10, especifica: true }
};

export const OPCOES_PERGUNTAS = [5, 10, 15, 20];

let treinoEstado = {
  ativo: false,
  perguntas: [],
  perguntaAtual: 0,
  acertos: 0,
  erros: 0,
  totalPerguntas: 0,
  modalidade: '2-5',
  numeroEspecifico: null,
  totalEscolhido: 10,
  respondendo: false,
  finalizado: false,
  fase5: false
};

// ============================================================
// INICIAR TREINO
// ============================================================
export function iniciarTreino(modalidade, totalPerguntas, numeroEspecifico = null, fase5 = false) {
  let perguntas = [];

  if (modalidade === 'especifica' && numeroEspecifico) {
    perguntas = gerarPerguntasEspecificas(numeroEspecifico, totalPerguntas);
  } else if (fase5) {
    perguntas = gerarPerguntasParaFase5(totalPerguntas);
  } else {
    const perguntasGeradas = gerarPerguntas(modalidade, 1);
    if (!perguntasGeradas || perguntasGeradas.length === 0) {
      exibirToast('❌ Erro ao gerar perguntas.');
      return;
    }
    perguntas = perguntasGeradas.map(p => {
      const correta = p.opts[p.posicaoCorreta - 1];
      return {
        a: p.a,
        b: p.b,
        correta: correta,
        opcoes: p.opts,
        posicaoCorreta: p.posicaoCorreta
      };
    });
    if (perguntas.length > totalPerguntas) {
      perguntas = perguntas.slice(0, totalPerguntas);
    } else {
      while (perguntas.length < totalPerguntas) {
        const extra = gerarPerguntas(modalidade, 1).map(p => {
          const correta = p.opts[p.posicaoCorreta - 1];
          return {
            a: p.a,
            b: p.b,
            correta: correta,
            opcoes: p.opts,
            posicaoCorreta: p.posicaoCorreta
          };
        });
        perguntas = perguntas.concat(extra);
      }
      perguntas = perguntas.slice(0, totalPerguntas);
    }
  }

  if (perguntas.length === 0) {
    exibirToast('❌ Nenhuma pergunta gerada. Tente outra modalidade.');
    return;
  }

  treinoEstado.ativo = true;
  treinoEstado.perguntas = perguntas;
  treinoEstado.perguntaAtual = 0;
  treinoEstado.acertos = 0;
  treinoEstado.erros = 0;
  treinoEstado.totalPerguntas = perguntas.length;
  treinoEstado.modalidade = modalidade;
  treinoEstado.numeroEspecifico = numeroEspecifico;
  treinoEstado.totalEscolhido = totalPerguntas;
  treinoEstado.respondendo = false;
  treinoEstado.finalizado = false;
  treinoEstado.fase5 = fase5;

  mostrarTelaTreino();
  exibirPergunta();
}

// ============================================================
// GERAR PERGUNTAS ESPECÍFICAS
// ============================================================
function gerarPerguntasEspecificas(numero, total) {
  const perguntas = [];
  const base = [0,1,2,3,4,5,6,7,8,9,10];
  for (let i = 0; i < base.length; i++) {
    const a = numero;
    const b = base[i];
    const correta = a * b;
    const distratores = gerarDistratores(correta, 3);
    const opcoes = [correta, ...distratores];
    for (let j = opcoes.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [opcoes[j], opcoes[k]] = [opcoes[k], opcoes[j]];
    }
    perguntas.push({
      a: a,
      b: b,
      correta: correta,
      opcoes: opcoes,
      posicaoCorreta: opcoes.indexOf(correta) + 1
    });
  }
  for (let i = perguntas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [perguntas[i], perguntas[j]] = [perguntas[j], perguntas[i]];
  }
  while (perguntas.length < total) {
    const extra = [...perguntas];
    for (let i = extra.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [extra[i], extra[j]] = [extra[j], extra[i]];
    }
    perguntas.push(...extra);
  }
  return perguntas.slice(0, total);
}

function gerarDistratores(correta, quantidade) {
  const distratores = new Set();
  let tentativas = 0;
  while (distratores.size < quantidade && tentativas < 100) {
    tentativas++;
    const offset = Math.floor(Math.random() * 20) + 1;
    const sinal = Math.random() > 0.5 ? 1 : -1;
    let d = correta + (sinal * offset);
    if (d !== correta && d >= 0 && d <= 200) {
      distratores.add(d);
    }
  }
  let fallback = 1;
  while (distratores.size < quantidade) {
    let d = correta + fallback;
    if (d !== correta && d >= 0 && d <= 200 && !distratores.has(d)) {
      distratores.add(d);
    }
    fallback++;
    if (fallback > 50) break;
  }
  return Array.from(distratores);
}

// ============================================================
// GERAR PERGUNTAS PARA FASE 5
// ============================================================
function gerarPerguntasParaFase5(total) {
  const perguntas = [];
  const H = [6,7,8,9];
  const base = [6,7,8,9];
  const combinacoes = [];
  for (let a of base) {
    for (let b of H) {
      combinacoes.push({ a, b });
    }
  }
  for (let a of H) {
    for (let b of base) {
      if (!combinacoes.some(c => (c.a === a && c.b === b) || (c.a === b && c.b === a))) {
        combinacoes.push({ a, b });
      }
    }
  }
  const unique = [];
  const seen = new Set();
  for (let c of combinacoes) {
    const key = `${Math.min(c.a, c.b)}x${Math.max(c.a, c.b)}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
    }
  }
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  for (let item of unique) {
    const correta = item.a * item.b;
    const distratores = gerarDistratores(correta, 3);
    const opcoes = [correta, ...distratores];
    for (let j = opcoes.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [opcoes[j], opcoes[k]] = [opcoes[k], opcoes[j]];
    }
    perguntas.push({
      a: item.a,
      b: item.b,
      correta: correta,
      opcoes: opcoes,
      posicaoCorreta: opcoes.indexOf(correta) + 1
    });
  }
  while (perguntas.length < total) {
    const extra = [...perguntas];
    for (let i = extra.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [extra[i], extra[j]] = [extra[j], extra[i]];
    }
    perguntas.push(...extra);
  }
  return perguntas.slice(0, total);
}

// ============================================================
// EXIBIR PERGUNTA
// ============================================================
function exibirPergunta() {
  if (treinoEstado.perguntaAtual >= treinoEstado.totalPerguntas) {
    finalizarTreino();
    return;
  }

  const p = treinoEstado.perguntas[treinoEstado.perguntaAtual];
  const container = document.getElementById('treino-pergunta');
  const opcoesContainer = document.getElementById('treino-opcoes');
  const progresso = document.getElementById('treino-progresso');

  if (!container || !opcoesContainer) {
    console.warn('Elementos do treino não encontrados');
    return;
  }

  if (!p || !p.opcoes || p.opcoes.length === 0) {
    console.error('Pergunta inválida:', p);
    exibirToast('❌ Erro ao carregar pergunta. Tente novamente.');
    return;
  }

  const total = treinoEstado.totalPerguntas;
  const atual = treinoEstado.perguntaAtual + 1;
  if (progresso) {
    progresso.innerText = `Pergunta ${atual} de ${total}`;
  }

  container.innerText = `${p.a} x ${p.b} = ?`;

  opcoesContainer.innerHTML = '';
  p.opcoes.forEach((opcao, idx) => {
    const btn = document.createElement('button');
    btn.className = 'treino-opcao';
    btn.innerText = opcao;
    btn.dataset.index = idx;
    btn.addEventListener('click', () => responderTreino(idx));
    opcoesContainer.appendChild(btn);
  });

  document.getElementById('treino-acertos').innerText = treinoEstado.acertos;
  document.getElementById('treino-erros').innerText = treinoEstado.erros;

  treinoEstado.respondendo = false;
}

// ============================================================
// RESPONDER
// ============================================================
function responderTreino(idx) {
  if (treinoEstado.respondendo || treinoEstado.finalizado) return;
  treinoEstado.respondendo = true;

  const p = treinoEstado.perguntas[treinoEstado.perguntaAtual];
  const opcoes = document.querySelectorAll('.treino-opcao');
  const opcaoSelecionada = opcoes[idx];
  const valorSelecionado = parseInt(opcaoSelecionada.innerText);
  const correta = p.correta;

  opcoes.forEach(btn => btn.disabled = true);

  if (valorSelecionado === correta) {
    opcaoSelecionada.classList.add('treino-certo');
    treinoEstado.acertos++;
    tocarSom('acerto');
  } else {
    opcaoSelecionada.classList.add('treino-errado');
    opcoes.forEach(btn => {
      if (parseInt(btn.innerText) === correta) {
        btn.classList.add('treino-certo');
      }
    });
    treinoEstado.erros++;
    tocarSom('erro');
  }

  document.getElementById('treino-acertos').innerText = treinoEstado.acertos;
  document.getElementById('treino-erros').innerText = treinoEstado.erros;

  setTimeout(() => {
    treinoEstado.perguntaAtual++;
    exibirPergunta();
  }, 1000);
}

// ============================================================
// FINALIZAR
// ============================================================
function finalizarTreino() {
  treinoEstado.finalizado = true;
  treinoEstado.ativo = false;

  const total = treinoEstado.totalPerguntas;
  const acertos = treinoEstado.acertos;
  const erros = treinoEstado.erros;
  const percentual = total > 0 ? Math.round((acertos / total) * 100) : 0;

  const container = document.getElementById('treino-resultado');
  const jogoContainer = document.getElementById('treino-jogo');

  if (jogoContainer) jogoContainer.style.display = 'none';
  if (container) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <h2 style="color: #ffd966;">🏋️ Treino Finalizado!</h2>
        <div style="font-size: 48px; margin: 20px 0;">${percentual >= 80 ? '🎉' : '💪'}</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; max-width: 400px; margin: 0 auto;">
          <div style="background: #27ae60; padding: 16px; border-radius: 12px; color: white;">
            <div style="font-size: 28px;">${acertos}</div>
            <div>Acertos</div>
          </div>
          <div style="background: #e74c3c; padding: 16px; border-radius: 12px; color: white;">
            <div style="font-size: 28px;">${erros}</div>
            <div>Erros</div>
          </div>
          <div style="background: #f39c12; padding: 16px; border-radius: 12px; color: white;">
            <div style="font-size: 28px;">${percentual}%</div>
            <div>Aproveitamento</div>
          </div>
        </div>
        <div style="margin-top: 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="btn-treino-novamente" class="btn-success">🔄 Jogar Novamente</button>
          <button id="btn-treino-sair" class="btn-danger">🔙 Voltar ao Menu</button>
        </div>
      </div>
    `;

    document.getElementById('btn-treino-novamente')?.addEventListener('click', () => {
      mostrarConfiguracaoTreino();
    });
    document.getElementById('btn-treino-sair')?.addEventListener('click', () => {
      mostrarTela('inicio');
      state.modoTreinoAtivo = false;
    });
  }
}

// ============================================================
// MOSTRAR TELAS (COM CLASSE visible E FORÇA DISPLAY)
// ============================================================
function mostrarTelaTreino() {
  // Oculta todas as outras telas
  document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
  const telaTreino = document.getElementById('tela-treino');
  if (telaTreino) {
    telaTreino.classList.add('visible'); // <-- ADICIONA CLASSE visible
    telaTreino.style.display = 'block';
    telaTreino.classList.remove('hidden');
  }
}

export function mostrarConfiguracaoTreino() {
  console.log('📢 Abrindo configuração do treino');
  // Reseta estado
  treinoEstado.ativo = false;
  treinoEstado.finalizado = false;
  treinoEstado.perguntas = [];
  treinoEstado.perguntaAtual = 0;
  treinoEstado.acertos = 0;
  treinoEstado.erros = 0;

  // Oculta todas as outras telas
  document.querySelectorAll('.card').forEach(c => c.classList.add('hidden'));
  const configContainer = document.getElementById('treino-config');
  const jogoContainer = document.getElementById('treino-jogo');
  const resultadoContainer = document.getElementById('treino-resultado');
  const telaTreino = document.getElementById('tela-treino');

  if (jogoContainer) jogoContainer.style.display = 'none';
  if (resultadoContainer) {
    resultadoContainer.style.display = 'none';
    resultadoContainer.innerHTML = '';
  }
  if (configContainer) configContainer.style.display = 'block';
  if (telaTreino) {
    telaTreino.classList.add('visible'); // <-- ADICIONA CLASSE visible
    telaTreino.style.display = 'block';
    telaTreino.classList.remove('hidden');
  }

  // Preenche modalidades
  const modalidadeContainer = document.getElementById('treino-modalidades');
  if (modalidadeContainer) {
    modalidadeContainer.innerHTML = '';
    for (const [key, config] of Object.entries(MODALIDADES_TREINO)) {
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-card-hover); border-radius: 8px; cursor: pointer;';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'modalidade';
      input.value = key;
      if (key === '2-5') input.checked = true;
      input.style.cssText = 'accent-color: #ffd966;';
      label.appendChild(input);
      label.appendChild(document.createTextNode(config.label));
      if (key === 'especifica') {
        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.min = 1;
        numInput.max = 10;
        numInput.value = 7;
        numInput.style.cssText = 'width: 60px; padding: 4px 8px; border-radius: 6px; background: var(--bg-input); color: var(--texto-input); border: 1px solid var(--borda-input); margin-left: 8px;';
        numInput.id = 'treino-numero-especifico';
        label.appendChild(numInput);
      }
      modalidadeContainer.appendChild(label);
    }

    // Evento para habilitar/desabilitar checkbox Fase5
    modalidadeContainer.querySelectorAll('input[name="modalidade"]').forEach(radio => {
      radio.addEventListener('change', function() {
        const fase5Checkbox = document.getElementById('treino-fase5');
        if (this.value === 'especifica') {
          fase5Checkbox.disabled = true;
          fase5Checkbox.checked = false;
          fase5Checkbox.parentElement.style.opacity = '0.5';
        } else {
          fase5Checkbox.disabled = false;
          fase5Checkbox.parentElement.style.opacity = '1';
        }
      });
    });
    const radioEspecifica = modalidadeContainer.querySelector('input[value="especifica"]');
    if (radioEspecifica && radioEspecifica.checked) {
      const fase5Checkbox = document.getElementById('treino-fase5');
      if (fase5Checkbox) {
        fase5Checkbox.disabled = true;
        fase5Checkbox.checked = false;
        fase5Checkbox.parentElement.style.opacity = '0.5';
      }
    }
  }

  // Preenche quantidades
  const quantidadeContainer = document.getElementById('treino-quantidades');
  if (quantidadeContainer) {
    quantidadeContainer.innerHTML = '';
    OPCOES_PERGUNTAS.forEach((qtd) => {
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: var(--bg-card-hover); border-radius: 8px; cursor: pointer;';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'quantidade';
      input.value = qtd;
      if (qtd === 10) input.checked = true;
      input.style.cssText = 'accent-color: #ffd966;';
      label.appendChild(input);
      label.appendChild(document.createTextNode(`${qtd} perguntas`));
      quantidadeContainer.appendChild(label);
    });
  }

  // Garante que a tela de treino está visível
  if (telaTreino) {
    telaTreino.classList.add('visible');
    telaTreino.style.display = 'block';
    telaTreino.classList.remove('hidden');
  }
}

// ============================================================
// INICIAR TREINO A PARTIR DA CONFIGURAÇÃO
// ============================================================
function getQuantidadeSelecionada() {
  const qtdRadio = document.querySelector('input[name="quantidade"]:checked');
  return qtdRadio ? parseInt(qtdRadio.value) : 10;
}

export function iniciarTreinoFromConfig() {
  const modalidadeRadio = document.querySelector('input[name="modalidade"]:checked');
  if (!modalidadeRadio) {
    exibirToast('❌ Selecione uma modalidade.');
    return;
  }
  const modalidade = modalidadeRadio.value;

  if (modalidade === 'especifica') {
    const numInput = document.getElementById('treino-numero-especifico');
    if (numInput) {
      const numero = parseInt(numInput.value) || 7;
      if (numero < 1 || numero > 10) {
        exibirToast('❌ Digite um número entre 1 e 10.');
        return;
      }
      const totalPerguntas = getQuantidadeSelecionada();
      iniciarTreino(modalidade, totalPerguntas, numero, false);
      return;
    }
  }

  const fase5Checkbox = document.getElementById('treino-fase5');
  const fase5 = fase5Checkbox ? fase5Checkbox.checked : false;
  const totalPerguntas = getQuantidadeSelecionada();
  iniciarTreino(modalidade, totalPerguntas, null, fase5);
}
