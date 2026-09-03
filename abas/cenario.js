// abas/cenario.js
// ---------------------------------------------------------------------
// Aba Cenário (parte 1: exibição) — grade de cenários compartilhados
// (estado.cenariosCache, alimentado por configurarCenarios): jogador só
// vê os cenários onde a própria ficha está em `participantes`, o Mestre
// vê todos. Mostra participantes, itens soltos, veículos presentes,
// explosivos armados, dinheiro solto e a perseguição em andamento (se
// houver), com os botões de ação disponíveis pro jogador (Pegar item/
// dinheiro, Arrombar veículo trancado, Reparar/Melhorar veículo de
// terceiro, e as ações de volta de uma perseguição: Testar Dirigir
// Veículos, Tentar Rota de Fuga, Manobra).
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 20). As 3 funções do plano (renderizarCenarios, configurarCenarios,
// configurarPerseguicaoAtiva) vieram pra cá, junto com o estado de
// módulo dinheiroCenarioAbertoId (qual saldo está com a caixinha de
// "quanto pegar" aberta — só jogador, nunca salvo no Firebase).
//
// As funções de AÇÃO ligadas pelos botões do card (pegarItemCenario,
// pegarDinheiroCenario, arrombarVeiculoCenario,
// abrirModalMecanicoVeiculoTerceiro, testarDirigirVeiculosPerseguicao,
// tentarRotaFugaPerseguicao, abrirModalManobraVeiculo) continuam em
// ficha.js, só exportadas — mesmo critério do Passo 18 (veiculos.js):
// são compartilhadas com outros fluxos (Manobra também é usada pela aba
// Veículos; as de pegar item/dinheiro passam pela fila de Ações
// Pendentes do Mestre) e mexer nelas exigiria destrinchar essa teia sem
// ganho de organização real agora. O Gerenciador de Cenário do Mestre
// (montarGerenciadorCenario e as funções que ele monta) também continua
// em ficha.js — só importado aqui, já que configurarCenarios/
// configurarPerseguicaoAtiva precisam chamá-lo pra atualizar o painel
// do Mestre em tempo real quando ele está aberto; a extração completa do
// Gerenciador é o Passo 21 do plano, ainda não feito.
//
// dinheiroCenarioAbertoId precisou de um cuidado extra: pegarDinheiroCenario
// (que continua em ficha.js) também zera essa variável depois de enviar
// o pedido ao Mestre. Como a variável agora mora só aqui, ficha.js chama
// o novo fecharCaixaPegarDinheiroCenario() exportado abaixo em vez de
// mexer na variável direto — mesmo padrão já usado por
// fecharCaixaDepositarDinheiroItem (abas/inventario.js, Passo 16/17).
//
// Passo 21 (parte 2: gerenciador do mestre) trouxe montarGerenciadorCenario
// e as funções que ele monta (montarDetalheCenario,
// montarSecaoPerseguicaoCenario, montarFormularioIniciarPerseguicao,
// montarFormularioVeiculoCenario — essas 4 continuam só internas deste
// arquivo, não são usadas em nenhum outro lugar) pra cá também, junto
// com o estado de módulo cenarioAbertoIdNoGerenciador. Como
// montarGerenciadorCenario passou a ser chamado também de fora daqui
// (o botão "Cenário" da topbar do Mestre, em ficha.js), a direção do
// import se inverteu nesse caso: agora é ficha.js que importa
// montarGerenciadorCenario DESTE arquivo, não o contrário. Duas funções
// que só o Gerenciador usa (abrirModalNovoItemParaCenario,
// criarSelectFichas) ganharam export em ficha.js e continuam lá, pelo
// mesmo motivo das funções de ação: abrirModalNovoItemParaCenario
// depende de prepararModalParaLista (modal genérico, ainda não
// extraído) e criarSelectFichas também é usada por outras telas do
// Mestre fora do Gerenciador de Cenário.
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import {
    el, escapeHtml, arrombarVeiculoCenario, abrirModalMecanicoVeiculoTerceiro,
    pegarItemCenario, pegarDinheiroCenario, testarDirigirVeiculosPerseguicao,
    tentarRotaFugaPerseguicao, abrirModalManobraVeiculo, toast, nomeDeFicha,
    abrirModalNovoItemParaCenario, criarSelectFichas
} from "../ficha.js?v=20260830-npcnivelpv";
import { pontosPorResultadoTesteFuga } from "../regras.js";
import {
    rotuloTag, rotuloTipoVeiculo, bairroPerseguicao, tabelaPontuacaoFugaCadastrada,
    bairroTemDificuldadeRotaFuga, listarBairrosPerseguicao, escalaVeiculo,
    ATRIBUTOS_VEICULO, TIPOS_VEICULO
} from "../dados-manual.js";
import {
    ouvirCenarios, ouvirPerseguicaoAtiva, ouvirNpcs, criarCenario, renomearCenario,
    excluirCenario, adicionarParticipanteCenario, removerParticipanteCenario,
    adicionarItemCenario, removerItemCenario, adicionarDinheiroCenario,
    removerDinheiroCenario, liberarQuimicoCenario, removerQuimicoCenario,
    detonarExplosivoCenario, removerExplosivoCenario, adicionarVeiculoCenario,
    editarVeiculoCenario, removerVeiculoCenario, removerVeiculoDoCenario,
    definirTrancaVeiculoJogador, iniciarPerseguicao, encerrarPerseguicao,
    avancarVoltaManualPerseguicao, registrarPontosPerseguicao,
    registrarTentativaRotaFugaPerseguicao, removerParticipantePerseguicao
} from "../mestre.js?v=20260830-npcnivelpv";

// ---------------------------------------------------------------------
// CENÁRIO (ver plano-cenario.txt, Fase 4) — mostra os cenários
// compartilhados (estado.cenariosCache, alimentado por configurarCenarios)
// filtrados por ficha: jogador só vê os cenários onde a própria ficha
// está em `participantes`; o Mestre vê todos. A edição do cenário em si
// (criar, adicionar participante/item/veículo) continua só no
// Gerenciador de Cenário (Fase 6), não aqui.
// ---------------------------------------------------------------------

// Qual linha de dinheiro está com a caixinha de "quanto pegar" aberta
// no momento (só 1 por vez, pra não poluir a tela) — guarda o id do
// saldo de dinheiro do cenário (push key, único mesmo entre cenários
// diferentes).
let dinheiroCenarioAbertoId = null;

export function renderizarCenarios() {
    if (!el.cenarioLista || !estado.fichaAtualId) return;

    const cenariosVisiveis = estado.isMestre
        ? estado.cenariosCache
        : estado.cenariosCache.filter(c => Object.values(c.participantes || {}).some(p => p.tipo === "ficha" && p.refId === estado.fichaAtualId));

    if (!cenariosVisiveis.length) {
        el.cenarioLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">${estado.isMestre ? "Nenhum cenário ativo no momento." : "Você não está em nenhum cenário no momento."}</p>`;
        return;
    }

    el.cenarioLista.innerHTML = cenariosVisiveis.map(cenario => {
        const participantes = Object.values(cenario.participantes || {});
        const itens = Object.entries(cenario.itens || {});
        const veiculos = Object.entries(cenario.veiculos || {});
        const explosivos = Object.entries(cenario.explosivos || {});

        const participantesHtml = participantes.length
            ? participantes.map(p => `<span class="mod-pill">${p.tipo === "ficha" ? "🧑" : "👤"} ${escapeHtml(p.nome)}</span>`).join(" ")
            : `<span class="hint">Ninguém marcado ainda.</span>`;

        const itensHtml = itens.length
            ? itens.map(([itemId, it]) => `
                <div class="cenario-item-linha" data-cenario-item-id="${itemId}">
                    <span>📦 ${escapeHtml(it.nome || "(sem nome)")}${it.tag ? ` <span class="entity-sub">(${escapeHtml(rotuloTag(it.tag))}${it.peso ? ` · ${it.peso} kg` : ""})</span>` : ""}${it.observacao ? ` <span class="entity-sub">— ${escapeHtml(it.observacao)}</span>` : ""}</span>
                    ${estado.isMestre ? "" : `<button type="button" class="btn-lime btn-cenario-pegar-item" data-cenario-id="${cenario.id}" data-item-id="${itemId}" data-item-nome="${escapeHtml(it.nome || "item")}">Pegar</button>`}
                </div>`).join("")
            : `<p class="hint">Nenhum item solto neste cenário.</p>`;

        // Veículos (Fase 6 do plano — ver plano-veiculos-fase2.txt, seção
        // "FASE 6"): entrada pode vir em dois formatos. `origem: "jogador"`
        // é um PONTEIRO { fichaId, veiculoId } — a fonte de verdade fica
        // em fichas/{fichaId}/veiculos/{veiculoId} (estado.todasAsFichasCache),
        // nunca fica desatualizado, então resolve nome/tipo/trancado a
        // partir de lá em vez dos campos gravados na entry. Sem `origem`
        // (ou `origem: "cenario"`) é o formato antigo, criado direto pelo
        // Mestre (adicionarVeiculoCenario) — usa os campos da própria
        // entry como sempre foi.
        const veiculosHtml = veiculos.length
            ? veiculos.map(([veiculoId, entry]) => {
                if (entry.origem === "jogador") {
                    const fichaDona = estado.todasAsFichasCache[entry.fichaId];
                    const vReal = fichaDona && fichaDona.veiculos && fichaDona.veiculos[entry.veiculoId];
                    if (!vReal) {
                        // Dono apagou o veículo enquanto ele estava
                        // marcado presente no cenário — mostra um aviso
                        // mínimo, sem botão nenhum (nada pra fazer com um
                        // ponteiro morto por aqui; o Mestre limpa pelo
                        // Gerenciador de Cenário).
                        return `
                        <div class="cenario-veiculo-linha" data-cenario-veiculo-id="${veiculoId}">
                            <span>🚗 <span class="hint">Veículo removido pelo dono.</span></span>
                        </div>`;
                    }
                    const nomeDono = (fichaDona.config && fichaDona.config.nomeExibicao) || entry.fichaId;
                    const ehMeuVeiculo = !estado.isMestre && !estado.modoNpc && entry.fichaId === estado.fichaAtualId;

                    // Terceiro (não-dono, não-Mestre) ganha Arrombar se
                    // trancado, ou Reparar/Melhorar se destrancado (manual
                    // pg. 39, mesmos fluxos da Fase 3, operando no veículo
                    // do OUTRO jogador — ver abrirModalMecanicoVeiculoTerceiro).
                    // O dono continua vendo só a informação aqui (as ações
                    // dele ficam na própria aba Veículos).
                    let acoesHtml = "";
                    if (!estado.isMestre && !ehMeuVeiculo) {
                        acoesHtml = vReal.trancado
                            ? `<button type="button" class="btn-ghost btn-cenario-arrombar" data-veiculo-nome="${escapeHtml(vReal.nome || "veículo")}">🔨 Arrombar</button>`
                            : `<span style="display:flex; gap:6px;">
                                <button type="button" class="btn-ghost btn-cenario-reparar-terceiro" data-ficha-alvo-id="${entry.fichaId}" data-veiculo-id="${entry.veiculoId}" data-veiculo-nome="${escapeHtml(vReal.nome || "veículo")}">🔧 Reparar</button>
                                <button type="button" class="btn-ghost btn-cenario-melhorar-terceiro" data-ficha-alvo-id="${entry.fichaId}" data-veiculo-id="${entry.veiculoId}" data-veiculo-nome="${escapeHtml(vReal.nome || "veículo")}">⚙️ Melhorar</button>
                               </span>`;
                    }

                    return `
                    <div class="cenario-veiculo-linha" data-cenario-veiculo-id="${veiculoId}">
                        <span>🚗 ${escapeHtml(vReal.nome || "(sem nome)")} <span class="entity-sub">(${rotuloTipoVeiculo(vReal.tipo)}, ${vReal.trancado ? "🔒 Trancado" : "🔓 Destrancado"} · ${ehMeuVeiculo ? "seu" : `de ${escapeHtml(nomeDono)}`})</span></span>
                        ${acoesHtml}
                    </div>`;
                }

                // Formato antigo (veículo criado direto pelo Mestre no
                // cenário) — comportamento inalterado: Arrombar sempre
                // disponível (mesmo destrancado, serve pra "ligar sem
                // chave" também — ver comentário de arrombarVeiculoCenario
                // acima; esses veículos nunca têm chave de verdade).
                return `
                <div class="cenario-veiculo-linha" data-cenario-veiculo-id="${veiculoId}">
                    <span>🚗 ${escapeHtml(entry.nome || "(sem nome)")} <span class="entity-sub">(${rotuloTipoVeiculo(entry.tipo)}, ${entry.trancado ? "🔒 Trancado" : "🔓 Destrancado"})</span></span>
                    ${estado.isMestre ? "" : `<button type="button" class="btn-ghost btn-cenario-arrombar" data-veiculo-nome="${escapeHtml(entry.nome || "veículo")}">🔨 Arrombar</button>`}
                </div>`;
            }).join("")
            : `<p class="hint">Nenhum veículo neste cenário.</p>`;

        // Só informativo pro jogador (decisão 5, plano-explosivos-cenario.txt)
        // — sem botão de Detonar nem Remover aqui, isso é exclusivo do
        // Mestre (montarDetalheCenario, Gerenciador de Cenário).
        const explosivosHtml = explosivos.length
            ? explosivos.map(([explosivoId, exp]) => `
                <div class="cenario-explosivo-linha" data-cenario-explosivo-id="${explosivoId}">
                    <span>💣 ${escapeHtml(exp.nome || "(sem nome)")} — dano ${exp.dano}, raio ${exp.raio}m
                        ${exp.status === "detonado" ? " · <strong>já detonado</strong>" : ""}
                    </span>
                </div>`).join("")
            : `<p class="hint">Nenhum explosivo armado neste cenário.</p>`;

        const dinheiro = Object.entries(cenario.dinheiro || {});
        const dinheiroHtml = dinheiro.length
            ? dinheiro.map(([dinheiroId, d]) => {
                const valorAtual = Number(d.valor) || 0;
                const caixaAberta = dinheiroCenarioAbertoId === dinheiroId;
                return `
                <div class="cenario-dinheiro-linha" data-cenario-dinheiro-id="${dinheiroId}">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>💰 ${escapeHtml(d.nome || "Grana")} <span class="entity-sub">(saldo: ${valorAtual})</span></span>
                        ${estado.isMestre || valorAtual <= 0 ? "" : `<button type="button" class="btn-lime btn-cenario-pegar-dinheiro" data-cenario-id="${cenario.id}" data-dinheiro-id="${dinheiroId}" data-dinheiro-nome="${escapeHtml(d.nome || "Grana")}" data-valor-max="${valorAtual}">Pegar</button>`}
                    </div>
                    ${!estado.isMestre && caixaAberta ? `
                    <div class="cenario-dinheiro-caixa" style="display:flex; gap:6px; margin-top:6px;">
                        <input type="number" class="input-cenario-pegar-valor" min="1" max="${valorAtual}" step="1" placeholder="Quanto? (máx. ${valorAtual})" style="flex:1;">
                        <button type="button" class="btn-lime btn-cenario-confirmar-pegar" data-cenario-id="${cenario.id}" data-dinheiro-id="${dinheiroId}" data-dinheiro-nome="${escapeHtml(d.nome || "Grana")}" data-valor-max="${valorAtual}">Confirmar</button>
                        <button type="button" class="btn-ghost btn-cenario-cancelar-pegar">Cancelar</button>
                    </div>` : ""}
                </div>`;
            }).join("")
            : `<p class="hint">Nenhum dinheiro solto neste cenário.</p>`;

        // Perseguição em andamento (Fase 7a/7b/7c do plano — ver
        // plano-veiculos-fase2.txt, seção "FASE 7"): status pra todo
        // mundo + botões "Testar Dirigir Veículos" (Fase 7b) e "Tentar
        // Rota de Fuga" (Fase 7c) SÓ pro participante dono dessa ficha,
        // e só se ele ainda não agiu nesta volta. Falta 7d (Manobra como
        // ação de volta + anunciar vencedor).
        const perseguicaoDesteCenario = estado.perseguicaoAtivaCache.ativo && estado.perseguicaoAtivaCache.cenarioId === cenario.id;
        const perseguicaoHtml = perseguicaoDesteCenario
            ? (() => {
                const bairro = bairroPerseguicao(estado.perseguicaoAtivaCache.bairro);
                const voltas = estado.perseguicaoAtivaCache.voltasNecessarias;
                const rotasFuga = estado.perseguicaoAtivaCache.rotasFuga || { perseguido: 0, perseguidor: 0 };
                const linhas = Object.values(estado.perseguicaoAtivaCache.participantes || {})
                    .map(p => `<span class="mod-pill">${p.lado === "perseguidor" ? "🚨" : "🏎️"} ${escapeHtml(p.nome)} (${Number(p.pontos) || 0} pt)${p.agiuNestaVolta ? " ✅" : ""}</span>`)
                    .join(" ");

                // Meu participante nesta perseguição (se eu for jogador
                // e estiver marcado nela) — Mestre nunca vê estes botões
                // aqui (ele age pelos NPCs no Gerenciador de Cenário).
                let botoesAcaoHtml = "";
                if (!estado.isMestre) {
                    const meuPidPerseguicao = Object.entries(estado.perseguicaoAtivaCache.participantes || {})
                        .find(([, p]) => p.tipo === "ficha" && p.refId === estado.fichaAtualId);
                    if (meuPidPerseguicao) {
                        const [pid, p] = meuPidPerseguicao;
                        if (p.agiuNestaVolta) {
                            botoesAcaoHtml = `<p class="hint" style="margin-top:6px;">Você já testou nesta volta — aguarde os outros pilotos.</p>`;
                        } else {
                            const btnTestarHtml = tabelaPontuacaoFugaCadastrada()
                                ? `<button type="button" class="btn-lime btn-perseguicao-testar" data-participante-id="${pid}" data-lado="${p.lado}">🎲 Testar Dirigir Veículos</button>`
                                : `<button type="button" class="btn-ghost" disabled title="Tabela de pontuação da perseguição ainda não cadastrada (dados-manual.js) — sem número pra converter o resultado em pontos.">🎲 Testar Dirigir Veículos</button>`;
                            const btnRotaFugaHtml = bairroTemDificuldadeRotaFuga(bairro)
                                ? `<button type="button" class="btn-ghost btn-perseguicao-rota-fuga" data-participante-id="${pid}" data-lado="${p.lado}" title="Abre mão da pontuação da volta pra testar Velocidade contra a dificuldade do bairro.">🏃 Tentar Rota de Fuga</button>`
                                : `<button type="button" class="btn-ghost" disabled title="Dificuldade de rota de fuga ainda não cadastrada pra esse bairro (dados-manual.js).">🏃 Tentar Rota de Fuga</button>`;
                            // Manobra como ação da volta (Fase 7d): só
                            // aparece se este piloto tiver, na ficha, o
                            // veículo cadastrado como o veículo dele
                            // nesta perseguição (p.veiculoId).
                            const veiculoDoPiloto = p.veiculoId ? (estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[p.veiculoId]) : null;
                            const btnManobraPerseguicaoHtml = veiculoDoPiloto
                                ? `<button type="button" class="btn-ghost btn-perseguicao-manobra" data-participante-id="${pid}" data-lado="${p.lado}" data-veiculo-id="${p.veiculoId}" title="Rola uma manobra (Fase 4) no lugar de Testar Dirigir Veículos — o resultado também vira pontuação da volta.">🏁 Manobra</button>`
                                : "";
                            botoesAcaoHtml = `<div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;">${btnTestarHtml}${btnRotaFugaHtml}${btnManobraPerseguicaoHtml}</div>`;
                        }
                    }
                }

                // Fim da corrida (Fase 7d): resultadoFinal só existe
                // depois que aplicarAvancoOuFimDeVolta (mestre.js) o
                // grava — a partir daí some o bloco de botões (a volta
                // não avança mais) e mostra o vencedor. O Mestre encerra
                // (zera o nó) no Gerenciador de Cenário quando quiser.
                const resultadoFinal = estado.perseguicaoAtivaCache.resultadoFinal;
                const resultadoFinalHtml = resultadoFinal
                    ? `<div class="hint" style="margin-top:4px;"><strong>🏁 Corrida encerrada</strong> — ${resultadoFinal.vencedor === "empate" ? "empate" : `venceu ${resultadoFinal.vencedor === "perseguido" ? "o(s) perseguido(s)" : "o(s) perseguidor(es)"}`} (${resultadoFinal.pontosPerseguido} perseguido x ${resultadoFinal.pontosPerseguidor} perseguidor). Aguarde o Mestre encerrar.</div>`
                    : "";

                return `
                <div class="section-header" style="margin-top:8px;">🏁 Perseguição em andamento</div>
                <div><strong>${escapeHtml(bairro ? bairro.label : estado.perseguicaoAtivaCache.bairro)}</strong> — volta ${estado.perseguicaoAtivaCache.voltaAtual || 1}${voltas ? ` de ${voltas}` : ""}</div>
                <div style="margin-top:4px;">${linhas}</div>
                <div class="hint" style="margin-top:4px;">Rotas de fuga encontradas — 🏎️ Perseguido: ${Number(rotasFuga.perseguido) || 0} · 🚨 Perseguidor: ${Number(rotasFuga.perseguidor) || 0} (cada uma vale -2 pontos pro lado adversário no total final)</div>
                ${resultadoFinal ? resultadoFinalHtml : botoesAcaoHtml}`;
            })()
            : "";

        return `
            <div class="veiculo-card" data-cenario-id="${cenario.id}">
                <div class="veiculo-header">
                    <span class="veiculo-nome">🎬 ${escapeHtml(cenario.titulo)}</span>
                </div>
                <div class="cenario-participantes">${participantesHtml}</div>
                <div class="section-header" style="margin-top:8px;">Itens</div>
                ${itensHtml}
                <div class="section-header" style="margin-top:8px;">Veículos</div>
                ${veiculosHtml}
                <div class="section-header" style="margin-top:8px;">Explosivos armados</div>
                ${explosivosHtml}
                <div class="section-header" style="margin-top:8px;">Dinheiro</div>
                ${dinheiroHtml}
                ${perseguicaoHtml}
            </div>`;
    }).join("");

    if (!estado.isMestre) {
        el.cenarioLista.querySelectorAll(".btn-cenario-pegar-item").forEach(btn => {
            btn.addEventListener("click", () => pegarItemCenario(btn.dataset.cenarioId, btn.dataset.itemId, btn.dataset.itemNome));
        });
        el.cenarioLista.querySelectorAll(".btn-cenario-arrombar").forEach(btn => {
            btn.addEventListener("click", () => arrombarVeiculoCenario(btn.dataset.veiculoNome));
        });
        // Reparo/Melhoria de veículo de OUTRO jogador (Fase 6 do plano).
        el.cenarioLista.querySelectorAll(".btn-cenario-reparar-terceiro").forEach(btn => {
            btn.addEventListener("click", () => abrirModalMecanicoVeiculoTerceiro(btn.dataset.fichaAlvoId, btn.dataset.veiculoId, btn.dataset.veiculoNome, "reparo"));
        });
        el.cenarioLista.querySelectorAll(".btn-cenario-melhorar-terceiro").forEach(btn => {
            btn.addEventListener("click", () => abrirModalMecanicoVeiculoTerceiro(btn.dataset.fichaAlvoId, btn.dataset.veiculoId, btn.dataset.veiculoNome, "upgrade"));
        });
        // Abre a caixinha de "quanto pegar" embaixo do botão clicado.
        el.cenarioLista.querySelectorAll(".btn-cenario-pegar-dinheiro").forEach(btn => {
            btn.addEventListener("click", () => {
                dinheiroCenarioAbertoId = btn.dataset.dinheiroId;
                renderizarCenarios();
                // Depois de re-renderizar, já foca o input recém-aberto.
                const input = el.cenarioLista.querySelector(".input-cenario-pegar-valor");
                if (input) input.focus();
            });
        });
        el.cenarioLista.querySelectorAll(".btn-cenario-cancelar-pegar").forEach(btn => {
            btn.addEventListener("click", () => { dinheiroCenarioAbertoId = null; renderizarCenarios(); });
        });
        el.cenarioLista.querySelectorAll(".btn-cenario-confirmar-pegar").forEach(btn => {
            btn.addEventListener("click", () => {
                const caixa = btn.closest(".cenario-dinheiro-caixa");
                const input = caixa ? caixa.querySelector(".input-cenario-pegar-valor") : null;
                pegarDinheiroCenario(btn.dataset.cenarioId, btn.dataset.dinheiroId, btn.dataset.dinheiroNome, Number(btn.dataset.valorMax) || 0, input ? input.value : "");
            });
        });
        // Testar Dirigir Veículos numa perseguição ativa (Fase 7b).
        el.cenarioLista.querySelectorAll(".btn-perseguicao-testar").forEach(btn => {
            btn.addEventListener("click", () => testarDirigirVeiculosPerseguicao(btn.dataset.participanteId, btn.dataset.lado));
        });
        // Tentar Rota de Fuga numa perseguição ativa (Fase 7c).
        el.cenarioLista.querySelectorAll(".btn-perseguicao-rota-fuga").forEach(btn => {
            btn.addEventListener("click", () => tentarRotaFugaPerseguicao(btn.dataset.participanteId, btn.dataset.lado));
        });
        // Manobra como ação da volta numa perseguição ativa (Fase 7d).
        el.cenarioLista.querySelectorAll(".btn-perseguicao-manobra").forEach(btn => {
            btn.addEventListener("click", () => abrirModalManobraVeiculo(btn.dataset.veiculoId, { participanteId: btn.dataset.participanteId, lado: btn.dataset.lado }));
        });
    }
}

// Fecha a caixinha de "quanto pegar" de dinheiro solto no cenário (se
// estiver aberta) — chamada de ficha.js/pegarDinheiroCenario depois que
// o pedido é enviado ao Mestre, já que essa variável de controle agora
// mora só aqui (mesmo padrão de fecharCaixaDepositarDinheiroItem em
// abas/inventario.js).
export function fecharCaixaPegarDinheiroCenario() {
    dinheiroCenarioAbertoId = null;
}

// =====================================================================
// CENÁRIOS (compartilhado — ver plano-cenario.txt, Fase 4/6): Mestre
// monta em montarGerenciadorCenario, jogador consome em
// renderizarCenarios (aba "Cenário" da ficha).
// =====================================================================
export function configurarCenarios() {
    ouvirCenarios((lista) => {
        estado.cenariosCache = lista || [];
        // Se o Gerenciador de Cenário estiver aberto, atualiza em tempo real.
        if (estado.isMestre && el.modalCenarioMestre && el.modalCenarioMestre.classList.contains("active")) {
            el.cenarioMestreCorpo.innerHTML = "";
            montarGerenciadorCenario(el.cenarioMestreCorpo);
        }
        if (typeof renderizarCenarios === "function") renderizarCenarios();
    });
}

// =====================================================================
// GERENCIADOR DE PERSEGUIÇÃO (compartilhado — Fase 7a do plano, ver
// plano-veiculos-fase2.txt, seção "FASE 7"). Mestre monta em
// montarGerenciadorCenario/montarDetalheCenario (botão "Iniciar
// Corrida/Perseguição" quando há 2+ veículos no cenário); jogador
// consome em renderizarCenarios (aba "Cenário"), mesmo padrão de
// configurarCombateAtivo (ficha.js). Fase 7 completa (7a status/iniciar/
// encerrar, 7b/7c ações de volta, 7d Manobra integrada + fim de corrida).
// =====================================================================
export function configurarPerseguicaoAtiva() {
    ouvirPerseguicaoAtiva((estado) => {
        estado.perseguicaoAtivaCache = estado || { ativo: false, participantes: {} };
        if (estado.isMestre && el.modalCenarioMestre && el.modalCenarioMestre.classList.contains("active")) {
            el.cenarioMestreCorpo.innerHTML = "";
            montarGerenciadorCenario(el.cenarioMestreCorpo);
        }
        if (typeof renderizarCenarios === "function") renderizarCenarios();
    });
}

// =====================================================================
// GERENCIADOR DE CENÁRIO (Mestre) — ver plano-cenario.txt, Fase 6.
// Cria/renomeia/encerra cenários, adiciona e remove participantes
// (ficha/NPC), itens soltos e veículos (sempre trancado + semChave).
// =====================================================================
let cenarioAbertoIdNoGerenciador = null; // qual cenário está expandido no momento (só 1 por vez, pra não poluir a tela)

export function montarGerenciadorCenario(corpo) {
    // ---- Criar novo cenário ----
    const secaoNovo = document.createElement("div");
    secaoNovo.className = "section-header";
    secaoNovo.innerText = "Criar cenário";
    corpo.appendChild(secaoNovo);

    const inputTitulo = document.createElement("input");
    inputTitulo.type = "text";
    inputTitulo.placeholder = "Título do cenário (ex: Beco atrás do Neon Rosa)";
    const btnCriar = document.createElement("button");
    btnCriar.className = "btn-lime"; btnCriar.type = "button"; btnCriar.innerText = "+ Criar cenário";
    btnCriar.addEventListener("click", async () => {
        if (!inputTitulo.value.trim()) { toast("Dê um título ao cenário.", "erro"); return; }
        const novoId = await criarCenario({ titulo: inputTitulo.value.trim() });
        inputTitulo.value = "";
        cenarioAbertoIdNoGerenciador = novoId; // já abre expandido pra popular participantes/itens
        toast("Cenário criado.");
        // O próprio listener de configurarCenarios() re-renderiza o
        // Gerenciador quando estado.cenariosCache mudar (push do Firebase).
    });
    corpo.append(inputTitulo, btnCriar);

    // ---- Lista de cenários ativos ----
    const secaoLista = document.createElement("div");
    secaoLista.className = "section-header";
    secaoLista.innerText = `Cenários ativos${estado.cenariosCache.length ? ` (${estado.cenariosCache.length})` : ""}`;
    secaoLista.style.marginTop = "14px";
    corpo.appendChild(secaoLista);

    if (!estado.cenariosCache.length) {
        const vazio = document.createElement("p");
        vazio.className = "hint";
        vazio.innerText = "Nenhum cenário ativo no momento.";
        corpo.appendChild(vazio);
        return;
    }

    estado.cenariosCache.forEach(cenario => {
        const card = document.createElement("div");
        card.className = "npc-card";
        card.style.flexDirection = "column";
        card.style.alignItems = "stretch";
        card.style.marginBottom = "10px";

        const topo = document.createElement("div");
        topo.style.display = "flex";
        topo.style.justifyContent = "space-between";
        topo.style.alignItems = "center";
        topo.style.cursor = "pointer";
        const participantesCount = Object.keys(cenario.participantes || {}).length;
        const itensCount = Object.keys(cenario.itens || {}).length;
        const veiculosCount = Object.keys(cenario.veiculos || {}).length;
        topo.innerHTML = `<span>🎬 <strong>${escapeHtml(cenario.titulo)}</strong> <span class="entity-sub">(${participantesCount} participante(s), ${itensCount} item(ns), ${veiculosCount} veículo(s))</span></span><span>${cenarioAbertoIdNoGerenciador === cenario.id ? "▲" : "▼"}</span>`;
        topo.addEventListener("click", () => {
            cenarioAbertoIdNoGerenciador = cenarioAbertoIdNoGerenciador === cenario.id ? null : cenario.id;
            el.cenarioMestreCorpo.innerHTML = "";
            montarGerenciadorCenario(el.cenarioMestreCorpo);
        });
        card.appendChild(topo);

        if (cenarioAbertoIdNoGerenciador === cenario.id) {
            const detalhe = document.createElement("div");
            detalhe.style.marginTop = "10px";
            detalhe.style.display = "flex";
            detalhe.style.flexDirection = "column";
            detalhe.style.gap = "10px";
            card.appendChild(detalhe);
            montarDetalheCenario(detalhe, cenario);
        }

        corpo.appendChild(card);
    });
}

// Conteúdo expandido de um cenário dentro do Gerenciador: renomear,
// participantes, itens, veículos e encerrar.
function montarDetalheCenario(detalhe, cenario) {
    const atualizar = () => {
        el.cenarioMestreCorpo.innerHTML = "";
        montarGerenciadorCenario(el.cenarioMestreCorpo);
    };

    // ---- Renomear ----
    const linhaTitulo = document.createElement("div");
    linhaTitulo.style.display = "flex";
    linhaTitulo.style.gap = "6px";
    const inputRenomear = document.createElement("input");
    inputRenomear.type = "text";
    inputRenomear.value = cenario.titulo;
    const btnRenomear = document.createElement("button");
    btnRenomear.className = "btn-ghost"; btnRenomear.type = "button"; btnRenomear.innerText = "Renomear";
    btnRenomear.addEventListener("click", async () => {
        if (!inputRenomear.value.trim()) { toast("Título não pode ficar vazio.", "erro"); return; }
        await renomearCenario(cenario.id, inputRenomear.value.trim());
        toast("Cenário renomeado.");
    });
    linhaTitulo.append(inputRenomear, btnRenomear);
    detalhe.appendChild(linhaTitulo);

    // ---- Encerrar cenário (ver plano-cenario.txt, Fase 7): remove o nó
    // inteiro — itens e veículos não levados pelos jogadores se perdem
    // junto, de propósito (cenário passageiro). ----
    const btnEncerrar = document.createElement("button");
    btnEncerrar.className = "btn-red"; btnEncerrar.type = "button"; btnEncerrar.innerText = "Encerrar cenário";
    btnEncerrar.style.alignSelf = "flex-start";
    btnEncerrar.addEventListener("click", async () => {
        if (!confirm(`Encerrar "${cenario.titulo}"? Itens e veículos não levados pelos jogadores se perdem junto. Essa ação não pode ser desfeita.`)) return;
        cenarioAbertoIdNoGerenciador = null;
        await excluirCenario(cenario.id);
        toast("Cenário encerrado.");
    });
    detalhe.appendChild(btnEncerrar);

    // ---- Participantes ----
    const secaoParticipantes = document.createElement("div");
    secaoParticipantes.className = "section-header";
    secaoParticipantes.innerText = "Participantes";
    detalhe.appendChild(secaoParticipantes);

    const participantes = cenario.participantes || {};
    Object.entries(participantes).forEach(([pid, p]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>${p.tipo === "ficha" ? "🧑" : "👤"} ${escapeHtml(p.nome)} <span class="entity-sub">(${p.tipo === "ficha" ? "jogador" : "NPC"})</span></span>`;
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerParticipanteCenario(cenario.id, pid); toast("Removido do cenário."); });
        linha.appendChild(btnRemover);
        detalhe.appendChild(linha);
    });

    const selectFichaAdd = criarSelectFichas(false);
    const btnAddFicha = document.createElement("button");
    btnAddFicha.className = "btn-lime"; btnAddFicha.type = "button"; btnAddFicha.innerText = "+ Add ficha";
    btnAddFicha.addEventListener("click", async () => {
        if (!selectFichaAdd.value) { toast("Escolha uma ficha.", "erro"); return; }
        const jaEsta = Object.values(participantes).some(p => p.tipo === "ficha" && p.refId === selectFichaAdd.value);
        if (jaEsta) { toast("Essa ficha já está no cenário.", "erro"); return; }
        await adicionarParticipanteCenario(cenario.id, { tipo: "ficha", refId: selectFichaAdd.value, nome: nomeDeFicha(selectFichaAdd.value) });
        toast("Ficha adicionada ao cenário.");
    });
    const linhaAddFicha = document.createElement("div");
    linhaAddFicha.style.display = "flex"; linhaAddFicha.style.gap = "6px";
    linhaAddFicha.append(selectFichaAdd, btnAddFicha);
    detalhe.appendChild(linhaAddFicha);

    const selectNpcAdd = document.createElement("select");
    selectNpcAdd.innerHTML = '<option value="">-- escolha um NPC --</option>';
    ouvirNpcs((npcs) => {
        const valorAtual = selectNpcAdd.value;
        selectNpcAdd.innerHTML = '<option value="">-- escolha um NPC --</option>';
        npcs.forEach(npc => {
            const opt = document.createElement("option");
            opt.value = npc.id; opt.innerText = npc.nome;
            selectNpcAdd.appendChild(opt);
        });
        selectNpcAdd.value = valorAtual;
    });
    const btnAddNpc = document.createElement("button");
    btnAddNpc.className = "btn-lime"; btnAddNpc.type = "button"; btnAddNpc.innerText = "+ Add NPC";
    btnAddNpc.addEventListener("click", async () => {
        if (!selectNpcAdd.value) { toast("Escolha um NPC.", "erro"); return; }
        const jaEsta = Object.values(participantes).some(p => p.tipo === "npc" && p.refId === selectNpcAdd.value);
        if (jaEsta) { toast("Esse NPC já está no cenário.", "erro"); return; }
        const nomeOpt = selectNpcAdd.options[selectNpcAdd.selectedIndex].innerText;
        await adicionarParticipanteCenario(cenario.id, { tipo: "npc", refId: selectNpcAdd.value, nome: nomeOpt });
        toast("NPC adicionado ao cenário.");
    });
    const linhaAddNpc = document.createElement("div");
    linhaAddNpc.style.display = "flex"; linhaAddNpc.style.gap = "6px";
    linhaAddNpc.append(selectNpcAdd, btnAddNpc);
    detalhe.appendChild(linhaAddNpc);

    // ---- Itens soltos ----
    const secaoItens = document.createElement("div");
    secaoItens.className = "section-header";
    secaoItens.innerText = "Itens no cenário";
    detalhe.appendChild(secaoItens);

    const itens = cenario.itens || {};
    Object.entries(itens).forEach(([itemId, it]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>📦 ${escapeHtml(it.nome || "(sem nome)")}${it.tag ? ` <span class="entity-sub">(${escapeHtml(rotuloTag(it.tag))}${it.peso ? ` · ${it.peso} kg` : ""})</span>` : ""}</span>`;
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerItemCenario(cenario.id, itemId); toast("Item removido do cenário."); });
        linha.appendChild(btnRemover);
        detalhe.appendChild(linha);
    });

    // Puxar do Banco Global: clona um item já cadastrado na Biblioteca
    // de Itens (com peso/tag/perícia/tudo) direto pro cenário — assim,
    // quando o jogador "Pegar" depois, o item chega completo no
    // inventário em vez de só um nome solto. Campos que só fazem
    // sentido dentro de uma ficha (categoria levando/casa) ou do molde
    // do Banco (categoriaBanco, origemFichaId) não vêm junto.
    const selectPuxarBanco = document.createElement("select");
    const optPuxarVazia = document.createElement("option");
    optPuxarVazia.value = ""; optPuxarVazia.innerText = "Puxar do Banco Global...";
    selectPuxarBanco.appendChild(optPuxarVazia);
    estado.itensGlobaisCache.slice().sort((a, b) => (a.nome || "").localeCompare(b.nome || "")).forEach(it => {
        const opt = document.createElement("option");
        opt.value = it.id;
        opt.innerText = it.nome;
        selectPuxarBanco.appendChild(opt);
    });
    const btnPuxarBanco = document.createElement("button");
    btnPuxarBanco.className = "btn-blue"; btnPuxarBanco.type = "button"; btnPuxarBanco.innerText = "+ Puxar";
    btnPuxarBanco.addEventListener("click", async () => {
        const idEscolhido = selectPuxarBanco.value;
        if (!idEscolhido) { toast("Escolha um item do Banco Global.", "erro"); return; }
        const itemBanco = estado.itensGlobaisCache.find(it => it.id === idEscolhido);
        if (!itemBanco) { toast("Item não encontrado no Banco Global.", "erro"); return; }
        const { id: _id, categoriaBanco: _categoriaBanco, origemFichaId: _origemFichaId, ...itemLimpo } = itemBanco;
        await adicionarItemCenario(cenario.id, itemLimpo);
        selectPuxarBanco.value = "";
        toast(`"${itemBanco.nome}" adicionado ao cenário.`);
    });
    const linhaPuxarBanco = document.createElement("div");
    linhaPuxarBanco.style.display = "flex"; linhaPuxarBanco.style.gap = "6px"; linhaPuxarBanco.style.flexWrap = "wrap";
    linhaPuxarBanco.append(selectPuxarBanco, btnPuxarBanco);
    detalhe.appendChild(linhaPuxarBanco);

    // Criar item novo, com stats completos (tag, peso, perícia etc.) —
    // reaproveita o mesmo modal de item do Banco Global (ver
    // abrirModalNovoItemParaCenario/salvarItemBancoDoModal), mas em vez
    // de salvar na Biblioteca, grava direto no cenário. Não fica
    // guardado no Banco Global depois — se quiser reaproveitar em
    // outra mesa/cena, crie pela Biblioteca de Itens e puxe de lá.
    const btnCriarCompleto = document.createElement("button");
    btnCriarCompleto.className = "btn-lime"; btnCriarCompleto.type = "button"; btnCriarCompleto.innerText = "+ Criar item completo";
    btnCriarCompleto.addEventListener("click", () => abrirModalNovoItemParaCenario(cenario.id));
    detalhe.appendChild(btnCriarCompleto);

    // Item narrativo rápido (só nome + observação, sem stats) — mantido
    // pra loot puramente descritivo que o Mestre não quer detalhar
    // mecanicamente (ex: "Fotos comprometedoras", "Bilhete rasgado").
    const inputNomeItem = document.createElement("input");
    inputNomeItem.type = "text";
    inputNomeItem.placeholder = "Item narrativo rápido, sem stats (ex: Bilhete rasgado)";
    const inputObsItem = document.createElement("input");
    inputObsItem.type = "text";
    inputObsItem.placeholder = "Observação (opcional)";
    const btnAddItem = document.createElement("button");
    btnAddItem.className = "btn-ghost"; btnAddItem.type = "button"; btnAddItem.innerText = "+ Add narrativo";
    btnAddItem.addEventListener("click", async () => {
        if (!inputNomeItem.value.trim()) { toast("Dê um nome ao item.", "erro"); return; }
        await adicionarItemCenario(cenario.id, { nome: inputNomeItem.value.trim(), observacao: inputObsItem.value.trim() || "" });
        inputNomeItem.value = ""; inputObsItem.value = "";
        toast("Item adicionado ao cenário.");
    });
    const linhaAddItem = document.createElement("div");
    linhaAddItem.style.display = "flex"; linhaAddItem.style.gap = "6px"; linhaAddItem.style.flexWrap = "wrap";
    linhaAddItem.append(inputNomeItem, inputObsItem, btnAddItem);
    detalhe.appendChild(linhaAddItem);

    // ---- Explosivos armados (ver plano-explosivos-cenario.txt, Fase 3)
    // — só o Mestre chega aqui. "Detonar" gera uma pendência "está no
    // raio?" por participante do cenário (jogadores E NPCs); o explosivo
    // continua listado depois (status "detonado"), pra não sumir do
    // radar de ninguém no meio da resolução das pendências — remoção
    // definitiva é sempre manual (decisão 6). Não tem formulário de "+
    // Add explosivo" aqui: só chega neste nó pelo "Armar" do jogador
    // (ficha.js, Fase 2). ----
    const secaoExplosivos = document.createElement("div");
    secaoExplosivos.className = "section-header";
    secaoExplosivos.innerText = "Explosivos armados";
    detalhe.appendChild(secaoExplosivos);

    const explosivos = cenario.explosivos || {};
    if (!Object.keys(explosivos).length) {
        const vazio = document.createElement("p");
        vazio.className = "hint";
        vazio.innerText = "Nenhum explosivo armado neste cenário.";
        detalhe.appendChild(vazio);
    }
    Object.entries(explosivos).forEach(([explosivoId, exp]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>💣 ${escapeHtml(exp.nome || "(sem nome)")} — dano ${exp.dano}, raio ${exp.raio}m
            ${exp.status === "detonado" ? " · <strong>já detonado</strong>" : ""}
            <span class="entity-sub">armado por ${escapeHtml(exp.armadoPorNome || "?")}${exp.moduloDetonacaoNome ? ` · ${escapeHtml(exp.moduloDetonacaoNome)}` : ""}</span></span>`;
        const botoes = document.createElement("span");
        botoes.style.display = "flex"; botoes.style.gap = "6px";
        if (exp.status !== "detonado") {
            const btnDetonar = document.createElement("button");
            btnDetonar.className = "btn-red"; btnDetonar.type = "button"; btnDetonar.innerText = "💥 Detonar";
            btnDetonar.addEventListener("click", async () => {
                if (!confirm(`Detonar "${exp.nome}"? Isso cria uma pendência "está no raio?" pra cada participante do cenário — a aplicação do dano fica pro painel de Ações Pendentes.`)) return;
                try {
                    await detonarExplosivoCenario(cenario.id, explosivoId);
                    toast("Pendências de raio de efeito criadas — resolva na fila de Ações Pendentes.");
                } catch (err) {
                    console.error(err);
                    toast(err && err.message ? err.message : "Falha ao detonar.", "erro");
                }
            });
            botoes.appendChild(btnDetonar);
        }
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-ghost"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerExplosivoCenario(cenario.id, explosivoId); toast("Explosivo removido do cenário."); });
        botoes.appendChild(btnRemover);
        linha.appendChild(botoes);
        detalhe.appendChild(linha);
    });

    // ---- Químicos liberados (ver plano-quimicos-cenario.txt) — cópia da
    // seção "Explosivos armados" acima, trocando ícone 💣→💨 e
    // "Detonar"→"Liberar". Só o Mestre chega aqui. "Liberar" gera uma
    // pendência "estava na área?" por participante do cenário (jogadores
    // E NPCs); o químico continua listado depois (status "resolvido"),
    // pra não sumir do radar no meio da resolução das pendências —
    // remoção definitiva é sempre manual (mesma decisão de explosivos).
    // Não tem formulário de "+ Add químico" aqui: só chega neste nó pelo
    // "Usar" do jogador (ficha.js, abrirModalUsarQuimicoArea). ----
    const secaoQuimicos = document.createElement("div");
    secaoQuimicos.className = "section-header";
    secaoQuimicos.innerText = "Químicos liberados";
    detalhe.appendChild(secaoQuimicos);

    const quimicos = cenario.quimicos || {};
    if (!Object.keys(quimicos).length) {
        const vazio = document.createElement("p");
        vazio.className = "hint";
        vazio.innerText = "Nenhum químico usado neste cenário.";
        detalhe.appendChild(vazio);
    }
    Object.entries(quimicos).forEach(([quimicoId, q]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>💨 ${escapeHtml(q.nome || "(sem nome)")}${q.tipoEfeito ? ` — ${escapeHtml(q.tipoEfeito)}` : ""}${q.raio ? `, raio ${q.raio}m` : ""}
            ${q.status === "resolvido" ? " · <strong>já resolvido</strong>" : ""}
            <span class="entity-sub">usado por ${escapeHtml(q.usadoPorNome || "?")}</span></span>`;
        const botoes = document.createElement("span");
        botoes.style.display = "flex"; botoes.style.gap = "6px";
        if (q.status !== "resolvido") {
            const btnLiberar = document.createElement("button");
            btnLiberar.className = "btn-red"; btnLiberar.type = "button"; btnLiberar.innerText = "💨 Liberar";
            btnLiberar.addEventListener("click", async () => {
                if (!confirm(`Liberar "${q.nome}"? Isso cria uma pendência "estava na área?" pra cada participante do cenário — a aplicação do efeito fica pro painel de Ações Pendentes.`)) return;
                try {
                    await liberarQuimicoCenario(cenario.id, quimicoId);
                    toast("Pendências de área criadas — resolva na fila de Ações Pendentes.");
                } catch (err) {
                    console.error(err);
                    toast(err && err.message ? err.message : "Falha ao liberar.", "erro");
                }
            });
            botoes.appendChild(btnLiberar);
        }
        const btnRemoverQuimico = document.createElement("button");
        btnRemoverQuimico.className = "btn-ghost"; btnRemoverQuimico.type = "button"; btnRemoverQuimico.innerText = "Remover";
        btnRemoverQuimico.addEventListener("click", async () => { await removerQuimicoCenario(cenario.id, quimicoId); toast("Químico removido do cenário."); });
        botoes.appendChild(btnRemoverQuimico);
        linha.appendChild(botoes);
        detalhe.appendChild(linha);
    });

    // ---- Dinheiro solto no cenário (jogador pega um valor específico,
    // até o limite do saldo — ver btn-cenario-pegar-dinheiro em
    // renderizarCenarios e "pegar_dinheiro_cenario" em mestre.js) ----
    const secaoDinheiro = document.createElement("div");
    secaoDinheiro.className = "section-header";
    secaoDinheiro.innerText = "Dinheiro no cenário";
    detalhe.appendChild(secaoDinheiro);

    const dinheiros = cenario.dinheiro || {};
    Object.entries(dinheiros).forEach(([dinheiroId, d]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";
        linha.innerHTML = `<span>💰 ${escapeHtml(d.nome || "Grana")} <span class="entity-sub">(saldo: ${Number(d.valor) || 0})</span></span>`;
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerDinheiroCenario(cenario.id, dinheiroId); toast("Dinheiro removido do cenário."); });
        linha.appendChild(btnRemover);
        detalhe.appendChild(linha);
    });

    const inputNomeDinheiro = document.createElement("input");
    inputNomeDinheiro.type = "text";
    inputNomeDinheiro.placeholder = "Nome do saldo (ex: Grana do cofre)";
    const inputValorDinheiro = document.createElement("input");
    inputValorDinheiro.type = "number";
    inputValorDinheiro.min = "1";
    inputValorDinheiro.placeholder = "Valor";
    const btnAddDinheiro = document.createElement("button");
    btnAddDinheiro.className = "btn-lime"; btnAddDinheiro.type = "button"; btnAddDinheiro.innerText = "+ Add dinheiro";
    btnAddDinheiro.addEventListener("click", async () => {
        if (!inputNomeDinheiro.value.trim()) { toast("Dê um nome ao saldo.", "erro"); return; }
        const valor = Math.floor(Number(inputValorDinheiro.value));
        if (!inputValorDinheiro.value || isNaN(valor) || valor <= 0) { toast("Digite um valor válido.", "erro"); return; }
        await adicionarDinheiroCenario(cenario.id, { nome: inputNomeDinheiro.value.trim(), valor });
        inputNomeDinheiro.value = ""; inputValorDinheiro.value = "";
        toast("Dinheiro adicionado ao cenário.");
    });
    const linhaAddDinheiro = document.createElement("div");
    linhaAddDinheiro.style.display = "flex"; linhaAddDinheiro.style.gap = "6px"; linhaAddDinheiro.style.flexWrap = "wrap";
    linhaAddDinheiro.append(inputNomeDinheiro, inputValorDinheiro, btnAddDinheiro);
    detalhe.appendChild(linhaAddDinheiro);

    // ---- Veículos (sempre trancado + semChave — ver adicionarVeiculoCenario) ----
    const secaoVeiculos = document.createElement("div");
    secaoVeiculos.className = "section-header";
    secaoVeiculos.innerText = "Veículos no cenário";
    detalhe.appendChild(secaoVeiculos);

    const veiculos = cenario.veiculos || {};
    Object.entries(veiculos).forEach(([veiculoId, entry]) => {
        const linha = document.createElement("div");
        linha.style.display = "flex";
        linha.style.justifyContent = "space-between";
        linha.style.alignItems = "center";

        // Ponteiro pra veículo de JOGADOR (Fase 6 do plano — ver
        // plano-veiculos-fase2.txt, seção "FASE 6"): a fonte de verdade
        // é fichas/{fichaId}/veiculos/{veiculoId} (estado.todasAsFichasCache),
        // não os campos da entry. Trancar/destrancar aqui precisa
        // escrever no veículo de verdade (definirTrancaVeiculoJogador),
        // não em editarVeiculoCenario (que escreveria numa entry que não
        // tem esses campos de verdade). "Remover" aqui só tira o
        // ponteiro do cenário (removerVeiculoDoCenario) — o veículo
        // continua existindo, só "guardado" de volta na ficha do dono.
        if (entry.origem === "jogador") {
            const fichaDona = estado.todasAsFichasCache[entry.fichaId];
            const vReal = fichaDona && fichaDona.veiculos && fichaDona.veiculos[entry.veiculoId];
            const nomeDono = (fichaDona && fichaDona.config && fichaDona.config.nomeExibicao) || entry.fichaId;

            if (!vReal) {
                // Dono apagou o veículo com o ponteiro ainda no cenário —
                // só sobra tirar o ponteiro morto.
                linha.innerHTML = `<span>🚗 <span class="hint">Veículo de ${escapeHtml(nomeDono)} — removido pelo dono.</span></span>`;
                const btnRemoverPointer = document.createElement("button");
                btnRemoverPointer.className = "btn-red"; btnRemoverPointer.type = "button"; btnRemoverPointer.innerText = "Remover ponteiro";
                btnRemoverPointer.addEventListener("click", async () => { await removerVeiculoCenario(cenario.id, veiculoId); toast("Ponteiro removido do cenário."); });
                linha.appendChild(btnRemoverPointer);
                detalhe.appendChild(linha);
                return;
            }

            linha.innerHTML = `<span>🚗 ${escapeHtml(vReal.nome || "(sem nome)")} <span class="entity-sub">(${rotuloTipoVeiculo(vReal.tipo)}, ${vReal.trancado ? "🔒 Trancado" : "🔓 Destrancado"} · de ${escapeHtml(nomeDono)}${!vReal.trancado && vReal.ultimoADestrancar ? ` · último a destrancar: ${escapeHtml(vReal.ultimoADestrancar)}` : ""})</span></span>`;

            const botoes = document.createElement("span");
            botoes.style.display = "flex"; botoes.style.gap = "6px"; botoes.style.alignItems = "center";

            // "Quem destrancou por último" (item 4 do plano): só faz
            // sentido perguntar quando o clique vai DESTRANCAR (a
            // resolução de um Arrombar bem-sucedido = roubo) — trancar
            // de novo não muda esse registro.
            let inputDestravadoPor = null;
            if (vReal.trancado) {
                inputDestravadoPor = document.createElement("input");
                inputDestravadoPor.type = "text";
                inputDestravadoPor.placeholder = "quem destrancou?";
                inputDestravadoPor.style.width = "130px";
                botoes.appendChild(inputDestravadoPor);
            }

            const btnAlternar = document.createElement("button");
            btnAlternar.className = "btn-ghost"; btnAlternar.type = "button";
            btnAlternar.innerText = vReal.trancado ? "Destrancar (sucesso no Arrombar / roubo)" : "Trancar de novo";
            btnAlternar.addEventListener("click", async () => {
                const nomeDestravador = inputDestravadoPor ? inputDestravadoPor.value.trim() : "";
                await definirTrancaVeiculoJogador(entry.fichaId, entry.veiculoId, !vReal.trancado, vReal.trancado ? nomeDestravador : undefined);
                toast(vReal.trancado ? "Veículo destrancado — posse mudou de mãos." : "Veículo trancado de novo.");
            });

            const btnRemoverDoCenario = document.createElement("button");
            btnRemoverDoCenario.className = "btn-red"; btnRemoverDoCenario.type = "button"; btnRemoverDoCenario.innerText = "Remover do cenário";
            btnRemoverDoCenario.addEventListener("click", async () => {
                await removerVeiculoDoCenario(cenario.id, veiculoId, entry.fichaId, entry.veiculoId);
                toast("Veículo removido do cenário (continua guardado na ficha do dono).");
            });

            botoes.append(btnAlternar, btnRemoverDoCenario);
            linha.appendChild(botoes);
            detalhe.appendChild(linha);
            return;
        }

        // Formato antigo (veículo criado direto pelo Mestre no cenário,
        // sem dono) — comportamento inalterado.
        linha.innerHTML = `<span>🚗 ${escapeHtml(entry.nome || "(sem nome)")} <span class="entity-sub">(${rotuloTipoVeiculo(entry.tipo)}, ${entry.trancado ? "🔒 Trancado" : "🔓 Destrancado"})</span></span>`;
        const botoes = document.createElement("span");
        botoes.style.display = "flex"; botoes.style.gap = "6px";
        const btnAlternar = document.createElement("button");
        btnAlternar.className = "btn-ghost"; btnAlternar.type = "button";
        btnAlternar.innerText = entry.trancado ? "Destrancar (sucesso no Arrombar)" : "Trancar de novo";
        btnAlternar.addEventListener("click", async () => { await editarVeiculoCenario(cenario.id, veiculoId, { trancado: !entry.trancado }); toast(entry.trancado ? "Veículo destrancado." : "Veículo trancado."); });
        const btnRemover = document.createElement("button");
        btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
        btnRemover.addEventListener("click", async () => { await removerVeiculoCenario(cenario.id, veiculoId); toast("Veículo removido do cenário."); });
        botoes.append(btnAlternar, btnRemover);
        linha.appendChild(botoes);
        detalhe.appendChild(linha);
    });

    const btnMostrarFormVeiculo = document.createElement("button");
    btnMostrarFormVeiculo.className = "btn-ghost"; btnMostrarFormVeiculo.type = "button"; btnMostrarFormVeiculo.innerText = "+ Add veículo";
    const areaFormVeiculo = document.createElement("div");
    areaFormVeiculo.style.display = "none";
    areaFormVeiculo.style.marginTop = "6px";
    areaFormVeiculo.style.display = "none";
    detalhe.append(btnMostrarFormVeiculo, areaFormVeiculo);

    btnMostrarFormVeiculo.addEventListener("click", () => {
        areaFormVeiculo.style.display = areaFormVeiculo.style.display === "none" ? "block" : "none";
        if (areaFormVeiculo.style.display === "block" && !areaFormVeiculo.hasChildNodes()) {
            montarFormularioVeiculoCenario(areaFormVeiculo, cenario.id);
        }
    });

    // ---- Corrida/Perseguição (Fase 7a do plano — ver
    // plano-veiculos-fase2.txt, seção "FASE 7") ----
    montarSecaoPerseguicaoCenario(detalhe, cenario, veiculos);
}

