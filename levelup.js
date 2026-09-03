// =====================================================================
// CHUVA DE NEON — Level Up
// =====================================================================
// Modal inadiável de 3 passos ao atingir a XP necessária:
// 1) alocar 1 ponto em atributo
// 2) rolar dado de vida extra (automático, baseado na Constituição)
// 3) liberar 2 pontos de perícia
//
// O estado fica em fichaAtual.levelUpPendente, sincronizado no Firebase,
// pra sobreviver a um reload de página no meio do processo.

import { xpNecessariaProximoNivel, rolarDadoVida, MAX_ATRIBUTO_JOGO } from "./regras.js";
import { atendeRequisitoPericia } from "./dados-manual.js";

export function precisaSubirNivel(fichaAtual) {
    const xp = Number(fichaAtual.dados.xp) || 0;
    const nivel = Number(fichaAtual.dados.nivel) || 1;
    return xp >= xpNecessariaProximoNivel(nivel);
}

export function iniciarLevelUpSeNecessario(fichaAtual) {
    if (fichaAtual.levelUpPendente && fichaAtual.levelUpPendente.ativo) return true;
    if (precisaSubirNivel(fichaAtual)) {
        fichaAtual.levelUpPendente = { ativo: true, passo: 1, pontosAtributo: 1, pontosPericia: 2, dadoVidaRolado: null };
        return true;
    }
    return false;
}

export function confirmarPassoAtributo(fichaAtual, atributoKey) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 1) return;
    // Trava de novo aqui (não só no botão desabilitado da UI) — mesmo
    // padrão já usado em gastarPontoPericiaLevelUp pro limite de perícia.
    if ((Number(fichaAtual.dados[atributoKey]) || 0) >= MAX_ATRIBUTO_JOGO) return;
    fichaAtual.dados[atributoKey] = (Number(fichaAtual.dados[atributoKey]) || 0) + 1;
    lvl.passo = 2;
}

export function executarPassoDadoVida(fichaAtual) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 2) return null;
    const constituicao = Number(fichaAtual.dados.constituicao) || 0;
    const resultado = rolarDadoVida(constituicao);
    lvl.dadoVidaRolado = resultado;
    // O dado de vida do Level Up é ganho PERMANENTE de PV — precisa
    // aumentar o máximo (fichaAtual.dados.pvBonusExtra, somado ao total
    // calculado em renderizarAtributos/ficha.js), não só o PV atual.
    // Antes só o pvAtual subia, o que fazia o ganho "sumir" assim que o
    // PV atual descia de novo (curar até o máximo antigo).
    fichaAtual.dados.pvBonusExtra = (Number(fichaAtual.dados.pvBonusExtra) || 0) + resultado.total;
    // PV atual também sobe junto (o jogador "ganhou" PV de verdade agora).
    const pvAtualAntes = fichaAtual.dados.pvAtual;
    if (pvAtualAntes !== null && pvAtualAntes !== undefined) {
        fichaAtual.dados.pvAtual = Number(pvAtualAntes) + resultado.total;
    }
    lvl.passo = 3;
    return resultado;
}

// Gasta 1 ponto de perícia do Level Up na perícia identificada por
// `nome` (não por id): se o personagem já tem essa perícia, incrementa
// o nível existente; senão, cria uma entrada nova com nível 1. Isso
// permite escolher qualquer perícia do manual no Level Up, não só as
// que já estão na ficha (mesmo comportamento do wizard de criação e do
// Treinamento, que também deixam escolher perícias novas por nome).
export function gastarPontoPericiaLevelUp(fichaAtual, nome, gerarId) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 3 || lvl.pontosPericia <= 0) return false;
    const entrada = Object.entries(fichaAtual.pericias).find(([, p]) => p.nome === nome);
    if (entrada) {
        const [, p] = entrada;
        if (p.nivel >= 5) return false; // limite geral de perícia (0-5) já validado em ficha.js
        p.nivel += 1;
    } else {
        // Requisito de acesso (ex.: Força Bruta — manual pg. 22): só se
        // aplica quando a perícia ainda não existe na ficha (nível 0).
        const requisito = atendeRequisitoPericia(nome, fichaAtual.dados, fichaAtual.pericias);
        if (!requisito.ok) return false;
        const id = gerarId();
        fichaAtual.pericias[id] = { nome, nivel: 1, descricao: "", modificadores: [], especializacoes: [], legado: false };
    }
    lvl.pontosPericia -= 1;
    return true;
}

