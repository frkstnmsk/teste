// abas/saude.js
// ---------------------------------------------------------------------
// Aba Saúde — badges de estado (Machucado/Muito Machucado, Em coma,
// Desmaiado, Energia Baixa/Crítica/Morte), a silhueta visual do corpo
// (SVG, 10 zonas clicáveis com a caixinha de feridas por local), a
// lista de cards de feridas (renderizarSaude, com os painéis do Mestre
// pra reverter coma / acordar desmaio) — Passo 24 — e agora (Passo 25,
// parte 2) os implantes/próteses (renderizarImplantes,
// renderizarImplantesPendentesMestre), o tratamento de feridas
// (abrirModalTratarFerida, abrirModalTestarInfeccaoFerida) e os dois
// listeners por-ficha desta aba (configurarSaude, configurarAvisoCustoVida).
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
// O que ainda ficou em ficha.js por ser usado também fora desta aba
// (mestreInstalarImplanteSemTeste, testarAdaptacaoImplante,
// aplicarDanoUsoImplanteGodmode, decrementarItemMedico,
// implantesContagemELimite, avaliarAvisoCustoVida, normalizarTextoBusca,
// modificadoresAtuais, alternarModificadorOcasional, excluirFeridaGodmode,
// aplicarTickSangramentoManual) só ganhou `export`, mesmo critério usado
// nos passos anteriores (ex.: abas/combate.js com
// avaliarReacaoPendente/travarAcoesForaDoTurno).
//
// Preservei de propósito um detalhe do código original em
// renderizarSaude: a linha de `feridasOrdenadas` lê a variável solta
// `feridasCache` (sem o prefixo `estado.`) em vez de `estado.feridasCache`
// — já existia assim antes da extração, não é bug novo daqui.
// ---------------------------------------------------------------------

import { ref, update } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { db } from "../firebase-config.js";
import { caminhoMesa } from "../mesa.js";
import { estado } from "../estado.js";
import {
    el, escapeHtml, toast,
    acoesDeTratamentoParaFerida, tituloTipoFerida, tituloLocalFerida, tituloEstadoFerida,
    excluirFeridaGodmode, aplicarTickSangramentoManual,
    modificadoresAtuais, alternarModificadorOcasional, normalizarTextoBusca,
    decrementarItemMedico, implantesContagemELimite, resumoModificadores,
    testarAdaptacaoImplante, mestreInstalarImplanteSemTeste, aplicarDanoUsoImplanteGodmode,
    avaliarAvisoCustoVida,
} from "../ficha.js?v=20260830-npcnivelpv";
import {
    TRATAMENTOS_FERIDA, DIFICULDADE_INFECCAO_MINIMA, DIFICULDADE_INFECCAO_MAXIMA,
    somaModificadoresPara, modificadoresOcasionaisDoAlvo, rotuloAlvo,
    chipEstaAtivo, tomadaSlotsOcupados, horasTotaisCalendario,
} from "../regras.js";
import {
    ZONAS_SILHUETA, labelLocalFerida, subtipoContaComoImplante, slotsTomada, efeitoChip,
    rotuloSubtipoImplante, localMiraPorKey, todosOsSaldos,
} from "../dados-manual.js";
import {
    agruparFeridasPorLocal, tratarFerida, testarInfeccaoFerida, isentarInfeccaoFerida, ouvirFeridas,
} from "../saude.js";
import {
    reverterComaGodmode, acordarDesmaioGodmode, pagarCustoSemanal,
} from "../mestre.js?v=20260830-npcnivelpv";
import { registrarRolagem, ouvirAvisoCustoVida } from "../calendario.js";
import { renderizarRecuperacaoPV } from "./atributos.js";

// Atualiza o badge de aviso "Machucado"/"Muito Machucado" (some quando o
// personagem está saudável).
export function renderizarEstadoSaude(estadoSaude) {
    if (!el.estadoSaudeBadge) return;
    if (!estadoSaude || !estadoSaude.estado) {
        el.estadoSaudeBadge.style.display = "none";
        el.estadoSaudeBadge.innerHTML = "";
        return;
    }
    el.estadoSaudeBadge.style.display = "block";
    el.estadoSaudeBadge.classList.toggle("muito-machucado", estadoSaude.estado === "muito_machucado");
    const efeitoVelocidade = estadoSaude.metadeVelocidade ? "Velocidade cai pela metade" : `Velocidade ${estadoSaude.penalidadeVelocidade}`;
    el.estadoSaudeBadge.innerHTML = `<strong>${escapeHtml(estadoSaude.label)}</strong> — ${efeitoVelocidade} · ${estadoSaude.penalidadeTestes} em todos os testes`;
}

// Badge "Em coma" (item 6 do plano de saúde/complicações) — some sozinho
// quando dados.coma.ativo não está setado. A entrada em coma só acontece
// via Ação Pendente "confirmar_coma" (aplicarDano em mestre.js, quando
// PV cai abaixo de 1/10 do total, ou complicação da Cirurgia de Campo —
// ver saude.js); a SAÍDA é sempre manual, feita pelo Mestre em Godmode
// (botão "Reverter coma" no painel do Mestre — ver renderizarSaude e
// reverterComaGodmode em mestre.js), então esse badge é só leitura.
export function renderizarComaBadge(d) {
    if (!el.comaBadge) return;
    if (!d.coma || !d.coma.ativo) {
        el.comaBadge.style.display = "none";
        el.comaBadge.innerHTML = "";
        return;
    }
    el.comaBadge.style.display = "block";
    el.comaBadge.innerHTML = `<strong>💤 Em coma</strong> — a saída só acontece manualmente, pelo Mestre (tratamento em hospital ou Cirurgia de Campo bem-sucedidos sinalizam a reversão).`;
}

// Badge "Desmaiado" (item 4 do plano de saúde/complicações) — só um
// aviso visual, sem nenhum efeito mecânico automático. Some sozinho
// quando dados.desmaiado não está setado; "acordar" é sempre manual,
// resolvido pela mesa (botão do Mestre — ver acordarDesmaioGodmode em
// mestre.js).
export function renderizarDesmaioBadge(d) {
    if (!el.desmaioBadge) return;
    if (!d.desmaiado) {
        el.desmaioBadge.style.display = "none";
        el.desmaioBadge.innerHTML = "";
        return;
    }
    el.desmaioBadge.style.display = "block";
    el.desmaioBadge.innerHTML = `<strong>😵 Desmaiado</strong> — acordar é resolvido pela mesa (teste de Constituição narrado), o Mestre desliga o aviso quando fizer sentido na cena.`;
}

// Atualiza o badge de aviso "Energia Baixa"/"Energia Crítica"/"Morte"
// (some quando a Energia atual está saudável) — mesmo padrão visual de
// renderizarEstadoSaude acima.
export function renderizarEstadoEnergia(estadoEnergia) {
    if (!el.estadoEnergiaBadge) return;
    if (!estadoEnergia || !estadoEnergia.estado) {
        el.estadoEnergiaBadge.style.display = "none";
        el.estadoEnergiaBadge.innerHTML = "";
        return;
    }
    el.estadoEnergiaBadge.style.display = "block";
    el.estadoEnergiaBadge.classList.toggle("energia-critica", estadoEnergia.estado === "energia_critica");
    el.estadoEnergiaBadge.classList.toggle("morte", estadoEnergia.estado === "morte");
    if (estadoEnergia.morte) {
        el.estadoEnergiaBadge.innerHTML = `<strong>${escapeHtml(estadoEnergia.label)}</strong> — Energia chegou a 0. O personagem não sobrevive ao esgotamento.`;
        return;
    }
    el.estadoEnergiaBadge.innerHTML = `<strong>${escapeHtml(estadoEnergia.label)}</strong> — ${estadoEnergia.penalidadeFisica} em testes físicos${estadoEnergia.penalidadeMental ? ` · ${estadoEnergia.penalidadeMental} em testes mentais` : ""}`;
}

// Silhueta visual (plano-silhueta-saude.txt, Fases 2-4): o SVG em
// ficha.html é markup estático (as 10 zonas não são recriadas a cada
// renderizarSaude, diferente da lista de cards abaixo dele), então os
// listeners de clique só precisam ser ligados UMA vez — guardado por
// este flag. `zonaSilhuetaSelecionada` e `ultimoAgrupadoSilhueta`
// ficam fora da função pra o clique (que não tem os dados de novo)
// conseguir reconstruir a legenda com o estado mais recente conhecido.
let silhuetaSaudeInicializada = false;
let zonaSilhuetaSelecionada = null;
let ultimoAgrupadoSilhueta = null;

// Mapa fixo id-da-zona -> chave de ferida.local: mesmas 10 chaves de
// ZONAS_SILHUETA (dados-manual.js), só convertendo "_" (usado nas
// chaves) pra "-" (usado nos ids do SVG). Centro (cx/cy) de cada zona é
// hardcoded a partir da geometria fixa desenhada em ficha.html — usado
// só pra posicionar ícone/badge por cima da forma (Fase 4).
const CENTROS_ZONA_SILHUETA = {
    cabeca: { x: 100, y: 32 },
    torso: { x: 100, y: 135 },
    braco_direito: { x: 47, y: 132 },
    braco_esquerdo: { x: 153, y: 132 },
    perna_direita: { x: 81, y: 267 },
    perna_esquerda: { x: 119, y: 267 },
    mao_direita: { x: 47, y: 204 },
    mao_esquerda: { x: 153, y: 204 },
    pe_direita: { x: 81, y: 354 },
    pe_esquerda: { x: 119, y: 354 }
};

