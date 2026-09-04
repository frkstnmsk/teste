// abas/inventario.js
// ---------------------------------------------------------------------
// Aba Inventário — parte 1 (exibição: renderizarInventario, criarLiItem
// — Passo 16) + parte 2 (uso/dar item: configurarDarItem, resolverAtaque,
// salvarItemDoModal, atualizarCamposPorTag — Passo 17).
//
// Movido do ficha.js como parte do plano de modularização (ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt).
//
// Além das 4 funções listadas no plano pro Passo 17, vieram junto os
// helpers privados só usados por elas (todos exclusivos de
// resolverAtaque, nunca chamados de fora): estadoSaudeLabelAtual,
// formatarPenalidadesAtaque, formatarDetalheRolagemAtaque,
// proximoNumeroDisparo, meuStatusAgarrado/Imobilizado/Desacordado/
// DesmaioTemporizado/AlcanceLimitado, golpeBloqueadoPorAgarrar,
// alcanceDoGolpe, verificarAlcanceLimitado (+ a const
// PERICIAS_ALCANCE_CURTO_AGARRADO).
//
// Os helpers genéricos do modal de item (os `lerXDoModal`, `montarListaX`,
// `atualizarVisibilidadeX`/`atualizarCampoX`, `fecharModal`) continuam
// exportados de ficha.js em vez de virem pra cá: são a máquina do modal
// genérico (Fase 1/Passo 4 do plano, "utilitarios/modal.js", ainda não
// feito) — não pertencem só ao Inventário, então ficam onde estão até
// aquele passo acontecer, só exportados pra esta aba poder chamá-los.
// Mesma lógica pras funções de combate largamente compartilhadas
// (combateComIniciativaAtivo, despacharEfeitosQuimicos,
// modificadorDePericiaComPenalidade, checarConsumoDeAcao,
// meuParticipanteIdCombate, npcParticipanteIdCombate, pausarSync/
// retornarSync) — usadas por Perícias/Combate também, não exclusivas
// daqui.
// ---------------------------------------------------------------------

import { estado } from "../estado.js";
import {
    el, toast, escapeHtml, textoDetalhamento, abrirModalEdicao, caminhoBase,
    alternarAtivoEntidade, alternarEquipadaItem, armaUsaCarregador,
    carregarCarregador, recarregarArma, retirarCarregadorArma, carregarCamaraArma,
    iniciarUsoItem, abrirModalDarItem, cenarioAtualDoPersonagem,
    depositarDinheiroItem, consumirDroga, usarEquipamentoMedico,
    ativarPreviewFlutuanteImagem, contextoDarItem, checarConsumoDeAcao,
    meuParticipanteIdCombate, npcParticipanteIdCombate, penalidadeTestesAtual,
    combateComIniciativaAtivo, despacharEfeitosQuimicos, modificadorDePericiaComPenalidade,
    pausarSync, retornarSync, fecharModal, gerarIdLocal,
    atualizarBlocoSubtipoImplante, atualizarCampoInstalarVeiculo, atualizarCampoJaEquipar,
    atualizarCampoQualidadeMaterial, atualizarPesoTotalModal, atualizarVisibilidadeArmaFogo,
    atualizarVisibilidadeCalibre, atualizarVisibilidadeClasseProtecao, atualizarVolumeTotalProjetilModal,
    lerCompartimentosDoModal, lerConfigArmaDoModal, lerConfigImplanteDoModal, lerConfigQuimicoDoModal,
    lerEfeitosMedicosDoModal, lerModificadoresDoModal, lerPericiaUsoDoModal, lerPesoVolumeEQuantidadeDoModal,
    lerReducaoDanoDoModal, lerSaldoDoItemDoModal, montarListaCompartimentos, montarListaEfeitosMedicos,
    montarModificacoesArma, montarReducaoDanoChecklist, popularSelectSubtipoPorte,
    recalcularQuimicoAutoPreenchido, renderizarLinhasMateriaisQuimico, modificadoresAtuais
} from "../ficha.js?v=20260830-npcnivelpv";
import { ref, get, update, remove } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { db } from "../firebase-config.js";
import {
    criarAcaoPendente, abrirReacaoPendente, aplicarDano, registrarFeridasDeSangramento,
    testarSangramento, testarSangramentoProfundo
} from "../mestre.js?v=20260830-npcnivelpv";
import {
    listaCategorias, nomeCategoria, pesoTotalPorCategoria, calcularCargaAtual,
    itemPodeUsar, itemPodeEquipar, itemEhEquipavel, carregadorEstaAnexado,
    ehContainer, itensDentroDe, itemDescendeDe, listaContainersDisponiveis, itemCabeNoContainer,
    volumeTotalDentroDe, rotuloSubtipoPorte, itemPodeSerLevadoSolto,
    listaCompartimentos, maosDisponiveis, itemPodeEquiparContainer,
    subtipoPorteExclusivo, resolverEntradaLevandoConsigo
} from "../inventario.js";
import {
    ehCarregador, ehArma, ehArmaDeFogo, ehArmaOuExplosivo, ehExplosivo, ehProjetil,
    ehProdutoQuimico, ehDanoContundente, ehDanoCortante, ehDanoPerfurante, ehFacaOuAdaga,
    ehTagMultiPericia, ehTagQuePodeSerSaldo, periciaUsoComoArray, periciasVinculaveisPorTag,
    ehFerramentaCriacaoGeral, rotuloTag, rotuloClasseProtecao, rotuloCalibre, rotuloLocalProtecao,
    arredondarMoeda, TIPOS_DANO, itemOcupaMao, slotsTomada, calibreSugereDilacera,
    alvoTemArteMarcialTreinada, baseDificuldadeAtaque, bloqueioContraForcaBruta, bonusCQC1x1,
    bonusCQCFacaAdaga, bonusDanoFracaoLocalMira, buscarPericiaPorNome, cobraKaiCriticoAutomatico,
    difModLocalMira, ignorarArmaduraForcaBruta, localMiraPorKey, MANOBRAS_COMBATE, modificadorRecuo,
    penalidadeEsquivarContraForcaBruta, qualidadesDoMaterial, sortearLocalDetalhado,
    tagExigeCapacidadeCarregador, tagExigeClasseProtecao, tagExigeLocalProtegido, tagExigePericiaUso,
    tagExigeQuantidadeProjetil, tagPermiteLimiteRolagemPorNivel, tagPodeReduzirDano, tagTemNivel,
    tagTemPericiaUso, tagTemQuantidadeGeral, tagUsaCalibreEspecifico,
    EXPLOSIVOS_PADRAO, MODULOS_DETONACAO, MATERIAIS_CRIACAO, SUBTIPOS_IMPLANTE,
    ESCALAS_ARMA, PERICIAS_ARMA_BRANCA, PERICIAS_FERRAMENTA_CRIACAO,
} from "../dados-manual.js";
import {
    modificadoresQueAfetam, tomadaSlotsOcupados, chipEstaAtivo, atributoDefesaPorPericia,
    calcularDanoDesarmado, calcularDanoTotalArma, calcularDerivados, calcularDificuldadeArmaFogo,
    calcularDificuldadeDefesaJogador, chanceFeridaPorDano, coletarModificadores,
    deveTestarSangramentoProfundo, golpeDilacera, somaModificadoresPara, rolarD20,
    DIFICULDADE_BASE_DESMAIO, dificuldadeDesmaio
} from "../regras.js";
import { normalizarFicha } from "../normalizacao.js?v=20260822-fixhistorico";
import { registrarRolagem } from "../calendario.js";
import { caminhoMesa } from "../mesa.js";
import { criarFerida } from "../saude.js";
import { calcularSecundariosNpc } from "../npc-detalhado.js";
import { salvarItemNoBanco } from "../itens-globais.js";

