const SONS_CONFIG = {
  acerto: { emoji: '✅', nome: 'Acerto', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', freq: 800, duration: 0.15 },
  erro: { emoji: '🤪', nome: 'Erro Engraçado', enabled: true, url: '', freq: 300, duration: 0.4, type: 'wah' }, // MODIFICADO: som engraçado
  tempo_esgotado: { emoji: '⏰', nome: 'Tempo Esgotado', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', freq: 200, duration: 0.4 },
  inicio_fase: { emoji: '🏁', nome: 'Início da Fase', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2774/2774-preview.mp3', freq: 523, duration: 0.3 },
  fim_fase: { emoji: '⏹️', nome: 'Fim da Fase', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2773/2773-preview.mp3', freq: 440, duration: 0.5 },
  nova_fase: { emoji: '🚀', nome: 'Nova Fase', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2726/2726-preview.mp3', freq: 660, duration: 0.25 },
  top3: { emoji: '🏆', nome: 'Pódio', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2754/2754-preview.mp3', freq: 880, duration: 0.35 },
  subiu_ranking: { emoji: '📈', nome: 'Subiu Ranking', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2709/2709-preview.mp3', freq: 600, duration: 0.2 },
  classificado: { emoji: '🔔', nome: 'Classificado', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2754/2754-preview.mp3', freq: 1000, duration: 0.25 },
  clique: { emoji: '🖱️', nome: 'Clique', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2706/2706-preview.mp3', freq: 600, duration: 0.05 },
  notificacao: { emoji: '📢', nome: 'Notificação', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3', freq: 700, duration: 0.2 }
};

let audioCache = new Map();
let somMasterEnabled = true;
let volumeGlobal = 0.7;

// ============================================================
// WEB AUDIO API (FALLBACK) - com tratamento de erros
// ============================================================

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('⚠️ Web Audio API não suportada. Sons sintéticos não estarão disponíveis.');
      return null;
    }
  }
  return audioContext;
}

// Função para tocar som "engraçado" (wah wah)
function playWahSound(volume = 0.7) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);

    gain.gain.setValueAtTime(Math.min(1, volume * 1.2), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    console.debug('🔇 Som wah falhou:', e);
  }
}

function playSyntheticSound(freq, duration, volume = 0.7) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = freq;

    gainNode.gain.setValueAtTime(Math.min(1, volume * 1.2), ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);

    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch (e) {
    console.debug('🔇 Som sintético falhou:', e);
  }
}

// ============================================================
// CARREGAR PREFERÊNCIAS
// ============================================================

export function carregarPreferenciasSom() {
  try {
    const saved = localStorage.getItem('copa_som_prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      somMasterEnabled = prefs.master !== undefined ? prefs.master : true;
      volumeGlobal = prefs.volume !== undefined ? prefs.volume / 100 : 0.7;
      for (const key in SONS_CONFIG) {
        if (prefs[key] !== undefined) SONS_CONFIG[key].enabled = prefs[key];
      }
    }
  } catch (e) {
    console.warn('Erro ao carregar preferências de som:', e);
  }
}

export function salvarPreferenciasSom() {
  try {
    const prefs = { master: somMasterEnabled, volume: Math.round(volumeGlobal * 100) };
    for (const key in SONS_CONFIG) prefs[key] = SONS_CONFIG[key].enabled;
    localStorage.setItem('copa_som_prefs', JSON.stringify(prefs));
  } catch (e) {
    console.warn('Erro ao salvar preferências de som:', e);
  }
}

// ============================================================
// TOCAR SOM (com fallback e tratamento de erros)
// ============================================================

export function tocarSom(key, volumeOverride = null) {
  if (!somMasterEnabled) return;
  const config = SONS_CONFIG[key];
  if (!config || !config.enabled) return;

  const volume = volumeOverride !== null ? volumeOverride : volumeGlobal;

  // Se for erro e tiver type 'wah', toca o som engraçado
  if (key === 'erro' && config.type === 'wah') {
    playWahSound(volume);
    return;
  }

  try {
    let audio = audioCache.get(key);
    if (!audio) {
      audio = new Audio(config.url);
      audioCache.set(key, audio);
      audio.load();
    }

    if (audio.readyState >= 2) {
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.currentTime = 0;
      audio.play().catch(e => {
        console.debug('🔊 Áudio falhou, usando fallback sintético para:', key);
        playSyntheticSound(config.freq, config.duration, volume);
      });
      return;
    } else {
      audio.load();
      audio.addEventListener('canplaythrough', function onCanPlay() {
        audio.removeEventListener('canplaythrough', onCanPlay);
        if (somMasterEnabled && config.enabled) {
          audio.volume = Math.min(1, Math.max(0, volume));
          audio.currentTime = 0;
          audio.play().catch(() => {});
        }
      }, { once: true });
      playSyntheticSound(config.freq, config.duration, volume);
    }
  } catch (e) {
    console.debug('🔊 Usando fallback sintético para:', key);
    playSyntheticSound(config.freq, config.duration, volume);
  }
}

export function testarSom(key) {
  tocarSom(key, Math.min(1, volumeGlobal * 1.2));
}

export function testarTodosSons() {
  const keys = Object.keys(SONS_CONFIG);
  keys.forEach((key, i) => {
    setTimeout(() => tocarSom(key, Math.min(1, volumeGlobal * 1.2)), i * 400);
  });
}

// ============================================================
// RENDERIZAR PAINEL DE SOM
// ============================================================

export function renderizarPainelSom() {
  const container = document.getElementById('som-grid-container');
  if (!container) return;
  let html = '';
  for (const [key, config] of Object.entries(SONS_CONFIG)) {
    html += `
      <div class="som-item" data-som-key="${key}">
        <div class="som-info">
          <span class="emoji">${config.emoji}</span>
          <span class="nome">${config.nome}</span>
        </div>
        <div class="som-controles">
          <button class="btn-testar-som" data-key="${key}">▶</button>
          <div class="som-toggle ${config.enabled ? 'ativo' : ''}" data-key="${key}">
            <div class="toggle-slider"></div>
          </div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;

  container.querySelectorAll('.som-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const key = this.dataset.key;
      SONS_CONFIG[key].enabled = !SONS_CONFIG[key].enabled;
      this.classList.toggle('ativo');
      salvarPreferenciasSom();
    });
  });

  container.querySelectorAll('.btn-testar-som').forEach(btn => {
    btn.addEventListener('click', function() {
      testarSom(this.dataset.key);
    });
  });
}

// ============================================================
// INICIALIZAR SONS
// ============================================================

export function inicializarSons() {
  carregarPreferenciasSom();
  renderizarPainelSom();

  const btnMaster = document.getElementById('btn-som-master');
  if (btnMaster) {
    btnMaster.textContent = somMasterEnabled ? '🔊 Sons Ativados' : '🔇 Sons Desativados';
    btnMaster.className = `btn-som-master ${somMasterEnabled ? 'ativado' : 'desativado'}`;
    btnMaster.addEventListener('click', function() {
      somMasterEnabled = !somMasterEnabled;
      this.textContent = somMasterEnabled ? '🔊 Sons Ativados' : '🔇 Sons Desativados';
      this.className = `btn-som-master ${somMasterEnabled ? 'ativado' : 'desativado'}`;
      salvarPreferenciasSom();
    });
  }

  const volumeSlider = document.getElementById('volume-global');
  const volumeLabel = document.getElementById('volume-label');
  if (volumeSlider && volumeLabel) {
    volumeSlider.value = Math.round(volumeGlobal * 100);
    volumeLabel.textContent = Math.round(volumeGlobal * 100) + '%';
    volumeSlider.addEventListener('input', function() {
      volumeGlobal = this.value / 100;
      volumeLabel.textContent = Math.round(volumeGlobal * 100) + '%';
      salvarPreferenciasSom();
    });
  }

  document.getElementById('btn-testar-todos-sons')?.addEventListener('click', testarTodosSons);
}
