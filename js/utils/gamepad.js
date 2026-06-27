// ============================================================
// ARQUIVO: js/utils/gamepad.js
// ============================================================

class GamepadManager {
    constructor() {
        this.config = { gamepad: true };
        this.gamepadConectado = false;
        this.animationId = null;
        this.callbacks = {};
        this.init();
    }

    init() {
        window.addEventListener('gamepadconnected', (e) => {
            if (!this.config.gamepad) return;
            this.gamepadConectado = true;
            document.body.classList.add('gamepad-connected');
            if (this.callbacks.onConnect) this.callbacks.onConnect(e.gamepad);
        });

        window.addEventListener('gamepaddisconnected', () => {
            this.gamepadConectado = false;
            document.body.classList.remove('gamepad-connected');
            if (this.callbacks.onDisconnect) this.callbacks.onDisconnect();
        });

        if (this.config.gamepad) {
            this.iniciarLoop();
        }
    }

    iniciarLoop() {
        if (this.animationId) return;
        const loop = () => {
            if (this.config.gamepad) {
                const gp = navigator.getGamepads()[0];
                if (gp && gp.buttons) {
                    gp.buttons.forEach((btn, idx) => {
                        if (btn.pressed && this.callbacks.onButtonPress) {
                            this.callbacks.onButtonPress(idx, gp);
                        }
                    });
                }
            }
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    on(evento, callback) {
        if (this.callbacks[evento] !== undefined) {
            this.callbacks[evento] = callback;
        }
    }

    isConnected() { return this.gamepadConectado; }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
        if (!this.config.gamepad && this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        } else if (this.config.gamepad && !this.animationId) {
            this.iniciarLoop();
        }
    }
}

export const gamepadManager = new GamepadManager();
