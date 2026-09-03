// abas/pericias.js
// ---------------------------------------------------------------------
// Aba Perícias — lista de perícias com rolagem, modal de adicionar/
// editar perícia (categoria + busca) e o modal compartilhado de
// "selecionar alvo" (usado por Atacar, Agarrar, Desarmar, Derrubar,
// Delimitar/Retomar alcance, Imobilizar e as variantes de Jiu Jitsu).
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 15). Além das 3 funções listadas no plano (renderizarPericias,
// configurarBuscaPericia, configurarModalSelecionarAlvo), vieram junto
// os helpers privados só usados por elas: popularOpcoesPericia,
// renderOpcoesBusca, e prepararModalPericia (chamada de fora, pelo
// modal genérico em ficha.js/prepararModalParaLista quando a lista é
// "pericias" — por isso continua exportada).
//
// contextoAlvo (ver ficha.js): objeto exportado com o contexto da ação
// que está esperando o jogador escolher um alvo no modal. Continua
// morando em ficha.js porque também é preenchido por várias funções
// abrirModalSelecionarAlvo*/abrirModalArremessar (Atacar, Agarrar,
// Desarmar, Derrubar, Delimitar/Retomar alcance, Imobilizar, Jiu
// Jitsu) que ficam lá — só o "confirmar" (configurarModalSelecionarAlvo)
// veio pra cá. Sendo um objeto (em vez de variáveis soltas), dá pra
// ler e reatribuir os campos dele normalmente de qualquer arquivo que
// o importe.
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import {
    el, toast, podeEditarPericiaAtributo, escapeHtml, textoDetalhamento,
    penalidadeTestesAtual, penalidadeEnergiaParaPericia, lerDeltaOcasionais,
    alternarModificadorOcasional, abrirModalEdicao, abrirModalEscolhaEngenharia,
    rolarComPossibilidadeDeOcasionais, contextoAlvo,
    resolverAgarrar, resolverDesarmar, resolverDerrubar,
    resolverDelimitarAlcance, resolverRetomarAlcance, resolverImobilizar,
    resolverImobilizarJiuJitsu, resolverQuebrarOssosJiuJitsu
} from "../ficha.js";
import { resolverAtaque } from "./inventario.js";
import { calcularTotalPericia, modificadoresOcasionaisDaPericia } from "../regras.js";
import { listaPericiasPorCategoria, buscarPericiaPorNome } from "../dados-manual.js";

export function renderizarPericias(modificadoresPlanos) {
    const podeEditar = podeEditarPericiaAtributo();
    el.btnAddPericia.style.display = podeEditar ? "inline-block" : "none";
    const ids = Object.keys(estado.fichaAtual.pericias || {});
    el.listaPericias.innerHTML = "";

    if (!ids.length) {
        el.listaPericias.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nenhuma perícia cadastrada ainda.</li>`;
        return;
    }

    ids.sort((a, b) => estado.fichaAtual.pericias[a].nome.localeCompare(estado.fichaAtual.pericias[b].nome));

    ids.forEach(id => {
        const p = estado.fichaAtual.pericias[id];
        const calc = calcularTotalPericia(p, estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(p.nome));
        const li = document.createElement("li");
        if (!podeEditar) li.classList.add("locked-visual");
        const textoSaude = calc.penalidadeSaude ? ` · ${calc.penalidadeSaude} (estado de saúde)` : "";
        const ajustesPericia = calc.penalidadeSaude
            ? [...calc.ajustes, { valor: calc.penalidadeSaude, origem: "Estado de saúde" }]
            : calc.ajustes;
        li.title = textoDetalhamento(p.nome, calc.nivel, "Nível da perícia", ajustesPericia, calc.total);
        // Ocasião Especial (ver regras.js): modificadores de especialização/
        // vantagem marcados como situacionais viram um checkbox aqui, em
        // vez de valerem sempre — o jogador liga só quando a situação
        // narrativa descrita realmente se aplica àquela rolagem.
        const ocasionais = modificadoresOcasionaisDaPericia(estado.fichaAtual, p.nome);
        const ocasionaisHtml = ocasionais.length ? `
            <div class="pericia-ocasionais">
                ${ocasionais.map((o, idx) => `
                    <label class="checkbox-inline pericia-ocasional-item" title="${escapeHtml(o.origem)} — só conta enquanto marcado">
                        <input type="checkbox" class="pericia-ocasional-check" data-idx="${idx}" ${o.ativo ? "checked" : ""}>
                        ${escapeHtml(o.origem)} (${o.valor >= 0 ? "+" : ""}${o.valor})
                    </label>
                `).join("")}
            </div>
        ` : "";
        const especializacoesCompradas = Array.isArray(p.especializacoes) && p.especializacoes.length
            ? ` · especialização nível ${p.especializacoes.slice().sort().join(", ")}`
            : "";
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(p.nome)}${p.legado ? ' <span class="mod-pill">legado</span>' : ""}</span>
                <span class="entity-sub">nível ${p.nivel}${calc.ajustes.length ? ` + ${calc.ajustes.reduce((a, m) => a + m.valor, 0)} de modificadores` : ""}${textoSaude}${especializacoesCompradas}</span>
            </div>
            <div class="entity-badges">
                <button type="button" class="btn-rolar btn-blue" title="Rolar d20 + ${calc.total}">🎲 ${calc.total >= 0 ? "+" : ""}${calc.total}</button>
                <span class="total-rolagem">${calc.total}</span>
            </div>
            ${ocasionaisHtml}
        `;
        li.querySelector(".btn-rolar").addEventListener("click", async (e) => {
            e.stopPropagation();
            // Engenharia (continuação da conversa "automação materiais
            // químicos" — Parte 10): rolar essa perícia específica
            // abre uma escolha antes de rolar de verdade — "só rolar"
            // (comportamento normal de qualquer perícia) ou "criar
            // receita" (autorar uma receita nova/existente no Banco
            // Global — ver abrirModalEscolhaEngenharia).
            if (p.nome === "Engenharia") {
                abrirModalEscolhaEngenharia(calc.total);
                return;
            }
            await rolarComPossibilidadeDeOcasionais(p.nome, `pericia:${p.nome}`, calc.total, p.nome === "CQC");
        });
        li.querySelectorAll(".pericia-ocasional-check").forEach(chk => {
            chk.addEventListener("click", (e) => e.stopPropagation());
            chk.addEventListener("change", (e) => {
                e.stopPropagation();
                const o = ocasionais[Number(chk.dataset.idx)];
                alternarModificadorOcasional(o, chk.checked);
            });
        });
        li.addEventListener("click", () => abrirModalEdicao("pericias", id));
        el.listaPericias.appendChild(li);
    });
}