// ---------------------------------------------------------------------
export function renderizarInventario(modificadoresPlanos) {
    const carga = calcularCargaAtual(estado.fichaAtual, modificadoresPlanos);
    const pct = Math.round(carga.percentual);
    let avisoPenalidade = "";
    if (carga.penalidadeVelocidade < 0) {
        avisoPenalidade = ` · penalidade de velocidade: ${carga.penalidadeVelocidade}`;
    }
    const detalheBonus = carga.bonusExtra ? ` (base ${carga.limiteBase.toFixed(1)} + ${carga.bonusExtra >= 0 ? "+" : ""}${carga.bonusExtra} de modificadores)` : "";
    el.resumoCarga.innerText = `${carga.pesoTotal.toFixed(1)} kg / ${carga.limite.toFixed(1)} kg carregados (${pct}%)${detalheBonus}${avisoPenalidade}`;
    const ajustesCarga = modificadoresQueAfetam("carga_extra", modificadoresPlanos);
    el.resumoCarga.title = textoDetalhamento("Limite de carga", carga.limiteBase, "Base (Constituição)", ajustesCarga, carga.limite);

    // Indicador fixo de mãos livres (passo 16, seção 5.3 do
    // projeto-slots-porte.txt) — sempre visível no topo da aba de
    // inventário, recalculado a cada render (ver maosDisponiveis em
    // inventario.js: base 2, menos o que estiver "levando consigo",
    // equipado, fora de qualquer recipiente e que ocupe mão).
    const maosBase = 2;
    const maosLivres = maosDisponiveis(estado.fichaAtual);
    const itensOcupandoMao = Object.entries(estado.fichaAtual.inventario || {}).filter(([id2, it2]) => {
        if (it2.categoria !== "levando" || !it2.equipada || it2.dentroDe) return false;
        if (ehCarregador(it2.tag) && carregadorEstaAnexado(estado.fichaAtual, id2)) return false;
        return itemOcupaMao(it2.tag, it2.subtipoPorte);
    }).map(([, it2]) => it2);
    el.resumoMaos.innerText = `🖐️ Mãos livres: ${maosLivres}/${maosBase}`;
    el.resumoMaos.title = itensOcupandoMao.length
        ? `Ocupando mão:\n${itensOcupandoMao.map(it2 => `${it2.nome} (${Number(it2.maosNecessarias) || 1})`).join("\n")}`
        : "Nenhum item ocupando as mãos agora.";

    const categorias = listaCategorias(estado.fichaAtual);
    el.inventarioCategoriasNav.innerHTML = "";
    categorias.forEach(cat => {
        const chip = document.createElement("span");
        chip.className = "inventario-categoria-chip";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "inventario-categoria-btn" + (cat.id === estado.categoriaInventarioAtiva ? " active" : "");
        btn.innerText = cat.nome;
        btn.addEventListener("click", () => { estado.categoriaInventarioAtiva = cat.id; renderizarInventario(modificadoresPlanos); });
        chip.appendChild(btn);
        // Categorias fixas ("Levando consigo", "Em casa") não podem ser
        // excluídas — só as customizadas (criadas pelo "+ Nova categoria").
        if (!cat.fixa) {
            const btnExcluir = document.createElement("button");
            btnExcluir.type = "button";
            btnExcluir.className = "inventario-categoria-excluir";
            btnExcluir.title = `Excluir categoria "${cat.nome}"`;
            btnExcluir.innerText = "×";
            btnExcluir.addEventListener("click", (e) => {
                e.stopPropagation();
                excluirCategoriaInventario(cat.id, cat.nome);
            });
            chip.appendChild(btnExcluir);
        }
        el.inventarioCategoriasNav.appendChild(chip);
    });

    const itens = Object.entries(estado.fichaAtual.inventario || {});
    // Item que está guardado dentro de um recipiente (dentroDe aponta pra
    // um item que ainda existe) não aparece solto na lista principal —
    // ele é renderizado aninhado, abaixo do recipiente (ver
    // renderizarFilhosContainer). Se o recipiente-pai não existe mais
    // (dado órfão), o item volta a aparecer solto normalmente, como
    // rede de segurança. Carregador anexado a uma arma some da lista
    // pela mesma lógica de sempre (virou parte da arma).
    const estaDentroDeAlgo = (it) => !!(it.dentroDe && estado.fichaAtual.inventario && estado.fichaAtual.inventario[it.dentroDe]);
    const itensCategoria = itens.filter(([id, it]) =>
        it.categoria === estado.categoriaInventarioAtiva &&
        !(ehCarregador(it.tag) && carregadorEstaAnexado(estado.fichaAtual, id)) &&
        !estaDentroDeAlgo(it)
    );
    const pesoCategoria = pesoTotalPorCategoria(estado.fichaAtual, estado.categoriaInventarioAtiva);

    el.inventarioListas.innerHTML = "";
    const bloco = document.createElement("div");
    bloco.className = "categoria-bloco";
    const titulo = document.createElement("div");
    titulo.className = "categoria-bloco-titulo";
    titulo.innerHTML = `${nomeCategoria(estado.fichaAtual, estado.categoriaInventarioAtiva)} <span class="peso-total">${pesoCategoria.toFixed(1)} kg</span>`;
    bloco.appendChild(titulo);

    const lista = document.createElement("ul");
    lista.className = "entity-list";

    if (!itensCategoria.length) {
        lista.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nenhum item aqui ainda.</li>`;
    } else {
        itensCategoria.forEach(([id, it]) => {
            lista.appendChild(criarLiItem(id, it, { categorias, modificadoresPlanos, nivel: 0 }));
        });
    }
    bloco.appendChild(lista);
    el.inventarioListas.appendChild(bloco);
}

// Exclui uma categoria customizada de inventário (as fixas "Levando
// consigo"/"Em casa" nunca chegam aqui — filtradas em renderizarInventario
// pelo cat.fixa). Trava a exclusão se ainda houver item guardado nela,
// pra não fazer item nenhum sumir/ficar órfão sem categoria — pede pra
// mover ou remover os itens primeiro. Disponível pro jogador e pro
// Mestre, mesma permissão de quem pode criar categoria ("+ Nova
// categoria", configurarBotoesAdicionar).
async function excluirCategoriaInventario(categoriaId, categoriaNome) {
    if (!estado.fichaAtual || !estado.fichaAtualId) return;
    const temItens = Object.values(estado.fichaAtual.inventario || {}).some(it => it.categoria === categoriaId);
    if (temItens) {
        toast(`Mova ou remova os itens de "${categoriaNome}" antes de excluir essa categoria.`, "erro");
        return;
    }
    if (!confirm(`Excluir a categoria "${categoriaNome}"? Essa ação não pode ser desfeita.`)) return;
    if (!estado.fichaAtual.categoriasInventario || !estado.fichaAtual.categoriasInventario[categoriaId]) return;
    delete estado.fichaAtual.categoriasInventario[categoriaId];
    await remove(ref(db, `${caminhoBase()}/categoriasInventario/${categoriaId}`));
    if (estado.categoriaInventarioAtiva === categoriaId) estado.categoriaInventarioAtiva = "levando";
    toast(`Categoria "${categoriaNome}" excluída.`);
    renderizarInventario(modificadoresAtuais());
}

// Monta o <li> de um item do inventário (usado tanto pros itens de topo
// quanto, recursivamente, pros itens guardados dentro de um recipiente —
// ver criarUlFilhosContainer abaixo). `nivel` é só a profundidade de
// aninhamento (0 = solto na categoria), usada pra indentar visualmente.
// Qual item de dinheiro físico está com a caixinha de "quanto
// depositar" aberta no inventário (só 1 por vez) — mesmo padrão de
// dinheiroCenarioAbertoId, ver renderizarCenarios.
let itemDinheiroCaixaAbertaId = null;

// Fecha a caixinha de "quanto depositar" de dinheiro físico (se estiver
// aberta) — chamada de ficha.js/depositarDinheiroItem depois que o
// pedido é enviado ao Mestre, já que essa variável de controle agora
// mora só aqui.
export function fecharCaixaDepositarDinheiroItem() {
    itemDinheiroCaixaAbertaId = null;
}

export function criarLiItem(id, it, { categorias, modificadoresPlanos, nivel }) {
    const li = document.createElement("li");
    // Item com modificadores estruturados (ex: colete que dá +Defesa)
    // ganha o mesmo botão de ativo/desativado das vantagens/etc —
    // pra "vestir/tirar" o efeito sem removê-lo do inventário. Droga é
    // exceção: seu campo `modificadores` descreve o efeito de QUANDO
    // CONSUMIDA (botão "Consumir", ver consumirDroga) — não um efeito
    // passivo pra ligar/desligar, então não ganha esse botão.
    const temEfeitoItem = !!(it.modificadores && it.modificadores.length) && it.tag !== "droga";
    const ativoItem = it.ativo !== false;
    if (temEfeitoItem && !ativoItem) li.classList.add("entidade-desativada");
    const kitGeral = ehFerramentaCriacaoGeral(it.tag);
    const periciasUsoItem = periciaUsoComoArray(it.periciaUso);
    const podeUsar = itemPodeUsar(it) && (!!periciasUsoItem.length || kitGeral);
    const ehFogo = ehArma(it.tag) && ehArmaDeFogo(it.periciaUso);
    const semCarregador = ehFogo && !armaUsaCarregador(it);
    const temCamaraExtraItem = ehFogo && !!(it.arma && it.arma.temCamaraExtra);
    const camaraCarregadaItem = temCamaraExtraItem && !!(it.arma && it.arma.camaraCarregada);
    const ehArmaItem = ehArma(it.tag);
    const ehExplosivoItem = ehExplosivo(it.tag);
    const ehEquipavelItem = itemEhEquipavel(it);
    const equipadaItem = !!it.equipada;
    const podeEquipar = itemPodeEquipar(it);
    const tagLabel = rotuloTag(it.tag) + (it.nivelTag ? ` nível ${it.nivelTag}` : "");
    const periciaLabel = periciasUsoItem.length
        ? ` · Usa: ${escapeHtml(periciasUsoItem.join(", "))}`
        : (kitGeral ? ` · Usa: ${PERICIAS_FERRAMENTA_CRIACAO.join(", ")} (escolhe ao usar)` : "");
    const classeLabel = it.classeProtecao ? ` · Classe de Proteção ${escapeHtml(rotuloClasseProtecao(it.classeProtecao))}` : "";
    const saldoLabel = it.ehSaldo
        ? (it.tag === "eletronico"
            ? ` · Saldo: CN$ ${arredondarMoeda(it.saldoNotas)} em notas + CN$ ${arredondarMoeda(it.saldoMoedas)} em moedas`
            : ` · Saldo: CN$ ${arredondarMoeda(it.saldoValor)}`)
        : "";
    const quantidadeLabel = (it.quantidade && it.quantidade > 1) ? ` (x${it.quantidade})` : "";
    const calibreLabel = it.calibre ? ` · Calibre ${escapeHtml(rotuloCalibre(it.calibre))}` : "";
    const reducaoLabel = (it.reducoesDano && it.reducoesDano.length)
        ? ` · Reduz: ${it.reducoesDano.map(r => `${TIPOS_DANO.find(t => t.key === r.tipo)?.label || r.tipo} -${r.valor}`).join(", ")}`
        : "";
    const localProtegidoLabel = it.localProtegido ? ` · Protege: ${escapeHtml(rotuloLocalProtecao(it.localProtegido))}` : "";
    const carregadorLabel = it.carregador
        ? ` · Munição: ${it.carregador.municaoAtual || 0}/${it.carregador.capacidadeMax || 0}`
        : "";
    const projetilLabel = it.projetil ? ` · Quantidade: ${it.projetil.quantidade || 0}` : "";
    const carregadorAnexadoIdItem = (it.arma && it.arma.carregadorId) || null;
    const carregadorAnexadoObjItem = carregadorAnexadoIdItem ? estado.fichaAtual.inventario?.[carregadorAnexadoIdItem] : null;
    const carregadorInternoItem = (it.arma && it.arma.carregadorInterno) || null;
    const armaEstaCarregadaItem = ehFogo && (semCarregador
        ? (Number(carregadorInternoItem?.municaoAtual) || 0) > 0
        : !!carregadorAnexadoObjItem);
    const carregadorAnexadoLabel = (ehFogo && it.arma)
        ? (semCarregador
            ? ` · Munição: ${carregadorInternoItem?.municaoAtual || 0}/${carregadorInternoItem?.capacidadeMax || 0}`
            : (carregadorAnexadoObjItem
                ? ` · Carregador: ${escapeHtml(carregadorAnexadoObjItem.nome)} (${carregadorAnexadoObjItem.carregador?.municaoAtual || 0}/${carregadorAnexadoObjItem.carregador?.capacidadeMax || 0})`
                : " · Sem carregador anexado"))
        : "";
    const camaraLabel = temCamaraExtraItem ? ` · Câmara: ${camaraCarregadaItem ? "carregada (+1)" : "vazia"}` : "";
    // Tooltip do carregador: só aparece ao passar o mouse por cima,
    // listando os projéteis carregados dentro dele.
    const tooltipCarregador = it.carregador
        ? (it.carregador.projeteisCarregados && it.carregador.projeteisCarregados.length
            ? it.carregador.projeteisCarregados.map(p => `${p.nome} x${p.quantidade}`).join("\n")
            : "Carregador vazio.")
        : "";

    // Recipiente (mochila etc.): mostra quantos itens tem guardado
    // dentro e um botão de expandir/recolher — a lista de filhos (se
    // aberto) é montada à parte, em criarUlFilhosContainer, e anexada
    // logo depois deste <li> na lista principal.
    const ehContainerItem = ehContainer(it.tag);
    const filhosContainer = ehContainerItem ? itensDentroDe(estado.fichaAtual, id) : [];
    const containerAberto = estado.containersInventarioAbertos.has(id);
    const containerLabel = ehContainerItem
        ? ` · ${filhosContainer.length ? `${filhosContainer.length} item(ns) guardado(s)` : "Vazio"}`
        : "";
    // Botão "equipada" do container (passo 14, seção 5.2 do
    // projeto-slots-porte.txt): reaproveita o mesmo campo `equipada` das
    // armas/itens comuns, mas com rótulo de AÇÃO específico por
    // subtipoPorte em vez do genérico "Equipado/Desequipado" — reflete
    // melhor o que "vestir uma calça" ou "carregar uma mochila" significa
    // na hora de decidir. Container só pode ser (des)equipado estando em
    // "levando consigo" (mesma regra de itemPodeEquipar pra itens comuns).
    const podeEquiparContainerItem = ehContainerItem && it.categoria === "levando";
    const ROTULOS_BOTAO_EQUIPAR_CONTAINER = {
        roupa: { ligar: "👕 Vestir", desligar: "👕 Tirar", tituloLigar: "Vestir esta peça de roupa", tituloDesligar: "Vestindo agora — clique pra tirar" },
        cinto: { ligar: "👖 Vestir", desligar: "👖 Tirar", tituloLigar: "Vestir este cinto", tituloDesligar: "Vestindo agora — clique pra tirar" },
        mochila: { ligar: "🎒 Carregar nas costas", desligar: "🎒 Tirar", tituloLigar: "Carregar esta mochila nas costas", tituloDesligar: "Carregando nas costas agora — clique pra tirar" },
        bolsa_mao: { ligar: "✋ Segurar", desligar: "✋ Largar", tituloLigar: "Segurar esta bolsa/maleta (ocupa 1 mão)", tituloDesligar: "Segurando agora — clique pra largar" }
    };
    const rotuloContainerAtual = ehContainerItem ? (ROTULOS_BOTAO_EQUIPAR_CONTAINER[it.subtipoPorte] || ROTULOS_BOTAO_EQUIPAR_CONTAINER.mochila) : null;

    // Passo 15 (seção 5.2 do projeto-slots-porte.txt) — duas travas extras
    // que só importam na hora de LIGAR (equipar); desequipar sempre libera
    // recurso, então nunca é bloqueado por elas:
    //   a) Mão livre: item comum equipável (arma etc.) sempre ocupa mão;
    //      container só ocupa se subtipoPorteOcupaMao(subtipoPorte) — hoje
    //      só bolsa_mao. Ver maosDisponiveis em inventario.js (base 2).
    //   b) Exclusividade: subtipos com exclusivo=true (nenhum, por
    //      enquanto — ver SUBTIPOS_PORTE em dados-manual.js) não deixam
    //      equipar um segundo enquanto já existe outro do mesmo subtipo
    //      equipado — ver itemPodeEquiparContainer. Hoje dá pra vestir
    //      cinto + jaqueta + mochila + colete etc. tudo junto sem trava,
    //      já que a mesa é monitorada pelo Mestre item a item.
    // podeEquipar (inventario.js) já cobre QUALQUER item comum
    // (não-container) — arma, item marcado equipável, ou item comum
    // qualquer — pra poder ir pra mão; container segue seu próprio
    // fluxo de vestir/carregar (podeEquiparContainerItem).
    const podeEquiparCategoria = ehContainerItem ? podeEquiparContainerItem : podeEquipar;
    const ocupaMaoEsteItem = (ehCarregador(it.tag) && carregadorEstaAnexado(estado.fichaAtual, id)) ? false : itemOcupaMao(it.tag, it.subtipoPorte);
    const maosNecessariasItem = Number(it.maosNecessarias) || 1;
    const maosLivresAtuais = maosDisponiveis(estado.fichaAtual);
    const semMaosLivres = !equipadaItem && ocupaMaoEsteItem && maosLivresAtuais < maosNecessariasItem;
    const conflitoExclusividade = ehContainerItem && !equipadaItem && subtipoPorteExclusivo(it.subtipoPorte) && !itemPodeEquiparContainer(estado.fichaAtual, it, id);
    // Variáveis finais consumidas no template abaixo: container usa seu
    // próprio texto/título por subtipoPorte; item comum/arma mantém o
    // rótulo genérico de sempre (✅ Equipado / ○ Desequipado / 🗡️ Equipada).
    // Todo item "levando" precisa de um lugar físico válido (mão ou
    // vestido/carregado) — então o botão sempre aparece pra qualquer
    // item que não esteja guardado dentro de outra coisa: equipável
    // (arma/marcado), container (vestir/carregar), ou item comum
    // qualquer (segurar/largar da mão — ver itemPodeSerLevadoSolto em
    // inventario.js).
    const mostrarBtnEquipar = true;
    const podeEquiparBtn = podeEquiparCategoria && !semMaosLivres && !conflitoExclusividade;
    const textoBtnEquipar = ehEquipavelItem
        ? (equipadaItem ? (ehArmaItem ? "🗡️ Equipada" : (ehExplosivoItem ? "💣 Equipada" : "✅ Equipado")) : "○ Desequipado")
        : (ehContainerItem
            ? (rotuloContainerAtual ? (equipadaItem ? rotuloContainerAtual.desligar : rotuloContainerAtual.ligar) : "")
            : (equipadaItem ? "🤚 Na mão" : "○ Solto"));
    const tituloBtnEquipar = !podeEquiparCategoria
        ? "Precisa estar em 'Levando consigo' pra equipar"
        : conflitoExclusividade
            ? `Já tem outra peça de "${rotuloSubtipoPorte(it.subtipoPorte)}" equipada — desequipe-a primeiro.`
            : semMaosLivres
                ? `Sem mãos livres (${maosLivresAtuais}/2)`
                : (ehEquipavelItem
                    ? (equipadaItem ? "Equipado agora — clique pra desequipar" : "Desequipado — clique pra equipar e poder usar")
                    : (ehContainerItem
                        ? (rotuloContainerAtual ? (equipadaItem ? rotuloContainerAtual.tituloDesligar : rotuloContainerAtual.tituloLigar) : "")
                        : (equipadaItem ? "Na mão agora — clique pra largar" : "Solto — clique pra segurar na mão")));

    // Chave de veículo (ver plano-veiculos.txt, adendo "chave"): mostra
    // qual carro ela destranca, pra não virar uma "Chave" solta sem
    // contexto na lista de inventário. Veículo pode ter sido excluído
    // depois — nesse caso não mostra nada em vez de quebrar o texto.
    const veiculoDaChave = it.tag === "chave" && it.veiculoId ? estado.fichaAtual.veiculos?.[it.veiculoId] : null;
    const chaveLabel = veiculoDaChave ? ` · Destranca: ${escapeHtml(veiculoDaChave.nome || "(sem nome)")}` : "";

    // Tomada/Chip (manual pg. 84 — ver slotsTomada/efeitoChip em
    // dados-manual.js e chipEstaAtivo/tomadaSlotsOcupados em regras.js):
    // mostra a informação mecânica que só esses dois subtipos de
    // implante têm (slots ocupados da Tomada / status de encaixe do
    // Chip), direto na lista do inventário, sem precisar abrir o item.
    let implanteInfoLabel = "";
    if (it.tag === "biomecanica" && it.implante?.subtipo === "tomada") {
        const ocupados = tomadaSlotsOcupados(estado.fichaAtual.inventario, id);
        const slots = slotsTomada(it.nivelTag);
        implanteInfoLabel = ` · Slots de chip: ${ocupados}/${slots}`;
    } else if (it.tag === "biomecanica" && it.implante?.subtipo === "chip") {
        const tomadaVinculada = it.implante.tomadaId ? estado.fichaAtual.inventario?.[it.implante.tomadaId] : null;
        if (!it.implante.tomadaId) {
            implanteInfoLabel = " · Sem Tomada vinculada";
        } else if (!tomadaVinculada) {
            implanteInfoLabel = " · Tomada vinculada não existe mais";
        } else {
            const ativo = chipEstaAtivo(estado.fichaAtual.inventario, id);
            implanteInfoLabel = ` · Tomada: ${escapeHtml(tomadaVinculada.nome || "(sem nome)")} — ${ativo ? "efeito ativo" : "sem vaga/inativo"}`;
        }
    }

    // Explosivo fora de qualquer cenário ativo (ver
    // plano-explosivos-cenario.txt, Fase 5.2 — nice-to-have): avisa aqui
    // ANTES de clicar "Armar" e esbarrar no toast de bloqueio
    // (abrirModalArmarExplosivo). Vale tanto pro jogador quanto pro
    // Mestre atuando como NPC — o bloqueio em si não distingue os dois.
    const avisoArmarSemCenarioLabel = (ehExplosivoItem && !cenarioAtualDoPersonagem())
        ? ` · ⚠ precisa estar num cenário pra armar`
        : "";

    // Efeitos médicos de "uso direto" (Fase 6 do plano de efeitos de
    // equipamentos médicos): item elegível pro botão "Usar (efeito
    // médico)" quando tag "equipamento_medico" e tiver pelo menos um
    // efeito dos 4 tipos que se aplicam clicando direto no card, sem
    // precisar estar tratando uma ferida específica (restaura_pv /
    // estabiliza_condicao_critica / efeito_temporario_ignora_penalidade_
    // saude / efeito_temporario_modificador — ver usarEquipamentoMedico).
    const temEfeitoMedicoDiretoItem = it.tag === "equipamento_medico" && Array.isArray(it.efeitosMedicos)
        && it.efeitosMedicos.some(ef => ef && ["restaura_pv", "estabiliza_condicao_critica", "efeito_temporario_ignora_penalidade_saude", "efeito_temporario_modificador"].includes(ef.tipo));

    if (nivel > 0) li.classList.add("entity-item-aninhado");

    li.innerHTML = `
        ${it.imagem ? `<img class="entity-thumb" src="${escapeHtml(it.imagem)}" alt="">` : ""}
        <div class="entity-main" ${tooltipCarregador ? `title="${escapeHtml(tooltipCarregador)}"` : ""}>
            <span class="entity-nome">${ehContainerItem ? `<button type="button" class="btn-toggle-container" title="${containerAberto ? "Recolher" : "Expandir e ver o que tem guardado dentro"}">${containerAberto ? "▾" : "▸"}</button> 🎒 ` : ""}${escapeHtml(it.nome)}</span>
            <span class="entity-sub">${tagLabel} · ${it.peso || 0} kg · Volume: ${it.volume || 0}${quantidadeLabel}${periciaLabel}${saldoLabel}${classeLabel}${calibreLabel}${localProtegidoLabel}${reducaoLabel}${carregadorLabel}${projetilLabel}${carregadorAnexadoLabel}${camaraLabel}${containerLabel}${chaveLabel}${implanteInfoLabel}${avisoArmarSemCenarioLabel}</span>
        </div>
        <div class="entity-badges">
            ${armaEstaCarregadaItem ? `<span class="mod-pill positivo" title="${semCarregador ? "Tem munição carregada no tambor/câmara" : "Tem um carregador anexado"}">🔵 Carregada</span>` : ""}
            ${camaraCarregadaItem ? `<span class="mod-pill positivo" title="Tem 1 bala na agulha, além do carregador">🔵 +1 na agulha</span>` : ""}
            ${temEfeitoItem ? `<button type="button" class="btn-toggle-ativo ${ativoItem ? "ligado" : "desligado"}" title="${ativoItem ? "Efeito ativo agora — clique pra desativar" : "Efeito desativado agora — clique pra ativar"}">${ativoItem ? "● Ativo" : "○ Inativo"}</button>` : ""}
            ${mostrarBtnEquipar ? `<button type="button" class="btn-toggle-equipada ${equipadaItem ? "ligado" : "desligado"}" ${podeEquiparBtn ? "" : "disabled"} title="${tituloBtnEquipar}">${textoBtnEquipar}</button>` : ""}
            <button type="button" class="btn-usar-item btn-blue" ${podeUsar ? "" : "disabled"} title="${podeUsar ? (kitGeral ? "Escolher qual perícia rolar (Explosivos, Mecânica Automotiva, Armeiro, Ofícios Utilitários ou Eletrônica)" : (periciasUsoItem.length > 1 ? `Escolher qual perícia rolar (${periciasUsoItem.join(", ")})` : `Rolar d20 + ${periciasUsoItem[0]}`)) : (ehEquipavelItem && !equipadaItem ? "Equipe o item pra poder usá-lo" : "Sem perícia vinculada")}">Usar</button>
            ${it.tag === "droga" ? `<button type="button" class="btn-consumir-droga btn-lime" title="Consome 1 unidade: aplica o efeito (modificadores do item) pelo tempo em horas escrito na descrição (ex: 'por 4h') — sem isso, dura até o fim do dia em jogo — e zera a abstinência do vício correspondente, se houver">Consumir</button>` : ""}
            ${temEfeitoMedicoDiretoItem ? `<button type="button" class="btn-usar-equipamento-medico btn-lime" title="Usa o item: aplica os efeitos cadastrados (restaura PV, estabiliza coma/desmaio, ignora penalidade de saúde por um tempo, ou modificador temporário) e desconta 1 uso, se tiver número limitado">Usar (efeito médico)</button>` : ""}
            ${ehFogo ? `<button type="button" class="btn-recarregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="${semCarregador ? "Encher o tambor/câmara com munição solta compatível do inventário" : "Trocar o carregador anexado por um com mais munição"}">Recarregar</button>` : ""}
            ${(ehFogo && !semCarregador) ? `<button type="button" class="btn-retirar-carregador-item btn-ghost" ${(itemPodeUsar(it) && armaEstaCarregadaItem) ? "" : "disabled"} title="Retirar o carregador anexado e devolvê-lo ao inventário">Retirar carregador</button>` : ""}
            ${(ehFogo && temCamaraExtraItem) ? `<button type="button" class="btn-carregar-camara-item btn-ghost" ${(itemPodeUsar(it) && !camaraCarregadaItem) ? "" : "disabled"} title="Carregar 1 projétil direto na câmara, do estoque em 'Levando consigo'">Bala na agulha</button>` : ""}
            ${ehCarregador(it.tag) ? `<button type="button" class="btn-carregar-item btn-blue" ${itemPodeUsar(it) ? "" : "disabled"} title="Carregar projéteis do mesmo calibre que estiverem no inventário">Carregar</button>` : ""}
            ${(!estado.isMestre && it.categoria === "levando") ? `<button type="button" class="btn-dar-item btn-ghost">Dar item</button>` : ""}
            ${(!estado.isMestre && it.tag === "dinheiro" && it.categoria === "levando") ? `<button type="button" class="btn-adicionar-saldo-item btn-lime">Adicionar ao saldo</button>` : ""}
            <select class="select-guardar-dentro"></select>
            <select class="select-transferir"></select>
        </div>
        ${(!estado.isMestre && it.tag === "dinheiro" && itemDinheiroCaixaAbertaId === id) ? `
        <div class="item-dinheiro-caixa" style="display:flex; gap:6px; margin-top:6px; padding:0 10px 8px;">
            <input type="number" class="input-item-depositar-valor" min="1" max="${Number(it.saldoValor) || 0}" step="1" placeholder="Quanto depositar? (máx. ${Number(it.saldoValor) || 0})" style="flex:1;">
            <button type="button" class="btn-lime btn-item-confirmar-depositar">Confirmar</button>
            <button type="button" class="btn-ghost btn-item-cancelar-depositar">Cancelar</button>
        </div>` : ""}
    `;
    if (temEfeitoItem) {
        li.querySelector(".btn-toggle-ativo").addEventListener("click", (e) => {
            e.stopPropagation();
            alternarAtivoEntidade("inventario", id, !ativoItem);
        });
    }
    const btnConsumirDroga = li.querySelector(".btn-consumir-droga");
    if (btnConsumirDroga) {
        btnConsumirDroga.addEventListener("click", (e) => {
            e.stopPropagation();
            consumirDroga(id);
        });
    }
    const btnUsarEquipamentoMedico = li.querySelector(".btn-usar-equipamento-medico");
    if (btnUsarEquipamentoMedico) {
        btnUsarEquipamentoMedico.addEventListener("click", (e) => {
            e.stopPropagation();
            usarEquipamentoMedico(id);
        });
    }
    const btnToggleEquipada = li.querySelector(".btn-toggle-equipada");
    if (btnToggleEquipada) {
        btnToggleEquipada.addEventListener("click", (e) => {
            e.stopPropagation();
            const querEquipar = !equipadaItem;
            if (querEquipar) {
                if (!podeEquiparBtn) return;
            } else {
                // Passo 17 (seção 3 do projeto-slots-porte.txt) — tirar
                // (desequipar) um item que está solto em "levando consigo"
                // (sem dentroDe) só é permitido se ele continuar válido
                // depois: mesma trava central do modal (itemPodeSerLevadoSolto,
                // passo 12), aplicada aqui pro botão rápido da lista também,
                // pra não deixar o botão "Tirar/Largar" criar um item sem
                // lugar físico nenhum (nem mão, nem vestido, nem guardado).
                // Cobre tanto container (roupa/cinto/mochila/bolsa_mao)
                // quanto arma/item equipável comum, com a mesma regra.
                // Itens guardados DENTRO do recipiente (dentroDe apontando
                // pra ele) não são afetados — continuam guardados normalmente
                // (ver itensDentroDe/itemPodeSerLevadoSolto, que só olha o
                // próprio item, não filhos) e simplesmente deixam de contar
                // como "levando consigo ativo" enquanto a peça-mãe não
                // estiver equipada nem em "levando".
                if (!itemPodeSerLevadoSolto(estado.fichaAtual, { ...it, equipada: false })) {
                    toast(`Pra tirar "${it.nome}" primeiro guarde-o dentro de outro recipiente ou mova-o pra outra categoria — solto em "Levando consigo" ele precisa continuar numa mão (ou equipado/vestido).`, "erro");
                    return;
                }
            }
            alternarEquipadaItem(id, querEquipar, it.nome);
        });
    }

    const btnToggleContainer = li.querySelector(".btn-toggle-container");
    if (btnToggleContainer) {
        btnToggleContainer.addEventListener("click", (e) => {
            e.stopPropagation();
            if (containerAberto) estado.containersInventarioAbertos.delete(id);
            else estado.containersInventarioAbertos.add(id);
            renderizarInventario(modificadoresPlanos);
        });
    }

    // "Guardar dentro de" — mover o item pra dentro de um COMPARTIMENTO
    // específico de um recipiente (ou soltá-lo, se já estiver guardado).
    // Lista achatada por compartimento (ver listaContainersDisponiveis,
    // seção 5.1 do projeto-slots-porte.txt) — o value do <option> carrega
    // "containerId::compartimentoId". Guardar move o item junto pra
    // categoria do recipiente automaticamente (ver salvarItemDoModal).
    const selectGuardarDentro = li.querySelector(".select-guardar-dentro");
    const compartimentosDisponiveis = listaContainersDisponiveis(estado.fichaAtual, id);
    if (compartimentosDisponiveis.length || it.dentroDe) {
        const optForaPlaceholder = document.createElement("option");
        optForaPlaceholder.value = "__guardar__";
        optForaPlaceholder.innerText = "Guardar dentro de...";
        optForaPlaceholder.disabled = true;
        selectGuardarDentro.appendChild(optForaPlaceholder);
        if (it.dentroDe) {
            const optFora = document.createElement("option");
            optFora.value = "";
            optFora.innerText = "↩ Tirar do recipiente";
            selectGuardarDentro.appendChild(optFora);
        }
        compartimentosDisponiveis.forEach(comp => {
            const containerItem = estado.fichaAtual.inventario[comp.containerId];
            const opt = document.createElement("option");
            opt.value = `${comp.containerId}::${comp.compartimentoId}`;
            opt.innerText = `🎒 ${comp.containerNome} → ${comp.compartimentoNome} (${nomeCategoria(estado.fichaAtual, containerItem?.categoria)})`;
            selectGuardarDentro.appendChild(opt);
        });
        selectGuardarDentro.value = "__guardar__";
    } else {
        selectGuardarDentro.style.display = "none";
    }
    selectGuardarDentro.addEventListener("click", (e) => e.stopPropagation());
    selectGuardarDentro.addEventListener("change", async (e) => {
        e.stopPropagation();
        const valorEscolhido = e.target.value;
        if (valorEscolhido === "__guardar__") return;
        const [novoContainerId, novoCompartimentoId] = valorEscolhido ? valorEscolhido.split("::") : [null, null];
        const containerNovo = novoContainerId ? estado.fichaAtual.inventario[novoContainerId] : null;
        const nomeContainerNovo = containerNovo?.nome || "";
        const compartimentoNovo = (containerNovo?.compartimentos || []).find(c => c.id === novoCompartimentoId);
        const nomeCompartimentoNovo = compartimentoNovo?.nome || "";
        const categoriaNova = containerNovo?.categoria || it.categoria;
        // "Cabe ou não cabe" (Fase 5) — mesma trava do modal, só que no
        // fluxo rápido do dropdown. Só se aplica ao GUARDAR (tirar do
        // recipiente, novoContainerId vazio, nunca é barrado por isso).
        // Vale tanto pro Mestre (aplicaria direto) quanto pro jogador
        // (nem chega a virar pedido pendente se já não couber).
        if (novoContainerId) {
            const resultado = itemCabeNoContainer(estado.fichaAtual, novoContainerId, novoCompartimentoId, it.volume, it.tamanho, id);
            if (!resultado.cabe) {
                const msg = resultado.motivo === "tamanho"
                    ? `"${nomeContainerNovo}" não aceita item desse tamanho.`
                    : resultado.motivo === "compartimento_invalido"
                        ? `Esse compartimento não existe mais em "${nomeContainerNovo}".`
                        : `"${nomeContainerNovo}" não tem espaço sobrando (capacidade de volume estourada).`;
                toast(msg, "erro");
                selectGuardarDentro.value = "__guardar__";
                return;
            }
        }
        if (estado.isMestre) {
            const dados = { dentroDe: novoContainerId || null, compartimentoId: novoContainerId ? novoCompartimentoId : null };
            // Guardar move o item junto pra categoria do recipiente;
            // tirar mantém a categoria atual dele (fica onde estava).
            if (novoContainerId) dados.categoria = categoriaNova;
            // Guardar dentro de um recipiente desequipa automaticamente —
            // item guardado não pode continuar contando como "na mão"
            // (mesmo princípio já aplicado ao mudar de categoria, logo
            // abaixo). Sem isso, um item que estava equipada:true antes
            // de ser guardado ficava com essa flag PRESA no registro; se
            // depois ele fosse tirado do recipiente (dentroDe: null) sem
            // nunca ter sido reequipado de propósito, voltava a contar
            // como ocupando mão sozinho — ficando "invisível" (não some
            // da lista, mas também não aparece destacado como algo que
            // o jogador conscientemente pegou) e prendendo o indicador
            // de Mãos livres em 1/2 sem nenhum item óbvio pra soltar.
            if (novoContainerId) dados.equipada = false;
            await update(ref(db, `${caminhoBase()}/inventario/${id}`), dados);
            toast(novoContainerId ? `${it.nome} guardado em ${nomeContainerNovo} → ${nomeCompartimentoNovo}.` : `${it.nome} tirado do recipiente.`);
        } else {
            const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
            const detalhe = novoContainerId
                ? `${nomeJogador} quer guardar "${it.nome}" dentro de "${nomeContainerNovo} → ${nomeCompartimentoNovo}".`
                : `${nomeJogador} quer tirar "${it.nome}" do recipiente em que está guardado.`;
            await criarAcaoPendente({
                tipo: "guardar_item",
                fichaId: estado.fichaAtualId,
                nomeJogador,
                detalhe,
                payload: { itemId: id, itemNome: it.nome, containerIdAtual: it.dentroDe || null, containerIdNovo: novoContainerId || null, compartimentoIdNovo: novoContainerId ? novoCompartimentoId : null, containerNomeNovo: nomeContainerNovo, categoriaNova: novoContainerId ? categoriaNova : null }
            });
            toast("Pedido enviado ao Mestre.");
            selectGuardarDentro.value = "__guardar__";
        }
    });

    const selectTransferir = li.querySelector(".select-transferir");
    categorias.forEach(cat => {
        if (cat.id === it.categoria) return;
        const opt = document.createElement("option");
        opt.value = cat.id;
        opt.innerText = `→ ${cat.nome}`;
        selectTransferir.appendChild(opt);
    });
    const optPlaceholder = document.createElement("option");
    optPlaceholder.value = "";
    optPlaceholder.innerText = "Mover para...";
    optPlaceholder.selected = true;
    optPlaceholder.disabled = true;
    selectTransferir.prepend(optPlaceholder);

    selectTransferir.addEventListener("click", (e) => e.stopPropagation());
    selectTransferir.addEventListener("change", async (e) => {
        e.stopPropagation();
        const novaCategoria = e.target.value;
        if (!novaCategoria) return;
        if (estado.isMestre) {
            const dados = { categoria: novaCategoria };
            // Sai de "levando consigo" desequipa automaticamente — vale
            // tanto pra item comum/arma quanto pra container (mochila
            // guardada em casa não continua "vestida"/"nas costas").
            if (novaCategoria !== "levando" && (ehEquipavelItem || ehContainerItem) && equipadaItem) dados.equipada = false;
            // Item que muda de categoria não pode continuar "guardado"
            // dentro de um recipiente que ficou pra trás na categoria
            // antiga (mochila que ficou em casa não segura item que foi
            // "levado" sozinho, por exemplo).
            if (it.dentroDe) dados.dentroDe = null;
            // Trava central de "item não fica solto" (ver
            // resolverEntradaLevandoConsigo em inventario.js, passo 12
            // do projeto-slots-porte.txt): só entra em jogo ao mover PRA
            // "levando" — sair de "levando" já é sempre válido (não
            // passa pela regra). Em vez de só exigir que o item JÁ
            // esteja equipado (impossível pro primeiro item — o botão
            // de equipar só existe depois que o item já está em
            // "levando"), tenta automaticamente colocá-lo num lugar
            // físico válido (na mão, vestido, ou carregado nas costas),
            // respeitando mãos livres/exclusividade. Só bloqueia quando
            // nem isso é possível.
            if (novaCategoria === "levando") {
                const itemPosMudanca = { ...it, ...dados };
                const resultadoEntrada = resolverEntradaLevandoConsigo(estado.fichaAtual, itemPosMudanca, id);
                if (!resultadoEntrada.ok) {
                    toast(`"${it.nome}" ${resultadoEntrada.motivo}`, "erro");
                    selectTransferir.value = "";
                    return;
                }
                if (resultadoEntrada.equipar) dados.equipada = true;
            }
            await update(ref(db, `${caminhoBase()}/inventario/${id}`), dados);
            // Se o item movido é um recipiente, o que está guardado
            // dentro dele muda de categoria junto (continua guardado lá).
            if (ehContainer(it.tag)) {
                const filhos = itensDentroDe(estado.fichaAtual, id);
                if (filhos.length) {
                    const payloadFilhos = {};
                    filhos.forEach(f => { payloadFilhos[`${f.id}/categoria`] = novaCategoria; });
                    Object.assign(estado.fichaAtual.inventario, Object.fromEntries(filhos.map(f => [f.id, { ...estado.fichaAtual.inventario[f.id], categoria: novaCategoria }])));
                    await update(ref(db, `${caminhoBase()}/inventario`), payloadFilhos);
                }
            }
            toast(`${it.nome} movido.`);
        } else {
            const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
            const nomeCatNova = nomeCategoria(estado.fichaAtual, novaCategoria);
            await criarAcaoPendente({
                tipo: "mover_item",
                fichaId: estado.fichaAtualId,
                nomeJogador,
                detalhe: `${nomeJogador} quer mover "${it.nome}" para "${nomeCatNova}".`,
                payload: { itemId: id, itemNome: it.nome, categoriaAtual: it.categoria, categoriaNova: novaCategoria }
            });
            toast("Pedido de movimentação enviado ao Mestre.");
            selectTransferir.value = "";
        }
    });

    li.querySelector(".btn-usar-item").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!podeUsar) return;
        await iniciarUsoItem({ id, ...it }, modificadoresPlanos);
    });

    const btnRecarregar = li.querySelector(".btn-recarregar-item");
    if (btnRecarregar) {
        btnRecarregar.addEventListener("click", async (e) => {
            e.stopPropagation();
            await recarregarArma(id, it);
        });
    }

    const btnRetirarCarregador = li.querySelector(".btn-retirar-carregador-item");
    if (btnRetirarCarregador) {
        btnRetirarCarregador.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (!armaEstaCarregadaItem) return;
            await retirarCarregadorArma(id, it);
        });
    }

    const btnCarregarCamara = li.querySelector(".btn-carregar-camara-item");
    if (btnCarregarCamara) {
        btnCarregarCamara.addEventListener("click", async (e) => {
            e.stopPropagation();
            if (camaraCarregadaItem) return;
            await carregarCamaraArma(id, it);
        });
    }

    const btnCarregar = li.querySelector(".btn-carregar-item");
    if (btnCarregar) {
        btnCarregar.addEventListener("click", async (e) => {
            e.stopPropagation();
            await carregarCarregador(id, it);
        });
    }

    const btnDarItem = li.querySelector(".btn-dar-item");
    if (btnDarItem) {
        btnDarItem.addEventListener("click", (e) => {
            e.stopPropagation();
            abrirModalDarItem(id, it);
        });
    }

    // "Adicionar ao saldo" — devolve (todo ou parte) do valor de um item
    // de dinheiro físico pra um saldo normal. Abre a mesma caixinha
    // inline usada pra "Pegar" dinheiro do cenário; quem escolhe o
    // saldo de destino é o Mestre, na hora de confirmar o pedido (ver
    // montarPainelAcoesPendentes).
    const btnAdicionarSaldo = li.querySelector(".btn-adicionar-saldo-item");
    if (btnAdicionarSaldo) {
        btnAdicionarSaldo.addEventListener("click", (e) => {
            e.stopPropagation();
            itemDinheiroCaixaAbertaId = id;
            renderizarInventario(modificadoresPlanos);
            const input = el.inventarioListas.querySelector(".input-item-depositar-valor");
            if (input) input.focus();
        });
    }
    const btnCancelarDepositar = li.querySelector(".btn-item-cancelar-depositar");
    if (btnCancelarDepositar) {
        btnCancelarDepositar.addEventListener("click", (e) => {
            e.stopPropagation();
            itemDinheiroCaixaAbertaId = null;
            renderizarInventario(modificadoresPlanos);
        });
    }
    const btnConfirmarDepositar = li.querySelector(".btn-item-confirmar-depositar");
    if (btnConfirmarDepositar) {
        btnConfirmarDepositar.addEventListener("click", async (e) => {
            e.stopPropagation();
            const input = li.querySelector(".input-item-depositar-valor");
            await depositarDinheiroItem(id, it, input ? input.value : "");
        });
    }

    li.addEventListener("click", (e) => {
        e.stopPropagation();
        abrirModalEdicao("inventario", id);
    });

    // Prévia flutuante da imagem em tamanho maior, seguindo o mouse
    // (ver ativarPreviewFlutuanteImagem) — só faz sentido com mouse de
    // verdade, então em touch (celular/tablet) o hover nem dispara.
    const thumbHover = li.querySelector(".entity-thumb");
    if (thumbHover) ativarPreviewFlutuanteImagem(thumbHover, it.imagem);

    // Se é um recipiente aberto (expandido), a lista de filhos entra
    // dentro do próprio <li> (nested <ul> — válido em HTML e garante que
    // o conteúdo "viaja" junto se o item pai for movido/filtrado).
    if (ehContainerItem && containerAberto) {
        // Badge de ocupação POR COMPARTIMENTO (passo 13, seção 5.2 do
        // projeto-slots-porte.txt) — cada compartimento tem sua própria
        // capacidade e ocupação (ex: "Bolso frente esq. 1/1 · Bolso de
        // trás 0/1"), não mais um volume total agregado do container
        // inteiro. Compartimento sem capacidadeVolume definida (0) não
        // mostra barra de progresso, só o total guardado — não tem
        // limite pra comparar. Fica vermelho/pisca se, por alguma
        // inconsistência de dados antigos, passar do limite (a
        // validação normal — modal e select-guardar-dentro — já impede
        // isso de acontecer em uso normal).
        const compartimentosContainer = listaCompartimentos(it);
        const painelCompartimentos = document.createElement("div");
        painelCompartimentos.className = "volume-bar-wrap";
        painelCompartimentos.innerHTML = compartimentosContainer.length
            ? compartimentosContainer.map(comp => {
                const usado = volumeTotalDentroDe(estado.fichaAtual, id, comp.id);
                const capacidade = Number(comp.capacidadeVolume) || 0;
                const estourado = capacidade > 0 && usado > capacidade;
                const pct = capacidade > 0 ? Math.min(100, Math.round((usado / capacidade) * 100)) : 0;
                return `
                    <div class="compartimento-badge">
                        <span class="volume-bar-texto${estourado ? " volume-bar-texto-estourado" : ""}">🎒 ${escapeHtml(comp.nome || "Compartimento")}: ${usado}${capacidade > 0 ? `/${capacidade}` : " (sem limite definido)"}</span>
                        ${capacidade > 0 ? `<div class="volume-bar-track"><div class="volume-bar-fill${estourado ? " volume-bar-estourado" : ""}" style="width:${pct}%;"></div></div>` : ""}
                    </div>
                `;
            }).join("")
            // Defesa extra: container sem nenhum compartimento cadastrado
            // não devia acontecer em uso normal (o modal exige pelo menos
            // 1 — ver lerCompartimentosDoModal), mas evita tela quebrada
            // se algum dado antigo escapou da migração.
            : `<span class="volume-bar-texto volume-bar-texto-estourado">⚠️ Este recipiente não tem nenhum compartimento cadastrado.</span>`;
        li.appendChild(painelCompartimentos);

        const ulFilhos = document.createElement("ul");
        ulFilhos.className = "entity-list entity-list-nested";
        if (!filhosContainer.length) {
            ulFilhos.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nada guardado aqui ainda.</li>`;
        } else {
            filhosContainer.forEach(filho => {
                const { id: idFilho, ...itFilho } = filho;
                ulFilhos.appendChild(criarLiItem(idFilho, itFilho, { categorias, modificadoresPlanos, nivel: nivel + 1 }));
            });
        }
        li.appendChild(ulFilhos);
    }

    return li;
}


