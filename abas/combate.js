// abas/combate.js
// ---------------------------------------------------------------------
// Aba Combate (parte 1: exibição) — lista de armas do inventário
// prontas pra usar em combate (renderizarCombate) e as Manobras de
// combate do manual (renderizarManobrasCombate: Esquivar, Agarrar,
// Desarmar, Derrubar, Arremessar, Imobilizar (CQC/Jiu Jitsu), Quebrar
// ossos, Delimitar/Retomar alcance e os golpes desarmados com dano
// automatizável — Soco/Chute/Joelhada/Cotovelada). configurarCombateAtivo
// ouve o combate ativo (estado.combateAtivoCache) e mantém a tela do
// jogador sincronizada (alerta de iniciativa, trava de ações fora do
// turno, status do carrossel do topo); configurarAvisoTorniquete cuida
// da fila de avisos do Mestre sobre torniquetes aplicados há muito
// tempo (Fase 8 do plano de efeitos de equipamentos médicos).
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 22). Preservei de propósito um detalhe do código original em
// configurarCombateAtivo: o parâmetro do callback de ouvirCombateAtivo
// se chama `estado`, sombreando o `estado` do módulo — já existia assim
// antes da extração, não é coisa nova daqui.
//
// Passo 23 (parte 2: gerenciador do mestre) trouxe pra cá
// renderizarAlertaIniciativaCombate, montarPainelIniciativaJogador
// (jogador) e montarGerenciadorCombate (Mestre — adicionar/remover
// participante, iniciar/avançar/encerrar iniciativa, criar NPC direto
// pra dentro do combate). travarAcoesForaDoTurno e avaliarReacaoPendente
// ficaram de fora de propósito (não estão na lista do Passo 23) e
// continuam em ficha.js, só exportadas — mesmo critério dos passos
// anteriores. O sistema de resolução de combate em si (todas as
// funções "abrirModalSelecionarAlvoX", "executarManobraEsquivar",
// "combateTemParticipantes", "penalidadeEnergiaPara", a fila de Ações
// Pendentes — montarPainelAcoesPendentes — e o formulário de NPC
// detalhado — montarFormularioNpcDetalhado, usado também pelo Painel de
// NPCs, Passo 28) ainda não foi modularizado — continuam em ficha.js,
// só com `export` adicionado onde faltava pra este arquivo importar.
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import {
    el, escapeHtml, toast, abrirModalEdicao, alternarEquipadaItem, armaUsaCarregador,
    carregarCamaraArma, iniciarUsoItem, modificadoresAtuais, penalidadeEnergiaParaPericia,
    penalidadeTestesAtual, recarregarArma, retirarCarregadorArma,
    rolarComPossibilidadeDeOcasionais, abrirModalArremessar, abrirModalQuebrarOssosJJ,
    abrirModalSelecionarAlvo, abrirModalSelecionarAlvoAgarrar, abrirModalSelecionarAlvoDelimitar,
    abrirModalSelecionarAlvoDerrubar, abrirModalSelecionarAlvoDesarmar,
    abrirModalSelecionarAlvoImobilizar, abrirModalSelecionarAlvoImobilizarJJ,
    abrirModalSelecionarAlvoRetomar, combateTemParticipantes, executarManobraEsquivar,
    penalidadeEnergiaPara, avaliarReacaoPendente, travarAcoesForaDoTurno,
    abrirModalBonusIniciativaCQC, abrirModalDispararAvancar, badgeEstadoEnergiaCombate,
    badgeEstadoSaudeCombate, badgeInfeccaoCombate, badgeStatusAtivosCombate,
    combateComIniciativaAtivo, criarSelectFichas, meuParticipanteIdCombate,
    nomeDeFicha,
    npcParticipanteIdCombate, resetarDisparosTurno, tentarLevantarDerrubado,
    tentarLibertarImobilizado
} from "../ficha.js?v=20260830-npcnivelpv";
import { montarPainelAcoesPendentes } from "../mestre/acoes-pendentes.js";
import { montarFormularioNpcDetalhado } from "../mestre/npcs.js";
import { calcularDanoDesarmado, calcularTotalPericia } from "../regras.js";
import {
    TIPOS_DANO, ESCALAS_ARMA, MANOBRAS_COMBATE, MANOBRA_ARREMESSAR_CQC,
    MANOBRA_IMOBILIZAR_CQC, MANOBRA_IMOBILIZAR_JIUJITSU, MANOBRA_QUEBRAR_OSSOS_JIUJITSU,
    bonusCQCDesarmar, bonusEsquivaBoxe, calcularEspecificidadeGolpe, ehArmaDeFogo,
    ehGolpeDesarmadoComDano, rotuloAlcanceArmaFogo, rotuloCalibre, rotuloClasseProtecao,
    rotuloPadraoRecuo
} from "../dados-manual.js";
import {
    itemPodeEquipar, itemPodeSerLevadoSolto, itemPodeUsar, listaArmasInventario, maosDisponiveis
} from "../inventario.js";
import { atualizarStatusTopoCarrossel } from "./atributos.js";
import {
    ouvirCombateAtivo, ouvirAvisoTorniquete, descartarAvisoTorniquete,
    adicionarParticipanteCombate, avancarTurnoCombate, curarOssosQuebrados, encerrarCombate,
    iniciarIniciativaCombate, participantesElegiveisCQCIniciativa, removerParticipanteCombate,
    soltarAgarrado, soltarDesacordado, ouvirNpcs
} from "../mestre.js?v=20260830-npcnivelpv";

