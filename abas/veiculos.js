// abas/veiculos.js
// ---------------------------------------------------------------------
// Aba Veículos — cards de veículo (atributos, PV, manutenção,
// acessórios, armas instaladas) e o listener/gravação do fator de
// preço de materiais (ajuste de mesa sobre o CN$ do mecânico).
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt,
// Passo 18). Além das 2 funções listadas no plano (renderizarVeiculos,
// configurarFatorPrecoMateriaisVeiculo), veio junto o helper privado só
// usado por ela (linhasAtributoVeiculo — monta as linhas de texto de
// cada atributo do card).
//
// As ~15 funções de AÇÃO dos botões do card (abrirModalInstalarAcessorioVeiculo,
// removerAcessorioVeiculo, testarAcessorioVeiculo, usarAcessorioVeiculo,
// resetarUsosAcessoriosVeiculo, abrirModalInstalarArmaVeiculo,
// removerArmaDoVeiculo, alternarTrancaVeiculo, aplicarDanoManualVeiculo,
// solicitarManutencaoVeiculo, abrirModalMecanicoVeiculo,
// limparBonusTemporariosVeiculo, alternarVeiculoNoCenario) continuam em
// ficha.js, só exportadas — duas delas (abrirModalManobraVeiculo,
// motivoMecanicoVeiculoIndisponivel) já são compartilhadas com o
// Gerenciador de Perseguição/Cenário (Fase 5, Passo 20/21, ainda não
// feito), e as outras ficam junto por consistência/menor risco — mover
// esse segundo grupo também exigiria destrinchar uma teia grande de
// escritas no Firebase (mestre.js) sem ganho de organização real agora,
// já que continuam 100% exclusivas do domínio Veículos de qualquer
// forma. Podem ser revisitadas numa parte 2 deste arquivo depois, se
// fizer sentido.
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import {
    el, escapeHtml, abrirModalEdicao, cenarioAtualDoPersonagem, iniciarUsoItem,
    modificadoresAtuais, aplicarDanoManualVeiculo, limparBonusTemporariosVeiculo,
    resetarUsosAcessoriosVeiculo, solicitarManutencaoVeiculo, alternarTrancaVeiculo,
    abrirModalMecanicoVeiculo, abrirModalManobraVeiculo, alternarVeiculoNoCenario,
    abrirModalInstalarAcessorioVeiculo, removerAcessorioVeiculo, testarAcessorioVeiculo,
    usarAcessorioVeiculo, abrirModalInstalarArmaVeiculo, removerArmaDoVeiculo,
    motivoMecanicoVeiculoIndisponivel
} from "../ficha.js?v=20260830-npcnivelpv";
import {
    calcularModificadoresVeiculo, custoReparoVeiculo, custoUpgradeVeiculo,
    itensArmaInstaladosEmVeiculo, modificadoresQueAfetam, slotsAcessoriosUsados,
    valorManutencaoVeiculo, veiculoTemChaveDisponivel
} from "../regras.js";
import {
    ATRIBUTOS_VEICULO, rotuloAtributoVeiculo, rotuloTipoVeiculo, buscarAcessorioVeiculo,
    periciaUsoComoArray, periodicidadeManutencaoVeiculo, todosOsSaldos
} from "../dados-manual.js";
import { itemPodeUsar } from "../inventario.js";
import {
    ouvirFatorPrecoMateriaisVeiculo, definirFatorPrecoMateriaisVeiculo
} from "../mestre.js?v=20260830-npcnivelpv";

