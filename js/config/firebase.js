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

// ============================================
// MONITOR DE CONEXÃO (Realtime Database)
// ============================================

// Estado atual da conexão
let connectionStatus = {
  online: false,
  listeners: []
};

// Função para notificar ouvintes
function notifyConnectionListeners(status) {
  connectionStatus.online = status;
  connectionStatus.listeners.forEach(cb => cb(status));
}

// Inicia o monitoramento da conexão
export function initConnectionMonitor() {
  const connectedRef = db.ref('.info/connected');
  connectedRef.on('value', (snap) => {
    const online = snap.val() === true;
    console.log(`🔥 Firebase conexão: ${online ? 'ONLINE' : 'OFFLINE'}`);
    notifyConnectionListeners(online);
  });
}

// Inscreve um callback para ser chamado sempre que o status mudar
export function onConnectionChange(callback) {
  if (typeof callback === 'function') {
    connectionStatus.listeners.push(callback);
    // Chama imediatamente com o estado atual
    callback(connectionStatus.online);
  }
}

// Obtém o status atual (síncrono)
export function getConnectionStatus() {
  return connectionStatus.online;
}

export { db, auth };