// Botão "Iniciar Corrida/Perseguição" (só aparece com 2+ veículos no
// cenário, exatamente o gatilho pedido no plano original), OU o status
// da perseguição já em andamento nesse cenário + "Encerrar" — inclui o
// contador de rotas de fuga (Fase 7c), o anúncio do vencedor quando a
// corrida já acabou (Fase 7d) e, por participante, um lançamento manual
// de teste/rota de fuga (Fase 7e) — o único jeito de pontuar por um NPC,
// já que os botões de "Perseguição em andamento" da aba Cenário
// (renderizarCenarios) só existem pro jogador dono da própria ficha. O
// nó só é zerado quando o Mestre clica "Encerrar Perseguição" — a
// corrida acabada não se limpa sozinha.
function montarSecaoPerseguicaoCenario(detalhe, cenario, veiculos) {
    const secao = document.createElement("div");
    secao.className = "section-header";
    secao.innerText = "Corrida / Perseguição";
    detalhe.appendChild(secao);

    const perseguicaoDesteCenario = estado.perseguicaoAtivaCache.ativo && estado.perseguicaoAtivaCache.cenarioId === cenario.id;

    // Já rolando uma perseguição em OUTRO cenário — nó singleton por
    // mesa (mesmo espírito de combateAtivo), então não dá pra iniciar
    // outra aqui até a primeira ser encerrada.
    if (estado.perseguicaoAtivaCache.ativo && !perseguicaoDesteCenario) {
        const aviso = document.createElement("p");
        aviso.className = "hint";
        aviso.innerText = "Já existe uma perseguição em andamento em outro cenário — encerre-a antes de iniciar uma nova.";
        detalhe.appendChild(aviso);
        return;
    }

    if (perseguicaoDesteCenario) {
        const bairro = bairroPerseguicao(estado.perseguicaoAtivaCache.bairro);
        const card = document.createElement("div");
        card.className = "npc-card";
        card.style.flexDirection = "column";
        card.style.alignItems = "stretch";
        const voltas = estado.perseguicaoAtivaCache.voltasNecessarias;
        const rotasFuga = estado.perseguicaoAtivaCache.rotasFuga || { perseguido: 0, perseguidor: 0 };
        const resultadoFinal = estado.perseguicaoAtivaCache.resultadoFinal;
        const resultadoFinalHtml = resultadoFinal
            ? `<span class="entity-sub" style="color:var(--lime,#a6e22e);"><strong>🏁 Corrida encerrada</strong> — ${resultadoFinal.vencedor === "empate" ? "empate" : `venceu ${resultadoFinal.vencedor === "perseguido" ? "o(s) perseguido(s)" : "o(s) perseguidor(es)"}`} (${resultadoFinal.pontosPerseguido} perseguido x ${resultadoFinal.pontosPerseguidor} perseguidor) — clique "Encerrar Perseguição" quando quiser.</span>`
            : "";
        card.innerHTML = `<strong>🏁 ${escapeHtml(bairro ? bairro.label : estado.perseguicaoAtivaCache.bairro)}</strong>
            <span class="entity-sub">Volta ${estado.perseguicaoAtivaCache.voltaAtual || 1}${voltas ? ` de ${voltas}` : " (nº de voltas ainda não cadastrado pro bairro — ver dados-manual.js)"}</span>
            <span class="entity-sub">Rotas de fuga encontradas (Fase 7c, -2 pontos pro lado adversário cada) — 🏎️ Perseguido: ${Number(rotasFuga.perseguido) || 0} · 🚨 Perseguidor: ${Number(rotasFuga.perseguidor) || 0}</span>
            ${resultadoFinalHtml}`;
        const listaParticipantes = document.createElement("div");
        listaParticipantes.style.marginTop = "8px";
        Object.entries(estado.perseguicaoAtivaCache.participantes || {}).forEach(([pid, p]) => {
            const linhaWrap = document.createElement("div");
            linhaWrap.style.marginTop = "4px";

            const linha = document.createElement("div");
            linha.style.display = "flex";
            linha.style.justifyContent = "space-between";
            linha.style.alignItems = "center";
            linha.innerHTML = `<span>${p.lado === "perseguidor" ? "🚨" : "🏎️"} ${escapeHtml(p.nome)} <span class="entity-sub">(${p.lado} · ${Number(p.pontos) || 0} ponto(s))${p.agiuNestaVolta ? " · ✅ já testou" : " · ⏳ aguardando"}</span></span>`;
            const btnRemover = document.createElement("button");
            btnRemover.className = "btn-red"; btnRemover.type = "button"; btnRemover.innerText = "Remover";
            btnRemover.addEventListener("click", async () => { await removerParticipantePerseguicao(pid); toast("Piloto removido da perseguição."); });
            linha.appendChild(btnRemover);
            linhaWrap.appendChild(linha);

            // Fase 7e: ação manual do Mestre — registra o resultado de um
            // teste (Testar Dirigir Veículos ou Rota de Fuga) EM NOME
            // deste participante. Indispensável pra NPCs (tipo:"npc"),
            // que não têm como usar os botões de "Perseguição em
            // andamento" da aba Cenário (esses só aparecem pro jogador
            // dono da própria ficha, ver renderizarCenarios) — mas
            // funciona pra qualquer participante, inclusive um jogador
            // ausente da mesa naquela rodada. O Mestre digita o
            // resultado já pronto (d20 + modificador, decidido/rolado
            // fora do app ou combinado na mesa) — não recalcula perícia
            // nenhuma, é puramente um "lançamento manual" no mesmo
            // espírito do campo de dano manual de veículo. Só aparece
            // enquanto o participante ainda não agiu nesta volta e a
            // corrida não tiver acabado.
            if (!p.agiuNestaVolta && !resultadoFinal) {
                const acaoManual = document.createElement("div");
                acaoManual.style.display = "flex";
                acaoManual.style.gap = "4px";
                acaoManual.style.flexWrap = "wrap";
                acaoManual.style.marginTop = "2px";
                acaoManual.style.marginBottom = "4px";

                const inputResultado = document.createElement("input");
                inputResultado.type = "number";
                inputResultado.placeholder = "Resultado (d20+mod)";
                inputResultado.style.width = "150px";
                acaoManual.appendChild(inputResultado);

                const btnTestar = document.createElement("button");
                btnTestar.className = "btn-lime"; btnTestar.type = "button";
                btnTestar.innerText = "🎲 Registrar Teste";
                btnTestar.title = "Converte o resultado em pontos da volta (Testar Dirigir Veículos), igual ao botão do jogador.";
                btnTestar.addEventListener("click", async () => {
                    if (!tabelaPontuacaoFugaCadastrada()) { toast("Tabela de pontuação da perseguição ainda não cadastrada.", "erro"); return; }
                    const valor = Number(inputResultado.value);
                    if (!Number.isFinite(valor)) { toast("Digite o resultado do teste (d20 + modificador).", "erro"); return; }
                    const pontos = pontosPorResultadoTesteFuga(valor);
                    if (pontos === null) { toast("Resultado fora de qualquer faixa cadastrada — nenhum ponto aplicado.", "erro"); return; }
                    try {
                        await registrarPontosPerseguicao(pid, pontos, valor, "Mestre");
                        toast(`+${pontos} ponto(s) pra ${p.nome} (resultado ${valor}).`, pontos > 0 ? "ok" : "erro");
                    } catch (err) {
                        console.error(err);
                        toast(err && err.message ? err.message : "Falha ao registrar teste.", "erro");
                    }
                });
                acaoManual.appendChild(btnTestar);

                const btnRotaSucesso = document.createElement("button");
                btnRotaSucesso.className = "btn-ghost"; btnRotaSucesso.type = "button";
                btnRotaSucesso.innerText = "🏃 Rota de fuga: achou";
                btnRotaSucesso.title = "Abre mão da pontuação da volta — soma 1 rota de fuga encontrada pro lado deste piloto (-2 pontos pro lado adversário no total final).";
                btnRotaSucesso.addEventListener("click", async () => {
                    const valor = Number(inputResultado.value) || 0;
                    try {
                        await registrarTentativaRotaFugaPerseguicao(pid, true, valor);
                        toast(`${p.nome} encontrou uma rota de fuga — abriu mão da pontuação da volta.`, "ok");
                    } catch (err) {
                        console.error(err);
                        toast(err && err.message ? err.message : "Falha ao registrar rota de fuga.", "erro");
                    }
                });
                acaoManual.appendChild(btnRotaSucesso);

                const btnRotaFalha = document.createElement("button");
                btnRotaFalha.className = "btn-ghost"; btnRotaFalha.type = "button";
                btnRotaFalha.innerText = "🏃 Rota de fuga: não achou";
                btnRotaFalha.addEventListener("click", async () => {
                    const valor = Number(inputResultado.value) || 0;
                    try {
                        await registrarTentativaRotaFugaPerseguicao(pid, false, valor);
                        toast(`${p.nome} não encontrou uma rota de fuga — abriu mão da pontuação da volta mesmo assim.`, "erro");
                    } catch (err) {
                        console.error(err);
                        toast(err && err.message ? err.message : "Falha ao registrar rota de fuga.", "erro");
                    }
                });
                acaoManual.appendChild(btnRotaFalha);

                linhaWrap.appendChild(acaoManual);
            }

            listaParticipantes.appendChild(linhaWrap);
        });
        card.appendChild(listaParticipantes);

        const linhaBotoes = document.createElement("div");
        linhaBotoes.style.display = "flex";
        linhaBotoes.style.gap = "6px";
        linhaBotoes.style.marginTop = "8px";

        // Override manual — avança a volta mesmo que nem todo mundo
        // tenha testado (ex.: jogador ausente naquela rodada). Some
        // depois que a corrida já acabou (resultadoFinal) — nesse ponto
        // só falta o Mestre encerrar, não faz mais sentido avançar volta.
        if (!resultadoFinal) {
            const btnAvancar = document.createElement("button");
            btnAvancar.className = "btn-ghost"; btnAvancar.type = "button"; btnAvancar.innerText = "Avançar volta manualmente";
            btnAvancar.addEventListener("click", async () => {
                await avancarVoltaManualPerseguicao();
                toast("Volta avançada manualmente.");
            });
            linhaBotoes.appendChild(btnAvancar);
        }

        const btnEncerrar = document.createElement("button");
        btnEncerrar.className = "btn-red"; btnEncerrar.type = "button"; btnEncerrar.innerText = "Encerrar Perseguição";
        btnEncerrar.addEventListener("click", async () => {
            if (!confirm("Encerrar a perseguição? Essa ação não pode ser desfeita.")) return;
            await encerrarPerseguicao();
            toast("Perseguição encerrada.");
        });
        linhaBotoes.appendChild(btnEncerrar);
        card.appendChild(linhaBotoes);
        detalhe.appendChild(card);
        return;
    }

    const veiculosCount = Object.keys(veiculos || {}).length;
    if (veiculosCount < 2) {
        const aviso = document.createElement("p");
        aviso.className = "hint";
        aviso.innerText = "Precisa de pelo menos 2 veículos no cenário pra iniciar uma corrida/perseguição.";
        detalhe.appendChild(aviso);
        return;
    }

    const btnAbrirForm = document.createElement("button");
    btnAbrirForm.className = "btn-lime"; btnAbrirForm.type = "button"; btnAbrirForm.innerText = "🏁 Iniciar Corrida/Perseguição";
    const areaForm = document.createElement("div");
    areaForm.style.display = "none";
    areaForm.style.marginTop = "8px";
    detalhe.append(btnAbrirForm, areaForm);
    btnAbrirForm.addEventListener("click", () => {
        areaForm.style.display = areaForm.style.display === "none" ? "block" : "none";
        if (areaForm.style.display === "block" && !areaForm.hasChildNodes()) {
            montarFormularioIniciarPerseguicao(areaForm, cenario, veiculos);
        }
    });
}

