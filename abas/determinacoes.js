// abas/determinacoes.js
// ---------------------------------------------------------------------
// Aba Determinações — princípios, vínculos e objetivos que o personagem
// não abandona. Uma caixa de texto por Determinação (quantidade liberada
// pelo Nível), fluxo de validação pelo Mestre (Sistema de Ações
// Pendentes) e a rolagem/navegação entre caixas preenchidas.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 14). Além das 2 funções listadas no plano (renderizarDeterminacoes,
// configurarRolagemDeterminacoes), vieram junto os helpers privados só
// usados por elas (maxDeterminacoes, existePedidoValidacaoPendente,
// solicitarValidacaoDeterminacao, liberarDeterminacao,
// caixasDeterminacaoPreenchidas, atualizarContadorRolagemDeterminacoes,
// rolarParaDeterminacaoPreenchida) e as variáveis de módulo
// determinacoesQtdRenderizada/determinacaoRolagemPos.
//
// NOTA — visualmente a aba Determinações mora na mesma aba ("notas") de
// Dark Net e Notas (ver ficha.html, botão "Determinações / Notas");
// renderizarDeterminacoes() continua sendo chamada de dentro de
// renderizarDarknetENotas() em ficha.js, exatamente como antes.
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import { toast, idAtivo, agendarSalvamento } from "../ficha.js?v=20260830-npcnivelpv";
import { criarAcaoPendente } from "../mestre.js?v=20260830-npcnivelpv";

// Quantidade de slots de Determinação liberados pelo Nível do
// personagem: 3 no nível 1, 6 no nível 3, 9 no nível 6, 10 a partir do
// nível 9 (nível máximo da ficha).
function maxDeterminacoes(nivel) {
    const n = Number(nivel) || 1;
    if (n >= 9) return 10;
    if (n >= 6) return 9;
    if (n >= 3) return 6;
    return 3;
}