// ---------------------------------------------------------------------
// PARTE 2: uso/dar item (Passo 17)
// ---------------------------------------------------------------------

// Rótulo do estado de saúde atual (ex: "Machucado"/"Muito Machucado"),
// lido do mesmo cálculo acima — usado só pra nomear a penalidade no
// detalhamento da rolagem de ataque (ver formatarPenalidadesAtaque).
function estadoSaudeLabelAtual() {
    return (window._estadoSaudeAtual && window._estadoSaudeAtual.label) || "";
}

// Lista, em texto, cada penalidade/bônus não-zero que entrou na rolagem
// de ataque (estado de saúde, recuo, precisão) — ex: "-4 muito machucado,
// -1 recuo, -1 precisão". Devolve "—" quando não há nenhuma.
function formatarPenalidadesAtaque(penalidadeSaude, modRecuo, modPrecisao, modificadorExtra = 0, modMovimento = 0, modCQC = 0, modEscuro = 0) {
    const partes = [];
    if (penalidadeSaude) {
        const rotulo = estadoSaudeLabelAtual().toLowerCase() || "estado de saúde";
        partes.push(`${penalidadeSaude >= 0 ? "+" : ""}${penalidadeSaude} ${rotulo}`);
    }
    if (modRecuo) partes.push(`${modRecuo >= 0 ? "+" : ""}${modRecuo} recuo`);
    if (modPrecisao) partes.push(`${modPrecisao >= 0 ? "+" : ""}${modPrecisao} precisão`);
    if (modificadorExtra) partes.push(`${modificadorExtra >= 0 ? "+" : ""}${modificadorExtra} contra-ataque (Aparar)`);
    if (modMovimento) partes.push(`${modMovimento >= 0 ? "+" : ""}${modMovimento} movimento`);
    if (modEscuro) partes.push(`${modEscuro >= 0 ? "+" : ""}${modEscuro} escuro/mira às cegas`);
    if (modCQC) partes.push(`${modCQC >= 0 ? "+" : ""}${modCQC} CQC (1x1)`);
    return partes.length ? partes.join(", ") : "—";
}

// Bloco de 4 linhas com o detalhamento completo de uma rolagem de
// ataque (ver resolverAtaque): rolagem bruta do d20, modificador de
// perícia isolado (perícia + ajustes estruturados, ou -1 se destreinada
// — SEM o estado de saúde embutido), penalidades separadas (estado de
// saúde/recuo/precisão/movimento) e o resultado final. Falha crítica
// (nat 1 OU resultado final <= 1) mostra "CRÍTICO NEGATIVO" no lugar do
// número; acerto crítico (resultado final 20 ou mais — dobra o dano,
// ver resolverAtaque) mostra "CRÍTICO POSITIVO" — só destaques visuais;
// não mudam se o ataque acerta ou erra, que continua comparando
// resultadoAtaque com a dificuldade.
function formatarDetalheRolagemAtaque({ brutoAtaque, periciaBase, penalidadeSaude, modRecuo, modPrecisao, resultadoAtaque, modificadorExtra = 0, modMovimento = 0, modCQC = 0, modEscuro = 0, criticoPositivo = false, criticoNegativo = false }) {
    const penalidadesTexto = formatarPenalidadesAtaque(penalidadeSaude, modRecuo, modPrecisao, modificadorExtra, modMovimento, modCQC, modEscuro);
    const resultadoTexto = criticoNegativo
        ? "CRÍTICO NEGATIVO"
        : (criticoPositivo ? `${resultadoAtaque} — CRÍTICO POSITIVO` : `${resultadoAtaque}`);
    return `rolagem: ${brutoAtaque}\n`
        + `modificador de perícia: ${periciaBase >= 0 ? "+" : ""}${periciaBase}\n`
        + `penalidades: ${penalidadesTexto}\n`
        + `resultado: ${resultadoTexto}`;
}

// Status de Alcance Limitado (Delimitar alcance) de quem está sendo
// controlado nesta tela agora. Mesma ideia de meuStatusAgarrado().
function meuStatusAlcanceLimitado() {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].alcanceLimitado) || null;
}

// Alcance (Curto/Médio/Longo) de um golpe — mesma inferência usada em
// golpeBloqueadoPorAgarrar, mas distinguindo Médio de Longo (importa
// pra a exceção do Médio no Delimitar alcance). Prioriza o alcance
// cadastrado na própria manobra (Soco/Chute/etc); pra arma equipada,
// sem "alcance" próprio no banco, infere pela perícia vinculada — sem
// como saber Médio nesse caso (só via manobra explícita), então cai
// pra Longo se não for uma das perícias de combate bem próximo.
function alcanceDoGolpe(nomeAtaque, nomePericia) {
    const manobra = MANOBRAS_COMBATE.find(m => m.nome === nomeAtaque);
    if (manobra && ["Curto", "Médio", "Longo"].includes(manobra.alcance)) {
        return manobra.alcance;
    }
    return PERICIAS_ALCANCE_CURTO_AGARRADO.includes(nomePericia) ? "Curto" : "Longo";
}

// Delimitar alcance (manual): "escolha um alcance único pra poder ser
// utilizado. Alcance médio sempre pode ser utilizado em limite de curta
// distância causando metade do dano." — ou seja: só o alcance escolhido
// vale cheio; Médio (se não for o escolhido) ainda é permitido, mas com
// dano pela metade; qualquer outro alcance fica bloqueado.
function verificarAlcanceLimitado(statusAlcance, alcanceGolpe) {
    if (!statusAlcance || !statusAlcance.ativo) return { bloqueado: false, meioDano: false };
    if (alcanceGolpe === statusAlcance.valor) return { bloqueado: false, meioDano: false };
    if (alcanceGolpe === "Médio") return { bloqueado: false, meioDano: true };
    return { bloqueado: true, meioDano: false };
}

// Agarrar (manual): "impossibilita golpes de alcance médio e longo".
// Pra manobras desarmadas com dano (Soco/Chute/Joelhada/Cotovelada), o
// alcance vem direto da própria manobra (MANOBRAS_COMBATE). Pra uma
// arma equipada, o sistema não guarda "alcance" por item — só a perícia
// vinculada — então o alcance é inferido a partir dela: perícias de
// combate bem próximo (curtas/desarmadas) liberam o golpe; arma de fogo
// e armas de alcance longo continuam bloqueadas.
const PERICIAS_ALCANCE_CURTO_AGARRADO = [
    "CQC", "Karatê Cobra Kai", "Jiu Jitsu", "Força Bruta", "Briga de Rua",
    "Muay Thai", "Boxe", "Lâminas Curtas", "Contundentes Curtas"
];
function golpeBloqueadoPorAgarrar(nomeAtaque, nomePericia) {
    const manobra = MANOBRAS_COMBATE.find(m => m.nome === nomeAtaque);
    if (manobra && manobra.alcance && manobra.alcance !== "Variável") {
        return manobra.alcance === "Médio" || manobra.alcance === "Longo";
    }
    return !PERICIAS_ALCANCE_CURTO_AGARRADO.includes(nomePericia);
}

// Status de Agarrado (manual) de quem está sendo controlado nesta tela
// agora — a própria ficha do jogador, ou o NPC que o Mestre estiver
// atuando como. `null` se não estiver agarrado ou fora de combate.
function meuStatusAgarrado() {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].agarrado) || null;
}

// Status de Imobilizado (CQC nível 4) de quem está sendo controlado
// nesta tela agora. Diferente de Agarrado, bloqueia QUALQUER golpe
// (ver checagem em resolverAtaque) — não só alcance médio/longo.
function meuStatusImobilizado() {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].imobilizado) || null;
}

// Status de Desacordado (Jiu Jitsu nível 3) de quem está sendo
// controlado nesta tela agora — inconsciente, bloqueia TUDO igual
// Imobilizado (ver checagem em resolverAtaque), mas sem teste pra se
// libertar sozinho (ver definirDesacordado/soltarDesacordado em
// mestre.js).
function meuStatusDesacordado() {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    return (participantes[meuPid] && participantes[meuPid].desacordado) || null;
}

