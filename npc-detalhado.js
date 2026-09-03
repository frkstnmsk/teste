// =====================================================================
// CHUVA DE NEON — Mini-Ficha de NPC (criação detalhada, Painel do Mestre)
// =====================================================================
// Diferente da Criação de Personagem (criacao.js), o Mestre NÃO tem
// pontos iniciais fixos nem restrição de Função/Desvantagens ao montar
// um NPC — ele digita os atributos primários que quiser, de 0 a 99
// (sem o teto de 7 do jogador), e o sistema calcula os secundários e
// recursos automaticamente a partir das MESMAS fórmulas do jogador
// (regras.js), mas permite sobrescrever qualquer um manualmente.
//
// Estrutura no Firebase — nó `npcs/{npcId}`, com os campos ANTIGOS
// (nome, pvs, periciasResumo, itensEssenciais, atributos, agilidade,
// constituicao, protecaoTipo/Valor — texto livre, usados pelo
// Gerenciador de Combate simplificado) preservados por compatibilidade,
// mais os campos NOVOS da mini-ficha detalhada:
//
// npcs: {
//   "<npcId>": {
//     // ---- campos antigos (mantidos) ----
//     nome, pvs, pvAtual, periciasResumo, itensEssenciais,
//     atributos, atributosSecundarios,       // texto livre
//     agilidade, constituicao,               // números soltos, usados
//                                             // pelo Gerenciador de Combate
//     protecaoTipo, protecaoValor, criadoEm,
//
//     // ---- campos novos (mini-ficha detalhada) ----
//     modoDetalhado: true,
//     vulgo: "Faca", idade: "32", funcaoNarrativa: "Capanga do Mercador",
//     atributosPrimarios: {
//       forca: 4, constituicao: 5, destreza: 6, sabedoria: 2,
//       inteligencia: 3, raciocinio: 4, carisma: 1, manipulacao: 2
//     },
//     // Qualquer chave aqui com valor != null SOBRESCREVE o cálculo
//     // automático (regras.js) só pra esse NPC. Ausente/null = calculado.
//     secundariosOverride: {
//       velocidade: null, agilidade: null, percepcao: null,
//       massa_corporea: null, forca_vontade: null, pv: 80, energia: null
//     },
//     periciasNpc: {
//       "id1": { nome: "CQC", nivel: 4 },
//       "id2": { nome: "Intimidação", nivel: 3 }
//     }
//   }
// }
// =====================================================================

import { ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS, calcularDerivados, MAX_ATRIBUTO_CRIACAO } from "./regras.js";

export function estadoInicialAtributosPrimariosNpc() {
    const out = {};
    for (const a of ATRIBUTOS_PRIMARIOS) out[a.key] = 0;
    return out;
}

export function estadoInicialSecundariosOverrideNpc() {
    const out = {};
    for (const s of ATRIBUTOS_SECUNDARIOS) out[s.key] = null;
    for (const r of RECURSOS) out[r.key] = null;
    return out;
}

export function estadoInicialNpcDetalhado() {
    return {
        modoDetalhado: true,
        vulgo: "",
        idade: "",
        funcaoNarrativa: "",
        // Nível do NPC (opcional, default 1) — usado só pra sugerir a
        // faixa de PV (ver faixaPvSugeridaNpc abaixo). Não trava nada
        // no NPC: continua sendo um número livre digitado pelo Mestre.
        nivel: 1,
        atributosPrimarios: estadoInicialAtributosPrimariosNpc(),
        secundariosOverride: estadoInicialSecundariosOverrideNpc(),
        periciasNpc: {},
        // ---- Ficha completa (Módulo 3) ----
        // Mesmo formato usado pela ficha de jogador (ver inventario.js /
        // normalizacao.js), pra que o Mestre possa "atuar como" esse NPC
        // na tela da Ficha e usar a MESMA interface de golpes/itens do
        // jogador durante o combate, em vez de só rolar dado à mão.
        inventario: {},
        categoriasInventario: {},
        energiaAtual: null
    };
}

