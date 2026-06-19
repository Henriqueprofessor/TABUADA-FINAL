// js/utils/sounds.js
// Gerador de sons usando Web Audio API
// Nenhum arquivo de áudio externo necessário!

window.SoundManager = (function() {
    let audioCtx = null;

    // Inicializa o contexto de áudio (somente quando o usuário interagir)
    function initAudio() {
        if (!audioCtx) {
            try {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            } catch (e) {
                console.warn('Web Audio API não suportada neste navegador.');
                return null;
            }
        }
        return audioCtx;
    }

    // Toca uma nota simples (frequência, duração, tipo de onda)
    function playTone(freq, duration = 0.15, type = 'sine', volume = 0.3) {
        const ctx = initAudio();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = volume;
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    }

    // Som: Resposta correta
    function playCorrect() {
        const ctx = initAudio();
        if (!ctx) return;
        // Acorde maior: Dó, Mi, Sol
        playTone(523.25, 0.12, 'sine', 0.3); // Dó
        setTimeout(() => playTone(659.25, 0.12, 'sine', 0.3), 100); // Mi
        setTimeout(() => playTone(783.99, 0.15, 'sine', 0.3), 200); // Sol
    }

    // Som: Resposta errada
    function playWrong() {
        const ctx = initAudio();
        if (!ctx) return;
        // Nota grave e "suja" (onda dente de serra)
        playTone(150, 0.3, 'sawtooth', 0.2);
        // Pequeno ruído no final
        setTimeout(() => playTone(80, 0.2, 'square', 0.15), 150);
    }

    // Som: Tempo esgotado (bip duplo)
    function playTimeUp() {
        const ctx = initAudio();
        if (!ctx) return;
        playTone(800, 0.1, 'square', 0.2);
        setTimeout(() => playTone(600, 0.1, 'square', 0.2), 150);
    }

    // Som: Início da partida (whoosh ascendente)
    function playGameStart() {
        const ctx = initAudio();
        if (!ctx) return;
        const startFreq = 300;
        const endFreq = 800;
        const duration = 0.5;
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
    }

    // Som: Fanfarra (fim de partida)
    function playFanfare() {
        const ctx = initAudio();
        if (!ctx) return;
        // Sequência: Mi, Sol, Dó, Mi
        const notes = [659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 0.15, 'sine', 0.3), i * 120);
        });
    }

    // Som: Comemoração (classificação para próxima fase)
    function playCelebration() {
        const ctx = initAudio();
        if (!ctx) return;
        // Sequência ascendente mais longa
        const notes = [523, 587, 659, 784, 880, 988, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 0.1, 'sine', 0.25), i * 80);
        });
    }

    // Som: Clique (feedback tátil para botões)
    function playClick() {
        playTone(1200, 0.05, 'sine', 0.1);
    }

    // Expor funções globalmente
    window.soundManager = {
        playCorrect,
        playWrong,
        playTimeUp,
        playGameStart,
        playFanfare,
        playCelebration,
        playClick,
        // Para uso interno (caso necessário)
        playTone,
        initAudio
    };

    return window.soundManager;
})();
