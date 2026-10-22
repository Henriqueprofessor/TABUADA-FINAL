// js/modules/gameLoop.js
// ============================================================
// COPA TABUADA CEIB 2026 - LOOP DE GAMEPAD
// ============================================================
// OTIMIZAÇÃO DE PERFORMANCE:
// O loop de requestAnimationFrame só roda quando o jogo está
// ativo (state.jogoAtivo === true e !state.partidaFinalizada).
// Quando o jogo está parado, entra em modo "vigia" (checagem
// a cada 500ms), economizando CPU e bateria.
// ============================================================

import { state } from './state.js';
import { exibirToast } from './ui.js';

let loopId = null;
let idleCheckId = null;
let selectedIndex = 0;
let isNavigating = false;
let lastButtonPressTime = 0;
let gamepadConnected = false;

// Intervalo de checagem enquanto o jogo está ocioso (em ms).
// 500ms = 2 verificações por segundo (custo praticamente zero).
const IDLE_CHECK_INTERVAL_MS = 500;

// ============================================================
// INICIALIZAÇÃO
// ============================================================

export function initGameLoop() {
  // Listener: controle conectado
  window.addEventListener('gamepadconnected', (e) => {
    gamepadConnected = true;
    exibirToast('🎮 Controle conectado! Use o D-Pad para navegar.', 'sucesso');
    // Só acelera o loop se o jogo já estiver ativo
    if (state.jogoAtivo && !state.partidaFinalizada) {
      startLoop();
    }
  });

  // Listener: controle desconectado
  window.addEventListener('gamepaddisconnected', (e) => {
    gamepadConnected = false;
    exibirToast('🔌 Controle desconectado.', 'aviso');
    document.querySelectorAll('.opcao-vertical').forEach(el =>
      el.classList.remove('joystick-selecionado')
    );
  });

  // Detecta se já existe um controle conectado antes de abrir a página
  if (navigator.getGamepads) {
    const pads = navigator.getGamepads();
    for (let pad of pads) {
      if (pad) {
        gamepadConnected = true;
        break;
      }
    }
  }

  // Se o jogo já estiver ativo (raro, mas possível se state foi restaurado),
  // inicia o loop direto. Senão, entra em modo vigia.
  if (state.jogoAtivo && !state.partidaFinalizada) {
    startLoop();
  } else {
    startIdleCheck();
  }
}

// ============================================================
// CONTROLE DO LOOP PRINCIPAL (60 FPS)
// ============================================================

function startLoop() {
  if (loopId) return; // já rodando
  stopIdleCheck();
  loopId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  if (loopId) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }
}

// ============================================================
// MODO VIGIA (quando o jogo está inativo)
// ============================================================
// Em vez de rodar a 60fps sem fazer nada, checa a cada 500ms
// se o jogo começou. Assim que começar, inicia o loop real.

function startIdleCheck() {
  if (idleCheckId) return; // já vigiando
  idleCheckId = setInterval(() => {
    if (state.jogoAtivo && !state.partidaFinalizada) {
      startLoop();
    }
  }, IDLE_CHECK_INTERVAL_MS);
}

function stopIdleCheck() {
  if (idleCheckId) {
    clearInterval(idleCheckId);
    idleCheckId = null;
  }
}

// ============================================================
// LOOP PRINCIPAL (só roda quando o jogo está ativo)
// ============================================================

function gameLoop(timestamp) {
  // --- Caso 1: jogo terminou ou não está ativo → para o loop ---
  if (!state.jogoAtivo || state.partidaFinalizada) {
    // Limpa qualquer destaque residual
    document.querySelectorAll('.opcao-vertical').forEach(el =>
      el.classList.remove('joystick-selecionado')
    );
    selectedIndex = 0;
    loopId = null;
    // Volta ao modo vigia (economia de CPU)
    startIdleCheck();
    return;
  }

  // --- Caso 2: jogo ativo → processa o controle ---
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let pad = null;
  for (let p of pads) {
    if (p) { pad = p; break; }
  }

  if (pad) {
    const axes = pad.axes;
    const buttons = pad.buttons;

    // Navegação vertical: analógico esquerdo OU D-Pad
    let axisY = (axes.length >= 2) ? axes[1] : 0;
    const dpadUp = buttons[12]?.pressed || false;
    const dpadDown = buttons[13]?.pressed || false;

    const threshold = 0.4;
    let navigate = 0;
    if (axisY < -threshold || dpadUp) navigate = -1;
    else if (axisY > threshold || dpadDown) navigate = 1;

    const options = document.querySelectorAll('.opcao-vertical:not([disabled])');

    if (options.length > 0) {
      // Navegação entre opções
      if (navigate !== 0 && !isNavigating) {
        isNavigating = true;

        options.forEach(el => el.classList.remove('joystick-selecionado'));
        selectedIndex = (selectedIndex + navigate + options.length) % options.length;
        options[selectedIndex].classList.add('joystick-selecionado');
        options[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });

        // Debounce de 180ms para não pular várias opções
        setTimeout(() => { isNavigating = false; }, 180);
      }

      // Botão de confirmação: A (0), X (2), Start (9)
      const confirmPressed = buttons[0]?.pressed || buttons[2]?.pressed || buttons[9]?.pressed;
      if (confirmPressed) {
        const now = Date.now();
        if (now - lastButtonPressTime > 300) {
          lastButtonPressTime = now;

          let selectedEl = document.querySelector('.opcao-vertical.joystick-selecionado');
          if (!selectedEl && options.length > 0) {
            selectedIndex = 0;
            options[selectedIndex].classList.add('joystick-selecionado');
            selectedEl = options[selectedIndex];
          }

          if (selectedEl) {
            const idx = Array.from(options).indexOf(selectedEl);
            if (idx !== -1 && typeof window.responder === 'function') {
              window.responder(idx);
              options.forEach(el => el.classList.remove('joystick-selecionado'));
              selectedIndex = 0;
            }
          }
        }
      }
    } else {
      selectedIndex = 0;
    }
  } else {
    // Controle não encontrado durante o jogo → limpa destaque
    document.querySelectorAll('.opcao-vertical').forEach(el =>
      el.classList.remove('joystick-selecionado')
    );
  }

  // Continua o loop
  loopId = requestAnimationFrame(gameLoop);
}

// ============================================================
// LIMPEZA MANUAL (chamável externamente)
// ============================================================

export function resetJoystickState() {
  selectedIndex = 0;
  isNavigating = false;
  document.querySelectorAll('.opcao-vertical').forEach(el =>
    el.classList.remove('joystick-selecionado')
  );
}

// ============================================================
// DESLIGAMENTO TOTAL (opcional - para uso futuro)
// ============================================================
// Se em algum momento for necessário parar tudo (ex: troca de tela
// radical), pode-se chamar stopLoop() + stopIdleCheck().
// Atualmente NÃO é chamado em lugar nenhum, então o vigia sempre
// fica ativo em baixa frequência. É o comportamento desejado.

export function shutdownGameLoop() {
  stopLoop();
  stopIdleCheck();
}
