import { exibirToast, atualizarDisplayVersao } from './ui.js';
import { db } from '../config/firebase.js';

const VERSION_STORAGE_KEY = 'versao_jogo';
const VERSION_URL = 'version.json?v=' + Date.now();

export async function verificarVersao(mostrarToast = true) {
  try {
    const response = await fetch(VERSION_URL);
    if (!response.ok) {
      if (mostrarToast) exibirToast('⚠️ version.json não encontrado.');
      return null;
    }
    const data = await response.json();
    const versaoSalva = localStorage.getItem(VERSION_STORAGE_KEY);

    if (versaoSalva && versaoSalva !== data.version) {
      const confirmar = confirm(
        `🔄 NOVA VERSÃO DISPONÍVEL!\n\n` +
        `Versão atual: ${versaoSalva}\n` +
        `Nova versão: ${data.version}\n` +
        `Data: ${data.updateDate}\n\n` +
        `Novidades:\n${data.message}\n\n` +
        `Deseja recarregar para atualizar?`
      );
      if (confirmar) {
        localStorage.setItem(VERSION_STORAGE_KEY, data.version);
        window.location.reload();
      }
    } else if (!versaoSalva) {
      localStorage.setItem(VERSION_STORAGE_KEY, data.version);
      if (mostrarToast) exibirToast(`✅ Versão ${data.version} salva!`);
    } else {
      if (mostrarToast) exibirToast(`✅ Jogo atualizado! (v${data.version})`);
    }
    atualizarDisplayVersao(data.version);
    return data;
  } catch (e) {
    if (mostrarToast) exibirToast('⚠️ Erro ao verificar versão.');
    return null;
  }
}

export function iniciarListenerVersao() {
  db.ref('copaV2/configuracoes/versao').on('value', snap => {
    const dados = snap.val();
    if (dados && dados.version) {
      const versaoSalva = localStorage.getItem(VERSION_STORAGE_KEY);
      if (versaoSalva && versaoSalva !== dados.version) {
        exibirToast(`🔄 Nova versão ${dados.version} disponível. Recarregando...`);
        localStorage.setItem(VERSION_STORAGE_KEY, dados.version);
        setTimeout(() => window.location.reload(), 2000);
      }
    }
  });
}

// Função para o professor definir nova versão (salva no Firebase)
export async function definirNovaVersao(novaVersao, mensagem, data) {
  await db.ref('copaV2/configuracoes/versao').set({
    version: novaVersao,
    message: mensagem,
    updateDate: data || new Date().toISOString().split('T')[0]
  });
  exibirToast(`✅ Versão ${novaVersao} definida!`);
}