const ICONE_POR_ESTADO_VISUAL = { sangrando: "🩸", infeccionada: "🦠", amputado: "✂️" };
const CLASSE_POR_ESTADO_VISUAL = {
    amputado: "zona-amputada", sangrando: "zona-sangrando",
    infeccionada: "zona-infeccionada", aberta: "zona-aberta", tratada: "zona-tratada"
};
const TODAS_CLASSES_ESTADO_SILHUETA = ["zona-aberta", "zona-sangrando", "zona-infeccionada", "zona-amputada", "zona-tratada", "zona-indefinida"];

const NS_SVG = "http://www.w3.org/2000/svg";
function criarElementoSvg(tag, atributos) {
    const elemento = document.createElementNS(NS_SVG, tag);
    Object.entries(atributos || {}).forEach(([chave, valor]) => elemento.setAttribute(chave, valor));
    return elemento;
}

// Fecha a caixinha flutuante e desmarca a zona selecionada — usado ao
// clicar de novo na mesma zona, clicar fora, no "×", ou quando a zona
// selecionada fica sem feridas depois de um tratamento (renderizarSilhuetaSaude
// chama isso na atualização ao vivo).
function fecharPopoverSilhueta() {
    zonaSilhuetaSelecionada = null;
    if (el.saudeSilhuetaSvg) {
        el.saudeSilhuetaSvg.querySelectorAll(".zona-corpo").forEach(z => z.classList.remove("zona-selecionada"));
    }
    if (el.saudeSilhuetaPopover) el.saudeSilhuetaPopover.style.display = "none";
    if (el.saudeSilhuetaLegenda) {
        el.saudeSilhuetaLegenda.innerText = "Clique numa parte do corpo para ver as feridas daquele local.";
    }
}

// Posiciona a caixinha (left/top em % do wrap) do lado do marcador que
// sobra mais espaço na tela: zona na metade esquerda do desenho (braço/
// mão/perna/pé DIREITO do personagem, que fica desenhado à esquerda —
// ver comentário em ficha.html) abre a caixinha pra direita dela; zona
// na metade direita do desenho abre pra esquerda. Usa os mesmos
// centros hardcoded de CENTROS_ZONA_SILHUETA (viewBox 200x400) que a
// Fase 4 já usa pra posicionar ícone/badge.
function posicionarPopoverSilhueta(zonaKey) {
    if (!el.saudeSilhuetaPopover) return;
    const centro = CENTROS_ZONA_SILHUETA[zonaKey];
    if (!centro) return;
    const leftPercent = (centro.x / 200) * 100;
    const topPercent = (centro.y / 400) * 100;
    const abrePraDireita = leftPercent < 50;
    el.saudeSilhuetaPopover.classList.remove("seta-esquerda", "seta-direita");
    if (abrePraDireita) {
        el.saudeSilhuetaPopover.classList.add("seta-esquerda");
        el.saudeSilhuetaPopover.style.left = `calc(${leftPercent}% + 20px)`;
        el.saudeSilhuetaPopover.style.right = "auto";
        el.saudeSilhuetaPopover.style.transform = "translateY(-50%)";
    } else {
        el.saudeSilhuetaPopover.classList.add("seta-direita");
        el.saudeSilhuetaPopover.style.left = "auto";
        el.saudeSilhuetaPopover.style.right = `calc(${100 - leftPercent}% + 20px)`;
        el.saudeSilhuetaPopover.style.transform = "translateY(-50%)";
    }
    el.saudeSilhuetaPopover.style.top = `${topPercent}%`;
}

// Monta o conteúdo da caixinha (Fase 5): lista de feridas da zona, cada
// uma com os MESMOS botões de tratamento que já existem na lista de
// cards abaixo — reaproveita acoesDeTratamentoParaFerida e
// abrirModalTratarFerida (ficha.js), nenhuma lógica de tratamento nova.
export function renderizarPopoverSilhueta(zonaKey, zona) {
    if (!el.saudeSilhuetaPopoverCorpo) return;
    const nomeLocal = labelLocalFerida(zonaKey);
    if (!zona || !zona.feridas.length) {
        el.saudeSilhuetaPopoverCorpo.innerHTML = `<p class="saude-silhueta-popover-titulo">${escapeHtml(nomeLocal)}</p><p class="saude-silhueta-popover-vazio">Nenhuma ferida aqui.</p>`;
        return;
    }
    const avisoIndefinido = zona.indefinido
        ? `<p class="hint">Inclui ferida antiga de lado indefinido (registrada antes deste sistema saber diferenciar esquerdo/direito).</p>` : "";
    const feridasHtml = zona.feridas.map(ferida => {
        const acoes = acoesDeTratamentoParaFerida(ferida);
        const botoes = acoes.map(acao => `<button type="button" class="btn-lime btn-tratar-ferida" data-ferida-id="${ferida.id}" data-acao="${acao}">${escapeHtml(TRATAMENTOS_FERIDA[acao].label)}</button>`).join(" ");
        const semAcao = !acoes.length && ferida.estado !== "tratada" ? `<span class="hint">Nenhum tratamento disponível no momento.</span>` : "";
        const badgeInfeccao = ferida.infeccaoAtiva ? `<span class="mod-pill negativo">🦠 Infeccionada</span>` : "";
        return `<div class="saude-silhueta-popover-ferida">
            <div class="saude-silhueta-popover-ferida-topo">
                <strong>${tituloTipoFerida(ferida.tipo)}</strong>
                <span class="mod-pill${ferida.estado === "tratada" ? " positivo" : ""}">${tituloEstadoFerida(ferida.estado)}</span>
                ${badgeInfeccao}
            </div>
            <div class="saude-silhueta-popover-acoes">${botoes}${semAcao}</div>
        </div>`;
    }).join("");
    el.saudeSilhuetaPopoverCorpo.innerHTML = `<p class="saude-silhueta-popover-titulo">${escapeHtml(nomeLocal)}</p>${avisoIndefinido}${feridasHtml}`;
    el.saudeSilhuetaPopoverCorpo.querySelectorAll(".btn-tratar-ferida").forEach(btn => {
        btn.addEventListener("click", () => abrirModalTratarFerida(btn.dataset.feridaId, btn.dataset.acao));
    });
}

export function configurarSilhuetaSaude() {
    if (silhuetaSaudeInicializada || !el.saudeSilhuetaSvg) return;
    silhuetaSaudeInicializada = true;
    el.saudeSilhuetaSvg.querySelectorAll(".zona-corpo").forEach(zona => {
        zona.addEventListener("click", (evento) => {
            evento.stopPropagation();
            const jaSelecionada = zona.dataset.zona === zonaSilhuetaSelecionada;
            if (jaSelecionada) {
                fecharPopoverSilhueta();
                return;
            }
            const zonaDados = ultimoAgrupadoSilhueta ? ultimoAgrupadoSilhueta[zona.dataset.zona] : null;
            if (!zonaDados || !zonaDados.feridas.length) {
                // Clicar numa zona sem ferida não abre a caixinha (plano,
                // Fase 5) — só um aviso rápido na legenda, sem selecionar nada.
                if (el.saudeSilhuetaLegenda) el.saudeSilhuetaLegenda.innerText = "Nenhuma ferida aqui.";
                return;
            }
            el.saudeSilhuetaSvg.querySelectorAll(".zona-corpo").forEach(z => z.classList.remove("zona-selecionada"));
            zonaSilhuetaSelecionada = zona.dataset.zona;
            zona.classList.add("zona-selecionada");
            if (el.saudeSilhuetaLegenda) el.saudeSilhuetaLegenda.innerText = "";
            renderizarPopoverSilhueta(zona.dataset.zona, zonaDados);
            posicionarPopoverSilhueta(zona.dataset.zona);
            if (el.saudeSilhuetaPopover) el.saudeSilhuetaPopover.style.display = "";
        });
    });
    if (el.saudeSilhuetaPopoverFechar) {
        el.saudeSilhuetaPopoverFechar.addEventListener("click", (evento) => {
            evento.stopPropagation();
            fecharPopoverSilhueta();
        });
    }
    if (el.saudeSilhuetaPopover) {
        // Clique DENTRO da caixinha (ex.: nos botões de tratamento) não
        // deve borbulhar até o listener de "clicar fora fecha" abaixo.
        el.saudeSilhuetaPopover.addEventListener("click", (evento) => evento.stopPropagation());
    }
    // "Fecha ao clicar fora" (plano, Fase 5) — um único listener no
    // documento, só ativo enquanto alguma zona estiver selecionada.
    document.addEventListener("click", () => {
        if (zonaSilhuetaSelecionada) fecharPopoverSilhueta();
    });
}

