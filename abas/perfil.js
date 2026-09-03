// abas/perfil.js
// ---------------------------------------------------------------------
// Aba Perfil — dados básicos do personagem (nome, vulgo, idade, função,
// padrão de vida e gastos extras).
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import { el, CAMPOS_SO_MESTRE, renderizarListaSimples } from "../ficha.js?v=20260830-npcnivelpv";
import { funcaoDe } from "../criacao.js";
import { custoSemanalPadraoDeVida } from "../mestre.js";

// Campos de texto simples da aba Perfil, ligados por atributo
// data-field no HTML — todos exceto nivel/xp são editáveis pelo
// jogador (nivel/xp são travados via CAMPOS_SO_MESTRE).
const CAMPOS_PERFIL_SIMPLES = ["nome", "vulgo", "idade", "nacionalidade",
    "maldade", "remorso", "status", "nivel", "xp"];

export function renderizarPerfil() {
    const d = estado.fichaAtual.dados;
    CAMPOS_PERFIL_SIMPLES.forEach(campo => {
        const input = document.querySelector(`[data-field="${campo}"]`);
        if (!input) return;
        if (document.activeElement !== input) input.value = d[campo] ?? "";
        const soMestre = CAMPOS_SO_MESTRE.includes(campo);
        input.disabled = soMestre && !estado.isMestre;
    });
    el.hintNivelXp.style.display = estado.isMestre ? "none" : "block";

    const inputFuncao = document.querySelector('[data-field="funcao"]');
    const funcaoKey = d.funcao || estado.fichaAtual.criacao.funcaoEscolhida || "";
    const f = funcaoDe(funcaoKey);
    inputFuncao.value = f ? f.label : (funcaoKey || "—");

    if (document.activeElement !== el.fPadraoVida) {
        el.fPadraoVida.value = d.padraoDeVida || "";
    }

    const custoBase = custoSemanalPadraoDeVida(d.padraoDeVida);
    const extras = Object.values(estado.fichaAtual.gastosExtras || {}).reduce((acc, g) => acc + (Number(g.valor) || 0), 0);
    el.resumoCustoSemanal.innerText = d.padraoDeVida
        ? `CN$ ${custoBase + extras} (padrão CN$ ${custoBase} + extras CN$ ${extras})`
        : "defina um padrão de vida";

    renderizarListaSimples(el.listaGastosExtras, estado.fichaAtual.gastosExtras || {}, (id, g) => ({
        nome: g.nome || "(sem nome)",
        sub: g.descricao || "",
        direita: `CN$ ${g.valor || 0}`
    }), "gastosExtras");
}
