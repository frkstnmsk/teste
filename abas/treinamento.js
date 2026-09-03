// abas/treinamento.js
// ---------------------------------------------------------------------
// Aba Treinamento (fila de treino/estudo de perícias e atributos + o
// checkbox "Usa Esteroide") e o popup de confirmação de avanço de
// treino que o Mestre vê a cada Timeskip.
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 12). Além das 2 funções listadas no plano (renderizarTreinamento,
// configurarPopupTreinamento), vieram junto:
// - salvarTreinamento: só é chamada de dentro de renderizarTreinamento.
// - o listener do checkbox "Usa Esteroide": código solto de nível
//   superior (roda 1x ao carregar o módulo, igual já rodava 1x ao
//   carregar o ficha.js), fisicamente dentro da mesma seção
//   "TREINAMENTO" do arquivo original.
// - TIPOS_TREINO: constante só usada por renderizarTreinamento; movida
//   pra cá em vez de exportada de ficha.js, já que não serve mais
//   ninguém de fora dessa aba.
// ---------------------------------------------------------------------

import { db } from "../firebase-config.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { estado } from "../estado.js";
import { el, toast, caminhoBase, escapeHtml } from "../ficha.js?v=20260830-npcnivelpv";
import { limiteTreinoAtributo } from "../regras.js";
import { atendeRequisitoPericia } from "../dados-manual.js";
import {
    labelAtributo, opcoesAtributoFisico, opcoesAtributoMental,
    opcoesPericiaFisica, opcoesPericiaMental, iniciarTreinoCaracteristica,
    cancelarTreinoCaracteristica, filaTreino, removerDaFilaTreino, estaDeRepouso,
} from "../treinamento.js";
import {
    ouvirPopupTreinamento, confirmarAvancoTreinamento, descartarPopupTreinamento,
} from "../mestre.js?v=20260830-npcnivelpv";

const TIPOS_TREINO = [
    { tipo: "periciaFisica", label: "Perícia física", opcoes: () => opcoesPericiaFisica().map(p => p.nome) },
    { tipo: "periciaMental", label: "Perícia mental", opcoes: () => opcoesPericiaMental().map(p => p.nome) },
    { tipo: "atributoFisico", label: "Atributo físico", opcoes: () => opcoesAtributoFisico().map(a => a.key) },
    { tipo: "atributoMental", label: "Atributo mental", opcoes: () => opcoesAtributoMental().map(a => a.key) }
];

// ---------------------------------------------------------------------
// TREINAMENTO
// ---------------------------------------------------------------------
export function renderizarTreinamento() {
    el.treinoGrid.innerHTML = "";
    const treino = estado.fichaAtual.treinamento;

    // Checkbox "Usa Esteroide" (ver limiteTreinoAtributo em regras.js) —
    // decisão narrativa que só o Mestre marca; jogador só visualiza.
    el.chkUsaEsteroides.checked = !!estado.fichaAtual.usaEsteroides;
    el.chkUsaEsteroides.disabled = !estado.isMestre;
    el.linhaEsteroides.classList.toggle("locked", !estado.isMestre);

    TIPOS_TREINO.forEach(({ tipo, label, opcoes }) => {
        const atual = treino[tipo];
        const fila = filaTreino(estado.fichaAtual, tipo);
        const ehAtributo = tipo.startsWith("atributo");
        // Limite de treino: 5 pra perícia, 7 pra atributo — exceto Força e
        // Constituição com Esteroide ativo, que sobem pra 8 (ver
        // limiteTreinoAtributo em regras.js). Por isso é calculado por
        // característica dentro do forEach abaixo, não um número único
        // fixo pro card inteiro.
        const limitePericia = 5;

        const card = document.createElement("div");
        card.className = "treino-card";

        const titulo = document.createElement("span");
        titulo.className = "treino-card-titulo";
        titulo.innerText = label;
        card.appendChild(titulo);

        if (atual) {
            const pct = atual.totalDias > 0 ? Math.min(100, Math.round((atual.progressoDias / atual.totalDias) * 100)) : 0;
            const nomeExibido = ehAtributo ? labelAtributo(atual.nome) : atual.nome;
            const blocoAtivo = document.createElement("div");
            blocoAtivo.innerHTML = `
                <span class="entity-nome">${escapeHtml(nomeExibido)} → nível ${atual.novoNivel}</span>
                <div class="treino-progresso-bar"><div class="treino-progresso-fill" style="width:${pct}%;"></div></div>
                <span class="treino-progresso-texto">${atual.progressoDias} / ${atual.totalDias} dias</span>
                <button type="button" class="btn-ghost btn-cancelar-treino">Cancelar treino</button>
            `;
            blocoAtivo.querySelector(".btn-cancelar-treino").addEventListener("click", async () => {
                cancelarTreinoCaracteristica(estado.fichaAtual, tipo);
                await salvarTreinamento();
            });
            card.appendChild(blocoAtivo);

            // Fila de espera desse tipo — o que vem a seguir depois que o
            // treino ativo acima terminar. É o que evita perder dias de
            // treino/estudo em Timeskips grandes: quando sobram dias, eles
            // cascateiam automaticamente pro próximo item daqui.
            if (fila.length) {
                const listaFila = document.createElement("ol");
                listaFila.className = "treino-fila-lista";
                fila.forEach((nome, indice) => {
                    const nomeExibidoFila = ehAtributo ? labelAtributo(nome) : nome;
                    const item = document.createElement("li");
                    item.className = "treino-fila-item";
                    const span = document.createElement("span");
                    span.innerText = nomeExibidoFila;
                    const btnRemover = document.createElement("button");
                    btnRemover.type = "button";
                    btnRemover.className = "btn-ghost btn-remover-fila-treino";
                    btnRemover.title = "Remover da fila";
                    btnRemover.innerText = "×";
                    btnRemover.addEventListener("click", async () => {
                        removerDaFilaTreino(estado.fichaAtual, tipo, indice);
                        await salvarTreinamento();
                    });
                    item.appendChild(span);
                    item.appendChild(btnRemover);
                    listaFila.appendChild(item);
                });
                card.appendChild(listaFila);
            }
        }

        // Formulário pra iniciar treino (quando não há nada ativo) OU
        // adicionar mais um item à fila de espera (quando já tem um
        // treino ativo desse tipo) — iniciarTreinoCaracteristica cuida
        // dos dois casos automaticamente.
        const bloqueadoPorRepouso = (tipo === "periciaFisica" || tipo === "atributoFisico") && estaDeRepouso(estado.fichaAtual);
        if (bloqueadoPorRepouso) {
            const aviso = document.createElement("span");
            aviso.className = "treino-progresso-texto";
            aviso.innerText = "De repouso — só treino/estudo mental progride. Volta a liberar quando a recuperação de PV terminar.";
            card.appendChild(aviso);
            el.treinoGrid.appendChild(card);
            return;
        }

        const select = document.createElement("select");
        select.innerHTML = `<option value="">-- escolha --</option>`;
        opcoes().forEach(nome => {
            const nivelAtual = ehAtributo
                ? (Number(estado.fichaAtual.dados[nome]) || 0)
                : ((Object.values(estado.fichaAtual.pericias).find(p => p.nome === nome) || {}).nivel || 0);
            // Cada vez que a característica já aparece ativa/na fila
            // representa mais 1 nível reservado — só esconde a opção
            // quando isso já bate no limite máximo.
            const reservados = (atual && atual.nome === nome ? 1 : 0) + fila.filter(n => n === nome).length;
            const limite = ehAtributo ? limiteTreinoAtributo(estado.fichaAtual, nome) : limitePericia;
            if (nivelAtual + reservados >= limite) return;
            const opt = document.createElement("option");
            opt.value = nome;
            const nomeExibido = ehAtributo ? labelAtributo(nome) : nome;
            opt.innerText = `${nomeExibido} (atual: ${nivelAtual})`;
            select.appendChild(opt);
        });
        const btn = document.createElement("button");
        btn.className = "btn-lime";
        btn.type = "button";
        btn.innerText = atual ? "Adicionar à fila" : "Iniciar treino";
        card.appendChild(select);
        card.appendChild(btn);
        btn.addEventListener("click", async () => {
            if (!select.value) { toast("Escolha uma opção antes.", "erro"); return; }
            if (tipo === "periciaFisica" || tipo === "periciaMental") {
                const jaTem = Object.values(estado.fichaAtual.pericias).find(p => p.nome === select.value);
                if (!jaTem) {
                    const requisito = atendeRequisitoPericia(select.value, estado.fichaAtual.dados, estado.fichaAtual.pericias);
                    if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
                }
            }
            const iniciou = iniciarTreinoCaracteristica(estado.fichaAtual, tipo, select.value);
            if (!iniciou) { toast("Não deu pra iniciar/enfileirar (limite máximo ou fila cheia).", "erro"); return; }
            await salvarTreinamento();
        });

        el.treinoGrid.appendChild(card);
    });
}

async function salvarTreinamento() {
    await update(ref(db, `${caminhoBase()}/treinamento`), estado.fichaAtual.treinamento);
}

// Flag "Usa Esteroide" (ver limiteTreinoAtributo em regras.js) — decisão
// narrativa manual, só o Mestre marca (checkbox trava sozinho pra
// jogador em renderizarTreinamento). Fica salva direto na raiz da
// ficha, igual outros poucos campos soltos que não têm objeto próprio.
//
// CORREÇÃO (bug do import circular): esse listener não pode mais rodar
// solto no corpo do módulo. `el` (importado de ficha.js) ainda está em
// TDZ nesse momento, porque ficha.js importa abas/treinamento.js ANTES
// de declarar `export const el = {...}` — acessar `el.chkUsaEsteroides`
// direto no carregamento do módulo estoura "Cannot access 'el' before
// initialization" e trava a página inteira. Por isso virou uma função
// exportada, chamada só depois que tudo já carregou (ver
// tentarOuAvisar("checkbox esteroide", configurarCheckboxEsteroides)
// em ficha.js), igual configurarPopupTreinamento já fazia.
export function configurarCheckboxEsteroides() {
    el.chkUsaEsteroides.addEventListener("change", async (e) => {
        if (!estado.isMestre) return;
        estado.fichaAtual.usaEsteroides = e.target.checked;
        await update(ref(db, caminhoBase()), { usaEsteroides: e.target.checked });
        toast(e.target.checked
            ? "Esteroide ativado — Força e Constituição podem ser treinadas até 9."
            : "Esteroide desativado — Força e Constituição voltam ao limite normal de treino (7).");
        renderizarTreinamento();
    });
}

// =====================================================================
// POPUP DE TREINAMENTO (Mestre)
// =====================================================================

export function configurarPopupTreinamento() {
    if (!estado.isMestre) return;
    let filaPopups = [];

    ouvirPopupTreinamento((popups) => {
        filaPopups = popups;
        if (popups.length && !el.modalPopupTreino.classList.contains("active")) {
            mostrarProximoPopupTreino();
        }
    });

    function mostrarProximoPopupTreino() {
        if (!filaPopups.length) { el.modalPopupTreino.classList.remove("active"); return; }
        const popup = filaPopups[0];
        const dias = Number(popup.dias) || 1;
        el.popupTreinoTexto.innerText = dias > 1
            ? `Pode subir o treinamento de ${popup.nomeFicha}? (avança ${dias} dias de treino/estudo de uma vez — Timeskip)`
            : `Pode subir o treinamento de ${popup.nomeFicha}?`;
        el.modalPopupTreino.dataset.popupId = popup.id;
        el.modalPopupTreino.dataset.fichaId = popup.fichaId;
        el.modalPopupTreino.dataset.dias = String(dias);
        el.modalPopupTreino.classList.add("active");
    }

    el.popupTreinoNao.addEventListener("click", async () => {
        const popupId = el.modalPopupTreino.dataset.popupId;
        await descartarPopupTreinamento(popupId);
        filaPopups = filaPopups.filter(p => p.id !== popupId);
        el.modalPopupTreino.classList.remove("active");
        setTimeout(mostrarProximoPopupTreino, 300);
    });

    el.popupTreinoSim.addEventListener("click", async () => {
        const popupId = el.modalPopupTreino.dataset.popupId;
        const fichaId = el.modalPopupTreino.dataset.fichaId;
        const dias = Number(el.modalPopupTreino.dataset.dias) || 1;
        const concluidos = await confirmarAvancoTreinamento(fichaId, popupId, dias);
        if (concluidos.length) {
            toast(`Treinamento concluído: ${concluidos.map(c => c.nome).join(", ")}.`);
        } else {
            toast(dias > 1 ? `Progresso de treino +${dias} dia(s).` : "Progresso de treino +1 dia.");
        }
        filaPopups = filaPopups.filter(p => p.id !== popupId);
        el.modalPopupTreino.classList.remove("active");
        setTimeout(mostrarProximoPopupTreino, 300);
    });
}
