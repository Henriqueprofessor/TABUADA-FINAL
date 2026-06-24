// js/utils/helpers.js

// Toast
export function toast(message) {
  const t = document.getElementById('toast');
  if (t) {
    t.innerText = message;
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
  }
}

export function updateLastSyncTime() {
  const span = document.getElementById('last-sync-time');
  if (span) {
    span.innerText = new Date().toLocaleString('pt-BR');
  }
  toast('Sincronizado!');
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) { return c; });
}

export function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