// Redesenha as 10 zonas conforme o agrupamento mais recente de
// estado.feridasCache (plano, Fases 3-4): classe de cor por "pior estado",
// contorno tracejado pra zona com ferida de lado indefinido, ícone de
// estado e badge numérico quando há 2+ feridas na mesma zona.
export function renderizarSilhuetaSaude() {
    if (!el.saudeSilhuetaSvg) return;

    const agrupado = estado.modoNpc ? null : agruparFeridasPorLocal(estado.feridasCache);
    ultimoAgrupadoSilhueta = agrupado;

    if (el.saudeSilhuetaOverlays) el.saudeSilhuetaOverlays.innerHTML = "";

    ZONAS_SILHUETA.forEach(zonaKey => {
        const idSvg = `zona-${zonaKey.replace(/_/g, "-")}`;
        const elementoZona = document.getElementById(idSvg);
        if (!elementoZona) return;

        elementoZona.classList.remove(...TODAS_CLASSES_ESTADO_SILHUETA);
        const zona = agrupado ? agrupado[zonaKey] : null;
        if (!zona || !zona.piorEstado) return; // zona vazia — fica só no contorno neutro

        const classeEstado = CLASSE_POR_ESTADO_VISUAL[zona.piorEstado];
        if (classeEstado) elementoZona.classList.add(classeEstado);
        if (zona.indefinido) elementoZona.classList.add("zona-indefinida");

        if (!el.saudeSilhuetaOverlays) return;
        const centro = CENTROS_ZONA_SILHUETA[zonaKey];
        if (!centro) return;

        const icone = ICONE_POR_ESTADO_VISUAL[zona.piorEstado];
        if (icone) {
            const textoIcone = criarElementoSvg("text", { x: centro.x, y: centro.y, class: `zona-icone${zona.piorEstado === "sangrando" ? " zona-icone-pulsando" : ""}` });
            textoIcone.textContent = icone;
            el.saudeSilhuetaOverlays.appendChild(textoIcone);
        }

        // Badge de contagem: só quando há 2+ feridas na mesma zona (Fase
        // 4) — canto superior direito da forma, deslocado do centro.
        if (zona.feridas.length >= 2) {
            const bx = centro.x + 14, by = centro.y - 14;
            el.saudeSilhuetaOverlays.appendChild(criarElementoSvg("circle", { cx: bx, cy: by, r: 8, class: "zona-badge-fundo" }));
            const textoBadge = criarElementoSvg("text", { x: bx, y: by, class: "zona-badge-texto" });
            textoBadge.textContent = String(zona.feridas.length);
            el.saudeSilhuetaOverlays.appendChild(textoBadge);
        }
    });

    // Se a zona atualmente selecionada mudou de conteúdo (ex: ferida
    // tratada/removida agora mesmo), atualiza a caixinha sem esperar
    // outro clique — fecha sozinha se a zona ficou sem nenhuma ferida.
    if (zonaSilhuetaSelecionada) {
        const zonaDados = agrupado ? agrupado[zonaSilhuetaSelecionada] : null;
        if (!zonaDados || !zonaDados.feridas.length) {
            fecharPopoverSilhueta();
        } else {
            renderizarPopoverSilhueta(zonaSilhuetaSelecionada, zonaDados);
        }
    }
}

export function renderizarSaude() {
    if (!el.saudeLista) return;
    configurarSilhuetaSaude();

    // Painel do Mestre pra reverter coma (item 6 do plano de saúde/
    // complicações) — sempre manual, nunca automático (ver
    // reverterComaGodmode em mestre.js). Fica visível só quando o
    // Mestre está com uma ficha aberta que está atualmente em coma.
    if (el.mestreComaPainel) {
        const emComa = estado.isMestre && !estado.modoNpc && estado.fichaAtual?.dados?.coma?.ativo;
        if (emComa) {
            el.mestreComaPainel.style.display = "";
            el.mestreComaPainel.innerHTML = `<p class="hint">💤 Esta ficha está em coma. A saída é sempre manual — confirme só se o tratamento em hospital ou a Cirurgia de Campo (bem-sucedidos) justificarem, na cena.</p>
                <button type="button" class="btn-lime" id="btn-reverter-coma">Reverter coma</button>`;
            const btnReverterComa = document.getElementById("btn-reverter-coma");
            if (btnReverterComa) {
                btnReverterComa.addEventListener("click", async () => {
                    try {
                        await reverterComaGodmode(estado.fichaAtualId);
                        toast("Coma revertido — a próxima recuperação de PV dessa ficha vai levar o dobro do tempo.");
                    } catch (err) {
                        console.error(err);
                        toast("Falha ao reverter o coma.", "erro");
                    }
                });
            }
        } else {
            el.mestreComaPainel.style.display = "none";
            el.mestreComaPainel.innerHTML = "";
        }
    }

    // Painel do Mestre pra "acordar" o Desmaio Genérico (item 4) — só
    // desliga o badge/aviso; sem efeito mecânico (ver
    // acordarDesmaioGodmode em mestre.js).
    if (el.mestreDesmaioPainel) {
        const desmaiado = estado.isMestre && !estado.modoNpc && estado.fichaAtual?.dados?.desmaiado;
        if (desmaiado) {
            el.mestreDesmaioPainel.style.display = "";
            el.mestreDesmaioPainel.innerHTML = `<p class="hint">😵 Esta ficha está com o aviso de Desmaio ativo. "Acordar" é sempre resolvido pela mesa (teste de Constituição narrado).</p>
                <button type="button" class="btn-lime" id="btn-acordar-desmaio">Acordar (desligar aviso)</button>`;
            const btnAcordarDesmaio = document.getElementById("btn-acordar-desmaio");
            if (btnAcordarDesmaio) {
                btnAcordarDesmaio.addEventListener("click", async () => {
                    try {
                        await acordarDesmaioGodmode(estado.fichaAtualId);
                        toast("Aviso de Desmaio desligado.");
                    } catch (err) {
                        console.error(err);
                        toast("Falha ao desligar o aviso de Desmaio.", "erro");
                    }
                });
            }
        } else {
            el.mestreDesmaioPainel.style.display = "none";
            el.mestreDesmaioPainel.innerHTML = "";
        }
    }

    if (estado.modoNpc) {
        if (el.saudeSilhuetaWrap) el.saudeSilhuetaWrap.style.display = "none";
        if (el.btnMestreAplicarFerida) el.btnMestreAplicarFerida.style.display = "none";
        el.saudeLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">NPCs ainda não entram no sistema de feridas.</p>`;
        return;
    }
    if (el.saudeSilhuetaWrap) el.saudeSilhuetaWrap.style.display = "";
    if (el.btnMestreAplicarFerida) el.btnMestreAplicarFerida.style.display = estado.isMestre ? "inline-block" : "none";
    renderizarSilhuetaSaude();
    if (!estado.feridasCache.length) {
        el.saudeLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">Nenhuma ferida registrada.</p>`;
        return;
    }

    const feridasOrdenadas = [...feridasCache].sort((a, b) => (b.criadaEm || 0) - (a.criadaEm || 0));

    el.saudeLista.innerHTML = feridasOrdenadas.map(ferida => {
        const acoes = acoesDeTratamentoParaFerida(ferida);
        const badgeInfeccao = ferida.infeccaoAtiva
            ? `<span class="mod-pill negativo">🦠 Infeccionada${ferida.infeccaoGarantida ? " (garantida)" : ""}</span>`
            : "";
        // Fase A.1 (plano mestre-tratar-feridas): antes os botões de
        // tratamento ficavam escondidos por completo quando estado.isMestre —
        // o que também escondia o único caminho até o botão Godmode
        // "Tratar automaticamente" (mora dentro do modal aberto por
        // este botão). Mestre agora vê os mesmos botões que o jogador;
        // dentro do modal, ele ganha o botão extra de Godmode (ver
        // abrirModalTratarFerida).
        const botoesTratamento = acoes.map(acao => `<button type="button" class="btn-lime btn-tratar-ferida" data-ferida-id="${ferida.id}" data-acao="${acao}">${escapeHtml(TRATAMENTOS_FERIDA[acao].label)}</button>`).join(" ");
        const semAcao = !acoes.length && ferida.estado !== "tratada"
            ? `<span class="hint">Nenhum tratamento disponível no momento.</span>` : "";
        // Testar Infecção (Etapa 5 do plano): migrado pra cá, vinculado à
        // ferida específica — só o Mestre dispara, a qualquer momento
        // enquanto a ferida não estiver "tratada" (não depende de já
        // estar infeccionada, igual o antigo botão do Gerenciador de
        // Combate).
        const botaoTestarInfeccao = (estado.isMestre && ferida.estado !== "tratada")
            ? `<button type="button" class="btn-ghost btn-testar-infeccao-ferida" data-ferida-id="${ferida.id}" title="Teste de Constituição vs. Infecção (manual: Complicações de ferimentos)">🦠 Testar Infecção</button>`
            : "";
        // Fase B (plano mestre-tratar-feridas): Godmode ganha um botão
        // pra apagar a ferida inteira, sem passar por "tratada" nem
        // deixar histórico — diferente de tratar, isso é irreversível,
        // por isso o confirm() antes de chamar removerFerida (saude.js).
        const botaoExcluirFerida = (estado.isMestre && estado.godmodeAtivo)
            ? `<button type="button" class="btn-ghost btn-excluir-ferida-godmode" data-ferida-id="${ferida.id}" title="Apaga a ferida por completo, sem histórico — Godmode">🗑️ Excluir ferida (Godmode)</button>`
            : "";
        // Sangramento continua existindo (e fazendo dano) mesmo fora de
        // combate ou depois do Gerenciador de Combate encerrado — ver
        // aplicarTickSangramento (saude.js). Badge só aparece pro Mestre,
        // só na ferida "sangramento" ainda aberta (não tratada) e só
        // enquanto sobrar tick — cada clique aplica 1 tick (dano fixo +
        // desconta 1 do contador) na hora que fizer sentido narrativamente.
        const ticksSangramentoRestantes = Number(ferida.turnosRestantes) || 0;
        const badgeSangramentoTick = (estado.isMestre && ferida.tipo === "sangramento" && ferida.estado === "aberta" && ticksSangramentoRestantes > 0)
            ? `<button type="button" class="mod-pill negativo btn-tick-sangramento" data-ferida-id="${ferida.id}" title="Aplica 1 tick de sangramento agora: ${ferida.danoPorTurno || 0} de dano fixo, desconta 1 do contador. Use fora de combate (dentro de combate o tick já é automático a cada turno).">🩸 Sangrando — ${ticksSangramentoRestantes} tick(s) restante(s) (aplicar)</button>`
            : "";

        const historico = Object.values(ferida.historico || {}).sort((a, b) => (a.data || 0) - (b.data || 0));
        const historicoHtml = historico.length
            ? `<details class="ferida-historico">
                <summary>Histórico (${historico.length})</summary>
                <ul>${historico.map(h => `<li>${escapeHtml(h.acao || "")}${h.quem ? ` — ${escapeHtml(h.quem)}` : ""}: ${escapeHtml(h.resultado || "")}</li>`).join("")}</ul>
               </details>`
            : "";

        return `
        <div class="ferida-card" data-ferida-id="${ferida.id}">
            <div class="ferida-topo">
                <span class="ferida-tipo">${tituloTipoFerida(ferida.tipo)}${ferida.local ? ` — ${tituloLocalFerida(ferida.local)}` : ""}</span>
                <span class="mod-pill${ferida.estado === "tratada" ? " positivo" : ""}">${tituloEstadoFerida(ferida.estado)}</span>
                ${badgeInfeccao}
            </div>
            ${ferida.origem ? `<div class="hint">Origem: ${escapeHtml(ferida.origem)}</div>` : ""}
            <div class="ferida-acoes">${botoesTratamento}${semAcao}${botaoTestarInfeccao}${botaoExcluirFerida}${badgeSangramentoTick}</div>
            ${historicoHtml}
        </div>`;
    }).join("");

    el.saudeLista.querySelectorAll(".btn-tratar-ferida").forEach(btn => {
        btn.addEventListener("click", () => abrirModalTratarFerida(btn.dataset.feridaId, btn.dataset.acao));
    });
    if (estado.isMestre) {
        el.saudeLista.querySelectorAll(".btn-testar-infeccao-ferida").forEach(btn => {
            btn.addEventListener("click", () => abrirModalTestarInfeccaoFerida(btn.dataset.feridaId));
        });
        el.saudeLista.querySelectorAll(".btn-excluir-ferida-godmode").forEach(btn => {
            btn.addEventListener("click", () => excluirFeridaGodmode(btn.dataset.feridaId));
        });
        el.saudeLista.querySelectorAll(".btn-tick-sangramento").forEach(btn => {
            btn.addEventListener("click", () => aplicarTickSangramentoManual(btn.dataset.feridaId));
        });
    }
}