// Status de Desmaio Temporizado (Parte 5.5 do plano de automação dos
// materiais químicos — Sedativo nível 2/3/4: "desmaia por N turnos").
// Diferente de meuStatusDesacordado() acima (um booleano só, preso a
// `participante.desacordado`), esse efeito é uma entrada normal de
// `statusAtivos` (tipo "desmaio_temporizado", gerada por
// aplicarDesmaioTemporizado em mestre.js) com contagem regressiva
// própria — acorda sozinho quando zera, sem o Mestre precisar clicar
// em nada (ver processarStatusInicioTurno). Devolve a primeira entrada
// ativa encontrada (ou `null`), com `origem`/`turnosRestantes` prontos
// pra montar a mensagem de bloqueio em resolverAtaque.
function meuStatusDesmaioTemporizado() {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return null;
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const statusAtivos = (participantes[meuPid] && participantes[meuPid].statusAtivos) || {};
    const entrada = Object.values(statusAtivos).find(s => s && s.tipo === "desmaio_temporizado" && (Number(s.turnosRestantes) || 0) > 0);
    return entrada || null;
}

// Conta o disparo desta arma nesta ficha dentro do "turno" atual (ver
// resetarDisparosTurno) e devolve o número dele (1 = primeiro disparo).
// Persiste em combateAtivo/disparosPorFicha/{fichaId}/{itemId} pra que
// o modificador de Recuo acumule corretamente entre disparos seguidos
// do mesmo personagem, mesmo se ele reabrir a ficha no meio do turno.
async function proximoNumeroDisparo(itemId) {
    const chave = String(itemId || "sem_id");
    const idDisparo = estado.modoNpc ? `npc_${estado.npcAtualId}` : estado.fichaAtualId;
    pausarSync();
    try {
        const snap = await get(ref(db, caminhoMesa(`combateAtivo/disparosPorFicha/${idDisparo}/${chave}`)));
        const atual = snap.exists() ? (Number(snap.val()) || 0) : 0;
        const proximo = atual + 1;
        await update(ref(db, caminhoMesa(`combateAtivo/disparosPorFicha/${idDisparo}`)), { [chave]: proximo });
        return proximo;
    } finally {
        retornarSync();
    }
}