// Mini-formulário: escolher bairro + pra cada veículo presente, quem
// pilota (sugerido a partir de cenario.participantes, ver plano) e de
// que lado (perseguido/perseguidor). "Nenhum piloto" descarta aquele
// veículo da perseguição (ex.: veículo do formato antigo, sem dono,
// parado em cena, que não vai entrar na corrida).
function montarFormularioIniciarPerseguicao(area, cenario, veiculos) {
    const participantesCenario = cenario.participantes || {};

    const selectBairro = document.createElement("select");
    listarBairrosPerseguicao().forEach(b => {
        const opt = document.createElement("option");
        opt.value = b.key; opt.innerText = b.label;
        selectBairro.appendChild(opt);
    });
    const linhaBairro = document.createElement("div");
    linhaBairro.style.display = "flex"; linhaBairro.style.gap = "6px"; linhaBairro.style.alignItems = "center";
    linhaBairro.innerHTML = "<span>Bairro:</span>";
    linhaBairro.appendChild(selectBairro);
    area.appendChild(linhaBairro);

    const linhasPorVeiculo = [];
    Object.entries(veiculos).forEach(([veiculoId, entry], idx) => {
        let nomeVeiculo = entry.nome || "(sem nome)";
        if (entry.origem === "jogador") {
            const fichaDona = estado.todasAsFichasCache[entry.fichaId];
            const vReal = fichaDona && fichaDona.veiculos && fichaDona.veiculos[entry.veiculoId];
            nomeVeiculo = vReal ? (vReal.nome || "(sem nome)") : "(veículo removido pelo dono)";
        }

        const linha = document.createElement("div");
        linha.style.display = "flex"; linha.style.gap = "6px"; linha.style.alignItems = "center"; linha.style.flexWrap = "wrap";
        linha.style.marginTop = "6px";

        const label = document.createElement("span");
        label.innerText = `🚗 ${nomeVeiculo}:`;
        linha.appendChild(label);

        const selectPiloto = document.createElement("select");
        selectPiloto.innerHTML = '<option value="">-- não participa --</option>';
        Object.entries(participantesCenario).forEach(([pid, p]) => {
            const opt = document.createElement("option");
            opt.value = pid; opt.innerText = p.nome;
            selectPiloto.appendChild(opt);
        });
        linha.appendChild(selectPiloto);

        const selectLado = document.createElement("select");
        selectLado.innerHTML = '<option value="perseguido">perseguido</option><option value="perseguidor">perseguidor</option>';
        // Alterna o default entre os dois lados por veículo, só pra dar
        // um ponto de partida razoável (Mestre ajusta à vontade).
        if (idx % 2 === 1) selectLado.value = "perseguidor";
        linha.appendChild(selectLado);

        area.appendChild(linha);
        linhasPorVeiculo.push({ veiculoId, selectPiloto, selectLado });
    });

    const btnConfirmar = document.createElement("button");
    btnConfirmar.className = "btn-lime"; btnConfirmar.type = "button"; btnConfirmar.innerText = "Confirmar e iniciar";
    btnConfirmar.style.marginTop = "10px";
    btnConfirmar.addEventListener("click", async () => {
        const participantesEntrada = linhasPorVeiculo
            .filter(l => l.selectPiloto.value)
            .map(l => {
                const p = participantesCenario[l.selectPiloto.value];
                return { tipo: p.tipo, refId: p.refId, nome: p.nome, veiculoId: l.veiculoId, lado: l.selectLado.value };
            });
        try {
            await iniciarPerseguicao(cenario.id, selectBairro.value, participantesEntrada);
            toast("Perseguição iniciada.");
        } catch (err) {
            console.error(err);
            toast(err && err.message ? err.message : "Falha ao iniciar perseguição.", "erro");
        }
    });
    area.appendChild(btnConfirmar);
}

