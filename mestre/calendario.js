// ============================================================
// mestre/calendario.js — Passo 30 do plano de modularização de
// ficha.js (ver plano-modularizacao-ficha-js.txt).
//
// Calendário (configurarCalendario) e Timeskip (configurarTimeskip,
// que só o Mestre usa — chamado de dentro de configurarCalendario),
// Registro de Sessões (configurarRegistroSessoes, renderizarSessoes,
// e os helpers privados abrirFormSessao/fecharFormSessao) e o Log de
// Dados (configurarLogDados, com o helper privado
// destacarPalavrasChave). mostrarResumoRecuperacaoPV é usado só por
// configurarCalendario/configurarTimeskip (não estava na lista do
// Passo 30, mesmo critério dos passos anteriores: exclusivo daqui,
// então moveu junto em vez de ficar exportado à toa em ficha.js).
// sessoesCache/sessaoEditandoId (estado de módulo, não do objeto
// `estado` compartilhado — só usados aqui dentro) moveram junto.
// ============================================================

import { estado } from "../estado.js";
import { el, escapeHtml, toast } from "../ficha.js";
import { rolarD20 } from "../regras.js";
import { passarODia, passarVariosDias } from "../mestre.js?v=20260830-npcnivelpv";
import {
    ouvirCalendario, salvarCalendario, calcularAvancoDias,
    diasSemana, climas, registrarRolagem, ouvirLogDados,
} from "../calendario.js";
import { ouvirSessoes, criarSessao, atualizarSessao, removerSessao } from "../sessoes.js";

// =====================================================================
// CALENDÁRIO
// =====================================================================

export function configurarCalendario() {
    // Campo de texto (não type="number") de propósito — em boa parte dos
    // teclados numéricos de celular, o <input type="number"> não mostra
    // a tecla de "-", tornando impossível digitar temperatura negativa.
    // Aqui só filtra o que é digitado pra aceitar dígitos e um sinal de
    // menos opcional na frente (ex: "-5", "12").
    if (el.calEditTemp) {
        el.calEditTemp.addEventListener("input", () => {
            const negativo = el.calEditTemp.value.trim().startsWith("-");
            const digitos = el.calEditTemp.value.replace(/[^0-9]/g, "");
            el.calEditTemp.value = (negativo ? "-" : "") + digitos;
        });
    }

    ouvirCalendario((cal) => {
        if (!cal) return;
        estado.calendarioAtual = cal;
        el.calData.innerText = cal.dataLabel || "—";
        el.calDiaSemana.innerText = cal.diaSemana || "—";
        el.calHora.innerText = cal.hora || "—";
        el.calTemperatura.innerText = (cal.temperatura ?? "—") + "°C";
        el.calClima.innerText = cal.clima || "—";

        if (estado.isMestre) {
            if (document.activeElement !== el.calEditData) el.calEditData.value = cal.dataLabel || "";
            if (document.activeElement !== el.calEditHora) el.calEditHora.value = cal.hora || "";
            if (document.activeElement !== el.calEditTemp) el.calEditTemp.value = cal.temperatura ?? "";
            el.calEditClima.value = cal.clima || climas()[0];
            el.calEditDiaSemana.value = cal.diaSemana || diasSemana()[0];
        }
    });

    if (estado.isMestre) {
        el.btnSalvarCalendario.addEventListener("click", async () => {
            // NOTA (Passo 30): `calendarioAtual` aqui embaixo é uma
            // referência solta, sem `estado.` na frente e sem
            // declaração em lugar nenhum — já era assim antes desta
            // movimentação de arquivo (não é bug introduzido pelo
            // Passo 30; ver plano-modularizacao-ficha-js.txt, regra de
            // não mudar comportamento). Preservado como estava.
            const novo = {
                ...calendarioAtual,
                dataLabel: el.calEditData.value,
                diaSemana: el.calEditDiaSemana.value,
                hora: el.calEditHora.value,
                temperatura: Number(el.calEditTemp.value) || 0,
                clima: el.calEditClima.value
            };
            try {
                await salvarCalendario(novo);
                // Atualiza a variável local NA HORA, sem esperar o listener
                // ouvirCalendario ecoar de volta do servidor (assíncrono,
                // não é instantâneo). Sem isso, clicar em "Passar o dia"
                // logo depois de "Salvar calendário" corria o risco de
                // pegar estado.calendarioAtual ainda com o valor ANTIGO (o de
                // antes deste salvamento) e avançar 1 dia a partir dele —
                // sobrescrevendo a data que acabou de ser salva com "data
                // antiga + 1 dia".
                estado.calendarioAtual = novo;
                toast("Calendário atualizado.");
            } catch (err) {
                // Antes essa falha era silenciosa (sem try/catch, sem
                // toast nenhum) — dava a impressão de ter salvo (a tela
                // nem sempre refletia isso na hora) quando na verdade
                // NADA tinha ido pro banco, e "Passar o dia" continuava
                // avançando a partir da última data que realmente estava
                // salva lá (por isso "voltava" pra data antiga).
                console.error(err);
                toast(`Falha ao salvar o calendário: ${err.message || err}`, "erro");
            }
        });

        el.btnPassarDia.addEventListener("click", async () => {
            if (!estado.calendarioAtual) return;
            try {
                const fichasParaPopup = estado.todasAsFichasCache;
                const { calendario, virouDomingo, popups, recuperacoesPV } = await passarODia(estado.calendarioAtual, fichasParaPopup);
                // Mesmo motivo do handler de "Salvar calendário" acima:
                // evita que um segundo clique rápido em "Passar o dia" (ou
                // um clique em "Salvar calendário" logo em seguida) use a
                // versão antiga do dia, de antes deste avanço.
                estado.calendarioAtual = calendario;
                toast(virouDomingo ? "Dia avançado — caiu Domingo!" : "Dia avançado.");
                mostrarResumoRecuperacaoPV(recuperacoesPV);
            } catch (err) {
                console.error(err);
                toast(`Falha ao passar o dia: ${err.message || err}`, "erro");
            }
        });

        configurarTimeskip();
    }
}