// ---------------------------------------------------------------------
// COMBATE
// ---------------------------------------------------------------------
export function renderizarCombate() {
    const modificadoresPlanos = modificadoresAtuais();
    const armas = listaArmasInventario(estado.fichaAtual);
    el.listaArmasCombate.innerHTML = "";
    if (!armas.length) {
        el.listaArmasCombate.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nenhuma arma no inventário ainda.</li>`;
    } else {
        armas.forEach(arma => {
            const li = document.createElement("li");
            const cfg = arma.arma || {};
            const tipoDano = TIPOS_DANO.find(t => t.key === cfg.tipoDano);
            const tipoDanoExtraInfo = cfg.tipoDanoExtra ? TIPOS_DANO.find(t => t.key === cfg.tipoDanoExtra) : null;
            const escala = ESCALAS_ARMA.find(e => e.key === cfg.escala);
            const mods = (cfg.modificacoesArma || []).join(", ");
            const podeUsar = itemPodeUsar(arma) && !!arma.periciaUso;
            const equipadaArma = !!arma.equipada;
            // Sistema de Slots de Porte (Fase 8) — este botão é um segundo
            // caminho pra equipar/desequipar a mesma arma (fora da lista
            // principal do Inventário), então precisa respeitar a mesma
            // trava de mãos livres que o botão de lá já respeita (ver
            // criarLiItem/semMaosLivres) — senão dava pra empunhar uma
            // arma de 2 mãos aqui mesmo sem mão livre sobrando.
            const maosNecessariasArma = Number(arma.maosNecessarias) || 1;
            const maosLivresCombate = maosDisponiveis(estado.fichaAtual);
            const semMaosLivresArma = !equipadaArma && maosLivresCombate < maosNecessariasArma;
            const podeEquiparArma = itemPodeEquipar(arma) && !semMaosLivresArma;
            const periciaLabel = arma.periciaUso ? ` · Perícia: ${escapeHtml(arma.periciaUso)}` : " · Sem perícia vinculada";
            const classeLabel = arma.classeProtecao ? ` · Classe de Proteção ${escapeHtml(rotuloClasseProtecao(arma.classeProtecao))}` : "";
            const calibreLabel = arma.calibre ? ` · Calibre ${escapeHtml(rotuloCalibre(arma.calibre))}` : "";
            const ehFogo = ehArmaDeFogo(arma.periciaUso);
            const semCarregador = ehFogo && !armaUsaCarregador(arma);
            const carregadorAnexado = (ehFogo && cfg.carregadorId) ? estado.fichaAtual.inventario?.[cfg.carregadorId] : null;
            const temCamaraExtraArma = ehFogo && !!cfg.temCamaraExtra;
            const camaraCarregadaArma = temCamaraExtraArma && !!cfg.camaraCarregada;
            const municaoLabel = ehFogo
                ? (semCarregador
                    ? ` · Munição: ${cfg.carregadorInterno?.municaoAtual || 0}/${cfg.carregadorInterno?.capacidadeMax || 0}`
                    : (carregadorAnexado
                        ? ` · Munição: ${carregadorAnexado.carregador?.municaoAtual || 0}/${carregadorAnexado.carregador?.capacidadeMax || 0}`
                        : " · Sem carregador anexado"))
                : "";
            const camaraLabelCombate = temCamaraExtraArma ? ` · Câmara: ${camaraCarregadaArma ? "carregada (+1)" : "vazia"}` : "";
            const fogoLabel = ehFogo
                ? ` · Dif. acerto ${cfg.dificuldadeAcerto ?? "—"} · Alcance ${rotuloAlcanceArmaFogo(cfg.alcance)} · Recuo: ${rotuloPadraoRecuo(cfg.recuo)}${cfg.precisao ? ` · Precisão ${cfg.precisao >= 0 ? "+" : ""}${cfg.precisao}` : ""}${municaoLabel}${camaraLabelCombate}`
                : "";
            li.innerHTML = `
                <div class="entity-main">
                    <span class="entity-nome">${escapeHtml(arma.nome)} <span class="mod-pill tag">nível ${arma.nivelTag || "?"}</span></span>
                    <span class="entity-sub">Dano base: ${cfg.danoBase ?? 0}${tipoDano ? " · " + tipoDano.label : ""}${escala ? " · " + escala.label : ""}${tipoDanoExtraInfo ? ` · ou ${tipoDanoExtraInfo.label} (escolhido no ataque)` : ""}${periciaLabel}${classeLabel}${calibreLabel}${fogoLabel}</span>
                    ${mods ? `<span class="entity-sub">Modificações: ${escapeHtml(mods)}</span>` : ""}
                    ${cfg.efeitoExtra ? `<span class="entity-sub">Efeito extra: ${escapeHtml(cfg.efeitoExtra)}</span>` : ""}
                </div>
                <div class="entity-badges">
                    ${(ehFogo && (semCarregador ? (Number(cfg.carregadorInterno?.municaoAtual) || 0) > 0 : !!carregadorAnexado)) ? `<span class="mod-pill positivo" title="${semCarregador ? "Tem munição carregada no tambor/câmara" : "Tem um carregador anexado"}">🔵 Carregada</span>` : ""}
                    ${camaraCarregadaArma ? `<span class="mod-pill positivo" title="Tem 1 bala na agulha, além do carregador">🔵 +1 na agulha</span>` : ""}
                    <button type="button" class="btn-toggle-equipada ${equipadaArma ? "ligado" : "desligado"}" ${podeEquiparArma ? "" : "disabled"} title="${!itemPodeEquipar(arma) ? "Precisa estar em 'Levando consigo' pra equipar" : (semMaosLivresArma ? `Sem mãos livres (${maosLivresCombate}/2)` : (equipadaArma ? "Empunhada agora — clique pra desequipar" : "Desequipada — clique pra empunhar e poder usar em combate"))}">${equipadaArma ? "🗡️ Equipada" : "○ Desequipada"}</button>
                    <button type="button" class="btn-usar-item btn-blue" data-quick-key="arma:${escapeHtml(arma.id)}" ${podeUsar ? "" : "disabled"} title="${podeUsar ? `Rolar d20 + ${arma.periciaUso}` : (equipadaArma ? "Precisa estar em 'Levando consigo' e ter perícia vinculada" : "Equipe a arma pra poder usá-la em combate")}">Usar</button>
                    ${ehFogo ? `<button type="button" class="btn-recarregar-item btn-blue" ${podeUsar ? "" : "disabled"} title="${semCarregador ? "Encher o tambor/câmara com munição solta compatível do inventário" : "Trocar o carregador anexado por um com mais munição"}">Recarregar</button>` : ""}
                    ${(ehFogo && !semCarregador) ? `<button type="button" class="btn-retirar-carregador-item btn-ghost" ${(podeUsar && carregadorAnexado) ? "" : "disabled"} title="Retirar o carregador anexado e devolvê-lo ao inventário">Retirar carregador</button>` : ""}
                    ${(ehFogo && temCamaraExtraArma) ? `<button type="button" class="btn-carregar-camara-item btn-ghost" ${(podeUsar && !camaraCarregadaArma) ? "" : "disabled"} title="Carregar 1 projétil direto na câmara, do estoque em 'Levando consigo'">Bala na agulha</button>` : ""}
                </div>
            `;
            li.querySelector(".btn-toggle-equipada").addEventListener("click", (e) => {
                e.stopPropagation();
                const querEquiparArma = !equipadaArma;
                if (querEquiparArma) {
                    if (!podeEquiparArma) return;
                } else if (!itemPodeSerLevadoSolto(estado.fichaAtual, { ...arma, equipada: false })) {
                    // Mesma trava do passo 17 (ver criarLiItem) — desequipar
                    // aqui é o mesmo botão do Painel de Combate pra essa arma.
                    toast(`Pra guardar "${arma.nome}" primeiro coloque-a dentro de outro recipiente ou mova-a pra outra categoria — solta em "Levando consigo" ela precisa continuar equipada.`, "erro");
                    return;
                }
                alternarEquipadaItem(arma.id, querEquiparArma, arma.nome);
            });
            li.querySelector(".btn-usar-item").addEventListener("click", async (e) => {
                e.stopPropagation();
                if (!podeUsar) return;
                await iniciarUsoItem(arma, modificadoresPlanos);
            });
            const btnRecarregarCombate = li.querySelector(".btn-recarregar-item");
            if (btnRecarregarCombate) {
                btnRecarregarCombate.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await recarregarArma(arma.id, arma);
                });
            }
            const btnRetirarCarregadorCombate = li.querySelector(".btn-retirar-carregador-item");
            if (btnRetirarCarregadorCombate) {
                btnRetirarCarregadorCombate.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (!carregadorAnexado) return;
                    await retirarCarregadorArma(arma.id, arma);
                });
            }
            const btnCarregarCamaraCombate = li.querySelector(".btn-carregar-camara-item");
            if (btnCarregarCamaraCombate) {
                btnCarregarCamaraCombate.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    if (camaraCarregadaArma) return;
                    await carregarCamaraArma(arma.id, arma);
                });
            }
            li.addEventListener("click", () => abrirModalEdicao("inventario", arma.id));
            el.listaArmasCombate.appendChild(li);
        });
    }

    renderizarManobrasCombate();
}

// Manobras de combate (lista fixa do manual). Cada perícia listada na
// manobra que o jogador de fato possui na ficha vira um botão — clicar
// nela rola d20 + o total daquela perícia e registra no Log de Dados.
// Perícias que o jogador não tem ficam só como texto (não clicáveis).
export function renderizarManobrasCombate() {
    if (!el.listaManobrasCombate) return;
    const modificadoresPlanos = modificadoresAtuais();
    el.listaManobrasCombate.innerHTML = "";

    // "Arremessar" (CQC nível 3+) e "Imobilizar" (CQC nível 4+) não são
    // manobras "de qualquer perícia" do manual — são exclusivas de quem
    // tem o nível, por isso só entram na lista quando o personagem
    // atende o requisito (ver MANOBRA_ARREMESSAR_CQC/MANOBRA_IMOBILIZAR_CQC
    // em dados-manual.js).
    const entradaCQCLista = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
    const nivelCQCLista = entradaCQCLista ? (Number(entradaCQCLista[1].nivel) || 0) : 0;
    // Mesma ideia acima, pra Jiu Jitsu (manual pg. 22 — ver
    // MANOBRA_IMOBILIZAR_JIUJITSU/MANOBRA_QUEBRAR_OSSOS_JIUJITSU em
    // dados-manual.js): "Imobilizar (Jiu Jitsu)" nível 2+, "Quebrar
    // ossos" nível 4+.
    const entradaJJLista = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "Jiu Jitsu");
    const nivelJJLista = entradaJJLista ? (Number(entradaJJLista[1].nivel) || 0) : 0;
    const manobrasParaExibir = [...MANOBRAS_COMBATE];
    if (nivelCQCLista >= 3) manobrasParaExibir.push(MANOBRA_ARREMESSAR_CQC);
    if (nivelCQCLista >= 4) manobrasParaExibir.push(MANOBRA_IMOBILIZAR_CQC);
    if (nivelJJLista >= 2) manobrasParaExibir.push(MANOBRA_IMOBILIZAR_JIUJITSU);
    if (nivelJJLista >= 4) manobrasParaExibir.push(MANOBRA_QUEBRAR_OSSOS_JIUJITSU);

    manobrasParaExibir.forEach(m => {
        const li = document.createElement("li");

        // "Esquivar" não usa uma perícia treinável — é Agilidade (o
        // atributo secundário) contra a pontuação do ataque sofrido.
        // Por isso tem um botão fixo próprio em vez de percorrer
        // m.pericias (que ficaria em branco/"Sem Perícia", já que
        // "Agilidade" nunca bate com o nome de nenhuma perícia
        // cadastrada) e sem o fallback "Sem Perícia" (não existe
        // "Agilidade destreinada" — todo personagem tem o atributo).
        const ehEsquivar = m.nome === "Esquivar";
        // "Arremessar" também não tem fallback "Sem Perícia" — é
        // exclusiva de CQC nível 3+, não existe "versão destreinada".
        const ehArremessar = m.nome === "Arremessar";
        // "Imobilizar" também não tem fallback "Sem Perícia" — é
        // exclusiva de CQC nível 4+, não existe "versão destreinada".
        const ehImobilizar = m.nome === "Imobilizar";
        // "Imobilizar (Jiu Jitsu)" — exclusiva de Jiu Jitsu nível 2+
        // (manual: "usuário pode escolher entre usar a perícia Jiu
        // Jitsu, Força ou Destreza"), por isso 3 botões em vez de 1.
        const ehImobilizarJJ = m.nome === "Imobilizar (Jiu Jitsu)";
        // "Quebrar ossos" — exclusiva de Jiu Jitsu nível 4+, sem
        // rolagem (automática contra quem já está Imobilizado por você).
        const ehQuebrarOssosJJ = m.nome === "Quebrar ossos";
        const periciasHtml = ehEsquivar
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Agilidade" data-quick-key="manobra:${escapeHtml(m.nome)}:Agilidade" title="Rolar d20 + Agilidade">Agilidade 🎲</button>`
            : (ehArremessar || ehImobilizar)
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="CQC" data-quick-key="manobra:${escapeHtml(m.nome)}:CQC" title="Rolar d20 + CQC">CQC 🎲</button>`
            : ehImobilizarJJ
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Jiu Jitsu" data-quick-key="manobra:${escapeHtml(m.nome)}:Jiu Jitsu" title="Rolar d20 + Jiu Jitsu">Jiu Jitsu 🎲</button>
               <button type="button" class="btn-pericia-golpe" data-pericia-golpe="Força" data-quick-key="manobra:${escapeHtml(m.nome)}:Força" title="Rolar d20 + Força">Força 🎲</button>
               <button type="button" class="btn-pericia-golpe" data-pericia-golpe="Destreza" data-quick-key="manobra:${escapeHtml(m.nome)}:Destreza" title="Rolar d20 + Destreza">Destreza 🎲</button>`
            : ehQuebrarOssosJJ
            ? `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="Quebrar Ossos" data-quick-key="manobra:${escapeHtml(m.nome)}:Quebrar Ossos" title="Aplicar dano automático de Quebrar ossos">Quebrar ossos 🦴</button>`
            : m.pericias.map(nomePericia => {
                const entrada = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
                if (!entrada) return `<span class="manobra-pericia-texto">${escapeHtml(nomePericia)}</span>`;
                return `<button type="button" class="btn-pericia-golpe" data-pericia-golpe="${escapeHtml(nomePericia)}" data-quick-key="manobra:${escapeHtml(m.nome)}:${escapeHtml(nomePericia)}" title="Rolar d20 + ${nomePericia}">${escapeHtml(nomePericia)} 🎲</button>`;
            }).join(", ") + ` <button type="button" class="btn-pericia-golpe btn-ghost" data-pericia-golpe="Sem Perícia" data-quick-key="manobra:${escapeHtml(m.nome)}:Sem Perícia" title="Rolar sem perícia treinada (-1 fixo)">Sem Perícia 🎲</button>`;

        // Boxe dá bônus passivo pra esquivar desarmado (+2) e contra
        // armas brancas (+1) — manual pg. 22. Mostramos o bônus já
        // calculado pra referência (a rolagem em si soma Agilidade, ver
        // botão acima; o bônus de Boxe entra como parte do modificador
        // de Agilidade se você já tiver isso configurado como
        // modificador estruturado — aqui é só o texto informativo).
        let efeitoTexto = m.efeito;
        if (m.nome === "Esquivar") {
            const entradaBoxe = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "Boxe");
            const bonus = entradaBoxe ? bonusEsquivaBoxe(entradaBoxe[1].nivel) : null;
            if (bonus) {
                efeitoTexto += ` · Bônus de Boxe: +${bonus.desarmado} vs. golpe desarmado, +${bonus.armaBranca} vs. arma branca`;
            }
        }
        if (m.nome === "Desarmar") {
            const entradaCQC = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
            const nivelCQC = entradaCQC ? (Number(entradaCQC[1].nivel) || 0) : 0;
            const bonusCQC = bonusCQCDesarmar(nivelCQC);
            if (bonusCQC) {
                efeitoTexto += ` · CQC nível ${nivelCQC}: +${bonusCQC} rolando com CQC`;
            }
        }

        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(m.nome)}</span>
                <span class="entity-sub manobra-pericias-linha">${periciasHtml} · dif.: ${escapeHtml(m.dificuldade)}</span>
                <span class="entity-sub">${escapeHtml(efeitoTexto)}</span>
            </div>
            <span class="manobra-alcance">${escapeHtml(m.alcance)}</span>
        `;

        li.querySelectorAll("[data-pericia-golpe]").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                e.stopPropagation();

                if (ehEsquivar) {
                    await executarManobraEsquivar(modificadoresPlanos);
                    return;
                }

                // Imobilizar (Jiu Jitsu) — nível 2+ (manual: "usuário
                // pode escolher entre usar a perícia Jiu Jitsu, Força ou
                // Destreza"). Força/Destreza são ATRIBUTOS puros, não
                // batem com nenhuma entrada de estado.fichaAtual.pericias, por
                // isso trata antes do lookup/early-return padrão logo
                // abaixo (que mataria o clique nesses dois botões).
                if (ehImobilizarJJ) {
                    if (!combateTemParticipantes()) {
                        toast("Imobilizar (Jiu Jitsu) precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const nomeBase = btn.dataset.periciaGolpe;
                    let modificador;
                    if (nomeBase === "Jiu Jitsu") {
                        const entradaJJ = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "Jiu Jitsu");
                        if (!entradaJJ) return;
                        modificador = calcularTotalPericia(entradaJJ[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia("Jiu Jitsu")).total;
                    } else {
                        const atributo = nomeBase === "Força" ? "forca" : "destreza";
                        modificador = (Number(estado.fichaAtual.dados[atributo]) || 0) + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica");
                    }
                    abrirModalSelecionarAlvoImobilizarJJ(nomeBase, modificador, nivelJJLista);
                    return;
                }

                // Quebrar ossos (Jiu Jitsu nível 4+) — sem rolagem, só
                // precisa de um alvo já Imobilizado por você (ver
                // abrirModalQuebrarOssosJJ).
                if (ehQuebrarOssosJJ) {
                    abrirModalQuebrarOssosJJ(null, nivelJJLista);
                    return;
                }

                const nomePericia = btn.dataset.periciaGolpe;
                const semPericia = nomePericia === "Sem Perícia";
                const entrada = semPericia ? null : Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === nomePericia);
                if (!semPericia && !entrada) return;

                // Agarrar (manual): teste vs. "10 + Força do alvo", sem
                // dano — resolve num fluxo próprio (resolverAgarrar), não
                // no de dano/Esquiva-Bloqueio-Aparar que vale pro resto
                // das manobras.
                if (m.nome === "Agarrar") {
                    if (!combateTemParticipantes()) {
                        toast("Agarrar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoAgarrar(nomePericia, modificador);
                    return;
                }

                // Desarmar (manual): mesma ideia do Agarrar — resolve num
                // fluxo próprio (resolverDesarmar), sem dano direto.
                // CQC nível 1 dá +1 quando a perícia rolada é CQC de
                // verdade (ver bonusCQCDesarmar em dados-manual.js).
                if (m.nome === "Desarmar") {
                    if (!combateTemParticipantes()) {
                        toast("Desarmar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    let modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    if (nomePericia === "CQC") {
                        const entradaCQC = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
                        const nivelCQC = entradaCQC ? (Number(entradaCQC[1].nivel) || 0) : 0;
                        modificador += bonusCQCDesarmar(nivelCQC);
                    }
                    abrirModalSelecionarAlvoDesarmar(nomePericia, modificador);
                    return;
                }

                // Derrubar (manual): mesma ideia do Agarrar/Desarmar —
                // resolve num fluxo próprio (resolverDerrubar), sem dano
                // direto (a menos que o Mestre confirme o bônus de CQC
                // nível 2, marcado como checkbox na modal de alvo — ver
                // abrirModalSelecionarAlvoDerrubar). O +1 de iniciativa
                // do mesmo nível é oferecido em outro momento (ao rolar
                // iniciativa — ver abrirModalBonusIniciativaCQC), não aqui.
                if (m.nome === "Derrubar") {
                    if (!combateTemParticipantes()) {
                        toast("Derrubar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    const entradaCQCDerrubar = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
                    const nivelCQCDerrubar = entradaCQCDerrubar ? (Number(entradaCQCDerrubar[1].nivel) || 0) : 0;
                    abrirModalSelecionarAlvoDerrubar(nomePericia, modificador, nivelCQCDerrubar);
                    return;
                }

                // Arremessar (CQC nível 3+, exclusiva — ver
                // MANOBRA_ARREMESSAR_CQC em dados-manual.js): manobra
                // DESARMADA, arremessa o(s) PRÓPRIO ALVO (não uma arma —
                // manual pg. 23 não menciona faca/adaga aqui, isso é o
                // "Esfaquear" do mesmo nível, uma manobra separada) e
                // escolhe até 3 alvos numa modal própria (resolve tudo em
                // resolverArremessar).
                if (m.nome === "Arremessar") {
                    if (!combateTemParticipantes()) {
                        toast("Arremessar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalArremessar(nomePericia, modificador);
                    return;
                }

                // Imobilizar (CQC nível 4, manual — ver
                // MANOBRA_IMOBILIZAR_CQC em dados-manual.js): igual
                // Agarrar/Desarmar, resolve num fluxo próprio
                // (resolverImobilizar), sem dano direto. A modal de
                // alvo (abrirModalSelecionarAlvoImobilizar) já filtra
                // pra só mostrar quem está Derrubado.
                if (m.nome === "Imobilizar") {
                    if (!combateTemParticipantes()) {
                        toast("Imobilizar precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoImobilizar(nomePericia, modificador);
                    return;
                }

                // Delimitar alcance / Retomar alcance (manual): mesma
                // ideia do Agarrar — resolvem num fluxo próprio, sem
                // dano direto. Delimitar ainda pede pra escolher QUAL
                // alcance impor (campo extra no modal de alvo).
                if (m.nome === "Delimitar alcance") {
                    if (!combateTemParticipantes()) {
                        toast("Delimitar alcance precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoDelimitar(nomePericia, modificador);
                    return;
                }
                if (m.nome === "Retomar alcance") {
                    if (!combateTemParticipantes()) {
                        toast("Retomar alcance precisa de um combate com participantes cadastrado.", "erro");
                        return;
                    }
                    const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                    abrirModalSelecionarAlvoRetomar(nomePericia, modificador);
                    return;
                }

                // Soco/Chute/Joelhada/Cotovelada têm dano automatizável
                // (1dForça + Força [escala], manual pg. 49-50) sem precisar
                // de item no inventário. Com combate ativo, resolve o
                // ataque completo (acerto x defesa + dano no alvo); sem
                // combate ativo, só mostra o dano potencial junto da
                // rolagem de perícia, pra referência.
                if (ehGolpeDesarmadoComDano(m.nome)) {
                    // Especificidades de perícia (manual pg. 22): Muay Thai
                    // aumenta a escala de Chute/Joelhada em níveis mais
                    // altos, Boxe multiplica o dado do Soco, Karatê Cobra
                    // Kai e Força Bruta dispensam a rolagem (dano máximo).
                    // "Sem Perícia" (golpe sem treinamento) usa a escala
                    // padrão do golpe, sem nenhuma especificidade — e o d20
                    // rola com -1 fixo, igual a qualquer perícia ausente.
                    const nivelPericia = semPericia ? 0 : (Number(entrada[1].nivel) || 0);
                    const especificidade = calcularEspecificidadeGolpe(m.nome, nomePericia, nivelPericia);
                    const itemDesarmado = {
                        nome: m.nome,
                        periciaUso: nomePericia,
                        arma: {
                            danoBase: 0, escala: null, tipoDano: "contusao", desarmado: true,
                            escalaMult: especificidade.escalaMult,
                            dadoMultiplicador: especificidade.dadoMultiplicador,
                            danoMaximoSemRolar: especificidade.danoMaximoSemRolar
                        }
                    };
                    if (combateTemParticipantes()) {
                        abrirModalSelecionarAlvo(itemDesarmado, modificadoresPlanos);
                    } else {
                        const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                        const forcaAtual = Number(estado.fichaAtual.dados.forca) || 0;
                        const danoCalc = calcularDanoDesarmado(forcaAtual, especificidade.escalaMult, especificidade);
                        const dadoTexto = danoCalc.dadoMultiplicador > 1
                            ? `1d${danoCalc.faces}×${danoCalc.dadoMultiplicador}: ${danoCalc.dado}×${danoCalc.dadoMultiplicador}=${danoCalc.dadoTotal}`
                            : `1d${danoCalc.faces}: ${danoCalc.dado}`;
                        await rolarComPossibilidadeDeOcasionais(`${m.nome} (${nomePericia}) · dano potencial ${danoCalc.total} (${dadoTexto} + ${danoCalc.bonusEscala})`, `pericia:${nomePericia}`, modificador, nomePericia === "CQC");
                    }
                    return;
                }

                const modificador = semPericia ? (-1 + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica")) : calcularTotalPericia(entrada[1], estado.fichaAtual.dados, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(nomePericia)).total;
                await rolarComPossibilidadeDeOcasionais(`${m.nome} (${nomePericia})`, `pericia:${nomePericia}`, modificador, nomePericia === "CQC");
            });
        });

        el.listaManobrasCombate.appendChild(li);
    });
}

// =====================================================================
// GERENCIADOR DE COMBATE (compartilhado — Mestre monta, jogador consome)
// =====================================================================

export function configurarCombateAtivo() {
    ouvirCombateAtivo((estado) => {
        estado.combateAtivoCache = estado || { ativo: false, participantes: {} };
        // Se o modal do Gerenciador de Combate estiver aberto no momento,
        // atualiza a lista em tempo real.
        if (estado.isMestre && el.modalCombateMestre && el.modalCombateMestre.classList.contains("active")) {
            el.combateMestreCorpo.innerHTML = "";
            montarGerenciadorCombate(el.combateMestreCorpo);
        }
        if (!estado.isMestre) {
            renderizarAlertaIniciativaCombate();
            travarAcoesForaDoTurno();
            if (estado.painelIniciativaJogadorAberto) montarPainelIniciativaJogador();
        }
        avaliarReacaoPendente();
        // Status só de combate (Derrubado, Agarrado, Imobilizado,
        // Inconsciente, Sangramento...) mudam aqui, não em renderizarTudo()
        // — precisa atualizar o carrossel do topo também neste listener.
        atualizarStatusTopoCarrossel();
    });
}

// =====================================================================
// AVISO DE TORNIQUETE (Mestre) — Fase 8 do plano de efeitos de
// equipamentos médicos. Mesmo mecanismo de fila do popup de
// treinamento (sinalizarAvisosTorniquete em mestre.js, chamada dentro
// de passarODia/passarVariosDias), só que com um único botão de "ok,
// descartar" — este aviso NUNCA aplica dano sozinho, é só um lembrete
// pro Mestre decidir manualmente o que fazer na cena.
// =====================================================================

export function configurarAvisoTorniquete() {
    if (!estado.isMestre || !el.modalAvisoTorniquete) return;
    let filaAvisos = [];

    ouvirAvisoTorniquete((avisos) => {
        filaAvisos = avisos;
        if (avisos.length && !el.modalAvisoTorniquete.classList.contains("active")) {
            mostrarProximoAvisoTorniquete();
        }
    });

    function mostrarProximoAvisoTorniquete() {
        if (!filaAvisos.length) { el.modalAvisoTorniquete.classList.remove("active"); return; }
        const aviso = filaAvisos[0];
        el.avisoTorniqueteTexto.innerText = `${aviso.nomeFicha} está com "${aviso.itemNome}" aplicado há mais de 1h de jogo — risco de dano permanente ao membro (manual). Decida manualmente o que fazer na cena; nada é aplicado sozinho.`;
        el.modalAvisoTorniquete.dataset.avisoId = aviso.id;
        el.modalAvisoTorniquete.classList.add("active");
    }

    el.avisoTorniqueteOk.addEventListener("click", async () => {
        const avisoId = el.modalAvisoTorniquete.dataset.avisoId;
        await descartarAvisoTorniquete(avisoId);
        filaAvisos = filaAvisos.filter(a => a.id !== avisoId);
        el.modalAvisoTorniquete.classList.remove("active");
        setTimeout(mostrarProximoAvisoTorniquete, 300);
    });
}

// ---------------------------------------------------------------------
// Alerta fixo no topo pro jogador: "VOCÊ ESTÁ EM COMBATE!" / "SEU TURNO
// AGORA!". Some sozinho quando o combate com iniciativa acaba.
// ---------------------------------------------------------------------
export function renderizarAlertaIniciativaCombate() {
    let alerta = document.getElementById("alerta-iniciativa-combate");
    const meuId = meuParticipanteIdCombate();
    const estouNoCombate = combateComIniciativaAtivo() && meuId;

    if (!estouNoCombate) {
        if (alerta) alerta.remove();
        return;
    }

    if (!alerta) {
        alerta = document.createElement("button");
        alerta.id = "alerta-iniciativa-combate";
        alerta.type = "button";
        alerta.className = "btn-red combate-alerta-fixo";
        alerta.addEventListener("click", () => {
            estado.painelIniciativaJogadorAberto = true;
            montarPainelIniciativaJogador();
        });
        document.body.appendChild(alerta);
    }

    const meuTurno = estado.combateAtivoCache.turnoAtual === meuId;
    alerta.classList.toggle("combate-meu-turno", meuTurno);
    alerta.textContent = meuTurno ? "SEU TURNO AGORA!" : "VOCÊ ESTÁ EM COMBATE!";
}

// ---------------------------------------------------------------------
// "Gerenciador de Combate do Jogador" — modal com a ordem de iniciativa
// completa, destacando quem está no turno.
// ---------------------------------------------------------------------
export function montarPainelIniciativaJogador() {
    let modal = document.getElementById("modal-iniciativa-jogador");

    if (!combateComIniciativaAtivo()) {
        if (modal) modal.remove();
        estado.painelIniciativaJogadorAberto = false;
        return;
    }

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-iniciativa-jogador";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const { ordemTurnos = [], participantes = {}, turnoAtual, rodada } = estado.combateAtivoCache;
    const meuId = meuParticipanteIdCombate();

    const linhas = ordemTurnos.map(pid => {
        const p = participantes[pid];
        if (!p) return "";
        const ativo = pid === turnoAtual;
        const marcadorVoce = pid === meuId ? " (você)" : "";
        const qtdEsquivas = Number(p.esquivasDisponiveis) || 0;
        const badgeEsquiva = qtdEsquivas > 0 ? ` <span title="Tem ${qtdEsquivas} ação(ões) de Esquiva/Bloqueio guardada(s)">🛡️${qtdEsquivas > 1 ? `×${qtdEsquivas}` : ""}</span>` : "";
        const qtdAcoesGuardadas = Number(p.acoesGuardadas) || 0;
        const badgeAcaoGuardada = qtdAcoesGuardadas > 0 ? ` <span title="Tem ${qtdAcoesGuardadas} ação(ões) guardada(s) — dá pra usar fora do seu turno">⏳${qtdAcoesGuardadas > 1 ? `×${qtdAcoesGuardadas}` : ""}</span>` : "";
        const temContraAtaque = !!(estado.combateAtivoCache.contraAtaquePendente && estado.combateAtivoCache.contraAtaquePendente[pid]);
        const badgeContraAtaque = temContraAtaque ? ` <span title="Aparou! Tem um contra-ataque imediato guardado (modificador -1)">🗡️</span>` : "";
        const badgeAgarrado = (p.agarrado && p.agarrado.ativo)
            ? ` <span class="mod-pill negativo" title="Agarrado por ${escapeHtml(p.agarrado.porNome)} — golpes de alcance médio/longo bloqueados, dano pela metade">🔗 Agarrado</span>${pid === meuId ? ` <button type="button" class="btn-ghost btn-soltar-agarrado" data-soltar-agarrado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Soltar</button>` : ""}`
            : "";
        const badgeAlcance = (p.alcanceLimitado && p.alcanceLimitado.ativo)
            ? ` <span class="mod-pill negativo" title="Alcance limitado a ${p.alcanceLimitado.valor} por ${escapeHtml(p.alcanceLimitado.porNome)} — use Retomar alcance pra tirar">📏 Alcance: ${p.alcanceLimitado.valor}</span>`
            : "";
        const badgeDerrubado = (p.derrubado && p.derrubado.ativo)
            ? ` <span class="mod-pill negativo" title="Derrubado por ${escapeHtml(p.derrubado.porNome)} — dificuldade pra ser acertado cai -3; gasta 1 ação pra se levantar">🔻 Derrubado</span>${pid === meuId ? ` <button type="button" class="btn-ghost btn-levantar-derrubado" data-levantar-derrubado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Levantar</button>` : ""}`
            : "";
        // Imobilizado (CQC nível 4 — ver definirImobilizado em mestre.js):
        // bloqueio TOTAL de ataque enquanto durar (diferente de Agarrado,
        // que só bloqueia alcance médio/longo) — só se solta testando
        // Destreza no próprio turno (ver tentarLibertarImobilizado).
        const badgeImobilizado = (p.imobilizado && p.imobilizado.ativo)
            ? ` <span class="mod-pill negativo" title="Imobilizado por ${escapeHtml(p.imobilizado.porNome)} — não consegue atacar nem se mover; teste Destreza (dificuldade ${p.imobilizado.dificuldadeEscape}) no próprio turno pra se libertar">🔒 Imobilizado</span>${pid === meuId ? ` <button type="button" class="btn-ghost btn-libertar-imobilizado" data-libertar-imobilizado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Testar Destreza</button>` : ""}`
            : "";
        // Desacordado (Jiu Jitsu nível 3 — ver definirDesacordado em
        // mestre.js): inconsciente, sem teste pra se libertar sozinho —
        // por isso sem botão aqui; só o Mestre acorda (Gerenciador de
        // Combate do Mestre).
        const badgeDesacordado = (p.desacordado && p.desacordado.ativo)
            ? ` <span class="mod-pill negativo" title="Desacordado por ${escapeHtml(p.desacordado.porNome)} (Jiu Jitsu nível 3) — inconsciente, não age nem se defende; só o Mestre pode acordá-lo">💤 Desacordado</span>`
            : "";
        // Ossos quebrados (Jiu Jitsu níveis 4/5 — ver definirOssosQuebrados
        // em mestre.js): a penalidade em testes físicos e o "só se
        // arrasta" com as duas pernas quebradas ficam a critério do
        // Mestre (ver comentário em MANOBRA_QUEBRAR_OSSOS_JIUJITSU).
        const badgeOssosQuebrados = (p.ossosQuebrados && p.ossosQuebrados.ativo)
            ? ` <span class="mod-pill negativo" title="Ossos quebrados por ${escapeHtml(p.ossosQuebrados.porNome)} — reduz ${p.ossosQuebrados.pontosPenalidade} ponto(s) qualquer ação física (a critério do Mestre)${p.ossosQuebrados.arrastaSomente ? "; ambas as pernas quebradas — só dá pra se arrastar, testando Tolerância dificuldade 15" : (p.ossosQuebrados.pernasQuebradas >= 1 ? "; perna quebrada — impossibilita correr" : "")}">🦴 Ossos quebrados</span>`
            : "";
        // Disparar e Avançar (CQC nível 4 — ver iniciarIniciativaCombate
        // em mestre.js, que reserva a ação): botão só aparece pro dono
        // do participante enquanto não tiver sido usado ainda na rodada.
        const podeDispararAvancar = pid === meuId && p.dispararAvancarDisponivel && !p.dispararAvancarUsado;
        const botaoDispararAvancar = podeDispararAvancar
            ? ` <button type="button" class="btn-ghost btn-disparar-avancar-cqc" data-disparar-avancar-cqc="${pid}" style="padding:2px 6px;font-size:0.7rem;" title="CQC nível 4 — 2 disparos com pistola, fora da ordem de turno">🔫 Disparar e Avançar</button>`
            : "";
        const badgeSaude = badgeEstadoSaudeCombate(p);
        const badgeEnergia = badgeEstadoEnergiaCombate(p);
        const badgeStatus = badgeStatusAtivosCombate(p);
        const badgeInfeccao = badgeInfeccaoCombate(p);
        // Jogador não vê o PV de NPC (só o próprio e o de outros
        // jogadores) — só o Mestre tem essa informação, no Gerenciador de
        // Combate dele (montarGerenciadorCombate). Sem isso o painel do
        // jogador entregava de graça quanto PV um inimigo ainda tinha.
        const pvTexto = p.tipo === "npc" ? "" : `<span>${p.pv}/${p.pvMax} PV</span>`;
        // CQC nível 5: ação extra separada, só pra rolagens de CQC (ver
        // checarConsumoDeAcao/ehCQC) — mostrada à parte do contador
        // normal pra não confundir com uma ação genérica a mais.
        const acaoExtraCQCTexto = Number(p.acoesExtraCQCMax) > 0 ? ` <span title="CQC nível 5 (Agente Impossível) — ação extra só pra rolagens de CQC">🥋 ${p.acoesExtraCQC}/${p.acoesExtraCQCMax} ação CQC</span>` : "";
        return `
            <div class="combate-linha ${ativo ? "combate-linha-ativa" : ""}">
                <span class="combate-nome">${escapeHtml(p.nome)}${marcadorVoce}${badgeEsquiva}${badgeAcaoGuardada}${badgeContraAtaque}${badgeAgarrado}${badgeAlcance}${badgeDerrubado}${badgeImobilizado}${badgeDesacordado}${badgeOssosQuebrados}${botaoDispararAvancar}${badgeSaude}${badgeEnergia}${badgeStatus}${badgeInfeccao}</span>
                <span>Iniciativa ${p.iniciativa}${p.bonusCQCIniciativa ? " (+1 CQC nível 2)" : ""}${p.bonusCobraKaiIniciativa ? ` (+${p.bonusCobraKaiIniciativa} Cobra Kai)` : ""}</span>
                ${pvTexto}
                <span>${p.acoes}/${p.acoesMax} ações${acaoExtraCQCTexto}</span>
            </div>`;
    }).join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Rodada ${rodada || 1}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Gerenciador de Combate do Jogador</h4>
        <div class="combate-lista">${linhas}</div>
    `;

    modal.querySelectorAll("[data-soltar-agarrado]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await soltarAgarrado(btn.dataset.soltarAgarrado);
        });
    });

    modal.querySelectorAll("[data-levantar-derrubado]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await tentarLevantarDerrubado(btn.dataset.levantarDerrubado);
        });
    });

    modal.querySelectorAll("[data-libertar-imobilizado]").forEach(btn => {
        btn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await tentarLibertarImobilizado(btn.dataset.libertarImobilizado);
        });
    });

    modal.querySelectorAll("[data-disparar-avancar-cqc]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModalDispararAvancar();
        });
    });

    modal.querySelector(".combate-fechar").addEventListener("click", () => {
        modal.remove();
        estado.painelIniciativaJogadorAberto = false;
    });
}