// =====================================================================
// PARTE 2 (Passo 25): Implantes/Próteses e Tratamento de Feridas
// =====================================================================

// =====================================================================
// SAÚDE (ver plano-sistema-saude-ferimentos.txt, Etapa 3): feridas
// persistentes da ficha atualmente aberta. Diferente dos outros
// listeners deste arquivo, este é específico de UMA ficha (estado.fichaAtualId)
// e não do conjunto compartilhado da mesa — por isso precisa ser
// re-registrado sempre que a ficha ativa muda (Mestre trocando de
// personagem no selectFicha, ou alternando entre ficha/NPC). Chamado a
// cada snapshot de ativarSincronizacao(); o guard de id evita
// reassinar o listener à toa quando nada mudou.
// Escopo desta fase: só ficha de jogador — em modo NPC a lista fica
// vazia (feridas de NPC ficam de fora por enquanto).
// =====================================================================
export function configurarSaude() {
    const alvo = !estado.modoNpc && estado.fichaAtualId ? estado.fichaAtualId : null;
    if (alvo === estado.feridasFichaIdOuvida) return;
    estado.feridasFichaIdOuvida = alvo;
    if (estado.unsubFeridas) { estado.unsubFeridas(); estado.unsubFeridas = null; }
    if (!alvo) {
        estado.feridasCache = [];
        renderizarSaude();
        return;
    }
    estado.unsubFeridas = ouvirFeridas(alvo, (lista) => {
        estado.feridasCache = lista || [];
        renderizarSaude();
        // Etapa 6: uma ferida abrindo/fechando pode travar ou destravar
        // a recuperação de PV — re-renderiza o painel com o último
        // contexto (d, pvMaximoTotal) conhecido, sem esperar a próxima
        // atualização da ficha em si.
        if (estado.ultimoContextoRecuperacaoPV) {
            renderizarRecuperacaoPV(estado.ultimoContextoRecuperacaoPV.d, estado.ultimoContextoRecuperacaoPV.pvMaximoTotal);
        }
    });
}

// =====================================================================
// Implantes/Próteses (Biomecânica) — Fases 6 e 9 do plano (ver
// plano-implantes-biomecanica.txt): painel na aba Saúde com os testes
// de adaptação pós-cirurgia (Fase 6) e, agora, o contador de limite +
// modificadores formatados (Fase 9.2/9.3). Diferente da cirurgia em si
// (Fases 4/5/7/8), essa parte NÃO precisa de um segundo personagem nem
// de confirmação do Mestre — é o próprio paciente rolando Constituição
// sozinho, direto na própria ficha, então escreve direto em
// fichas/{estado.fichaAtualId}/inventario/{itemId}/implante sem passar por
// Ação Pendente (mesmo espírito de tratarFerida em si mesmo, saude.js
// Etapa 3 — a diferença é que aqui nem precisa de listener próprio, já
// que implante mora no inventário e reaproveita o mesmo snapshot de
// estado.fichaAtual que o resto da tela usa).
// =====================================================================

// Lê os implantes já INSTALADOS (instalado:true) do inventário da
// própria estado.fichaAtual — diferente de implantesDoPacienteParaCirurgia
// (Fase 3), que lê de estado.todasAsFichasCache pra achar implantes de OUTRO
// personagem (candidato à cirurgia). Aqui é sempre a ficha aberta na
// tela (jogador vendo a própria, ou Mestre vendo a de alguém).
function implantesInstaladosDaFichaAtual() {
    const inventario = (estado.fichaAtual && estado.fichaAtual.inventario) || {};
    return Object.entries(inventario)
        .filter(([, it]) => it && it.tag === "biomecanica" && it.implante && it.implante.instalado)
        .map(([id, it]) => ({ id, ...it }));
}

// Implantes AINDA NÃO instalados da estado.fichaAtual — mesmo espírito da
// função acima, só que o inverso. Usado só pelo atalho do Mestre
// abaixo (instalar sem rolar nada): normalmente um implante
// não-instalado é só um item comum no Inventário, sem ação própria —
// a única forma de instalar é via kit de cirurgia + cenário + outro
// personagem (abrirModalCirurgiaImplante). Esse atalho existe
// EXATAMENTE pra pular tudo isso quando o Mestre quer só narrar "a
// cirurgia deu certo" sem rolar Biomecânica nem exigir cenário/kit —
// mas o fluxo normal (com as rolagens) continua existindo do mesmo
// jeito, sem nenhuma mudança.
function implantesPendentesDaFichaAtual() {
    const inventario = (estado.fichaAtual && estado.fichaAtual.inventario) || {};
    return Object.entries(inventario)
        .filter(([, it]) => it && it.tag === "biomecanica" && it.implante && !it.implante.instalado)
        .map(([id, it]) => ({ id, ...it }));
}

