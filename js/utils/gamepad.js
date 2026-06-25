// ============================================================
// ARQUIVO: js/utils/gamepad.js
// DESCRIÇÃO: Gerenciador de Gamepad (joystick) para acessibilidade
// ============================================================

class GamepadManager {
    constructor() {
        this.config = {
            gamepad: true
        };
        this.gamepadConectado = false;
        this.gamepadId = null;
        this.ultimoEstado = {};
        this.animationId = null;
        this.callbacks = {
            onConnect: null,
            onDisconnect: null,
            onButtonPress: null,
            onButtonRelease: null,
            onAxisMove: null
        };
        this._gamepadCallbacks = {
            onButtonPress: null,
            onButtonRelease: null,
            onAxisMove: null
        };
        this.BOTOES = {
            CONFIRMAR: 0,      // Xbox: A, PlayStation: X
            CANCELAR: 1,       // Xbox: B, PlayStation: Circle
            SECUNDARIO: 2,     // Xbox: X, PlayStation: Square
            TERCIARIO: 3,      // Xbox: Y, PlayStation: Triangle
            L1: 4,
            R1: 5,
            L2: 6,
            R2: 7,
            BACK: 8,
            START: 9,
            L3: 10,
            R3: 11,
            DPAD_CIMA: 12,
            DPAD_BAIXO: 13,
            DPAD_ESQUERDA: 14,
            DPAD_DIREITA: 15,
            HOME: 16
        };
        this.init();
    }

