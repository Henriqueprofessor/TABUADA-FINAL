// js/ui/professor-ui.js
import { appState } from '../models/state.js';
import { renderRankingIndividual, renderRankingTurmas } from '../ranking/ranking.js';
import { updateCopa, setCopa } from '../services/firebase-service.js';
import { toast, updateLastSyncTime } from './common-ui.js';

export function initProfessorUI() {
  // Esconder outras telas, mostrar painel professor
  // Registrar observador do estado
  appState.subscribe((data) => {
    if (appState.userType === 'professor') {
      atualizarUIProfessor(data);
    }
  });

  // Configurar eventos dos botões (usando delegação ou listeners)
  document.getElementById('btn-iniciar-fase').addEventListener('click', () => {
    // ... chamar updateCopa
  });
  // ... demais eventos
}

function atualizarUIProfessor(data) {
  // Atualizar campos de texto, timer, abas, etc.
  // Disparar atualizações de ranking quando necessário
}