// ---------------------------------------------------------------------
// Modal: PERÍCIA — dropdown de categoria + dropdown buscável + nível
// ---------------------------------------------------------------------
// Chamada de fora (ficha.js/prepararModalParaLista) quando a lista
// sendo editada no modal genérico é "pericias".
export function prepararModalPericia(existente) {
    el.modalNome.parentElement.style.display = "none"; // nome vem só da lista fechada
    el.modalCampoCategoriaPericia.style.display = "flex";
    el.modalCampoPericiaBusca.style.display = "flex";
    el.modalCampoNivel.style.display = "flex";

    const podeEditar = podeEditarPericiaAtributo();
    el.modalCategoriaPericia.disabled = !podeEditar && !!existente; // categoria só trava se editando perícia já travada
    el.modalNivel.disabled = !podeEditar;

    if (existente) {
        const oficial = buscarPericiaPorNome(existente.nome);
        el.modalCategoriaPericia.value = oficial ? oficial.categoria : "";
        el.modalPericiaValor.value = existente.nome;
        el.modalPericiaBusca.value = existente.nome;
        el.modalPericiaBusca.disabled = true; // não dá pra trocar o nome de uma perícia já criada
        el.modalNivel.value = existente.nivel ?? 0;
        popularOpcoesPericia(oficial ? oficial.categoria : "");
        // Especializações compradas no Level Up (níveis 3/4/5, ver
        // levelup.js) não têm campo próprio de edição aqui — são só
        // informativas, pra não sumirem de vista fora do assistente de
        // Level Up. O nome/efeito de cada uma continua sendo cadastrado
        // à mão na aba "Especializações" (com o vínculo de perícia).
        const especializacoesExistentes = Array.isArray(existente.especializacoes) ? existente.especializacoes : [];
        let hintEspecializacoes = document.getElementById("hint-especializacoes-pericia");
        if (!hintEspecializacoes) {
            hintEspecializacoes = document.createElement("p");
            hintEspecializacoes.id = "hint-especializacoes-pericia";
            hintEspecializacoes.className = "hint";
            el.modalCampoNivel.insertAdjacentElement("afterend", hintEspecializacoes);
        }
        hintEspecializacoes.style.display = "";
        hintEspecializacoes.innerText = especializacoesExistentes.length
            ? `Especialização(ões) comprada(s) no Level Up: nível ${especializacoesExistentes.slice().sort().join(", ")}. Cadastre o nome/efeito de cada uma na aba "Especializações".`
            : "Nenhuma especialização comprada ainda (disponível a partir do nível 3, via Level Up).";
    } else {
        const hintEspecializacoes = document.getElementById("hint-especializacoes-pericia");
        if (hintEspecializacoes) hintEspecializacoes.style.display = "none";
        el.modalCategoriaPericia.value = "";
        el.modalPericiaValor.value = "";
        el.modalPericiaBusca.value = "";
        el.modalPericiaBusca.disabled = false;
        el.modalPericiaBusca.placeholder = "Escolha a categoria primeiro";
        el.modalNivel.value = 0;
        el.modalPericiaOpcoes.innerHTML = "";
        el.modalPericiaOpcoes.style.display = "none";
    }

    if (!podeEditar && !existente) {
        // Jogador sem edição liberada não devia nem conseguir abrir "novo", mas
        // por segurança redundante: avisa que não vai salvar.
        toast("Edição de perícias só na Criação ou em Level Up pendente.", "erro");
    }
}