// Renderiza uma caixa de texto por Determinação (em vez do antigo
// textarea único de texto livre). A quantidade de caixas visíveis segue
// o Nível atual (ver maxDeterminacoes); se o personagem já tinha mais
// determinações escritas do que seu nível atual libera (ex: rebaixado
// pelo Mestre), essas caixas extras continuam aparecendo — só marcadas
// visualmente — pra nunca apagar texto já escrito pelo jogador.
//
// Fluxo de validação (Sistema de Aprovação do Mestre, mesma fila de
// remover_item/gastar_dinheiro/etc — ver mestre.js): depois de escrever
// o texto, o jogador clica em "Solicitar validação", que cria uma Ação
// Pendente (tipo "validar_determinacao"). Enquanto o Mestre não
// confirma, a caixa mostra "aguardando validação" e o botão some (pra
// não duplicar pedido). Confirmada, fichas/{id}/determinacoesValidadas
// marca aquele índice como true (ver confirmarAcaoPendente em
// mestre.js) — a partir daí só o Mestre edita a caixa (mesmo padrão de
// CAMPOS_SO_MESTRE), até clicar em "Liberar" ali mesmo na Determinação,
// o que desmarca a validação e devolve a edição pro jogador.
let determinacoesQtdRenderizada = null;
export function renderizarDeterminacoes() {
    const lista = document.getElementById("determinacoes-lista");
    if (!lista) return;

    const nivel = estado.fichaAtual.dados ? estado.fichaAtual.dados.nivel : 1;
    const max = maxDeterminacoes(nivel);
    const valores = Array.isArray(estado.fichaAtual.determinacoes) ? estado.fichaAtual.determinacoes : [];
    const validadas = Array.isArray(estado.fichaAtual.determinacoesValidadas) ? estado.fichaAtual.determinacoesValidadas : [];
    const total = Math.max(max, valores.length);

    if (determinacoesQtdRenderizada !== total) {
        lista.innerHTML = "";
        for (let i = 0; i < total; i++) {
            const bloco = document.createElement("div");
            bloco.className = "determinacao-item" + (i >= max ? " determinacao-excedente" : "");
            bloco.dataset.determinacaoBloco = String(i);

            const label = document.createElement("label");
            label.setAttribute("for", `f-determinacao-${i}`);
            const numero = document.createElement("span");
            numero.textContent = (i + 1) + (i >= max ? "  (acima do limite do nível atual)" : "");
            const status = document.createElement("span");
            status.className = "determinacao-status";
            status.dataset.determinacaoStatus = String(i);
            label.appendChild(numero);
            label.appendChild(status);

            const textarea = document.createElement("textarea");
            textarea.id = `f-determinacao-${i}`;
            textarea.dataset.determinacaoIndex = String(i);
            textarea.placeholder = "Princípio, vínculo ou objetivo...";

            const acoes = document.createElement("div");
            acoes.className = "determinacao-acoes";

            const btnSolicitar = document.createElement("button");
            btnSolicitar.type = "button";
            btnSolicitar.className = "btn-lime";
            btnSolicitar.dataset.solicitarValidacaoDeterminacao = String(i);
            btnSolicitar.textContent = "Solicitar validação";
            btnSolicitar.addEventListener("click", () => solicitarValidacaoDeterminacao(i));

            const btnLiberar = document.createElement("button");
            btnLiberar.type = "button";
            btnLiberar.className = "btn-ghost";
            btnLiberar.dataset.liberarDeterminacao = String(i);
            btnLiberar.textContent = "Liberar";
            btnLiberar.addEventListener("click", () => liberarDeterminacao(i));

            acoes.appendChild(btnSolicitar);
            acoes.appendChild(btnLiberar);

            bloco.appendChild(label);
            bloco.appendChild(textarea);
            bloco.appendChild(acoes);
            lista.appendChild(bloco);
        }
        determinacoesQtdRenderizada = total;
    }

    lista.querySelectorAll("textarea[data-determinacao-index]").forEach(t => {
        const idx = Number(t.dataset.determinacaoIndex);
        const texto = valores[idx] || "";
        const validada = !!validadas[idx];
        const pendente = existePedidoValidacaoPendente(idx);
        const bloco = t.closest(".determinacao-item");

        if (document.activeElement !== t) t.value = texto;

        // Só o Mestre edita depois de validada (mesmo padrão de
        // CAMPOS_SO_MESTRE — ver listener de "input" mais abaixo, que
        // também bloqueia a gravação do lado do servidor).
        t.disabled = validada && !estado.isMestre;
        if (bloco) bloco.classList.toggle("determinacao-validada", validada);

        const status = lista.querySelector(`[data-determinacao-status="${idx}"]`);
        if (status) {
            if (validada) {
                status.textContent = "✓ validada";
                status.className = "determinacao-status status-validada";
                status.style.display = "";
            } else if (pendente) {
                status.textContent = "aguardando validação";
                status.className = "determinacao-status status-aguardando";
                status.style.display = "";
            } else {
                status.textContent = "";
                status.style.display = "none";
            }
        }

        const btnSolicitar = lista.querySelector(`[data-solicitar-validacao-determinacao="${idx}"]`);
        if (btnSolicitar) {
            // Só o jogador solicita, só faz sentido com texto escrito, só
            // enquanto não estiver validada nem já aguardando resposta.
            btnSolicitar.style.display = (!estado.isMestre && !validada && !pendente && texto.trim()) ? "" : "none";
        }

        const btnLiberar = lista.querySelector(`[data-liberar-determinacao="${idx}"]`);
        if (btnLiberar) {
            btnLiberar.style.display = (estado.isMestre && validada) ? "" : "none";
        }
    });

    const aviso = document.getElementById("determinacoes-nivel-aviso");
    if (aviso) {
        aviso.textContent = `Nível ${nivel}: ${max} ${max === 1 ? "determinação disponível" : "determinações disponíveis"}.`;
    }

    atualizarContadorRolagemDeterminacoes();
}

// Existe algum pedido de validação (tipo "validar_determinacao") já na
// fila de Ações Pendentes pra essa ficha + índice? Consulta o cache já
// mantido por configurarAcoesPendentes (ver mestre.js) — evita deixar
// o jogador disparar dois pedidos pra mesma caixa.
function existePedidoValidacaoPendente(indice) {
    return estado.pendentesCache.some(a => a.tipo === "validar_determinacao" && a.fichaId === idAtivo() && Number(a.payload && a.payload.indice) === indice);
}

