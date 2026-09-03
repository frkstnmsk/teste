// ============================================================
// mestre/bibliotecas.js — Passo 29 do plano de modularização de
// ficha.js (ver plano-modularizacao-ficha-js.txt).
//
// Painéis do Mestre pra Banco Global: "Biblioteca de Itens Salvos"
// (montarPainelBibliotecaItens), "Biblioteca de Receitas"
// (montarPainelBibliotecaReceitas) — cada um com busca, filtro de
// categoria e CRUD sem precisar estar dentro de nenhuma ficha
// específica — e o Dashboard de Fichas (montarDashboardFichas), que
// lista todas as fichas ativas da mesa pra o Mestre escolher qual
// abrir.
// ============================================================

import { estado, definirLimpezaPainelMestre } from "../estado.js";
import {
    el, escapeHtml, toast, ativarSincronizacao,
    ativarPreviewFlutuanteImagem, abrirModalEdicao, abrirModalNovo,
    montarBarraFiltro, itemPassaFiltroCategoria, montarListaComScrollInfinito,
} from "../ficha.js?v=20260830-npcnivelpv";
import { rotuloTag } from "../dados-manual.js";
import { ouvirItensGlobais, excluirItemBanco } from "../itens-globais.js";
import { ouvirReceitasGlobais, excluirReceitaBanco } from "../receitas-globais.js";
import { formatarIngredientes, abrirModalCriarReceita } from "../abas/receitas.js";