// =====================================================================
// GERENCIADOR DE COMBATE (Mestre) — adicionar/remover participantes,
// criar NPC direto pra dentro do combate, encerrar a cena.
// =====================================================================
export function montarGerenciadorCombate(corpoOriginal) {
    // Layout em duas colunas: a principal com tudo que já existia
    // (participantes, iniciativa etc.) e uma caixa lateral fixa com as
    // Ações Pendentes, pra o Mestre confirmar gasto de ação (e qualquer
    // outra pendência) sem sair da aba de Combate.
    const layout = document.createElement("div");
    layout.style.display = "flex";
    layout.style.gap = "16px";
    layout.style.alignItems = "flex-start";
    layout.style.flexWrap = "wrap";
    corpoOriginal.appendChild(layout);

    const colPrincipal = document.createElement("div");
    colPrincipal.style.flex = "2";
    colPrincipal.style.minWidth = "280px";
    layout.appendChild(colPrincipal);

    const colLateral = document.createElement("div");
    colLateral.style.flex = "1";
    colLateral.style.minWidth = "240px";
    colLateral.style.position = "sticky";
    colLateral.style.top = "10px";
    colLateral.className = "panel";
    layout.appendChild(colLateral);

    const tituloLateral = document.createElement("h4");
    tituloLateral.innerText = `Ações Pendentes${estado.pendentesCache.length ? ` (${estado.pendentesCache.length})` : ""}`;
    colLateral.appendChild(tituloLateral);

    const corpoLateral = document.createElement("div");
    colLateral.appendChild(corpoLateral);
    montarPainelAcoesPendentes(corpoLateral);

    // A partir daqui, o resto da função continua igual — só que
    // preenchendo a coluna principal em vez do corpo inteiro do modal.
    const corpo = colPrincipal;

    const aviso = document.createElement("p");
    aviso.className = "hint";
    aviso.innerText = "Participantes daqui aparecem como alvo no botão \"Usar\" de arma dos jogadores. Encerre o combate quando a cena acabar.";
    corpo.appendChild(aviso);

    const listaParticipantes = document.createElement("div");
    listaParticipantes.style.display = "flex";
    listaParticipantes.style.flexDirection = "column";
    listaParticipantes.style.gap = "8px";
    listaParticipantes.style.margin = "10px 0";
    corpo.appendChild(listaParticipantes);

    function renderParticipantes() {
        const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
        const ids = Object.keys(participantes);
        listaParticipantes.innerHTML = "";
        if (!ids.length) {
            listaParticipantes.innerHTML = `<p class="hint">Nenhum participante no combate ainda.</p>`;
            return;
        }
        ids.forEach(pid => {
            const p = participantes[pid];
            const linha = document.createElement("div");
            linha.className = "npc-card";
            linha.style.flexDirection = "row";
            linha.style.alignItems = "center";
            linha.style.justifyContent = "space-between";
            linha.innerHTML = `<span>${p.tipo === "ficha" ? "🧑" : "👤"} ${escapeHtml(p.nome)} <span class="entity-sub">(${p.tipo === "ficha" ? "jogador" : "NPC"})</span></span>`;
            const btnRemover = document.createElement("button");
            btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
            btnRemover.addEventListener("click", async () => { await removerParticipanteCombate(pid); });
            linha.appendChild(btnRemover);
            listaParticipantes.appendChild(linha);
        });
    }
    renderParticipantes();

    // ---- Adicionar ficha de jogador ----
    const secaoFicha = document.createElement("div");
    secaoFicha.className = "section-header";
    secaoFicha.innerText = "Adicionar ficha de jogador";
    corpo.appendChild(secaoFicha);
    const selectFichaAdd = criarSelectFichas(false);
    const btnAddFicha = document.createElement("button");
    btnAddFicha.className = "btn-lime"; btnAddFicha.type = "button"; btnAddFicha.innerText = "+ Adicionar ao combate";
    btnAddFicha.addEventListener("click", async () => {
        if (!selectFichaAdd.value) { toast("Escolha uma ficha.", "erro"); return; }
        const jaEsta = Object.values((estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {}).some(p => p.tipo === "ficha" && p.refId === selectFichaAdd.value);
        if (jaEsta) { toast("Essa ficha já está no combate.", "erro"); return; }
        const resultado = await adicionarParticipanteCombate({ tipo: "ficha", refId: selectFichaAdd.value, nome: nomeDeFicha(selectFichaAdd.value) });
        toast(resultado && resultado.entrouComIniciativa
            ? `Jogador adicionado ao combate já em andamento — iniciativa ${resultado.iniciativa}, já entrou na fila.`
            : "Jogador adicionado ao combate.");
    });
    corpo.append(selectFichaAdd, btnAddFicha);

    // ---- Adicionar NPC já salvo ----
    const secaoNpcSalvo = document.createElement("div");
    secaoNpcSalvo.className = "section-header";
    secaoNpcSalvo.innerText = "Adicionar NPC salvo";
    corpo.appendChild(secaoNpcSalvo);
    const selectNpcAdd = document.createElement("select");
    selectNpcAdd.innerHTML = '<option value="">-- escolha --</option>';
    ouvirNpcs((npcs) => {
        const valorAtual = selectNpcAdd.value;
        selectNpcAdd.innerHTML = '<option value="">-- escolha --</option>';
        npcs.forEach(npc => {
            const opt = document.createElement("option");
            opt.value = npc.id;
            opt.innerText = npc.nome;
            selectNpcAdd.appendChild(opt);
        });
        selectNpcAdd.value = valorAtual;
    });
    const btnAddNpc = document.createElement("button");
    btnAddNpc.className = "btn-lime"; btnAddNpc.type = "button"; btnAddNpc.innerText = "+ Adicionar ao combate";
    btnAddNpc.addEventListener("click", async () => {
        if (!selectNpcAdd.value) { toast("Escolha um NPC.", "erro"); return; }
        const jaEsta = Object.values((estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {}).some(p => p.tipo === "npc" && p.refId === selectNpcAdd.value);
        if (jaEsta) { toast("Esse NPC já está no combate.", "erro"); return; }
        const nomeOpt = selectNpcAdd.options[selectNpcAdd.selectedIndex].innerText;
        const resultado = await adicionarParticipanteCombate({ tipo: "npc", refId: selectNpcAdd.value, nome: nomeOpt });
        toast(resultado && resultado.entrouComIniciativa
            ? `NPC adicionado ao combate já em andamento — iniciativa ${resultado.iniciativa}, já entrou na fila.`
            : "NPC adicionado ao combate.");
    });
    corpo.append(selectNpcAdd, btnAddNpc);

    // ---- Criar novo NPC direto no combate ----
    // O formulário completo (nome, atributos, perícias, proteção etc.)
    // fica escondido até o Mestre clicar no botão — evita que o
    // Gerenciador de Combate fique poluído quando ele só quer
    // adicionar participantes já existentes.
    const secaoNovoNpc = document.createElement("div");
    secaoNovoNpc.className = "section-header";
    secaoNovoNpc.innerText = "Criar novo NPC";
    corpo.appendChild(secaoNovoNpc);

    const btnToggleNovoNpc = document.createElement("button");
    btnToggleNovoNpc.className = "btn-ghost";
    btnToggleNovoNpc.type = "button";
    const atualizarTextoToggle = () => {
        btnToggleNovoNpc.innerText = estado.combateNpcFormVisivel
            ? "− Fechar formulário de novo NPC"
            : "+ Criar novo NPC (entra direto no combate)";
    };
    atualizarTextoToggle();
    corpo.appendChild(btnToggleNovoNpc);

    const areaNovoNpcCombate = document.createElement("div");
    areaNovoNpcCombate.style.display = estado.combateNpcFormVisivel ? "block" : "none";
    areaNovoNpcCombate.style.marginTop = "10px";
    corpo.appendChild(areaNovoNpcCombate);

    const mostrarFormNovoNpcCombate = () => {
        areaNovoNpcCombate.innerHTML = "";
        montarFormularioNpcDetalhado(areaNovoNpcCombate, null, async (novoId, nome) => {
            if (novoId) {
                const resultado = await adicionarParticipanteCombate({ tipo: "npc", refId: novoId, nome });
                toast(resultado && resultado.entrouComIniciativa
                    ? `${nome} criado e adicionado ao combate já em andamento — iniciativa ${resultado.iniciativa}, já entrou na fila.`
                    : `${nome} criado e adicionado ao combate.`);
            }
            mostrarFormNovoNpcCombate();
        });
    };
    if (estado.combateNpcFormVisivel) mostrarFormNovoNpcCombate();

    btnToggleNovoNpc.addEventListener("click", () => {
        estado.combateNpcFormVisivel = !estado.combateNpcFormVisivel;
        areaNovoNpcCombate.style.display = estado.combateNpcFormVisivel ? "block" : "none";
        atualizarTextoToggle();
        if (estado.combateNpcFormVisivel && !areaNovoNpcCombate.hasChildNodes()) {
            mostrarFormNovoNpcCombate();
        }
    });

    // ---- Iniciativa / ordem de turnos ----
    const secaoIniciativa = document.createElement("div");
    secaoIniciativa.className = "section-header";
    secaoIniciativa.innerText = "Iniciativa";
    corpo.appendChild(secaoIniciativa);

    const avisoIniciativa = document.createElement("p");
    avisoIniciativa.className = "hint";
    avisoIniciativa.innerText = "Ao iniciar, todo mundo na lista de participantes acima rola 1d20 + Agilidade automaticamente. Quem tiver o maior resultado age primeiro. Cada personagem ganha 1 ação por turno + 1 ação extra a cada 5 pontos de Velocidade Total.";
    corpo.appendChild(avisoIniciativa);

    const listaIniciativa = document.createElement("div");
    listaIniciativa.style.display = "flex";
    listaIniciativa.style.flexDirection = "column";
    listaIniciativa.style.gap = "6px";
    listaIniciativa.style.margin = "10px 0";
    corpo.appendChild(listaIniciativa);

    function renderIniciativa() {
        const { ativo, ordemTurnos = [], participantes = {}, turnoAtual, rodada } = estado.combateAtivoCache || {};
        listaIniciativa.innerHTML = "";
        if (!ativo || !ordemTurnos.length) {
            listaIniciativa.innerHTML = `<p class="hint">Combate ainda não iniciado.</p>`;
            return;
        }
        const cabecalho = document.createElement("p");
        cabecalho.className = "eyebrow";
        cabecalho.innerText = `Rodada ${rodada || 1}`;
        listaIniciativa.appendChild(cabecalho);
        ordemTurnos.forEach(pid => {
            const p = participantes[pid];
            if (!p) return;
            const linha = document.createElement("div");
            linha.className = "combate-linha" + (pid === turnoAtual ? " combate-linha-ativa" : "");
            const qtdEsquivas = Number(p.esquivasDisponiveis) || 0;
            const badgeEsquiva = qtdEsquivas > 0 ? ` <span title="Tem ${qtdEsquivas} ação(ões) de Esquiva/Bloqueio guardada(s)">🛡️${qtdEsquivas > 1 ? `×${qtdEsquivas}` : ""}</span>` : "";
            const qtdAcoesGuardadas = Number(p.acoesGuardadas) || 0;
            const badgeAcaoGuardada = qtdAcoesGuardadas > 0 ? ` <span title="Tem ${qtdAcoesGuardadas} ação(ões) guardada(s) — pode agir fora do próprio turno">⏳${qtdAcoesGuardadas > 1 ? `×${qtdAcoesGuardadas}` : ""}</span>` : "";
            const temContraAtaque = !!(estado.combateAtivoCache.contraAtaquePendente && estado.combateAtivoCache.contraAtaquePendente[pid]);
            const badgeContraAtaque = temContraAtaque ? ` <span title="Aparou! Tem um contra-ataque imediato guardado (modificador -1)">🗡️</span>` : "";
            const badgeAgarrado = (p.agarrado && p.agarrado.ativo)
                ? ` <span class="mod-pill negativo" title="Agarrado por ${escapeHtml(p.agarrado.porNome)} — golpes de alcance médio/longo bloqueados, dano pela metade">🔗 Agarrado</span> <button type="button" class="btn-ghost btn-soltar-agarrado" data-soltar-agarrado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Soltar</button>`
                : "";
            const badgeAlcance = (p.alcanceLimitado && p.alcanceLimitado.ativo)
                ? ` <span class="mod-pill negativo" title="Alcance limitado a ${p.alcanceLimitado.valor} por ${escapeHtml(p.alcanceLimitado.porNome)} — use Retomar alcance pra tirar">📏 Alcance: ${p.alcanceLimitado.valor}</span>`
                : "";
            const badgeDerrubado = (p.derrubado && p.derrubado.ativo)
                ? ` <span class="mod-pill negativo" title="Derrubado por ${escapeHtml(p.derrubado.porNome)} — dificuldade pra ser acertado cai -3; gasta 1 ação pra se levantar">🔻 Derrubado</span> <button type="button" class="btn-ghost btn-levantar-derrubado" data-levantar-derrubado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Levantar</button>`
                : "";
            const badgeImobilizado = (p.imobilizado && p.imobilizado.ativo)
                ? ` <span class="mod-pill negativo" title="Imobilizado por ${escapeHtml(p.imobilizado.porNome)} — não consegue atacar nem se mover; teste Destreza (dificuldade ${p.imobilizado.dificuldadeEscape}) no próprio turno pra se libertar">🔒 Imobilizado</span> <button type="button" class="btn-ghost btn-libertar-imobilizado" data-libertar-imobilizado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Testar Destreza</button>`
                : "";
            // Desacordado (Jiu Jitsu nível 3 — ver definirDesacordado em
            // mestre.js): sem teste de auto-libertação, então o único
            // jeito de tirar é o Mestre clicar em "Acordar" aqui.
            const badgeDesacordado = (p.desacordado && p.desacordado.ativo)
                ? ` <span class="mod-pill negativo" title="Desacordado por ${escapeHtml(p.desacordado.porNome)} (Jiu Jitsu nível 3) — inconsciente, não age nem se defende">💤 Desacordado</span> <button type="button" class="btn-ghost btn-acordar-desacordado" data-acordar-desacordado="${pid}" style="padding:2px 6px;font-size:0.7rem;">Acordar</button>`
                : "";
            // Ossos quebrados (Jiu Jitsu níveis 4/5 — ver
            // definirOssosQuebrados em mestre.js): fica só como nota pro
            // Mestre aplicar a penalidade nos testes físicos seguintes;
            // não some sozinho (sem cura automática no sistema), então
            // tem um botão "Curar" pro Mestre limpar quando fizer sentido
            // na narrativa (primeiros socorros, cura, fim de cena etc.).
            const badgeOssosQuebrados = (p.ossosQuebrados && p.ossosQuebrados.ativo)
                ? ` <span class="mod-pill negativo" title="Ossos quebrados por ${escapeHtml(p.ossosQuebrados.porNome)} — reduz ${p.ossosQuebrados.pontosPenalidade} ponto(s) qualquer ação física (a critério do Mestre)${p.ossosQuebrados.arrastaSomente ? "; ambas as pernas quebradas — só dá pra se arrastar, testando Tolerância dificuldade 15" : (p.ossosQuebrados.pernasQuebradas >= 1 ? "; perna quebrada — impossibilita correr" : "")}">🦴 Ossos quebrados</span> <button type="button" class="btn-ghost btn-curar-ossos" data-curar-ossos="${pid}" style="padding:2px 6px;font-size:0.7rem;">Curar</button>`
                : "";
            // Disparar e Avançar só é acionável aqui pro NPC que o Mestre
            // estiver "atuando como" no momento (estado.modoNpc) — precisa dos
            // dados de inventário/perícia daquele personagem carregados
            // como estado.fichaAtual, igual as outras manobras de combate.
            const podeDispararAvancarNpc = estado.modoNpc && pid === npcParticipanteIdCombate() && p.dispararAvancarDisponivel && !p.dispararAvancarUsado;
            const botaoDispararAvancar = podeDispararAvancarNpc
                ? ` <button type="button" class="btn-ghost btn-disparar-avancar-cqc" data-disparar-avancar-cqc="${pid}" style="padding:2px 6px;font-size:0.7rem;" title="CQC nível 4 — 2 disparos com pistola, fora da ordem de turno">🔫 Disparar e Avançar</button>`
                : "";
            const badgeSaude = badgeEstadoSaudeCombate(p);
            const badgeEnergia = badgeEstadoEnergiaCombate(p);
            const badgeStatus = badgeStatusAtivosCombate(p);
            // Infecção (Complicações de ferimentos — manual): flag
            // persistente, agora derivada do sistema de feridas (ver
            // sincronizarFlagInfeccaoAgregada em saude.js). Etapa 5 do
            // plano: "Testar Infecção" e "Tratar" saíram daqui — a
            // primeira mora na aba Saúde, vinculada à ferida específica
            // (abrirModalTestarInfeccaoFerida em ficha.js); a segunda
            // deixou de existir como ação solta (o que fecha a infecção
            // agora é tratar a ferida em si, não um botão de limpar flag).
            // O badge continua só como indicador visual pro Mestre
            // acompanhar durante o combate, sem nenhuma ação vinculada.
            const badgeInfeccao = (p.infeccao && p.infeccao.ativo)
                ? ` <span class="mod-pill negativo" title="Tempo de repouso necessário +50% até tratamento médico${p.infeccao.garantida ? " (infecção garantida)" : ""}${p.infeccao.origem ? ` — ${escapeHtml(p.infeccao.origem)}` : ""}">🦠 Infectado</span>`
                : "";
            const badgeIniciativaTravada = p.iniciativaTravada
                ? ` <span class="mod-pill negativo" title="Tirou 1 no d20 da iniciativa — perde esse turno inteiro (0 ações). Ao encerrar o turno, rerrola automaticamente e reordena a fila.">🎲1 Perdeu o turno</span>`
                : "";
            const acaoExtraCQCTexto = Number(p.acoesExtraCQCMax) > 0 ? ` <span title="CQC nível 5 (Agente Impossível) — ação extra só pra rolagens de CQC">🥋 ${p.acoesExtraCQC}/${p.acoesExtraCQCMax} ação CQC</span>` : "";
            linha.innerHTML = `
                <span class="combate-nome">${escapeHtml(p.nome)}${badgeEsquiva}${badgeAcaoGuardada}${badgeContraAtaque}${badgeAgarrado}${badgeAlcance}${badgeDerrubado}${badgeImobilizado}${badgeDesacordado}${badgeOssosQuebrados}${botaoDispararAvancar}${badgeSaude}${badgeEnergia}${badgeStatus}${badgeInfeccao}${badgeIniciativaTravada}</span>
                <span>Iniciativa ${p.iniciativa} (1d20:${p.rolagemBruta} + Agi ${p.modAgilidade}${p.bonusCQCIniciativa ? " + 1 CQC nível 2" : ""}${p.bonusCobraKaiIniciativa ? ` + ${p.bonusCobraKaiIniciativa} Cobra Kai` : ""})</span>
                <span>${p.pv}/${p.pvMax} PV</span>
                <span>${p.acoes}/${p.acoesMax} ações${acaoExtraCQCTexto}</span>
            `;
            const btnSoltar = linha.querySelector("[data-soltar-agarrado]");
            if (btnSoltar) {
                btnSoltar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await soltarAgarrado(pid);
                });
            }
            const btnLevantar = linha.querySelector("[data-levantar-derrubado]");
            if (btnLevantar) {
                btnLevantar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await tentarLevantarDerrubado(pid);
                });
            }
            const btnLibertar = linha.querySelector("[data-libertar-imobilizado]");
            if (btnLibertar) {
                btnLibertar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await tentarLibertarImobilizado(pid);
                });
            }
            const btnAcordar = linha.querySelector("[data-acordar-desacordado]");
            if (btnAcordar) {
                btnAcordar.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await soltarDesacordado(pid);
                });
            }
            const btnCurarOssos = linha.querySelector("[data-curar-ossos]");
            if (btnCurarOssos) {
                btnCurarOssos.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    await curarOssosQuebrados(pid);
                });
            }
            const btnDispararAvancar = linha.querySelector("[data-disparar-avancar-cqc]");
            if (btnDispararAvancar) {
                btnDispararAvancar.addEventListener("click", (e) => {
                    e.stopPropagation();
                    abrirModalDispararAvancar();
                });
            }
            listaIniciativa.appendChild(linha);
        });
    }
    renderIniciativa();

    const btnIniciarIniciativa = document.createElement("button");
    btnIniciarIniciativa.className = "btn-lime"; btnIniciarIniciativa.type = "button";
    btnIniciarIniciativa.innerText = "Iniciar Combate (rolar iniciativa)";
    btnIniciarIniciativa.addEventListener("click", async () => {
        try {
            // CQC nível 2 e nível 4: antes de rolar, oferece o +1 de
            // iniciativa (nível 2) e a reserva de ação pra "Disparar e
            // Avançar" (nível 4) — os dois são condicionais a uma
            // escolha narrativa, então pergunta via checkbox em vez de
            // aplicar sozinho (ver participantesElegiveisCQCIniciativa
            // em mestre.js).
            //
            // CQC nível 5 ("Agente Impossível"): diferente dos outros
            // dois, é SEMPRE ativo pra quem tem o nível — sem checkbox,
            // sem escolha. Reaproveita a mesma lista `elegiveis` (já
            // inclui nivel >= 2, então nivel >= 5 também) pra montar o
            // mapa automaticamente.
            const elegiveis = await participantesElegiveisCQCIniciativa();
            let bonusMap = {};
            let dispararMap = {};
            if (elegiveis.length) {
                const resultado = await abrirModalBonusIniciativaCQC(elegiveis);
                if (resultado === null) return; // Mestre cancelou
                bonusMap = resultado.bonusMap;
                dispararMap = resultado.dispararMap;
            }
            const acaoExtraCQCMap = {};
            elegiveis.filter(e => e.nivel >= 5).forEach(e => { acaoExtraCQCMap[e.id] = true; });
            await iniciarIniciativaCombate(bonusMap, dispararMap, acaoExtraCQCMap);
            toast("Combate iniciado! Iniciativa rolada para todos.");
        } catch (e) {
            toast(e.message || "Falha ao iniciar o combate.", "erro");
        }
    });

    const btnAvancarTurno = document.createElement("button");
    btnAvancarTurno.className = "btn-blue"; btnAvancarTurno.type = "button";
    btnAvancarTurno.innerText = "Avançar Turno →";
    btnAvancarTurno.addEventListener("click", async () => {
        try {
            const { nome, notasStatus } = await avancarTurnoCombate();
            await resetarDisparosTurno(); // zera o Recuo acumulado junto com a virada de turno
            toast(`Turno de ${nome}.`);
            (notasStatus || []).forEach(nota => toast(nota, "erro"));
        } catch (e) {
            toast(e.message || "Falha ao avançar o turno.", "erro");
        }
    });

    corpo.append(btnIniciarIniciativa, btnAvancarTurno);

    // ---- Encerrar combate ----
    const secaoEncerrar = document.createElement("div");
    secaoEncerrar.className = "section-header";
    secaoEncerrar.innerText = "Fim de cena";
    corpo.appendChild(secaoEncerrar);
    const btnEncerrar = document.createElement("button");
    btnEncerrar.className = "btn-red"; btnEncerrar.type = "button"; btnEncerrar.innerText = "Encerrar Combate";
    btnEncerrar.addEventListener("click", async () => {
        if (!confirm("Remover todos os participantes do combate ativo?")) return;
        await encerrarCombate();
        toast("Combate encerrado.");
    });
    corpo.appendChild(btnEncerrar);
}
