// js/models/state.js
import { listenToCopa } from '../services/firebase-service.js';

class AppState {
  constructor() {
    this.data = null;                 // estado completo do nó copaV2
    this.userType = null;             // 'professor' | 'aluno' | 'projecao'
    this.alunoId = null;
    this.alunoNome = null;
    this.alunoTurma = null;
    this.faseSelecionadaProf = 1;
    this.modoTorcida = 'individual';
    this.intervalos = { individual: 4, equipes: 60 };
    this.listeners = [];
    this.isInitialized = false;
  }

  // Inicializa o listener do Firebase
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    listenToCopa((data) => {
      this.data = data || this.getDefaultState();
      this.notify();
    });
    // ... também escutar configurações de intervalos
  }

  getDefaultState() {
    return {
      fase: 1,
      status: 'aguardando',
      tempoFase: 12,
      fim: 0,
      modalidade: '2-5',
      resultados: {},
      participantes: {},
      classificados: {},
      tempoRestantePausa: 0
    };
  }

  // Notifica todos os observadores registrados
  notify() {
    this.listeners.forEach(fn => fn(this.data));
  }

  subscribe(callback) {
    this.listeners.push(callback);
    // Se já tiver dados, chama imediatamente
    if (this.data) callback(this.data);
    return () => { this.listeners = this.listeners.filter(fn => fn !== callback); };
  }

  // Getters úteis
  get fase() { return this.data?.fase || 1; }
  get status() { return this.data?.status || 'aguardando'; }
  get modalidade() { return this.data?.modalidade || '2-5'; }
  get participantes() { return this.data?.participantes || {}; }
  get resultados() { return this.data?.resultados || {}; }
  get classificados() { return this.data?.classificados || {}; }
}

export const appState = new AppState();
