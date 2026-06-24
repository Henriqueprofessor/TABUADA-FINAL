// js/utils/helpers.js

// Exibe mensagem no canto inferior
window.toast = function(message) {
  var t = document.getElementById('toast');
  if (t) {
    t.innerText = message;
    t.classList.remove('hidden');
    setTimeout(function() { t.classList.add('hidden'); }, 3000);
  }
};

// Atualiza o horário da última sincronização
window.updateLastSyncTime = function() {
  var span = document.getElementById('last-sync-time');
  if (span) {
    span.innerText = new Date().toLocaleString('pt-BR');
  }
  window.toast('Sincronizado!');
};

// Escapa caracteres especiais para HTML
window.escapeHtml = function(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  }).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function(c) { return c; });
};

// Função para evitar múltiplos cliques rápidos
window.debounce = function(fn, delay) {
  var timer = null;
  return function() {
    var args = arguments;
    var context = this;
    if (timer) clearTimeout(timer);
    timer = setTimeout(function() {
      fn.apply(context, args);
      timer = null;
    }, delay);
  };
};

// Embaralha um array (modifica o original)
window.shuffleArray = function(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr;
};

// Gera um número inteiro aleatório entre min e max (inclusive)
window.randInt = function(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};