// ---------------------------------------------------------------------
// VEÍCULOS (manual pg. 36-43) — Fase 4 do plano (ver plano-veiculos.txt):
// visão do jogador, somente leitura. Um card por veículo com os 5
// atributos já calculados (ver calcularModificadoresVeiculo em
// regras.js) + o valor de manutenção. Criar/editar os atributos fica
// pro formulário do Mestre (fase 5) — aqui é só exibição.
// ---------------------------------------------------------------------
function linhasAtributoVeiculo(chave, infoAtributo) {
    switch (chave) {
        case "velocidade":
            return [
                `${infoAtributo.kmhMax} km/h máx.`,
                `${infoAtributo.acoesPorTurno} ação(ões)/turno (limitado ao Raciocínio do piloto)`,
                infoAtributo.penalidadePorProtecao ? `nível efetivo ${infoAtributo.nivelEfetivo} (${infoAtributo.penalidadePorProtecao} pela Proteção)` : null
            ];
        case "eficiencia":
            return [`${infoAtributo.turnosAteVelocidadeMaxima} turno(s) até a velocidade máxima`];
        case "protecao":
            return [
                `${infoAtributo.pvMaximo} PV`,
                infoAtributo.reducaoDano ? `reduz ${infoAtributo.reducaoDano} de dano` : "sem redução de dano"
            ];
        case "capacidadeCarga":
            return [
                `${infoAtributo.kgMax} kg suportados`,
                infoAtributo.penalidadeContabilidade ? `${infoAtributo.penalidadeContabilidade} em Contabilidade` : null
            ];
        case "controle":
            return [
                infoAtributo.penalidadeRolagensGerais ? `${infoAtributo.penalidadeRolagensGerais} em todas as rolagens` : null,
                !infoAtributo.podeRealizarManobras ? "incapaz de fazer manobras" : (infoAtributo.bonusDrift ? `+${infoAtributo.bonusDrift} em drift` : "pronto pra drift"),
                infoAtributo.bonusFugaCorrida ? `+${infoAtributo.bonusFugaCorrida} em fuga/corrida` : null
            ];
        case "acessorios":
            // Fase 5a do plano (plano-acessorios-veiculo.txt): só o
            // total de slots aqui — a lista do que está instalado e o
            // usado/livre por acessório é da Fase 5b/5d (catálogo ainda
            // não existe nesta fase).
            return [`${infoAtributo.slotsDisponiveis} slot(s) disponível(is) para acessórios/armamento`];
        default:
            return [];
    }
}