// Resumo da Recuperação de PVs (manual) — chamado depois de "Passar o
// dia" e do Timeskip (ver passarODia/passarVariosDias em mestre.js).
// Pra cada ficha com recuperação em andamento nesse período, mostra
// quanto PV foi recuperado; se a recuperação terminou ANTES do fim do
// período avançado, mostra também quantos dias sobraram sem uso (ver
// avancarRecuperacaoPV em regras.js).
function mostrarResumoRecuperacaoPV(recuperacoesPV) {
    (recuperacoesPV || []).forEach(r => {
        if (r.pvRecuperados <= 0 && !r.completo) return;
        const partes = [`${r.nomeFicha}: +${r.pvRecuperados} PV recuperado(s) (${r.pvAtual}/${r.pvMax})`];
        if (r.completo) {
            partes.push("recuperação concluída");
            if (r.diasSobrando > 0) partes.push(`${r.diasSobrando} dia(s) de Timeskip sobrando`);
        }
        toast(partes.join(" — "));
    });
}

// ---------------------------------------------------------------------
// Timeskip — o Mestre escolhe quantos dias se passam de uma vez só. A
// caixa mostra, ao vivo, qual data/dia da semana o calendário vai ter
// depois de confirmado. Se o período avançado atravessar Domingo(s),
// cada um deles vira um pagamento semanal na fila dos jogadores (ver
// passarVariosDias em mestre.js e configurarAvisoCustoVida, agora em
// abas/saude.js — Passo 25).
// ---------------------------------------------------------------------
function configurarTimeskip() {
    function atualizarPreviewTimeskip() {
        const dias = Math.max(1, Math.trunc(Number(el.timeskipDias.value)) || 1);
        if (!estado.calendarioAtual) { el.timeskipPreview.innerText = ""; return; }
        const { calendario, domingos } = calcularAvancoDias(estado.calendarioAtual, dias);
        const avisoDomingos = domingos > 0
            ? ` — atravessa ${domingos} Domingo${domingos > 1 ? "s" : ""} (${domingos > 1 ? "dispara pagamentos semanais em fila" : "dispara pagamento semanal"}).`
            : " — nenhum Domingo nesse período.";
        el.timeskipPreview.innerText = `Vai ficar: ${calendario.dataLabel} (${calendario.diaSemana})${avisoDomingos}`;
    }

    el.btnTimeskip.addEventListener("click", () => {
        if (!estado.calendarioAtual) return;
        el.timeskipDias.value = "1";
        atualizarPreviewTimeskip();
        el.modalTimeskip.classList.add("active");
    });

    el.timeskipDias.addEventListener("input", atualizarPreviewTimeskip);

    el.timeskipCancelar.addEventListener("click", () => {
        el.modalTimeskip.classList.remove("active");
    });

    el.timeskipConfirmar.addEventListener("click", async () => {
        if (!estado.calendarioAtual) return;
        const dias = Math.max(1, Math.trunc(Number(el.timeskipDias.value)) || 1);
        try {
            const { calendario, domingos, recuperacoesPV } = await passarVariosDias(estado.calendarioAtual, estado.todasAsFichasCache, dias);
            // Mesmo motivo do handler de "Passar o dia": evita usar a
            // versão antiga do calendário caso o Mestre clique em outra
            // coisa (Salvar calendário, Passar o dia) logo em seguida.
            estado.calendarioAtual = calendario;
            el.modalTimeskip.classList.remove("active");
            toast(domingos > 0
                ? `Timeskip de ${dias} dia(s) — atravessou ${domingos} Domingo(s), pagamento(s) semanal(is) disparado(s).`
                : `Timeskip de ${dias} dia(s).`);
            mostrarResumoRecuperacaoPV(recuperacoesPV);
        } catch (err) {
            console.error(err);
            toast(`Falha ao aplicar o timeskip: ${err.message || err}`, "erro");
        }
    });
}