export function renderizarImplantes() {
    if (!el.implantesLista) return;

    if (estado.modoNpc) {
        if (el.implantesContador) el.implantesContador.innerText = "";
        el.implantesLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">NPCs ainda não entram no sistema de implantes.</p>`;
        if (el.implantesPendentesMestre) el.implantesPendentesMestre.innerHTML = "";
        return;
    }

    const implantes = implantesInstaladosDaFichaAtual();

    // Fase 9.3: contador "Implantes: X / nível do personagem" — chips
    // não entram na conta (subtipoContaComoImplante, Fase 1.4: tudo
    // menos "chip" ocupa vaga do limite).
    if (el.implantesContador) {
        const nivelPersonagem = Number(estado.fichaAtual?.dados?.nivel) || 0;
        const contam = implantes.filter(it => subtipoContaComoImplante(it.implante?.subtipo)).length;
        const acimaDoLimite = contam > nivelPersonagem;
        el.implantesContador.innerHTML = `Implantes: <strong${acimaDoLimite ? ' style="color: var(--neon-red);"' : ""}>${contam} / ${nivelPersonagem}</strong>${implantes.length !== contam ? ` <span class="hint-inline">(chips não contam)</span>` : ""}`;
    }

    if (!implantes.length) {
        el.implantesLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">Nenhum implante instalado.</p>`;
        renderizarImplantesPendentesMestre();
        return;
    }

    el.implantesLista.innerHTML = implantes.map(it => {
        const imp = it.implante;
        const nivel = Number(it.nivelTag) || 0;
        const feitos = Number(imp.testesAdaptacaoFeitos) || 0;
        const restantes = Math.max(0, nivel - feitos);
        const rejeicao = Number(imp.rejeicaoParcial) || 0;
        // Manual (pág. Biomecânica/Próteses): "irá fazer um número de
        // testes de Constituição igual ao nível da prótese, dif 10 +
        // nível da prótese". O 2× é só pro dano por uso com rejeição
        // parcial (danoUso abaixo) — não pra dificuldade do teste. Era
        // 10 + 2×nível aqui por engano, deixando a adaptação bem mais
        // difícil do que deveria.
        const dificuldadeAdaptacao = 10 + nivel;
        const danoUso = 2 * nivel;

        // Local implantado (braço/perna/mão/pé esquerdo ou direito — só
        // existe pra subtipo "membro"/"extremidade", ver
        // atualizarBlocoSubtipoImplante no modal do item) — mostrado
        // junto do badge de rejeição, que é quando a mesa mais precisa
        // saber ONDE está a prótese rejeitando (pra narrar/aplicar
        // efeito local). Implante sem local salvo (subtipo sem lado, ou
        // cadastrado antes desse campo existir) só mostra a rejeição
        // mesmo, sem o pino de local.
        const localLabel = imp.local ? localMiraPorKey(imp.local).label : null;
        const badgeRejeicao = rejeicao > 0
            ? `<span class="mod-pill negativo">⚠️ Rejeição parcial: ${rejeicao}${localLabel ? ` — 📍 ${escapeHtml(localLabel)}` : ""}</span>` : "";
        const badgeQuebrado = imp.quebrado
            ? `<span class="mod-pill negativo">💥 Quebrado</span>` : "";

        // Tomada/Chip (manual pg. 84 — ver atualizarBlocoSubtipoImplante
        // no modal de item, onde esses dois campos são preenchidos):
        // mesma informação de slots/vínculo que já aparece na lista do
        // Inventário, só que aqui, junto dos testes de adaptação, pra
        // quem só olha a aba Saúde também enxergar se o chip está de
        // fato surtindo efeito.
        let implanteTomadaChipHtml = "";
        if (imp.subtipo === "tomada") {
            const ocupados = tomadaSlotsOcupados(estado.fichaAtual.inventario, it.id);
            const slots = slotsTomada(nivel);
            implanteTomadaChipHtml = `<div class="hint">Slots de chip: ${ocupados}/${slots} ocupado(s).</div>`;
        } else if (imp.subtipo === "chip") {
            const tomadaVinculada = imp.tomadaId ? estado.fichaAtual.inventario?.[imp.tomadaId] : null;
            const ativo = chipEstaAtivo(estado.fichaAtual.inventario, it.id);
            if (!imp.tomadaId) {
                implanteTomadaChipHtml = `<div class="hint">Sem Tomada vinculada — sem efeito. Edite o item pra escolher uma.</div>`;
            } else if (!tomadaVinculada) {
                implanteTomadaChipHtml = `<div class="hint">⚠️ Tomada vinculada não existe mais no inventário.</div>`;
            } else {
                implanteTomadaChipHtml = `<div class="hint">Tomada: ${escapeHtml(tomadaVinculada.nome || "(sem nome)")} — ${ativo ? "efeito ativo ✅" : "sem vaga/inativo ⚠️"}</div>`;
            }
            // Efeito automático (manual pg. 84 — ver efeitoChip em
            // dados-manual.js): pro modificador de nível 1/2, mostra aqui
            // o valor de verdade que está entrando na conta (não fica
            // gravado em it.modificadores, é calculado na hora em
            // coletarModificadores — resumoModificadores acima não pega).
            // Pra especialização nível 3-5, só reforça que o efeito
            // exato mora no cadastro em Especializações.
            const efeitoAuto = efeitoChip(nivel);
            if (ativo && efeitoAuto?.tipo === "modificador" && imp.chipAlvo) {
                implanteTomadaChipHtml += `<div class="hint">Efeito automático: ${rotuloAlvo(imp.chipAlvo)} +${efeitoAuto.valor}.</div>`;
            } else if (efeitoAuto?.tipo === "especializacao" && imp.especializacaoPericia) {
                implanteTomadaChipHtml += `<div class="hint">Concede Especialização de nível ${efeitoAuto.valor} em ${escapeHtml(imp.especializacaoPericia)}${ativo ? "" : " (só quando o chip estiver ativo)"} — efeito exato cadastrado em Especializações.</div>`;
            }
        }

        // Fase 9.2: modificadores estruturados do item formatados igual
        // ao resto da ficha (resumoModificadores, mesma função que
        // vantagens/desvantagens/item de inventário usam).
        const resumoMods = resumoModificadores(it);
        const modificadoresHtml = resumoMods
            ? `<div class="hint">Modificadores: ${resumoMods}</div>` : "";

        // 6.1: botão "Testar adaptação" só visível pro DONO da ficha
        // (nunca pro Mestre) e só enquanto restarem tentativas.
        const botaoTestar = (!estado.isMestre && !imp.quebrado && restantes > 0)
            ? `<button type="button" class="btn-lime btn-testar-adaptacao-implante" data-implante-id="${it.id}" title="Teste de Constituição vs. dif ${dificuldadeAdaptacao} — adaptação ao implante">🧬 Testar adaptação (${feitos}/${nivel}, dif ${dificuldadeAdaptacao})</button>`
            : "";
        const avisoSemTestes = (!estado.isMestre && !imp.quebrado && restantes === 0)
            ? `<span class="hint">Testes de adaptação concluídos.</span>` : "";

        // 6.3: dano "toda vez que usar a prótese" com rejeição parcial —
        // fica como botão MANUAL do Mestre (sem gatilho automático, não
        // dá pra saber sozinho quando o jogador "usou" a prótese numa
        // ação). Direto na cena, sem Ação Pendente (o Mestre já É a
        // confirmação).
        const botaoDanoUso = (estado.isMestre && rejeicao > 0)
            ? `<button type="button" class="btn-ghost btn-dano-uso-implante" data-implante-id="${it.id}" data-implante-nome="${escapeHtml(it.nome)}" data-dano="${danoUso}" title="Dano manual de uso com rejeição parcial — aplique toda vez que o jogador usar esta prótese na cena">⚡ Aplicar dano de uso (${danoUso})</button>`
            : "";

        const historico = [...(imp.historico || [])].sort((a, b) => (a.em || 0) - (b.em || 0));
        const historicoHtml = historico.length
            ? `<details class="ferida-historico">
                <summary>Histórico (${historico.length})</summary>
                <ul>${historico.map(h => `<li>${escapeHtml(h.tipo || "")}${h.por ? ` — ${escapeHtml(h.por)}` : ""}: ${escapeHtml(h.resultado || "")}</li>`).join("")}</ul>
               </details>`
            : "";

        return `
        <div class="ferida-card implante-card" data-implante-id="${it.id}">
            <div class="ferida-topo">
                <span class="ferida-tipo">${escapeHtml(it.nome)}${imp.subtipo ? ` — ${escapeHtml(rotuloSubtipoImplante(imp.subtipo))}` : ""}</span>
                <span class="mod-pill tag">Nível ${nivel}</span>
                ${badgeRejeicao}${badgeQuebrado}
            </div>
            <div class="hint">Testes de adaptação: ${feitos}/${nivel} feito(s)${restantes > 0 ? ` — ${restantes} restante(s)` : ""}.</div>
            ${implanteTomadaChipHtml}
            ${modificadoresHtml}
            ${imp.funcoesEspeciais ? `<div class="hint">Funções especiais: ${escapeHtml(imp.funcoesEspeciais)}</div>` : ""}
            <div class="ferida-acoes">${botaoTestar}${avisoSemTestes}${botaoDanoUso}</div>
            ${historicoHtml}
        </div>`;
    }).join("");

    if (!estado.isMestre) {
        el.implantesLista.querySelectorAll(".btn-testar-adaptacao-implante").forEach(btn => {
            btn.addEventListener("click", () => testarAdaptacaoImplante(btn.dataset.implanteId));
        });
    } else {
        el.implantesLista.querySelectorAll(".btn-dano-uso-implante").forEach(btn => {
            btn.addEventListener("click", () => aplicarDanoUsoImplanteGodmode(btn.dataset.implanteId, btn.dataset.implanteNome, Number(btn.dataset.dano) || 0));
        });
    }

    renderizarImplantesPendentesMestre();
}

// Atalho do Mestre: instala um implante que ainda está no inventário
// sem instalado:true, SEM passar pela rolagem de Biomecânica do
// instalador nem pelos testes de adaptação (Constituição) do paciente
// — os dois ficam marcados como já resolvidos direto (mesmo espírito
// do botão de dano de uso: "Direto na cena, sem Ação Pendente, o
// Mestre já É a confirmação"). O fluxo normal com kit de
// cirurgia+cenário+rolagens (abrirModalCirurgiaImplante,
// resolverInstalarImplante/testarAdaptacaoImplante) continua existindo
// sem nenhuma mudança — isso aqui é só uma porta extra pro Mestre
// narrar "a cirurgia deu certo" sem rolar nada. Só visível/disponível
// pro Mestre (o painel de Implantes inteiro só existe fora do modo
// NPC — ver renderizarImplantes).
function renderizarImplantesPendentesMestre() {
    if (!el.implantesPendentesMestre) return;
    if (!estado.isMestre) { el.implantesPendentesMestre.innerHTML = ""; return; }

    const pendentes = implantesPendentesDaFichaAtual();
    if (!pendentes.length) { el.implantesPendentesMestre.innerHTML = ""; return; }

    const { contam, nivel } = implantesContagemELimite(estado.fichaAtual);

    el.implantesPendentesMestre.innerHTML = `
        <div class="eyebrow" style="margin-top:10px;">Implantes aguardando cirurgia (${pendentes.length})</div>
        ${pendentes.map(it => {
            const nivelImp = Number(it.nivelTag) || 0;
            const contaPraLimite = subtipoContaComoImplante(it.implante?.subtipo);
            const semVaga = contaPraLimite && (contam >= nivel);
            return `
            <div class="ferida-card implante-card" data-implante-pendente-id="${it.id}">
                <div class="ferida-topo">
                    <span class="ferida-tipo">${escapeHtml(it.nome)}${it.implante?.subtipo ? ` — ${escapeHtml(rotuloSubtipoImplante(it.implante.subtipo))}` : ""}</span>
                    <span class="mod-pill tag">Nível ${nivelImp}</span>
                </div>
                <div class="hint">Ainda não instalado.${semVaga ? " ⚠️ Personagem já está no limite de implantes." : ""}</div>
                <div class="ferida-acoes">
                    <button type="button" class="btn-lime btn-instalar-sem-teste-mestre" data-implante-id="${it.id}" title="Instala direto — sem rolar Biomecânica nem exigir testes de Constituição do paciente">⚡ Instalar sem testes (Mestre)</button>
                </div>
            </div>`;
        }).join("")}
    `;

    el.implantesPendentesMestre.querySelectorAll(".btn-instalar-sem-teste-mestre").forEach(btn => {
        btn.addEventListener("click", () => mestreInstalarImplanteSemTeste(btn.dataset.implanteId));
    });
}

