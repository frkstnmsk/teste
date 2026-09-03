// ============================================================
// mestre/acoes-pendentes.js — Passo 26 do plano de modularização
// de ficha.js (ver plano-modularizacao-ficha-js.txt).
//
// Gaveta de Ações Pendentes: fila de solicitações dos jogadores
// que esperam aprovação/rejeição do Mestre (gastar item, sacar
// dinheiro, aplicar dano de área, etc.), a caixa de reação
// Esquiva/Bloqueio/Aparar contra um golpe recebido, e o painel
// "Ação do Mestre" (abrirAcaoMestre) que despacha pros diversos
// painéis do Mestre (XP, dado, dano, condição, efeito químico,
// NPCs, biblioteca, dashboard).
//
// abrirAcaoMestre ainda chama montarPainelXpMultiplo,
// montarPainelCondicaoMestre, montarPainelNpcs,
// montarPainelBibliotecaItens, montarPainelBibliotecaReceitas e
// montarDashboardFichas, cada um já movido pro seu próprio módulo
// (ver imports abaixo) pelos Passos 27, 28 e 29 do plano de
// modularização de ficha.js.
// ============================================================

import { estado, definirLimpezaPainelMestre } from "../estado.js";
import {
    el, escapeHtml, toast,
    despacharEfeitosQuimicos, htmlCheckboxesOcasionais, lerDeltaOcasionais,
    calcularModEsquivarParticipante, calcularModApararParticipante,
    participanteIdPorAlvo, buscarConstituicaoAlvo, combateComIniciativaAtivo,
    criarSelectFichas,
    ROTULOS_ACAO_MESTRE,
} from "../ficha.js?v=20260830-npcnivelpv";
import { montarPainelXpMultiplo, montarPainelCondicaoMestre } from "./painel-mestre.js";
import { montarPainelNpcs } from "./npcs.js";
import { montarPainelBibliotecaItens, montarPainelBibliotecaReceitas, montarDashboardFichas } from "./bibliotecas.js";
import {
    rolarD20, modificadoresOcasionaisDaPericia, golpeDilacera,
    deveTestarSangramentoProfundo, horasTotaisCalendario,
} from "../regras.js";
import {
    PERICIAS_ARMA_BRANCA, PERICIAS_APARAR, TIPOS_DANO, CALIBRES, todosOsSaldos,
} from "../dados-manual.js";
import { registrarRolagem } from "../calendario.js";
import {
    ouvirAcoesPendentes, rejeitarAcaoPendente, confirmarAcaoPendente,
    mestreRolarDado, aplicarDano, testarSangramentoProfundo,
    aplicarEfeitoQuimicoAlvo, responderReacaoPendente,
} from "../mestre.js?v=20260830-npcnivelpv";
import { montarGerenciadorCombate } from "../abas/combate.js";
import { renderizarDeterminacoes } from "../abas/determinacoes.js";