// =====================================================================
// REGISTRO DE SESSÕES — abre ao clicar no badge "Mesa: {mesaId}" no
// topo (#mesa-indicador). Lista compartilhada por todos na mesa (igual
// ao calendário/log de dados — ver sessoes.js); só o Mestre cria,
// edita ou exclui uma entrada — jogador só lê (form/botões de
// criar/editar/excluir ficam com display:none pra ele, e os listeners
// de escrita nem são registrados).
// ---------------------------------------------------------------------
let sessoesCache = [];
let sessaoEditandoId = null; // null = form fechado ou criando nova

export function configurarRegistroSessoes() {
    if (el.mesaIndicador) {
        el.mesaIndicador.addEventListener("click", () => {
            el.modalSessoes.classList.add("active");
            renderizarSessoes();
        });
    }
    el.btnFecharSessoes.addEventListener("click", () => {
        el.modalSessoes.classList.remove("active");
        fecharFormSessao();
    });

    ouvirSessoes((lista) => {
        sessoesCache = lista;
        if (el.modalSessoes.classList.contains("active")) renderizarSessoes();
    });

    if (!estado.isMestre) return; // Jogador: só o listener de leitura acima, sem escrita.

    el.btnNovaSessao.style.display = "inline-block";
    el.btnNovaSessao.addEventListener("click", () => abrirFormSessao(null));
    el.btnCancelarSessao.addEventListener("click", fecharFormSessao);

    el.btnSalvarSessao.addEventListener("click", async () => {
        const nome = el.sessaoNome.value.trim();
        if (!nome) { toast("Dê um nome pra sessão.", "erro"); return; }
        const dados = {
            nome,
            diaInicio: el.sessaoDiaInicio.value.trim(),
            diaFim: el.sessaoDiaFim.value.trim(),
            descricao: el.sessaoDescricao.value,
            xp: Math.max(0, Number(el.sessaoXp.value) || 0)
        };
        try {
            if (sessaoEditandoId) {
                await atualizarSessao(sessaoEditandoId, dados);
                toast("Sessão atualizada.");
            } else {
                await criarSessao(dados);
                toast("Sessão registrada.");
            }
            fecharFormSessao();
        } catch (err) {
            toast(`Não deu pra salvar a sessão: ${err.message}`, "erro");
        }
    });
}

function abrirFormSessao(sessao) {
    sessaoEditandoId = sessao ? sessao.id : null;
    el.sessaoNome.value = sessao ? sessao.nome || "" : "";
    el.sessaoDiaInicio.value = sessao ? sessao.diaInicio || "" : "";
    el.sessaoDiaFim.value = sessao ? sessao.diaFim || "" : "";
    el.sessaoDescricao.value = sessao ? sessao.descricao || "" : "";
    el.sessaoXp.value = sessao ? (sessao.xp ?? 0) : 0;
    el.sessoesForm.style.display = "flex";
}

function fecharFormSessao() {
    sessaoEditandoId = null;
    el.sessoesForm.style.display = "none";
}

