// ============================================================
// ARQUIVO: js/utils/sounds.js
// DESCRIÇÃO: Sistema de sons usando Web Audio API
// ============================================================

import { toast } from './helpers.js';

class SoundManager {
    constructor() {
        this.audioCtx = null;
        this.initialized = false;
        this.config = {
            sons: true,
            sonsCelebracao: true,
            sonsErro: true
        };
    }

    // ========== INICIALIZAR CONTEXTO DE ÁUDIO ==========
    initAudio() {
        if (this.audioCtx) return this.audioCtx;
        
        try {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            return this.audioCtx;
        } catch (e) {
            console.warn('Web Audio API não suportada neste navegador.');
            return null;
        }
    }

    // ========== TOCAR NOTA ==========
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
        } catch (e) {
            console.warn('Erro ao tocar som:', e);
        }
    }

    // ========== SOM: RESPOSTA CORRETA ==========
    playCorrect() {
        if (!this.config.sons) return;
        const ctx = this.initAudio();
        if (!ctx) return;
        
        // Acorde maior: Dó, Mi, Sol
        this.playTone(523.25, 0.12, 'sine', 0.3);
        setTimeout(() => this.playTone(659.25, 0.12, 'sine', 0.3), 100);
        setTimeout(() => this.playTone(783.99, 0.15, 'sine', 0.3), 200);
    }

    // ========== SOM: RESPOSTA ERRADA ==========
    playWrong() {
        if (!this.config.sons || !this.config.sonsErro) return;
        const ctx = this.initAudio();
        if (!ctx) return;
        
        // Nota grave e "suja"
        this.playTone(150, 0.3, 'sawtooth', 0.2);
        setTimeout(() => this.playTone(80, 0.2, 'square', 0.15), 150);
    }

    // ========== SOM: TEMPO ESGOTADO ==========
    playTimeUp() {
        if (!this.config.sons || !this.config.sonsErro) return;
        const ctx = this.initAudio();
        if (!ctx) return;
        
        this.playTone(800, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(600, 0.1, 'square', 0.2), 150);
    }

    // ========== SOM: INÍCIO DA PARTIDA ==========
    playGameStart() {
        if (!this.config.sons) return;
        const ctx = this.initAudio();
        if (!ctx) return;
        
        const startFreq = 300;
        const endFreq = 800;
        const duration = 0.5;
        
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
            
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duration);
        } catch (e) {
            console.warn('Erro ao tocar som de início:', e);
        }
    }

    // ========== SOM: FANFARRA (FIM DE PARTIDA) ==========
    playFanfare() {
        if (!this.config.sons || !this.config.sonsCelebracao) return;
        const ctx = this.initAudio();
        if (!ctx) return;
        
        const notes = [659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.3), i * 120);
        });
    }

    // ========== SOM: COMEMORAÇÃO ==========
    playCelebration() {
        if (!this.config.sons || !this.config.sonsCelebracao) return;
        const ctx = this.initAudio();
        if (!ctx) return;
        
        const notes = [523, 587, 659, 784, 880, 988, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.1, 'sine', 0.25), i * 80);
        });
    }

    // ========== SOM: CLIQUE ==========
    playClick() {
        if (!this.config.sons) return;
        this.playTone(1200, 0.05, 'sine', 0.1);
    }

    // ========== ATUALIZAR CONFIGURAÇÕES ==========
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }

    // ========== VERIFICAR SE ÁUDIO ESTÁ DISPONÍVEL ==========
    isAvailable() {
        return this.initialized || !!this.audioCtx;
    }
}

// ========== EXPORTAR INSTÂNCIA ÚNICA ==========
export const soundManager = new SoundManager();