export function renderizarReacaoPendente(r) {
    const penalidadeFB = Number(r.penalidadeEsquivaForcaBruta) || 0;
    const notaForcaBrutaEsquiva = penalidadeFB ? ` (penalidade ${penalidadeFB} por ser um golpe de Força Bruta)` : "";
    const bloqueioImpossivel = !!(r.bloqueioForcaBruta && r.bloqueioForcaBruta.impossivel);
    const fracaoBloqueio = r.bloqueioForcaBruta && r.bloqueioForcaBruta.fracaoDanoRestante;
    const notaBloqueio = bloqueioImpossivel
        ? "Bloquear é IMPOSSÍVEL contra esse golpe (Força Bruta nível 5)."
        : fracaoBloqueio
            ? `Bloquear só reduz 1/4 do dano desse golpe (Força Bruta nível 4), não a metade normal.`
            : "Bloquear reduz o dano pela metade (não reduz dano perfurante).";
    const avisoBase = r.ehArmaFogo
        ? `${escapeHtml(r.nomeAlvo)} tem Esquiva/Bloqueio guardada, mas não dá pra esquivar/aparar de arma de fogo — só Bloquear ou levar o golpe cheio. ${notaBloqueio}`
        : `${escapeHtml(r.nomeAlvo)} tem a ação de Esquiva/Bloqueio guardada. Esquivar rola Agilidade (+ bônus de Boxe, se tiver)${notaForcaBrutaEsquiva} contra o resultado do ataque — só anula o golpe se bater; Aparar (com teste de perícia contra o resultado do ataque) anula o golpe E permite contra-atacar na hora com -1; ${notaBloqueio} Escolha uma opção, ou deixe passar o golpe cheio sem gastar a ação.`;
    el.reacaoDefesaCorpo.innerHTML = `
        <p class="hint">${escapeHtml(r.nomeAtacante)} acertou ${escapeHtml(r.nomeAlvo)} com ${escapeHtml(r.nomeArma)} (${r.resultadoAtaque} vs. dificuldade ${r.dificuldade}). Dano previsto${escapeHtml(r.danoDadoTexto || "")}: ${r.danoTotal} (${escapeHtml(r.tipoDanoLabel)}).</p>
        <p class="hint">${avisoBase}</p>
        <div id="reacao-aparar-painel" style="display:none;"></div>
    `;
    el.reacaoDefesaBotoes.innerHTML = "";
    const painelAparar = el.reacaoDefesaCorpo.querySelector("#reacao-aparar-painel");

    const responder = async (escolha, dadosExtra) => {
        el.reacaoDefesaBotoes.querySelectorAll("button").forEach(b => b.disabled = true);
        const resultado = await responderReacaoPendente(escolha, dadosExtra || null);
        if (resultado) toast(resultado.detalhe);
        // Carga química (dardo/lâmina envenenada — Parte 6.2 do plano de
        // automação dos materiais químicos): `r` ainda é o snapshot de
        // ANTES de responder (estado.combateAtivoCache.reacaoPendente), então
        // ainda tem quimicoEfeitos/quimicoNomeItem/alvoTipo/alvoRefId —
        // responderReacaoPendente já removeu a reação pendente do banco
        // a essa altura, mas o objeto local `r` continua íntegro.
        // resultado.golpeAnulado (mestre.js) diz se Esquivar/Aparar
        // anularam o golpe — só nesse caso a substância NÃO chega a
        // encostar no alvo; Bloquear reduz o dano mas não impede o
        // contato, então a carga química dispara do mesmo jeito.
        if (resultado && !resultado.golpeAnulado && r.quimicoEfeitos && r.quimicoEfeitos.length) {
            const resultadoQuimicoReacao = await despacharEfeitosQuimicos(r.alvoTipo, r.alvoRefId, r.quimicoEfeitos, r.quimicoNomeItem || r.nomeArma);
            let notaQuimicoReacao = ` ☣️ Carga química de ${r.quimicoNomeItem || r.nomeArma}: ${resultadoQuimicoReacao.notas.join(" | ")}`;
            if (resultadoQuimicoReacao.modificadoresExtras.length) {
                notaQuimicoReacao += " (penalidade de duração geral prevista — sem lista de efeitos ativos pra registrar automaticamente num alvo que não é quem atacou; aplique manualmente.)";
            }
            toast(notaQuimicoReacao);
        }
        el.modalReacaoDefesa.classList.remove("active");
    };

    // Não dá pra esquivar/aparar de tiro (só de golpes corpo a corpo/
    // arma branca) — os botões "Esquivar"/"Aparar" só aparecem pra
    // golpes que não vieram de arma de fogo.
    if (!r.ehArmaFogo) {
        const btnEsquivar = document.createElement("button");
        btnEsquivar.className = "btn-lime"; btnEsquivar.type = "button"; btnEsquivar.innerText = "Esquivar";
        btnEsquivar.addEventListener("click", async () => {
            btnEsquivar.disabled = true;
            const modDadoBase = await calcularModEsquivarParticipante(r.alvoTipo, r.alvoRefId, r.ataqueArmaBranca);
            // Força Bruta nível 4/5 do atacante (manual pg. 22):
            // penalidade -1/-2 pra quem tenta esquivar desse golpe.
            const modDado = modDadoBase + (Number(r.penalidadeEsquivaForcaBruta) || 0);
            const brutoDado = rolarD20();
            const resultadoDado = brutoDado + modDado;
            await responder("esquivar", { brutoDado, modDado, resultadoDado });
        });
        el.reacaoDefesaBotoes.appendChild(btnEsquivar);

        // Manual: "não é possível aparar ataques de armas brancas
        // estando desarmado" — se o golpe recebido veio de uma perícia
        // de arma branca, só oferece perícias de arma branca pra aparar
        // (o alvo precisa estar armado com algo do mesmo tipo pra
        // aparar); golpe desarmado/CQC libera qualquer uma das 9.
        const opcoesPericiaAparar = r.ataqueArmaBranca ? PERICIAS_ARMA_BRANCA : PERICIAS_APARAR;
        const btnAparar = document.createElement("button");
        btnAparar.className = "btn-lime"; btnAparar.type = "button"; btnAparar.innerText = "Aparar";
        btnAparar.addEventListener("click", () => {
            painelAparar.style.display = "block";
            painelAparar.innerHTML = `
                <div class="modal-field">
                    <label>Aparar com qual perícia? (dificuldade = ${r.resultadoAtaque}, o resultado do ataque)</label>
                    <select id="reacao-aparar-select">
                        ${opcoesPericiaAparar.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("")}
                    </select>
                </div>
                <div id="reacao-aparar-ocasionais"></div>
                <button id="reacao-aparar-confirmar" class="btn-lime" type="button">Rolar Aparar</button>
            `;
            const selectPericiaAparar = painelAparar.querySelector("#reacao-aparar-select");
            const ocasionaisApararDiv = painelAparar.querySelector("#reacao-aparar-ocasionais");
            // Ocasião Especial (ver htmlCheckboxesOcasionais acima): a
            // perícia escolhida pra aparar pode mudar no select, então a
            // lista de checkboxes é recalculada a cada troca — mesma
            // convenção do resto do arquivo (estado.fichaAtual é sempre quem
            // está reagindo nesta tela).
            let ocasionaisAparar = [];
            const atualizarOcasionaisAparar = () => {
                ocasionaisAparar = modificadoresOcasionaisDaPericia(estado.fichaAtual, selectPericiaAparar.value);
                ocasionaisApararDiv.innerHTML = htmlCheckboxesOcasionais(ocasionaisAparar, selectPericiaAparar.value);
            };
            selectPericiaAparar.addEventListener("change", atualizarOcasionaisAparar);
            atualizarOcasionaisAparar();
            painelAparar.querySelector("#reacao-aparar-confirmar").addEventListener("click", async () => {
                const periciaEscolhida = selectPericiaAparar.value;
                painelAparar.querySelector("#reacao-aparar-confirmar").disabled = true;
                const modBase = await calcularModApararParticipante(r.alvoTipo, r.alvoRefId, periciaEscolhida);
                const deltaOcasional = lerDeltaOcasionais(ocasionaisApararDiv, ocasionaisAparar);
                const modDado = modBase + deltaOcasional;
                const brutoDado = rolarD20();
                const resultadoDado = brutoDado + modDado;
                await responder("aparar", { periciaEscolhida, brutoDado, modDado, resultadoDado });
            });
        });
        el.reacaoDefesaBotoes.appendChild(btnAparar);
    }
    const btnBloquear = document.createElement("button");
    btnBloquear.className = "btn-blue"; btnBloquear.type = "button"; btnBloquear.innerText = "Bloquear";
    btnBloquear.addEventListener("click", () => responder("bloquear"));
    const btnNenhuma = document.createElement("button");
    btnNenhuma.className = "btn-ghost"; btnNenhuma.type = "button"; btnNenhuma.innerText = "Levar o golpe cheio";
    btnNenhuma.addEventListener("click", () => responder("nenhuma"));
    el.reacaoDefesaBotoes.appendChild(btnBloquear);
    el.reacaoDefesaBotoes.appendChild(btnNenhuma);
    el.modalReacaoDefesa.classList.add("active");
}

