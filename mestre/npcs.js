// ============================================================
// mestre/npcs.js — Passo 28 do plano de modularização de ficha.js
// (ver plano-modularizacao-ficha-js.txt).
//
// Painel de NPCs do Mestre: a lista com busca/filtro por categoria
// (montarPainelNpcs), o formulário completo da Mini-Ficha Detalhada
// — Módulo 2, atributos/perícias/proteção (montarFormularioNpcDetalhado)
// — e o checklist de reduções de dano usado por ele
// (montarChecklistReducaoNpc). abrirEdicaoNpcDetalhado é um helper
// privado usado só por montarPainelNpcs/montarFormularioNpcDetalhado
// (não estava na lista do Passo 28, mesmo critério dos passos
// anteriores: exclusivo daqui, então moveu junto em vez de ficar
// exportado à toa em ficha.js).
// ============================================================

import { estado, definirLimpezaPainelMestre } from "../estado.js";
import {
    el, escapeHtml, toast,
    montarBarraFiltro, montarListaComScrollInfinito, itemPassaFiltroCategoria,
    categoriasDistintas, criarInput,
} from "../ficha.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS,
} from "../regras.js";
import {
    TIPOS_DANO, CATEGORIAS_PERICIA, listaPericiasPorCategoria,
} from "../dados-manual.js";
import {
    estadoInicialNpcDetalhado, calcularSecundariosNpc,
    adicionarPericiaNpc, removerPericiaNpc, faixaPvSugeridaNpc,
} from "../npc-detalhado.js";
import {
    ouvirNpcs, excluirNpc, criarNpcDetalhado, atualizarNpcDetalhado,
} from "../mestre.js?v=20260830-npcnivelpv";

