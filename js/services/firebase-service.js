function iniciarListeners() {
    // Listener para metadados (fase, status, tempo, modalidade)
    if (listenerCopa) listenerCopa();
    listenerCopa = window.firebaseService.listenCopaMetadata((metadata) => {
        // Mescla com o estado atual (mantendo resultados, participantes, classificados se existirem)
        estadoAtual = estadoAtual || {};
        // Atualiza apenas os metadados
        Object.keys(metadata).forEach(key => {
            if (key !== 'resultados' && key !== 'participantes' && key !== 'classificados') {
                estadoAtual[key] = metadata[key];
            }
        });
        // Se não houver resultados/participantes no estado, usa os que vieram (se houver)
        if (!estadoAtual.resultados) estadoAtual.resultados = metadata.resultados || {};
        if (!estadoAtual.participantes) estadoAtual.participantes = metadata.participantes || {};
        if (!estadoAtual.classificados) estadoAtual.classificados = metadata.classificados || {};

        // Atualiza UI e outras partes que dependem dos metadados
        if (meuTipo === 'aluno' && alunoId) {
            const faseAnterior = sessionStorage.getItem('ultimaFase');
            if (faseAnterior && parseInt(faseAnterior) !== estadoAtual.fase) {
                sessionStorage.removeItem('modalExibido_' + faseAnterior);
                location.reload();
            }
            sessionStorage.setItem('ultimaFase', estadoAtual.fase);
        }
        atualizarUI();
        if (meuTipo === 'professor') {
            const modalSelect = document.getElementById('select-modalidade');
            if (modalSelect) {
                modalSelect.value = estadoAtual.modalidade;
                const hasResults = Object.keys(estadoAtual.resultados).some(f => Object.keys(estadoAtual.resultados[f] || {}).length > 0);
                if (estadoAtual.fase > 1 || hasResults) {
                    modalSelect.disabled = true;
                    modalSelect.title = "Modalidade fixa durante a competição.";
                } else {
                    modalSelect.disabled = false;
                    modalSelect.title = "";
                }
            }
            popularSelectFases();
            renderListaTurmas();
        }
    });

    // Listener para resultados da fase atual (e também para outras fases se necessário)
    // Vamos escutar todas as fases para manter o estado completo
    // Mas para performance, podemos escutar apenas a fase atual + fases anteriores necessárias.
    // Para simplificar, vamos escutar todas as fases (limitado a TOTAL_FASES)
    if (listenerResultados) {
        Object.values(listenerResultados).forEach(unsub => unsub());
    }
    listenerResultados = {};
    for (let fase = 1; fase <= window.TOTAL_FASES; fase++) {
        const faseNum = fase;
        listenerResultados[faseNum] = window.firebaseService.listenResultados(faseNum, (data) => {
            if (!estadoAtual) estadoAtual = {};
            if (!estadoAtual.resultados) estadoAtual.resultados = {};
            estadoAtual.resultados[faseNum] = data || {};
            // Se for a fase atual ou relevante, atualiza UI
            if (meuTipo === 'professor' || meuTipo === 'projecao') {
                // Se a aba de ranking ou estatísticas estiver aberta, atualiza
                atualizarUI();
            }
        });
    }

    // Listener para participantes de todas as fases
    if (listenerParticipantes) {
        Object.values(listenerParticipantes).forEach(unsub => unsub());
    }
    listenerParticipantes = {};
    for (let fase = 1; fase <= window.TOTAL_FASES; fase++) {
        const faseNum = fase;
        listenerParticipantes[faseNum] = window.firebaseService.listenParticipantes(faseNum, (data) => {
            if (!estadoAtual) estadoAtual = {};
            if (!estadoAtual.participantes) estadoAtual.participantes = {};
            estadoAtual.participantes[faseNum] = data || {};
            atualizarUI();
        });
    }

    // Listener para classificados de todas as fases
    if (listenerClassificados) {
        Object.values(listenerClassificados).forEach(unsub => unsub());
    }
    listenerClassificados = {};
    for (let fase = 1; fase <= window.TOTAL_FASES; fase++) {
        const faseNum = fase;
        listenerClassificados[faseNum] = window.firebaseService.listenClassificados(faseNum, (data) => {
            if (!estadoAtual) estadoAtual = {};
            if (!estadoAtual.classificados) estadoAtual.classificados = {};
            estadoAtual.classificados[faseNum] = data || [];
            atualizarUI();
        });
    }

    // Listener para online (mantido)
    if (listenerOnline) listenerOnline();
    listenerOnline = window.firebaseService.listenOnline((snap) => {
        // ... mesmo código de antes ...
    });
}