// Fluxo completo de ataque automatizado: rola d20 + perícia do
// atacante (+ Precisão e penalidade de Recuo, se for arma de fogo),
// compara com a dificuldade de acerto (Dificuldade de Acerto da arma de
// fogo − Percepção do atacante, ou base da manobra + Agilidade/Constituição
// do alvo pra corpo a corpo/desarmado — base varia por golpe, ver
// baseDificuldadeAtaque em dados-manual.js), e se acertar, resolve o dano (arma ou
// golpe desarmado) descontando a redução de armadura do alvo — tudo
// registrado numa única linha explícita de ACERTO/ERRO no Log de Dados.
export async function resolverAtaque(it, modificadoresPlanosAtacante, participante, opcoes = {}) {
    const modificadorExtra = opcoes.modificadorExtra || 0;
    const ehContraAtaque = !!opcoes.ehContraAtaque;
    const ehDisparoAvancarCQC = !!opcoes.ehDisparoAvancarCQC;
    const nomePericia = it.periciaUso;
    if (!nomePericia) { toast("Esta arma não tem perícia vinculada.", "erro"); return; }

    // Desacordado (Jiu Jitsu nível 3, manual): inconsciente — bloqueia
    // TUDO igual Imobilizado, mas sem teste pra se libertar sozinho (só
    // o Mestre "Acorda" pelo Gerenciador de Combate). Verifica antes de
    // tudo, igual Imobilizado logo abaixo.
    const statusDesacordado = meuStatusDesacordado();
    if (statusDesacordado && statusDesacordado.ativo) {
        toast(`Você está DESACORDADO por ${statusDesacordado.porNome} — inconsciente, não consegue agir enquanto durar. Só o Mestre pode te acordar.`, "erro");
        return;
    }

    // Desmaio Temporizado (Parte 5.5 do plano de automação dos materiais
    // químicos — Sedativo nível 2/3/4): mesmo bloqueio de Desacordado
    // acima, mas essa variante acorda SOZINHA quando a contagem zera
    // (ver processarStatusInicioTurno/meuStatusDesmaioTemporizado) — sem
    // precisar do Mestre clicar em "Acordar".
    const statusDesmaioTemporizado = meuStatusDesmaioTemporizado();
    if (statusDesmaioTemporizado) {
        toast(`Você está DESMAIADO por ${statusDesmaioTemporizado.origem || statusDesmaioTemporizado.label || "efeito químico"} — inconsciente por mais ${statusDesmaioTemporizado.turnosRestantes} turno(s), não consegue agir.`, "erro");
        return;
    }

    // Imobilizar (CQC nível 4, manual): "impedindo completamente ataques
    // e movimentação" enquanto durar — diferente de Agarrar, bloqueia
    // QUALQUER golpe (não só alcance médio/longo). Verifica antes de tudo,
    // igual Agarrar.
    const statusImobilizado = meuStatusImobilizado();
    if (statusImobilizado && statusImobilizado.ativo) {
        toast(`Você está IMOBILIZADO por ${statusImobilizado.porNome} — não consegue atacar nem se mover enquanto durar. Teste Destreza no seu turno pra se libertar.`, "erro");
        return;
    }

    // Agarrar (manual): quem está agarrado não consegue golpes de
    // alcance médio/longo — só curto — enquanto durar. Verifica ANTES de
    // gastar qualquer ação (o golpe nem chega a acontecer).
    const statusAgarrado = meuStatusAgarrado();
    if (statusAgarrado && statusAgarrado.ativo && golpeBloqueadoPorAgarrar(it.nome, nomePericia)) {
        toast(`Você está AGARRADO por ${statusAgarrado.porNome} — só dá pra atacar com golpes de alcance curto enquanto isso durar.`, "erro");
        return;
    }

    // Delimitar alcance (manual): golpe de alcance diferente do imposto
    // (e não-Médio) fica bloqueado; Médio sempre passa, mas com dano pela
    // metade — ver verificarAlcanceLimitado. Igual ao Agarrar, verifica
    // antes de gastar a ação.
    const statusAlcance = meuStatusAlcanceLimitado();
    const alcanceGolpe = alcanceDoGolpe(it.nome, nomePericia);
    const verifAlcance = verificarAlcanceLimitado(statusAlcance, alcanceGolpe);
    if (verifAlcance.bloqueado) {
        toast(`Seu alcance está limitado a ${statusAlcance.valor} por ${statusAlcance.porNome} — esse golpe (alcance ${alcanceGolpe}) não pode ser usado. Use "Retomar alcance" pra tirar a limitação.`, "erro");
        return;
    }

    const armaConfig = it.arma || {};
    const ehFogo = ehArmaDeFogo(nomePericia) && !armaConfig.desarmado;

    // Contra-ataque do Aparar é imediato (manual: "pode atacar
    // imediatamente com modificador -1") — não espera o próprio turno
    // nem gasta a ação normal do turno, então pula a trava de
    // "é seu turno?/tem ação sobrando?" que vale pro ataque comum.
    // Disparar e Avançar (CQC nível 4) é igual nesse ponto: a ação já foi
    // reservada do 1º turno na hora de rolar a iniciativa (ver
    // iniciarIniciativaCombate em mestre.js), então os 2 disparos daqui
    // também pulam essa trava — resolverDispararAvancar chama isso 2x.
    //
    // Gasto automático (direto, sem passar pelo Mestre) só é permitido
    // pra golpe corpo a corpo/arma branca (ehFogo === false). Disparo de
    // arma de fogo NUNCA gasta a ação na hora, mesmo sendo o Mestre
    // controlando o NPC que atirou — sempre entra na fila de Ações
    // Pendentes pra ele decidir (ver checarConsumoDeAcao).
    let consumo, participanteIdParaGastarAcao;
    if (ehContraAtaque || ehDisparoAvancarCQC) {
        consumo = { participanteId: null, direto: false };
        participanteIdParaGastarAcao = null;
    } else {
        consumo = checarConsumoDeAcao(nomePericia === "CQC");
        if (!consumo) return;
        participanteIdParaGastarAcao = consumo.participanteId;
    }

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";

    // Golpes Mirados (manual): local do corpo escolhido pra mirar —
    // todo golpe pode ser mirado (a Cabeça muda de dificuldade e ganha
    // bônus de dano só quando o golpe é especificamente um tiro de arma
    // de fogo — ver LOCAIS_MIRA/difModLocalMira/bonusDanoFracaoLocalMira
    // em dados-manual.js).
    let localMira = localMiraPorKey(opcoes.localMira);
    const difMiraAtual = difModLocalMira(localMira, ehFogo);
    const bonusDanoMiraAtual = bonusDanoFracaoLocalMira(localMira, ehFogo);
    const notaLocalMira = localMira.key !== "padrao"
        ? ` Mirando: ${localMira.label} (dificuldade +${difMiraAtual}${bonusDanoMiraAtual ? `, dano +${Math.round(bonusDanoMiraAtual * 100)}%` : ""}).`
        : "";

    // Modificadores Situacionais Rápidos de Combate à Distância — só
    // fazem sentido (e só aparecem no modal) pra disparo de arma de
    // fogo de verdade. "Movimento" e "Escuro" são modificadores diretos
    // no ATAQUE (somam com modPrecisao/modRecuo/modificadorExtra, igual
    // qualquer outra penalidade de pontaria — mira às cegas prejudica
    // QUEM ATIRA, não facilita o teste; antes "Escuro" reduzia a
    // DIFICULDADE por engano, o que tinha o efeito contrário do
    // pretendido — favorecia o atacante em vez de penalizar); só
    // Combatentes adicionais mexe na DIFICULDADE (aplicado mais abaixo,
    // depois que a dificuldade base/do local mirado é calculada) —
    // mais gente na linha de tiro é um problema de MIRA NO ALVO
    // específico, não da pontaria de quem atira. Tiro à queima-roupa em
    // alvo dominado/agarrado quadruplica o dano (aplicado lá embaixo,
    // junto do resto do pipeline de dano). A lista
    // notasSituacionaisLista/notaSituacional é reaproveitada mais abaixo
    // pros bônus de CQC também (nem todo item dela é "de arma de fogo").
    const situacional = ehFogo ? (opcoes.situacional || {}) : {};
    const MOD_MOVIMENTO = { alvoMovimento: -2, alvoCarro: -3, ambosMovimento: -4 };
    const modMovimentoAtaque = MOD_MOVIMENTO[situacional.movimento] || 0;
    const modEscuroAtaque = situacional.escuro ? -5 : 0;
    const combatentesAdicionais = Math.max(0, Number(situacional.combatentesAdicionais) || 0);
    const difCombatentes = combatentesAdicionais * 1;
    const queimaRoupaAgarrado = !!situacional.queimaRoupa;
    const notasSituacionaisLista = [];
    if (situacional.movimento === "alvoMovimento") notasSituacionaisLista.push(`alvo em movimento (${modMovimentoAtaque})`);
    if (situacional.movimento === "alvoCarro") notasSituacionaisLista.push(`alvo em carro em movimento (${modMovimentoAtaque})`);
    if (situacional.movimento === "ambosMovimento") notasSituacionaisLista.push(`ambos em movimento (${modMovimentoAtaque})`);
    if (situacional.escuro) notasSituacionaisLista.push(`escuro/mira às cegas (${modEscuroAtaque} no ataque)`);
    if (combatentesAdicionais > 0) notasSituacionaisLista.push(`+${difCombatentes} na dificuldade (${combatentesAdicionais} combatente${combatentesAdicionais > 1 ? "s" : ""} indesejado${combatentesAdicionais > 1 ? "s" : ""} na linha de tiro)`);
    if (queimaRoupaAgarrado) notasSituacionaisLista.push("queima-roupa em alvo dominado/agarrado: dano quadruplicado");

    // CQC (manual pg. 20-21): nível da perícia do atacante, usado pros
    // bônus abaixo — independe de qual perícia está sendo rolada NESTE
    // golpe (ver bonusCQCFacaAdaga, que vale mesmo golpeando de Lâminas
    // Curtas). "1x1" = só o atacante e mais um participante cadastrados
    // no Gerenciador de Combate com iniciativa ativa.
    const entradaCQC = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "CQC");
    const nivelCQC = entradaCQC ? (Number(entradaCQC[1].nivel) || 0) : 0;
    // Karatê Cobra Kai (manual pg. 22): "No nível 5 todos os ataques
    // desarmados são críticos" — só vale pra golpe desarmado ROLADO COM
    // a perícia Karatê Cobra Kai (mesma leitura usada pro dano máximo
    // sem rolar em calcularEspecificidadeGolpe/danoMaximoSemRolar).
    // Aplicado mais abaixo, assim que o ataque é confirmado como
    // acerto — ver cobraKaiCriticoAutomatico em dados-manual.js.
    const entradaCobraKai = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "Karatê Cobra Kai");
    const nivelCobraKai = entradaCobraKai ? (Number(entradaCobraKai[1].nivel) || 0) : 0;
    const cobraKaiCriticoElegivel = armaConfig.desarmado && nomePericia === "Karatê Cobra Kai" && cobraKaiCriticoAutomatico(nivelCobraKai);
    // Força Bruta (manual pg. 22): efeitos defensivos (ignora armadura,
    // bloqueio menos eficaz, penalidade pra esquivar) só valem quando
    // ESTE golpe está sendo rolado com a perícia Força Bruta — mesmo
    // critério já usado pro dano máximo/escala em calcularEspecificidadeGolpe.
    // Repassados pra abrirReacaoPendente pra a reação do alvo (Esquivar/
    // Bloquear) e a redução de armadura em aplicarDano já saírem certos.
    const entradaForcaBruta = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "Força Bruta");
    const nivelForcaBrutaAtaque = (armaConfig.desarmado && nomePericia === "Força Bruta" && entradaForcaBruta) ? (Number(entradaForcaBruta[1].nivel) || 0) : 0;
    const forcaAtacanteForcaBruta = Number(estado.fichaAtual.dados.forca) || 0;
    const ignorarArmaduraPontos = ignorarArmaduraForcaBruta(nivelForcaBrutaAtaque, forcaAtacanteForcaBruta);
    const penalidadeEsquivaForcaBruta = penalidadeEsquivarContraForcaBruta(nivelForcaBrutaAtaque);
    const bloqueioForcaBruta = bloqueioContraForcaBruta(nivelForcaBrutaAtaque);
    const numParticipantesCombate = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) ? Object.keys(estado.combateAtivoCache.participantes).length : 0;
    const ehCombate1x1 = combateComIniciativaAtivo() && numParticipantesCombate === 2;
    // Nível 1: +1 EM ROLAGENS DE CQC (só quando a perícia usada pra
    // rolar ESTE golpe é CQC de verdade) contra alvo único 1x1.
    const modCQC1x1 = (nomePericia === "CQC" && ehCombate1x1) ? bonusCQC1x1(nivelCQC) : 0;
    if (modCQC1x1) notasSituacionaisLista.push(`CQC nível ${nivelCQC} — combate 1x1 (+${modCQC1x1})`);
    // Nível 3: faca/adaga golpeia com dificuldade -1 e ganha dano extra
    // de Destreza [escala D] — detectado pelo NOME do item (ver
    // ehFacaOuAdaga), não pela perícia usada pra rolar.
    const bonusCQCFaca = (!armaConfig.desarmado && ehFacaOuAdaga(it.nome)) ? bonusCQCFacaAdaga(nivelCQC) : null;
    if (bonusCQCFaca) notasSituacionaisLista.push(`CQC nível ${nivelCQC} — faca/adaga (dificuldade ${bonusCQCFaca.difAjuste}, dano extra de Destreza)`);

    // Recuo — só disparos de arma de fogo de verdade contam (golpe
    // desarmado nunca é "arma de fogo" mesmo se a perícia usada fosse
    // uma perícia de tiro, o que nem é o caso aqui). idDisparoAtual/chave
    // usam a MESMA convenção de proximoNumeroDisparo, guardados aqui pra
    // dar pra resetar esse contador específico (arma+personagem) assim
    // que o Mestre validar o gasto da ação — ver mais abaixo.
    let modRecuo = 0;
    const idDisparoAtual = estado.modoNpc ? `npc_${estado.npcAtualId}` : estado.fichaAtualId;
    const chaveDisparoAtual = String(it.id || "sem_id");
    if (ehFogo) {
        const numeroDisparo = await proximoNumeroDisparo(it.id);
        modRecuo = modificadorRecuo(armaConfig.recuo, numeroDisparo);
    }
    const modPrecisao = ehFogo ? (Number(armaConfig.precisao) || 0) : 0;

    // periciaBase = só perícia + ajustes estruturados (ou -1 se
    // destreinada), SEM o estado de saúde embutido — separado assim pra
    // poder discriminar cada modificador na mensagem do ataque (ver
    // formatarDetalheRolagemAtaque). penalidadeSaude entra depois, soma
    // igual, então modPericia/modAtaque abaixo dão exatamente o mesmo
    // resultado de antes.
    const penalidadeSaude = penalidadeTestesAtual();
    const periciaBase = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanosAtacante, 0);
    const modPericia = periciaBase + penalidadeSaude;
    const modAtaque = modPericia + modPrecisao + modRecuo + modificadorExtra + modMovimentoAtaque + modEscuroAtaque + modCQC1x1;
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modAtaque;
    // Acerto Crítico (manual): o RESULTADO FINAL (d20 + modificadores)
    // precisa bater ou passar de 20 — d20 natural 20 sozinho NÃO garante
    // crítico se os modificadores derrubarem o resultado abaixo de 20
    // (ex.: d20=20, modificador -1, resultado final 19 → acerto normal,
    // não crítico). Dobra o dano do ataque (aplicado mais abaixo, sobre
    // danoTotal, antes de reduções de armadura/agarrado/alcance). Falha
    // Crítica: d20 natural 1, OU resultado final <= 1 (possível com
    // modificador negativo, ex: d20=2, modificador -1, resultado final =
    // 1) — sempre sinalizada no Log como "Fogo Amigo/Desastre" pra
    // resolução rápida do Mestre, independente do resultado final ter
    // batido a dificuldade ou não.
    let criticoPositivo = resultadoAtaque >= 20;
    const criticoNegativo = brutoAtaque === 1 || resultadoAtaque <= 1;
    let detalheRolagem = formatarDetalheRolagemAtaque({ brutoAtaque, periciaBase, penalidadeSaude, modRecuo, modPrecisao, resultadoAtaque, modificadorExtra, modMovimento: modMovimentoAtaque, modCQC: modCQC1x1, modEscuro: modEscuroAtaque, criticoPositivo, criticoNegativo });

    // constituicaoAlvo agora é sempre preenchida (usada mais abaixo,
    // depois do dano aplicado, pro teste de Constituição que decide SE
    // o sangramento acontece — golpes mirados perfurantes sangram tanto
    // no tiro quanto no corpo a corpo/arma branca, ver comentário lá
    // embaixo).
    let dificuldade, nomeAlvo, constituicaoAlvo = 0;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            const modsAlvo = coletarModificadores(fichaAlvo);
            // Constituição é atributo primário (não um secundário
            // calculado) — reaproveita calcularDificuldadeDefesaJogador
            // com base 0 só pra somar valor bruto + modificadores
            // estruturados ("atributo:constituicao").
            constituicaoAlvo = calcularDificuldadeDefesaJogador(fichaAlvo.dados, "constituicao", modsAlvo, 0);
            if (ehFogo) {
                const percepcaoAtacante = calcularDerivados(estado.fichaAtual.dados, modificadoresPlanosAtacante).secundarios.percepcao.total;
                dificuldade = calcularDificuldadeArmaFogo(armaConfig.dificuldadeAcerto, percepcaoAtacante);
            } else {
                const atributoDefesaChave = atributoDefesaPorPericia(nomePericia);
                const baseDif = baseDificuldadeAtaque(it.nome, nomePericia);
                dificuldade = calcularDificuldadeDefesaJogador(fichaAlvo.dados, atributoDefesaChave, modsAlvo, baseDif);
                // Arte marcial vs. Briga de Rua (manual pg. 22).
                if (nomePericia === "Briga de Rua" && alvoTemArteMarcialTreinada(fichaAlvo.pericias)) {
                    dificuldade += 2;
                    notasSituacionaisLista.push(`${nomeAlvo} tem uma arte marcial — Briga de Rua contra arte marcial tem dificuldade +2`);
                }
                // Carga química em Spray (Parte 9 — Veículo de transporte,
                // 1 ponto): -3 na dificuldade de DEFESA do alvo (não um
                // bônus no teste do atacante, decisão do Mestre) — a nuvem
                // é mais fácil de acertar que a agulha da Seringa.
                if (it.quimico && it.quimico.tipoEntrega === "spray") {
                    dificuldade -= 3;
                    notasSituacionaisLista.push(`Carga em spray de ${it.nome}: -3 na dificuldade de defesa de ${nomeAlvo}`);
                }
            }
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            // Agilidade/Constituição do alvo: recalculadas AO VIVO a partir
            // dos atributos primários + Vantagens (npc.vantagens) pro NPC
            // "detalhado" — mesmo padrão que calcularModEsquivarParticipante
            // já usa pra Esquivar — em vez dos campos soltos npc.agilidade/
            // npc.constituicao, que só são regravados quando o Mestre salva
            // a mini-ficha de novo (uma Vantagem de Agilidade recém-marcada
            // não mudava essa dificuldade até isso acontecer). NPC "rápido"
            // (sem atributosPrimarios) continua usando os campos soltos, que
            // são a única fonte que ele tem.
            let agilidadeAlvoNpc, constituicaoAlvoNpc;
            if (npc.modoDetalhado && npc.atributosPrimarios) {
                const modsNpcAlvo = coletarModificadores({ vantagens: npc.vantagens });
                const secundariosNpcAlvo = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modsNpcAlvo);
                agilidadeAlvoNpc = secundariosNpcAlvo.secundarios.agilidade.valor;
                constituicaoAlvoNpc = calcularDificuldadeDefesaJogador(npc.atributosPrimarios, "constituicao", modsNpcAlvo, 0);
            } else {
                agilidadeAlvoNpc = Number(npc.agilidade) || 0;
                constituicaoAlvoNpc = Number(npc.constituicao) || 0;
            }
            constituicaoAlvo = constituicaoAlvoNpc;
            if (ehFogo) {
                const percepcaoAtacante = calcularDerivados(estado.fichaAtual.dados, modificadoresPlanosAtacante).secundarios.percepcao.total;
                dificuldade = calcularDificuldadeArmaFogo(armaConfig.dificuldadeAcerto, percepcaoAtacante);
            } else {
                const atributoDefesaChave = atributoDefesaPorPericia(nomePericia);
                const valorAtributo = atributoDefesaChave === "constituicao" ? constituicaoAlvoNpc : agilidadeAlvoNpc;
                const baseDif = baseDificuldadeAtaque(it.nome, nomePericia);
                dificuldade = baseDif + valorAtributo;
                // Arte marcial vs. Briga de Rua (manual pg. 22) — só NPC
                // "detalhado" tem perícias cadastradas (periciasNpc); NPC
                // "rápido" nunca aciona esse bônus.
                if (nomePericia === "Briga de Rua" && alvoTemArteMarcialTreinada(npc.periciasNpc)) {
                    dificuldade += 2;
                    notasSituacionaisLista.push(`${nomeAlvo} tem uma arte marcial — Briga de Rua contra arte marcial tem dificuldade +2`);
                }
                // Carga química em Spray (Parte 9) — mesma regra da ficha
                // acima: -3 na dificuldade de defesa do NPC alvo.
                if (it.quimico && it.quimico.tipoEntrega === "spray") {
                    dificuldade -= 3;
                    notasSituacionaisLista.push(`Carga em spray de ${it.nome}: -3 na dificuldade de defesa de ${nomeAlvo}`);
                }
            }
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    // Golpes Mirados: agravante de dificuldade do local escolhido soma
    // em cima da dificuldade normal (de acerto da arma de fogo, ou de
    // defesa do alvo pra corpo a corpo/desarmado).
    dificuldade += difMiraAtual;

    // Modificadores Situacionais Rápidos de Combate à Distância:
    // Combatentes adicionais indesejados na linha de tiro aumentam a
    // dificuldade em 1 por combatente (mais gente no meio = mais difícil
    // acertar só quem se quer). "Escuro"/mira às cegas NÃO mexe mais
    // aqui — virou penalidade direta no ataque (modEscuroAtaque, ver
    // acima, somado em modAtaque) porque é uma dificuldade de QUEM
    // ATIRA enxergar o alvo, não do alvo ser mais fácil de acertar;
    // antes reduzia a dificuldade por engano, o que tinha o efeito
    // contrário do pretendido (favorecia o atacante em vez de
    // penalizar).
    dificuldade += difCombatentes;

    // CQC nível 3: faca/adaga golpeia com dificuldade -1.
    if (bonusCQCFaca) dificuldade += bonusCQCFaca.difAjuste;

    // Derrubar (manual): alvo derrubado tem a dificuldade pra ser
    // acertado diminuída em -3 até se levantar (gastando 1 ação — ver
    // "Levantar" no Gerenciador de Combate).
    const statusDerrubadoAlvo = participante.derrubado;
    if (statusDerrubadoAlvo && statusDerrubadoAlvo.ativo) {
        dificuldade -= 3;
        notasSituacionaisLista.push(`${nomeAlvo} está DERRUBADO (-3 na dificuldade)`);
    }

    const notaSituacional = notasSituacionaisLista.length ? ` Situacional: ${notasSituacionaisLista.join("; ")}.` : "";

    const acertou = resultadoAtaque >= dificuldade;

    // Karatê Cobra Kai nível 5 (manual): "todos os ataques desarmados
    // são críticos" — não depende do resultado final ser 20 (ver
    // cobraKaiCriticoElegivel acima), só de ter acertado. Aplicado
    // aqui, ANTES da mensagem de erro/acerto e de qualquer uso de
    // criticoPositivo mais abaixo (dobra de dano, nota no Log, badge de
    // crítico no toast e na tela de Esquiva/Bloqueio/Aparar pendente).
    if (acertou && cobraKaiCriticoElegivel && !criticoPositivo) {
        criticoPositivo = true;
        detalheRolagem = formatarDetalheRolagemAtaque({ brutoAtaque, periciaBase, penalidadeSaude, modRecuo, modPrecisao, resultadoAtaque, modificadorExtra, modMovimento: modMovimentoAtaque, modCQC: modCQC1x1, modEscuro: modEscuroAtaque, criticoPositivo, criticoNegativo });
    }

    // A rolagem do ataque já aconteceu e vai ser registrada de qualquer
    // forma (acerto ou erro) — só o gasto da ação do turno entra na fila
    // do Sistema de Aprovação (jogador) ou é consumido na hora (Mestre
    // agindo por um NPC), igual em qualquer outra rolagem. Em QUALQUER
    // dos dois casos, uma vez que a ação é efetivamente gasta (consumida
    // na hora, ou validada depois pelo Mestre — ver confirmarAcaoPendente
    // em mestre.js), o Recuo dessa arma+personagem é resetado: o próximo
    // disparo começa uma nova sequência de disparos (nova ação), sem a
    // penalidade acumulada da ação anterior.
    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: {
                participanteId: participanteIdParaGastarAcao,
                extraCQC: consumo.extraCQC,
                ehArmaFogo: ehFogo,
                idDisparo: idDisparoAtual,
                itemIdDisparo: chaveDisparoAtual
            }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!acertou) {
        const notaFalhaCritica = criticoNegativo ? " 🔥 FALHA CRÍTICA — Fogo Amigo/Desastre! Resolução rápida pelo Mestre." : "";
        const detalhe = `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaFalhaCritica}\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador: modAtaque, resultado: resultadoAtaque, detalhe, critico: criticoNegativo ? "falha" : null });
        toast(detalhe, criticoNegativo ? "critico-falha" : "erro");
        return;
    }

    // Resolve dano primeiro. Golpe desarmado usa 1dForça + Força [escala]
    // (manual pg. 49-50); arma cadastrada usa dano base + bônus de escala
    // corpo a corpo (armas de fogo não têm escala, só dano base).
    let danoTotal, tipoDanoKey, danoDadoTexto = "";
    if (armaConfig.desarmado) {
        const forcaAtacante = Number(estado.fichaAtual.dados.forca) || 0;
        const danoCalc = calcularDanoDesarmado(forcaAtacante, armaConfig.escalaMult, {
            dadoMultiplicador: armaConfig.dadoMultiplicador,
            danoMaximoSemRolar: armaConfig.danoMaximoSemRolar
        });
        danoTotal = danoCalc.total;
        tipoDanoKey = "contusao";
        danoDadoTexto = danoCalc.dadoMultiplicador > 1
            ? ` [1d${danoCalc.faces}×${danoCalc.dadoMultiplicador}: ${danoCalc.dado}×${danoCalc.dadoMultiplicador}=${danoCalc.dadoTotal} + Força ${danoCalc.bonusEscala}]`
            : ` [1d${danoCalc.faces}: ${danoCalc.dado} + Força ${danoCalc.bonusEscala}]`;
    } else {
        let bonusEscala = 0;
        if (armaConfig.escala) {
            const escalaInfo = ESCALAS_ARMA.find(e => e.key === armaConfig.escala);
            const periciaInfo = buscarPericiaPorNome(nomePericia);
            const valorAtributo = periciaInfo ? (Number(estado.fichaAtual.dados[periciaInfo.atributo]) || 0) : 0;
            bonusEscala = calcularDanoTotalArma({ danoBase: 0, escalaMult: escalaInfo?.mult }, valorAtributo);
        }
        danoTotal = (Number(armaConfig.danoBase) || 0) + bonusEscala;
        // Dano extra (arma branca — ver montarReducaoDanoChecklist... não,
        // ver campo "Tipo de dano extra" no modal de item): quando o item
        // tem um segundo tipo de dano cadastrado, o jogador escolhe na
        // hora do ataque (select "Tipo de dano" na modal de alvo, ver
        // abrirModalSelecionarAlvo) qual dos dois usar nesse golpe — o
        // valor do dano continua o mesmo, só muda o TIPO (afeta redução
        // de armadura e regras específicas por tipo, ex.: Amputação em
        // corte, Sangramento em perfurante).
        tipoDanoKey = (opcoes.tipoDanoEscolhido === "extra" && armaConfig.tipoDanoExtra)
            ? armaConfig.tipoDanoExtra
            : armaConfig.tipoDano;
    }
    const tipoDanoLabel = TIPOS_DANO.find(t => t.key === tipoDanoKey)?.label || tipoDanoKey || "—";

    // Golpes Mirados (manual): Cabeça a tiro de arma de fogo aumenta o
    // dano em 1/3 — aplicado sobre o dano "base" do golpe, ANTES do
    // Acerto Crítico (que dobra o valor já com esse bônus embutido).
    if (bonusDanoMiraAtual > 0) {
        const bonusMira = Math.floor(danoTotal * bonusDanoMiraAtual);
        danoTotal += bonusMira;
        danoDadoTexto += ` [+${bonusMira} por mirar ${localMira.label}]`;
    }

    // CQC nível 3: golpe com faca/adaga ganha +Destreza [escala D] de
    // dano extra, em cima do dano base da arma.
    if (bonusCQCFaca) {
        const destrezaAtacante = Number(estado.fichaAtual.dados.destreza) || 0;
        const bonusCQCDano = calcularDanoTotalArma({ danoBase: 0, escalaMult: bonusCQCFaca.escalaMultDano }, destrezaAtacante);
        danoTotal += bonusCQCDano;
        danoDadoTexto += ` [+${bonusCQCDano} CQC nível ${nivelCQC} — faca/adaga]`;
    }

    // Modificador Situacional: tiro à queima-roupa contra alvo
    // dominado/agarrado quadruplica o dano do disparo (efeito bruto,
    // aplicado sobre o dano já com bônus de mira embutido, ANTES do
    // Acerto Crítico — se também for crítico, dobra em cima do valor já
    // quadruplicado).
    if (queimaRoupaAgarrado) {
        danoTotal *= 4;
        danoDadoTexto += ` [×4 queima-roupa em alvo dominado/agarrado]`;
    }

    // Alvo genérico "dano" (Vantagem/Item/Especialização — ver
    // listaAlvosModificador em regras.js): bônus/penalidade fixa
    // somada em CIMA de qualquer dano já calculado (desarmado, arma,
    // mira, CQC), ANTES do Acerto Crítico dobrar — igual qualquer
    // outro bônus de dano deste pipeline.
    const bonusDanoGenerico = somaModificadoresPara("dano", modificadoresPlanosAtacante);
    if (bonusDanoGenerico) {
        danoTotal += bonusDanoGenerico;
        danoDadoTexto += ` [${bonusDanoGenerico > 0 ? "+" : ""}${bonusDanoGenerico} dano (Vantagem/Item)]`;
    }

    // Acerto Crítico (manual): dobra o dano do ataque. Aplicado ANTES
    // das reduções de Agarrado/alcance limitado (que também mexem em
    // danoTotal logo abaixo) e ANTES da redução de armadura do alvo
    // (que fica a cargo de aplicarDano) — assim o crítico dobra o dano
    // "bruto" do ataque, e o resto do pipeline de reduções continua
    // valendo normalmente em cima do valor já dobrado.
    let notaCritico = "";
    if (criticoPositivo) {
        danoTotal *= 2;
        notaCritico = cobraKaiCriticoElegivel
            ? " ⚡ ACERTO CRÍTICO (Karatê Cobra Kai nível 5 — todo golpe desarmado acertado é crítico) — dano dobrado!"
            : " ⚡ ACERTO CRÍTICO — dano dobrado!";
    }
    // Falha Crítica (nat 1) que, apesar de tudo, ainda bateu a
    // dificuldade (modificador alto o bastante) — caso raro, mas o
    // manual não isenta o nat 1 de ser sinalizado só porque acertou;
    // fica só como aviso pro Mestre, sem nenhum efeito mecânico aqui
    // (a Falha Crítica não afeta dano/acerto, só pede resolução manual).
    if (criticoNegativo) {
        const motivo = brutoAtaque === 1 ? "d20 natural 1" : `resultado final ${resultadoAtaque}`;
        notaCritico += ` 🔥 (${motivo} — Falha Crítica sinalizada mesmo tendo acertado; resolução a critério do Mestre.)`;
    }

    // Agarrar (manual): dano causado PELA vítima do agarrão é reduzido
    // pela metade enquanto durar — golpes de alcance curto ainda são
    // permitidos (checagem lá em cima), só saem mais fracos. Delimitar
    // alcance: golpe Médio "forçado" pra dentro de outro alcance também
    // sai pela metade (mesma checagem). As duas reduções empilham se as
    // duas condições valerem ao mesmo tempo.
    let notaAgarrado = "";
    if (statusAgarrado && statusAgarrado.ativo) {
        danoTotal = Math.floor(danoTotal / 2);
        notaAgarrado += ` (dano reduzido pela metade — AGARRADO por ${statusAgarrado.porNome})`;
    }
    if (verifAlcance.meioDano) {
        danoTotal = Math.floor(danoTotal / 2);
        notaAgarrado += ` (dano reduzido pela metade — alcance Médio usado "de perto" com alcance limitado a ${statusAlcance.valor})`;
    }

    // Esquiva/Bloqueio (manual: só disponível depois que o alvo já teve
    // seu próprio turno na rodada). É UMA ação só, mas quem decide qual
    // manobra fazer com ela é o ALVO (na tela dele, ou o Mestre, se o
    // alvo for NPC) — não quem ataca. Por isso, em vez de resolver o
    // dano na hora, grava uma "reação pendente" no combate ativo (visível
    // em tempo real pra todo mundo) com tudo que falta pra fechar o
    // golpe, e devolve o controle: quem responde é quem recebeu o golpe,
    // via responderReacaoPendente() — ver mestre.js.
    // Disparo de arma de fogo NUNCA passa por aqui (manual: não dá pra
    // esquivar, aparar NEM bloquear tiro — só golpes corpo a corpo/arma
    // branca têm essa reação). Um tiro que acerta sempre vai direto pro
    // caminho de dano logo abaixo.
    if (!ehFogo && combateComIniciativaAtivo() && Number(participante.esquivasDisponiveis) > 0) {
        const atacanteTipo = estado.modoNpc ? "npc" : "ficha";
        const atacanteRefId = estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId;
        const atacantePid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
        await abrirReacaoPendente({
            participanteId: participante._pid,
            nomeAtacante, nomeAlvo, nomeArma: it.nome,
            danoTotal, tipoDanoKey, tipoDanoLabel, danoDadoTexto,
            criticoPositivo, notaCritico,
            // Dilaceração (item 7 do plano de saúde/complicações) — ver
            // golpeDilacera em regras.js, aplicado em
            // resolverReacaoPendente (mestre.js).
            dilacera: !!armaConfig.dilacera,
            dilaceraEmGolpeNormal: !!armaConfig.dilaceraEmGolpeNormal,
            alvoTipo: participante.tipo, alvoRefId: participante.refId,
            resultadoAtaque, dificuldade, modAtaque,
            // Sempre false neste ponto (golpe de arma de fogo já retornou
            // mais acima) — mantido só por compatibilidade com o que a
            // tela de reação em mestre.js/ficha.js ainda espera receber.
            ehArmaFogo: false,
            // Golpes Mirados (manual): local escolhido, só pra exibir a
            // nota no Log final, e os dados que responderReacaoPendente
            // (mestre.js) precisa pra aplicar a redução de armadura por
            // local e testar Sangramento de golpes perfurantes que
            // atravessaram a reação (esquiva/bloqueio/aparar não anulam
            // o golpe sempre — ver LOCAIS_MIRA em dados-manual.js).
            notaLocalMira,
            localMiraKey: localMira.key,
            localMiraLabel: localMira.label,
            localArmaduraAtual: localMira.localArmadura,
            regraSangramentoLocal: localMira.sangramento,
            constituicaoAlvo,
            nivelArma: it.nivelTag ?? 0,
            // Força Bruta (manual pg. 22): repassa pra responderReacaoPendente
            // (mestre.js) decidir a redução de armadura e o comportamento
            // de Bloquear, e pro botão "Esquivar" aqui em ficha.js aplicar
            // a penalidade no teste de quem está se defendendo.
            ignorarArmaduraPontos,
            penalidadeEsquivaForcaBruta,
            bloqueioForcaBruta,
            // Manual do Aparar: "não é possível aparar ataques de arma
            // branca estando desarmado" — a tela de reação usa isso pra
            // só oferecer perícias de arma branca (não as desarmadas)
            // quando o golpe recebido também veio de uma perícia de
            // arma branca.
            ataqueArmaBranca: PERICIAS_ARMA_BRANCA.includes(nomePericia),
            // Identidade de quem atacou — só usada se o Aparar for bem
            // sucedido, pra saber em quem mirar o contra-ataque imediato
            // (ver definirContraAtaquePendente em mestre.js).
            atacanteTipo, atacanteRefId, atacantePid,
            detalheRolagem, efeitoTexto:
                (armaConfig.efeitoExtra && armaConfig.efeitoExtra.trim()) ? ` Efeito extra: ${armaConfig.efeitoExtra.trim()}.` : "",
            // Carga química (dardo/lâmina envenenada — Parte 6.2 do plano
            // de automação dos materiais químicos): viaja junto na reação
            // pendente pra, se o golpe atravessar (não foi Esquivado/
            // Aparado com sucesso), disparar it.quimico.efeitos no alvo —
            // ver responder() em ficha.js, que lê isso de volta de
            // estado.combateAtivoCache.reacaoPendente depois que
            // responderReacaoPendente (mestre.js) resolver.
            quimicoEfeitos: (it.quimico && Array.isArray(it.quimico.efeitos) && it.quimico.efeitos.length) ? it.quimico.efeitos : null,
            quimicoNomeItem: it.nome
        });
        const detalheAguardando = `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaCritico} Aguardando ${nomeAlvo} decidir entre Esquivar/Bloquear/Aparar/Levar o golpe.${notaAgarrado}\n${detalheRolagem}`;
        toast(detalheAguardando, criticoPositivo ? "critico-acerto" : "ok");
        return;
    }

    let resultadoDano;
    // Local detalhado (plano-silhueta-saude.txt, Fase 1/Fase 6; golpes
    // mirados por lado depois disso): resolvido ANTES de aplicarDano
    // (não depende do resultado dele) pra poder ser repassado como 8º
    // parâmetro — se este golpe bater o limiar de Amputação (regras.js,
    // dentro de aplicarDano), o Mestre confirma contra ESSE local
    // específico, não um genérico. Reaproveitado embaixo pra toda
    // ferida criada por este mesmo golpe (Sangramento + Corte
    // vinculados, "chance de ferida por dano" etc.) — sortearLocalDetalhado
    // só sorteia de fato no caso de compatibilidade com chave antiga
    // genérica; pra qualquer local específico (o normal agora) ele só
    // devolve a própria chave.
    // Declarada FORA do try (com `let`, não `const`) porque é usada bem
    // depois dele — no teste de Sangramento e na criação de ferida, logo
    // abaixo. Antes estava presa ao escopo do bloco try{} e sumia assim
    // que ele fechava, gerando "ReferenceError: localFerida is not
    // defined" pra todo ataque que não passa pela reação de Esquiva/
    // Bloqueio (isto é, todo tiro de arma de fogo, sempre) — o erro
    // interrompia a função ali mesmo, antes do registrarRolagem no final,
    // por isso o tiro não aparecia no Log nem gerava ferida.
    let localFerida;
    try {
        // Golpes Mirados: a redução de armadura do alvo só conta itens
        // de Proteção cujo localProtegido bate com o local mirado (ver
        // LOCAIS_MIRA em dados-manual.js e aplicarDano em mestre.js).
        // Redução do Dano por Colete x Calibre (manual pg. 53): só faz
        // sentido pra tiro de arma de fogo (it.calibre só existe pra
        // arma de fogo — arma branca/contundente manda null, e
        // aplicarDano já ignora a regra nova quando calibreProjetil é
        // null).
        localFerida = localMira.key === "padrao" ? "torso" : sortearLocalDetalhado(localMira.key);
        resultadoDano = await aplicarDano(participante.tipo, participante.refId, danoTotal, tipoDanoKey, localMira.localArmadura, ignorarArmaduraPontos, it.calibre || null, localFerida);
    } catch (err) {
        console.error(err);
        toast("Ataque acertou, mas falhou ao aplicar o dano no alvo.", "erro");
        return;
    }

    // Golpes Mirados (manual pg. 51): Golpe Perfurante testa Sangramento,
    // Golpe Cortante aplica obrigatoriamente a regra de Amputação, e
    // Golpe Contundente na Cabeça agrava o teste de Desmaio.
    // Corpo a corpo/arma branca: só quando o golpe teve um local mirado
    // de verdade ("Padrão" é "sem efeitos extras", manual) — nenhuma
    // outra circunstância de corpo a corpo sangra. Arma de fogo (manual
    // pg. 57): "todo projétil" pode causar sangramento — TODO tiro que
    // causou dano testa, mirado ou não, cai na mesma regra do Torso
    // (mesmo localArmadura do golpe "Padrão") quando não há um local
    // mirado escolhido, e usa a fórmula própria da pág. 57 (1d[metade
    // do dano], sempre 3 turnos — ver ehProjetil em
    // testarSangramento/mestre.js), diferente da fração fixa por local
    // usada em corpo a corpo. O teste de Sangramento só faz
    // sentido dentro do Gerenciador de Combate com iniciativa (é lá que
    // existe a noção de "turno" pra decrementar — ver
    // processarStatusInicioTurno em mestre.js) — o ferimento só sangra
    // de fato se o teste de Constituição falhar (ver testarSangramento
    // em mestre.js, que já decide isso e só chama aplicarSangramento
    // internamente quando o teste falha).
    let notaSangramento = "";
    let notaEfeitoLocal = "";
    // Feridas persistentes (ver plano-sistema-saude-ferimentos.txt) — só
    // pra fichas de JOGADOR nesta fase (NPC fica de fora por enquanto).
    // Local salvo na ferida (plano-silhueta-saude.txt, Fase 1; golpes
    // mirados por lado depois disso): "padrao" convertido pra "torso"
    // (mesma convenção já usada pro Sangramento de tiro sem mira, logo
    // abaixo); qualquer outra chave já é o local específico escolhido
    // pelo jogador (braço/perna/mão/pé E ou D) — calculado ANTES de
    // aplicarDano (ver comentário lá em cima, Fase 6), reaproveitado aqui via a
    // mesma variável `localFerida`, sem sortear de novo.
    const criaFeridaHabilitado = danoTotal > 0 && participante.tipo === "ficha";
    // Fase C (plano mestre-tratar-feridas-sangramento): true assim que
    // o sangramento (comum OU profundo, mais abaixo) já garantiu uma
    // ferida de Corte/Perfuração neste golpe — impede o bloco de
    // "chance de ferida por dano" de abrir uma segunda em cima do
    // mesmo golpe.
    let feridaCorteJaGarantida = false;
    if (danoTotal > 0 && (ehFogo || ehDanoPerfurante(tipoDanoKey)) && participante._pid && combateComIniciativaAtivo()) {
        const regraSangramentoAplicavel = ehFogo
            ? (localMira.sangramento || localMiraPorKey("torso").sangramento)
            : (ehDanoPerfurante(tipoDanoKey) && localMira.key !== "padrao" ? localMira.sangramento : null);
        if (regraSangramentoAplicavel) {
            const resultadoSangramento = await testarSangramento(participante._pid, constituicaoAlvo, it.nivelTag, danoTotal, regraSangramentoAplicavel, ehFogo);
            if (resultadoSangramento) notaSangramento = ` ${resultadoSangramento.detalhe}`;
            // Sangrou -> ferida "sangramento" + ferida "corte" garantida
            // (Fase C, via registrarFeridasDeSangramento). Não sangrou E
            // foi tiro -> bala fica alojada (ferida "projetil" —
            // precisa de Remover Projétil antes de poder suturar). Não
            // sangrou e foi corpo a corpo -> resistiu, sem ferida
            // nenhuma.
            if (resultadoSangramento) {
                if (await registrarFeridasDeSangramento(criaFeridaHabilitado, participante._pid, participante.refId, localFerida, `${it.nome} (${nomeAtacante})`, resultadoSangramento)) {
                    feridaCorteJaGarantida = true;
                } else if (criaFeridaHabilitado && ehFogo && !resultadoSangramento.sangramento) {
                    await criarFerida(participante.refId, { tipo: "projetil", local: localFerida, origem: `${it.nome} (${nomeAtacante})` });
                }
            }
        }
    }
    if (danoTotal > 0 && localMira.key !== "padrao") {
        if (ehDanoCortante(tipoDanoKey)) {
            notaEfeitoLocal += ` ⚠️ Golpe cortante mirado em ${localMira.label}: aplica-se a regra de Amputação (resolva com o Mestre).`;
        }
        if (ehDanoContundente(tipoDanoKey) && localMira.key === "cabeca") {
            notaEfeitoLocal += ` ⚠️ Golpe contundente na Cabeça: +4 na dificuldade do teste de Desmaio do alvo — teste de Constituição, dificuldade ${dificuldadeDesmaio(4)} (base ${DIFICULDADE_BASE_DESMAIO} +4 da Cabeça), pra acordar (resolva com o Mestre).`;
        }
    }

    // Dilaceração (item 7 do plano de saúde/complicações) — ver
    // golpeDilacera/deveTestarSangramentoProfundo em regras.js. Roda em
    // cima do dano JÁ aplicado (danoTotal), independente de Golpe
    // Mirado. Sangramento Profundo só entra dentro de combate com
    // iniciativa (é lá que existe "turno" pra decrementar), igual ao
    // Sangramento comum.
    let notaDilaceracao = "";
    if (danoTotal > 0) {
        const dilacerou = golpeDilacera({
            ehExplosao: tipoDanoKey === "explosao",
            danoFinal: danoTotal,
            pvMaximo: resultadoDano.pvMaximo,
            dilacera: !!armaConfig.dilacera,
            dilaceraEmGolpeNormal: !!armaConfig.dilaceraEmGolpeNormal,
            criticoPositivo,
            ehArmaBranca: PERICIAS_ARMA_BRANCA.includes(nomePericia)
        });
        if (dilacerou) {
            notaDilaceracao = " 🩸 DILACEROU!";
            if (participante._pid && combateComIniciativaAtivo() && deveTestarSangramentoProfundo(dilacerou, danoTotal, resultadoDano.pvMaximo)) {
                const resultadoSangramentoProfundo = await testarSangramentoProfundo(participante._pid, constituicaoAlvo, danoTotal);
                if (resultadoSangramentoProfundo) notaDilaceracao += ` ${resultadoSangramentoProfundo.detalhe}`;
                // Fase C.3: Sangramento Profundo/Dilaceração antes não
                // criava ferida nenhuma — agora garante sangramento +
                // corte igual ao Sangramento comum acima, com o mesmo
                // vínculo pra sumir sozinho quando o status expirar
                // (Fase D).
                if (await registrarFeridasDeSangramento(criaFeridaHabilitado, participante._pid, participante.refId, localFerida, `Dilaceração — ${it.nome} (${nomeAtacante})`, resultadoSangramentoProfundo)) {
                    feridaCorteJaGarantida = true;
                }
            }
        }
    }

    // Ferida por dano acima de 1/10 do PV MÁXIMO — regra nova, roda em
    // TODO golpe que causou dano de verdade numa ficha de jogador,
    // mirado ou não (o bloco de Golpe Mirado acima continua exclusivo
    // de golpe mirado, por regra própria do manual). Corte e Perfuração
    // abrem ferida tipo "corte"; Contusão abre ferida tipo "fratura".
    // Chance base de 20% assim que o dano ultrapassa 1/10 do PV máximo
    // do alvo; a cada 1/10 ADICIONAL de dano além desse mínimo, +20% de
    // chance (limite 100%) — ver chanceFeridaPorDano em regras.js. Fase
    // C.2: quando o sangramento deste mesmo golpe já garantiu uma
    // ferida de Corte/Perfuração (feridaCorteJaGarantida), esse bloco
    // NEM rola a chance pro tipo "corte" — só se aplica de novo se
    // fosse "fratura".
    if (criaFeridaHabilitado && (ehFogo || ehDanoPerfurante(tipoDanoKey) || ehDanoCortante(tipoDanoKey) || ehDanoContundente(tipoDanoKey))) {
        const tipoFerida = ehDanoContundente(tipoDanoKey) ? "fratura" : "corte";
        if (tipoFerida === "corte" && feridaCorteJaGarantida) {
            notaEfeitoLocal += ` 🩹 O sangramento deste golpe já garantiu uma ferida de Corte/Perfuração — sem chance adicional.`;
        } else {
            const chance = chanceFeridaPorDano(danoTotal, resultadoDano.pvMaximo);
            if (chance > 0) {
                const rotuloFerida = tipoFerida === "fratura" ? "Fratura" : "Corte/Perfuração";
                const sucessoFerida = (Math.random() * 100) < chance;
                notaEfeitoLocal += sucessoFerida
                    ? ` 🩹 Chance de ferida por dano (${chance}%): ABRIU uma ferida de ${rotuloFerida}.`
                    : ` 🩹 Chance de ferida por dano (${chance}%): não abriu ferida dessa vez.`;
                if (sucessoFerida) {
                    await criarFerida(participante.refId, { tipo: tipoFerida, local: localFerida, origem: `${it.nome} (${nomeAtacante})` });
                }
            }
        }
    }

    // Carga química (dardo/lâmina envenenada — Parte 6.2 do plano de
    // automação dos materiais químicos): golpe atravessou sem passar
    // pela reação pendente (arma de fogo, sem Esquiva/Bloqueio
    // disponível, ou fora de combate com iniciativa) — dispara
    // it.quimico.efeitos DIRETO no alvo que acabou de ser acertado,
    // reaproveitando o mesmo despachante que consumirDroga/área já usam
    // (mesma resolução alvoTipo/alvoId de participante.tipo/refId).
    let notaQuimico = "";
    const efeitosQuimicosArma = (it.quimico && Array.isArray(it.quimico.efeitos)) ? it.quimico.efeitos : [];
    if (efeitosQuimicosArma.length) {
        const resultadoQuimicoArma = await despacharEfeitosQuimicos(participante.tipo, participante.refId, efeitosQuimicosArma, it.nome);
        notaQuimico = ` ☣️ Carga química de ${it.nome}: ${resultadoQuimicoArma.notas.join(" | ")}`;
        if (resultadoQuimicoArma.modificadoresExtras.length) {
            notaQuimico += " (penalidade de duração geral prevista — sem lista de efeitos ativos pra registrar automaticamente num alvo que não é quem atacou; aplique manualmente.)";
        }
    }

    // Tiro de arma de fogo não pode ser esquivado, aparado NEM bloqueado
    // (manual) — por isso o golpe que acerta vai sempre direto pro dano
    // cheio, sem reação nenhuma do alvo. "🔫 X foi baleado!" deixa isso
    // bem claro no Log/tela pra quem está acompanhando o combate.
    const notaBaleado = ehFogo ? ` 🔫 ${nomeAlvo} foi baleado!` : "";
    // Desvantagem Frágil (manual pg. 18): já aplicada dentro de
    // aplicarDano (mestre.js) sobre o dano bruto, antes da redução de
    // armadura — aqui só sinaliza no Log que o multiplicador entrou.
    const notaFragil = resultadoDano.fragil ? ` 🩹 ${nomeAlvo} é FRÁGIL — dano recebido dobrado!` : "";
    // Recuperação de PV em andamento (manual, "Saúde e PVs"): já
    // aplicada dentro de aplicarDano (mestre.js) sobre o dano bruto,
    // mesmo ponto que Frágil — aqui só sinaliza no Log.
    const notaRecuperacao = resultadoDano.emRecuperacao ? ` ⏳ ${nomeAlvo} está em recuperação de PV — dano recebido aumentado em 50%!` : "";

    const efeitoTexto = (armaConfig.efeitoExtra && armaConfig.efeitoExtra.trim()) ? ` Efeito extra: ${armaConfig.efeitoExtra.trim()}.` : "";
    // Redução do Dano por Colete x Calibre (manual pg. 53): quando o
    // piso de dano mínimo contundente vence a redução normal do
    // colete, aplicarDano (mestre.js) já embutiu isso no danoFinal e
    // devolveu tipoDanoFinalAjustado diferente do tipoDanoKey original
    // — aqui só avisa no Log qual foi o tipo de dano que realmente
    // valeu.
    const notaColete = (resultadoDano.tipoDanoFinalAjustado && resultadoDano.tipoDanoFinalAjustado !== tipoDanoKey)
        ? ` 🦺 O colete freou o tiro, mas o impacto ainda causou dano CONTUNDENTE (${TIPOS_DANO.find(t => t.key === resultadoDano.tipoDanoFinalAjustado)?.label || resultadoDano.tipoDanoFinalAjustado}), ignorando o resto da redução.`
        : "";
    const detalheDano = resultadoDano.reducao > 0
        ? `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaBaleado} Dano${danoDadoTexto}: ${resultadoDano.danoBruto} (${tipoDanoLabel}) - ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} de dano aplicado.${notaCritico}${notaFragil}${notaRecuperacao}${notaAgarrado} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaColete}${notaSangramento}${notaDilaceracao}${notaEfeitoLocal}${notaQuimico}\n${detalheRolagem}`
        : `${nomeAtacante} atacou ${nomeAlvo} com ${it.nome}. ACERTO! vs. dificuldade ${dificuldade}.${notaLocalMira}${notaSituacional}${notaBaleado} Dano${danoDadoTexto}: ${resultadoDano.danoFinal} (${tipoDanoLabel}) aplicado.${notaCritico}${notaFragil}${notaRecuperacao}${notaAgarrado} PV restante: ${resultadoDano.novoPv}.${efeitoTexto}${notaColete}${notaSangramento}${notaDilaceracao}${notaEfeitoLocal}${notaQuimico}\n${detalheRolagem}`;

    await registrarRolagem({ quem: nomeAtacante, modificador: modAtaque, resultado: resultadoDano.danoFinal, detalhe: detalheDano, critico: criticoPositivo ? "acerto" : null });
    toast(detalheDano, criticoPositivo ? "critico-acerto" : "ok");
}

export function configurarDarItem() {
    el.darItemCancelar.addEventListener("click", () => {
        el.modalDarItem.classList.remove("active");
        contextoDarItem.atual = null;
    });
    el.modalDarItem.addEventListener("click", (e) => {
        if (e.target === el.modalDarItem) {
            el.modalDarItem.classList.remove("active");
            contextoDarItem.atual = null;
        }
    });
    el.darItemConfirmar.addEventListener("click", async () => {
        if (!contextoDarItem.atual || !estado.fichaAtualId) return;
        const fichaDestinoId = el.darItemSelect.value;
        if (!fichaDestinoId) { toast("Escolha pra quem dar o item.", "erro"); return; }
        const { itemId, item } = contextoDarItem.atual;
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        const nomeDestino = (estado.todasAsFichasCache[fichaDestinoId] && estado.todasAsFichasCache[fichaDestinoId].config && estado.todasAsFichasCache[fichaDestinoId].config.nomeExibicao) || fichaDestinoId;
        await criarAcaoPendente({
            tipo: "dar_item",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer dar "${item.nome}" para ${nomeDestino}.`,
            payload: { itemId, itemNome: item.nome, fichaDestinoId, fichaDestinoNome: nomeDestino }
        });
        toast("Pedido de transferência enviado ao Mestre.");
        el.modalDarItem.classList.remove("active");
        contextoDarItem.atual = null;
    });
}