export function montarPainelNpcs(corpo) {
    const { busca, selectCategoria, popularSelectCategoria } = montarBarraFiltro(corpo, { placeholderBusca: "Buscar por nome..." });

    const contador = document.createElement("span");
    contador.className = "hint-inline scroll-infinito-contador";
    corpo.appendChild(contador);

    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    const renderCardNpc = (npc) => {
        const card = document.createElement("div");
        card.className = "npc-card";
        const reducoesParaExibir = (npc.reducoesDano && npc.reducoesDano.length)
            ? npc.reducoesDano
            : (npc.protecaoTipo ? [{ tipo: npc.protecaoTipo, valor: npc.protecaoValor || 0 }] : []);
        const protecaoLabel = reducoesParaExibir.length
            ? reducoesParaExibir.map(r => `${TIPOS_DANO.find(t => t.key === r.tipo)?.label || r.tipo} -${r.valor}`).join(", ")
            : "nenhuma";
        card.innerHTML = `
            <strong>${npc.modelo ? "⭐ " : ""}${escapeHtml(npc.nome)}${npc.modoDetalhado ? ' <span class="hint-inline">(mini-ficha)</span>' : ""}${npc.modoDetalhado && npc.nivel ? ` <span class="hint-inline">· Nível ${Number(npc.nivel) || 1}</span>` : ""}</strong>
            ${npc.vulgo || npc.funcaoNarrativa ? `<span>${escapeHtml([npc.vulgo, npc.funcaoNarrativa].filter(Boolean).join(" · "))}</span>` : ""}
            ${npc.categoria ? `<span class="hint-inline">Categoria: ${escapeHtml(npc.categoria)}</span>` : ""}
            <span>PV: ${npc.pvAtual ?? npc.pvs} / ${npc.pvs}</span>
            <span>Agilidade: ${npc.agilidade ?? 0} · Constituição: ${npc.constituicao ?? 0} · Proteção: ${escapeHtml(protecaoLabel)}</span>
            ${npc.atributos ? `<span>Atributos: ${escapeHtml(npc.atributos)}</span>` : ""}
            ${npc.atributosSecundarios ? `<span>Secundários: ${escapeHtml(npc.atributosSecundarios)}</span>` : ""}
            ${npc.periciasResumo ? `<span>Perícias: ${escapeHtml(npc.periciasResumo)}</span>` : ""}
            ${npc.itensEssenciais ? `<span>Itens: ${escapeHtml(npc.itensEssenciais)}</span>` : ""}
        `;
        const linhaBtns = document.createElement("div");
        linhaBtns.className = "modal-btns";
        if (npc.modoDetalhado) {
            const btnEditar = document.createElement("button");
            btnEditar.className = "btn-ghost"; btnEditar.type = "button"; btnEditar.innerText = "Editar mini-ficha";
            btnEditar.addEventListener("click", () => abrirEdicaoNpcDetalhado(npc));
            linhaBtns.appendChild(btnEditar);
        }
        const btnExcluir = document.createElement("button");
        btnExcluir.className = "btn-red"; btnExcluir.type = "button"; btnExcluir.innerText = "Excluir NPC";
        btnExcluir.addEventListener("click", async () => { await excluirNpc(npc.id); });
        linhaBtns.appendChild(btnExcluir);
        card.appendChild(linhaBtns);
        return card;
    };

    // Cache LOCAL da lista (separado de estado.npcsCache, que só alimenta os
    // datalists de sugestão — ver Fase A): guardado aqui pra busca e
    // filtro de categoria poderem reconsultar sem esperar o Firebase de
    // novo a cada tecla digitada.
    let npcsAtuais = [];
    const renderLista = () => {
        const filtro = busca.value.trim().toLowerCase();
        const npcsFiltrados = npcsAtuais
            .filter(npc => !filtro || (npc.nome || "").toLowerCase().includes(filtro))
            .filter(npc => itemPassaFiltroCategoria(npc, selectCategoria, "categoria"))
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        montarListaComScrollInfinito({
            container: lista,
            scrollRoot: el.drawerPendentes,
            itens: npcsFiltrados,
            renderItem: renderCardNpc,
            mensagemVazia: "Nenhum NPC criado ainda.",
            contadorEl: contador
        });
    };
    busca.addEventListener("input", renderLista);
    selectCategoria.addEventListener("change", renderLista);

    // Listener local (não o estado.npcsCache do topo do arquivo): só isso aqui
    // — busca, filtro e a lista de cards — atualiza em tempo real. O
    // formulário de criar NPC logo abaixo é montado UMA VEZ, fora deste
    // callback, pra uma atualização em tempo real vinda de outro
    // jogador/aba nunca apagar o que o Mestre está digitando ali no meio
    // do preenchimento.
    // Registra a desinscrição (ver definirLimpezaPainelMestre): sem
    // isso, reabrir este painel (inclusive voltando de editar uma
    // mini-ficha) empilhava um listener novo a cada vez, sem nunca
    // desligar os antigos.
    definirLimpezaPainelMestre(ouvirNpcs((npcs) => {
        npcsAtuais = npcs || [];
        popularSelectCategoria(npcsAtuais, "categoria");
        renderLista();
    }));

    const formArea = document.createElement("div");
    corpo.appendChild(formArea);

    const secaoNovoNpc = document.createElement("div");
    secaoNovoNpc.className = "section-header";
    secaoNovoNpc.innerText = "Criar NPC (mini-ficha)";
    formArea.appendChild(secaoNovoNpc);
    const areaForm = document.createElement("div");
    formArea.appendChild(areaForm);
    const mostrarFormNovo = () => {
        areaForm.innerHTML = "";
        montarFormularioNpcDetalhado(areaForm, null, async () => { toast("NPC (mini-ficha) criado."); mostrarFormNovo(); });
    };
    mostrarFormNovo();
}

