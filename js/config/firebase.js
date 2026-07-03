// Firebase inicialização
import firebase from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js';
import 'https://www.gstatic.com/firebasejs/10.12.5/firebase-database-compat.js';
import 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth-compat.js';

const firebaseConfig = {
  apiKey: "AIzaSyBkoL3Zn-YkGUy6RAWZYVhWtIbcfL8h-J8",
  authDomain: "final-copa-tabuada.firebaseapp.com",
  databaseURL: "https://final-copa-tabuada-default-rtdb.firebaseio.com",
  projectId: "final-copa-tabuada",
  storageBucket: "final-copa-tabuada.firebasestorage.app",
  messagingSenderId: "488825824115",
  appId: "1:488825824115:web:50e94f68253473aee91b06"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

export { db, auth };
