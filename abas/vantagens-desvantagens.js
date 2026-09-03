// abas/vantagens-desvantagens.js
// ---------------------------------------------------------------------
// Aba Vantagens / Desvantagens / Fatos Universais.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import { el, renderizarListaSimples, podeEditarCaracteristicaNarrativa, resumoModificadores, montarDistribuidorBonus } from "../ficha.js?v=20260830-npcnivelpv";
import { podeAdicionarDesvantagem, MAX_DESVANTAGENS, pontosBonusPorDesvantagens } from "../criacao.js";
import { calcularAbstinenciaVicio } from "../regras.js";

// Subtítulo de uma Desvantagem: descrição normal, mas se for um "Vício"
// (tem `.substancia`), acrescenta o status de abstinência calculado na
// hora — dias desde o último uso (ver botão "Consumir" num item de
// droga, em consumirDroga) e a penalidade atual, se houver.
function subDesvantagem(v) {
    if (!v.substancia) return v.descricao || "";
    const diaAtual = estado.calendarioAtual ? estado.calendarioAtual.diaIndice : null;
    const { diasDesdeUltimoUso, semanas, malusTestes, malusPV } = calcularAbstinenciaVicio(v, diaAtual);
    let statusAbstinencia;
    if (diaAtual === null) {
        statusAbstinencia = "calendário da mesa ainda não carregou";
    } else if (semanas <= 0) {
        statusAbstinencia = `${diasDesdeUltimoUso} dia(s) desde a última dose de ${v.substancia} · sem abstinência ainda`;
    } else {
        statusAbstinencia = `${diasDesdeUltimoUso} dia(s) desde a última dose de ${v.substancia} · ${semanas}ª semana em abstinência (${malusTestes} em todos os testes${malusPV ? `, ${malusPV} PV máximo` : ""})`;
    }
    return [v.descricao, statusAbstinencia].filter(Boolean).join(" · ");
}

export function renderizarVantagensDesvantagens() {
    const podeEditar = podeEditarCaracteristicaNarrativa();
    // Botões "+ Adicionar" só ficam visíveis durante a Criação (ou pro
    // Mestre, a qualquer momento) — correção do exploit de edição livre.
    el.btnAddVantagem.style.display = podeEditar ? "inline-block" : "none";
    el.btnAddFato.style.display = podeEditar ? "inline-block" : "none";

    // Desvantagem: além da trava normal de edição, tem o limite de no
    // máximo MAX_DESVANTAGENS (3) cadastradas. Pro Mestre (que pode
    // editar characterísticas a qualquer momento) o limite não se aplica,
    // já que NPCs/exceções narrativas ficam a critério dele.
    const jaNoLimite = !estado.isMestre && !podeAdicionarDesvantagem(estado.fichaAtual);
    el.btnAddDesvantagem.style.display = podeEditar ? "inline-block" : "none";
    el.btnAddDesvantagem.disabled = jaNoLimite;
    el.btnAddDesvantagem.title = jaNoLimite
        ? `Limite de ${MAX_DESVANTAGENS} desvantagens atingido.`
        : "";

    renderizarListaSimples(el.listaVantagens, estado.fichaAtual.vantagens || {}, (id, v) => ({
        nome: v.nome || "(sem nome)", sub: v.descricao || "", direita: resumoModificadores(v)
    }), "vantagens");

    renderizarListaSimples(el.listaDesvantagens, estado.fichaAtual.desvantagens || {}, (id, v) => ({
        nome: v.nome || "(sem nome)", sub: subDesvantagem(v), direita: resumoModificadores(v)
    }), "desvantagens");

    renderizarAreaBonusDesvantagens();

    renderizarListaSimples(el.listaFatos, estado.fichaAtual.fatosUniversais || {}, (id, v) => ({
        nome: v.nome || "(sem nome)", sub: v.descricao || "", direita: resumoModificadores(v)
    }), "fatosUniversais");
}

export function renderizarAreaBonusDesvantagens() {
    const c = estado.fichaAtual.criacao;
    const bonusTotal = pontosBonusPorDesvantagens(estado.fichaAtual);
    const restante = Math.max(0, bonusTotal - (c.bonusGasto || 0));
    c.pontosBonusDesvantagens = restante;

    el.bonusDesvantagensArea.innerHTML = "";
    if (bonusTotal === 0) return;

    const header = document.createElement("div");
    header.className = "section-header";
    header.innerText = "Pontos bônus de desvantagens";
    el.bonusDesvantagensArea.appendChild(header);

    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos bônus disponíveis</span><strong>${restante}</strong>`;
    el.bonusDesvantagensArea.appendChild(banner);

    if (restante <= 0) {
        const hint = document.createElement("p");
        hint.className = "hint";
        hint.innerText = "Todos os pontos bônus já foram gastos.";
        el.bonusDesvantagensArea.appendChild(hint);
        return;
    }

    montarDistribuidorBonus(c, () => renderizarVantagensDesvantagens(), el.bonusDesvantagensArea);
}