// Mais recente primeiro (criadoEm) — diaInicio é texto livre do Mestre,
// não dá pra confiar numa ordenação cronológica só com ele.
export function renderizarSessoes() {
    el.sessoesLista.innerHTML = "";
    const lista = [...sessoesCache].sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
    if (!lista.length) {
        el.sessoesLista.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nenhuma sessão registrada ainda.</li>`;
        return;
    }
    lista.forEach((sessao) => {
        const li = document.createElement("li");
        li.className = "registro-sessao-card";

        const header = document.createElement("div");
        header.className = "registro-sessao-card-header";
        const periodo = [sessao.diaInicio, sessao.diaFim].filter(Boolean).join(" → ");
        header.innerHTML = `
            <div class="registro-sessao-titulo">
                <strong>${escapeHtml(sessao.nome || "Sessão sem nome")}</strong>
                ${periodo ? `<span class="registro-sessao-periodo">${escapeHtml(periodo)}</span>` : ""}
            </div>
            <span class="mod-pill">XP ${Number(sessao.xp) || 0}</span>
        `;
        header.addEventListener("click", () => corpo.classList.toggle("aberto"));

        const corpo = document.createElement("div");
        corpo.className = "registro-sessao-corpo";
        const descricaoHtml = escapeHtml(sessao.descricao || "Sem descrição.").replace(/\n/g, "<br>");
        corpo.innerHTML = `<p class="registro-sessao-descricao">${descricaoHtml}</p>`;

        if (estado.isMestre) {
            const acoes = document.createElement("div");
            acoes.className = "registro-sessao-acoes";
            const btnEditar = document.createElement("button");
            btnEditar.type = "button";
            btnEditar.className = "btn-ghost";
            btnEditar.innerText = "Editar";
            btnEditar.addEventListener("click", (e) => { e.stopPropagation(); abrirFormSessao(sessao); });
            const btnExcluir = document.createElement("button");
            btnExcluir.type = "button";
            btnExcluir.className = "btn-ghost";
            btnExcluir.innerText = "Excluir";
            btnExcluir.addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!confirm(`Excluir a sessão "${sessao.nome || "sem nome"}"? Essa ação não pode ser desfeita.`)) return;
                await removerSessao(sessao.id);
                toast("Sessão excluída.");
            });
            acoes.appendChild(btnEditar);
            acoes.appendChild(btnExcluir);
            corpo.appendChild(acoes);
        }

        li.appendChild(header);
        li.appendChild(corpo);
        el.sessoesLista.appendChild(li);
    });
}

// =====================================================================
// LOG DE DADOS
// =====================================================================

// Destaca palavras-chave do texto do log (ACERTO! em verde-neon, FALHOU
// em vermelho-neon) pra ficarem visíveis mesmo com o texto do detalhe
// em cinza apagado (.log-detalhe usa --text-dim). Recebe o texto JÁ
// escapado (escapeHtml) e devolve HTML com os spans de destaque.
function destacarPalavrasChave(textoEscapado) {
    return textoEscapado
        .replace(/ACERTO!/g, '<span class="log-palavra-acerto">ACERTO!</span>')
        .replace(/FALHOU/g, '<span class="log-palavra-falha">FALHOU</span>');
}

export function configurarLogDados() {
    ouvirLogDados((lista) => {
        el.logDadosLista.innerHTML = "";
        if (!lista.length) {
            el.logDadosLista.innerHTML = `<li class="log-vazio">Nenhuma rolagem ainda. As próximas aparecem aqui em tempo real.</li>`;
            return;
        }
        // ouvirLogDados entrega mais recente primeiro; pra ler como chat
        // (mais antiga em cima, mais nova embaixo) invertemos a ordem.
        const cronologica = [...lista].reverse();
        cronologica.forEach(entrada => {
            const li = document.createElement("li");
            const classeCritico = entrada.critico === "acerto" ? " log-critico-acerto" : (entrada.critico === "falha" ? " log-critico-falha" : "");
            li.className = "log-bolha" + (entrada.quem && entrada.quem.toLowerCase().includes("mestre") ? " log-mestre" : "") + classeCritico;
            const modText = entrada.modificador ? ` (${entrada.modificador >= 0 ? "+" : ""}${entrada.modificador})` : "";
            const hora = entrada.timestamp ? new Date(entrada.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
            const badgeCritico = entrada.critico === "acerto"
                ? `<span class="log-badge-critico acerto">⚡ ACERTO CRÍTICO</span>`
                : (entrada.critico === "falha" ? `<span class="log-badge-critico falha">🔥 FALHA CRÍTICA</span>` : "");
            li.innerHTML = `
                <div class="log-linha-topo">
                    <span class="log-quem">${escapeHtml(entrada.quem || "—")}</span>
                    <span class="log-hora">${hora}</span>
                </div>
                ${badgeCritico}
                ${entrada.detalhe ? `<span class="log-detalhe">${destacarPalavrasChave(escapeHtml(entrada.detalhe))}</span>` : ""}
                <div class="log-resultado-linha">
                    <span class="log-resultado">${entrada.resultado}</span>
                    <span class="log-detalhe">${modText.trim()}</span>
                </div>
            `;
            el.logDadosLista.appendChild(li);
        });
        // Rola pra última mensagem (como em qualquer chat).
        const wrap = el.logDadosLista.parentElement;
        wrap.scrollTop = wrap.scrollHeight;
    });

    el.btnToggleLog.addEventListener("click", () => {
        el.logDados.classList.toggle("minimizado");
    });

    el.logRolarBtn.addEventListener("click", async () => {
        const modificador = Number(el.logRolarMod.value) || 0;
        const quem = estado.isMestre ? "Mestre" : (estado.fichaAtual?.config?.nomeExibicao || estado.sessao.nome || "Jogador");
        const bruto = rolarD20();
        const resultado = bruto + modificador;
        await registrarRolagem({ quem, modificador, resultado, detalhe: `d20: ${bruto}` });
        el.logRolarMod.value = "0";
    });
}
