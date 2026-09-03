// abas/financas.js
// ---------------------------------------------------------------------
// Aba Finanças — saldos, ganho fixo, gastar dinheiro, transformar em
// item, mover dinheiro entre saldos.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
// ---------------------------------------------------------------------

import { ref, update, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { db } from "../firebase-config.js";
import { estado } from "../estado.js";
import { el, toast, caminhoBase, agendarSalvamento, escapeHtml } from "../ficha.js?v=20260830-npcnivelpv";
import { arredondarMoeda, ehIdSaldoDeItem, idItemDoSaldo, campoSaldoDoItem, todosOsSaldos } from "../dados-manual.js";
import { criarAcaoPendente } from "../mestre.js";

export function renderizarFinancas() {
    el.financasSaldoHint.innerText = estado.isMestre
        ? "você pode editar os saldos diretamente acima"
        : "apenas o Mestre pode editar os saldos — use \"Gastar dinheiro\" abaixo pra remover";
    el.financasGastarBloco.style.display = estado.isMestre ? "none" : "block";
    el.financasMoverBloco.style.display = estado.isMestre ? "none" : "block";

    renderizarSaldos();
    renderizarOpcoesOrigemGasto();
    renderizarOpcoesMoverDinheiro();

    if (document.activeElement !== el.financasGanhoFixo) {
        el.financasGanhoFixo.value = estado.fichaAtual.dados.ganhoFixo ?? 0;
    }
    el.financasGanhoFixo.disabled = !estado.isMestre;
    el.financasGanhoFixoSalvar.style.display = estado.isMestre ? "inline-block" : "none";
}

// Desenha um campo numérico por saldo (fixo ou customizado). Só o
// Mestre pode digitar direto aqui — jogador só vê o valor e usa
// "Gastar dinheiro" (que vira pedido de aprovação).
export function renderizarSaldos() {
    const saldos = todosOsSaldos(estado.fichaAtual);
    el.financasSaldosGrid.innerHTML = "";
    saldos.forEach((s) => {
        const domId = s.id.replace(/[^a-zA-Z0-9_-]/g, "_");
        const campo = document.createElement("div");
        campo.className = "campo";
        // Só saldo customizado (fixo:false) e que não é a carteira embutida
        // de um item (deItem — esse aí some junto com o item, não tem
        // exclusão própria) ganha o botão de excluir. Os 3 saldos padrão
        // de toda ficha nova (Dinheiro sujo em casa/limpo na conta/No
        // bolso) são fixo:true e continuam intocáveis.
        const podeExcluir = !s.fixo && !s.deItem;
        campo.innerHTML = `
            <label for="saldo-${domId}">${escapeHtml(s.nome)}</label>
            <div class="saldo-campo-linha">
                <input type="number" id="saldo-${domId}" data-saldo-id="${s.id}">
                ${podeExcluir ? `<button type="button" class="btn-saldo-excluir" data-saldo-excluir-id="${s.id}" data-saldo-excluir-nome="${escapeHtml(s.nome)}" title="Excluir saldo \\"${escapeHtml(s.nome)}\\"">×</button>` : ""}
            </div>
        `;
        const input = campo.querySelector("input");
        if (document.activeElement !== input) input.value = arredondarMoeda(s.valor) ?? 0;
        input.disabled = !estado.isMestre;
        el.financasSaldosGrid.appendChild(campo);
    });
    el.financasSaldosGrid.querySelectorAll(".btn-saldo-excluir").forEach(btn => {
        btn.addEventListener("click", () => excluirSaldoCustomizado(btn.dataset.saldoExcluirId, btn.dataset.saldoExcluirNome));
    });
}

// Exclui um saldo customizado (criado via "+ Novo saldo") — nunca os 3
// fixos da ficha nem os embutidos em item (esses são removidos junto
// com o item, não por aqui — ver podeExcluir em renderizarSaldos).
// Trava a exclusão se ainda sobrar valor nele, pra dinheiro não
// simplesmente desaparecer — pede pra zerar (gastar/mover pra outro
// saldo) antes.
async function excluirSaldoCustomizado(saldoId, saldoNome) {
    if (!estado.fichaAtual || !estado.fichaAtualId || !saldoId) return;
    const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
    if (!saldo || saldo.fixo || saldo.deItem) return;
    if (Number(saldo.valor) || 0) {
        toast(`Zere o saldo "${saldoNome}" (gaste ou mova o dinheiro pra outro saldo) antes de excluí-lo.`, "erro");
        return;
    }
    if (!confirm(`Excluir o saldo "${saldoNome}"? Essa ação não pode ser desfeita.`)) return;
    if (!estado.fichaAtual.saldos || !estado.fichaAtual.saldos[saldoId]) return;
    delete estado.fichaAtual.saldos[saldoId];
    await remove(ref(db, `${caminhoBase()}/saldos/${saldoId}`));
    toast(`Saldo "${saldoNome}" excluído.`);
    renderizarFinancas();
}

// Popula o dropdown "de onde sai" (gastar dinheiro) com os saldos
// atuais da ficha, preservando a escolha atual quando possível.
export function renderizarOpcoesOrigemGasto() {
    const saldos = todosOsSaldos(estado.fichaAtual);
    const escolhaAnterior = el.financasGastarOrigem.value;
    el.financasGastarOrigem.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.financasGastarOrigem.appendChild(opt);
    });
    if (saldos.some(s => s.id === escolhaAnterior)) el.financasGastarOrigem.value = escolhaAnterior;
}

