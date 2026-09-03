// =====================================================================
// CHUVA DE NEON — Banco Global de Receitas
// =====================================================================
// Biblioteca compartilhada de receitas de criação de item (Ferramenta
// de Criação geral: Mecânica Automotiva, Armeiro, Ofícios Utilitários,
// Explosivos, Eletrônica; ou Ferramenta de Criação Química: Química —
// ver PERICIAS_CRIACAO_ITEM em dados-manual.js) que jogadores E o
// Mestre podem cadastrar, em QUALQUER mesa — igual o Banco Global de
// Itens (itens-globais.js), mas pra receitas em vez de itens prontos.
//
// Estrutura no Firebase (raiz do banco, igual itensGlobais/npcs):
//
// receitasGlobais: {
//   "<receitaId>": {
//     nome: "Faca de combate improvisada",   // nome do item resultante
//     periciaVinculada: "Ofícios Utilitários", // uma de PERICIAS_CRIACAO_ITEM
//     nivel: 2,                               // 1 a 5 — nível mínimo que a
//                                              // perícia de criação vinculada
//                                              // precisa ter pra essa receita
//                                              // poder ser usada. Regra de
//                                              // conteúdo (não travada no
//                                              // código): pra cada perícia de
//                                              // criação de item, deve
//                                              // existir no mínimo 1 receita
//                                              // cadastrada em CADA nível de
//                                              // 1 até 5 — um jogador com a
//                                              // perícia em nível 3, por
//                                              // exemplo, precisa ter opção
//                                              // de receita nível 1, 2 e 3
//                                              // disponível (ver
//                                              // renderizarReceitas em
//                                              // ficha.js, que filtra a
//                                              // lista da aba "Receitas"
//                                              // pelo nível atual da perícia).
//     dificuldade: 12,                        // número, opcional
//     dificuldadeArmar: null,                 // número, opcional — só
//                                              // Explosivos tem teste
//                                              // separado de criar e
//                                              // armar o item (manual
//                                              // pg. 81: "Teste e dif
//                                              // criar e armar:
//                                              // Explosivos, dificuldade
//                                              // 22, 18" — o primeiro
//                                              // número é `dificuldade`
//                                              // acima, o segundo é
//                                              // este). null pra
//                                              // qualquer receita que
//                                              // só tem um teste único
//                                              // (a imensa maioria).
//     tempoCriacao: "2 horas",                // texto livre, opcional
//     ingredientes: [                         // lista de materiais válidos
//         { material: "Metal leve", qualidade: "Baixa", quantidade: 2 }, // (ver
//         { material: "Material bélico", qualidade: null, quantidade: 1 } // MATERIAIS_CRIACAO
//     ],                                      // em dados-manual.js — nada de
//                                              // texto livre aqui. `qualidade`
//                                              // usa o rótulo EXATO do manual
//                                              // pra aquele material (varia:
//                                              // maioria é Baixa/Média/Boa,
//                                              // CEB e Material Químico usam
//                                              // Alta) — ou null pros que
//                                              // não têm variação (Material
//                                              // bélico, Material especial —
//                                              // ver qualidadesDoMaterial).
//     custo: 50,                              // CN$, opcional
//     descricao: "Efeito/notas livres sobre a receita e o item final.",
//     itemGlobalId: "abc123" | null,          // se vinculada a um item já
//                                              // cadastrado no Banco Global
//                                              // de Itens (itens-globais.js)
//     criadoEm: 1730000000000,
//     criadoPorNome: "Niki Valente",
//     criadoPorTipo: "jogador" | "mestre"
//   }
// }
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, push, onValue } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";

// Escuta a lista completa do banco (usada tanto pela aba "Receitas" da
// ficha quanto pela "Biblioteca de Receitas" no Painel do Mestre).
export function ouvirReceitasGlobais(callback) {
    return onValue(ref(db, "receitasGlobais"), (snap) => {
        if (!snap.exists()) { callback([]); return; }
        const valores = snap.val();
        callback(Object.entries(valores).map(([id, v]) => ({ id, ...v })));
    });
}

// Salva (cria) uma nova receita no Banco Global. Retorna o id gerado.
export async function salvarReceitaNoBanco(receita) {
    const novaRef = push(ref(db, "receitasGlobais"));
    await set(novaRef, { ...receita, criadoEm: Date.now() });
    return novaRef.key;
}

// Atualiza uma receita já existente (edição direto na Biblioteca).
export async function atualizarReceitaBanco(receitaId, receita) {
    await update(ref(db, `receitasGlobais/${receitaId}`), receita);
}

export async function excluirReceitaBanco(receitaId) {
    await remove(ref(db, `receitasGlobais/${receitaId}`));
}

export async function buscarReceitaBancoPorId(receitaId) {
    const snap = await get(ref(db, `receitasGlobais/${receitaId}`));
    return snap.exists() ? { id: receitaId, ...snap.val() } : null;
}
