// js/modules/sound.js
const SONS_CONFIG = {
  acerto: { emoji: '✅', nome: 'Acerto', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' },
  erro: { emoji: '❌', nome: 'Erro', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3' },
  tempo_esgotado: { emoji: '⏰', nome: 'Tempo Esgotado', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  inicio_fase: { emoji: '🏁', nome: 'Início da Fase', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2774/2774-preview.mp3' },
  fim_fase: { emoji: '⏹️', nome: 'Fim da Fase', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2773/2773-preview.mp3' },
  nova_fase: { emoji: '🚀', nome: 'Nova Fase', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2726/2726-preview.mp3' },
  top3: { emoji: '🏆', nome: 'Pódio', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2754/2754-preview.mp3' },
  subiu_ranking: { emoji: '📈', nome: 'Subiu Ranking', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2709/2709-preview.mp3' },
  classificado: { emoji: '🔔', nome: 'Classificado', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2754/2754-preview.mp3' },
  clique: { emoji: '🖱️', nome: 'Clique', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2706/2706-preview.mp3' },
  notificacao: { emoji: '📢', nome: 'Notificação', enabled: true, url: 'https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3' }
};

let audioCache = new Map();
let somMasterEnabled = true;
let volumeGlobal = 0.7;

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
  } catch (e) {}
}

export function salvarPreferenciasSom() {
  try {
    const prefs = { master: somMasterEnabled, volume: Math.round(volumeGlobal * 100) };
    for (const key in SONS_CONFIG) prefs[key] = SONS_CONFIG[key].enabled;
    localStorage.setItem('copa_som_prefs', JSON.stringify(prefs));
  } catch (e) {}
}

export function tocarSom(key, volumeOverride = null) {
  if (!somMasterEnabled) return;
  const config = SONS_CONFIG[key];
  if (!config || !config.enabled) return;
  const volume = volumeOverride !== null ? volumeOverride : volumeGlobal;
  try {
    let audio = audioCache.get(key);
    if (!audio) { audio = new Audio(config.url); audioCache.set(key, audio); }
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.currentTime = 0;
    audio.play().catch(e => {});
  } catch (e) {}
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

  // Eventos dos toggles
  container.querySelectorAll('.som-toggle').forEach(toggle => {
    toggle.addEventListener('click', function() {
      const key = this.dataset.key;
      SONS_CONFIG[key].enabled = !SONS_CONFIG[key].enabled;
      this.classList.toggle('ativo');
      salvarPreferenciasSom();
    });
  });

  // Eventos dos botões de teste
  container.querySelectorAll('.btn-testar-som').forEach(btn => {
    btn.addEventListener('click', function() {
      testarSom(this.dataset.key);
    });
  });
}

export function inicializarSons() {
  carregarPreferenciasSom();
  renderizarPainelSom();

  // Botão master
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

  // Volume
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

  // Testar todos
  document.getElementById('btn-testar-todos-sons')?.addEventListener('click', testarTodosSons);
}
