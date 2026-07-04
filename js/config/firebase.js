// js/config/firebase.js
// O Firebase já foi carregado pelas tags script no HTML,
// então a variável global 'firebase' está disponível.

const db = window.firebase.database();
const auth = window.firebase.auth();
auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);

export { db, auth };