function popularOpcoesPericia(categoria) {
    el.modalPericiaOpcoes.innerHTML = "";
    if (!categoria) { el.modalPericiaOpcoes.style.display = "none"; return; }
    const todas = listaPericiasPorCategoria(categoria);
    const jaExistentes = new Set(Object.values(estado.fichaAtual.pericias || {}).map(p => p.nome));
    renderOpcoesBusca(todas.filter(p => !jaExistentes.has(p.nome) || p.nome === el.modalPericiaValor.value), el.modalPericiaBusca.value);
}

function renderOpcoesBusca(lista, filtroTexto) {
    const filtro = (filtroTexto || "").toLowerCase();
    const filtradas = lista.filter(p => p.nome.toLowerCase().includes(filtro));
    el.modalPericiaOpcoes.innerHTML = "";
    if (!filtradas.length) {
        el.modalPericiaOpcoes.innerHTML = `<div class="opcao-vazia">Nenhuma perícia encontrada.</div>`;
    } else {
        filtradas.forEach(p => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = p.nome;
            div.addEventListener("click", () => {
                el.modalPericiaBusca.value = p.nome;
                el.modalPericiaValor.value = p.nome;
                el.modalPericiaOpcoes.style.display = "none";
            });
            el.modalPericiaOpcoes.appendChild(div);
        });
    }
    el.modalPericiaOpcoes.style.display = "block";
}

export function configurarBuscaPericia() {
    el.modalCategoriaPericia.addEventListener("change", () => {
        el.modalPericiaValor.value = "";
        el.modalPericiaBusca.value = "";
        el.modalPericiaBusca.placeholder = "Digite pra buscar...";
        popularOpcoesPericia(el.modalCategoriaPericia.value);
    });
    el.modalPericiaBusca.addEventListener("input", () => {
        el.modalPericiaValor.value = ""; // obriga escolher da lista (sem texto livre)
        popularOpcoesPericia(el.modalCategoriaPericia.value);
    });
    el.modalPericiaBusca.addEventListener("focus", () => {
        if (el.modalCategoriaPericia.value) popularOpcoesPericia(el.modalCategoriaPericia.value);
    });
    document.addEventListener("click", (e) => {
        if (!el.modalCampoPericiaBusca.contains(e.target)) el.modalPericiaOpcoes.style.display = "none";
    });
}

