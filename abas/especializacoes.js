// abas/especializacoes.js
// ---------------------------------------------------------------------
// Aba Especializações + o campo "Substância" (vício) do modal de
// Desvantagem, que fica fisicamente ligado a essa aba no HTML.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import { el, renderizarListaSimples, resumoModificadores, escapeHtml } from "../ficha.js?v=20260830-npcnivelpv";
import { CATALOGO_DROGAS } from "../dados-manual.js";

export function renderizarEspecializacoes() {
    renderizarListaSimples(el.listaEspecializacoes, estado.fichaAtual.especializacoes || {}, (id, v) => ({
        nome: v.nome || "(sem nome)",
        sub: [v.periciaVinculada ? `Perícia: ${v.periciaVinculada}` : null, v.descricao || null].filter(Boolean).join(" — "),
        direita: resumoModificadores(v)
    }), "especializacoes");
}

// Mostra/esconde o campo "Substância" no modal de Desvantagem, conforme
// o Nome digitado contém "vício"/"vicio" — e preenche o datalist com o
// catálogo do manual, pra sugerir só (não trava em texto livre, porque
// mesa pode ter droga homebrew).
export function configurarCampoSubstanciaVicio() {
    if (el.modalSubstanciaVicioOpcoes) {
        el.modalSubstanciaVicioOpcoes.innerHTML = CATALOGO_DROGAS.map(d => `<option value="${escapeHtml(d.nome)}">`).join("");
    }
    if (!el.modalNome) return;
    el.modalNome.addEventListener("input", () => {
        if (!estado.modalContexto || estado.modalContexto.lista !== "desvantagens" || !el.modalCampoSubstanciaVicio) return;
        const ehVicio = /vic[ií]o/i.test(el.modalNome.value);
        el.modalCampoSubstanciaVicio.style.display = ehVicio ? "flex" : "none";
    });
}
