// ============================================================
// ARQUIVO: js/services/auth-service.js
// DESCRIÇÃO: Serviço de Autenticação (Firebase Auth)
// ============================================================

import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '../config/firebase-config.js';

// ========== INICIALIZAR FIREBASE AUTH ==========
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// ========== CONFIGURAÇÕES DE PERSISTÊNCIA ==========
export const setPersistenciaLocal = () => {
    return setPersistence(auth, browserLocalPersistence);
};

export const setPersistenciaSessao = () => {
    return setPersistence(auth, browserSessionPersistence);
};

// ========== LOGIN ==========

// Login com email e senha (Professor)
export const loginProfessor = async (email, password) => {
    try {
        await setPersistenciaLocal();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { 
            success: false, 
            error: error.code,
            message: getErrorMessage(error.code)
        };
    }
};

// ========== CADASTRO ==========

// Criar conta (apenas para administradores)
export const criarContaProfessor = async (email, password, nome) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: nome });
        return { success: true, user: userCredential.user };
    } catch (error) {
        return { 
            success: false, 
            error: error.code,
            message: getErrorMessage(error.code)
        };
    }
};

// ========== LOGOUT ==========

// Logout
export const logout = async () => {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: error.code,
            message: getErrorMessage(error.code)
        };
    }
};

// ========== RECUPERAÇÃO DE SENHA ==========

// Enviar email de recuperação de senha
export const recuperarSenha = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        return { 
            success: false, 
            error: error.code,
            message: getErrorMessage(error.code)
        };
    }
};

// ========== OBSERVADOR DE AUTENTICAÇÃO ==========

// Observar mudanças no estado de autenticação
export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            callback({
                authenticated: true,
                uid: user.uid,
                email: user.email,
                nome: user.displayName || 'Professor',
                photoURL: user.photoURL
            });
        } else {
            callback({
                authenticated: false,
                uid: null,
                email: null,
                nome: null,
                photoURL: null
            });
        }
    });
};

// ========== VERIFICAR AUTENTICAÇÃO ==========

// Verificar se está autenticado
export const isAuthenticated = () => {
    return auth.currentUser !== null;
};

// Obter usuário atual
export const getCurrentUser = () => {
    return auth.currentUser;
};

// ========== MENSAGENS DE ERRO ==========

const getErrorMessage = (errorCode) => {
    const mensagens = {
        'auth/invalid-email': '❌ Email inválido. Verifique e tente novamente.',
        'auth/user-disabled': '❌ Esta conta foi desativada. Entre em contato com o administrador.',
        'auth/user-not-found': '❌ Nenhum usuário encontrado com este email.',
        'auth/wrong-password': '❌ Senha incorreta. Tente novamente.',
        'auth/email-already-in-use': '❌ Este email já está em uso.',
        'auth/weak-password': '❌ A senha deve ter pelo menos 6 caracteres.',
        'auth/too-many-requests': '⚠️ Muitas tentativas. Aguarde alguns minutos.',
        'auth/network-request-failed': '⚠️ Erro de rede. Verifique sua conexão.',
        'auth/requires-recent-login': '⚠️ Faça login novamente para continuar.',
        'auth/invalid-credential': '❌ Credenciais inválidas. Verifique email e senha.',
        'auth/operation-not-allowed': '❌ Este método de login não está habilitado.',
        'auth/account-exists-with-different-credential': '❌ Já existe uma conta com este email usando outro método de login.'
    };
    return mensagens[errorCode] || `❌ Erro: ${errorCode}`;
};

// ========== SENHA DO PROFESSOR (FALBACK) ==========

// Senha fixa para acesso rápido (mantida por compatibilidade)
export const SENHA_PROFESSOR = '......';

// Verificar senha do professor (fallback)
export const verificarSenhaProfessor = (senha) => {
    return senha === SENHA_PROFESSOR;
};

// ========== EXPORTAR AUTH ==========
export { auth };

// ========== EXPORTAR PADRÃO ==========
export default auth;