// Abre a Mini-Ficha Detalhada já preenchida com os dados de um NPC
// existente, dentro do próprio Painel do Mestre (reaproveita o
// mestre-corpo, que já está visível dentro da gaveta de Ações Pendentes —
// só troca o conteúdo pelo formulário de edição).
function abrirEdicaoNpcDetalhado(npc) {
    definirLimpezaPainelMestre(null);
    const corpo = el.mestreCorpo;
    corpo.innerHTML = "";
    corpo.dataset.acaoAberta = "npcs";
    const voltar = document.createElement("button");
    voltar.className = "btn-ghost"; voltar.type = "button"; voltar.innerText = "← Voltar pra lista de NPCs";
    voltar.addEventListener("click", () => montarPainelNpcs(corpo));
    corpo.appendChild(voltar);
    const area = document.createElement("div");
    corpo.appendChild(area);
    montarFormularioNpcDetalhado(area, npc, async () => {
        toast("Mini-ficha atualizada.");
        montarPainelNpcs(corpo);
    });
}

// ---------------------------------------------------------------------
// Formulário da Mini-Ficha Detalhada de NPC (Módulo 2). Sem pontos
// fixos, sem Função, sem limite de Desvantagens — o Mestre digita os
// atributos primários livremente; os secundários/recursos são
// calculados automaticamente (mesmas fórmulas do jogador, regras.js),
// com opção de sobrescrever qualquer um na mão. Perícias são uma lista
// dinâmica com nível de 1 a 5, livre entre todas as perícias do manual.
// `npcExistente` = null pra criar um novo; passe o objeto do NPC (com
// `.id`) pra editar um já existente.
// ---------------------------------------------------------------------
// `prefillModelo` (só usado quando npcExistente é null, ou seja, na
// criação de um NPC NOVO): objeto de um NPC já salvo com `modelo: true`,
// escolhido no seletor logo abaixo. Serve só pra pré-preencher todos os
// campos do formulário — o resultado do "Criar NPC" continua sendo uma
// entrada 100% independente (novo id, sem vínculo nenhum com o modelo
// original). Editar à vontade antes de salvar, e opcionalmente marcar
// esse novo NPC como modelo também (checkbox "Marcar como modelo" mais
// abaixo) — ver plano-npc-modelo.txt.
export function montarFormularioNpcDetalhado(container, npcExistente, onSalvo, prefillModelo = null) {
    const fontePrefill = npcExistente || prefillModelo;
    const npcDet = fontePrefill && fontePrefill.modoDetalhado
        ? {
            vulgo: fontePrefill.vulgo || "",
            idade: fontePrefill.idade || "",
            funcaoNarrativa: fontePrefill.funcaoNarrativa || "",
            nivel: Math.max(1, Number(fontePrefill.nivel) || 1),
            atributosPrimarios: { ...estadoInicialNpcDetalhado().atributosPrimarios, ...(fontePrefill.atributosPrimarios || {}) },
            secundariosOverride: { ...estadoInicialNpcDetalhado().secundariosOverride, ...(fontePrefill.secundariosOverride || {}) },
            periciasNpc: { ...(fontePrefill.periciasNpc || {}) },
            // Inventário completo (armas, munição, etc. — Módulo 3). Só
            // faz sentido copiar de um MODELO (npcExistente continua
            // editado à parte, via "Atuar como NPC" — não por aqui), daí
            // o fallback pro próprio inventário quando editando. Clonado
            // via JSON round-trip pra nunca compartilhar referência com
            // o objeto original em estado.npcsCache/npcExistente.
            inventario: JSON.parse(JSON.stringify(fontePrefill.inventario || {})),
            categoriasInventario: JSON.parse(JSON.stringify(fontePrefill.categoriasInventario || {})),
            energiaAtual: fontePrefill.energiaAtual ?? null
        }
        : estadoInicialNpcDetalhado();

    // ---- Preencher a partir de um modelo (só na criação de NPC novo) ----
    if (!npcExistente) {
        const modelosDisponiveis = (estado.npcsCache || []).filter(n => n.modelo && n.modoDetalhado);
        if (modelosDisponiveis.length) {
            const secModelo = document.createElement("div");
            secModelo.className = "section-header";
            secModelo.innerText = "Preencher a partir de um modelo";
            container.appendChild(secModelo);
            const hintModelo = document.createElement("p");
            hintModelo.className = "hint";
            hintModelo.innerText = "Escolha um modelo salvo pra já vir tudo preenchido abaixo — depois é só ajustar o que quiser antes de criar. O NPC criado fica independente do modelo.";
            container.appendChild(hintModelo);
            const selectModelo = document.createElement("select");
            selectModelo.innerHTML = '<option value="">— em branco —</option>';
            modelosDisponiveis
                .slice()
                .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))
                .forEach(n => {
                    const opt = document.createElement("option");
                    opt.value = n.id;
                    opt.innerText = n.categoria ? `${n.nome} (${n.categoria})` : n.nome;
                    selectModelo.appendChild(opt);
                });
            if (prefillModelo) selectModelo.value = prefillModelo.id;
            selectModelo.addEventListener("change", () => {
                const escolhido = selectModelo.value ? modelosDisponiveis.find(n => n.id === selectModelo.value) : null;
                container.innerHTML = "";
                montarFormularioNpcDetalhado(container, null, onSalvo, escolhido);
            });
            container.appendChild(selectModelo);
        }
    }

    // ---- Informações básicas ----
    const secBasico = document.createElement("div");
    secBasico.className = "section-header";
    secBasico.innerText = "Informações básicas";
    container.appendChild(secBasico);

    const gridBasico = document.createElement("div");
    gridBasico.style.display = "grid";
    gridBasico.style.gridTemplateColumns = "1fr 1fr";
    gridBasico.style.gap = "8px";
    const inputNome = criarInput("text", "Nome");
    inputNome.value = fontePrefill ? fontePrefill.nome || "" : "";
    const inputVulgo = criarInput("text", "Vulgo");
    inputVulgo.value = npcDet.vulgo;
    const inputIdade = criarInput("text", "Idade");
    inputIdade.value = npcDet.idade;
    const inputFuncaoNarrativa = criarInput("text", "Função narrativa (ex: Capanga do Mercador)");
    inputFuncaoNarrativa.value = npcDet.funcaoNarrativa;
    gridBasico.append(inputNome, inputVulgo, inputIdade, inputFuncaoNarrativa);
    container.appendChild(gridBasico);

    // ---- Categoria (opcional) — texto livre com sugestão das
    // categorias já usadas noutros NPCs (plano-busca-categorias.txt,
    // Fase A). Fica de fora do gridBasico (2 colunas) de propósito, pra
    // não desalinhar os 4 campos que já formam pares ali.
    const campoCategoria = document.createElement("div");
    campoCategoria.className = "modal-field";
    const labelCategoria = document.createElement("label");
    labelCategoria.innerText = "Categoria (opcional)";
    const inputCategoria = criarInput("text", "Ex.: Capangas, Contatos...");
    inputCategoria.value = fontePrefill ? fontePrefill.categoria || "" : "";
    const datalistCategoria = document.createElement("datalist");
    datalistCategoria.id = "datalist-categoria-npc";
    categoriasDistintas(estado.npcsCache).forEach(cat => {
        const opt = document.createElement("option");
        opt.value = cat;
        datalistCategoria.appendChild(opt);
    });
    inputCategoria.setAttribute("list", datalistCategoria.id);
    campoCategoria.append(labelCategoria, inputCategoria, datalistCategoria);
    container.appendChild(campoCategoria);

    // ---- Nível (opcional) — só alimenta a sugestão de faixa de PV
    // logo abaixo, no campo PV (ver faixaPvSugeridaNpc, npc-detalhado.js).
    // Não trava nem sobrescreve nada sozinho; o Mestre continua livre
    // pra digitar qualquer PV, calculado ou sobrescrito.
    const campoNivel = document.createElement("div");
    campoNivel.className = "modal-field";
    const labelNivel = document.createElement("label");
    labelNivel.innerText = "Nível (opcional — sugere a faixa de PV)";
    const inputNivel = document.createElement("input");
    inputNivel.type = "number";
    inputNivel.min = 1;
    inputNivel.value = npcDet.nivel;
    campoNivel.append(labelNivel, inputNivel);
    container.appendChild(campoNivel);

    // ---- Atributos primários ----
    const secAtributos = document.createElement("div");
    secAtributos.className = "section-header";
    secAtributos.innerText = "Atributos primários";
    container.appendChild(secAtributos);

    const gridAtributos = document.createElement("div");
    gridAtributos.style.display = "grid";
    gridAtributos.style.gridTemplateColumns = "1fr 1fr 1fr 1fr";
    gridAtributos.style.gap = "8px";
    const inputsAtributos = {};
    ATRIBUTOS_PRIMARIOS.forEach(a => {
        const campo = document.createElement("div");
        campo.className = "modal-field";
        const label = document.createElement("label");
        label.innerText = a.label;
        const input = document.createElement("input");
        input.type = "number";
        input.value = npcDet.atributosPrimarios[a.key] ?? 0;
        campo.append(label, input);
        gridAtributos.appendChild(campo);
        inputsAtributos[a.key] = input;
    });
    container.appendChild(gridAtributos);

    // ---- Atributos secundários calculados (com override manual) ----
    const secSecundarios = document.createElement("div");
    secSecundarios.className = "section-header";
    secSecundarios.innerText = "Secundários e recursos (calculados — marque pra sobrescrever)";
    container.appendChild(secSecundarios);

    const gridSecundarios = document.createElement("div");
    gridSecundarios.style.display = "grid";
    gridSecundarios.style.gridTemplateColumns = "1fr 1fr 1fr";
    gridSecundarios.style.gap = "8px";
    container.appendChild(gridSecundarios);

    // ---- Sugestão de faixa de PV pelo Nível (ver campoNivel acima e
    // faixaPvSugeridaNpc em npc-detalhado.js) — só um texto informativo
    // logo abaixo do grid de secundários/recursos, não interfere em
    // nada calculado ou sobrescrito ali.
    const hintPvSugerido = document.createElement("p");
    hintPvSugerido.className = "hint";
    container.appendChild(hintPvSugerido);

    const chavesSecundarias = [...ATRIBUTOS_SECUNDARIOS, ...RECURSOS];
    const inputsSecundarios = {};
    const checksOverride = {};

    function renderSecundarios() {
        const atuais = {};
        ATRIBUTOS_PRIMARIOS.forEach(a => { atuais[a.key] = Number(inputsAtributos[a.key].value) || 0; });
        const overrideAtual = {};
        chavesSecundarias.forEach(s => {
            overrideAtual[s.key] = checksOverride[s.key] && checksOverride[s.key].checked
                ? (inputsSecundarios[s.key] ? inputsSecundarios[s.key].value : null)
                : null;
        });
        const calc = calcularSecundariosNpc(atuais, overrideAtual);
        const todos = { ...calc.secundarios, ...calc.recursos };

        gridSecundarios.innerHTML = "";
        chavesSecundarias.forEach(s => {
            const info = todos[s.key];
            const bloco = document.createElement("div");
            bloco.className = "modal-field";
            const label = document.createElement("label");
            label.innerText = `${info.label} (calc: ${info.calculado})`;
            const linha = document.createElement("div");
            linha.style.display = "flex";
            linha.style.gap = "6px";
            const chk = document.createElement("input");
            chk.type = "checkbox";
            chk.title = "Sobrescrever valor calculado";
            chk.checked = npcDet.secundariosOverride[s.key] !== null && npcDet.secundariosOverride[s.key] !== undefined;
            const input = document.createElement("input");
            input.type = "number";
            input.value = info.valor;
            input.disabled = !chk.checked;
            chk.addEventListener("change", () => { input.disabled = !chk.checked; });
            linha.append(chk, input);
            bloco.append(label, linha);
            gridSecundarios.appendChild(bloco);
            inputsSecundarios[s.key] = input;
            checksOverride[s.key] = chk;
        });

        // Sugestão de PV pelo Nível — recalcula com a Constituição/Nível
        // atuais do formulário (não com os já salvos), pra atualizar
        // enquanto o Mestre digita.
        const faixa = faixaPvSugeridaNpc(atuais, inputNivel.value);
        const avisoInalcancavel = !faixa.alcancavel
            ? ` ⚠️ Constituição ${faixa.constituicaoFinal} não é alcançável no nível ${faixa.nivelAlvo} pela progressão normal (precisaria de pelo menos ${faixa.pontosNecessarios} Level Up(s) gasto(s) em Constituição; esse nível só tem ${faixa.levelUps}) — faixa abaixo é só uma estimativa.`
            : "";
        hintPvSugerido.innerText = faixa.levelUps > 0
            ? `Sugestão de PV pro nível ${faixa.nivelAlvo} com Constituição ${faixa.constituicaoFinal}: entre ${faixa.pvMinimo} e ${faixa.pvMaximo} (mínimo e máximo possíveis de Dados de Vida ao longo dos ${faixa.levelUps} Level Up(s)).${avisoInalcancavel}`
            : `Sugestão de PV pro nível ${faixa.nivelAlvo} com Constituição ${faixa.constituicaoFinal}: ${faixa.pvMinimo} (nível 1, ainda sem Dado de Vida extra).`;
    }
    renderSecundarios();
    Object.values(inputsAtributos).forEach(input => input.addEventListener("input", renderSecundarios));
    inputNivel.addEventListener("input", renderSecundarios);

    // ---- Perícias dinâmicas (1 a 5, qualquer perícia do manual) ----
    const secPericias = document.createElement("div");
    secPericias.className = "section-header";
    secPericias.innerText = "Perícias";
    container.appendChild(secPericias);

    const listaPericiasEl = document.createElement("div");
    listaPericiasEl.style.display = "flex";
    listaPericiasEl.style.flexDirection = "column";
    listaPericiasEl.style.gap = "6px";
    container.appendChild(listaPericiasEl);

    function renderListaPericias() {
        listaPericiasEl.innerHTML = "";
        Object.entries(npcDet.periciasNpc).forEach(([id, p]) => {
            const linha = document.createElement("div");
            linha.style.display = "flex";
            linha.style.justifyContent = "space-between";
            linha.style.alignItems = "center";
            linha.innerHTML = `<span>${escapeHtml(p.nome)} — nível ${p.nivel}</span>`;
            const btnRemover = document.createElement("button");
            btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "×";
            btnRemover.addEventListener("click", () => { removerPericiaNpc(npcDet, id); renderListaPericias(); });
            linha.appendChild(btnRemover);
            listaPericiasEl.appendChild(linha);
        });
        if (!Object.keys(npcDet.periciasNpc).length) {
            listaPericiasEl.innerHTML = `<p class="hint">Nenhuma perícia adicionada ainda.</p>`;
        }
    }
    renderListaPericias();

    const linhaAddPericia = document.createElement("div");
    linhaAddPericia.style.display = "grid";
    linhaAddPericia.style.gridTemplateColumns = "1fr 1fr 80px auto";
    linhaAddPericia.style.gap = "8px";
    const selectCategoriaPericia = document.createElement("select");
    CATEGORIAS_PERICIA.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key; opt.innerText = c.label;
        selectCategoriaPericia.appendChild(opt);
    });
    const selectPericiaNome = document.createElement("select");
    function popularSelectPericia() {
        selectPericiaNome.innerHTML = "";
        listaPericiasPorCategoria(selectCategoriaPericia.value).forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.nome; opt.innerText = p.nome;
            selectPericiaNome.appendChild(opt);
        });
    }
    popularSelectPericia();
    selectCategoriaPericia.addEventListener("change", popularSelectPericia);
    const inputNivelPericia = criarInput("number", "Nível (1–5)");
    inputNivelPericia.min = 1; inputNivelPericia.max = 5; inputNivelPericia.value = 3;
    const btnAddPericia = document.createElement("button");
    btnAddPericia.className = "btn-blue"; btnAddPericia.type = "button"; btnAddPericia.innerText = "+ Add";
    btnAddPericia.addEventListener("click", () => {
        adicionarPericiaNpc(npcDet, selectPericiaNome.value, inputNivelPericia.value);
        renderListaPericias();
    });
    linhaAddPericia.append(selectCategoriaPericia, selectPericiaNome, inputNivelPericia, btnAddPericia);
    container.appendChild(linhaAddPericia);

    // ---- Proteção contra dano (várias reduções ao mesmo tempo, mesmo modelo dos itens do jogador) ----
    const secProtecao = document.createElement("div");
    secProtecao.className = "section-header";
    secProtecao.innerText = "Proteção (opcional)";
    container.appendChild(secProtecao);
    const hintProtecao = document.createElement("div");
    hintProtecao.className = "hint";
    hintProtecao.innerText = "Marque quantos tipos de dano esse NPC reduzir precisar, cada um com seu próprio valor.";
    container.appendChild(hintProtecao);
    // Migra automaticamente NPC antigo (1 tipo só, protecaoTipo/Valor)
    // pro checklist assim que ele é aberto pra edição.
    const reducoesExistentes = (fontePrefill?.reducoesDano && fontePrefill.reducoesDano.length)
        ? fontePrefill.reducoesDano
        : (fontePrefill?.protecaoTipo ? [{ tipo: fontePrefill.protecaoTipo, valor: fontePrefill.protecaoValor || 0 }] : []);
    const checklistProtecao = montarChecklistReducaoNpc(reducoesExistentes);
    container.appendChild(checklistProtecao);

    if (npcExistente) {
        const campoPvAtual = document.createElement("div");
        campoPvAtual.className = "modal-field";
        campoPvAtual.style.marginTop = "8px";
        const label = document.createElement("label");
        label.innerText = "PV atual";
        const inputPvAtual = document.createElement("input");
        inputPvAtual.type = "number";
        inputPvAtual.value = npcExistente.pvAtual ?? npcExistente.pvs ?? 0;
        campoPvAtual.append(label, inputPvAtual);
        container.appendChild(campoPvAtual);
        var refInputPvAtual = inputPvAtual; // usado no salvar, abaixo
    }

    // ---- Marcar como modelo (plano-npc-modelo.txt) — aparece tanto
    // criando quanto editando. Um NPC marcado aqui passa a aparecer no
    // seletor "Preencher a partir de um modelo" acima, pra qualquer novo
    // NPC. Não afeta em nada esse NPC em combate; é só metadado. ----
    const campoModelo = document.createElement("div");
    campoModelo.className = "modal-field";
    campoModelo.style.marginTop = "8px";
    const labelModelo = document.createElement("label");
    labelModelo.style.display = "flex";
    labelModelo.style.alignItems = "center";
    labelModelo.style.gap = "6px";
    const chkModelo = document.createElement("input");
    chkModelo.type = "checkbox";
    chkModelo.checked = !!(npcExistente && npcExistente.modelo);
    labelModelo.append(chkModelo, document.createTextNode("⭐ Marcar como modelo (reaproveitar pra preencher NPCs novos)"));
    campoModelo.appendChild(labelModelo);
    container.appendChild(campoModelo);

    const btnSalvar = document.createElement("button");
    btnSalvar.className = "btn-lime"; btnSalvar.type = "button";
    btnSalvar.innerText = npcExistente ? "Salvar mini-ficha" : "Criar NPC (mini-ficha)";
    btnSalvar.style.marginTop = "12px";
    btnSalvar.addEventListener("click", async () => {
        if (!inputNome.value.trim()) { toast("Dê um nome ao NPC.", "erro"); return; }
        npcDet.nivel = Math.max(1, Number(inputNivel.value) || 1);
        ATRIBUTOS_PRIMARIOS.forEach(a => { npcDet.atributosPrimarios[a.key] = Number(inputsAtributos[a.key].value) || 0; });
        chavesSecundarias.forEach(s => {
            npcDet.secundariosOverride[s.key] = checksOverride[s.key].checked
                ? Number(inputsSecundarios[s.key].value) || 0
                : null;
        });
        const payload = {
            nome: inputNome.value.trim(),
            categoria: inputCategoria.value.trim(),
            modelo: chkModelo.checked,
            npcDetalhado: {
                vulgo: inputVulgo.value.trim(),
                idade: inputIdade.value.trim(),
                funcaoNarrativa: inputFuncaoNarrativa.value.trim(),
                nivel: npcDet.nivel,
                atributosPrimarios: npcDet.atributosPrimarios,
                secundariosOverride: npcDet.secundariosOverride,
                periciasNpc: npcDet.periciasNpc,
                inventario: npcDet.inventario,
                categoriasInventario: npcDet.categoriasInventario,
                energiaAtual: npcDet.energiaAtual
            },
            reducoesDano: checklistProtecao.lerReducoes()
        };
        let novoId = null;
        if (npcExistente) {
            await atualizarNpcDetalhado(npcExistente.id, { ...payload, pvAtual: refInputPvAtual.value });
        } else {
            novoId = await criarNpcDetalhado(payload);
        }
        if (onSalvo) await onSalvo(novoId, payload.nome);
    });
    container.appendChild(btnSalvar);
}