export function atualizarCamposPorTag(tagKey, nivelTag, armaConfig, periciaUsoAtual, classeProtecaoAtual, calibreAtual, reducoesDanoAtuais, carregadorConfigAtual, projetilConfigAtual, localProtegidoAtual, materialConfigAtual, ehSaldoAtual, saldoValorAtual, quantidadeAtual, recipienteConfigAtual, maosNecessariasAtual, saldoNotasAtual, saldoMoedasAtual, quimicoConfigAtual, limitarRolagemAtual, implanteConfigAtual, efeitosMedicosAtual) {
    // Equipável — checkbox independente da tag (qualquer item pode ser
    // marcado como equipável, não só armas). Some pra tag "Arma" e
    // "Explosivo": as duas já são sempre equipáveis por natureza (ver
    // ehArmaOuExplosivo em itemEhEquipavel, inventario.js), então o
    // checkbox ali seria redundante/confuso. Some também sem tag
    // nenhuma escolhida ainda.
    const podeMarcarEquipavel = !!tagKey && tagKey !== "arma" && tagKey !== "explosivo";
    el.modalCampoEquipavel.style.display = podeMarcarEquipavel ? "flex" : "none";
    if (!podeMarcarEquipavel) el.modalEquipavel.checked = false;

    // Mãos necessárias (ver item.maosNecessarias, seção 2.2 do
    // projeto-slots-porte.txt) — aparece pra qualquer item que possa vir
    // a ser segurado/equipado solto na mão: arma (sempre equipável),
    // qualquer outro item com o checkbox "equipável" disponível acima, ou
    // recipiente (a mochila em si não ocupa mão, mas "bolsa_mao" consome
    // — o campo fica aqui, genérico, e quem decide se conta ou não é
    // maosDisponiveis/itemPodeSerLevadoSolto em inventario.js). Some só
    // sem tag nenhuma escolhida ainda.
    const podeTerMaosNecessarias = tagKey === "arma" || tagKey === "explosivo" || podeMarcarEquipavel;
    el.modalCampoMaosNecessarias.style.display = podeTerMaosNecessarias ? "flex" : "none";
    if (podeTerMaosNecessarias) {
        const valor = Number(maosNecessariasAtual) === 2 ? "2" : "1";
        el.modalMaosNecessarias.value = valor;
    }

    const temNivel = tagTemNivel(tagKey);
    el.modalCampoNivelTag.style.display = temNivel ? "flex" : "none";
    if (temNivel) el.modalNivelTag.value = nivelTag || 1;

    // Checkbox "Limitar rolagem" — só pra tags do manual onde o nível do
    // item de fato limita a rolagem da perícia (ver
    // tagPermiteLimiteRolagemPorNivel em dados-manual.js).
    const permiteLimiteRolagem = temNivel && tagPermiteLimiteRolagemPorNivel(tagKey);
    el.modalCampoLimitarRolagem.style.display = permiteLimiteRolagem ? "flex" : "none";
    if (permiteLimiteRolagem) el.modalLimitarRolagem.checked = !!limitarRolagemAtual;
    else el.modalLimitarRolagem.checked = false;

    // Carregador — capacidade máxima é definida na criação do item.
    const exigeCapacidade = tagExigeCapacidadeCarregador(tagKey);
    el.modalCampoCarregadorCapacidade.style.display = exigeCapacidade ? "flex" : "none";
    if (exigeCapacidade) el.modalCarregadorCapacidade.value = (carregadorConfigAtual && carregadorConfigAtual.capacidadeMax) || 10;

    // Recipiente (ex.: mochila) — tipo de porte + compartimentos (cada um
    // com sua própria capacidade em volume e maior tamanho aceito, ver
    // tamanhoCabe em dados-manual.js). Só aparecem pra tag "recipiente".
    const container = ehContainer(tagKey);
    el.modalCampoSubtipoPorte.style.display = container ? "flex" : "none";
    el.modalCampoCompartimentos.style.display = container ? "flex" : "none";
    if (container) {
        popularSelectSubtipoPorte(el.modalSubtipoPorte, recipienteConfigAtual && recipienteConfigAtual.subtipoPorte);
        // Item novo (ou container sem compartimentos ainda, ex: dado
        // legado que por algum motivo não passou pela migração) começa
        // com 1 linha em branco pra não deixar salvar sem nenhuma —
        // ver validação mínima em lerCompartimentosDoModal.
        const compartimentosAtuais = (recipienteConfigAtual && recipienteConfigAtual.compartimentos && recipienteConfigAtual.compartimentos.length)
            ? recipienteConfigAtual.compartimentos
            : [{ nome: "", capacidadeVolume: 0, tamanhoMaximoAceito: null }];
        montarListaCompartimentos(compartimentosAtuais);
    }

    // Projétil/munição — quantidade de rounds que ESTE item representa.
    // Editável direto no modal: assim dá pra ter um único item "9mm"
    // com 60 unidades, por exemplo, em vez de precisar criar/duplicar
    // vários itens do mesmo calibre só pra empilhar munição.
    const exigeQuantidadeProjetil = tagExigeQuantidadeProjetil(tagKey);
    el.modalCampoProjetilQuantidade.style.display = exigeQuantidadeProjetil ? "flex" : "none";
    if (exigeQuantidadeProjetil) {
        el.modalProjetilQuantidade.value = (projetilConfigAtual && projetilConfigAtual.quantidade) ?? 1;
        atualizarVolumeTotalProjetilModal();
    }

    // Material de criação — tipo (obrigatório, lista fechada do manual),
    // qualidade (se aquele tipo tiver variação) e quantidade em estoque
    // (unidades). É isso que abrirModalEscolherMateriais usa pra saber
    // exatamente quanto tem de cada material na hora de criar um item.
    const ehMaterial = tagKey === "material";
    el.modalCampoMaterialTipo.style.display = ehMaterial ? "flex" : "none";
    el.modalCampoMaterialQuantidade.style.display = ehMaterial ? "flex" : "none";
    if (ehMaterial) {
        el.modalMaterialTipo.innerHTML = "";
        MATERIAIS_CRIACAO.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.nome;
            opt.innerText = m.nome;
            el.modalMaterialTipo.appendChild(opt);
        });
        const tipoAtual = (materialConfigAtual && materialConfigAtual.tipo && MATERIAIS_CRIACAO.some(m => m.nome === materialConfigAtual.tipo))
            ? materialConfigAtual.tipo
            : MATERIAIS_CRIACAO[0].nome;
        el.modalMaterialTipo.value = tipoAtual;
        atualizarCampoQualidadeMaterial(tipoAtual, materialConfigAtual && materialConfigAtual.qualidade);
        el.modalMaterialQuantidade.value = (materialConfigAtual && materialConfigAtual.quantidade) ?? 1;
    }

    // Perícia vinculada — o campo aparece em armas, eletrônicos,
    // ferramentas de criação (química e biomecânica) e destraves (é ela
    // que o botão "Usar" do inventário rola), mas só é OBRIGATÓRIA em
    // armas, ferramentas de criação química/biomecânica e destraves.
    // Eletrônico fica de fora da obrigatoriedade: nem todo item
    // eletrônico serve pra Hackear (uma lanterna, um carregador...) —
    // por isso ganha a opção "Nenhuma", deixando o item sem o botão
    // "Usar" com rolagem automática (ver tagExigePericiaUso em
    // dados-manual.js).
    const mostraPericia = tagTemPericiaUso(tagKey);
    const exigePericia = tagExigePericiaUso(tagKey);
    const multiPericia = ehTagMultiPericia(tagKey);
    el.modalCampoPericiaUso.style.display = mostraPericia ? "flex" : "none";
    if (mostraPericia) {
        if (el.modalLabelPericiaUso) el.modalLabelPericiaUso.textContent = exigePericia ? "Perícia vinculada (obrigatória)" : "Perícia vinculada (opcional)";
        const opcoes = periciasVinculaveisPorTag(tagKey);
        el.modalPericiaUso.style.display = multiPericia ? "none" : "";
        el.modalPericiaUsoCheckboxes.style.display = multiPericia ? "flex" : "none";
        el.hintPericiaUsoMultipla.style.display = multiPericia ? "block" : "none";
        if (multiPericia) {
            // Eletrônico: um item pode servir pra mais de uma perícia ao
            // mesmo tempo (ex.: Hacking e Programação juntos) — por isso
            // vira checkbox em vez de select de escolha única (ver
            // ehTagMultiPericia em dados-manual.js).
            const marcadasAtuais = periciaUsoComoArray(periciaUsoAtual);
            el.modalPericiaUsoCheckboxes.innerHTML = "";
            opcoes.forEach(nome => {
                const id = `modal-pericia-uso-cb-${nome.replace(/\s+/g, "-")}`;
                const label = document.createElement("label");
                label.className = "checkbox-inline";
                label.style.display = "block";
                const input = document.createElement("input");
                input.type = "checkbox";
                input.id = id;
                input.value = nome;
                input.checked = marcadasAtuais.includes(nome);
                label.appendChild(input);
                label.appendChild(document.createTextNode(` ${nome}`));
                el.modalPericiaUsoCheckboxes.appendChild(label);
            });
        } else {
            el.modalPericiaUso.innerHTML = "";
            if (!exigePericia) {
                const optNenhuma = document.createElement("option");
                optNenhuma.value = "";
                optNenhuma.innerText = "Nenhuma (sem rolagem automática de \"Usar\")";
                el.modalPericiaUso.appendChild(optNenhuma);
            }
            opcoes.forEach(nome => {
                const opt = document.createElement("option");
                opt.value = nome;
                opt.innerText = nome;
                el.modalPericiaUso.appendChild(opt);
            });
            el.modalPericiaUso.value = (periciaUsoAtual && opcoes.includes(periciaUsoAtual))
                ? periciaUsoAtual
                : (exigePericia ? opcoes[0] : "");
        }
    }

    // Carteira digital — só faz sentido em Eletrônico (um pendrive com
    // cripto, um celular com app de banco...) ou Dinheiro físico (maço
    // de cash). Independente da perícia vinculada acima: um item pode
    // guardar dinheiro sem servir pra Hackear/Programar, e vice-versa.
    // Ver ehTagQuePodeSerSaldo e todosOsSaldos em dados-manual.js.
    // Eletrônico guarda DOIS saldos separados do mesmo item (notas e
    // moedas digitais — cada um gasto/movido à parte na aba Finanças);
    // Dinheiro físico continua com um valor só.
    const podeSerSaldo = ehTagQuePodeSerSaldo(tagKey);
    const saldoEhEletronico = tagKey === "eletronico";
    el.modalCampoItemSaldo.style.display = podeSerSaldo ? "flex" : "none";
    if (podeSerSaldo) {
        el.modalItemEhSaldo.checked = !!ehSaldoAtual;
        el.modalItemSaldoValor.value = saldoValorAtual ?? 0;
        el.modalItemSaldoNotas.value = saldoNotasAtual ?? 0;
        el.modalItemSaldoMoedas.value = saldoMoedasAtual ?? 0;
        el.modalItemSaldoValorBloco.style.display = (ehSaldoAtual && !saldoEhEletronico) ? "block" : "none";
        el.modalItemSaldoEletronicoBloco.style.display = (ehSaldoAtual && saldoEhEletronico) ? "block" : "none";
    }

    // Quantidade genérica ("tenho N desse item") — mesmo esquema que
    // munição já usa (Peso total = Peso unitário × Quantidade), agora
    // pra qualquer item (ver tagTemQuantidadeGeral em dados-manual.js).
    // Quando ativa, o campo "Peso" vira "Peso unitário" e o total é
    // recalculado ao vivo (ver listener de modal-peso/modal-quantidade
    // logo abaixo da função).
    const temQuantidade = tagKey && tagTemQuantidadeGeral(tagKey);
    el.modalCampoQuantidade.style.display = temQuantidade ? "flex" : "none";
    if (el.modalLabelPeso) el.modalLabelPeso.textContent = temQuantidade ? "Peso unitário (kg)" : "Peso (kg)";
    if (el.modalLabelVolume) {
        el.modalLabelVolume.textContent = ehProjetil(tagKey)
            ? "Volume unitário (por projétil)"
            : (temQuantidade ? "Volume unitário" : "Volume");
    }
    if (temQuantidade) {
        el.modalQuantidade.value = Math.max(1, Number(quantidadeAtual) || 1);
        atualizarPesoTotalModal();
    }

    // Ferramenta de Criação (geral) — ver ehFerramentaCriacaoGeral em
    // dados-manual.js: não tem select de perícia (não fica travada numa
    // só), só um aviso explicando que a escolha é feita ao usar o item.
    el.hintFerramentaCriacaoGeral.style.display = ehFerramentaCriacaoGeral(tagKey) ? "block" : "none";

    const armaOuExplosivo = ehArmaOuExplosivo(tagKey);
    const explosivoItem = ehExplosivo(tagKey);
    const arma = ehArma(tagKey);
    // Arma branca (não-fogo) — condição repetida aqui (igual a
    // `ehArmaBranca` mais abaixo, que só é calculada DEPOIS do bloco
    // químico) porque a checkbox de "carga química" precisa saber se
    // mostra ANTES de chegar lá. Perícia vinculada já está populada no
    // select nesse ponto (ver bloco de perícia vinculada, logo acima).
    const ehArmaBrancaQuimico = arma && exigePericia && !ehArmaDeFogo(el.modalPericiaUso.value);
    el.modalCampoCargaQuimica.style.display = ehArmaBrancaQuimico ? "flex" : "none";
    if (ehArmaBrancaQuimico) {
        // Só reseta o checkbox a partir do que já está salvo quando o
        // modal está sendo (re)aberto para este item — dataset.tocado
        // marca que a pessoa já mexeu manualmente nele nesta sessão do
        // modal, pra não desmarcar sem querer ao trocar outro campo que
        // também chama atualizarCamposPorTag.
        if (!el.modalArmaCargaQuimica.dataset.tocado) {
            el.modalArmaCargaQuimica.checked = !!(quimicoConfigAtual && Array.isArray(quimicoConfigAtual.efeitos) && quimicoConfigAtual.efeitos.length);
        }
        if (!el.modalArmaCargaQuimica.dataset.listener) {
            el.modalArmaCargaQuimica.addEventListener("change", () => {
                el.modalArmaCargaQuimica.dataset.tocado = "1";
                const mostrar = el.modalArmaCargaQuimica.checked;
                el.modalConfigQuimico.style.display = mostrar ? "block" : "none";
                if (mostrar && !el.modalQuimicoMateriaisLista.children.length) {
                    renderizarLinhasMateriaisQuimico(null);
                    recalcularQuimicoAutoPreenchido();
                }
            });
            el.modalArmaCargaQuimica.dataset.listener = "1";
        }
    } else {
        el.modalArmaCargaQuimica.checked = false;
        delete el.modalArmaCargaQuimica.dataset.tocado;
    }
    el.modalConfigArma.style.display = armaOuExplosivo ? "block" : "none";
    if (armaOuExplosivo) {
        el.modalArmaDanoBase.value = (armaConfig && armaConfig.danoBase) ?? 0;
        // Explosivo já entra com "Explosão" pré-selecionado (é o tipo de
        // dano correto pra bomba/granada na imensa maioria dos casos) —
        // ainda dá pra trocar manualmente se a receita pedir outro tipo
        // (ex.: uma bomba de fósforo branco = Fogo).
        el.modalArmaTipoDano.value = (armaConfig && armaConfig.tipoDano) || (explosivoItem ? "explosao" : TIPOS_DANO[0].key);
        // Escala (multiplicador sobre atributo) é conceito de arma branca
        // corpo a corpo — o dano de uma explosão não escala com quem a
        // arremessa, então o campo (escondido pra Explosivo pela mesma
        // regra de arma de fogo, ver atualizarVisibilidadeArmaFogo) nunca
        // é preenchido/lido pra essa tag.
        el.modalArmaEscala.value = (armaConfig && armaConfig.escala) || "";
        montarModificacoesArma((armaConfig && armaConfig.modificacoesArma) || []);
    }

    // Configuração do explosivo (manual pg. 81-82) — só pra tag
    // "explosivo". Popula os selects de "modelo padrão" (autopreenchimento)
    // e "módulo de detonação" só a primeira vez (não recriar toda hora
    // perde o listener); os VALORES atuais (dificuldade de armar, raio,
    // módulo escolhido) são sempre re-sincronizados com o item.
    el.modalConfigExplosivo.style.display = explosivoItem ? "block" : "none";
    if (explosivoItem) {
        if (!el.modalExplosivoModelo.dataset.montado) {
            EXPLOSIVOS_PADRAO.forEach(modelo => {
                const opt = document.createElement("option");
                opt.value = modelo.nome;
                opt.innerText = `${modelo.nome} (Nível ${modelo.nivel} — ${modelo.dano} dano, raio ${modelo.raio}m)`;
                el.modalExplosivoModelo.appendChild(opt);
            });
            el.modalExplosivoModelo.dataset.montado = "1";
            el.modalExplosivoModelo.addEventListener("change", () => {
                const modelo = EXPLOSIVOS_PADRAO.find(m => m.nome === el.modalExplosivoModelo.value);
                if (!modelo) return;
                el.modalArmaDanoBase.value = modelo.dano;
                el.modalExplosivoDificuldadeArmar.value = modelo.dificuldadeArmar;
                el.modalExplosivoRaio.value = modelo.raio;
                if (el.modalNivelTag) el.modalNivelTag.value = String(modelo.nivel);
                if (!el.modalDescricao.value.trim()) el.modalDescricao.value = modelo.descricao;
            });
        }
        if (!el.modalExplosivoModulo.dataset.montado) {
            MODULOS_DETONACAO.forEach(mod => {
                const opt = document.createElement("option");
                opt.value = mod.nome;
                opt.innerText = `${mod.nome} (Nível ${mod.nivel})`;
                el.modalExplosivoModulo.appendChild(opt);
            });
            el.modalExplosivoModulo.dataset.montado = "1";
        }
        el.modalExplosivoModelo.value = (armaConfig && armaConfig.modeloPadrao) || "";
        el.modalExplosivoDificuldadeArmar.value = (armaConfig && armaConfig.dificuldadeArmar) ?? 0;
        el.modalExplosivoRaio.value = (armaConfig && armaConfig.raio) ?? 0;
        el.modalExplosivoModulo.value = (armaConfig && armaConfig.moduloDetonacao) || "";
    }

    // Configuração do implante (manual pg. 84-88 — ver plano-implantes-
    // biomecanica.txt) — só pra tag "biomecanica". Select de subtipo
    // popula uma vez só (mesmo padrão do select de módulo de detonação
    // acima); dificuldade de instalar e funções especiais são sempre
    // re-sincronizados com o item.
    const implanteItem = tagKey === "biomecanica";
    el.modalConfigImplante.style.display = implanteItem ? "block" : "none";
    if (implanteItem) {
        if (!el.modalImplanteSubtipo.dataset.montado) {
            SUBTIPOS_IMPLANTE.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.key;
                opt.innerText = s.label;
                el.modalImplanteSubtipo.appendChild(opt);
            });
            el.modalImplanteSubtipo.dataset.montado = "1";
            // Tomada/Chip (manual pg. 84): trocar o subtipo (ou o Nível,
            // ver listener de modal-nivel-tag mais abaixo) muda qual
            // sub-bloco aparece e recalcula a dificuldade de instalar
            // automática — reagem em tempo real, sem precisar reabrir o
            // modal.
            el.modalImplanteSubtipo.addEventListener("change", () => atualizarBlocoSubtipoImplante(null));
            el.modalImplanteDificuldadeInstalar.addEventListener("input", () => {
                el.modalImplanteDificuldadeInstalar.dataset.autoGerado = "0";
            });
        }
        el.modalImplanteSubtipo.value = (implanteConfigAtual && implanteConfigAtual.subtipo) || "";
        el.modalImplanteDificuldadeInstalar.value = (implanteConfigAtual && implanteConfigAtual.dificuldadeInstalar) ?? 0;
        // Item novo (sem dificuldade salva ainda) começa "automático" —
        // Tomada/Chip preenchem esse campo sozinhos a partir do Nível
        // (ver atualizarBlocoSubtipoImplante); item já existente com
        // dificuldade salva é tratado como valor escolhido à mão, pra
        // reabrir pra edição não sobrescrever o que a mesa já ajustou.
        el.modalImplanteDificuldadeInstalar.dataset.autoGerado = (implanteConfigAtual && implanteConfigAtual.dificuldadeInstalar) ? "0" : "1";
        el.modalImplanteFuncoesEspeciais.value = (implanteConfigAtual && implanteConfigAtual.funcoesEspeciais) || "";
        atualizarBlocoSubtipoImplante(implanteConfigAtual);
    }

    // Configuração do Produto Químico (Parte 4 do plano de automação dos
    // materiais químicos — ver plano-automacao-materiais-quimicos-v3.md):
    // Raio continua campo próprio simples; Dificuldade de uso e Tipo de
    // efeito agora são CALCULADOS a partir da receita por pontos de
    // material (renderizarLinhasMateriaisQuimico/recalcularQuimicoAuto
    // Preenchido logo abaixo), mas continuam editáveis à mão — dataset.
    // autoGerado controla se o próximo recálculo pode sobrescrever o
    // campo (ver listeners de "input" logo abaixo, que zeram a flag
    // assim que a pessoa mexe direto no campo em vez de nos materiais).
    // ehProdutoQuimico(tagKey) cobre o item "de área" de sempre;
    // ehArmaBrancaQuimico && checkbox marcado cobre o dardo/lâmina
    // envenenada novo (Parte 6.2). Os dois casos reaproveitam o mesmo
    // bloco de UI e o mesmo campo it.quimico — só muda ONDE os efeitos
    // são disparados depois (área via Mestre vs. direto no alvo ao
    // acertar, ver resolverAtaque).
    const produtoQuimico = ehProdutoQuimico(tagKey);
    const armaComCargaQuimica = ehArmaBrancaQuimico && el.modalArmaCargaQuimica.checked;
    el.modalConfigQuimico.style.display = (produtoQuimico || armaComCargaQuimica) ? "block" : "none";
    if (produtoQuimico || armaComCargaQuimica) {
        el.modalQuimicoRaio.value = (quimicoConfigAtual && quimicoConfigAtual.raio) ?? 0;
        renderizarLinhasMateriaisQuimico(quimicoConfigAtual && quimicoConfigAtual.efeitos, quimicoConfigAtual && quimicoConfigAtual.pontosVeiculoTransporte);
        el.modalQuimicoDificuldadeUsar.dataset.autoGerado = "1";
        el.modalQuimicoTipoEfeito.dataset.autoGerado = "1";
        if (quimicoConfigAtual && quimicoConfigAtual.efeitos && quimicoConfigAtual.efeitos.length) {
            // Item existente com receita já salva: mostra os valores que
            // já estavam gravados (podem ter sido ajustados à mão) em vez
            // de recalcular por cima — só passa a recalcular a partir da
            // primeira mudança nos materiais (autoGerado continua "1").
            el.modalQuimicoDificuldadeUsar.value = Number(quimicoConfigAtual.dificuldadeUsar) || 0;
            el.modalQuimicoTipoEfeito.value = quimicoConfigAtual.tipoEfeito || "";
        } else {
            recalcularQuimicoAutoPreenchido();
        }
        if (!el.modalQuimicoDificuldadeUsar.dataset.listenerAuto) {
            el.modalQuimicoDificuldadeUsar.addEventListener("input", () => { el.modalQuimicoDificuldadeUsar.dataset.autoGerado = "0"; });
            el.modalQuimicoDificuldadeUsar.dataset.listenerAuto = "1";
        }
        if (!el.modalQuimicoTipoEfeito.dataset.listenerAuto) {
            el.modalQuimicoTipoEfeito.addEventListener("input", () => { el.modalQuimicoTipoEfeito.dataset.autoGerado = "0"; });
            el.modalQuimicoTipoEfeito.dataset.listenerAuto = "1";
        }
    }
    // Tipo de dano extra — só faz sentido em arma branca (corpo a corpo,
    // não-fogo); arma de fogo dispara sempre o mesmo tipo de projétil.
    // Usa o valor JÁ POPULADO do select de perícia (acima) em vez do
    // parâmetro cru — assim fica certo mesmo quando a tag acabou de
    // mudar e a perícia caiu no primeiro item da lista por padrão.
    const ehArmaBranca = arma && exigePericia && !ehArmaDeFogo(el.modalPericiaUso.value);
    el.modalCampoTipoDanoExtra.style.display = ehArmaBranca ? "flex" : "none";
    if (ehArmaBranca) el.modalArmaTipoDanoExtra.value = (armaConfig && armaConfig.tipoDanoExtra) || "";

    // Dilaceração (item 7 do plano de saúde/complicações) — só faz
    // sentido em arma de verdade (fogo ou branca); explosão dilacera
    // automaticamente por tipo de dano, sem checkbox (ver mestre.js).
    // Checkbox sempre editável — só nasce PRÉ-marcada (sugestão, não
    // trava nada) quando o item ainda não tem esse campo salvo E o
    // calibre escolhido for Classe V. "Dilacera em golpe normal" só
    // aparece em arma branca.
    el.modalCampoDilacera.style.display = arma ? "flex" : "none";
    if (arma) {
        const dilaceraSalvo = armaConfig ? armaConfig.dilacera : undefined;
        el.modalArmaDilacera.checked = (dilaceraSalvo !== undefined && dilaceraSalvo !== null)
            ? !!dilaceraSalvo
            : calibreSugereDilacera(calibreAtual);
    }
    el.modalCampoDilaceraGolpeNormal.style.display = ehArmaBranca ? "flex" : "none";
    if (ehArmaBranca) el.modalArmaDilaceraGolpeNormal.checked = !!(armaConfig && armaConfig.dilaceraEmGolpeNormal);

    // Redução de dano — só pra tags do tipo "colete/placa".
    const reduzDano = tagPodeReduzirDano(tagKey);
    el.modalConfigReducaoDano.style.display = reduzDano ? "block" : "none";
    if (reduzDano) montarReducaoDanoChecklist(reducoesDanoAtuais);

    // Parte do corpo protegida — obrigatória em itens de Proteção.
    const exigeLocalProtegido = tagExigeLocalProtegido(tagKey);
    el.modalCampoLocalProtegido.style.display = exigeLocalProtegido ? "flex" : "none";
    if (exigeLocalProtegido) el.modalLocalProtegido.value = localProtegidoAtual || "";

    // Classe de Proteção (colete e arma de fogo) e, abaixo dela, o
    // Calibre específico (carregador/projétil/arma de fogo — é o que
    // casa os três entre si).
    atualizarVisibilidadeClasseProtecao(classeProtecaoAtual);
    atualizarVisibilidadeCalibre(calibreAtual);
    // Características de Arma de Fogo — dependem da perícia vinculada
    // selecionada acima, então são avaliadas depois dela estar montada.
    atualizarVisibilidadeArmaFogo(armaConfig);

    // Efeitos de Equipamento Médico (tag "equipamento_medico" — Fase 3
    // do plano-efeitos-equipamentos-medicos.txt). Bloco só aparece pra
    // essa tag; monta a lista de linhas a partir do que já está salvo
    // no item (ou vazio, pra item novo/outra tag).
    const ehEquipamentoMedico = tagKey === "equipamento_medico";
    el.modalCampoEfeitosMedicos.style.display = ehEquipamentoMedico ? "block" : "none";
    if (ehEquipamentoMedico) montarListaEfeitosMedicos(efeitosMedicosAtual || []);

    // "Já equipado" (atalho de criação) — some/aparece junto com tudo
    // acima porque depende do mesmo estado (tag, checkbox "equipável",
    // subtipo de porte do recipiente). Ver atualizarCampoJaEquipar.
    atualizarCampoJaEquipar();
    // "Instalar em veículo" (Fase 5c do plano) — só aparece pra tag
    // "arma"; depende do mesmo tagKey acima. Ver atualizarCampoInstalarVeiculo.
    atualizarCampoInstalarVeiculo();
}

