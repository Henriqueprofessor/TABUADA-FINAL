// js/config/firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBkoL3Zn-YkGUy6RAWZYVhWtIbcfL8h-J8",
  authDomain: "final-copa-tabuada.firebaseapp.com",
  databaseURL: "https://final-copa-tabuada-default-rtdb.firebaseio.com",
  projectId: "final-copa-tabuada",
  storageBucket: "final-copa-tabuada.firebasestorage.app",
  messagingSenderId: "488825824115",
  appId: "1:488825824115:web:50e94f68253473aee91b06"
};

window.firebase.initializeApp(firebaseConfig);

const db = window.firebase.database();
const auth = window.firebase.auth();
auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);

// ============================================
// HABILITAR PERSISTÊNCIA OFFLINE (silencioso)
// ============================================
(function enableOfflinePersistence() {
  try {
    const database = window.firebase.database();
    if (database && typeof database.setPersistenceEnabled === 'function') {
      database.setPersistenceEnabled(true);
      console.log('💾 Persistência offline ativada!');
      return;
    }
    if (db && typeof db.setPersistenceEnabled === 'function') {
      db.setPersistenceEnabled(true);
      console.log('💾 Persistência offline ativada!');
      return;
    }
  } catch (e) {
    // silencioso – jogo segue normal
  }
})();

// ============================================
// MONITOR DE CONEXÃO
// ============================================

let connectionStatus = {
  online: false,
  listeners: []
};

function notifyConnectionListeners(status) {
  connectionStatus.online = status;
  connectionStatus.listeners.forEach(cb => cb(status));
}

export function initConnectionMonitor() {
  const connectedRef = db.ref('.info/connected');
  connectedRef.on('value', (snap) => {
    const online = snap.val() === true;
    console.log(`🔥 Firebase conexão: ${online ? 'ONLINE' : 'OFFLINE'}`);
    notifyConnectionListeners(online);
  });
}

export function onConnectionChange(callback) {
  if (typeof callback === 'function') {
    connectionStatus.listeners.push(callback);
    callback(connectionStatus.online);
  }
}

export function getConnectionStatus() {
  return connectionStatus.online;
}

export function recriarPresencaOnline(id, tipo) {
  if (!id) return;
  const ref = db.ref(`online/${id}`);
  ref.set({ tipo: tipo || 'usuario', timestamp: Date.now() });
  ref.onDisconnect().remove();
  console.log(`🔄 Presença online recriada para ${id} (${tipo})`);
}

export { db, auth };