// ---------------------------------------------------------------------
// Painel do Mestre — "Biblioteca de Itens Salvos" (Banco Global).
// Lista todo mundo que já foi salvo (de dentro de uma ficha, com o
// checkbox marcado, ou criado direto aqui) e deixa criar um item do
// zero sem precisar estar dentro de nenhuma ficha.
// ---------------------------------------------------------------------
export function montarPainelBibliotecaItens(corpo) {
    const { busca, selectCategoria, popularSelectCategoria } = montarBarraFiltro(corpo, { placeholderBusca: "Buscar por nome..." });

    const contador = document.createElement("span");
    contador.className = "hint-inline scroll-infinito-contador";
    corpo.appendChild(contador);

    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    // Cache LOCAL da lista (separado de estado.itensGlobaisCache, que continua
    // alimentando o autocompletar do modal de item em qualquer ficha):
    // igual ao Painel de NPCs, um listener próprio aqui evita que a
    // barra de busca/categoria seja perdida sempre que o Banco Global
    // mudar em segundo plano — antes, esse painel era remontado do zero
    // a cada atualização (ver "banco global de itens" no init), o que
    // apagava o texto digitado e o filtro escolhido.
    let itensAtuais = [];

    const renderCardItem = (it) => {
        const card = document.createElement("div");
        card.className = "npc-card";
        const origem = it.origemFichaId ? `Salvo a partir da ficha de ${escapeHtml(it.origemFichaId)}` : "Cadastrado direto na Biblioteca";
        card.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                ${it.imagem ? `<img class="entity-thumb" src="${escapeHtml(it.imagem)}" alt="">` : ""}
                <strong>${escapeHtml(it.nome)}</strong>
            </div>
            <span>${escapeHtml(rotuloTag(it.tag))}${it.nivelTag ? ` (nível ${it.nivelTag})` : ""} · ${it.peso ?? 0} kg</span>
            ${it.categoriaBanco ? `<span class="hint-inline">Categoria: ${escapeHtml(it.categoriaBanco)}</span>` : ""}
            ${it.arma ? `<span>Dano base: ${it.arma.danoBase ?? 0}</span>` : ""}
            <span class="hint-inline">${escapeHtml(origem)}</span>
        `;
        const thumbHoverBanco = card.querySelector(".entity-thumb");
        if (thumbHoverBanco) ativarPreviewFlutuanteImagem(thumbHoverBanco, it.imagem);
        const linhaBtns = document.createElement("div");
        linhaBtns.className = "modal-btns";
        const btnEditar = document.createElement("button");
        btnEditar.className = "btn-ghost"; btnEditar.type = "button"; btnEditar.innerText = "Editar";
        btnEditar.addEventListener("click", () => abrirModalEdicao("itensGlobais", it.id));
        const btnExcluir = document.createElement("button");
        btnExcluir.className = "btn-red"; btnExcluir.type = "button"; btnExcluir.innerText = "Excluir";
        btnExcluir.addEventListener("click", async () => {
            if (!confirm(`Excluir "${it.nome}" do Banco Global?`)) return;
            await excluirItemBanco(it.id);
            toast("Item removido do Banco Global.");
        });
        linhaBtns.append(btnEditar, btnExcluir);
        card.appendChild(linhaBtns);
        return card;
    };

    const renderLista = () => {
        const filtro = busca.value.trim().toLowerCase();
        const itens = itensAtuais
            .filter(it => !filtro || (it.nome || "").toLowerCase().includes(filtro))
            .filter(it => itemPassaFiltroCategoria(it, selectCategoria, "categoriaBanco"))
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        montarListaComScrollInfinito({
            container: lista,
            scrollRoot: el.drawerPendentes,
            itens,
            renderItem: renderCardItem,
            mensagemVazia: "Nenhum item no Banco Global ainda.",
            contadorEl: contador
        });
    };
    busca.addEventListener("input", renderLista);
    selectCategoria.addEventListener("change", renderLista);

    // Listener local (não o estado.itensGlobaisCache do topo do arquivo, que
    // continua alimentando o autocompletar do modal de item em qualquer
    // ficha) — ver comentário acima de itensAtuais e definirLimpezaPainelMestre.
    definirLimpezaPainelMestre(ouvirItensGlobais((itens) => {
        itensAtuais = itens || [];
        popularSelectCategoria(itensAtuais, "categoriaBanco");
        renderLista();
    }));

    const btnNovo = document.createElement("button");
    btnNovo.className = "btn-lime"; btnNovo.type = "button"; btnNovo.innerText = "+ Criar Novo Item";
    btnNovo.style.marginTop = "12px";
    btnNovo.addEventListener("click", () => abrirModalNovo("itensGlobais"));
    corpo.appendChild(btnNovo);
}

// ---------------------------------------------------------------------
// Painel do Mestre — "Biblioteca de Receitas" (Banco Global de
// Receitas). Mesma ideia da Biblioteca de Itens acima, mas usando o
// modal próprio de receita (abrirModalCriarReceita) em vez do modal
// genérico de item — deixa o Mestre criar/editar/excluir qualquer
// receita sem precisar estar dentro de nenhuma ficha específica.
// ---------------------------------------------------------------------
export function montarPainelBibliotecaReceitas(corpo) {
    const { busca, selectCategoria, popularSelectCategoria } = montarBarraFiltro(corpo, { placeholderBusca: "Buscar por nome..." });

    const contador = document.createElement("span");
    contador.className = "hint-inline scroll-infinito-contador";
    corpo.appendChild(contador);

    const lista = document.createElement("div");
    lista.style.display = "flex";
    lista.style.flexDirection = "column";
    lista.style.gap = "8px";
    corpo.appendChild(lista);

    // Cache LOCAL (separado de estado.receitasGlobaisCache, que continua
    // alimentando a aba "Receitas" da ficha) — mesmo motivo do
    // itensAtuais em montarPainelBibliotecaItens: listener próprio pra
    // não perder busca/categoria a cada atualização em segundo plano.
    let receitasAtuais = [];

    const renderCardReceita = (r) => {
        const card = document.createElement("div");
        card.className = "npc-card";
        card.innerHTML = `
            <strong>${escapeHtml(r.nome)}</strong>
            <span>${escapeHtml(r.periciaVinculada || "—")} · Nível ${Number(r.nivel) || 1}${(r.dificuldade || r.dificuldade === 0) ? ` · Dificuldade ${r.dificuldade}` : ""}${(r.dificuldadeArmar || r.dificuldadeArmar === 0) ? ` · Dificuldade de armar ${r.dificuldadeArmar}` : ""}</span>
            ${r.categoria ? `<span class="hint-inline">Categoria: ${escapeHtml(r.categoria)}</span>` : ""}
            ${formatarIngredientes(r) ? `<span class="hint-inline">Materiais: ${escapeHtml(formatarIngredientes(r))}</span>` : ""}
            <span class="hint-inline">Cadastrada por ${escapeHtml(r.criadoPorNome || "—")} (${r.criadoPorTipo === "mestre" ? "Mestre" : "jogador"})</span>
        `;
        const linhaBtns = document.createElement("div");
        linhaBtns.className = "modal-btns";
        const btnEditar = document.createElement("button");
        btnEditar.className = "btn-ghost"; btnEditar.type = "button"; btnEditar.innerText = "Editar";
        btnEditar.addEventListener("click", () => abrirModalCriarReceita(r));
        const btnExcluir = document.createElement("button");
        btnExcluir.className = "btn-red"; btnExcluir.type = "button"; btnExcluir.innerText = "Excluir";
        btnExcluir.addEventListener("click", async () => {
            if (!confirm(`Excluir a receita "${r.nome}" do Banco Global?`)) return;
            await excluirReceitaBanco(r.id);
            toast("Receita removida do Banco Global.");
        });
        linhaBtns.append(btnEditar, btnExcluir);
        card.appendChild(linhaBtns);
        return card;
    };

    const renderLista = () => {
        const filtro = busca.value.trim().toLowerCase();
        const receitas = receitasAtuais
            .filter(r => !filtro || (r.nome || "").toLowerCase().includes(filtro))
            .filter(r => itemPassaFiltroCategoria(r, selectCategoria, "categoria"))
            .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        montarListaComScrollInfinito({
            container: lista,
            scrollRoot: el.drawerPendentes,
            itens: receitas,
            renderItem: renderCardReceita,
            mensagemVazia: "Nenhuma receita no Banco Global ainda.",
            contadorEl: contador
        });
    };
    busca.addEventListener("input", renderLista);
    selectCategoria.addEventListener("change", renderLista);

    definirLimpezaPainelMestre(ouvirReceitasGlobais((receitas) => {
        receitasAtuais = receitas || [];
        popularSelectCategoria(receitasAtuais, "categoria");
        renderLista();
    }));

    const btnNovo = document.createElement("button");
    btnNovo.className = "btn-lime"; btnNovo.type = "button"; btnNovo.innerText = "+ Criar Nova Receita";
    btnNovo.style.marginTop = "12px";
    btnNovo.addEventListener("click", () => abrirModalCriarReceita());
    corpo.appendChild(btnNovo);
}

// ---------------------------------------------------------------------
// Dashboard de Fichas do Mestre: lista todas as fichas ativas da mesa
// e deixa clicar pra "assumir" cada uma (mesmo mecanismo de troca de
// ficha usado no seletor principal — ver ativarSincronizacao).
// ---------------------------------------------------------------------
export function montarDashboardFichas(corpo) {
    Object.keys(estado.todasAsFichasCache).forEach(id => {
        const f = estado.todasAsFichasCache[id];
        const nome = (f.config && f.config.nomeExibicao) || id;
        const div = document.createElement("div");
        div.className = "mestre-dashboard-item";
        const pv = f.dados ? f.dados.pvAtual : "—";
        const nivel = f.dados ? f.dados.nivel : "—";
        div.innerHTML = `<span>${escapeHtml(nome)} — nível ${nivel}, PV ${pv ?? "—"}</span><span>Abrir →</span>`;
        div.addEventListener("click", () => {
            estado.modoNpc = false;
            estado.npcAtualId = null;
            if (el.selectNpcAtuar) el.selectNpcAtuar.value = "";
            el.selectFicha.value = id;
            estado.fichaAtualId = id;
            ativarSincronizacao();
            // O Painel do Mestre agora mora dentro da gaveta de Ações
            // Pendentes: ao escolher uma ficha aqui, fecha a gaveta
            // inteira (mesmo comportamento de "fechar" usado em
            // configurarDrawerPendentes).
            if (el.drawerPendentes) el.drawerPendentes.classList.remove("aberto");
            if (el.btnPendentesLateral) el.btnPendentesLateral.classList.remove("aberto");
        });
        corpo.appendChild(div);
    });
}
