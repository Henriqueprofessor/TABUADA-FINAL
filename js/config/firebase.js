// js/config/firebase.js
// O Firebase já foi carregado pelas tags script no HTML,
// mas precisamos inicializar o app antes de usar database() e auth().

const firebaseConfig = {
  apiKey: "AIzaSyBkoL3Zn-YkGUy6RAWZYVhWtIbcfL8h-J8",
  authDomain: "final-copa-tabuada.firebaseapp.com",
  databaseURL: "https://final-copa-tabuada-default-rtdb.firebaseio.com",
  projectId: "final-copa-tabuada",
  storageBucket: "final-copa-tabuada.firebasestorage.app",
  messagingSenderId: "488825824115",
  appId: "1:488825824115:web:50e94f68253473aee91b06"
};

// Inicializa o Firebase (usando a variável global 'firebase' carregada pelas tags script)
window.firebase.initializeApp(firebaseConfig);

const db = window.firebase.database();
const auth = window.firebase.auth();
auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);

export { db, auth };
