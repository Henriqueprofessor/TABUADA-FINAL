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
            gain.gain.exponentialRampToValueAt
