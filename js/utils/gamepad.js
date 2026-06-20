// js/utils/gamepad.js
// Gerenciador de Gamepad (joystick) para acessibilidade

window.GamepadManager = (function() {
    // ========== MAPEAMENTO DE BOTÕES ==========
    // Referência: https://w3c.github.io/gamepad/#remapping
    const BOTOES = {
        // Xbox: A, PlayStation: X
        CONFIRMAR: 0,
        // Xbox: B, PlayStation: Circle
        CANCELAR: 1,
        // Xbox: X, PlayStation: Square
        SECUNDARIO: 2,
        // Xbox: Y, PlayStation: Triangle
        TERCIARIO: 3,
        // Ombro esquerdo
        L1: 4,
        // Ombro direito
        R1: 5,
        // Gatilho esquerdo
        L2: 6,
        // Gatilho direito
        R2: 7,
        // Select / Back
        BACK: 8,
        // Start
        START: 9,
        // Analógico esquerdo (botão)
        L3: 10,
        // Analógico direito (botão)
        R3: 11,
        // D-Pad cima
        DPAD_CIMA: 12,
        // D-Pad baixo
        DPAD_BAIXO: 13,
        // D-Pad esquerda
        DPAD_ESQUERDA: 14,
        // D-Pad direita
        DPAD_DIREITA: 15,
        // Botão do meio (Xbox: Xbox, PlayStation: PS)
        HOME: 16
    };

    // ========== ESTADO DO GAMEPAD ==========
    let gamepadConectado = false;
    let gamepadId = null;
    let ultimoEstado = {};
    let callbacks = {
        onConnect: null,
        onDisconnect: null,
        onButtonPress: null,
        onButtonRelease: null,
        onAxisMove: null
    };

    // ========== DETECÇÃO DE CONEXÃO ==========
    function conectar(gamepad) {
        gamepadConectado = true;
        gamepadId = gamepad.id;
        console.log(`[Gamepad] Conectado: ${gamepad.id}`);
        if (callbacks.onConnect) callbacks.onConnect(gamepad);
        // Notifica o usuário
        if (window.toast) {
            window.toast('🎮 Joystick conectado! Use os botões para jogar.');
        }
        // Adiciona classe ao body para estilização
        document.body.classList.add('gamepad-connected');
    }

    function desconectar(gamepad) {
        gamepadConectado = false;
        gamepadId = null;
        console.log('[Gamepad] Desconectado');
        if (callbacks.onDisconnect) callbacks.onDisconnect(gamepad);
        document.body.classList.remove('gamepad-connected');
    }

    // ========== LEITURA DO ESTADO ==========
    function lerGamepad() {
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0]; // Usa o primeiro controle conectado
        if (!gp) {
            if (gamepadConectado) desconectar(null);
            return null;
        }
        if (!gamepadConectado) conectar(gp);
        return gp;
    }

    // ========== VERIFICAR MUDANÇAS ==========
    function verificarMudancas(gp) {
        if (!gp) return;

        // Botões
        gp.buttons.forEach((btn, index) => {
            const pressionado = btn.pressed;
            const anterior = ultimoEstado[index] || false;
            if (pressionado && !anterior) {
                // Botão pressionado
                if (callbacks.onButtonPress) {
                    callbacks.onButtonPress(index, gp);
                }
                // Ações específicas para o jogo (mapeamento global)
                if (window._gamepadCallbacks && window._gamepadCallbacks.onButtonPress) {
                    window._gamepadCallbacks.onButtonPress(index, gp);
                }
            } else if (!pressionado && anterior) {
                // Botão solto
                if (callbacks.onButtonRelease) {
                    callbacks.onButtonRelease(index, gp);
                }
                if (window._gamepadCallbacks && window._gamepadCallbacks.onButtonRelease) {
                    window._gamepadCallbacks.onButtonRelease(index, gp);
                }
            }
            ultimoEstado[index] = pressionado;
        });

        // Analógicos (eixos)
        if (gp.axes && gp.axes.length > 0) {
            const eixos = gp.axes;
            // Verifica movimento significativo (> 0.2)
            for (let i = 0; i < eixos.length; i++) {
                const valor = eixos[i];
                if (Math.abs(valor) > 0.2) {
                    if (callbacks.onAxisMove) {
                        callbacks.onAxisMove(i, valor, gp);
                    }
                    if (window._gamepadCallbacks && window._gamepadCallbacks.onAxisMove) {
                        window._gamepadCallbacks.onAxisMove(i, valor, gp);
                    }
                }
            }
        }
    }

    // ========== LOOP DE ATUALIZAÇÃO ==========
    let animationId = null;

    function iniciarLoop() {
        if (animationId) return;
        function loop() {
            const gp = lerGamepad();
            if (gp) verificarMudancas(gp);
            animationId = requestAnimationFrame(loop);
        }
        loop();
    }

    function pararLoop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
    }

    // ========== REGISTRAR CALLBACKS ==========
    function on(evento, callback) {
        if (callbacks[evento] !== undefined) {
            callbacks[evento] = callback;
        }
    }

    // ========== INICIALIZAÇÃO ==========
    function init() {
        // Listeners de conexão/desconexão
        window.addEventListener('gamepadconnected', (e) => {
            conectar(e.gamepad);
            iniciarLoop();
        });
        window.addEventListener('gamepaddisconnected', (e) => {
            desconectar(e.gamepad);
            // Se não houver mais controles, para o loop
            const gamepads = navigator.getGamepads();
            let temControle = false;
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) { temControle = true; break; }
            }
            if (!temControle) pararLoop();
        });

        // Verifica se já existe algum controle conectado ao carregar a página
        const gamepads = navigator.getGamepads();
        for (let i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                conectar(gamepads[i]);
                iniciarLoop();
                break;
            }
        }

        // Inicia o loop mesmo sem controle para detectar conexões futuras
        if (!animationId) iniciarLoop();
    }

    // ========== EXPORTAÇÃO ==========
    return {
        init,
        on,
        isConnected: () => gamepadConectado,
        getGamepadId: () => gamepadId,
        BOTOES
    };
})();

// Inicializa automaticamente
window.GamepadManager.init();