export function renderizarVeiculos() {
    if (!el.veiculosLista) return;

    if (el.btnAddVeiculo) el.btnAddVeiculo.style.display = estado.isMestre ? "inline-block" : "none";

    // Ações por turno (Velocidade) dependem do Raciocínio do piloto — na
    // visão da ficha, "o piloto" é o dono da própria ficha, já com
    // modificadores estruturados aplicados (mesma lógica de
    // renderizarAtributos pra atributo primário).
    const modificadoresPlanos = modificadoresAtuais();
    const raciocinioBase = Number(estado.fichaAtual.dados.raciocinio) || 0;
    const ajustesRaciocinio = modificadoresQueAfetam("atributo:raciocinio", modificadoresPlanos).reduce((acc, m) => acc + m.valor, 0);
    const raciocinioPiloto = raciocinioBase + ajustesRaciocinio;

    const veiculos = estado.fichaAtual.veiculos || {};
    const ids = Object.keys(veiculos);

    if (!ids.length) {
        el.veiculosLista.innerHTML = `<p class="entity-list-empty" style="cursor:default;">Nenhum veículo cadastrado ainda.</p>`;
        return;
    }

    el.veiculosLista.innerHTML = ids.map(id => {
        const v = veiculos[id];
        const atributos = v.atributos || {};
        // Vida do veículo (Fase 2 do plano — ver plano-veiculos-fase2.txt):
        // deterioracoes entra aqui pra TODOS os blocos abaixo (PV
        // máximo, kmh máx., redução de dano etc.) já saírem calculados
        // com o valor efetivo, não o bruto — ver calcularModificadoresVeiculo
        // (regras.js).
        const deterioracoes = v.deterioracoes || [];
        // Bônus temporário de manobra (Fase 4 — ver plano-veiculos-fase2.txt,
        // seção "FASE 4"): entra aqui pra TODOS os blocos abaixo (PV
        // máximo, kmh máx. etc.) já saírem calculados com o bônus
        // aplicado, mesmo espírito de deterioracoes na Fase 2.
        const bonusTemporarios = v.bonusTemporarios || [];
        const mods = calcularModificadoresVeiculo(atributos, raciocinioPiloto, deterioracoes, bonusTemporarios);
        const manutencao = valorManutencaoVeiculo(atributos);
        const periodicidade = periodicidadeManutencaoVeiculo(v.tipo);

        // Deteriorações por atributo, só pra saber quais atributos têm
        // "Reparar" disponível neste card (Fase 3 do plano — ver
        // plano-veiculos-fase2.txt).
        const atributosDeteriorados = new Set((deterioracoes || []).filter(d => d && d.valor > 0).map(d => d.atributo));

        const blocosHtml = ATRIBUTOS_VEICULO.map(chave => {
            const linhas = linhasAtributoVeiculo(chave, mods[chave]).filter(Boolean);
            const nivelAtual = mods[chave].nivel;

            // "Melhorar" (upgrade — Fase 3): só pro jogador (Mestre edita
            // nível direto no modal de edição do veículo), só se ainda
            // não estiver no nível 5. Desabilita com tooltip explicando o
            // que falta (custo não cadastrado, kit insuficiente, material
            // faltando) — mesmo padrão de outros botões de craft "cinza
            // com motivo" já usados no resto do sistema.
            let melhorarHtml = "";
            if (!estado.isMestre) {
                if (nivelAtual >= 5) {
                    melhorarHtml = `<button type="button" class="btn-ghost veiculo-mecanico-btn" disabled title="Atributo já no nível máximo.">🔧⬆️ Melhorar</button>`;
                } else {
                    const nivelAlvo = nivelAtual + 1;
                    const custoUp = custoUpgradeVeiculo(chave, nivelAlvo);
                    const motivo = motivoMecanicoVeiculoIndisponivel(custoUp, Math.max(1, nivelAlvo), estado.fichaAtual);
                    melhorarHtml = `<button type="button" class="btn-ghost veiculo-mecanico-btn" data-veiculo-upgrade-btn data-atributo="${chave}" ${motivo ? "disabled" : ""} title="${escapeHtml(motivo || `Subir para nível ${nivelAlvo}` + (custoUp ? ` — CN$ ${custoUp.preco}` : ""))}">🔧⬆️ Melhorar</button>`;
                }
            }

            // "Reparar" (Fase 3): só aparece se ESTE atributo específico
            // tiver deterioração acumulada (ver atributosDeteriorados
            // acima) — cada atributo deteriorado é reparado separadamente
            // (manual pg. 39, "some quando o veículo é consertado").
            let repararHtml = "";
            if (!estado.isMestre && atributosDeteriorados.has(chave)) {
                const custoRep = custoReparoVeiculo(chave, nivelAtual);
                const motivo = motivoMecanicoVeiculoIndisponivel(custoRep, Math.max(1, nivelAtual), estado.fichaAtual);
                repararHtml = `<button type="button" class="btn-ghost veiculo-mecanico-btn" data-veiculo-reparo-btn data-atributo="${chave}" ${motivo ? "disabled" : ""} title="${escapeHtml(motivo || `Remove o dano acumulado deste atributo` + (custoRep ? ` — CN$ ${custoRep.preco}` : ""))}">🛠 Reparar</button>`;
            }

            return `
                <div class="veiculo-atributo-item">
                    <div class="veiculo-atributo-label">
                        <span>${escapeHtml(rotuloAtributoVeiculo(chave))}</span>
                        <span class="veiculo-atributo-nivel">${nivelAtual}</span>
                    </div>
                    ${linhas.map(l => `<div class="veiculo-atributo-linha">${escapeHtml(l)}</div>`).join("")}
                    ${(melhorarHtml || repararHtml) ? `<div class="veiculo-atributo-acoes" data-veiculo-atributo-acoes>${melhorarHtml}${repararHtml}</div>` : ""}
                </div>
            `;
        }).join("");

        // Barra de PV do veículo (Fase 2) — mesmo espírito da barra de
        // PV do personagem (renderizarBarrasVitaisTopo): pvAtual null =
        // "cheio" (equivale ao pvMaximo já calculado com deteriorações
        // em cima, ver mods.protecao.pvMaximo acima). Cor crítica
        // quando cai dentro do último quinto — o mesmo limiar que
        // dispara a próxima deterioração automática (aplicarDanoVeiculo,
        // regras.js), então a barra fica vermelha bem na hora em que
        // "mais um golpe quebra outro atributo" passa a ser verdade.
        const pvMaximoVeiculo = mods.protecao.pvMaximo;
        const pvAtualVeiculo = (v.pvAtual === null || v.pvAtual === undefined) ? pvMaximoVeiculo : Number(v.pvAtual);
        const pctPvVeiculo = pvMaximoVeiculo > 0 ? Math.max(0, Math.min(100, (pvAtualVeiculo / pvMaximoVeiculo) * 100)) : 0;
        const pvCriticoVeiculo = pvMaximoVeiculo > 0 && pvAtualVeiculo <= pvMaximoVeiculo / 5;
        const pvBarraHtml = `
            <div class="veiculo-pv-wrap">
                <div class="veiculo-pv-texto${pvCriticoVeiculo ? " veiculo-pv-texto-critica" : ""}">PV: ${Math.round(pvAtualVeiculo)}/${Math.round(pvMaximoVeiculo)}</div>
                <div class="veiculo-pv-track">
                    <div class="veiculo-pv-fill${pvCriticoVeiculo ? " veiculo-pv-fill-critica" : ""}" style="width:${pctPvVeiculo}%;"></div>
                </div>
            </div>
        `;

        // Badge de deterioração (manual pg. 39): agrupa as entradas de
        // deterioracoes por atributo (cada entrada é um -1 isolado, ver
        // normalizarVeiculos) só pra exibição — o cálculo de verdade já
        // foi consumido dentro de mods acima.
        let deterioracaoBadgeHtml = "";
        if (deterioracoes.length) {
            const somaPorAtributo = {};
            deterioracoes.forEach(d => { somaPorAtributo[d.atributo] = (somaPorAtributo[d.atributo] || 0) + (Number(d.valor) || 0); });
            const partes = Object.entries(somaPorAtributo)
                .filter(([, valor]) => valor > 0)
                .map(([attr, valor]) => `-${valor} ${rotuloAtributoVeiculo(attr)}`);
            if (partes.length) {
                deterioracaoBadgeHtml = `<div class="mod-pill negativo veiculo-deterioracao-badge">⚠️ ${escapeHtml(partes.join(", "))} (dano acumulado)</div>`;
            }
        }

        // Badge de bônus temporário de manobra (Fase 4): mesma ideia da
        // badge de deterioração acima, só que positiva — soma por
        // atributo só pra exibição (o cálculo de verdade já foi
        // consumido dentro de mods acima). Mestre ganha um botão
        // "Limpar" pra tirar os bônus manualmente ao fim da cena
        // (manual: "por uma cena" — sem cron job, ver plano).
        let bonusBadgeHtml = "";
        if (bonusTemporarios.length) {
            const somaBonusPorAtributo = {};
            bonusTemporarios.forEach(b => { somaBonusPorAtributo[b.atributo] = (somaBonusPorAtributo[b.atributo] || 0) + (Number(b.valor) || 0); });
            const partesBonus = Object.entries(somaBonusPorAtributo)
                .filter(([, valor]) => valor !== 0)
                .map(([attr, valor]) => `${valor > 0 ? "+" : ""}${valor} ${rotuloAtributoVeiculo(attr)}`);
            if (partesBonus.length) {
                bonusBadgeHtml = `<div class="mod-pill positivo veiculo-bonus-badge">🏁 ${escapeHtml(partesBonus.join(", "))} (bônus de manobra, por uma cena)${estado.isMestre ? ` <button type="button" class="btn-ghost veiculo-bonus-limpar-btn" data-veiculo-bonus-limpar>Limpar</button>` : ""}</div>`;
            }
        }

        // Campo do Mestre pra aplicar dano manual (Fase 2 do plano):
        // mesmo padrão da ferramenta de "Causar dano" do combate
        // (aplicarDano, mestre.js), só que endereçado por
        // fichaId+veiculoId em vez de participanteId — veículo ainda
        // não é participante de combate (isso é Fase 9, fora de
        // escopo). Escolher o atributo a deteriorar é opcional
        // (fallback Velocidade, ver aplicarDanoVeiculo em regras.js).
        const opcoesAtributoDano = ATRIBUTOS_VEICULO.filter(chave => chave !== "protecao")
            .map(chave => `<option value="${chave}" ${chave === "velocidade" ? "selected" : ""}>${escapeHtml(rotuloAtributoVeiculo(chave))}</option>`)
            .join("");
        const danoManualHtml = estado.isMestre ? `
            <div class="veiculo-dano-manual" data-veiculo-dano-manual>
                <input type="number" class="veiculo-dano-input" data-veiculo-dano-valor min="0" step="1" placeholder="Dano">
                <select class="veiculo-dano-atributo" data-veiculo-dano-atributo title="Além de Proteção, qual atributo deteriora junto">${opcoesAtributoDano}</select>
                <button type="button" class="btn-red veiculo-dano-btn" data-veiculo-dano-btn>Aplicar dano</button>
            </div>
        ` : "";

        // Pagamento de manutenção: só o jogador pede (regra 4, mesma fila
        // de Ações Pendentes já usada por "Gastar dinheiro" em Finanças —
        // ver solicitarManutencaoVeiculo). O Mestre edita os saldos direto,
        // então não precisa desse fluxo de aprovação.
        const saldosDisponiveis = estado.isMestre ? [] : todosOsSaldos(estado.fichaAtual);
        const manutencaoHtml = estado.isMestre ? "" : `
            <div class="veiculo-manutencao-pedido">
                <select class="veiculo-manutencao-origem" data-veiculo-manutencao-origem>
                    ${saldosDisponiveis.map(s => `<option value="${s.id}">${escapeHtml(s.nome)}</option>`).join("")}
                </select>
                <button type="button" class="btn-ghost veiculo-manutencao-btn" data-veiculo-manutencao-btn ${saldosDisponiveis.length ? "" : "disabled"}>Solicitar pagamento de manutenção</button>
            </div>
        `;

        // Trava (ver plano-veiculos.txt, adendo "chave"): destrancar é
        // ação direta do próprio jogador (não passa pela fila de Ações
        // Pendentes — usar a própria chave não precisa de aprovação do
        // Mestre), mas só fica disponível se a ficha tiver, no
        // inventário, uma chave apontando pra este veículo. Trancar de
        // novo também é livre (não precisa da chave pra fechar a
        // porta). Mestre não vê esse bloco — ele edita `trancado` direto
        // no modal, se precisar.
        const temChave = veiculoTemChaveDisponivel(estado.fichaAtual, id);
        const trancaHtml = estado.isMestre ? "" : (v.trancado
            ? `<button type="button" class="btn-ghost veiculo-tranca-btn" data-veiculo-destrancar ${temChave ? "" : "disabled"} title="${temChave ? "" : "Você não tem a chave deste veículo."}">🔒 Destrancar${temChave ? "" : " (sem chave)"}</button>`
            : `<button type="button" class="btn-ghost veiculo-tranca-btn" data-veiculo-trancar>🔓 Trancar</button>`);

        // Manobra (Fase 4 do plano — ver plano-veiculos-fase2.txt): só
        // pro jogador (piloto), abre abrirModalManobraVeiculo com o
        // catálogo das 8 manobras do manual.
        const manobraHtml = estado.isMestre ? "" : `<button type="button" class="btn-ghost veiculo-manobra-btn" data-veiculo-manobra-btn>🏁 Manobra</button>`;

        // Acessórios instalados (Fase 5b do plano — ver
        // plano-acessorios-veiculo.txt, seção "FASE 5b"): lista o que já
        // está instalado (v.acessoriosInstalados, já normalizado com
        // `.nivel` resolvido do catálogo — ver normalizarVeiculos) +
        // botão "+ Instalar Acessório". Só pro jogador interagir (mesmo
        // padrão de Melhorar/Reparar/Manobra) — Mestre só vê a lista e
        // ganha um botão extra pra resetar os usos "uma vez por cena".
        const acessoriosInstalados = v.acessoriosInstalados || [];
        // Acessórios-arma (Fase 5c do plano — ver plano-acessorios-veiculo.txt,
        // seção "FASE 5c"): não vivem em acessoriosInstalados, vivem como
        // item comum do inventário DESTA MESMA ficha com
        // item.instaladoEmVeiculoId apontando pra este veículo (ver
        // itensArmaInstaladosEmVeiculo, regras.js). Entram no cálculo de
        // slots igual aos passivos.
        const itensArmaInstalados = itensArmaInstaladosEmVeiculo(estado.fichaAtual.inventario, id);
        const slotsTotal = mods.acessorios.slotsDisponiveis;
        const slotsUsados = slotsAcessoriosUsados(acessoriosInstalados, itensArmaInstalados);
        const linhasAcessoriosHtml = acessoriosInstalados.map(inst => {
            const cat = buscarAcessorioVeiculo(inst.key);
            if (!cat) return "";
            let acaoHtml = "";
            if (!estado.isMestre) {
                if (cat.mecanica === "teste_dif_fixa") {
                    acaoHtml = `<button type="button" class="btn-ghost veiculo-acessorio-testar-btn" data-veiculo-acessorio-testar data-key="${cat.key}" title="Rola ${escapeHtml(cat.periciaTeste)} contra dificuldade ${cat.dificuldade}.">🎲 Testar (dif. ${cat.dificuldade})</button>`;
                } else if (cat.mecanica === "uma_vez_por_cena") {
                    acaoHtml = inst.usadoNestaCena
                        ? `<button type="button" class="btn-ghost" disabled title="Já usado nesta cena — o Mestre reseta ao trocar de cena.">Já usado nesta cena</button>`
                        : `<button type="button" class="btn-ghost veiculo-acessorio-usar-btn" data-veiculo-acessorio-usar data-key="${cat.key}">✅ Usar (1x por cena)</button>`;
                }
            }
            const removerHtml = !estado.isMestre
                ? `<button type="button" class="btn-ghost veiculo-acessorio-remover-btn" data-veiculo-acessorio-remover data-key="${cat.key}" title="Remove e libera o slot na hora.">🗑️</button>`
                : "";
            return `
                <div class="veiculo-acessorio-linha" data-acessorio-key="${cat.key}">
                    <div class="veiculo-acessorio-linha-topo">
                        <strong>${escapeHtml(cat.nome)}</strong>
                        <span class="hint-inline">${cat.nivel} slot(s)</span>
                    </div>
                    <p class="hint">${escapeHtml(cat.descricao)}</p>
                    <div class="veiculo-acessorio-linha-acoes">${acaoHtml}${removerHtml}</div>
                </div>
            `;
        }).join("");
        const resetarUsosHtml = estado.isMestre && acessoriosInstalados.some(a => {
            const cat = buscarAcessorioVeiculo(a.key);
            return cat && cat.mecanica === "uma_vez_por_cena";
        })
            ? `<button type="button" class="btn-ghost veiculo-acessorio-resetar-usos-btn" data-veiculo-acessorio-resetar-usos>🔄 Resetar usos desta cena</button>`
            : "";
        const instalarAcessorioHtml = !estado.isMestre
            ? `<button type="button" class="btn-ghost veiculo-acessorio-instalar-btn" data-veiculo-acessorio-instalar-btn>+ Instalar Acessório</button>`
            : "";

        // Acessórios-arma instalados (Fase 5c do plano — ver
        // plano-acessorios-veiculo.txt, seção "FASE 5c"): mesma seção
        // visual dos acessórios passivos (Fase 5d: "nada de sub-aba
        // nova"), lista os itens-arma com item.instaladoEmVeiculoId
        // apontando pra este veículo (itensArmaInstalados, calculado
        // acima). "🎯 Disparar" reaproveita 100% o fluxo normal de
        // "Usar" uma arma do inventário (iniciarUsoItem) — já sabe
        // sozinho se abre seleção de alvo (combate ativo) ou rola
        // direto (fora de combate), exatamente como o manual pede
        // ("disparos seguem as regras normais da arma"). Só aparece
        // habilitado se itemPodeUsar(it) (precisa estar "levando" e
        // equipada — ver instalarArmaEmVeiculo, que já marca
        // equipada:true ao montar).
        const linhasArmasHtml = itensArmaInstalados.map(it => {
            const podeDisparar = !estado.isMestre && itemPodeUsar(it);
            const disparoHtml = !estado.isMestre
                ? `<button type="button" class="btn-ghost veiculo-arma-disparar-btn" data-veiculo-arma-disparar data-item-id="${it.id}" ${podeDisparar ? "" : "disabled"} title="${podeDisparar ? `Rolar d20 + ${periciaUsoComoArray(it.periciaUso)[0] || "perícia"}` : "Item precisa estar equipado/levando pra disparar."}">🎯 Disparar</button>`
                : "";
            const removerArmaHtml = !estado.isMestre
                ? `<button type="button" class="btn-ghost veiculo-arma-remover-btn" data-veiculo-arma-remover data-item-id="${it.id}" title="Remove do veículo e libera o slot — a arma continua no inventário normal.">Remover do veículo</button>`
                : "";
            const slotVeiculoLabel = it.slotVeiculo ? ` · ${escapeHtml(it.slotVeiculo)}` : "";
            return `
                <div class="veiculo-acessorio-linha" data-item-id="${it.id}">
                    <div class="veiculo-acessorio-linha-topo">
                        <strong>🔫 ${escapeHtml(it.nome)}</strong>
                        <span class="hint-inline">${Number(it.nivelTag) || 0} slot(s)${slotVeiculoLabel}</span>
                    </div>
                    <div class="veiculo-acessorio-linha-acoes">${disparoHtml}${removerArmaHtml}</div>
                </div>
            `;
        }).join("");
        const instalarArmaHtml = !estado.isMestre
            ? `<button type="button" class="btn-ghost veiculo-arma-instalar-btn" data-veiculo-arma-instalar-btn>+ Instalar Arma do Inventário</button>`
            : "";

        const acessoriosHtml = `
            <div class="veiculo-acessorios-secao">
                <div class="veiculo-atributo-label">
                    <span>Acessórios</span>
                    <span class="veiculo-atributo-nivel">${slotsUsados}/${slotsTotal} slots</span>
                </div>
                ${linhasAcessoriosHtml}
                ${linhasArmasHtml}
                <div class="veiculo-acessorios-acoes">${instalarAcessorioHtml}${instalarArmaHtml}${resetarUsosHtml}</div>
            </div>
        `;

        // "Aparecer no Cenário" (Fase 6 do plano — ver
        // plano-veiculos-fase2.txt, seção "FASE 6"): toggle — se o
        // veículo já está marcado presente em algum cenário (v.cenarioId),
        // mostra "Remover do Cenário" (sempre disponível, pra poder
        // "guardar" o carro mesmo que o personagem já tenha saído
        // daquele cenário); senão só oferece "Aparecer" se o personagem
        // estiver participando de algum cenário agora
        // (cenarioAtualDoPersonagem).
        let cenarioVeiculoHtml = "";
        if (!estado.isMestre) {
            if (v.cenarioId) {
                cenarioVeiculoHtml = `<button type="button" class="btn-ghost veiculo-cenario-btn" data-veiculo-cenario-btn data-acao="remover">🎬 Remover do Cenário</button>`;
            } else if (cenarioAtualDoPersonagem()) {
                cenarioVeiculoHtml = `<button type="button" class="btn-ghost veiculo-cenario-btn" data-veiculo-cenario-btn data-acao="aparecer">🎬 Aparecer no Cenário</button>`;
            }
        }

        return `
            <div class="veiculo-card${estado.isMestre ? " editavel" : ""}" data-veiculo-id="${id}">
                <div class="veiculo-header">
                    <div>
                        <span class="veiculo-nome">${escapeHtml(v.nome || "(sem nome)")}</span>
                        <span class="veiculo-tipo">${escapeHtml(rotuloTipoVeiculo(v.tipo))}</span>
                        ${estado.isMestre ? `<span class="veiculo-tranca-estado">${v.trancado ? "🔒 Trancado" : "🔓 Destrancado"}</span>` : ""}
                    </div>
                    <div class="veiculo-manutencao">
                        <span class="veiculo-manutencao-valor">CN$ ${manutencao}</span>
                        <span class="hint-inline">manutenção ${escapeHtml(periodicidade)}${estado.isMestre ? " · clique pra editar" : ""}</span>
                    </div>
                </div>
                <div class="veiculo-atributos">${blocosHtml}</div>
                ${pvBarraHtml}
                ${deterioracaoBadgeHtml}
                ${bonusBadgeHtml}
                ${danoManualHtml}
                ${acessoriosHtml}
                ${trancaHtml}
                ${manobraHtml}
                ${cenarioVeiculoHtml}
                ${manutencaoHtml}
            </div>
        `;
    }).join("");

    if (estado.isMestre) {
        el.veiculosLista.querySelectorAll(".veiculo-card[data-veiculo-id]").forEach(card => {
            card.addEventListener("click", () => abrirModalEdicao("veiculos", card.dataset.veiculoId));
            // O campo de dano manual fica DENTRO do card (que abre o
            // modal de edição ao clicar em qualquer outro ponto) — sem
            // isso, clicar no input/select/botão do dano também abriria
            // o modal por cima.
            const blocoDano = card.querySelector("[data-veiculo-dano-manual]");
            if (blocoDano) {
                blocoDano.addEventListener("click", (e) => e.stopPropagation());
                const btnDano = blocoDano.querySelector("[data-veiculo-dano-btn]");
                if (btnDano) btnDano.addEventListener("click", () => aplicarDanoManualVeiculo(card.dataset.veiculoId, blocoDano));
            }
            // "Limpar" bônus temporário de manobra (Fase 4) — mesmo
            // motivo de stopPropagation acima.
            const btnLimparBonus = card.querySelector("[data-veiculo-bonus-limpar]");
            if (btnLimparBonus) {
                btnLimparBonus.addEventListener("click", (e) => {
                    e.stopPropagation();
                    limparBonusTemporariosVeiculo(card.dataset.veiculoId);
                });
            }
            // Seção de Acessórios (Fase 5b) — Mestre só tem o botão de
            // resetar usos "uma vez por cena"; mesmo motivo de
            // stopPropagation acima (senão qualquer clique ali dentro
            // também abriria o modal de edição por cima).
            const blocoAcessorios = card.querySelector(".veiculo-acessorios-secao");
            if (blocoAcessorios) {
                blocoAcessorios.addEventListener("click", (e) => e.stopPropagation());
                const btnResetarUsos = blocoAcessorios.querySelector("[data-veiculo-acessorio-resetar-usos]");
                if (btnResetarUsos) btnResetarUsos.addEventListener("click", () => resetarUsosAcessoriosVeiculo(card.dataset.veiculoId));
            }
        });
    } else {
        el.veiculosLista.querySelectorAll(".veiculo-card[data-veiculo-id]").forEach(card => {
            const btnManutencao = card.querySelector("[data-veiculo-manutencao-btn]");
            if (btnManutencao) btnManutencao.addEventListener("click", () => solicitarManutencaoVeiculo(card.dataset.veiculoId));
            const btnDestrancar = card.querySelector("[data-veiculo-destrancar]");
            if (btnDestrancar) btnDestrancar.addEventListener("click", () => alternarTrancaVeiculo(card.dataset.veiculoId, false));
            const btnTrancar = card.querySelector("[data-veiculo-trancar]");
            if (btnTrancar) btnTrancar.addEventListener("click", () => alternarTrancaVeiculo(card.dataset.veiculoId, true));
            // Reparo e Upgrade de atributo (Fase 3 do plano — ver
            // plano-veiculos-fase2.txt): um botão por atributo, cada um
            // abrindo o modal de confirmação (abrirModalMecanicoVeiculo).
            card.querySelectorAll("[data-veiculo-upgrade-btn]:not([disabled])").forEach(btn => {
                btn.addEventListener("click", () => abrirModalMecanicoVeiculo(card.dataset.veiculoId, btn.dataset.atributo, "upgrade"));
            });
            card.querySelectorAll("[data-veiculo-reparo-btn]:not([disabled])").forEach(btn => {
                btn.addEventListener("click", () => abrirModalMecanicoVeiculo(card.dataset.veiculoId, btn.dataset.atributo, "reparo"));
            });
            // Manobra (Fase 4 do plano).
            const btnManobra = card.querySelector("[data-veiculo-manobra-btn]");
            if (btnManobra) btnManobra.addEventListener("click", () => abrirModalManobraVeiculo(card.dataset.veiculoId));
            // "Aparecer no Cenário" (Fase 6 do plano).
            const btnCenarioVeiculo = card.querySelector("[data-veiculo-cenario-btn]");
            if (btnCenarioVeiculo) btnCenarioVeiculo.addEventListener("click", () => alternarVeiculoNoCenario(card.dataset.veiculoId, btnCenarioVeiculo.dataset.acao));
            // Acessórios instalados (Fase 5b do plano).
            const btnInstalarAcessorio = card.querySelector("[data-veiculo-acessorio-instalar-btn]");
            if (btnInstalarAcessorio) btnInstalarAcessorio.addEventListener("click", () => abrirModalInstalarAcessorioVeiculo(card.dataset.veiculoId));
            card.querySelectorAll("[data-veiculo-acessorio-remover]").forEach(btn => {
                btn.addEventListener("click", () => removerAcessorioVeiculo(card.dataset.veiculoId, btn.dataset.key));
            });
            card.querySelectorAll("[data-veiculo-acessorio-testar]").forEach(btn => {
                btn.addEventListener("click", () => testarAcessorioVeiculo(card.dataset.veiculoId, btn.dataset.key));
            });
            card.querySelectorAll("[data-veiculo-acessorio-usar]").forEach(btn => {
                btn.addEventListener("click", () => usarAcessorioVeiculo(card.dataset.veiculoId, btn.dataset.key));
            });
            // Acessórios-arma (Fase 5c do plano).
            const btnInstalarArma = card.querySelector("[data-veiculo-arma-instalar-btn]");
            if (btnInstalarArma) btnInstalarArma.addEventListener("click", () => abrirModalInstalarArmaVeiculo(card.dataset.veiculoId));
            card.querySelectorAll("[data-veiculo-arma-disparar]:not([disabled])").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const it = estado.fichaAtual.inventario && estado.fichaAtual.inventario[btn.dataset.itemId];
                    if (!it) return;
                    await iniciarUsoItem({ id: btn.dataset.itemId, ...it }, modificadoresPlanos);
                });
            });
            card.querySelectorAll("[data-veiculo-arma-remover]").forEach(btn => {
                btn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    removerArmaDoVeiculo(btn.dataset.itemId);
                });
            });
        });
    }
}