// Monta um checklist de "Tipos de dano reduzidos" pro NPC — mesmo
// padrão visual/lógico do checklist usado nos itens de proteção do
// jogador (montarReducaoDanoChecklist), mas autocontido: o formulário
// de NPC é 100% montado via JS, sem elementos estáticos no HTML, então
// aqui o próprio elemento retornado carrega o método de leitura.
function montarChecklistReducaoNpc(reducoesAtuais) {
    const wrap = document.createElement("div");
    wrap.className = "reducao-dano-grid";
    const mapaAtual = {};
    (reducoesAtuais || []).forEach(r => { mapaAtual[r.tipo] = r.valor; });

    TIPOS_DANO.forEach(t => {
        const linha = document.createElement("div");
        linha.className = "reducao-dano-linha";
        const marcado = Object.prototype.hasOwnProperty.call(mapaAtual, t.key);
        linha.innerHTML = `
            <label>
                <input type="checkbox" class="reducao-dano-check" data-tipo="${t.key}" ${marcado ? "checked" : ""}>
                ${escapeHtml(t.label)}
            </label>
            <input type="number" class="reducao-dano-valor" data-tipo="${t.key}" min="0" step="1" value="${marcado ? mapaAtual[t.key] : 0}" ${marcado ? "" : "disabled"}>
        `;
        const chk = linha.querySelector(".reducao-dano-check");
        const valorInput = linha.querySelector(".reducao-dano-valor");
        chk.addEventListener("change", () => { valorInput.disabled = !chk.checked; });
        wrap.appendChild(linha);
    });

    // Lê o checklist e monta o array [{ tipo, valor }, ...] pra salvar.
    wrap.lerReducoes = () => {
        const resultado = [];
        wrap.querySelectorAll(".reducao-dano-linha").forEach(linha => {
            const chk = linha.querySelector(".reducao-dano-check");
            const valorInput = linha.querySelector(".reducao-dano-valor");
            if (chk.checked) {
                const valor = Number(valorInput.value) || 0;
                if (valor > 0) resultado.push({ tipo: chk.dataset.tipo, valor });
            }
        });
        return resultado;
    };
    return wrap;
}
