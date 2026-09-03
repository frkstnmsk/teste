// =====================================================================
// CHUVA DE NEON — Banco Global de Itens
// =====================================================================
// Biblioteca compartilhada de itens (armas, coletes, ferramentas, etc)
// que o Mestre e os jogadores podem reaproveitar em qualquer ficha ou
// NPC, sem redigitar dano/alcance/capacidade toda vez.
//
// Estrutura no Firebase (raiz do banco, igual calendario/npcs):
//
// itensGlobais: {
//   "<itemId>": {
//     nome: "Pistola 1911",
//     descricao: "Clássica, confiável, fácil de manter.",
//     modificadores: [{ alvo: "pericia:Armas de Fogo de Pequeno Porte", valor: 1 }],
//     tag: "arma",                 // uma das TAGS_ITEM (dados-manual.js)
//     nivelTag: 2,                 // nível 1–5, só se a tag tiver nível
//     peso: 1.1,
//     periciaUso: "Armas de Fogo de Pequeno Porte",
//     classeProtecao: "II",        // só armas de fogo / proteção
//     reducoesDano: [],            // só tags que reduzem dano (proteção)
//     localProtegido: "torso",     // só tag "colete" (Proteção) — cabeça,
//                                  // torso, membro ou extremidade
//     arma: {                      // só tag "arma"
//       danoBase: 12,
//       dano: "12 + Destreza D",   // texto livre, igual ao item de ficha
//       tipoDano: "perfuracao_especial",
//       escala: "D",
//       modificacoesArma: ["Aumento de dano (+1/4 do dano)"]
//     },
//     criadoEm: 1730000000000,
//     origemFichaId: "niki-valente" | null   // null = cadastrado direto
//                                             // na Biblioteca pelo Mestre
//   }
// }
//
// O item do banco é o "molde": ele NUNCA guarda `categoria` (levando/casa),
// porque isso é um detalhe de onde o item está guardado em CADA ficha,
// não uma característica do item em si. Ao equipar um item do banco numa
// ficha, o código em ficha.js copia todos os campos do molde + define a
// categoria escolhida ali na hora (ver `autopreencherItemDoBanco`).
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

// ---------------------------------------------------------------------
// Escuta a lista completa do banco (usada tanto pra popular o
// autocompletar do modal de item quanto pra aba "Biblioteca de Itens
// Salvos" no Painel do Mestre).
// ---------------------------------------------------------------------
export function ouvirItensGlobais(callback) {
    return onValue(ref(db, "itensGlobais"), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Busca simples por substring no nome — client-side, contra o cache já
// carregado pelo listener acima (a lista de itens tende a ser pequena o
// bastante pra isso ser instantâneo e não precisar de índice no banco).
export function buscarItensGlobaisPorNome(cacheItens, texto) {
    const alvo = (texto || "").trim().toLowerCase();
    if (!alvo) return [];
    return cacheItens.filter(it => (it.nome || "").toLowerCase().includes(alvo)).slice(0, 12);
}

// Monta o objeto "molde" a partir do registro de item de uma ficha (ou
// de um formulário equivalente), removendo o que é específico de onde o
// item está guardado (categoria) e adicionando metadados do banco.
export function montarItemBancoAPartirDe(itemFicha, origemFichaId) {
    const { categoria, ...resto } = itemFicha;
    return {
        ...resto,
        criadoEm: Date.now(),
        origemFichaId: origemFichaId || null
    };
}

// Salva (cria) um novo item no Banco Global. Retorna o id gerado.
export async function salvarItemNoBanco(itemFicha, origemFichaId) {
    const novaRef = push(ref(db, "itensGlobais"));
    await set(novaRef, montarItemBancoAPartirDe(itemFicha, origemFichaId));
    return novaRef.key;
}

// Atualiza um item já existente no banco (edição direto na Biblioteca).
export async function atualizarItemBanco(itemId, itemBanco) {
    await update(ref(db, `itensGlobais/${itemId}`), itemBanco);
}

export async function excluirItemBanco(itemId) {
    await remove(ref(db, `itensGlobais/${itemId}`));
}

export async function buscarItemBancoPorId(itemId) {
    const snap = await get(ref(db, `itensGlobais/${itemId}`));
    return snap.exists() ? { id: itemId, ...snap.val() } : null;
}

// A partir de um item do banco, monta o registro pronto pra entrar no
// inventário de uma ficha/NPC — reaplica a categoria de destino
// escolhida ali (não existe no molde do banco).
export function autopreencherItemDoBanco(itemBanco, categoriaDestino) {
    const { id, criadoEm, origemFichaId, ...resto } = itemBanco;
    return {
        ...resto,
        categoria: categoriaDestino || "levando"
    };
}