// Popula os dois dropdowns ("De" / "Para") de "Mover dinheiro entre
// saldos" com os saldos atuais da ficha, preservando a escolha atual de
// cada um quando possível — mesma ideia de renderizarOpcoesOrigemGasto
// acima, só que duplicada pros dois lados da movimentação.
export function renderizarOpcoesMoverDinheiro() {
    const saldos = todosOsSaldos(estado.fichaAtual);
    [el.financasMoverOrigem, el.financasMoverDestino].forEach((select) => {
        const escolhaAnterior = select.value;
        select.innerHTML = "";
        saldos.forEach((s) => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.innerText = s.nome;
            select.appendChild(opt);
        });
        if (saldos.some(s => s.id === escolhaAnterior)) select.value = escolhaAnterior;
    });
}

export function configurarFinancas() {
    // Edição direta de saldo — só o Mestre (delegado, igual aos
    // atributos primários).
    document.addEventListener("input", (e) => {
        const saldoId = e.target.dataset && e.target.dataset.saldoId;
        if (!saldoId || !estado.fichaAtualId || !estado.isMestre) return;
        const valor = arredondarMoeda(Number(e.target.value) || 0);
        if (ehIdSaldoDeItem(saldoId)) {
            const itemId = idItemDoSaldo(saldoId);
            const campo = campoSaldoDoItem(saldoId);
            if (!estado.fichaAtual.inventario || !estado.fichaAtual.inventario[itemId]) return;
            estado.fichaAtual.inventario[itemId][campo] = valor;
            agendarSalvamento(`inventario/${itemId}/${campo}`, valor);
            return;
        }
        if (!estado.fichaAtual.saldos || !estado.fichaAtual.saldos[saldoId]) return;
        estado.fichaAtual.saldos[saldoId].valor = valor;
        agendarSalvamento(`saldos/${saldoId}/valor`, valor);
    });

    // Criar novo saldo — carteira/local personalizado. Disponível pro
    // jogador (e pro Mestre); respeita as mesmas regras de aprovação
    // pra retirada, por ser um saldo igual aos demais.
    el.btnAddSaldo.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId) return;
        const nome = (prompt("Nome do novo saldo (ex: Cofre do esconderijo, Debaixo do colchão):") || "").trim();
        if (!nome) return;
        const id = "saldo_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        if (!estado.fichaAtual.saldos) estado.fichaAtual.saldos = {};
        estado.fichaAtual.saldos[id] = { nome, valor: 0, fixo: false };
        await update(ref(db, `${caminhoBase()}/saldos`), estado.fichaAtual.saldos);
        toast(`Saldo "${nome}" criado.`);
    });

    // Ganho fixo — agora só o Mestre pode definir. Fica registrado pro
    // crédito automático de Domingo. Não passa pelo sistema de aprovação
    // (não é uma transação, é um valor fixo cadastrado pelo Mestre).
    el.financasGanhoFixoSalvar.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId) return;
        if (!estado.isMestre) { toast("Só o Mestre pode definir o ganho fixo.", "erro"); return; }
        const valor = Math.max(0, Number(el.financasGanhoFixo.value) || 0);
        estado.fichaAtual.dados.ganhoFixo = valor;
        await update(ref(db, `${caminhoBase()}/dados`), { ganhoFixo: valor });
        toast(`Ganho fixo semanal definido: CN$ ${valor}.`);
    });

    // Gastar dinheiro — jogador nunca subtrai na hora; vira pedido pro
    // Mestre aprovar (regra 4). Funciona pra qualquer saldo, inclusive
    // os customizados criados pelo próprio jogador.
    el.financasGastarBtn.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Number(el.financasGastarValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor de gasto maior que zero.", "erro"); return; }
        const saldoId = el.financasGastarOrigem.value;
        const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtual = Number(saldo.valor) || 0;
        if (valor > saldoAtual) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "gastar_dinheiro",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer gastar CN$ ${valor} (${saldo.nome}).`,
            payload: { valor, saldoId }
        });
        toast("Pedido de gasto enviado ao Mestre.");
        el.financasGastarValor.value = 0;
    });

    // Transformar valor em item — em vez de gastar o dinheiro, ele vira
    // um item físico ("Dinheiro") no inventário desta ficha, com o
    // valor embutido em saldoValor (mesmo esquema de "carteira digital",
    // só que representando uma grana física que pode ser dada a outro
    // personagem pelo fluxo normal de "Dar item"). Também passa pela
    // fila de aprovação do Mestre, igual "Gastar dinheiro" — só troca o
    // destino final (cria item em vez de simplesmente subtrair).
    el.financasTransformarItemBtn.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Math.floor(Number(el.financasGastarValor.value)) || 0;
        if (valor <= 0) { toast("Informe um valor maior que zero.", "erro"); return; }
        const saldoId = el.financasGastarOrigem.value;
        const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const saldoAtual = Number(saldo.valor) || 0;
        if (valor > saldoAtual) { toast("Valor maior que o saldo disponível.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "transformar_dinheiro_item",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer transformar CN$ ${valor} (${saldo.nome}) num item de dinheiro.`,
            payload: { valor, saldoId }
        });
        toast("Pedido enviado ao Mestre.");
        el.financasGastarValor.value = 0;
    });

    // Mover dinheiro entre saldos — igual "Gastar dinheiro", o jogador
    // nunca move na hora, vira pedido pro Mestre aprovar (regra 4). Não
    // altera a soma total da ficha, só a distribuição entre saldos (ex.:
    // sacar da conta bancária e guardar na carteira). Funciona pra
    // qualquer par de saldos, inclusive carteiras digitais de item (ver
    // ehIdSaldoDeItem em dados-manual.js) e saldos customizados.
    el.financasMoverBtn.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
        const valor = Number(el.financasMoverValor.value) || 0;
        if (valor <= 0) { toast("Informe um valor de movimentação maior que zero.", "erro"); return; }
        const origemId = el.financasMoverOrigem.value;
        const destinoId = el.financasMoverDestino.value;
        if (!origemId || !destinoId) { toast("Escolha os saldos de origem e destino.", "erro"); return; }
        if (origemId === destinoId) { toast("Escolha saldos diferentes pra origem e destino.", "erro"); return; }
        const saldos = todosOsSaldos(estado.fichaAtual);
        const saldoOrigem = saldos.find(s => s.id === origemId);
        const saldoDestino = saldos.find(s => s.id === destinoId);
        if (!saldoOrigem || !saldoDestino) { toast("Escolha saldos válidos.", "erro"); return; }
        const saldoAtualOrigem = Number(saldoOrigem.valor) || 0;
        if (valor > saldoAtualOrigem) { toast("Valor maior que o saldo disponível na origem.", "erro"); return; }
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "mover_dinheiro",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer mover CN$ ${valor} de "${saldoOrigem.nome}" pra "${saldoDestino.nome}".`,
            payload: { valor, saldoOrigemId: origemId, saldoDestinoId: destinoId }
        });
        toast("Pedido de movimentação enviado ao Mestre.");
        el.financasMoverValor.value = 0;
    });
}
