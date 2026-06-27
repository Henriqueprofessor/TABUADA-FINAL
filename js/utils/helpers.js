// ============================================================
// ARQUIVO: js/utils/helpers.js
// DESCRIÇÃO: Funções auxiliares gerais do jogo
// ============================================================

// ========== TOAST ==========
export function toast(message, duracao = 3000) {
    const t = document.getElementById('toast');
    if (t) {
        t.innerText = message;
        t.classList.remove('hidden');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => {
            t.classList.add('hidden');
        }, duracao);
    }
}

// ========== ESCAPAR HTML ==========
export function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ========== DEBOUNCE ==========
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

// ========== EMBARALHAR ARRAY ==========
export function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ========== NÚMERO ALEATÓRIO ==========
export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ========== FORMATAR TEMPO ==========
export function formatarTempo(ms) {
    const totalSegundos = Math.floor(ms / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    return `${minutos}:${segundos.toString().padStart(2, '0')}`;
}

// ========== FORMATAR DATA ==========
export function formatarData(timestamp) {
    return new Date(timestamp).toLocaleString('pt-BR');
}

// ========== GERAR ID ÚNICO ==========
export function gerarId() {
    return Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
}

// ========== VALIDAR EMAIL ==========
export function validarEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// ========== VALIDAR SENHA ==========
export function validarSenha(senha) {
    return senha.length >= 6;
}

// ========== TRUNCAR TEXTO ==========
export function truncarTexto(texto, tamanho = 20) {
    if (!texto) return '';
    return texto.length > tamanho ? texto.substring(0, tamanho) + '...' : texto;
}

// ========== VERIFICAR SE É MOBILE ==========
export function isMobile() {
    return window.innerWidth <= 768;
}

// ========== VERIFICAR SE ESTÁ ONLINE ==========
export function isOnline() {
    return navigator.onLine;
}

// ========== COPIAR PARA ÁREA DE TRANSFERÊNCIA ==========
export function copiarTexto(texto) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(texto);
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

// ========== DOWNLOAD DE ARQUIVO ==========
export function downloadArquivo(conteudo, nomeArquivo, tipo = 'text/plain') {
    const blob = new Blob([conteudo], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ========== ATUALIZAR ÚLTIMA SINCRONIZAÇÃO ==========
export function updateLastSyncTime() {
    const span = document.getElementById('last-sync-time');
    if (span) {
        span.innerText = formatarData(Date.now());
    }
    toast('🔄 Sincronizado!');
}

// ========== VERIFICAR TIPO DE USUÁRIO ==========
export function isProfessor() {
    return sessionStorage.getItem('userType') === 'professor';
}

export function isAluno() {
    return sessionStorage.getItem('userType') === 'aluno';
}

export function isTorcida() {
    return sessionStorage.getItem('userType') === 'projecao';
}