export function finalizarLevelUp(fichaAtual) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 3 || lvl.pontosPericia > 0) return false;
    fichaAtual.dados.nivel = (Number(fichaAtual.dados.nivel) || 1) + 1;
    fichaAtual.dados.xp = (Number(fichaAtual.dados.xp) || 0) - xpNecessariaProximoNivel(Number(fichaAtual.dados.nivel) - 1);
    if (fichaAtual.dados.xp < 0) fichaAtual.dados.xp = 0;
    fichaAtual.levelUpPendente = null;
    return true;
}

// =====================================================================
// Especializações de perícia (Manual do Jogador, seção "Especializações")
// =====================================================================
// Regra do manual: "a partir do nível três em uma perícia você poderá
// comprar uma especialização com um ponto de perícia (...) deve ter a
// especialização de nível anterior" — ou seja, nível 3 exige perícia
// nível >= 3; nível 4 exige perícia nível >= 4 e já ter a especialização
// 3; nível 5 exige perícia nível >= 5 e já ter a especialização 4.
// Isso é uma OPÇÃO alternativa ao gasto normal de ponto de perícia do
// Level Up (gastarPontoPericiaLevelUp) — não substitui nem altera nada
// daquela função.

// Dado um objeto de perícia da ficha ({ nivel, especializacoes }),
// devolve o próximo nível de especialização que ainda não foi
// comprado (3, 4 ou 5), ou null se já tiver as três.
export function proximaEspecializacaoDisponivel(pericia) {
    const esp = (pericia && Array.isArray(pericia.especializacoes)) ? pericia.especializacoes : [];
    if (!esp.includes(3)) return 3;
    if (!esp.includes(4)) return 4;
    if (!esp.includes(5)) return 5;
    return null;
}

// Verifica se é possível comprar a próxima especialização disponível
// daquela perícia agora. Devolve { ok, proximoNivel, motivo }.
// `motivo` só vem preenchido quando ok = false, pra exibir na UI.
export function podeComprarEspecializacao(pericia) {
    const proximoNivel = proximaEspecializacaoDisponivel(pericia);
    if (proximoNivel === null) {
        return { ok: false, proximoNivel: null, motivo: "Todas as especializações desta perícia já foram adquiridas (níveis 3, 4 e 5)." };
    }
    const nivelAtual = Number(pericia && pericia.nivel) || 0;
    if (nivelAtual < proximoNivel) {
        const motivoFalta = proximoNivel > 3
            ? ` e possuir a especialização de nível ${proximoNivel - 1}`
            : "";
        return {
            ok: false,
            proximoNivel,
            motivo: `Perícia precisa estar no nível ${proximoNivel}${motivoFalta} (nível atual: ${nivelAtual}).`
        };
    }
    return { ok: true, proximoNivel, motivo: null };
}

// Gasta 1 ponto de perícia do Level Up comprando a especialização
// (em vez de subir o nível da perícia). Só afeta `especializacoes`
// daquela perícia — nunca o `nivel`. Só funciona pra perícia já
// existente na ficha (não dá pra especializar uma perícia nível 0).
export function gastarPontoEspecializacaoLevelUp(fichaAtual, nome) {
    const lvl = fichaAtual.levelUpPendente;
    if (!lvl || lvl.passo !== 3 || lvl.pontosPericia <= 0) return false;
    const entrada = Object.entries(fichaAtual.pericias).find(([, p]) => p.nome === nome);
    if (!entrada) return false;
    const [, p] = entrada;
    const check = podeComprarEspecializacao(p);
    if (!check.ok) return false;
    if (!Array.isArray(p.especializacoes)) p.especializacoes = [];
    p.especializacoes.push(check.proximoNivel);
    lvl.pontosPericia -= 1;
    return true;
}