// Formulário compacto pra criar um veículo direto num cenário — reaproveita
// os mesmos dados de ATRIBUTOS_VEICULO/TIPOS_VEICULO/escalaVeiculo já
// usados no modal de veículo da ficha, só que grava em
// cenarios/{id}/veiculos em vez de fichas/{id}/veiculos (ver
// adicionarVeiculoCenario em mestre.js, que já fixa trancado:true e
// semChave:true na escrita).
function montarFormularioVeiculoCenario(area, cenarioId) {
    const inputNome = document.createElement("input");
    inputNome.type = "text";
    inputNome.placeholder = "Nome do veículo (ex: Quadra Vermelha)";
    area.appendChild(inputNome);

    const selectTipo = document.createElement("select");
    selectTipo.innerHTML = TIPOS_VEICULO.map(t => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join("");
    area.appendChild(selectTipo);

    const gridAtributos = document.createElement("div");
    gridAtributos.className = "grid-atributos";
    const selectsAtributo = {};
    ATRIBUTOS_VEICULO.forEach(chave => {
        const escala = escalaVeiculo(chave);
        const campo = document.createElement("div");
        campo.className = "modal-field";
        const label = document.createElement("label");
        label.innerText = escala.label;
        const select = document.createElement("select");
        select.innerHTML = escala.niveis.map((n, i) => `<option value="${i}">${i} — ${escapeHtml(n.efeito || "")}</option>`).join("");
        selectsAtributo[chave] = select;
        campo.append(label, select);
        gridAtributos.appendChild(campo);
    });
    area.appendChild(gridAtributos);

    const btnSalvar = document.createElement("button");
    btnSalvar.className = "btn-lime"; btnSalvar.type = "button"; btnSalvar.innerText = "Salvar veículo";
    btnSalvar.addEventListener("click", async () => {
        if (!inputNome.value.trim()) { toast("Dê um nome ao veículo.", "erro"); return; }
        const atributos = {};
        ATRIBUTOS_VEICULO.forEach(chave => { atributos[chave] = Number(selectsAtributo[chave].value) || 0; });
        await adicionarVeiculoCenario(cenarioId, { nome: inputNome.value.trim(), tipo: selectTipo.value, atributos });
        toast("Veículo adicionado ao cenário.");
    });
    area.appendChild(btnSalvar);
}