// Calcula os secundários/recursos de um NPC a partir dos atributos
// primários (mesmas fórmulas do jogador). `modificadoresExtras` é
// opcional (default []) — usado pra somar os modificadores estruturados
// das Vantagens do NPC (ver npc.vantagens, coletarModificadores em
// regras.js) nos secundários/recursos de combate, exatamente como já
// acontece pra ficha de jogador. Sem isso, uma Vantagem paranormal tipo
// "+3 Agilidade" num NPC não mudava a iniciativa/esquiva dele em
// combate. Por cima disso tudo, aplica qualquer override manual que o
// Mestre tenha definido.
export function calcularSecundariosNpc(atributosPrimarios, secundariosOverride, modificadoresExtras = []) {
    const derivados = calcularDerivados(atributosPrimarios || {}, modificadoresExtras);
    const overrides = secundariosOverride || {};

    const secundarios = {};
    for (const s of ATRIBUTOS_SECUNDARIOS) {
        const calculado = derivados.secundarios[s.key]?.total ?? 0;
        const manual = overrides[s.key];
        secundarios[s.key] = {
            label: s.label,
            calculado,
            valor: (manual !== null && manual !== undefined && manual !== "") ? Number(manual) : calculado,
            sobrescrito: manual !== null && manual !== undefined && manual !== ""
        };
    }

    const recursos = {};
    for (const r of RECURSOS) {
        const calculado = derivados.recursos[r.key]?.total ?? 0;
        const manual = overrides[r.key];
        recursos[r.key] = {
            label: r.label,
            calculado,
            valor: (manual !== null && manual !== undefined && manual !== "") ? Number(manual) : calculado,
            sobrescrito: manual !== null && manual !== undefined && manual !== ""
        };
    }

    return { secundarios, recursos };
}

// Traduz os overrides manuais do Mestre (secundariosOverride) em
// modificadores estruturados equivalentes ({alvo, valor}), pra que a
// Ficha completa do NPC (que recalcula tudo via calcularDerivados, a
// mesma fórmula do jogador) chegue no MESMO número que o Mestre digitou
// manualmente no editor de NPC. Sem isso, um PV/Velocidade sobrescrito
// na mini-ficha "voltaria" ao valor calculado assim que o Mestre abrisse
// a Ficha completa do NPC pra agir em combate.
export function deltaModificadoresOverrideNpc(atributosPrimarios, secundariosOverride) {
    const overrides = secundariosOverride || {};
    const derivados = calcularDerivados(atributosPrimarios || {}, []);
    const deltas = [];
    for (const s of ATRIBUTOS_SECUNDARIOS) {
        const manual = overrides[s.key];
        if (manual === null || manual === undefined || manual === "") continue;
        const base = derivados.secundarios[s.key]?.total ?? 0;
        deltas.push({ alvo: `secundario:${s.key}`, valor: Number(manual) - base });
    }
    for (const r of RECURSOS) {
        const manual = overrides[r.key];
        if (manual === null || manual === undefined || manual === "") continue;
        const base = derivados.recursos[r.key]?.total ?? 0;
        deltas.push({ alvo: `recurso:${r.key}`, valor: Number(manual) - base });
    }
    return deltas;
}

export function adicionarPericiaNpc(npcDetalhado, nome, nivel) {

    if (!npcDetalhado.periciasNpc) npcDetalhado.periciasNpc = {};
    const id = "pnpc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
    npcDetalhado.periciasNpc[id] = { nome, nivel: Math.max(1, Math.min(5, Number(nivel) || 1)) };
    return id;
}

export function removerPericiaNpc(npcDetalhado, periciaId) {
    if (npcDetalhado.periciasNpc) delete npcDetalhado.periciasNpc[periciaId];
}

