// =====================================================================
// CHUVA DE NEON — Registro de Sessões (estado global da mesa)
// =====================================================================
// Igual ao calendário/log de dados (calendario.js): vive na raiz da
// mesa (`mesas/{mesaId}/sessoes`), visível por todos que estão na
// mesma mesa — Mestre e jogadores. Cada entrada é uma sessão de jogo
// já jogada: nome, dia ingame de início/fim, descrição livre e o XP
// distribuído naquela sessão. Só o Mestre cria/edita/exclui (ver
// isMestre em configurarRegistroSessoes, ficha.js) — jogador só lê.

import { db } from "./firebase-config.js";
import { ref, set, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";

export function ouvirSessoes(callback) {
    return onValue(ref(db, caminhoMesa("sessoes")), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        const lista = Object.entries(valores).map(([id, v]) => ({ id, ...v }));
        callback(lista);
    });
}

export async function criarSessao(dados) {
    const novaRef = push(ref(db, caminhoMesa("sessoes")));
    await set(novaRef, { ...dados, criadoEm: Date.now() });
    return novaRef.key;
}

export async function atualizarSessao(id, dados) {
    await update(ref(db, caminhoMesa(`sessoes/${id}`)), dados);
}

export async function removerSessao(id) {
    await remove(ref(db, caminhoMesa(`sessoes/${id}`)));
}