// =====================================================================
// FATOR DE PREÇO DE MATERIAIS (VEÍCULOS) — ajuste por mesa sobre o CN$
// de referência do mecânico (Fase 3: Melhorar/Reparar). Só afeta o
// texto informativo de preço — os MATERIAIS consumidos continuam sendo
// exatamente os da tabela do manual (CUSTOS_UPGRADE_VEICULO), sem
// ajuste nenhum; é só o valor em dinheiro (que o narrador decide se
// cobra à parte) que sobe/desce junto com o percentual da mesa.
// =====================================================================

export function configurarFatorPrecoMateriaisVeiculo() {
    ouvirFatorPrecoMateriaisVeiculo((fator) => {
        estado.fatorPrecoMateriaisVeiculoAtivo = fator;
        if (estado.isMestre && el.inputFatorPrecoMateriaisVeiculo && document.activeElement !== el.inputFatorPrecoMateriaisVeiculo) {
            el.inputFatorPrecoMateriaisVeiculo.value = fator;
        }
    });

    if (el.inputFatorPrecoMateriaisVeiculo) {
        // Só grava ao sair do campo (blur) ou Enter — não a cada tecla,
        // pra não gerar uma escrita no banco por dígito digitado (mesmo
        // cuidado que outros campos numéricos do sistema já têm).
        const salvar = async (e) => {
            const valor = Number(e.target.value);
            await definirFatorPrecoMateriaisVeiculo(Number.isFinite(valor) ? valor : 0);
        };
        el.inputFatorPrecoMateriaisVeiculo.addEventListener("blur", salvar);
        el.inputFatorPrecoMateriaisVeiculo.addEventListener("keydown", (e) => {
            if (e.key === "Enter") { e.preventDefault(); e.target.blur(); }
        });
    }
}
