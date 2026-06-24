// js/main.js
import { appState } from './models/state.js';
import { initProfessorUI } from './ui/professor-ui.js';
import { initAlunoUI } from './ui/aluno-ui.js';
import { initTorcidaUI } from './ui/torcida-ui.js';
import { loginProfessor } from './services/auth-service.js';
import { carregarTurmas, carregarIntervalos } from './services/firebase-service.js';

// Inicializa o estado (escuta Firebase)
appState.init();

// Carrega dados estáticos
await carregarTurmas();
await carregarIntervalos();

// Configura listeners para botões de menu (Professor, Aluno, Torcida)
document.getElementById('btn-professor').addEventListener('click', () => {
  // Chamar login (Firebase Auth ou prompt temporário)
  if (prompt('Senha:') === '......') {
    appState.userType = 'professor';
    initProfessorUI();
  }
});

document.getElementById('btn-aluno').addEventListener('click', async () => {
  // Fluxo de seleção de turma e login do aluno
  // ...
  appState.userType = 'aluno';
  initAlunoUI();
});

document.getElementById('btn-projecao').addEventListener('click', () => {
  appState.userType = 'projecao';
  initTorcidaUI();
});
