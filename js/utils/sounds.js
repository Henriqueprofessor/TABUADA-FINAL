// ============================================================
// ARQUIVO: js/utils/sounds.js
// ============================================================

class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.initialized = false;
        this.config = { sons: true, sonsCelebracao: true, sonsErro: true };
    }

    initAudio() {
        if (this.audioCtx) return this.audioCtx;
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            return this.audioCtx;
        } catch (e) {
            console.warn('Web Audio API não suportada.');
            return null;
        }
    }

    playTone(freq, duration = 0.15, type = 'sine', volume = 0.3) {
        const ctx = this.initAudio();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = type;
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) { /* ignora */ }
    }

    playCorrect() {
        if (!this.config.sons) return;
        this.playTone(523.25, 0.12);
        setTimeout(() => this.playTone(659.25, 0.12), 100);
        setTimeout(() => this.playTone(783.99, 0.15), 200);
    }

    playWrong() {
        if (!this.config.sons || !this.config.sonsErro) return;
        this.playTone(150, 0.3, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(80, 0.2, 'square', 0.15), 150);
    }

    playGameStart() {
        if (!this.config.sons) return;
        const ctx = this.initAudio();
        if (!ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        } catch (e) { /* ignora */ }
    }

    playFanfare() {
        if (!this.config.sons || !this.config.sonsCelebracao) return;
        [659.25, 783.99, 1046.5, 1318.5].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15), i * 120);
        });
    }

    playCelebration() {
        if (!this.config.sons || !this.config.sonsCelebracao) return;
        [523, 587, 659, 784, 880, 988, 1047].forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1), i * 80);
        });
    }

    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}

export const soundManager = new SoundManager();