export function configurarAcoesPendentes() {
    ouvirAcoesPendentes((lista) => {
        // Alerta em tempo real: se o número de pendências aumentou desde a
        // última vez (chegou pedido novo), avisa o Mestre com um toast —
        // mesmo que o painel de Ações Pendentes não esteja aberto.
        if (estado.isMestre && lista.length > estado.contadorPendentesAnterior) {
            const novos = lista.slice(estado.contadorPendentesAnterior);
            novos.forEach(p => toast(p.detalhe || `${p.nomeJogador} tem uma solicitação pendente.`, "erro"));
        }
        estado.contadorPendentesAnterior = lista.length;
        estado.pendentesCache = lista;

        if (estado.isMestre) {
            el.badgePendentesLateral.style.display = lista.length ? "flex" : "none";
            el.badgePendentesLateral.innerText = String(lista.length);
        }

        // Ações Pendentes têm lugar próprio agora: ícone fixo na lateral
        // esquerda que abre uma gaveta flutuante (ver configurarDrawerPendentes
        // abaixo), em vez de uma aba dentro do Painel do Mestre. Só
        // re-renderiza o conteúdo se a gaveta já estiver aberta.
        if (estado.isMestre && el.drawerPendentes && el.drawerPendentes.classList.contains("aberto")) {
            montarPainelAcoesPendentes(el.drawerPendentesCorpo);
        }
        // O Gerenciador de Combate tem a caixa lateral de Ações Pendentes
        // embutida — precisa re-renderizar também quando a lista de
        // pendentes mudar, não só quando o estado do combate mudar.
        if (estado.isMestre && el.modalCombateMestre && el.modalCombateMestre.classList.contains("active")) {
            el.combateMestreCorpo.innerHTML = "";
            montarGerenciadorCombate(el.combateMestreCorpo);
        }

        // Mantém a aba de Determinações em dia: some com "Solicitar
        // validação" assim que o pedido entra na fila (e, se o Mestre
        // acabou de confirmar/rejeitar em outra tela, reflete o status
        // novo aqui sem precisar trocar de aba).
        if (estado.fichaAtual && document.getElementById("determinacoes-lista")) {
            renderizarDeterminacoes();
        }
    });
}

