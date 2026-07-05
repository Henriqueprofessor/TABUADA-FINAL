// js/modules/auth.js
import { auth } from '../config/firebase.js';
import { exibirToast } from './ui.js';
import { state } from './state.js';

export async function loginProfessor(email, senha) {
  try {
    await auth.signInWithEmailAndPassword(email, senha);
    return { success: true };
  } catch (error) {
    let mensagem = '❌ Erro ao fazer login. ';
    if (error.code === 'auth/user-not-found') {
      mensagem += 'Usuário não encontrado.';
    } else if (error.code === 'auth/wrong-password') {
      mensagem += 'Senha incorreta.';
    } else if (error.code === 'auth/invalid-email') {
      mensagem += 'E-mail inválido.';
    } else if (error.code === 'auth/too-many-requests') {
      mensagem += 'Muitas tentativas. Tente novamente mais tarde.';
    } else {
      mensagem += error.message;
    }
    exibirToast(mensagem);
    return { success: false, message: mensagem };
  }
}

export async function logoutProfessor() {
  try {
    await auth.signOut();
  } catch (error) {
    console.warn('Erro ao deslogar:', error);
    exibirToast('❌ Erro ao sair. Tente novamente.');
  }
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(callback);
}
