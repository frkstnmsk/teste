// ============================================================
// mestre/painel-mestre.js — Passo 27 do plano de modularização
// de ficha.js (ver plano-modularizacao-ficha-js.txt).
//
// Painel do Mestre: o setup dos botões/abas da gaveta
// (configurarPainelMestre) e do botão "×" que minimiza o conteúdo
// aberto (fecharAcaoMestre — usado só aqui, por isso não ficou em
// ficha.js), o painel "Dar XP" com seleção múltipla
// (montarPainelXpMultiplo), o painel "Causar Condição"
// (montarPainelCondicaoMestre, com os helpers privados
// criarSelectPersonagemPorTipo/obterOuCriarParticipanteMestre/
// CONDICOES_MESTRE, usados só por ele) e o Godmode
// (configurarGodmode).
//
// configurarFatorPrecoDarknet já tinha sido movido pra
// abas/darknet.js num passo anterior — nada a fazer aqui.
// ============================================================

import { estado, definirLimpezaPainelMestre } from "../estado.js";
import {
    el, escapeHtml, toast, renderizarTudo,
    nomeDeFicha, participanteIdPorAlvo,
} from "../ficha.js";
import { LOCAIS_MIRA } from "../dados-manual.js";
import { registrarRolagem } from "../calendario.js";
import {
    darXp, ouvirGodmode, definirGodmode,
    ouvirIgnorarPenalidadeSaude, definirIgnorarPenalidadeSaude,
    adicionarParticipanteCombate, ouvirNpcs,
    definirDerrubado, levantarDerrubado,
    definirImobilizado, soltarImobilizado,
    definirDesacordado, soltarDesacordado,
    definirAgarrado, soltarAgarrado,
    definirOssosQuebrados, curarOssosQuebrados,
    aplicarSangramento, aplicarInfeccao, curarInfeccao,
    registrarFeridasDeSangramento,
} from "../mestre.js?v=20260830-npcnivelpv";
import { montarGerenciadorCombate } from "../abas/combate.js";
import { montarGerenciadorCenario } from "../abas/cenario.js";
import { abrirAcaoMestre } from "./acoes-pendentes.js";

export function configurarPainelMestre() {
    // O Painel do Mestre não é mais um painel à parte que se abre por
    // botão: ele mora embutido direto na gaveta de Ações Pendentes (ver
    // drawer-pendentes-secao-mestre em ficha.html) e já aparece pronto
    // assim que a gaveta abre, sem precisar de clique extra. Só zera o
    // corpo aqui no setup inicial (nenhuma ação aberta por padrão).
    el.mestreCorpo.innerHTML = "";

    document.querySelectorAll(".mestre-acao").forEach(btn => {
        btn.addEventListener("click", () => abrirAcaoMestre(btn.dataset.acao));
    });

    // "×" do cabeçalho de #mestre-corpo (ver abrirAcaoMestre) — minimiza
    // o conteúdo aberto (ex.: Biblioteca de Itens, que pode ficar bem
    // grande) sem fechar a gaveta inteira, pra Ações Pendentes voltar a
    // aparecer logo depois da grade de botões em vez de precisar rolar
    // até o fim.
    if (el.mestreCorpoFechar) {
        el.mestreCorpoFechar.addEventListener("click", () => fecharAcaoMestre());
    }

    // Gerenciador de Combate — painel encostado na direita, pra dar pra
    // ver a ficha e o combate ao mesmo tempo (não é mais um modal de tela
    // cheia). Fecha só pelo botão "Fechar" — clicar na ficha atrás não
    // fecha, já que o objetivo é justamente poder usar as duas coisas
    // juntas.
    el.btnAbrirCombate.addEventListener("click", () => {
        el.modalCombateMestre.classList.add("active");
        el.combateMestreCorpo.innerHTML = "";
        montarGerenciadorCombate(el.combateMestreCorpo);
    });
    el.combateMestreFechar.addEventListener("click", () => el.modalCombateMestre.classList.remove("active"));

    // Gerenciador de Cenário — mesmo molde do de Combate acima (drawer
    // lateral, ficha continua usável ao lado).
    if (el.btnAbrirCenario && el.modalCenarioMestre) {
        el.btnAbrirCenario.addEventListener("click", () => {
            el.modalCenarioMestre.classList.add("active");
            el.cenarioMestreCorpo.innerHTML = "";
            montarGerenciadorCenario(el.cenarioMestreCorpo);
        });
        el.cenarioMestreFechar.addEventListener("click", () => el.modalCenarioMestre.classList.remove("active"));
    }
}