async function solicitarValidacaoDeterminacao(indice) {
    if (!estado.fichaAtual || !idAtivo() || estado.isMestre) return;
    const valores = Array.isArray(estado.fichaAtual.determinacoes) ? estado.fichaAtual.determinacoes : [];
    const texto = (valores[indice] || "").trim();
    if (!texto) { toast("Escreva o texto da Determinação antes de pedir validação.", "erro"); return; }
    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    const trecho = texto.length > 80 ? texto.slice(0, 80) + "…" : texto;
    try {
        await criarAcaoPendente({
            tipo: "validar_determinacao",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} pede validação da Determinação ${indice + 1}: "${trecho}"`,
            payload: { indice, texto }
        });
        toast("Pedido de validação enviado ao Mestre.");
        renderizarDeterminacoes();
    } catch (err) {
        console.error(err);
        toast("Falha ao enviar o pedido de validação.", "erro");
    }
}

// Botão "Liberar" (só o Mestre vê) — desfaz a validação daquela
// Determinação específica, devolvendo a edição pro jogador. Precisa
// estar com a ficha desse jogador aberta (estado.fichaAtualId apontando pra
// ela) pra saber em qual registro gravar.
async function liberarDeterminacao(indice) {
    if (!estado.isMestre || !estado.fichaAtual || !idAtivo()) return;
    if (!Array.isArray(estado.fichaAtual.determinacoesValidadas)) estado.fichaAtual.determinacoesValidadas = [];
    // Preenche eventuais buracos com `false` antes de gravar o array
    // inteiro de volta — um array esparso (com posições `undefined`)
    // vira objeto de chaves não-sequenciais no Realtime Database, e o
    // resto do código (Array.isArray(estado.fichaAtual.determinacoesValidadas))
    // espera sempre um array de verdade. Mesmo cuidado tomado em
    // mestre.js/confirmarAcaoPendente (tipo "validar_determinacao").
    for (let i = 0; i <= indice; i++) {
        if (estado.fichaAtual.determinacoesValidadas[i] === undefined) estado.fichaAtual.determinacoesValidadas[i] = false;
    }
    estado.fichaAtual.determinacoesValidadas[indice] = false;
    agendarSalvamento("determinacoesValidadas", estado.fichaAtual.determinacoesValidadas);
    toast(`Determinação ${indice + 1} liberada para edição.`);
    renderizarDeterminacoes();
}

// ---------------------------------------------------------------------
// Rolagem de Determinações — com até 10 caixas liberadas por Nível, o
// botão de rolar pula direto de uma caixa PREENCHIDA pra outra (ignora
// as vazias no meio), tanto pra cima quanto pra baixo, dentro da lista
// rolável (.determinacoes-lista tem max-height + overflow-y no CSS).
// ---------------------------------------------------------------------
function caixasDeterminacaoPreenchidas() {
    const valores = Array.isArray(estado.fichaAtual?.determinacoes) ? estado.fichaAtual.determinacoes : [];
    const lista = document.getElementById("determinacoes-lista");
    if (!lista) return [];
    return Array.from(lista.querySelectorAll("textarea[data-determinacao-index]"))
        .map(t => Number(t.dataset.determinacaoIndex))
        .filter(idx => (valores[idx] || "").trim());
}

function atualizarContadorRolagemDeterminacoes() {
    const contador = document.getElementById("determinacoes-rolagem-contador");
    if (!contador) return;
    const preenchidas = caixasDeterminacaoPreenchidas();
    contador.textContent = preenchidas.length ? `${preenchidas.length} caixa(s) preenchida(s)` : "nenhuma caixa preenchida ainda";
    const btnAnterior = document.getElementById("btn-determinacao-anterior");
    const btnProxima = document.getElementById("btn-determinacao-proxima");
    if (btnAnterior) btnAnterior.disabled = preenchidas.length < 2;
    if (btnProxima) btnProxima.disabled = preenchidas.length < 2;
}

let determinacaoRolagemPos = -1;
function rolarParaDeterminacaoPreenchida(direcao) {
    const preenchidas = caixasDeterminacaoPreenchidas();
    if (!preenchidas.length) return;
    determinacaoRolagemPos = (determinacaoRolagemPos + direcao + preenchidas.length) % preenchidas.length;
    const idx = preenchidas[determinacaoRolagemPos];
    const bloco = document.querySelector(`[data-determinacao-bloco="${idx}"]`);
    if (bloco) bloco.scrollIntoView({ behavior: "smooth", block: "center" });
}

export function configurarRolagemDeterminacoes() {
    const btnAnterior = document.getElementById("btn-determinacao-anterior");
    const btnProxima = document.getElementById("btn-determinacao-proxima");
    if (btnAnterior) btnAnterior.addEventListener("click", () => rolarParaDeterminacaoPreenchida(-1));
    if (btnProxima) btnProxima.addEventListener("click", () => rolarParaDeterminacaoPreenchida(1));
}