// Resume os efeitos médicos de UM item que se aplicam à ação de
// tratamento `acao` — soma dos bônus, soma das reduções de
// dificuldade, se algum efeito isenta a penalidade de item (isenção
// explícita OU redução de dificuldade, que segundo o catálogo já conta
// como item adequado), se algum efeito dá sucesso automático, e (se
// `tipoFerida` foi passado) o efeito de fator de tempo de recuperação
// aplicável a esse tipo, se houver.
function efeitosMedicosParaTratamento(item, acao, tipoFerida) {
    const efeitosMedicos = Array.isArray(item.efeitosMedicos) ? item.efeitosMedicos : [];
    const lista = efeitosMedicos.filter(ef => ef && Array.isArray(ef.tratamentos) && ef.tratamentos.includes(acao));
    const bonus = lista
        .filter(ef => ef.tipo === "bonus_teste_tratamento")
        .reduce((acc, ef) => acc + (Number(ef.valor) || 0), 0);
    const reducaoDificuldade = lista
        .filter(ef => ef.tipo === "reduz_dificuldade_tratamento")
        .reduce((acc, ef) => acc + (Number(ef.valor) || 0), 0);
    const isentaPenalidade = lista.some(ef => ef.tipo === "isenta_penalidade_item" || ef.tipo === "reduz_dificuldade_tratamento");
    const sucessoAutomatico = lista.some(ef => ef.tipo === "sucesso_automatico_tratamento");
    const fatorRecuperacao = tipoFerida
        ? (efeitosMedicos.find(ef => ef && ef.tipo === "fator_tempo_recuperacao" && Array.isArray(ef.tiposFerida) && ef.tiposFerida.includes(tipoFerida)) || null)
        : null;
    // "Elegível" pro seletor do modal: tem algum dos 4 efeitos de
    // tratamento OU só o fator de recuperação (ex.: Pomada Cicatrizante,
    // que no manual não tem NENHUM bônus/isenção próprio — só acelera a
    // cicatrização de quem já está sendo tratado com ela).
    const elegivel = lista.length > 0 || !!fatorRecuperacao;
    return { lista, bonus, reducaoDificuldade, isentaPenalidade, sucessoAutomatico, fatorRecuperacao, elegivel };
}

// Itens de equipamento médico do inventário de quem está tratando
// (sempre estado.fichaAtual/idAtivo — quem tem a ficha aberta nesta tela,
// mesmo tratando outro jogador, ver comentário abaixo) que têm algum
// efeito aplicável à ação de tratamento corrente (ou ao fator de
// recuperação do tipo da ferida, se `tipoFerida` for passado).
function itensMedicosParaTratamento(acao, tipoFerida) {
    const inventario = estado.fichaAtual.inventario || {};
    return Object.entries(inventario)
        .filter(([, item]) => item && item.tag === "equipamento_medico")
        .map(([id, item]) => ({ id, item, efeitos: efeitosMedicosParaTratamento(item, acao, tipoFerida) }))
        .filter(({ efeitos }) => efeitos.elegivel);
}

// Resume os efeitos médicos de UM item que se aplicam ao Teste de
// Infecção (Fase 5 do plano de efeitos médicos) — reduz_dificuldade_
// infeccao (soma dos valores) e/ou isenta_infeccao (isenta o teste
// inteiro). Diferente de efeitosMedicosParaTratamento, esses dois
// tipos não têm `tratamentos[]` — miram o Teste de Infecção como um
// todo, não uma ação de tratamento específica.
function efeitosMedicosParaInfeccao(item) {
    const lista = (Array.isArray(item.efeitosMedicos) ? item.efeitosMedicos : [])
        .filter(ef => ef && (ef.tipo === "reduz_dificuldade_infeccao" || ef.tipo === "isenta_infeccao"));
    const reducaoDificuldade = lista
        .filter(ef => ef.tipo === "reduz_dificuldade_infeccao")
        .reduce((acc, ef) => acc + (Number(ef.valor) || 0), 0);
    const isentaInfeccao = lista.some(ef => ef.tipo === "isenta_infeccao");
    return { lista, reducaoDificuldade, isentaInfeccao };
}

// Itens de equipamento médico do inventário da ficha aberta na tela
// (essa modal não tem seletor de paciente — ver comentário de
// abrirModalTestarInfeccaoFerida) com algum efeito de infecção.
function itensMedicosParaInfeccao() {
    const inventario = estado.fichaAtual.inventario || {};
    return Object.entries(inventario)
        .filter(([, item]) => item && item.tag === "equipamento_medico")
        .map(([id, item]) => ({ id, item, efeitos: efeitosMedicosParaInfeccao(item) }))
        .filter(({ efeitos }) => efeitos.lista.length > 0);
}