// Limpa e esconde o conteúdo aberto em #mestre-corpo (ver "×" ligado em
// configurarPainelMestre). Some com dataset.acaoAberta também, senão o
// listener em tempo real da Biblioteca (ver linha ~754/767 em ficha.js)
// reabriria o painel sozinho na próxima atualização do Banco Global.
function fecharAcaoMestre() {
    definirLimpezaPainelMestre(null);
    const corpo = el.mestreCorpo;
    corpo.innerHTML = "";
    delete corpo.dataset.acaoAberta;
    if (el.mestreCorpoTopo) el.mestreCorpoTopo.style.display = "none";
}

export function montarPainelXpMultiplo(corpo) {
    const lista = document.createElement("div");
    lista.className = "xp-multiplo-lista";

    const ids = Object.keys(estado.todasAsFichasCache).sort((a, b) => nomeDeFicha(a).localeCompare(nomeDeFicha(b)));
    if (!ids.length) {
        lista.innerHTML = `<p class="hint">Nenhuma ficha ativa na rede ainda.</p>`;
    } else {
        ids.forEach(id => {
            const linha = document.createElement("label");
            linha.className = "xp-multiplo-linha";
            const xpAtual = (estado.todasAsFichasCache[id].dados && estado.todasAsFichasCache[id].dados.xp) || 0;
            linha.innerHTML = `
                <input type="checkbox" class="xp-checkbox" value="${id}">
                <span class="xp-multiplo-nome">${escapeHtml(nomeDeFicha(id))}</span>
                <span class="xp-multiplo-atual">XP atual: ${xpAtual}</span>
            `;
            lista.appendChild(linha);
        });
    }

    const acoesTopo = document.createElement("div");
    acoesTopo.className = "xp-multiplo-acoes-topo";
    const btnTodos = document.createElement("button");
    btnTodos.className = "btn-ghost"; btnTodos.type = "button"; btnTodos.innerText = "Marcar todos";
    const btnNenhum = document.createElement("button");
    btnNenhum.className = "btn-ghost"; btnNenhum.type = "button"; btnNenhum.innerText = "Desmarcar todos";
    btnTodos.addEventListener("click", () => lista.querySelectorAll(".xp-checkbox").forEach(c => c.checked = true));
    btnNenhum.addEventListener("click", () => lista.querySelectorAll(".xp-checkbox").forEach(c => c.checked = false));
    acoesTopo.append(btnTodos, btnNenhum);

    const input = document.createElement("input");
    input.type = "number"; input.placeholder = "Quantidade de XP"; input.value = 50;

    // Título do XP (opcional, mas recomendado) — fica salvo junto no
    // histórico de cada ficha (ver darXp/ouvirXpHistorico, mestre.js),
    // pra responder depois "já dei o XP dessa sessão?" sem depender de
    // memória. Ex.: "Sessão 12 — venceram os capangas do Kessler".
    const inputTitulo = document.createElement("input");
    inputTitulo.type = "text";
    inputTitulo.placeholder = "Título do XP (ex.: Sessão 12 — venceram os capangas)";

    const btnEnviar = document.createElement("button");
    btnEnviar.className = "btn-lime"; btnEnviar.type = "button"; btnEnviar.innerText = "Enviar XP às fichas marcadas";
    btnEnviar.addEventListener("click", async () => {
        const marcadas = [...lista.querySelectorAll(".xp-checkbox:checked")].map(c => c.value);
        if (!marcadas.length) { toast("Marque pelo menos uma ficha.", "erro"); return; }
        const quantidade = Number(input.value) || 0;
        const titulo = inputTitulo.value.trim();
        await Promise.all(marcadas.map(id => darXp(id, quantidade, titulo)));
        toast(`XP enviado para ${marcadas.length} ficha${marcadas.length > 1 ? "s" : ""}.`);
        // Limpa só o título — a quantidade costuma se repetir entre
        // envios da mesma sessão, o título quase nunca.
        inputTitulo.value = "";
    });

    corpo.append(acoesTopo, lista, input, inputTitulo, btnEnviar);
}

