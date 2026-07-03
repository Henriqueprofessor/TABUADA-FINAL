import { auth } from '../config/firebase.js';
import { exibirToast } from './ui.js';
import { state } from './state.js';

export async function loginProfessor(email, senha) {
  try {
    await auth.signInWithEmailAndPassword(email, senha);
    return { success: true };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function logoutProfessor() {
  await auth.signOut();
}

export function getCurrentUser() {
  return auth.currentUser;
}

export function onAuthStateChanged(callback) {
  auth.onAuthStateChanged(callback);
}