export function montarPainelAcoesPendentes(corpo) {
    // BUG corrigido: essa função é chamada de novo toda vez que a fila
    // muda (ver configurarAcoesPendentes/onValue mais acima) — inclusive
    // logo depois de Confirmar/Rejeitar uma ação, quando ainda sobra
    // outra pendência. Sem limpar o corpo antes, os cards das ações que
    // continuam na fila eram desenhados de novo por CIMA dos antigos
    // (appendChild não substitui nada), duplicando-os no fim da lista a
    // cada atualização.
    corpo.innerHTML = "";
    if (!estado.pendentesCache.length) {
        corpo.innerHTML = `<p class="hint">Nenhuma ação pendente no momento.</p>`;
        return;
    }
    estado.pendentesCache.forEach(acao => {
        const card = document.createElement("div");
        card.className = "pendente-card";
        card.innerHTML = `<span>${escapeHtml(acao.detalhe || `${acao.nomeJogador}: ${acao.tipo}`)}</span>`;

        // "explosao_raio" (ver detonarExplosivoCenario, mestre.js, e
        // plano-explosivos-cenario.txt Fase 4) não é um pedido pra
        // Confirmar/Rejeitar como os outros — é uma pergunta binária
        // "esse participante estava no raio?". "Sim" já abre o painel
        // "Causar Dano" pré-preenchido (alvo/tipo/valor), pro Mestre só
        // conferir e clicar "Causar dano"; "Não" só descarta a pendência.
        // Em ambos os casos usa rejeitarAcaoPendente (só tira da fila —
        // não é "confirmação" de nada automático, o dano é aplicado à
        // parte pelo painel de dano).
        if (acao.tipo === "explosao_raio") {
            const botoesExp = document.createElement("div");
            botoesExp.className = "pendente-botoes";
            const btnSim = document.createElement("button");
            btnSim.className = "btn-red"; btnSim.type = "button"; btnSim.innerText = "💥 Sim, no raio";
            btnSim.addEventListener("click", async () => {
                await rejeitarAcaoPendente(acao.id);
                abrirAcaoMestre("dano", {
                    alvoTipo: acao.payload.participanteTipo,
                    alvoId: acao.payload.participanteRefId,
                    tipoDano: acao.payload.tipoDano,
                    valor: acao.payload.dano
                });
            });
            const btnNao = document.createElement("button");
            btnNao.className = "btn-ghost"; btnNao.type = "button"; btnNao.innerText = "Não, fora do raio";
            btnNao.addEventListener("click", async () => {
                await rejeitarAcaoPendente(acao.id);
                toast(`${acao.payload.participanteNome} fora do raio.`);
            });
            botoesExp.append(btnSim, btnNao);
            card.appendChild(botoesExp);
            corpo.appendChild(card);
            return; // pula o bloco genérico de Confirmar/Rejeitar abaixo
        }

        // "quimico_area" (ver liberarQuimicoCenario, mestre.js, e
        // plano-quimicos-cenario.txt Parte 5) — mesmo padrão de
        // "explosao_raio": pergunta binária "esse participante estava na
        // área?". "Sim" NÃO aplica nada sozinho — abre o painel "Aplicar
        // Efeito Químico" (abrirAcaoMestre("efeito-quimico", ...)) pro
        // Mestre revisar/ajustar antes de confirmar (ex.: alvo resistiu
        // parcialmente, reduzir a duração, remover algum modificador).
        // "Não" só descarta a pendência.
        if (acao.tipo === "quimico_area") {
            const botoesQuim = document.createElement("div");
            botoesQuim.className = "pendente-botoes";
            const btnSim = document.createElement("button");
            btnSim.className = "btn-red"; btnSim.type = "button"; btnSim.innerText = "💨 Sim, na área";
            btnSim.addEventListener("click", async () => {
                await rejeitarAcaoPendente(acao.id);
                abrirAcaoMestre("efeito-quimico", {
                    alvoTipo: acao.payload.participanteTipo,
                    alvoId: acao.payload.participanteRefId,
                    nomeQuimico: acao.payload.nomeQuimico,
                    tipoEfeito: acao.payload.tipoEfeito,
                    modificadores: acao.payload.modificadores,
                    // Efeitos mecânicos do item (it.quimico.efeitos), pra
                    // pré-preencher o despachante do painel "Aplicar Efeito
                    // Químico" — Parte 8, item 5.2/5.3 do plano-automacao-
                    // materiais-quimicos-v3.
                    efeitos: acao.payload.efeitos || [],
                    duracaoHoras: acao.payload.duracaoHoras
                });
            });
            const btnNao = document.createElement("button");
            btnNao.className = "btn-ghost"; btnNao.type = "button"; btnNao.innerText = "Não, fora da área";
            btnNao.addEventListener("click", async () => {
                await rejeitarAcaoPendente(acao.id);
                toast(`${acao.payload.participanteNome} fora da área.`);
            });
            botoesQuim.append(btnSim, btnNao);
            card.appendChild(botoesQuim);
            corpo.appendChild(card);
            return; // pula o bloco genérico de Confirmar/Rejeitar abaixo
        }

        // "pegar_dinheiro_cenario" e "depositar_dinheiro_item" (ver
        // plano-cenario.txt e transformar_dinheiro_item, mestre.js) não
        // depositam mais automaticamente em "Dinheiro limpo": o Mestre
        // escolhe em qual saldo da ficha de destino o valor cai, na
        // hora de confirmar. Sem escolher, o botão Confirmar fica
        // desabilitado.
        let selectSaldoDestino = null;
        if (acao.tipo === "pegar_dinheiro_cenario" || acao.tipo === "depositar_dinheiro_item") {
            const idFichaDestino = acao.tipo === "pegar_dinheiro_cenario"
                ? (acao.payload && acao.payload.fichaDestinoId)
                : acao.fichaId;
            const fichaDestino = estado.todasAsFichasCache[idFichaDestino];
            const saldosDestino = fichaDestino ? todosOsSaldos(fichaDestino) : [];
            selectSaldoDestino = document.createElement("select");
            selectSaldoDestino.innerHTML = '<option value="">-- em qual saldo? --</option>' +
                saldosDestino.map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)} (${s.valor})</option>`).join("");
            selectSaldoDestino.style.marginTop = "6px";
            selectSaldoDestino.style.width = "100%";
            card.appendChild(selectSaldoDestino);
        }

        const botoes = document.createElement("div");
        botoes.className = "pendente-botoes";
        const btnConfirmar = document.createElement("button");
        btnConfirmar.className = "btn-lime"; btnConfirmar.type = "button"; btnConfirmar.innerText = "Confirmar";
        if (selectSaldoDestino) {
            btnConfirmar.disabled = true;
            selectSaldoDestino.addEventListener("change", () => { btnConfirmar.disabled = !selectSaldoDestino.value; });
        }
        btnConfirmar.addEventListener("click", async () => {
            if (selectSaldoDestino && !selectSaldoDestino.value) { toast("Escolha em qual saldo o dinheiro vai cair.", "erro"); return; }
            try {
                await confirmarAcaoPendente(acao, selectSaldoDestino ? { saldoDestinoId: selectSaldoDestino.value } : {});
                toast("Ação confirmada e aplicada.");
            } catch (err) {
                console.error(err);
                // guardar_item revalida no confirmarAcaoPendente (Fase 6) e,
                // se não couber mais, já cancela (remove) o pedido e lança
                // um erro com o motivo — mostra ele direto pro Mestre em vez
                // da mensagem genérica, e a lista se atualiza sozinha (o
                // pedido já saiu de acoesPendentes).
                toast(err && err.message ? err.message : "Falha ao confirmar a ação.", "erro");
            }
        });
        const btnRejeitar = document.createElement("button");
        btnRejeitar.className = "btn-red"; btnRejeitar.type = "button"; btnRejeitar.innerText = "Rejeitar";
        btnRejeitar.addEventListener("click", async () => {
            await rejeitarAcaoPendente(acao.id);
            toast("Solicitação rejeitada.");
        });
        botoes.append(btnConfirmar, btnRejeitar);
        card.appendChild(botoes);
        corpo.appendChild(card);
    });
}

export function abrirAcaoMestre(acao, prefill = null) {
    definirLimpezaPainelMestre(null);
    const corpo = el.mestreCorpo;
    corpo.innerHTML = "";
    corpo.dataset.acaoAberta = acao;

    // Cabeçalho com "×" pra minimizar (ver fecharAcaoMestre) — só some
    // com o conteúdo aberto, não desmarca nada em Firebase, então dá
    // pra reabrir clicando no mesmo botão de novo.
    if (el.mestreCorpoTopo) {
        el.mestreCorpoTitulo.innerText = ROTULOS_ACAO_MESTRE[acao] || "";
        el.mestreCorpoTopo.style.display = "flex";
    }

    if (acao === "xp") {
        montarPainelXpMultiplo(corpo);

    } else if (acao === "dado") {
        const inputFaces = document.createElement("input");
        inputFaces.type = "number"; inputFaces.value = 20; inputFaces.placeholder = "Faces (ex: 20)";
        const inputMod = document.createElement("input");
        inputMod.type = "number"; inputMod.value = 0; inputMod.placeholder = "Modificador";
        const btn = document.createElement("button");
        btn.className = "btn-blue"; btn.type = "button"; btn.innerText = "Rolar";
        btn.addEventListener("click", async () => {
            const r = await mestreRolarDado({ faces: Number(inputFaces.value) || 20, modificador: Number(inputMod.value) || 0, quem: "Mestre" });
            toast(`Resultado: ${r.resultado} (bruto ${r.bruto}).`);
        });
        corpo.append(inputFaces, inputMod, btn);

    } else if (acao === "dano") {
        const select = criarSelectFichas(true, prefill ? `${prefill.alvoTipo}::${prefill.alvoId}` : null);
        const selectTipo = document.createElement("select");
        const optPlaceholder = document.createElement("option");
        optPlaceholder.value = ""; optPlaceholder.innerText = "Tipo de dano...";
        optPlaceholder.disabled = true; optPlaceholder.selected = true;
        selectTipo.appendChild(optPlaceholder);
        TIPOS_DANO.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t.key; opt.innerText = t.label;
            selectTipo.appendChild(opt);
        });
        const input = document.createElement("input");
        input.type = "number"; input.placeholder = "Valor de dano"; input.value = 10;
        // Redução do Dano por Colete x Calibre (manual pg. 53) — só faz
        // sentido pra Perfuração Especial (tiro de arma de fogo); campo
        // opcional, some pros outros tipos de dano. Sem calibre
        // escolhido, aplicarDano cai no comportamento de sempre (soma
        // reducoesDano cheio, sem multiplicador nem piso contundente).
        const campoCalibre = document.createElement("div");
        campoCalibre.style.display = "none";
        campoCalibre.className = "modal-field";
        const labelCalibre = document.createElement("label");
        labelCalibre.innerText = "Calibre do tiro (opcional — aplica a redução por classe de proteção)";
        const selectCalibre = document.createElement("select");
        const optCalibrePlaceholder = document.createElement("option");
        optCalibrePlaceholder.value = ""; optCalibrePlaceholder.innerText = "Sem calibre específico";
        selectCalibre.appendChild(optCalibrePlaceholder);
        CALIBRES.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.key; opt.innerText = c.label;
            selectCalibre.appendChild(opt);
        });
        labelCalibre.appendChild(selectCalibre);
        campoCalibre.appendChild(labelCalibre);
        selectTipo.addEventListener("change", () => {
            campoCalibre.style.display = selectTipo.value === "perfuracao_especial" ? "block" : "none";
            if (selectTipo.value !== "perfuracao_especial") selectCalibre.value = "";
        });
        const btn = document.createElement("button");
        btn.className = "btn-red"; btn.type = "button"; btn.innerText = "Causar dano";
        btn.addEventListener("click", async () => {
            if (!select.value) { toast("Escolha um alvo.", "erro"); return; }
            if (!selectTipo.value) { toast("Escolha o tipo de dano.", "erro"); return; }
            const [tipo, id] = select.value.split("::");
            const resultado = await aplicarDano(tipo, id, Number(input.value) || 0, selectTipo.value, null, 0, selectCalibre.value || null);
            const tipoLabel = TIPOS_DANO.find(t => t.key === selectTipo.value)?.label || selectTipo.value;
            // Redução do Dano por Colete x Calibre (manual pg. 53):
            // aplicarDano já resolveu o multiplicador e o piso contundente
            // (quando calibre foi informado) — aqui só avisa no Log
            // quando o tipo de dano final saiu diferente do escolhido.
            const notaColete = (resultado.tipoDanoFinalAjustado && resultado.tipoDanoFinalAjustado !== selectTipo.value)
                ? ` 🦺 O colete freou o tiro, mas o impacto ainda causou dano CONTUNDENTE, ignorando o resto da redução.`
                : "";
            // Dilaceração por Explosão (item 7 do plano de saúde/
            // complicações) — só a fonte (a), automática por tipo de
            // dano (sem checkbox nenhum): dano de Explosão ≥ metade do
            // PV total do alvo. As fontes (b)/(c) (arma com checkbox
            // "Dilacera" + crítico) já são cobertas no fluxo de ataque
            // normal (resolverAtaque/resolverReacaoPendente), que tem a
            // arma e o resultado do crítico — esta ferramenta genérica
            // não tem nem um nem outro.
            let notaDilaceracao = "";
            if (selectTipo.value === "explosao") {
                const dilacerou = golpeDilacera({ ehExplosao: true, danoFinal: resultado.danoFinal, pvMaximo: resultado.pvMaximo });
                if (dilacerou) {
                    notaDilaceracao = " 🩸 DILACEROU!";
                    const pid = participanteIdPorAlvo(tipo, id);
                    if (pid && combateComIniciativaAtivo() && deveTestarSangramentoProfundo(dilacerou, resultado.danoFinal, resultado.pvMaximo)) {
                        const constituicaoAlvo = await buscarConstituicaoAlvo(tipo, id);
                        const resultadoSangramentoProfundo = await testarSangramentoProfundo(pid, constituicaoAlvo, resultado.danoFinal);
                        if (resultadoSangramentoProfundo) notaDilaceracao += ` ${resultadoSangramentoProfundo.detalhe}`;
                    }
                }
            }
            const detalhe = (resultado.reducao > 0
                ? `Mestre causou ${resultado.danoBruto} (${tipoLabel}) em ${resultado.nomeAlvo}. Redução: ${resultado.reducao}. Dano aplicado: ${resultado.danoFinal} (PV: ${resultado.novoPv}).`
                : `Mestre causou ${resultado.danoFinal} (${tipoLabel}) em ${resultado.nomeAlvo} (PV: ${resultado.novoPv}).`) + notaColete + notaDilaceracao;
            await registrarRolagem({ quem: "Mestre", modificador: 0, resultado: resultado.danoFinal, detalhe });
            toast(detalhe);
        });
        corpo.append(select, selectTipo, campoCalibre, input, btn);

        // Pré-preenchimento vindo da pendência "está no raio?" (Fase 4,
        // atalho pro painel de dano — ver plano-explosivos-cenario.txt):
        // alvo já é tratado acima, aqui só falta tipo de dano e valor.
        // Dispara o "change" manualmente pra campoCalibre reagir igual
        // reagiria a uma escolha manual do Mestre.
        if (prefill) {
            selectTipo.value = prefill.tipoDano;
            selectTipo.dispatchEvent(new Event("change"));
            input.value = prefill.valor;
        }

    } else if (acao === "condicao") {
        montarPainelCondicaoMestre(corpo);

    } else if (acao === "efeito-quimico") {
        // Aplicar Efeito Químico (ver plano-quimicos-cenario.txt, Parte 5):
        // aberto pela pendência "quimico_area" já com o alvo, o nome/tipo
        // do químico e os modificadores/duração do item pré-preenchidos —
        // o Mestre só revisa (pode remover algum modificador, ex.: alvo
        // resistiu parcialmente) e confirma. Grava em efeitosDrogas do
        // alvo via aplicarEfeitoQuimicoAlvo (mestre.js) — mesmo shape que
        // consumirDroga já usa pra autoconsumo.
        const select = criarSelectFichas(true, prefill ? `${prefill.alvoTipo}::${prefill.alvoId}` : null);

        const info = document.createElement("p");
        info.className = "hint";
        info.innerHTML = `Químico: <strong>${escapeHtml(prefill?.nomeQuimico || "(sem nome)")}</strong>` +
            (prefill?.tipoEfeito ? ` — ${escapeHtml(prefill.tipoEfeito)}` : "");

        const listaMods = document.createElement("div");
        let modificadoresAtuais = [...(prefill?.modificadores || [])];
        function renderModsQuimico() {
            listaMods.innerHTML = "";
            if (!modificadoresAtuais.length) {
                listaMods.innerHTML = `<p class="hint">Nenhum modificador cadastrado neste item.</p>`;
                return;
            }
            modificadoresAtuais.forEach((m, idx) => {
                const linha = document.createElement("div");
                linha.className = "pendente-botoes";
                linha.style.justifyContent = "space-between";
                linha.style.alignItems = "center";
                const span = document.createElement("span");
                span.innerText = `${m.alvo}: ${m.valor > 0 ? "+" : ""}${m.valor}`;
                const btnRemover = document.createElement("button");
                btnRemover.type = "button"; btnRemover.className = "btn-ghost"; btnRemover.innerText = "Remover";
                btnRemover.addEventListener("click", () => {
                    modificadoresAtuais.splice(idx, 1);
                    renderModsQuimico();
                });
                linha.append(span, btnRemover);
                listaMods.appendChild(linha);
            });
        }
        renderModsQuimico();

        // Efeitos mecânicos do item (it.quimico.efeitos, ver despachante
        // acima de consumirDroga) — guardados junto com modificadoresAtuais
        // pra disparar ao confirmar. SEM edição fina aqui (diferente dos
        // modificadores livres): só um resumo pro Mestre saber o que vai
        // acontecer — Parte 8, item 5.2/5.4 do plano-automacao-materiais-
        // quimicos-v3.
        const efeitosAtuais = Array.isArray(prefill?.efeitos) ? prefill.efeitos : [];
        const resumoEfeitos = document.createElement("div");
        if (efeitosAtuais.length) {
            resumoEfeitos.className = "hint";
            resumoEfeitos.innerHTML = `<strong>Efeitos que serão disparados ao confirmar:</strong><br>` +
                efeitosAtuais.map(e => `• ${escapeHtml(e.material || "?")}: ${escapeHtml(e.texto || "")}`).join("<br>");
        }

        const campoDuracao = document.createElement("div");
        campoDuracao.className = "modal-field";
        const labelDuracao = document.createElement("label");
        labelDuracao.innerText = "Duração em horas (vazio = até o fim do dia em jogo)";
        const inputDuracao = document.createElement("input");
        inputDuracao.type = "number";
        inputDuracao.value = (prefill && prefill.duracaoHoras !== null && prefill.duracaoHoras !== undefined) ? prefill.duracaoHoras : "";
        labelDuracao.appendChild(inputDuracao);
        campoDuracao.appendChild(labelDuracao);

        const btn = document.createElement("button");
        btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Aplicar efeito";
        btn.addEventListener("click", async () => {
            if (!select.value) { toast("Escolha um alvo.", "erro"); return; }
            if (estado.calendarioAtual === null || estado.calendarioAtual === undefined) {
                toast("Calendário da mesa ainda não carregou — espera um instante e tenta de novo.", "erro");
                return;
            }
            const [tipo, id] = select.value.split("::");
            const diaAtual = estado.calendarioAtual.diaIndice;
            const horasAgora = horasTotaisCalendario(diaAtual, estado.calendarioAtual.hora);
            const duracaoHoras = inputDuracao.value.trim() !== "" ? (Number(inputDuracao.value) || 0) : null;
            const horasExpira = (duracaoHoras !== null && horasAgora !== null)
                ? horasAgora + duracaoHoras
                : ((diaAtual + 1) * 24); // fallback: até acabar o dia em jogo (mesmo comportamento de consumirDroga)

            // Despacha it.quimico.efeitos ANTES de gravar em efeitosDrogas
            // — penalidades de duração geral entram na MESMA lista de
            // modificadores que aplicarEfeitoQuimicoAlvo grava logo abaixo,
            // igual consumirDroga já faz no autoconsumo.
            let notasQuimico = [];
            let modificadoresParaGravar = modificadoresAtuais;
            if (efeitosAtuais.length) {
                const resultadoQuimico = await despacharEfeitosQuimicos(tipo, id, efeitosAtuais, prefill?.nomeQuimico || "Químico");
                if (resultadoQuimico.modificadoresExtras.length) {
                    modificadoresParaGravar = [...modificadoresAtuais, ...resultadoQuimico.modificadoresExtras];
                }
                notasQuimico = resultadoQuimico.notas;
            }

            await aplicarEfeitoQuimicoAlvo(tipo, id, {
                nome: prefill?.nomeQuimico || "Químico",
                diaIndiceConsumido: diaAtual,
                horasExpira,
                modificadores: modificadoresParaGravar
            });
            toast(`💨 Efeito de "${prefill?.nomeQuimico || "químico"}" aplicado.`);
            notasQuimico.forEach(nota => toast(nota, "erro"));
        });

        corpo.append(select, info, listaMods, ...(efeitosAtuais.length ? [resumoEfeitos] : []), campoDuracao, btn);

    } else if (acao === "npcs") {
        montarPainelNpcs(corpo);

    } else if (acao === "biblioteca") {
        montarPainelBibliotecaItens(corpo);

    } else if (acao === "biblioteca-receitas") {
        montarPainelBibliotecaReceitas(corpo);

    } else if (acao === "dashboard") {
        montarDashboardFichas(corpo);
    }
}
