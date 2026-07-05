// js/modules/gameLoop.js
import { state } from './state.js';
import { exibirToast } from './ui.js';

let loopId = null;
let selectedIndex = 0;
let isNavigating = false;
let lastButtonPressTime = 0;
let gamepadConnected = false;

// ============================================================
// INICIAR LOOP
// ============================================================

export function initGameLoop() {
  // Listeners para conectar/desconectar joystick
  window.addEventListener('gamepadconnected', (e) => {
    gamepadConnected = true;
    exibirToast('🎮 Controle conectado! Use o D-Pad para navegar.', 'sucesso');
    startLoop();
  });

  window.addEventListener('gamepaddisconnected', (e) => {
    gamepadConnected = false;
    exibirToast('🔌 Controle desconectado.', 'aviso');
    // Limpa os destaques ao desconectar
    document.querySelectorAll('.opcao-vertical').forEach(el => el.classList.remove('joystick-selecionado'));
  });

  // Verifica se já tem um controle conectado
  if (navigator.getGamepads) {
    const pads = navigator.getGamepads();
    for (let pad of pads) {
      if (pad) {
        gamepadConnected = true;
        break;
      }
    }
  }

  // Inicia o loop (sempre rodando, mas só age se o jogo estiver ativo)
  startLoop();
}

// ============================================================
// CONTROLE DO LOOP
// ============================================================

function startLoop() {
  if (loopId) return;
  loopId = requestAnimationFrame(gameLoop);
}

function stopLoop() {
  if (loopId) {
    cancelAnimationFrame(loopId);
    loopId = null;
  }
}

// ============================================================
// LOOP PRINCIPAL (60 FPS)
// ============================================================

function gameLoop(timestamp) {
  // Só processa joystick se o jogo estiver ativo e o aluno estiver respondendo
  if (state.jogoAtivo && !state.partidaFinalizada) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (let p of pads) {
      if (p) { pad = p; break; }
    }

    if (pad) {
      const axes = pad.axes;
      const buttons = pad.buttons;

      // Navegação vertical: Eixo Y do analógico esquerdo OU D-Pad
      let axisY = (axes.length >= 2) ? axes[1] : 0;
      const dpadUp = buttons[12]?.pressed || false;
      const dpadDown = buttons[13]?.pressed || false;

      const threshold = 0.4;
      let navigate = 0;
      if (axisY < -threshold || dpadUp) navigate = -1;
      else if (axisY > threshold || dpadDown) navigate = 1;

      const options = document.querySelectorAll('.opcao-vertical:not([disabled])');

      if (options.length > 0) {
        // Navegação
        if (navigate !== 0 && !isNavigating) {
          isNavigating = true;

          // Remove destaque anterior
          options.forEach(el => el.classList.remove('joystick-selecionado'));

          // Calcula novo índice (com wrap-around)
          selectedIndex = (selectedIndex + navigate + options.length) % options.length;

          // Adiciona destaque no novo
          options[selectedIndex].classList.add('joystick-selecionado');
          options[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });

          // Debounce de 200ms para não passar várias opções de uma vez
          setTimeout(() => { isNavigating = false; }, 180);
        }

        // Botão de confirmação: A (0), X (2), Start (9) ou Enter do teclado (já tratado via click)
        const confirmPressed = buttons[0]?.pressed || buttons[2]?.pressed || buttons[9]?.pressed;
        if (confirmPressed) {
          const now = Date.now();
          if (now - lastButtonPressTime > 300) {
            lastButtonPressTime = now;

            // Procura qual opção está selecionada
            let selectedEl = document.querySelector('.opcao-vertical.joystick-selecionado');
            if (!selectedEl && options.length > 0) {
              // Se nenhuma estiver selecionada, seleciona a primeira
              selectedIndex = 0;
              options[selectedIndex].classList.add('joystick-selecionado');
              selectedEl = options[selectedIndex];
            }

            if (selectedEl) {
              const idx = Array.from(options).indexOf(selectedEl);
              if (idx !== -1 && typeof window.responder === 'function') {
                // Dispara a resposta
                window.responder(idx);
                // Limpa o destaque após responder
                options.forEach(el => el.classList.remove('joystick-selecionado'));
                // Reseta o índice para a primeira opção da próxima pergunta
                selectedIndex = 0;
              }
            }
          }
        }
      } else {
        // Se não há opções, reseta o índice
        selectedIndex = 0;
      }
    } else {
      // Se o controle foi desconectado, remove os destaques
      document.querySelectorAll('.opcao-vertical').forEach(el => el.classList.remove('joystick-selecionado'));
    }
  } else {
    // Se o jogo não está ativo, garante que os destaques sumam
    document.querySelectorAll('.opcao-vertical').forEach(el => el.classList.remove('joystick-selecionado'));
    // Reseta o índice para a próxima vez que o jogo iniciar
    selectedIndex = 0;
  }

  // Continua o loop
  loopId = requestAnimationFrame(gameLoop);
}

// ============================================================
// FUNÇÕES DE LIMPEZA (opcional)
// ============================================================

export function resetJoystickState() {
  selectedIndex = 0;
  isNavigating = false;
  document.querySelectorAll('.opcao-vertical').forEach(el => el.classList.remove('joystick-selecionado'));
}