// Modal de tratamento — Etapa 3: só o próprio personagem se tratando,
// então tratadorPericias/tratadorNome sempre vêm de estado.fichaAtual (sem
// seletor de paciente, que é a Etapa 4). Segue o mesmo padrão visual e
// de feedback (toast + registrarRolagem) do modal de Testar Infecção
// por ferida (abrirModalTestarInfeccaoFerida, mais abaixo).
// `alvo` (opcional): { fichaId, nome } do PACIENTE — usado pelo fluxo
// "Tratar outro jogador" (Etapa 4, ver abrirModalTratarOutroJogador).
// Sem isso, assume que é a própria ficha aberta (Etapa 3 — tratar a si
// mesmo). Quem ROLA o teste (perícias em tratadorPericias) é sempre
// estado.fichaAtual — a pessoa com a ficha aberta nesta tela — nunca o
// paciente, mesmo tratando outro jogador. O item de equipamento médico
// usado (Fase 4 do plano de efeitos médicos) segue a mesma regra: vem
// SEMPRE do inventário de estado.fichaAtual, nunca do paciente.
export function abrirModalTratarFerida(feridaId, acao, alvo) {
    const config = TRATAMENTOS_FERIDA[acao];
    if (!config) return;
    const tratandoOutro = !!alvo;
    const fichaAlvoId = tratandoOutro ? alvo.fichaId : estado.fichaAtualId;
    const nomeAlvo = tratandoOutro ? alvo.nome : (estado.fichaAtual?.dados?.nome || estado.fichaAtualId);

    // A própria ficha usa estado.feridasCache (já sincronizado pelo listener
    // dedicado); pra outro jogador, lê direto do snapshot ao vivo de
    // estado.todasAsFichasCache (raw, inclui o nó feridas — normalizarFicha não).
    const ferida = tratandoOutro
        ? Object.entries((estado.todasAsFichasCache[fichaAlvoId] || {}).feridas || {}).map(([id, v]) => ({ id, ...v })).find(f => f.id === feridaId)
        : estado.feridasCache.find(f => f.id === feridaId);
    if (!ferida) { toast("Essa ferida não existe mais.", "erro"); return; }

    let modal = document.getElementById("modal-tratar-ferida");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-tratar-ferida";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    // Info do plano (seção 6, item 3): mostra quais das perícias aceitas
    // pra ESSA ação você (estado.fichaAtual) tem e em que nível — só informativo,
    // já que tratarFerida() sempre usa a maior entre elas sozinho.
    const periciasComNivel = config.pericias.map(nome => {
        const entrada = Object.values(estado.fichaAtual.pericias || {}).find(p => p.nome === nome);
        return entrada ? `${nome} (nível ${Number(entrada.nivel) || 0})` : null;
    }).filter(Boolean);
    const infoPericias = periciasComNivel.length
        ? `Suas perícias que servem pra isso: ${periciasComNivel.join(", ")}.`
        : `Você não tem nenhuma das perícias aceitas (${config.pericias.join(" / ")}) — a rolagem conta como nível 0 nelas.`;

    // Itens de equipamento médico do SEU inventário (estado.fichaAtual — quem
    // está tratando) com algum efeito aplicável a essa ação — Fase 4 do
    // plano de efeitos médicos — OU um fator de tempo de recuperação
    // aplicável ao TIPO desta ferida — Fase 7. Só monta o seletor se
    // houver algum.
    const itensMedicos = itensMedicosParaTratamento(acao, ferida.tipo);

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${escapeHtml(config.label)}${tratandoOutro ? ` — ${escapeHtml(nomeAlvo)}` : ""} — ${tituloTipoFerida(ferida.tipo)}${ferida.local ? ` (${tituloLocalFerida(ferida.local)})` : ""}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Itens sugeridos pelo manual: ${escapeHtml(config.itensSugeridos)}.</p>
        <p class="hint">${escapeHtml(infoPericias)}</p>
        ${itensMedicos.length ? `
        <label style="display:block;margin-top:10px;">Usar item do inventário
            <select id="ferida-item-medico" style="width:100%;">
                <option value="">— nenhum, preencher à mão —</option>
                ${itensMedicos.map(({ id, item }) => {
                    const usos = Number.isFinite(Number(item.quantidade)) ? ` (${item.quantidade}x)` : "";
                    return `<option value="${id}">${escapeHtml(item.nome)}${usos}</option>`;
                }).join("")}
            </select>
            <span class="hint" style="display:block;">Escolher um item preenche os campos abaixo sozinho (item adequado, dificuldade, bônus) — tudo continua editável à mão depois. Ao confirmar (se o tratamento tiver sucesso), desconta 1 uso do item (se ele tiver número limitado de usos) e aplica o fator de tempo de recuperação dele, se tiver.</span>
        </label>
        ` : ""}
        <label style="display:block;margin-top:10px;">Item usado
            <select id="ferida-situacao-item" style="width:100%;">
                <option value="adequado">Item adequado (sem penalidade)</option>
                <option value="improvisado">Item improvisado (-1)</option>
                <option value="nenhum">Sem item (-2)</option>
            </select>
        </label>
        <label style="display:block;margin-top:10px;">Dificuldade (${config.dificuldadeMin}-${config.dificuldadeMax})
            <input type="number" id="ferida-dificuldade" value="${config.dificuldadeMin}" min="${config.dificuldadeMin}" max="${config.dificuldadeMax}" style="width:100%;">
        </label>
        <label style="display:block;margin-top:10px;">Bônus específico do item (ex: Kit de Sutura nível 3 = +2)
            <input type="number" id="ferida-modificador-extra" value="0" style="width:100%;">
        </label>
        <button type="button" class="btn-lime" id="btn-rolar-tratamento-ferida" style="margin-top:14px;width:100%;">Rolar tratamento</button>
        ${estado.isMestre && estado.godmodeAtivo ? `<button type="button" class="btn-lime" id="btn-tratamento-ferida-godmode" style="margin-top:8px;width:100%;">Tratar automaticamente (Godmode — sem teste nem item)</button>` : ""}
    `;
    const fechar = () => modal.remove();
    modal.querySelector(".combate-fechar").addEventListener("click", fechar);

    // Select de item médico (só existe se itensMedicos.length): ao
    // escolher, preenche sozinho item usado / dificuldade / bônus
    // específico (4.2 do plano) e troca o texto do botão principal
    // quando o item dá sucesso automático (4.3 — nesse caso o clique no
    // botão não rola nada, só aplica o sucesso direto).
    const selectItemMedico = modal.querySelector("#ferida-item-medico");
    const btnRolar = modal.querySelector("#btn-rolar-tratamento-ferida");
    const campoSituacaoItem = modal.querySelector("#ferida-situacao-item");
    const campoDificuldade = modal.querySelector("#ferida-dificuldade");
    const campoModificadorExtra = modal.querySelector("#ferida-modificador-extra");

    function itemMedicoSelecionado() {
        if (!selectItemMedico || !selectItemMedico.value) return null;
        return itensMedicos.find(({ id }) => id === selectItemMedico.value) || null;
    }

    function aplicarItemMedicoNosCampos() {
        const escolhido = itemMedicoSelecionado();
        if (!escolhido) {
            btnRolar.textContent = "Rolar tratamento";
            return;
        }
        const { item, efeitos } = escolhido;
        if (efeitos.isentaPenalidade) campoSituacaoItem.value = "adequado";
        if (efeitos.reducaoDificuldade) {
            const base = Number(campoDificuldade.value) || config.dificuldadeMin;
            campoDificuldade.value = Math.min(config.dificuldadeMax, Math.max(config.dificuldadeMin, base - efeitos.reducaoDificuldade));
        }
        if (efeitos.bonus) campoModificadorExtra.value = Number(campoModificadorExtra.value || 0) + efeitos.bonus;
        btnRolar.textContent = efeitos.sucessoAutomatico
            ? `Usar ${item.nome} (sucesso automático, sem rolar)`
            : "Rolar tratamento";
    }
    if (selectItemMedico) {
        selectItemMedico.addEventListener("change", aplicarItemMedicoNosCampos);
    }

    btnRolar.addEventListener("click", async () => {
        const escolhido = itemMedicoSelecionado();
        const situacaoItem = campoSituacaoItem.value;
        const dificuldadeEscolhida = Number(campoDificuldade.value) || config.dificuldadeMin;
        const modificadorExtra = Number(campoModificadorExtra.value) || 0;
        const nomeTratador = estado.fichaAtual?.dados?.nome || estado.fichaAtualId;
        try {
            const resultado = await tratarFerida(fichaAlvoId, feridaId, {
                acao, tratadorPericias: estado.fichaAtual.pericias, tratadorNome: nomeTratador,
                situacaoItem, dificuldadeEscolhida, modificadorExtra,
                sucessoAutomaticoItem: !!(escolhido && escolhido.efeitos.sucessoAutomatico),
                nomeItemUsado: escolhido ? escolhido.item.nome : ""
            });
            // Sucesso automático por item não passa por rolagem — não
            // tem resultado numérico pra registrar como rolagem no log
            // de dados, só o toast/histórico (mesmo padrão do Godmode).
            if (!resultado.sucessoAutomaticoItem) {
                await registrarRolagem({
                    quem: tratandoOutro ? `${nomeTratador} (tratando ${nomeAlvo})` : nomeTratador,
                    modificador: resultado.nivelPericia + resultado.penalidadeItem + resultado.modificadorExtra,
                    resultado: resultado.resultado, detalhe: resultado.detalhe
                });
            }
            if (escolhido) await decrementarItemMedico(escolhido.id);
            // Fase 7 do plano de efeitos médicos: tratamento bem-sucedido
            // com um item que tem fator de tempo de recuperação aplicável
            // ao tipo desta ferida — grava no PACIENTE (fichaAlvoId, não
            // em quem tratou), pra contar na próxima recuperação de PV
            // dele (ver aplicarFatoresRecuperacaoItens em regras.js).
            // Chave inclui id do item + timestamp pra não sobrescrever um
            // uso anterior do mesmo item (ex.: duas feridas tratadas com
            // a mesma Pomada Cicatrizante).
            let notaFatorRecuperacao = "";
            if (resultado.sucesso && escolhido && escolhido.efeitos.fatorRecuperacao) {
                const fatorEf = escolhido.efeitos.fatorRecuperacao;
                const chaveFator = `${escolhido.id}_${Date.now()}`;
                try {
                    await update(ref(db), {
                        [caminhoMesa(`fichas/${fichaAlvoId}/dados/fatoresRecuperacaoItens/${chaveFator}`)]: {
                            origem: escolhido.item.nome,
                            fator: Number(fatorEf.fator) || 1,
                            criadoEm: Date.now()
                        }
                    });
                    notaFatorRecuperacao = ` (${escolhido.item.nome} vai alterar o tempo da próxima recuperação de PV — fator ${fatorEf.fator})`;
                } catch (e) {
                    console.error(e);
                }
            }
            // Fase 8 do plano de efeitos médicos (Torniquete Tático,
            // limitação registrada como "sem automação" — só um
            // LEMBRETE pro Mestre, nunca dano automático): detecta pelo
            // NOME do item (normalizado, sem acento/maiúscula — não tem
            // efeito de catálogo dedicado pra isso) contendo "torniquete"
            // usado com sucesso em Estancar Sangramento. Grava no
            // PACIENTE (fichaAlvoId) o instante (em horas contínuas de
            // calendário) em que foi aplicado — ver avisoTorniqueteDevido
            // em mestre.js, checado a cada Passar o Dia/Timeskip.
            let notaTorniquete = "";
            if (resultado.sucesso && acao === "estancar_sangramento" && escolhido
                && normalizarTextoBusca(escolhido.item.nome).includes("torniquete")
                && estado.calendarioAtual && estado.calendarioAtual.diaIndice !== undefined && estado.calendarioAtual.diaIndice !== null) {
                const horasAgoraTorniquete = horasTotaisCalendario(estado.calendarioAtual.diaIndice, estado.calendarioAtual.hora);
                try {
                    await update(ref(db), {
                        [caminhoMesa(`fichas/${fichaAlvoId}/dados/torniquete`)]: {
                            ativoDesde: horasAgoraTorniquete, feridaId, avisado: false,
                            itemNome: escolhido.item.nome
                        }
                    });
                    notaTorniquete = ` (torniquete aplicado — o Mestre recebe um lembrete se passar 1h de jogo sem removê-lo)`;
                } catch (e) {
                    console.error(e);
                }
            }
            toast((tratandoOutro ? `${nomeAlvo}: ${resultado.detalhe}` : resultado.detalhe) + notaFatorRecuperacao + notaTorniquete, resultado.sucesso ? undefined : "erro");
            fechar();
        } catch (e) {
            toast(e.message || "Falha ao tratar a ferida.", "erro");
        }
    });
    // Godmode: sucesso automático, sem rolar d20, sem perícia e sem
    // olhar pro item usado — só o Mestre vê esse botão (checado tanto
    // aqui quanto na hora de montar o HTML acima), então tratarFerida()
    // não precisa reconferir a permissão.
    const btnGodmode = modal.querySelector("#btn-tratamento-ferida-godmode");
    if (btnGodmode) {
        btnGodmode.addEventListener("click", async () => {
            const nomeTratador = estado.fichaAtual?.dados?.nome || estado.fichaAtualId;
            try {
                const resultado = await tratarFerida(fichaAlvoId, feridaId, {
                    acao, tratadorNome: `${nomeTratador} (Godmode)`, godmode: true
                });
                toast(tratandoOutro ? `${nomeAlvo}: ${resultado.detalhe}` : resultado.detalhe);
                fechar();
            } catch (e) {
                toast(e.message || "Falha ao tratar a ferida.", "erro");
            }
        });
    }
}

// Modal "Testar Infecção" por ferida (Etapa 5 do plano): substitui o
// antigo abrirModalTestarInfeccao (que rodava sobre um participante de
// combate solto). Só o Mestre abre (ver botaoTestarInfeccao em
// renderizarSaude), sempre sobre a ficha atualmente aberta na tela —
// não tem seletor de paciente porque a aba Saúde já está mostrando a
// ficha de um personagem específico. `testarInfeccaoFerida` (saude.js)
// já aplica a dificuldade final (base - modificador de itens) e marca
// infeccaoAtiva/infeccaoGarantida na ferida em caso de falha.
export function abrirModalTestarInfeccaoFerida(feridaId) {
    const ferida = estado.feridasCache.find(f => f.id === feridaId);
    if (!ferida) { toast("Essa ferida não existe mais.", "erro"); return; }
    const nomeFicha = estado.fichaAtual?.dados?.nome || estado.fichaAtualId;

    // Modificadores estruturados que miram "dificuldade:infeccao" (ver
    // regras.js, listaAlvosModificador): mesma ideia do checkbox de
    // Ocasião Especial já usado nas perícias, só que aplicado a essa
    // dificuldade em vez de somar na rolagem. O que já está permanente
    // (não-ocasional) ou já ligado no cadastro entra automaticamente na
    // conta; os "ocasionais" ganham um checkbox aqui no modal pra ligar/
    // desligar antes de rolar, sem precisar abrir o item/vantagem/
    // especialização de origem.
    const modificadoresPlanos = modificadoresAtuais();
    const somaAtual = somaModificadoresPara("dificuldade:infeccao", modificadoresPlanos);
    const ocasionaisInfeccao = modificadoresOcasionaisDoAlvo(estado.fichaAtual, "dificuldade:infeccao");
    const somaOcasionaisJaLigados = ocasionaisInfeccao.filter(o => o.ativo).reduce((acc, o) => acc + o.valor, 0);
    // Parte permanente = tudo que soma independente do checkbox (itens/
    // vantagens sem "Ocasião especial" marcada) — serve de base pra
    // recalcular ao vivo quando o Mestre mexe nos checkboxes abaixo, sem
    // precisar esperar o round-trip do Firebase.
    const basePermanenteInfeccao = somaAtual - somaOcasionaisJaLigados;

    // Itens de equipamento médico com efeito de infecção (Fase 5 do
    // plano de efeitos médicos) — reduz dificuldade e/ou isenta o teste
    // inteiro (ex.: Soro Fisiológico, Cicatrizador Dérmico).
    const itensMedicosInfeccao = itensMedicosParaInfeccao();

    let modal = document.getElementById("modal-testar-infeccao-ferida");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-testar-infeccao-ferida";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const ocasionaisHtml = ocasionaisInfeccao.length ? `
        <div class="pericia-ocasionais" style="margin-top:10px;">
            ${ocasionaisInfeccao.map((o, idx) => {
                const efeito = o.valor >= 0 ? `reduz a dificuldade em ${o.valor}` : `aumenta a dificuldade em ${Math.abs(o.valor)}`;
                return `
                <label class="checkbox-inline pericia-ocasional-item" title="${escapeHtml(o.origem)} — só entra na conta enquanto marcado">
                    <input type="checkbox" class="infeccao-ocasional-check" data-idx="${idx}" ${o.ativo ? "checked" : ""}>
                    ${escapeHtml(o.origem)} (${efeito})
                </label>
            `;
            }).join("")}
        </div>
    ` : "";
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Infecção — ${escapeHtml(nomeFicha)} — ${tituloTipoFerida(ferida.tipo)}${ferida.local ? ` (${tituloLocalFerida(ferida.local)})` : ""}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Manual: dificuldade 18 fixa pra tratamento malfeito/ambiente sujo (não isolar o ferimento, mãos/equipamento não esterilizados); ${DIFICULDADE_INFECCAO_MINIMA} a ${DIFICULDADE_INFECCAO_MAXIMA} pra ferimento profundo/grave, mesmo com tratamento adequado — esse teste se repete uma vez por cena até receber tratamento médico. Itens como Soro Fisiológico reduzem a dificuldade em -2.</p>
        ${itensMedicosInfeccao.length ? `
        <label style="display:block;margin-top:10px;">Usar item do inventário
            <select id="ferida-infeccao-item-medico" style="width:100%;">
                <option value="">— nenhum, preencher à mão —</option>
                ${itensMedicosInfeccao.map(({ id, item }) => {
                    const usos = Number.isFinite(Number(item.quantidade)) ? ` (${item.quantidade}x)` : "";
                    return `<option value="${id}">${escapeHtml(item.nome)}${usos}</option>`;
                }).join("")}
            </select>
            <span class="hint" style="display:block;">Escolher um item soma a redução de dificuldade dele ao modificador abaixo, ou isenta o teste inteiro se o item isentar infecção. Ao confirmar, desconta 1 uso do item (se ele tiver número limitado de usos).</span>
        </label>
        ` : ""}
        <label style="display:block;margin-top:10px;">Dificuldade base (${DIFICULDADE_INFECCAO_MINIMA}-${DIFICULDADE_INFECCAO_MAXIMA})
            <input type="number" id="ferida-infeccao-dificuldade" value="${DIFICULDADE_INFECCAO_MINIMA}" min="1" style="width:100%;">
        </label>
        <label style="display:block;margin-top:10px;">Modificador de itens/tratamento (ex: -2 com Soro Fisiológico)
            <input type="number" id="ferida-infeccao-modificador" value="${basePermanenteInfeccao + somaOcasionaisJaLigados}" style="width:100%;">
            <span class="hint" style="display:block;">Pré-preenchido a partir dos modificadores cadastrados na ficha (vantagens/especializações/itens mirando "Dificuldade: Resistir a Infecção") — ainda editável à mão se precisar ajustar.</span>
        </label>
        ${ocasionaisHtml}
        <label style="display:block;margin-top:10px;">Origem / observação
            <input type="text" id="ferida-infeccao-origem" placeholder="Ex: ferimento de bala no torso, tratado sem esterilizar" style="width:100%;">
        </label>
        <button type="button" class="btn-lime" id="btn-rolar-teste-infeccao-ferida" style="margin-top:14px;width:100%;">Rolar teste de Constituição</button>
    `;
    const fechar = () => modal.remove();
    modal.querySelector(".combate-fechar").addEventListener("click", fechar);

    const campoModificador = modal.querySelector("#ferida-infeccao-modificador");
    modal.querySelectorAll(".infeccao-ocasional-check").forEach(chk => {
        chk.addEventListener("change", () => {
            const o = ocasionaisInfeccao[Number(chk.dataset.idx)];
            o.ativo = chk.checked;
            // Persiste o toggle (mesma função usada pelas perícias — ver
            // alternarModificadorOcasional) e recalcula o campo na hora,
            // sem esperar o listener em tempo real re-renderizar a ficha.
            alternarModificadorOcasional(o, chk.checked);
            const somaOcasionaisAgora = ocasionaisInfeccao.filter(x => x.ativo).reduce((acc, x) => acc + x.valor, 0);
            campoModificador.value = basePermanenteInfeccao + somaOcasionaisAgora;
        });
    });

    // Select de item médico (só existe se itensMedicosInfeccao.length):
    // ao escolher, soma a redução ao campo de modificador já preenchido
    // e troca o texto do botão quando o item isenta o teste inteiro
    // (Fase 5.1 — nesse caso o clique não rola nada, só marca resistido
    // direto).
    const selectItemInfeccao = modal.querySelector("#ferida-infeccao-item-medico");
    const btnRolarInfeccao = modal.querySelector("#btn-rolar-teste-infeccao-ferida");
    const campoDificuldadeInfeccao = modal.querySelector("#ferida-infeccao-dificuldade");

    function itemInfeccaoSelecionado() {
        if (!selectItemInfeccao || !selectItemInfeccao.value) return null;
        return itensMedicosInfeccao.find(({ id }) => id === selectItemInfeccao.value) || null;
    }

    if (selectItemInfeccao) {
        selectItemInfeccao.addEventListener("change", () => {
            const escolhido = itemInfeccaoSelecionado();
            if (!escolhido) {
                btnRolarInfeccao.textContent = "Rolar teste de Constituição";
                return;
            }
            const { item, efeitos } = escolhido;
            if (efeitos.reducaoDificuldade) {
                campoModificador.value = Number(campoModificador.value || 0) + efeitos.reducaoDificuldade;
            }
            btnRolarInfeccao.textContent = efeitos.isentaInfeccao
                ? `Usar ${item.nome} (isenta o teste, sem rolar)`
                : "Rolar teste de Constituição";
        });
    }

    btnRolarInfeccao.addEventListener("click", async () => {
        const escolhido = itemInfeccaoSelecionado();
        const dificuldadeBase = Number(campoDificuldadeInfeccao.value) || DIFICULDADE_INFECCAO_MINIMA;
        const modificadorItens = Number(campoModificador.value) || 0;
        const origem = modal.querySelector("#ferida-infeccao-origem").value.trim() || "Complicação de ferimento";
        try {
            const resultado = (escolhido && escolhido.efeitos.isentaInfeccao)
                ? await isentarInfeccaoFerida(estado.fichaAtualId, feridaId, origem, escolhido.item.nome)
                : await testarInfeccaoFerida(estado.fichaAtualId, feridaId, dificuldadeBase, modificadorItens, origem);
            // Isenção não passa por rolagem — não tem resultado numérico
            // pra registrar como rolagem no log de dados, só o toast/
            // histórico (mesmo padrão do sucesso automático de item em
            // Tratar Ferida).
            if (resultado.bruto !== null) {
                await registrarRolagem({ quem: nomeFicha, modificador: resultado.modConstituicao, resultado: resultado.resultado, detalhe: resultado.detalhe });
            }
            if (escolhido) await decrementarItemMedico(escolhido.id);
            toast(resultado.detalhe, resultado.sucesso ? undefined : "erro");
            fechar();
        } catch (e) {
            toast(e.message || "Falha ao testar infecção.", "erro");
        }
    });
}