function criarSelectPersonagemPorTipo(tipo, placeholder) {
    const select = document.createElement("select");
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;
    if (tipo === "ficha") {
        Object.keys(estado.todasAsFichasCache).forEach(id => {
            const opt = document.createElement("option");
            opt.value = `ficha::${id}`;
            opt.innerText = nomeDeFicha(id);
            select.appendChild(opt);
        });
    } else {
        ouvirNpcs((npcs) => {
            const valorAtual = select.value;
            [...select.querySelectorAll("option")].slice(1).forEach(o => o.remove());
            npcs.forEach(npc => {
                const opt = document.createElement("option");
                opt.value = `npc::${npc.id}`;
                opt.innerText = npc.nome;
                select.appendChild(opt);
            });
            select.value = valorAtual;
        });
    }
    return select;
}

// Devolve o participanteId de combate correspondente a (tipo, refId),
// criando a entrada em combateAtivo/participantes na hora se ainda não
// existir (ver adicionarParticipanteCombate, mestre.js) — todas as
// condições (Derrubado, Sangramento, Imobilizado etc.) vivem PRESAS a
// um participante de combate (ver comentários de definirDerrubado e
// companhia em mestre.js), então "Causar Condição" precisa disso pra
// poder aplicar a condição em alguém que ainda não estava na luta, sem
// obrigar o Mestre a abrir o Gerenciador de Combate antes. Não atrapalha
// um combate já rolando: se a iniciativa já estiver em andamento, o
// recém-chegado entra com sua própria rolagem de iniciativa (mesmo
// comportamento de sempre).
async function obterOuCriarParticipanteMestre(tipo, refId, nome) {
    const existente = participanteIdPorAlvo(tipo, refId);
    if (existente) return { id: existente, criadoAgora: false };
    const resultado = await adicionarParticipanteCombate({ tipo, refId, nome });
    return { id: resultado.id, criadoAgora: true };
}

// Catálogo das condições que o Mestre pode causar manualmente — cada
// uma reaproveita a mesma função já usada no resto do sistema (ataques,
// manobras de CQC/Jiu Jitsu etc.), só que disparada direto pelo Mestre
// sem precisar de um teste/ataque em andamento. `remover` é omitido nas
// que não têm uma forma manual de tirar por aqui (Sangramento se trata
// pela aba Saúde — Estancar Sangramento/Suturar — não por um botão
// solto no Gerenciador).
const CONDICOES_MESTRE = [
    { key: "derrubado", label: "Derrubado" },
    { key: "sangramento", label: "Sangramento" },
    { key: "imobilizado", label: "Imobilizado" },
    { key: "desacordado", label: "Desacordado" },
    { key: "agarrado", label: "Agarrado" },
    { key: "fratura", label: "Ossos Quebrados (Fratura)" },
    { key: "infeccao", label: "Infecção" }
];