    // ========== INICIALIZAÇÃO ==========
    init() {
        // Listeners de conexão/desconexão
        window.addEventListener('gamepadconnected', (e) => {
            if (!this.config.gamepad) return;
            this.conectar(e.gamepad);
            this.iniciarLoop();
        });

        window.addEventListener('gamepaddisconnected', (e) => {
            if (!this.config.gamepad) return;
            this.desconectar(e.gamepad);
            // Se não houver mais controles, para o loop
            const gamepads = navigator.getGamepads();
            let temControle = false;
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) { temControle = true; break; }
            }
            if (!temControle) this.pararLoop();
        });

        // Verifica se já existe algum controle conectado ao carregar a página
        if (this.config.gamepad) {
            setTimeout(() => {
                const gamepads = navigator.getGamepads();
                for (let i = 0; i < gamepads.length; i++) {
                    if (gamepads[i]) {
                        this.conectar(gamepads[i]);
                        this.iniciarLoop();
                        break;
                    }
                }
            }, 500);
        }

        // Inicia o loop mesmo sem controle para detectar conexões futuras
        if (this.config.gamepad && !this.animationId) {
            this.iniciarLoop();
        }
    }

    // ========== CONECTAR ==========
    conectar(gamepad) {
        this.gamepadConectado = true;
        this.gamepadId = gamepad.id;
        console.log(`[Gamepad] Conectado: ${gamepad.id}`);
        if (this.callbacks.onConnect) this.callbacks.onConnect(gamepad);
        
        // Notifica o usuário
        const toast = window.toast || ((msg) => console.log(msg));
        toast('🎮 Joystick conectado! Use os botões para jogar.');
        
        // Adiciona classe ao body para estilização
        document.body.classList.add('gamepad-connected');
    }

    // ========== DESCONECTAR ==========
    desconectar(gamepad) {
        this.gamepadConectado = false;
        this.gamepadId = null;
        console.log('[Gamepad] Desconectado');
        if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(gamepad);
        document.body.classList.remove('gamepad-connected');
    }

    // ========== LER GAMEPAD ==========
    lerGamepad() {
        if (!this.config.gamepad) return null;
        
        const gamepads = navigator.getGamepads();
        const gp = gamepads[0]; // Usa o primeiro controle conectado
        
        if (!gp) {
            if (this.gamepadConectado) this.desconectar(null);
            return null;
        }
        
        if (!this.gamepadConectado) this.conectar(gp);
        return gp;
    }

    // ========== VERIFICAR MUDANÇAS ==========
    verificarMudancas(gp) {
        if (!gp || !this.config.gamepad) return;

        // Botões
        gp.buttons.forEach((btn, index) => {
            const pressionado = btn.pressed;
            const anterior = this.ultimoEstado[index] || false;
            
            if (pressionado && !anterior) {
                // Botão pressionado
                if (this.callbacks.onButtonPress) {
                    this.callbacks.onButtonPress(index, gp);
                }
                if (this._gamepadCallbacks.onButtonPress) {
                    this._gamepadCallbacks.onButtonPress(index, gp);
                }
            } else if (!pressionado && anterior) {
                // Botão solto
                if (this.callbacks.onButtonRelease) {
                    this.callbacks.onButtonRelease(index, gp);
                }
                if (this._gamepadCallbacks.onButtonRelease) {
                    this._gamepadCallbacks.onButtonRelease(index, gp);
                }
            }
            this.ultimoEstado[index] = pressionado;
        });

        // Analógicos (eixos)
        if (gp.axes && gp.axes.length > 0) {
            const eixos = gp.axes;
            for (let i = 0; i < eixos.length; i++) {
                const valor = eixos[i];
                if (Math.abs(valor) > 0.2) {
                    if (this.callbacks.onAxisMove) {
                        this.callbacks.onAxisMove(i, valor, gp);
                    }
                    if (this._gamepadCallbacks.onAxisMove) {
                        this._gamepadCallbacks.onAxisMove(i, valor, gp);
                    }
                }
            }
        }
    }

    // ========== LOOP DE ATUALIZAÇÃO ==========
    iniciarLoop() {
        if (this.animationId) return;
        
        const loop = () => {
            if (this.config.gamepad) {
                const gp = this.lerGamepad();
                if (gp) this.verificarMudancas(gp);
            }
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    pararLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // ========== REGISTRAR CALLBACKS ==========
    on(evento, callback) {
        if (this.callbacks[evento] !== undefined) {
            this.callbacks[evento] = callback;
        }
    }

    // ========== REGISTRAR CALLBACKS DO JOGO ==========
    setGamepadCallbacks(callbacks) {
        this._gamepadCallbacks = { ...this._gamepadCallbacks, ...callbacks };
    }

    // ========== VERIFICAR SE ESTÁ CONECTADO ==========
    isConnected() {
        return this.gamepadConectado;
    }

    // ========== OBTER ID DO GAMEPAD ==========
    getGamepadId() {
        return this.gamepadId;
    }

    // ========== ATUALIZAR CONFIGURAÇÕES ==========
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (!this.config.gamepad && this.animationId) {
            this.pararLoop();
        } else if (this.config.gamepad && !this.animationId) {
            this.iniciarLoop();
        }
    }

    // ========== MAPEAR BOTÃO PARA AÇÃO ==========
    mapearBotao(botaoIndex) {
        const mapa = {
            [this.BOTOES.CONFIRMAR]: 'confirmar',
            [this.BOTOES.CANCELAR]: 'cancelar',
            [this.BOTOES.SECUNDARIO]: 'opcao2',
            [this.BOTOES.TERCIARIO]: 'opcao3',
            [this.BOTOES.L1]: 'opcao1',
            [this.BOTOES.R1]: 'opcao4',
            [this.BOTOES.DPAD_ESQUERDA]: 'esquerda',
            [this.BOTOES.DPAD_DIREITA]: 'direita',
            [this.BOTOES.DPAD_CIMA]: 'cima',
            [this.BOTOES.DPAD_BAIXO]: 'baixo',
            [this.BOTOES.START]: 'iniciar',
            [this.BOTOES.BACK]: 'voltar'
        };
        return mapa[botaoIndex] || null;
    }
}

// ========== EXPORTAR INSTÂNCIA ÚNICA ==========
export const gamepadManager = new GamepadManager();