// =====================================================================
// AVISO DE CUSTO DE VIDA (Domingo)
// =====================================================================

export function configurarAvisoCustoVida() {
    ouvirAvisoCustoVida((pendentes) => {
        estado.ultimoAvisoCustoVida = pendentes || {};
        avaliarAvisoCustoVida();
    });

    el.custoVidaConfirmar.addEventListener("click", async () => {
        if (!estado.fichaAtual || !estado.fichaAtualId) return;
        const saldoId = el.custoVidaOrigem.value;
        const saldo = todosOsSaldos(estado.fichaAtual).find(s => s.id === saldoId);
        if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
        const pendenteId = el.modalCustoVida.dataset.pendenteId || "";
        const total = await pagarCustoSemanal(estado.fichaAtualId, estado.fichaAtual, saldoId, pendenteId);
        toast(`Pago CN$ ${total} (${saldo.nome}).`);
        el.modalCustoVida.classList.remove("active");
        // Não precisa chamar avaliarAvisoCustoVida aqui na mão: o
        // listener da ficha (onValue, linha ~774) vai ecoar esse
        // pagamento (custoVidaPagos/{pendenteId} recém-marcado) e disparar
        // avaliarAvisoCustoVida de novo sozinho — se sobrar mais algum
        // pendente na fila (ex.: Timeskip que atravessou 2+ Domingos), o
        // modal reabre automaticamente pro próximo.
    });
}