// =====================================================================
// Sugestão de PV por Nível (Mestre)
// =====================================================================
// Ao informar o Nível de um NPC na mini-ficha, sugere a faixa de PV
// (mínimo e máximo) que ele PODERIA ter naquele nível com a Constituição
// digitada — simulando os Dados de Vida que ele teria rolado em cada
// Level Up (mesma regra do jogador: dadoVidaPorConstituicao/rolarDadoVida
// em regras.js), do nível 1 até o nível informado.
//
// Por que uma FAIXA e não um valor único: o Dado de Vida rolado em cada
// Level Up depende da Constituição ATUAL naquele momento (regras.js,
// dadoVidaPorConstituicao) — e a Constituição pode ter subido ao longo
// do caminho (1 ponto de atributo por Level Up, à escolha do jogador).
// Como só sabemos o nível e a Constituição FINAIS do NPC, não dá pra
// saber exatamente quando cada ponto de Constituição foi gasto — então
// calculamos os dois extremos possíveis:
//
// - MÁXIMO: a Constituição subiu o quanto antes (nos primeiros Level
//   Ups), então mais rolagens aconteceram com um dado maior; e cada
//   Dado de Vida saiu no maior resultado possível.
// - MÍNIMO: a Constituição só subiu no fim (adiada o quanto pôde), então
//   mais rolagens aconteceram com o dado ainda pequeno (o da criação);
//   e cada Dado de Vida saiu no menor resultado possível (a "regra do
//   mínimo" do próprio dado: metade do dado + 1).
//
// Exemplo do próprio pedido: NPC nível 3, Constituição 7. O limite de
// CRIAÇÃO é 5 (MAX_ATRIBUTO_CRIACAO) — ou seja, esse NPC só chega a 7
// gastando 2 pontos de atributo em Constituição ao longo de Level Ups.
// Nível 3 = 2 Level Ups a partir do nível 1 (1→2 e 2→3), que é
// exatamente o mínimo de Level Ups necessário pra isso — logo esse NPC
// só é "alcançável" (campo `alcancavel`) se tiver subido Constituição
// nos dois Level Ups, sem sobra pra outro atributo.
//
// `atributosPrimarios` = objeto completo do NPC (não só a Constituição),
// pra reaproveitar a MESMA fórmula de PV do jogo (regras.js, RECURSOS,
// já conta qualquer Vantagem passada em `modificadoresExtras`).
export function faixaPvSugeridaNpc(atributosPrimarios, nivel, modificadoresExtras = []) {
    const nivelAlvo = Math.max(1, Math.floor(Number(nivel)) || 1);
    const constituicaoFinal = Math.max(0, Number(atributosPrimarios?.constituicao) || 0);
    const levelUps = nivelAlvo - 1;
    const pontosNecessarios = Math.max(0, constituicaoFinal - MAX_ATRIBUTO_CRIACAO);
    // Alcançável = há Level Ups suficientes pra ter chegado nessa
    // Constituição gastando no máximo 1 ponto de atributo por nível
    // (regra do jogo) — mesmo raciocínio do exemplo acima.
    const alcancavel = pontosNecessarios <= levelUps;
    // Pontos efetivamente simulados: nunca mais que o número de Level
    // Ups disponíveis (senão o histórico simulado não caberia nesse
    // nível) — quando não alcançável, a faixa vira só uma estimativa,
    // sinalizada por `alcancavel: false`.
    const pontosSimulados = Math.min(pontosNecessarios, levelUps);

    // PV base (fórmula 50 + CONx4 do manual, + Vantagens) com a
    // Constituição FINAL — é o mesmo "calculado" já mostrado na
    // mini-ficha pro campo PV.
    const derivados = calcularDerivados(atributosPrimarios || {}, modificadoresExtras);
    const pvBase = derivados.recursos?.pv?.total ?? 0;

    if (levelUps <= 0) {
        const pv = Math.round(pvBase);
        return {
            valido: true, nivelAlvo, constituicaoFinal, levelUps: 0,
            pontosNecessarios, alcancavel,
            pvBase, pvMinimo: pv, pvMaximo: pv
        };
    }

    // Fórmulas fechadas a partir de dadoVidaPorConstituicao/rolarDadoVida
    // (regras.js): faces = 16 + 2xCON, bônus = CON.
    // Mínimo do dado (regra de "metade do dado + 1") = floor(faces/2)+1
    //   = (8+CON)+1 = 9+CON  →  + bônus (CON)  →  9 + 2xCON.
    // Máximo do dado = faces  →  + bônus (CON)  →  16 + 3xCON.
    const rollMin = con => 9 + (2 * con);
    const rollMax = con => 16 + (3 * con);

    let somaMax = 0;
    for (let i = 1; i <= levelUps; i++) {
        // Constituição sobe o quanto antes: nos primeiros `pontosSimulados`
        // Level Ups.
        const con = i <= pontosSimulados ? MAX_ATRIBUTO_CRIACAO + i : constituicaoFinal;
        somaMax += rollMax(con);
    }

    let somaMin = 0;
    const levelUpsSemSubir = levelUps - pontosSimulados;
    for (let i = 1; i <= levelUps; i++) {
        // Constituição sobe o quanto mais tarde possível: só nos
        // últimos `pontosSimulados` Level Ups.
        const con = i <= levelUpsSemSubir ? MAX_ATRIBUTO_CRIACAO : MAX_ATRIBUTO_CRIACAO + (i - levelUpsSemSubir);
        somaMin += rollMin(con);
    }

    return {
        valido: true, nivelAlvo, constituicaoFinal, levelUps,
        pontosNecessarios, alcancavel,
        pvBase,
        pvMinimo: Math.round(pvBase + somaMin),
        pvMaximo: Math.round(pvBase + somaMax)
    };
}