export async function salvarItemDoModal(id) {
    const nome = el.modalNome.value.trim();
    const tag = el.modalTag.value;
    if (!nome) { toast("Dê um nome ao item.", "erro"); return; }
    if (!tag) { toast("Toda item precisa de uma tag do sistema.", "erro"); return; }

    const exigePericia = tagExigePericiaUso(tag);
    const periciaUso = lerPericiaUsoDoModal(tag);
    const { ehSaldo, saldoValor, saldoNotas, saldoMoedas } = lerSaldoDoItemDoModal(tag);
    const { peso, pesoUnitario, volume, volumeUnitario, quantidade } = lerPesoVolumeEQuantidadeDoModal(tag);
    if (exigePericia && !periciaUso) { toast("Escolha a perícia vinculada a este item.", "erro"); return; }

    const exigeClasseProtecao = tagExigeClasseProtecao(tag, periciaUso);
    const classeProtecao = exigeClasseProtecao ? el.modalClasseProtecao.value : null;
    if (exigeClasseProtecao && !classeProtecao) { toast("Escolha a classe de proteção deste item.", "erro"); return; }

    const exigeCalibre = tagUsaCalibreEspecifico(tag, periciaUso);
    const calibre = exigeCalibre ? el.modalCalibre.value : null;
    if (exigeCalibre && !calibre) { toast("Escolha o calibre deste item.", "erro"); return; }

    const exigeLocalProtegido = tagExigeLocalProtegido(tag);
    const localProtegido = exigeLocalProtegido ? el.modalLocalProtegido.value : null;
    if (exigeLocalProtegido && !localProtegido) { toast("Escolha o que este item protege.", "erro"); return; }

    if (tag === "biomecanica" && !el.modalImplanteSubtipo.value) { toast("Escolha o subtipo do implante.", "erro"); return; }

    const tamanho = el.modalTamanho.value || null;

    // Mãos necessárias (ver item.maosNecessarias, seção 2.2 do
    // projeto-slots-porte.txt) — só grava número diferente de 1 quando o
    // campo está visível (item potencialmente equipável/segurável);
    // senão fica no default 1 (irrelevante pra item que nunca é
    // equipado/segurado solto).
    const maosNecessarias = (el.modalCampoMaosNecessarias.style.display !== "none")
        ? (Number(el.modalMaosNecessarias.value) === 2 ? 2 : 1)
        : 1;

    // Recipiente (mochila, bolsa...) — tipo de porte (obrigatório, ver
    // SUBTIPOS_PORTE em dados-manual.js) e compartimentos (obrigatório
    // pelo menos 1, cada um com sua própria capacidade/tamanho — ver
    // editor dinâmico), só gravados quando a tag é "recipiente" (ver
    // ehContainer em dados-manual.js).
    const subtipoPorte = ehContainer(tag) ? (el.modalSubtipoPorte.value || null) : null;
    if (ehContainer(tag) && !subtipoPorte) { toast("Escolha o tipo de porte deste recipiente.", "erro"); return; }
    let compartimentos = null;
    if (ehContainer(tag)) {
        compartimentos = lerCompartimentosDoModal();
        if (!compartimentos) return; // toast de erro já disparado dentro da função
    }

    // "Guardar dentro de" (item-recipiente) — só existe pra item de
    // ficha (não pro Banco Global). Revalida contra ciclo aqui também
    // (defesa extra: o select já vem filtrado por popularSelectGuardarDentro,
    // mas o item pode ter virado recipiente-de-si-mesmo por edição feita
    // noutra aba/dispositivo entre a abertura do modal e o salvar).
    // Guardar dentro de um recipiente SEMPRE move o item pra categoria
    // dele — não faz sentido um item estar "guardado numa mochila que
    // está em casa" e ao mesmo tempo listado como "levando consigo".
    let dentroDe = null;
    let compartimentoId = null;
    let categoriaFinal = el.modalCategoriaItem.value || "levando";
    if (el.modalCampoGuardarDentro.style.display !== "none") {
        // Valor do select agora é composto ("containerId::compartimentoId"
        // — ver popularSelectGuardarDentro/listaContainersDisponiveis,
        // passo 11 do projeto-slots-porte.txt), já que um mesmo container
        // pode ter mais de um compartimento.
        const valorSelecionado = el.modalGuardarDentro.value || "";
        const [containerIdSelecionado, compartimentoIdSelecionado] = valorSelecionado ? valorSelecionado.split("::") : [null, null];
        if (containerIdSelecionado && id && itemDescendeDe(estado.fichaAtual, containerIdSelecionado, id)) {
            toast("Não dá pra guardar um item dentro dele mesmo (ou de algo já guardado dentro dele).", "erro");
            return;
        }
        // "Cabe ou não cabe" (Fase 2/3, agora por compartimento): tamanho
        // e capacidade do compartimento escolhido, contra o volume/tamanho
        // deste item. idExcluir = id (quando editando) evita contar o
        // volume do próprio item duas vezes, caso ele já estivesse
        // guardado ali.
        if (containerIdSelecionado) {
            const resultado = itemCabeNoContainer(estado.fichaAtual, containerIdSelecionado, compartimentoIdSelecionado, volume, tamanho, id || null);
            if (!resultado.cabe) {
                const nomeContainer = estado.fichaAtual.inventario[containerIdSelecionado]?.nome || "recipiente";
                const msg = resultado.motivo === "tamanho"
                    ? `"${nomeContainer}" não aceita item desse tamanho.`
                    : resultado.motivo === "compartimento_invalido"
                        ? `O compartimento escolhido em "${nomeContainer}" não existe mais — escolha outro.`
                        : `"${nomeContainer}" não tem espaço sobrando (capacidade de volume estourada).`;
                toast(msg, "erro");
                return;
            }
        }
        dentroDe = containerIdSelecionado || null;
        compartimentoId = dentroDe ? compartimentoIdSelecionado : null;
        if (dentroDe && estado.fichaAtual.inventario[dentroDe]) {
            categoriaFinal = estado.fichaAtual.inventario[dentroDe].categoria || categoriaFinal;
        }
    }

    // Preserva o estado do item existente ANTES de mexer em
    // categoria/equipada — usado tanto pelo atalho "Já equipado" logo
    // abaixo (pra saber se o item já contava mão antes) quanto pelo
    // resto da função mais adiante (registro, ativo/desativado etc.).
    const existenteItem = (id && estado.fichaAtual.inventario && estado.fichaAtual.inventario[id]) || {};

    // "Já equipado" (atalho de criação — item nasce direto em "Levando
    // consigo" e equipado, sem precisar do fluxo casa → mover pra
    // "levando" → equipar em passos separados). Só entra em jogo se o
    // campo estava visível (item elegível — ver atualizarCampoJaEquipar)
    // e o item não está sendo guardado dentro de outra coisa (dentroDe):
    // guardado e equipado ao mesmo tempo não faz sentido.
    let equipadaFinal = existenteItem.equipada ?? false;
    if (!dentroDe && el.modalCampoJaEquipar.style.display !== "none" && el.modalJaEquipar.checked) {
        if (ehContainer(tag) && subtipoPorteExclusivo(subtipoPorte) && !itemPodeEquiparContainer(estado.fichaAtual, { tag, subtipoPorte }, id || null)) {
            toast(`Já tem outra peça de "${rotuloSubtipoPorte(subtipoPorte)}" equipada — desequipe-a primeiro.`, "erro");
            return;
        }
        const ocupaMaoEsteItem = (ehCarregador(tag) && carregadorEstaAnexado(estado.fichaAtual, id)) ? false : itemOcupaMao(tag, subtipoPorte);
        if (ocupaMaoEsteItem) {
            // Se o item já estava equipado (edição) e já contava como mão
            // ocupada, devolve essa mão antes de checar — senão ele
            // "brigaria" contra a própria mão que já era dele.
            const jaOcupavaMao = existenteItem.equipada && existenteItem.categoria === "levando" && !existenteItem.dentroDe
                && ocupaMaoEsteItem;
            const maosLivres = maosDisponiveis(estado.fichaAtual) + (jaOcupavaMao ? (Number(existenteItem.maosNecessarias) || 1) : 0);
            if (maosLivres < maosNecessarias) {
                toast(`Sem mãos livres pra equipar (${maosLivres} livre${maosLivres === 1 ? "" : "s"} — precisa de ${maosNecessarias}).`, "erro");
                return;
            }
        }
        categoriaFinal = "levando";
        equipadaFinal = true;
    }

    // Instalar em veículo pelo modal de item (Fase 5c — ver
    // plano-acessorios-veiculo.txt, seção "FASE 5c"): mesmo efeito
    // colateral que instalarArmaEmVeiculo já aplica quando a montagem
    // acontece pelo card do veículo — uma arma montada no carro está
    // fisicamente pronta pra disparar, então força "levando"/equipada
    // aqui também. Sem isso, escolher um veículo neste dropdown sem
    // MARCAR "Já equipado" deixava o item com instaladoEmVeiculoId
    // gravado mas ainda desequipado — o botão "🎯 Disparar" no card do
    // veículo nascia desabilitado sem nenhuma pista do motivo.
    if (tag === "arma" && el.modalCampoInstalarVeiculo.style.display !== "none" && el.modalInstalarVeiculo.value) {
        categoriaFinal = "levando";
        equipadaFinal = true;
    }

    // Carregador — preserva a munição já carregada (se estiver editando um
    // carregador existente); só a capacidade máxima é editável aqui.
    let carregador = null;
    if (tagExigeCapacidadeCarregador(tag)) {
        const capacidadeMax = Number(el.modalCarregadorCapacidade.value) || 0;
        if (capacidadeMax <= 0) { toast("Informe a capacidade do carregador.", "erro"); return; }
        const existenteCarregador = (id && estado.fichaAtual.inventario && estado.fichaAtual.inventario[id] && estado.fichaAtual.inventario[id].carregador) || null;
        const municaoAtual = Math.min(existenteCarregador?.municaoAtual || 0, capacidadeMax);
        carregador = {
            capacidadeMax,
            municaoAtual,
            projeteisCarregados: existenteCarregador?.projeteisCarregados || []
        };
    }

    // Projétil — quantidade de rounds que esse item representa, editável
    // direto no modal (campo "Quantidade de projéteis"). Item novo usa o
    // que estiver no campo (padrão 1); editando um existente, começa
    // pré-preenchido com a quantidade já salva, então só muda se o
    // jogador realmente mexer no número.
    let projetil = null;
    if (tagExigeQuantidadeProjetil(tag)) {
        projetil = { quantidade: Math.max(0, Number(el.modalProjetilQuantidade.value) || 0) };
    }

    // Preserva o estado do botão ativo/desativado ao editar um item já
    // existente (senão editar peso/descrição, por exemplo, reativaria
    // sem querer um item que o jogador tinha desligado).
    const modificadoresItem = lerModificadoresDoModal();
    // Efeitos de Equipamento Médico (Fase 3-4 do plano-efeitos-
    // equipamentos-medicos.txt) — só populado quando a tag é
    // "equipamento_medico"; qualquer outra tag grava array vazio (item
    // sem efeito mecânico próprio continua salvando normalmente).
    const efeitosMedicosItem = tag === "equipamento_medico" ? lerEfeitosMedicosDoModal() : [];
    // Item NOVO com modificador estruturado nasce DESLIGADO (precisa do
    // botão "Ativar" — ver criarLiItem) — exceto droga, que não usa esse
    // botão (o efeito dela só entra ao ser consumida, ver consumirDroga;
    // `ativo` simplesmente não é lido pra itens com tag "droga").
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: modificadoresItem,
        efeitosMedicos: efeitosMedicosItem,
        ativo: existenteItem.ativo ?? (modificadoresItem.length && tag !== "droga" ? false : true),
        // Miniatura opcional (ver configurarImagemItemGenerico) — já
        // chega aqui como data URL pequeno, redimensionado no navegador.
        imagem: estado.imagemItemModalAtual || null,
        tag,
        nivelTag: tagTemNivel(tag) ? Number(el.modalNivelTag.value) : null,
        limitarRolagemPorNivel: tagPermiteLimiteRolagemPorNivel(tag) ? !!el.modalLimitarRolagem.checked : false,
        peso,
        pesoUnitario,
        volume,
        volumeUnitario,
        tamanho,
        maosNecessarias,
        subtipoPorte,
        // Vem do editor dinâmico (lerCompartimentosDoModal) quando é
        // container; senão fica null (item comum não tem compartimento).
        compartimentos,
        quantidade,
        categoria: categoriaFinal,
        dentroDe,
        compartimentoId,
        periciaUso,
        ehSaldo,
        saldoValor,
        saldoNotas,
        saldoMoedas,
        classeProtecao,
        calibre,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        localProtegido,
        arma: ehArmaOuExplosivo(tag) ? lerConfigArmaDoModal(periciaUso, calibre, existenteItem.arma, tag) : null,
        quimico: (ehProdutoQuimico(tag) || (tag === "arma" && el.modalArmaCargaQuimica.checked)) ? lerConfigQuimicoDoModal() : null,
        // Implante de Biomecânica (ver plano-implantes-biomecanica.txt).
        // `instalado`/testes/rejeição/histórico nunca mudam por este
        // modal — só pela cirurgia (Fase 4-8 do plano, ainda não
        // implementada) — lerConfigImplanteDoModal preserva o que já
        // existia em existenteItem.implante.
        implante: tag === "biomecanica" ? lerConfigImplanteDoModal(existenteItem.implante) : null,
        carregador,
        projetil,
        // Equipável (checkbox independente da tag — ver atualizarCamposPorTag):
        // arma já é sempre equipável por natureza, então o checkbox some e
        // fica implicitamente false aqui (itemEhEquipavel ainda cobre arma
        // via ehArma, ver inventario.js). "equipada" preserva o estado atual
        // — ou vira true de cara se o atalho "Já equipado" foi marcado
        // acima (ver equipadaFinal, logo depois do bloco "Guardar dentro
        // de") — senão editar qualquer outro campo do item desequiparia
        // sem querer.
        equipavel: (tag !== "arma" && tag !== "explosivo") ? !!el.modalEquipavel.checked : false,
        equipada: equipadaFinal,
        // Material de criação: tipo/qualidade/quantidade em estoque —
        // ver atualizarCamposPorTag. Itens antigos que só tinham a
        // marcação implícita (feita de leve em abrirModalEscolherMateriais,
        // antes desse campo existir no modal) continuam preservados aqui
        // se o item não for tag "material" nesta edição.
        materialTipo: tag === "material" ? el.modalMaterialTipo.value : (existenteItem.materialTipo ?? null),
        materialQualidade: tag === "material" ? (qualidadesDoMaterial(el.modalMaterialTipo.value) ? el.modalMaterialQualidade.value : null) : (existenteItem.materialQualidade ?? null),
        materialQuantidade: tag === "material" ? Math.max(0, Number(el.modalMaterialQuantidade.value) || 0) : (existenteItem.materialQuantidade ?? null),
        // Chave de veículo (tag "chave" — ver plano-veiculos.txt): estava
        // faltando aqui — mesma classe de bug que materialTipo/ehSaldo já
        // tiveram antes de entrar nesta lista (campo apagado a cada
        // edição do item pelo modal, mesmo sem o jogador mexer nele).
        // Simplesmente preserva o valor já salvo; não é editável por
        // este modal (a chave nasce vinculada junto com o veículo, ver
        // salvarVeiculoDoModal).
        veiculoId: existenteItem.veiculoId ?? null,
        // Acessório-arma montado em veículo (tag "arma" — Fase 5c do
        // plano, ver plano-acessorios-veiculo.txt, seção "FASE 5c"): só
        // editável aqui quando o campo "Instalar em veículo" está
        // visível (tag === "arma" e item já existe — ver
        // atualizarCampoInstalarVeiculo); fora disso, preserva o valor
        // já salvo (mesma régua defensiva do veiculoId acima — trocar a
        // tag de um item de volta pra "arma" não deve inventar um
        // ponteiro do nada, mas também não deve apagar um que já
        // existia se a tag nem mudou).
        instaladoEmVeiculoId: tag === "arma" && el.modalCampoInstalarVeiculo.style.display !== "none"
            ? (el.modalInstalarVeiculo.value || null)
            : (existenteItem.instaladoEmVeiculoId ?? null),
        slotVeiculo: existenteItem.slotVeiculo ?? null
    };

    // Trava central de "todo item solto precisa de um lugar físico" (seção
    // 3 e 5.4 do projeto-slots-porte.txt, passo 12): um item em "levando
    // consigo" e sem estar guardado dentro de nada só pode existir se
    // estiver numa mão, vestido, ou carregado (roupa/cinto/mochila/
    // bolsa_mao equipados) — ver itemPodeSerLevadoSolto em inventario.js.
    // Roda com o `registro` já montado (não com o item antigo) porque a
    // edição pode ter mudado categoria/dentroDe/equipada/subtipoPorte
    // nesta mesma submissão.
    // Não se aplica ao protótipo de receita (estado.criarItemApenasNoBanco):
    // ele nunca chega a existir fisicamente na ficha, então "cabe na
    // mão"/"guardado em algo" não faz sentido pra ele.
    if (!estado.criarItemApenasNoBanco && !itemPodeSerLevadoSolto(estado.fichaAtual, registro)) {
        toast(`"${nome}" precisa estar numa mão, vestido/carregado, ou guardado dentro de um compartimento pra ficar em "levando consigo".`, "erro");
        return;
    }

    const idFinal = id || gerarIdLocal();
    // Fluxo "+ Criar item no Banco Global" da receita (ver
    // estado.criarItemApenasNoBanco): este item é só o protótipo/catálogo pra
    // vincular a receita — NÃO deve virar um item físico na mão do
    // personagem. Pula a gravação em estado.fichaAtual.inventario e vai direto
    // pro Banco Global.
    if (estado.criarItemApenasNoBanco) {
        estado.criarItemApenasNoBanco = false;
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.fichaAtualId;
        try {
            estado.idBancoParaRetomarReceita = await salvarItemNoBanco(registro, nomeJogador);
            toast(`Item "${nome}" salvo no Banco Global (não entrou no seu inventário).`);
        } catch (erro) {
            console.error("Falha ao salvar item no Banco Global:", erro);
            toast(`Falha ao salvar "${nome}" no Banco Global (${erro.message || "erro desconhecido"}).`, "erro");
            return; // não fecha o modal — deixa tentar de novo.
        }
        fecharModal();
        return;
    }

    if (!estado.fichaAtual.inventario) estado.fichaAtual.inventario = {};
    estado.fichaAtual.inventario[idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/inventario`), estado.fichaAtual.inventario);

    // "Save & Reuse": se o checkbox estiver marcado, o mesmo item também
    // vai pro Banco Global (sem o campo "categoria", que é específico de
    // onde ele está guardado nesta ficha). Isso é feito num try/catch
    // separado do resto: se o item já foi salvo na ficha (linha acima)
    // mas o envio pro Banco falhar (ex: permissão do Firebase), o
    // jogador precisa VER o erro — antes essa falha ficava muda (uma
    // promise rejeitada sem .catch), então o item ficava salvo só na
    // ficha e nunca aparecia na Biblioteca, sem nenhum aviso.
    if (el.modalCampoSalvarBanco.style.display !== "none" && el.modalSalvarBanco.checked) {
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.fichaAtualId;
        try {
            estado.idBancoParaRetomarReceita = await salvarItemNoBanco(registro, nomeJogador);
            toast(`Item salvo na ficha e no Banco Global.`);
        } catch (erro) {
            console.error("Falha ao salvar item no Banco Global:", erro);
            toast(`Item salvo na ficha, mas FALHOU ao salvar no Banco Global (${erro.message || "erro desconhecido"}).`, "erro");
        }
    } else {
        toast("Item salvo.");
    }
    fecharModal();
}