// ---------------------------------------------------------------------
// Modal compartilhado de "selecionar alvo" — o botão de confirmar lê
// contextoAlvo (ver ficha.js) pra saber qual ação está em andamento e
// chama o resolver correspondente. Quem abre o modal e preenche
// contextoAlvo (abrirModalSelecionarAlvo, abrirModalSelecionarAlvoAgarrar
// etc.) continua em ficha.js, junto do resto das ações de combate.
// ---------------------------------------------------------------------
export function configurarModalSelecionarAlvo() {
    const limparContextos = () => {
        contextoAlvo.ataque = null;
        contextoAlvo.agarrar = null;
        contextoAlvo.desarmar = null;
        contextoAlvo.derrubar = null;
        contextoAlvo.delimitar = null;
        contextoAlvo.retomar = null;
        contextoAlvo.imobilizar = null;
        contextoAlvo.imobilizarJJ = null;
        contextoAlvo.quebrarOssosJJ = null;
    };
    el.alvoCancelar.addEventListener("click", () => {
        el.modalSelecionarAlvo.classList.remove("active");
        limparContextos();
    });
    el.modalSelecionarAlvo.addEventListener("click", (e) => {
        if (e.target === el.modalSelecionarAlvo) {
            el.modalSelecionarAlvo.classList.remove("active");
            limparContextos();
        }
    });
    el.alvoConfirmar.addEventListener("click", async () => {
        if (!contextoAlvo.ataque && !contextoAlvo.agarrar && !contextoAlvo.desarmar && !contextoAlvo.derrubar && !contextoAlvo.delimitar && !contextoAlvo.retomar && !contextoAlvo.imobilizar && !contextoAlvo.imobilizarJJ && !contextoAlvo.quebrarOssosJJ) return;
        const pid = el.alvoSelect.value;
        const participante = estado.combateAtivoCache.participantes && estado.combateAtivoCache.participantes[pid];
        if (!participante) { toast("Alvo inválido — pode ter saído do combate.", "erro"); return; }
        // Alvo é outro jogador (não NPC): confirma antes de prosseguir, pra
        // evitar acertar o colega por engano (miss-click na lista).
        if (participante.tipo === "ficha" && !confirm(`Você está atacando outro jogador (${participante.nome}). Tem certeza?`)) {
            return;
        }
        el.modalSelecionarAlvo.classList.remove("active");
        if (contextoAlvo.ataque) {
            const { item, modificadoresPlanos, ocasionaisPericia } = contextoAlvo.ataque;
            const tipoDanoSelect = document.getElementById("alvo-tipo-dano-select");
            const tipoDanoEscolhido = tipoDanoSelect ? tipoDanoSelect.value : "padrao";
            const localMiraSelect = document.getElementById("alvo-local-mira-select");
            const localMira = localMiraSelect ? localMiraSelect.value : "padrao";
            // Modificadores Situacionais Rápidos de Combate à Distância —
            // só existem no modal quando a arma é de fogo (ver
            // abrirModalSelecionarAlvo). Ausentes (arma corpo a corpo/arma
            // branca) caem nos padrões neutros abaixo.
            const movimentoSelect = document.getElementById("alvo-movimento-select");
            const escuroCheck = document.getElementById("alvo-escuro-check");
            const queimaRoupaCheck = document.getElementById("alvo-queima-roupa-check");
            const combatentesInput = document.getElementById("alvo-combatentes-input");
            const situacional = {
                movimento: movimentoSelect ? movimentoSelect.value : "nenhum",
                escuro: escuroCheck ? escuroCheck.checked : false,
                queimaRoupa: queimaRoupaCheck ? queimaRoupaCheck.checked : false,
                combatentesAdicionais: combatentesInput ? Math.max(0, Number(combatentesInput.value) || 0) : 0
            };
            // Ocasião Especial (checkboxes montadas em abrirModalSelecionarAlvo
            // a partir de ocasionaisPericia): aplica o delta na hora — não dá
            // pra esperar `modificadoresPlanosAtacante` (já calculado ANTES
            // de abrir este modal) se atualizar sozinho via sincronização em
            // tempo real, então soma-se aqui em cima o que mudou desde então.
            // Cada checkbox também é persistida (alternarModificadorOcasional),
            // pra ficar consistente com o que aparece depois na aba Perícias.
            let modificadorOcasionalDelta = 0;
            const togglesOcasionais = [];
            document.querySelectorAll(".alvo-ocasional-check").forEach(chk => {
                const o = ocasionaisPericia[Number(chk.dataset.idx)];
                if (!o) return;
                if (chk.checked !== o.ativo) {
                    modificadorOcasionalDelta += (chk.checked ? o.valor : -o.valor);
                    togglesOcasionais.push({ o, novoValor: chk.checked });
                }
            });
            for (const { o, novoValor } of togglesOcasionais) {
                alternarModificadorOcasional(o, novoValor);
            }
            limparContextos();
            await resolverAtaque(item, modificadoresPlanos, { ...participante, _pid: pid }, {
                localMira, situacional, tipoDanoEscolhido,
                modificadorExtra: modificadorOcasionalDelta
            });
        } else if (contextoAlvo.agarrar) {
            const { nomePericia, modificador, ocasionais } = contextoAlvo.agarrar;
            const delta = lerDeltaOcasionais(el.alvoCampoExtra, ocasionais);
            limparContextos();
            await resolverAgarrar(nomePericia, modificador + delta, { ...participante, _pid: pid });
        } else if (contextoAlvo.desarmar) {
            const { nomePericia, modificador, ocasionais } = contextoAlvo.desarmar;
            const delta = lerDeltaOcasionais(el.alvoCampoExtra, ocasionais);
            limparContextos();
            await resolverDesarmar(nomePericia, modificador + delta, { ...participante, _pid: pid });
        } else if (contextoAlvo.derrubar) {
            const { nomePericia, modificador, ocasionais } = contextoAlvo.derrubar;
            const cqcCheck = document.getElementById("alvo-cqc-derrubar-check");
            const usarBonusCQCDano = cqcCheck ? cqcCheck.checked : false;
            const delta = lerDeltaOcasionais(el.alvoCampoExtra, ocasionais);
            limparContextos();
            await resolverDerrubar(nomePericia, modificador + delta, { ...participante, _pid: pid }, usarBonusCQCDano);
        } else if (contextoAlvo.delimitar) {
            const { nomePericia, modificador, ocasionais } = contextoAlvo.delimitar;
            const alcanceSelect = document.getElementById("alvo-alcance-select");
            const alcanceEscolhido = alcanceSelect ? alcanceSelect.value : "Curto";
            const delta = lerDeltaOcasionais(el.alvoCampoExtra, ocasionais);
            limparContextos();
            await resolverDelimitarAlcance(nomePericia, modificador + delta, alcanceEscolhido, { ...participante, _pid: pid });
        } else if (contextoAlvo.retomar) {
            const { nomePericia, modificador, ocasionais } = contextoAlvo.retomar;
            const delta = lerDeltaOcasionais(el.alvoCampoExtra, ocasionais);
            limparContextos();
            await resolverRetomarAlcance(nomePericia, modificador + delta, { ...participante, _pid: pid });
        } else if (contextoAlvo.imobilizar) {
            const { nomePericia, modificador, ocasionais } = contextoAlvo.imobilizar;
            const delta = lerDeltaOcasionais(el.alvoCampoExtra, ocasionais);
            limparContextos();
            await resolverImobilizar(nomePericia, modificador + delta, { ...participante, _pid: pid });
        } else if (contextoAlvo.imobilizarJJ) {
            const { nomeBase, modificador, nivelJJ, ocasionais } = contextoAlvo.imobilizarJJ;
            const desacordarCheck = document.getElementById("alvo-jj-desacordar-check");
            const desacordar = desacordarCheck ? desacordarCheck.checked : false;
            const delta = lerDeltaOcasionais(el.alvoCampoExtra, ocasionais);
            limparContextos();
            await resolverImobilizarJiuJitsu(nomeBase, modificador + delta, nivelJJ, { ...participante, _pid: pid }, desacordar);
        } else if (contextoAlvo.quebrarOssosJJ) {
            const { nivelJJ } = contextoAlvo.quebrarOssosJJ;
            const membroInferiorCheck = document.getElementById("alvo-jj-membro-inferior-check");
            const membroInferior = membroInferiorCheck ? membroInferiorCheck.checked : false;
            limparContextos();
            await resolverQuebrarOssosJiuJitsu(nivelJJ, { ...participante, _pid: pid }, membroInferior);
        }
    });
}
