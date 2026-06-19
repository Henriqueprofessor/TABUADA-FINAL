// js/services/auth-service.js
// Serviço de autenticação com Firebase

// OBS: O Firebase Auth já está disponível via SDK compat (firebase.auth())

// ========== PERSISTÊNCIA ==========
// Mantém o login mesmo após fechar o navegador (salva no localStorage)
function setLocalPersistence() {
    return firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
}

// ========== LOGIN ==========
function login(email, password) {
    return setLocalPersistence().then(() => {
        return firebase.auth().signInWithEmailAndPassword(email, password);
    });
}

// ========== LOGOUT ==========
function logout() {
    return firebase.auth().signOut();
}

// ========== VERIFICAR ESTADO ==========
function onAuthStateChanged(callback) {
    return firebase.auth().onAuthStateChanged(callback);
}

// ========== USUÁRIO ATUAL ==========
function getCurrentUser() {
    return firebase.auth().currentUser;
}

// ========== EXPORTAÇÃO GLOBAL ==========
window.authService = {
    login,
    logout,
    onAuthStateChanged,
    getCurrentUser,
    setLocalPersistence
};