export function montarPainelCondicaoMestre(corpo) {
    const aviso = document.createElement("p");
    aviso.className = "hint";
    aviso.innerText = "Escolha o personagem (jogador OU NPC) e a condição. Se ele ainda não estiver no Gerenciador de Combate, é adicionado automaticamente pra poder receber a condição.";
    corpo.appendChild(aviso);

    const linhaAlvo = document.createElement("div");
    linhaAlvo.className = "modal-field";
    const labelJogador = document.createElement("label");
    labelJogador.innerText = "Jogador";
    const selectJogador = criarSelectPersonagemPorTipo("ficha", "-- nenhum jogador --");
    labelJogador.appendChild(selectJogador);
    const labelNpc = document.createElement("label");
    labelNpc.innerText = "NPC";
    const selectNpc = criarSelectPersonagemPorTipo("npc", "-- nenhum NPC --");
    labelNpc.appendChild(selectNpc);
    linhaAlvo.append(labelJogador, labelNpc);
    corpo.appendChild(linhaAlvo);

    // Só um alvo por vez — escolher num select limpa o outro.
    selectJogador.addEventListener("change", () => { if (selectJogador.value) selectNpc.value = ""; });
    selectNpc.addEventListener("change", () => { if (selectNpc.value) selectJogador.value = ""; });

    const selectCondicao = document.createElement("select");
    const optPlaceholderCondicao = document.createElement("option");
    optPlaceholderCondicao.value = ""; optPlaceholderCondicao.innerText = "Condição...";
    optPlaceholderCondicao.disabled = true; optPlaceholderCondicao.selected = true;
    selectCondicao.appendChild(optPlaceholderCondicao);
    CONDICOES_MESTRE.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key; opt.innerText = c.label;
        selectCondicao.appendChild(opt);
    });
    corpo.appendChild(selectCondicao);

    // Campos extras por condição — todos ficam escondidos até a condição
    // correspondente ser escolhida (ver selectCondicao "change" abaixo).
    const camposSangramento = document.createElement("div");
    camposSangramento.className = "modal-field";
    camposSangramento.style.display = "none";
    const inputDanoSangramento = document.createElement("input");
    inputDanoSangramento.type = "number"; inputDanoSangramento.placeholder = "Dano por turno"; inputDanoSangramento.value = 2;
    const inputTurnosSangramento = document.createElement("input");
    inputTurnosSangramento.type = "number"; inputTurnosSangramento.placeholder = "Nº de turnos"; inputTurnosSangramento.value = 3;
    const selectLocalSangramento = document.createElement("select");
    LOCAIS_MIRA.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.key === "padrao" ? "torso" : l.key;
        opt.innerText = l.label;
        selectLocalSangramento.appendChild(opt);
    });
    camposSangramento.append(inputDanoSangramento, inputTurnosSangramento, selectLocalSangramento);

    const camposImobilizado = document.createElement("div");
    camposImobilizado.className = "modal-field";
    camposImobilizado.style.display = "none";
    const inputDificuldadeEscape = document.createElement("input");
    inputDificuldadeEscape.type = "number"; inputDificuldadeEscape.placeholder = "Dificuldade pra escapar (teste de Destreza)"; inputDificuldadeEscape.value = 15;
    camposImobilizado.appendChild(inputDificuldadeEscape);

    const camposFratura = document.createElement("div");
    camposFratura.className = "modal-field";
    camposFratura.style.display = "none";
    const inputPontosPenalidade = document.createElement("input");
    inputPontosPenalidade.type = "number"; inputPontosPenalidade.placeholder = "Pontos de penalidade em ações físicas"; inputPontosPenalidade.value = 1;
    const labelMembroInferior = document.createElement("label");
    labelMembroInferior.className = "godmode-toggle godmode-suboption";
    const chkMembroInferior = document.createElement("input");
    chkMembroInferior.type = "checkbox";
    labelMembroInferior.append(chkMembroInferior, document.createTextNode(" É perna (impede correr; as duas quebradas = só se arrasta)"));
    camposFratura.append(inputPontosPenalidade, labelMembroInferior);

    const camposInfeccao = document.createElement("div");
    camposInfeccao.className = "modal-field";
    camposInfeccao.style.display = "none";
    const inputOrigemInfeccao = document.createElement("input");
    inputOrigemInfeccao.type = "text"; inputOrigemInfeccao.placeholder = "Origem (ex.: ferimento sujo, mordida)";
    const labelInfeccaoGarantida = document.createElement("label");
    labelInfeccaoGarantida.className = "godmode-toggle godmode-suboption";
    const chkInfeccaoGarantida = document.createElement("input");
    chkInfeccaoGarantida.type = "checkbox";
    labelInfeccaoGarantida.append(chkInfeccaoGarantida, document.createTextNode(" Garantida (sem teste de Constituição)"));
    camposInfeccao.append(inputOrigemInfeccao, labelInfeccaoGarantida);

    corpo.append(camposSangramento, camposImobilizado, camposFratura, camposInfeccao);

    const CAMPOS_POR_CONDICAO = {
        sangramento: camposSangramento,
        imobilizado: camposImobilizado,
        fratura: camposFratura,
        infeccao: camposInfeccao
    };
    selectCondicao.addEventListener("change", () => {
        Object.values(CAMPOS_POR_CONDICAO).forEach(div => { div.style.display = "none"; });
        const div = CAMPOS_POR_CONDICAO[selectCondicao.value];
        if (div) div.style.display = "flex";
    });

    // Só as condições com uma forma clara de "desfazer" manualmente
    // ganham o botão Remover (ver comentário do CONDICOES_MESTRE acima).
    const CONDICOES_COM_REMOCAO = new Set(["derrubado", "imobilizado", "desacordado", "agarrado", "fratura", "infeccao"]);

    function alvoEscolhido() {
        const valor = selectJogador.value || selectNpc.value;
        if (!valor) return null;
        const [tipo, refId] = valor.split("::");
        const selectAtivo = tipo === "ficha" ? selectJogador : selectNpc;
        const nome = selectAtivo.selectedOptions[0].textContent;
        return { tipo, refId, nome };
    }

    async function aplicar() {
        const alvo = alvoEscolhido();
        if (!alvo) { toast("Escolha um jogador ou um NPC.", "erro"); return; }
        const condicao = selectCondicao.value;
        if (!condicao) { toast("Escolha uma condição.", "erro"); return; }

        const { id: pid, criadoAgora } = await obterOuCriarParticipanteMestre(alvo.tipo, alvo.refId, alvo.nome);
        const labelCondicao = CONDICOES_MESTRE.find(c => c.key === condicao)?.label || condicao;

        if (condicao === "derrubado") {
            await definirDerrubado(pid, null, "Mestre");

        } else if (condicao === "sangramento") {
            const dano = Number(inputDanoSangramento.value) || 0;
            const turnos = Number(inputTurnosSangramento.value) || 0;
            if (dano <= 0 || turnos <= 0) { toast("Informe o dano por turno e o número de turnos.", "erro"); return; }
            const resultado = await aplicarSangramento(pid, dano, turnos, "Causado manualmente pelo Mestre");
            if (alvo.tipo === "ficha") {
                await registrarFeridasDeSangramento(true, pid, alvo.refId, selectLocalSangramento.value, "Causado manualmente pelo Mestre", { sangramento: resultado });
            }

        } else if (condicao === "imobilizado") {
            const dif = Number(inputDificuldadeEscape.value) || 15;
            await definirImobilizado(pid, null, "Mestre", dif);

        } else if (condicao === "desacordado") {
            await definirDesacordado(pid, null, "Mestre");

        } else if (condicao === "agarrado") {
            await definirAgarrado(pid, null, "Mestre");

        } else if (condicao === "fratura") {
            const pontos = Number(inputPontosPenalidade.value) || 1;
            await definirOssosQuebrados(pid, { pontosPenalidade: pontos, membroInferior: chkMembroInferior.checked, porNome: "Mestre" });

        } else if (condicao === "infeccao") {
            await aplicarInfeccao(pid, inputOrigemInfeccao.value.trim() || "Causado manualmente pelo Mestre", chkInfeccaoGarantida.checked);
        }

        const detalhe = `Mestre causou a condição "${labelCondicao}" em ${alvo.nome}.` + (criadoAgora ? " (adicionado ao Gerenciador de Combate agora)" : "");
        await registrarRolagem({ quem: "Mestre", modificador: 0, resultado: 0, detalhe });
        toast(detalhe);
    }

    async function remover() {
        const alvo = alvoEscolhido();
        if (!alvo) { toast("Escolha um jogador ou um NPC.", "erro"); return; }
        const condicao = selectCondicao.value;
        if (!condicao) { toast("Escolha uma condição.", "erro"); return; }
        if (!CONDICOES_COM_REMOCAO.has(condicao)) { toast("Essa condição não tem remoção direta por aqui.", "erro"); return; }

        const pid = participanteIdPorAlvo(alvo.tipo, alvo.refId);
        if (!pid) { toast(`${alvo.nome} não está no Gerenciador de Combate — nada pra remover.`, "erro"); return; }
        const labelCondicao = CONDICOES_MESTRE.find(c => c.key === condicao)?.label || condicao;

        if (condicao === "derrubado") await levantarDerrubado(pid);
        else if (condicao === "imobilizado") await soltarImobilizado(pid);
        else if (condicao === "desacordado") await soltarDesacordado(pid);
        else if (condicao === "agarrado") await soltarAgarrado(pid);
        else if (condicao === "fratura") await curarOssosQuebrados(pid);
        else if (condicao === "infeccao") await curarInfeccao(pid);

        const detalhe = `Mestre removeu a condição "${labelCondicao}" de ${alvo.nome}.`;
        await registrarRolagem({ quem: "Mestre", modificador: 0, resultado: 0, detalhe });
        toast(detalhe);
    }

    const botoes = document.createElement("div");
    botoes.className = "xp-multiplo-acoes-topo";
    const btnAplicar = document.createElement("button");
    btnAplicar.className = "btn-red"; btnAplicar.type = "button"; btnAplicar.innerText = "Causar condição";
    btnAplicar.addEventListener("click", aplicar);
    const btnRemover = document.createElement("button");
    btnRemover.className = "btn-ghost"; btnRemover.type = "button"; btnRemover.innerText = "Remover condição";
    btnRemover.addEventListener("click", remover);
    botoes.append(btnAplicar, btnRemover);
    corpo.appendChild(botoes);
}

export function configurarGodmode() {
    ouvirGodmode((ativo) => {
        estado.godmodeAtivo = ativo;
        el.godmodeIndicador.style.display = ativo ? "inline-block" : "none";
        if (estado.isMestre) el.chkGodmode.checked = ativo;
        if (estado.fichaAtual) renderizarTudo();
    });

    el.chkGodmode.addEventListener("change", async (e) => {
        await definirGodmode(e.target.checked);
    });

    // Sub-opção: só existe e só tem efeito com o Godmode ativo, mas fica
    // guardada à parte (ver ouvirIgnorarPenalidadeSaude em mestre.js) pra
    // manter o estado marcado/desmarcado entre uma sessão de Godmode e
    // outra, em vez de resetar sozinha toda vez.
    if (el.chkGodmodeIgnorarSaude) {
        ouvirIgnorarPenalidadeSaude((ativo) => {
            estado.ignorarPenalidadeSaudeAtivo = ativo;
            el.chkGodmodeIgnorarSaude.checked = ativo;
            if (estado.fichaAtual) renderizarTudo();
        });

        el.chkGodmodeIgnorarSaude.addEventListener("change", async (e) => {
            await definirIgnorarPenalidadeSaude(e.target.checked);
        });
    }
}
