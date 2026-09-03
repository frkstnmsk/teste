// =====================================================================
// CHUVA DE NEON — Ficha (orquestração principal)
// =====================================================================

import { db } from "./firebase-config.js";
import { ref, set, get, update, remove, onValue, off } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-database.js";
import { caminhoMesa } from "./mesa.js";
import { estado, definirLimpezaPainelMestre } from "./estado.js";
import { renderizarPerfil } from "./abas/perfil.js";
import { renderizarFinancas, configurarFinancas } from "./abas/financas.js";
import { renderizarVantagensDesvantagens } from "./abas/vantagens-desvantagens.js";
import { renderizarEspecializacoes, configurarCampoSubstanciaVicio } from "./abas/especializacoes.js";
// renderizarNotas (abas/notas.js) não é mais chamada direto daqui — o
// único chamador (renderizarDarknetENotas) mudou pra abas/darknet.js no
// Passo 19, que já importa renderizarNotas por conta própria.
import { renderizarTreinamento, configurarPopupTreinamento } from "./abas/treinamento.js";
import {
    renderizarAtributos, configurarStatusTopoCarrossel, renderizarRecuperacaoPV, configurarRecuperacaoPV
} from "./abas/atributos.js";
import {
    renderizarReceitas, abrirModalCriarReceita, materiaisAgregadosPorQualidade, planejarConsumoMaterial
} from "./abas/receitas.js";
import { renderizarDeterminacoes, configurarRolagemDeterminacoes } from "./abas/determinacoes.js";
import { renderizarPericias, configurarBuscaPericia, configurarModalSelecionarAlvo, prepararModalPericia } from "./abas/pericias.js";
import { renderizarInventario, criarLiItem, fecharCaixaDepositarDinheiroItem, configurarDarItem, resolverAtaque, salvarItemDoModal, atualizarCamposPorTag } from "./abas/inventario.js";
import { renderizarVeiculos, configurarFatorPrecoMateriaisVeiculo } from "./abas/veiculos.js";
import { renderizarDarknetENotas, configurarFatorPrecoDarknet } from "./abas/darknet.js";
import { renderizarCenarios, configurarCenarios, configurarPerseguicaoAtiva, fecharCaixaPegarDinheiroCenario, montarGerenciadorCenario } from "./abas/cenario.js";
import { renderizarCombate, renderizarManobrasCombate, configurarCombateAtivo, configurarAvisoTorniquete, renderizarAlertaIniciativaCombate, montarPainelIniciativaJogador, montarGerenciadorCombate } from "./abas/combate.js";
import { configurarAcoesPendentes, montarPainelAcoesPendentes, renderizarReacaoPendente, abrirAcaoMestre } from "./mestre/acoes-pendentes.js";
import { configurarPainelMestre, montarPainelXpMultiplo, montarPainelCondicaoMestre, configurarGodmode } from "./mestre/painel-mestre.js";
import { montarPainelNpcs, montarFormularioNpcDetalhado } from "./mestre/npcs.js";
import { configurarCalendario, configurarRegistroSessoes, configurarLogDados } from "./mestre/calendario.js";
import {
    renderizarSaude, renderizarSilhuetaSaude, configurarSilhuetaSaude, renderizarPopoverSilhueta, renderizarEstadoSaude, renderizarComaBadge, renderizarDesmaioBadge, renderizarEstadoEnergia, renderizarImplantes, configurarSaude, abrirModalTratarFerida, configurarAvisoCustoVida
} from "./abas/saude.js";
import {
    ATRIBUTOS_PRIMARIOS, ATRIBUTOS_SECUNDARIOS, RECURSOS, listaAlvosModificador, rotuloAlvo, somaModificadoresPara, ALVO_TESTES_POR_CATEGORIA, coletarModificadores, calcularDerivados, calcularTotalPericia, modificadoresOcasionaisDaPericia, modificadoresOcasionaisDoAlvo, rolarD20, calcularDificuldadeDefesaJogador, calcularDanoTotalArma, MAX_ATRIBUTO_JOGO, calcularEstadoSaude, aplicarEstadoSaudeVelocidade, temPericiaTreinada, calcularEstadoEnergia, rolarTesteReanimacao, DIFICULDADE_REANIMACAO, calcularAbstinenciaVicio, extrairDuracaoHorasDaDescricao, horasTotaisCalendario, calcularModificadoresVeiculo, valorManutencaoVeiculo, veiculoTemChaveDisponivel, TRATAMENTOS_FERIDA, feridaAceitaSutura, dificuldadeUpgradeVeiculo, custoUpgradeVeiculo, custoReparoVeiculo, precoVeiculoComFator, veiculoTemKitFerramentasSuficiente, zerarDeterioracoesDoAtributoVeiculo, atributoEfetivoVeiculo, aplicarDanoVeiculo, pvMaxVeiculo, veiculoAtendeRequisitosManobra, resolverEfeitoManobra, pontosPorResultadoTesteFuga, slotsAcessoriosLivres, podeInstalarAcessorio, efeitoOleoVeiculo, efeitoCospePregoVeiculo, itensArmaInstaladosEmVeiculo, instalarArmaNoVeiculo, dificuldadeItemDarknet, tomadaSlotsOcupados, TIPOS_FERIDA
} from "./regras.js";
import {
    PERICIAS_MANUAL, CATEGORIAS_PERICIA, buscarPericiaPorNome, TAGS_ITEM, NIVEIS_ARMA, TIPOS_DANO, ESCALAS_ARMA, MODIFICACOES_ARMA_SUGERIDAS, ehArma, ehExplosivo, ehArmaOuExplosivo, ehDroga, ehProdutoQuimico, MODULOS_DETONACAO, ehProjetil, tagTemNivel, tagPermiteLimiteRolagemPorNivel, rotuloTag, tagExigePericiaUso, tagTemPericiaUso, ehTagMultiPericia, periciaUsoComoArray, tagTemQuantidadeGeral, ehTagQuePodeSerSaldo, todosOsSaldos, CLASSES_PROTECAO, ehArmaDeFogo, tagExigeClasseProtecao, calibresPorClasse, rotuloCalibre, calibreSugereDilacera, tagUsaCalibreEspecifico, ehCalibreEscopeta, tagExigeCapacidadeCarregador, tagExigeQuantidadeProjetil, tagPodeReduzirDano, LOCAIS_PROTECAO, tagExigeLocalProtegido, ALCANCES_ARMA_FOGO, PADROES_RECUO, bonusEsquivaBoxe, atendeRequisitoPericia, atendeRequisitoCriarReceita, PERICIAS_APARAR, LOCAIS_MIRA, difModLocalMira, labelLocalFerida, MANOBRA_ARREMESSAR_CQC, MANOBRA_IMOBILIZAR_CQC, PERICIAS_IMOBILIZAR_CQC, danoQuedaJiuJitsu, MANOBRA_IMOBILIZAR_JIUJITSU, MANOBRA_QUEBRAR_OSSOS_JIUJITSU, danoQuebrarOssosJiuJitsu, MATERIAIS_CRIACAO, qualidadesDoMaterial, ehFerramentaCriacaoGeral, PERICIAS_FERRAMENTA_CRIACAO, CATALOGO_DROGAS, rotuloAtributoVeiculo, ATRIBUTOS_VEICULO, TIPOS_VEICULO, escalaVeiculo, ehChaveVeiculo, PERICIAS_MECANICO_VEICULO, MANOBRAS_VEICULO, buscarManobraVeiculo, bairroPerseguicao, tabelaPontuacaoFugaCadastrada, bairroTemDificuldadeRotaFuga, CATALOGO_ACESSORIOS_VEICULO, buscarAcessorioVeiculo, calcularDificuldadeQuimico, EFEITOS_MATERIAL_QUIMICO, resolverNivelMaterial, NOME_MATERIAL_VEICULO_TRANSPORTE, resolverTipoEntregaQuimico, rotuloSubtipoImplante, subtipoContaComoImplante, PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA, TOMADA_NIVEIS, CHIP_NIVEIS, slotsTomada, efeitoChip, ZONAS_SILHUETA, CATALOGO_EFEITOS_MEDICOS, efeitoMedicoPorKey, TRATAMENTOS_FERIDA_MEDICO, TIPOS_FERIDA_MEDICO
} from "./dados-manual.js";
import { normalizarFicha, normalizarNpcComoFicha } from "./normalizacao.js?v=20260822-fixhistorico";
import {
    listaCategorias, nomeCategoria, criarCategoriaCustom, pesoTotalPorCategoria, itemPodeUsar, itemPodeUsarEmCasa, itemPodeEquipar, itemEhEquipavel, listaArmasInventario, listaCarregadoresInventario, listaProjeteisInventario, carregadorEstaAnexado, ehContainer, itensDentroDe, listaContainersDisponiveis, TAMANHOS_ITEM, volumeTotalDentroDe, SUBTIPOS_PORTE, itemPodeSerLevadoSolto
} from "./inventario.js";
import {
    funcaoDe, calcularPontosAtributoTotais, aplicarAtributosFixosFuncao, aplicarItemPericiaInicialFuncao, opcoesPericiaFuncao, pontosFuncaoDe, LIMITES_CRIACAO, pontosBonusPorDesvantagens, podeAdicionarDesvantagem, MAX_DESVANTAGENS, listaFuncoes
} from "./criacao.js";
import {
    iniciarLevelUpSeNecessario, confirmarPassoAtributo, executarPassoDadoVida, gastarPontoPericiaLevelUp, finalizarLevelUp, podeComprarEspecializacao, gastarPontoEspecializacaoLevelUp
} from "./levelup.js";
import {
    garantirCalendarioInicial, diasSemana, climas, registrarRolagem
} from "./calendario.js";
import {
    PADROES_DE_VIDA, custoSemanalTotal, ouvirTodasAsFichas, darXp, ouvirXpHistorico, ouvirFatorPrecoDarknet, aplicarDano, causarDanoVeiculo, testarSangramentoProfundo, ouvirNpcs, criarAcaoPendente, confirmarAcaoPendente, iniciarIniciativaCombate, avancarTurnoCombate, consumirAcaoCombate, consumirAcaoExtraCQC, participantesElegiveisCQCIniciativa, adicionarEsquivaExtra, consumirContraAtaquePendente, definirAgarrado, definirDerrubado, levantarDerrubado, definirImobilizado, soltarImobilizado, marcarDispararAvancarUsado, definirAlcanceLimitado, soltarAlcanceLimitado, definirDesacordado, definirOssosQuebrados, aplicarSangramento, aplicarInfeccao, reverterComaGodmode, acordarDesmaioGodmode, adicionarItemCenario, adicionarVeiculoCenario, editarVeiculoCenario, aparecerVeiculoNoCenario, removerVeiculoDoCenario, adicionarExplosivoCenario, adicionarQuimicoCenario, liberarQuimicoCenario, curarAlvo, aplicarDanoContinuoQuimico, aplicarPenalidadeTemporizada, aplicarDesmaioTemporizado, aplicarTesteAtrasado, aplicarPerdaAcaoTemporizada, registrarPontosPerseguicao, registrarTentativaRotaFugaPerseguicao
} from "./mestre.js?v=20260830-npcnivelpv";
import {
    criarFerida, ouvirFeridas, tratarFerida, removerFerida, aplicarTickSangramento
} from "./saude.js";
import {
    ouvirItensGlobais, buscarItensGlobaisPorNome, salvarItemNoBanco, atualizarItemBanco, excluirItemBanco, autopreencherItemDoBanco
} from "./itens-globais.js";
import {
    ouvirReceitasGlobais
} from "./receitas-globais.js";
import {
    calcularSecundariosNpc
} from "./npc-detalhado.js";
// ---------------------------------------------------------------------
// Sessão
// ---------------------------------------------------------------------
const sessaoRaw = localStorage.getItem("cdn_session");

if (sessaoRaw) {
    try {
        const parsed = JSON.parse(sessaoRaw);
        if (parsed && parsed.role && parsed.mesaId) estado.sessao = parsed;
    } catch (e) {
        estado.sessao = null;
    }
}
if (!estado.sessao) {
    // Também cai aqui pra sessões salvas ANTES da mesa existir (sem
    // mesaId) — precisam logar de novo pra escolher/confirmar a mesa.
    localStorage.removeItem("cdn_session");
    window.location.href = "index.html";
    throw new Error("Sem sessão válida — redirecionando para o login."); // interrompe a execução do módulo
}

estado.isMestre = estado.sessao.role === "mestre";
estado.fichaAtualId = estado.isMestre ? "" : estado.sessao.idLimpo;

// Campos que só o Mestre pode editar diretamente na ficha de um jogador.
// Saldos (dinheiro) não entram mais aqui — viraram uma lista dinâmica
// em estado.fichaAtual.saldos, com a própria trava aplicada em renderizarSaldos().
export const CAMPOS_SO_MESTRE = ["nivel", "xp"];

// ---------------------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------------------

// Guarda o PV atual da última sincronização (e de qual ficha/NPC era)
// só pra detectar queda de PV entre um snapshot e outro e disparar o
// efeito de tela (flash + tremor) de "acabou de levar dano" — ver
// dispararEfeitoDanoSeCaiu() logo abaixo de ativarSincronizacao().

// "Atuar como NPC" (só Mestre): quando ativo, a tela inteira da Ficha
// passa a ler/escrever em `npcs/{estado.npcAtualId}` em vez de `fichas/{id}`
// — ver caminhoBase() e ativarSincronizacao(). Permite ao Mestre usar a
// MESMA interface de perícias/manobras de combate/itens do jogador pra
// agir por um NPC (modoDetalhado) durante o combate.

// Ponte entre o modal de receita e o modal de item: quando o Mestre/
// jogador clica em "+ Criar item no Banco Global" dentro do modal de
// receita, guardamos aqui o rascunho da receita (tudo que já tinha sido
// preenchido) e saímos pro modal de item. fecharModal() (chamado tanto
// ao salvar quanto ao cancelar o modal de item) reabre a receita sozinho
// — com o vínculo (itemGlobalId) se um item novo realmente foi criado
// no Banco, ou sem vínculo (mas com o rascunho intacto) se a pessoa
// cancelou. Ver retomarReceitaAoFecharModal.

// Fluxo "+ Criar item no Banco Global" de dentro do modal de receita
// (ver abrirModalCriarReceita): pro JOGADOR, esse item é só um
// PROTÓTIPO/catálogo pra vincular a receita — item da receita ≠ item
// físico na mão do personagem. Antes disso, salvar aqui reusava o modal
// normal de "+ Adicionar item" (lista "inventario"), que sempre grava
// uma cópia no inventário da ficha além de mandar pro Banco Global —
// então o protótipo da receita aparecia (errado) no inventário do
// jogador. Esta flag, setada só nesse fluxo específico, faz
// salvarItemDoModal pular a gravação em estado.fichaAtual.inventario e salvar
// SÓ no Banco Global — ver estado.criarItemApenasNoBanco mais abaixo.

// Quando setado (ver abrirModalNovoItemParaCenario), o próximo save do
// modal de item "itensGlobais" não grava no Banco Global — grava direto
// como item solto no cenário com este id (salvarItemBancoDoModal decide
// o destino olhando essa variável). Sempre resetado depois de usado, e
// também ao abrir/fechar o modal por qualquer outro caminho, pra nunca
// vazar pra uma criação de item comum.

// Sub-opção do Godmode: só some a penalidade de Machucado/Muito
// Machucado quando ESSA também estiver marcada (ver configurarGodmode).

// Ajuste de preço (%) que a mesa aplica sobre os valores de referência
// do mecânico de veículos (CN$ de Melhorar/Reparar — Fase 3). 0 = preço
// padrão do manual. Cacheado aqui via listener em tempo real (mesmo
// padrão do estado.godmodeAtivo acima), pra qualquer modal já montar com o
// valor certo sem precisar de leitura extra no banco. Ver
// configurarFatorPrecoMateriaisVeiculo.

// CN$ por ponto de dificuldade no sorteio de itens da Dark Net
// (Creators/BlackPrint — ver dificuldadeItemDarknet em regras.js,
// plano-darknet-passo9.txt Parte 4). Mesmo padrão de cache local do
// fator de veículos acima. Padrão 50 até o primeiro valor chegar do
// Firebase (ver ouvirFatorPrecoDarknet).

// Guarda { pvPerdidos, diasNecessarios } calculados no último render dos
// Recursos Vitais, pra o clique em "Solicitar recuperação de PVs" (ver
// configurarRecuperacaoPV) montar o pedido sem precisar recalcular tudo
// de novo — null quando não há PV perdido ou já existe recuperação ativa.

// Último { d, pvMaximoTotal } passado pra renderizarRecuperacaoPV (Etapa
// 6 do plano de saúde) — guardado pra poder re-renderizar o painel de
// recuperação de PV quando as FERIDAS mudam (listener separado de
// ouvirFeridas, ver configurarSaude), sem precisar duplicar aqui todo o
// cálculo de pvMaximoTotal que já acontece em renderizarAtributos.

// Cache local do Banco Global de Itens — carregado pra todo mundo (jogador
// e Mestre), já que o autocompletar do modal de item precisa dele em
// qualquer ficha, não só na Biblioteca do Painel do Mestre.

// Cache local dos NPCs da mesa (Painel de NPCs) — mesmo espírito dos
// dois acima. Alimentado por um listener próprio (ver "cache de npcs"
// no init), separado do listener local que montarPainelNpcs já usa pra
// desenhar a lista em tempo real; existe só pra dar acesso rápido à
// lista de categorias já usadas ao abrir o formulário de criar/editar
// NPC (inclusive fora do Painel de NPCs, ver abrirEdicaoNpcDetalhado).

// IDs de itens-recipiente atualmente "abertos" (expandidos) na lista do
// Inventário — só existe em memória local, não é salvo na ficha; some
// ao recarregar a página. Ver renderizarInventario.

// Imagem em edição no modal de item (data URL da miniatura já
// redimensionada, ou null se o item não tem/não vai ter imagem) — vive
// só em memória enquanto o modal está aberto; ver limparImagemModal,
// definirImagemModalAPartirDeArquivo e o campo `imagem` gravado junto
// do resto do item em salvarItemDoModal/salvarItemBancoDoModal.

// Feridas da ficha atualmente aberta (ver saude.js / aba "Saúde").
// Diferente de estado.cenariosCache, não é compartilhado entre todo mundo — é
// específico da estado.fichaAtualId, e por isso precisa de um listener próprio
// que é re-registrado sempre que a ficha ativa muda (ver configurarSaude).
// Escopo desta fase: só fichas de jogador (estado.modoNpc fica de fora).

// Histórico de XP da ficha atualmente aberta (plano-registro-xp.txt) —
// mesmo padrão de estado.feridasCache/estado.unsubFeridas acima: listener próprio,
// re-registrado só quando a ficha ativa muda de verdade.

// Limpeza do listener local "ao vivo" de qualquer painel do Mestre que
// tenha um (Painel de NPCs, Biblioteca de Itens, Biblioteca de Receitas
// — ver plano-busca-categorias.txt, Fase B): cada um desses painéis
// assina seu próprio onValue pra atualizar a lista sem perder o que o
// Mestre digitou na busca/categoria (mesmo espírito de estado.unsubFeridas
// acima). Como o corpo do Painel do Mestre é reaproveitado por várias
// telas diferentes (abrirAcaoMestre, fecharAcaoMestre e a navegação
// direta de abrirEdicaoNpcDetalhado), guardamos aqui só a função de
// desinscrição do painel ATUALMENTE montado — chamar
// definirLimpezaPainelMestre desliga a anterior antes de guardar a
// nova, então nunca ficam dois listeners do mesmo tipo de painel vivos
// ao mesmo tempo.

// Semáforo: quando > 0, o listener onValue de ativarSincronizacao ignora
// os snapshots recebidos, pra evitar que o Firebase re-entregue um estado
// parcialmente escrito durante uma sequência de múltiplos updates.
// Incrementar antes de qualquer update composto, decrementar ao final.

// Constantes usadas dentro de funções de renderização chamadas a partir
// de init() (via callback do Firebase) — ficam aqui no topo, antes de
// qualquer chamada, pra evitar erro de "acesso antes da inicialização"
// (temporal dead zone) caso o SDK do Firebase entregue algum snapshot
// de forma síncrona (cache local) em vez de assíncrona.
const TITULOS_MODAL = {
    pericias: "Perícia", inventario: "Item de inventário", vantagens: "Vantagem",
    desvantagens: "Desvantagem", fatosUniversais: "Fato universal",
    especializacoes: "Especialização", gastosExtras: "Gasto semanal extra",
    itensGlobais: "Item do Banco Global", veiculos: "Veículo"
};
// Vantagens, Desvantagens e Fatos Universais só podem ser adicionados,
// editados ou removidos livremente pelo jogador durante a Criação de
// Personagem — depois disso, só o Mestre mexe (correção de exploit).
const LISTAS_CARACTERISTICA_NARRATIVA = ["vantagens", "desvantagens", "fatosUniversais"];

// Categorias fixas da navegação em 2 camadas (categoria → sub-aba) e
// chaves de localStorage do layout — ver montarNavegacaoAbas() mais
// abaixo. Precisam ficar definidas antes do init() ser chamado, senão
// dá erro de "Cannot access before initialization" (a const ainda não
// existe no momento em que montarNavegacaoAbas() é executada).
const CATEGORIAS_ABAS = [
    { chave: "personagem", abas: ["perfil", "atributos", "pericias", "vant-desv", "especializacoes"] },
    { chave: "recursos", abas: ["inventario", "financas", "receitas", "darknet"] },
    { chave: "jogo", abas: ["combate", "saude", "veiculos", "cenario"] },
    { chave: "progresso", abas: ["treinamento", "notas"] },
];
function categoriaDaAba(dataTab) {
    const cat = CATEGORIAS_ABAS.find(c => c.abas.includes(dataTab));
    return cat ? cat.chave : CATEGORIAS_ABAS[0].chave;
}
const CHAVE_SPLIT_ATIVO = "cdn_split_ativo";
const CHAVE_ABA_POR_CATEGORIA = "cdn_aba_por_categoria"; // { principal: {personagem:"perfil",...}, secundario: {...} }

// ---------------------------------------------------------------------
// Elementos
// ---------------------------------------------------------------------
export const el = {
    carregando: document.getElementById("tela-carregando"),
    app: document.getElementById("app"),
    nomeFichaAtiva: document.getElementById("nome-ficha-ativa"),
    userRole: document.getElementById("user-role"),
    mesaIndicador: document.getElementById("mesa-indicador"),
    godmodeIndicador: document.getElementById("godmode-indicador"),
    modalSessoes: document.getElementById("modal-sessoes"),
    btnFecharSessoes: document.getElementById("btn-fechar-sessoes"),
    btnNovaSessao: document.getElementById("btn-nova-estado.sessao"),
    sessoesForm: document.getElementById("sessoes-form"),
    sessaoNome: document.getElementById("estado.sessao-nome"),
    sessaoDiaInicio: document.getElementById("estado.sessao-dia-inicio"),
    sessaoDiaFim: document.getElementById("estado.sessao-dia-fim"),
    sessaoDescricao: document.getElementById("estado.sessao-descricao"),
    sessaoXp: document.getElementById("estado.sessao-xp"),
    btnSalvarSessao: document.getElementById("btn-salvar-estado.sessao"),
    btnCancelarSessao: document.getElementById("btn-cancelar-estado.sessao"),
    sessoesLista: document.getElementById("sessoes-lista"),
    painelMestreSeletor: document.getElementById("painel-mestre-seletor"),
    selectFicha: document.getElementById("select-ficha"),
    selectNpcAtuar: document.getElementById("select-npc-atuar"),
    syncIndicator: document.getElementById("sync-indicator"),
    btnLogout: document.getElementById("btn-logout"),
    btnAbrirMapa: document.getElementById("btn-abrir-mapa"),
    // btnAbrirMestre / badgePendentes não existem mais: o Painel do
    // Mestre deixou de ser um painel que se abre por botão e passou a
    // morar embutido direto na gaveta de Ações Pendentes (ver
    // drawer-pendentes-secao-mestre em ficha.html).
    btnPendentesLateral: document.getElementById("btn-pendentes-lateral"),
    badgePendentesLateral: document.getElementById("badge-pendentes-lateral"),
    drawerPendentes: document.getElementById("drawer-pendentes"),
    drawerPendentesCorpo: document.getElementById("drawer-pendentes-corpo"),
    drawerPendentesFechar: document.getElementById("drawer-pendentes-fechar"),
    btnAbrirCombate: document.getElementById("btn-abrir-combate"),
    modalCombateMestre: document.getElementById("modal-combate-mestre"),
    combateMestreCorpo: document.getElementById("combate-mestre-corpo"),
    combateMestreFechar: document.getElementById("combate-mestre-fechar"),
    btnAbrirCenario: document.getElementById("btn-abrir-cenario"),
    modalCenarioMestre: document.getElementById("modal-cenario-mestre"),
    cenarioMestreCorpo: document.getElementById("cenario-mestre-corpo"),
    cenarioMestreFechar: document.getElementById("cenario-mestre-fechar"),
    topbar: document.querySelector(".topbar"),
    btnAbrirInfoTopo: document.getElementById("btn-abrir-info-topo"),
    painelInfoTopo: document.getElementById("painel-info-topo"),
    btnSalvar: document.getElementById("btn-salvar"),
    saveStatus: document.getElementById("save-status"),
    paineisArea: document.getElementById("paineis-area"),
    btnTelaDividida: document.getElementById("btn-tela-dividida"),
    slotPrincipal: document.getElementById("slot-principal"),
    slotSecundario: document.getElementById("slot-secundario"),
    tabPanelsPrincipal: document.getElementById("tab-panels-principal"),
    tabPanelsSecundario: document.getElementById("tab-panels-secundario"),
    navPrincipal: document.getElementById("nav-principal"),
    navSecundaria: document.getElementById("nav-secundaria"),
    categoriasNavPrincipal: document.getElementById("categorias-nav-principal"),
    categoriasNavSecundaria: document.getElementById("categorias-nav-secundaria"),
    tabsNavPrincipal: document.getElementById("tabs-nav-principal"),
    tabsNavSecundaria: document.getElementById("tabs-nav-secundaria"),
    gridAtributosPrimarios: document.getElementById("grid-atributos-primarios"),
    gridAtributosSecundarios: document.getElementById("grid-atributos-secundarios"),
    gridRecursos: document.getElementById("grid-recursos"),
    estadoSaudeBadge: document.getElementById("estado-saude-badge"),
    comaBadge: document.getElementById("coma-badge"),
    desmaioBadge: document.getElementById("desmaio-badge"),
    estadoEnergiaBadge: document.getElementById("estado-energia-badge"),
    vitalPvFill: document.getElementById("vital-pv-fill"),
    vitalPvNumero: document.getElementById("vital-pv-numero"),
    vitalEnergiaFill: document.getElementById("vital-energia-fill"),
    vitalEnergiaNumero: document.getElementById("vital-energia-numero"),
    vitalEquipados: document.getElementById("vital-equipados"),
    vitalStatusCarrossel: document.getElementById("vital-status-carrossel"),
    vitalStatusIcone: document.getElementById("vital-status-icone"),
    vitalStatusTexto: document.getElementById("vital-status-texto"),
    efeitoDanoOverlay: document.getElementById("efeito-dano-overlay"),
    overlayMorte: document.getElementById("overlay-morte"),
    overlayMorteTitulo: document.getElementById("overlay-morte-titulo"),
    overlayMorteTexto: document.getElementById("overlay-morte-texto"),
    btnNaoQueroMorrer: document.getElementById("btn-nao-quero-morrer"),
    overlayMorteResultado: document.getElementById("overlay-morte-resultado"),
    btnReviverGodmode: document.getElementById("btn-reviver-godmode"),
    btnEasterEgg: document.getElementById("btn-easter-egg"),
    overlayEasterEgg: document.getElementById("overlay-easter-egg"),
    listaPericias: document.getElementById("lista-pericias"),
    btnAddPericia: document.getElementById("btn-add-pericia"),
    listaVantagens: document.getElementById("lista-vantagens"),
    btnAddVantagem: document.getElementById("btn-add-vantagem"),
    listaDesvantagens: document.getElementById("lista-desvantagens"),
    btnAddDesvantagem: document.getElementById("btn-add-desvantagem"),
    listaFatos: document.getElementById("lista-fatos"),
    btnAddFato: document.getElementById("btn-add-fato"),
    bonusDesvantagensArea: document.getElementById("bonus-desvantagens-area"),
    listaEspecializacoes: document.getElementById("lista-especializacoes"),
    listaGastosExtras: document.getElementById("lista-gastos-extras"),
    resumoCustoSemanal: document.getElementById("resumo-custo-semanal"),
    fPadraoVida: document.getElementById("f-padrao-vida"),
    financasSaldoHint: document.getElementById("financas-saldo-hint"),
    financasSaldosGrid: document.getElementById("financas-saldos-grid"),
    btnAddSaldo: document.getElementById("btn-add-saldo"),
    financasGastarBloco: document.getElementById("financas-gastar-bloco"),
    financasGastarOrigem: document.getElementById("financas-gastar-origem"),
    financasGastarValor: document.getElementById("financas-gastar-valor"),
    financasGastarBtn: document.getElementById("financas-gastar-btn"),
    financasTransformarItemBtn: document.getElementById("financas-transformar-item-btn"),
    financasMoverBloco: document.getElementById("financas-mover-bloco"),
    financasMoverOrigem: document.getElementById("financas-mover-origem"),
    financasMoverDestino: document.getElementById("financas-mover-destino"),
    financasMoverValor: document.getElementById("financas-mover-valor"),
    financasMoverBtn: document.getElementById("financas-mover-btn"),
    financasGanhoFixo: document.getElementById("financas-ganho-fixo"),
    financasGanhoFixoSalvar: document.getElementById("financas-ganho-fixo-salvar"),
    resumoCarga: document.getElementById("resumo-carga"),
    resumoMaos: document.getElementById("resumo-maos"),
    inventarioCategoriasNav: document.getElementById("inventario-categorias-nav"),
    inventarioListas: document.getElementById("inventario-listas"),
    listaArmasCombate: document.getElementById("lista-armas-combate"),
    listaManobrasCombate: document.getElementById("lista-manobras-combate"),
    veiculosLista: document.getElementById("veiculos-lista"),
    btnAddVeiculo: document.getElementById("btn-add-veiculo"),
    cenarioLista: document.getElementById("cenario-lista"),
    saudeLista: document.getElementById("saude-lista"),
    saudeSilhuetaSvg: document.getElementById("saude-silhueta-svg"),
    saudeSilhuetaWrap: document.getElementById("saude-silhueta-wrap"),
    saudeSilhuetaOverlays: document.getElementById("saude-silhueta-overlays"),
    saudeSilhuetaLegenda: document.getElementById("saude-silhueta-legenda"),
    saudeSilhuetaPopover: document.getElementById("saude-silhueta-popover"),
    saudeSilhuetaPopoverCorpo: document.getElementById("saude-silhueta-popover-corpo"),
    saudeSilhuetaPopoverFechar: document.getElementById("saude-silhueta-popover-fechar"),
    implantesLista: document.getElementById("implantes-lista"),
    implantesContador: document.getElementById("implantes-contador"),
    implantesPendentesMestre: document.getElementById("implantes-pendentes-mestre"),
    mestreComaPainel: document.getElementById("mestre-coma-painel"),
    mestreDesmaioPainel: document.getElementById("mestre-desmaio-painel"),
    btnTratarOutroJogador: document.getElementById("btn-tratar-outro-jogador"),
    btnMestreAplicarFerida: document.getElementById("btn-mestre-aplicar-ferida"),
    modalCampoTipoVeiculo: document.getElementById("modal-campo-tipo-veiculo"),
    modalTipoVeiculo: document.getElementById("modal-tipo-veiculo"),
    modalConfigVeiculo: document.getElementById("modal-config-veiculo"),
    modalVeiculoAtributos: document.getElementById("modal-veiculo-atributos"),
    modalSecaoNarrativa: document.getElementById("modal-secao-narrativa"),
    treinoGrid: document.getElementById("treino-grid"),
    receitasLista: document.getElementById("receitas-lista"),
    hintNivelXp: document.getElementById("hint-nivel-xp"),
    xpHistoricoContador: document.getElementById("xp-historico-contador"),
    xpHistoricoLista: document.getElementById("xp-historico-lista"),
    avisoCriacaoPendente: document.getElementById("aviso-criacao-pendente"),
    btnContinuarCriacao: document.getElementById("btn-continuar-criacao"),
    modal: document.getElementById("modal-entidade"),
    modalTitulo: document.getElementById("modal-titulo"),
    modalNome: document.getElementById("modal-nome"),
    modalCampoSubstanciaVicio: document.getElementById("modal-campo-substancia-vicio"),
    modalSubstanciaVicio: document.getElementById("modal-substancia-vicio"),
    modalSubstanciaVicioOpcoes: document.getElementById("modal-substancia-vicio-opcoes"),
    modalItemBancoOpcoes: document.getElementById("modal-item-banco-opcoes"),
    modalCampoSalvarBanco: document.getElementById("modal-campo-salvar-banco"),
    modalSalvarBanco: document.getElementById("modal-salvar-banco"),
    modalCampoCategoriaPericia: document.getElementById("modal-campo-categoria-pericia"),
    modalCategoriaPericia: document.getElementById("modal-categoria-pericia"),
    modalCampoPericiaBusca: document.getElementById("modal-campo-pericia-busca"),
    modalPericiaBusca: document.getElementById("modal-pericia-busca"),
    modalPericiaOpcoes: document.getElementById("modal-pericia-opcoes"),
    modalPericiaValor: document.getElementById("modal-pericia-valor"),
    modalCampoNivel: document.getElementById("modal-campo-nivel"),
    modalNivel: document.getElementById("modal-nivel"),
    modalCampoTag: document.getElementById("modal-campo-tag"),
    modalTag: document.getElementById("modal-tag"),
    modalCampoImagem: document.getElementById("modal-campo-imagem"),
    modalImagemArquivo: document.getElementById("modal-imagem-arquivo"),
    modalImagemPreview: document.getElementById("modal-imagem-preview"),
    btnEscolherImagemItem: document.getElementById("btn-escolher-imagem-item"),
    btnRemoverImagemItem: document.getElementById("btn-remover-imagem-item"),
    modalCampoEquipavel: document.getElementById("modal-campo-equipavel"),
    modalEquipavel: document.getElementById("modal-equipavel"),
    modalCampoMaosNecessarias: document.getElementById("modal-campo-maos-necessarias"),
    modalMaosNecessarias: document.getElementById("modal-maos-necessarias"),
    modalCampoNivelTag: document.getElementById("modal-campo-nivel-tag"),
    modalNivelTag: document.getElementById("modal-nivel-tag"),
    modalCampoLimitarRolagem: document.getElementById("modal-campo-limitar-rolagem"),
    modalLimitarRolagem: document.getElementById("modal-limitar-rolagem"),
    modalCampoInstalarVeiculo: document.getElementById("modal-campo-instalar-veiculo"),
    modalInstalarVeiculo: document.getElementById("modal-instalar-veiculo"),
    modalCampoPericiaUso: document.getElementById("modal-campo-pericia-uso"),
    modalCampoEspecializacaoPericia: document.getElementById("modal-campo-especializacao-pericia"),
    modalEspecializacaoPericia: document.getElementById("modal-especializacao-pericia"),
    hintFerramentaCriacaoGeral: document.getElementById("hint-ferramenta-criacao-geral"),
    modalLabelPericiaUso: document.getElementById("modal-label-pericia-uso"),
    modalPericiaUso: document.getElementById("modal-pericia-uso"),
    modalPericiaUsoCheckboxes: document.getElementById("modal-pericia-uso-checkboxes"),
    hintPericiaUsoMultipla: document.getElementById("hint-pericia-uso-multipla"),
    modalCampoItemSaldo: document.getElementById("modal-campo-item-saldo"),
    modalItemEhSaldo: document.getElementById("modal-item-eh-saldo"),
    modalItemSaldoValorBloco: document.getElementById("modal-item-saldo-valor-bloco"),
    modalItemSaldoValor: document.getElementById("modal-item-saldo-valor"),
    modalItemSaldoEletronicoBloco: document.getElementById("modal-item-saldo-eletronico-bloco"),
    modalItemSaldoNotas: document.getElementById("modal-item-saldo-notas"),
    modalItemSaldoMoedas: document.getElementById("modal-item-saldo-moedas"),
    modalCampoClasseProtecao: document.getElementById("modal-campo-classe-protecao"),
    modalLabelClasseProtecao: document.getElementById("modal-label-classe-protecao"),
    modalClasseProtecao: document.getElementById("modal-classe-protecao"),
    modalCampoLocalProtegido: document.getElementById("modal-campo-local-protegido"),
    modalLocalProtegido: document.getElementById("modal-local-protegido"),
    modalCampoCalibre: document.getElementById("modal-campo-calibre"),
    modalCalibre: document.getElementById("modal-calibre"),
    modalCampoCarregadorCapacidade: document.getElementById("modal-campo-carregador-capacidade"),
    modalCarregadorCapacidade: document.getElementById("modal-carregador-capacidade"),
    modalCampoProjetilQuantidade: document.getElementById("modal-campo-projetil-quantidade"),
    modalProjetilQuantidade: document.getElementById("modal-projetil-quantidade"),
    modalProjetilVolumeTotal: document.getElementById("modal-projetil-volume-total"),
    modalCampoMaterialTipo: document.getElementById("modal-campo-material-tipo"),
    modalMaterialTipo: document.getElementById("modal-material-tipo"),
    modalCampoMaterialQualidade: document.getElementById("modal-campo-material-qualidade"),
    modalMaterialQualidade: document.getElementById("modal-material-qualidade"),
    modalCampoMaterialQuantidade: document.getElementById("modal-campo-material-quantidade"),
    modalMaterialQuantidade: document.getElementById("modal-material-quantidade"),
    modalCampoPeso: document.getElementById("modal-campo-peso"),
    modalLabelPeso: document.getElementById("modal-label-peso"),
    modalPeso: document.getElementById("modal-peso"),
    modalCampoVolume: document.getElementById("modal-campo-volume"),
    modalLabelVolume: document.getElementById("modal-label-volume"),
    modalVolume: document.getElementById("modal-volume"),
    modalCampoTamanho: document.getElementById("modal-campo-tamanho"),
    modalTamanho: document.getElementById("modal-tamanho"),
    modalCampoSubtipoPorte: document.getElementById("modal-campo-subtipo-porte"),
    modalSubtipoPorte: document.getElementById("modal-subtipo-porte"),
    modalCampoCompartimentos: document.getElementById("modal-campo-compartimentos"),
    modalListaCompartimentos: document.getElementById("modal-lista-compartimentos"),
    modalCampoQuantidade: document.getElementById("modal-campo-quantidade"),
    modalQuantidade: document.getElementById("modal-quantidade"),
    modalQuantidadePesoTotal: document.getElementById("modal-quantidade-peso-total"),
    modalQuantidadeVolumeTotal: document.getElementById("modal-quantidade-volume-total"),
    modalCampoCategoriaItem: document.getElementById("modal-campo-categoria-item"),
    modalCategoriaItem: document.getElementById("modal-categoria-item"),
    modalCampoCategoriaBanco: document.getElementById("modal-campo-categoria-banco"),
    modalCategoriaBanco: document.getElementById("modal-categoria-banco"),
    modalCategoriaBancoDatalist: document.getElementById("modal-categoria-banco-datalist"),
    modalCampoJaEquipar: document.getElementById("modal-campo-ja-equipar"),
    modalJaEquipar: document.getElementById("modal-ja-equipar"),
    modalCampoGuardarDentro: document.getElementById("modal-campo-guardar-dentro"),
    modalGuardarDentro: document.getElementById("modal-guardar-dentro"),
    modalConfigArma: document.getElementById("modal-config-arma"),
    modalArmaDanoBase: document.getElementById("modal-arma-dano-base"),
    modalArmaTipoDano: document.getElementById("modal-arma-tipo-dano"),
    modalCampoTipoDanoExtra: document.getElementById("modal-campo-tipo-dano-extra"),
    modalArmaTipoDanoExtra: document.getElementById("modal-arma-tipo-dano-extra"),
    modalCampoDilacera: document.getElementById("modal-campo-dilacera"),
    modalArmaDilacera: document.getElementById("modal-arma-dilacera"),
    modalCampoDilaceraGolpeNormal: document.getElementById("modal-campo-dilacera-golpe-normal"),
    modalArmaDilaceraGolpeNormal: document.getElementById("modal-arma-dilacera-golpe-normal"),
    modalCampoEscala: document.getElementById("modal-campo-escala"),
    modalArmaEscala: document.getElementById("modal-arma-escala"),
    modalConfigExplosivo: document.getElementById("modal-config-explosivo"),
    modalExplosivoModelo: document.getElementById("modal-explosivo-modelo"),
    modalExplosivoDificuldadeArmar: document.getElementById("modal-explosivo-dificuldade-armar"),
    modalExplosivoRaio: document.getElementById("modal-explosivo-raio"),
    modalExplosivoModulo: document.getElementById("modal-explosivo-modulo"),
    modalConfigImplante: document.getElementById("modal-config-implante"),
    modalImplanteSubtipo: document.getElementById("modal-implante-subtipo"),
    modalImplanteLocalBloco: document.getElementById("modal-implante-local-bloco"),
    modalImplanteLocal: document.getElementById("modal-implante-local"),
    modalImplanteDificuldadeInstalar: document.getElementById("modal-implante-dificuldade-instalar"),
    modalImplanteFuncoesEspeciais: document.getElementById("modal-implante-funcoes-especiais"),
    modalImplanteTomadaInfo: document.getElementById("modal-implante-tomada-info"),
    modalImplanteChipBloco: document.getElementById("modal-implante-chip-bloco"),
    modalImplanteChipTomada: document.getElementById("modal-implante-chip-tomada"),
    modalImplanteChipEfeitoHint: document.getElementById("modal-implante-chip-efeito-hint"),
    modalImplanteChipBlocoModificador: document.getElementById("modal-implante-chip-bloco-modificador"),
    modalImplanteChipAlvo: document.getElementById("modal-implante-chip-alvo"),
    modalImplanteChipBlocoEspecializacao: document.getElementById("modal-implante-chip-bloco-especializacao"),
    modalImplanteChipEspecializacaoPericia: document.getElementById("modal-implante-chip-especializacao-pericia"),
    modalConfigQuimico: document.getElementById("modal-config-quimico"),
    modalQuimicoRaio: document.getElementById("modal-quimico-raio"),
    modalQuimicoMateriaisLista: document.getElementById("modal-quimico-materiais-lista"),
    modalQuimicoDificuldadeUsar: document.getElementById("modal-quimico-dificuldade-usar"),
    modalQuimicoTipoEfeito: document.getElementById("modal-quimico-tipo-efeito"),
    // Carga química em arma branca (dardo/lâmina envenenada — Parte 6.2
    // do plano de automação dos materiais químicos).
    modalCampoCargaQuimica: document.getElementById("modal-campo-carga-quimica"),
    modalArmaCargaQuimica: document.getElementById("modal-arma-carga-quimica"),
    modalConfigArmaFogo: document.getElementById("modal-config-arma-fogo"),
    modalArmaCapacidade: document.getElementById("modal-arma-capacidade"),
    modalArmaDisparosTurno: document.getElementById("modal-arma-disparos-turno"),
    modalArmaPrecisao: document.getElementById("modal-arma-precisao"),
    modalArmaDificuldadeAcerto: document.getElementById("modal-arma-dificuldade-acerto"),
    modalArmaAlcance: document.getElementById("modal-arma-alcance"),
    modalArmaRecuo: document.getElementById("modal-arma-recuo"),
    modalArmaEfeitoExtra: document.getElementById("modal-arma-efeito-extra"),
    modalArmaUsaCarregador: document.getElementById("modal-arma-usa-carregador"),
    modalCampoArmaCamaraExtra: document.getElementById("modal-campo-arma-camara-extra"),
    modalArmaTemCamaraExtra: document.getElementById("modal-arma-tem-camara-extra"),
    modalCampoArmaCarregador: document.getElementById("modal-campo-arma-carregador"),
    modalArmaCarregador: document.getElementById("modal-arma-carregador"),
    modalArmaModificacoesLista: document.getElementById("modal-arma-modificacoes-lista"),
    modalArmaAddModificacao: document.getElementById("modal-arma-add-modificacao"),
    modalConfigReducaoDano: document.getElementById("modal-config-reducao-dano"),
    modalReducaoDanoLista: document.getElementById("modal-reducao-dano-lista"),
    modalDescricao: document.getElementById("modal-descricao"),
    modalListaModificadores: document.getElementById("modal-lista-modificadores"),
    modalAddModificador: document.getElementById("modal-add-modificador"),
    modalCampoEfeitosMedicos: document.getElementById("modal-campo-efeitos-medicos"),
    modalListaEfeitosMedicos: document.getElementById("modal-lista-efeitos-medicos"),
    modalAddEfeitoMedico: document.getElementById("modal-add-efeito-medico"),
    modalCancelar: document.getElementById("modal-cancelar"),
    modalExcluir: document.getElementById("modal-excluir"),
    modalSalvar: document.getElementById("modal-salvar"),
    templateModificador: document.getElementById("template-modificador"),
    templateCompartimento: document.getElementById("template-compartimento"),
    templateModificacaoArma: document.getElementById("template-modificacao-arma"),
    templateEfeitoMedico: document.getElementById("template-efeito-medico"),
    templateEfmedModificador: document.getElementById("template-efmed-modificador"),
    // calendário
    calData: document.getElementById("cal-data"),
    calDiaSemana: document.getElementById("cal-dia-semana"),
    calHora: document.getElementById("cal-hora"),
    calTemperatura: document.getElementById("cal-temperatura"),
    calClima: document.getElementById("cal-clima"),
    calendarioEdicaoMestre: document.getElementById("calendario-edicao-mestre"),
    calEditData: document.getElementById("cal-edit-data"),
    calEditDiaSemana: document.getElementById("cal-edit-dia-semana"),
    calEditHora: document.getElementById("cal-edit-hora"),
    calEditTemp: document.getElementById("cal-edit-temp"),
    calEditClima: document.getElementById("cal-edit-clima"),
    btnSalvarCalendario: document.getElementById("btn-salvar-calendario"),
    btnPassarDia: document.getElementById("btn-passar-dia"),
    btnTimeskip: document.getElementById("btn-timeskip"),
    modalTimeskip: document.getElementById("modal-timeskip"),
    timeskipDias: document.getElementById("timeskip-dias"),
    timeskipPreview: document.getElementById("timeskip-preview"),
    timeskipCancelar: document.getElementById("timeskip-cancelar"),
    timeskipConfirmar: document.getElementById("timeskip-confirmar"),
    // recuperação de PV
    recuperacaoPvPainel: document.getElementById("recuperacao-pv-painel"),
    recuperacaoPvStatus: document.getElementById("recuperacao-pv-status"),
    recuperacaoPvModo: document.getElementById("recuperacao-pv-modo"),
    recuperacaoPvModoPadrao: document.getElementById("recuperacao-pv-modo-padrao"),
    recuperacaoPvModoTratamento: document.getElementById("recuperacao-pv-modo-tratamento"),
    recuperacaoPvCheckboxes: document.getElementById("recuperacao-pv-checkboxes"),
    recuperacaoPvEspecializado: document.getElementById("recuperacao-pv-especializado"),
    recuperacaoPvHospital: document.getElementById("recuperacao-pv-hospital"),
    btnSolicitarRecuperacaoPv: document.getElementById("btn-solicitar-recuperacao-pv"),
    // log de dados
    logDados: document.getElementById("log-dados"),
    logDadosLista: document.getElementById("log-dados-lista"),
    btnToggleLog: document.getElementById("btn-toggle-log"),
    logRolarMod: document.getElementById("log-rolar-mod"),
    logRolarBtn: document.getElementById("log-rolar-btn"),
    // modais especiais
    modalCriacao: document.getElementById("modal-criacao"),
    criacaoCorpo: document.getElementById("criacao-corpo"),
    criacaoBotoes: document.getElementById("criacao-botoes"),
    modalLevelup: document.getElementById("modal-levelup"),
    levelupCorpo: document.getElementById("levelup-corpo"),
    levelupBotoes: document.getElementById("levelup-botoes"),
    // modalMestre / mestreFechar não existem mais — mestreCorpo agora
    // mora dentro da gaveta de Ações Pendentes (#drawer-pendentes), que
    // já tem seu próprio botão de fechar (drawerPendentesFechar).
    mestreCorpo: document.getElementById("mestre-corpo"),
    mestreCorpoTopo: document.getElementById("mestre-corpo-topo"),
    mestreCorpoTitulo: document.getElementById("mestre-corpo-titulo"),
    mestreCorpoFechar: document.getElementById("mestre-corpo-fechar"),
    chkGodmode: document.getElementById("chk-godmode"),
    chkUsaEsteroides: document.getElementById("chk-usa-esteroides"),
    linhaEsteroides: document.getElementById("linha-esteroides"),
    chkGodmodeIgnorarSaude: document.getElementById("chk-godmode-ignorar-saude"),
    inputFatorPrecoMateriaisVeiculo: document.getElementById("input-fator-preco-materiais-veiculo"),
    inputFatorPrecoDarknet: document.getElementById("input-fator-preco-darknet"),
    modalCustoVida: document.getElementById("modal-custo-vida"),
    custoVidaResumo: document.getElementById("custo-vida-resumo"),
    custoVidaOrigem: document.getElementById("custo-vida-origem"),
    custoVidaConfirmar: document.getElementById("custo-vida-confirmar"),
    modalPopupTreino: document.getElementById("modal-popup-treino"),
    popupTreinoTexto: document.getElementById("popup-treino-texto"),
    popupTreinoNao: document.getElementById("popup-treino-nao"),
    popupTreinoSim: document.getElementById("popup-treino-sim"),
    modalAvisoTorniquete: document.getElementById("modal-aviso-torniquete"),
    avisoTorniqueteTexto: document.getElementById("aviso-torniquete-texto"),
    avisoTorniqueteOk: document.getElementById("aviso-torniquete-ok"),
    modalSelecionarAlvo: document.getElementById("modal-selecionar-alvo"),
    alvoTitulo: document.getElementById("alvo-titulo"),
    modalReacaoDefesa: document.getElementById("modal-reacao-defesa"),
    reacaoDefesaCorpo: document.getElementById("reacao-defesa-corpo"),
    reacaoDefesaBotoes: document.getElementById("reacao-defesa-botoes"),
    alvoSelect: document.getElementById("alvo-select"),
    alvoCampoExtra: document.getElementById("alvo-campo-extra"),
    alvoCancelar: document.getElementById("alvo-cancelar"),
    alvoConfirmar: document.getElementById("alvo-confirmar"),
    modalDarItem: document.getElementById("modal-dar-item"),
    darItemTitulo: document.getElementById("dar-item-titulo"),
    darItemSelect: document.getElementById("dar-item-select"),
    darItemCancelar: document.getElementById("dar-item-cancelar"),
    darItemConfirmar: document.getElementById("dar-item-confirmar")
};

// ---------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------
export function toast(msg, tipo = "ok") {
    const container = document.getElementById("toast");
    const div = document.createElement("div");
    div.className = "toast-msg" + (tipo && tipo !== "ok" ? ` ${tipo}` : "");
    div.innerText = msg;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3600);
}

// Lucide substitui cada <i data-lucide="nome"></i> por um <svg> — só
// precisa rodar de novo depois de qualquer innerHTML novo que tenha
// desses marcadores (ela ignora o que já foi processado, então chamar
// à toa não tem custo real).
function atualizarIcones() {
    if (window.lucide?.createIcons) window.lucide.createIcons();
}

// ---------------------------------------------------------------------
// Inicialização
// ---------------------------------------------------------------------
// init() é chamado de forma adiada (setTimeout 0) de propósito: várias
// consts usadas logo no começo da função (ex.: CATEGORIAS_ABAS,
// ABAS_OCULTAS_NPC) são declaradas mais abaixo no arquivo. Chamando
// init() direto aqui, ele roda ANTES dessas linhas serem executadas
// (o motor de JS ainda não chegou nelas), o que dá "Cannot access
// before initialization". Adiar pro próximo tick garante que o arquivo
// inteiro já terminou de rodar (todas as consts/functions do topo já
// existem) antes do init() de fato começar.
setTimeout(() => init(), 0);

async function init() {
    el.userRole.innerText = estado.isMestre ? "Mestre" : (estado.sessao.nome || "Jogador").toUpperCase();
    el.userRole.classList.add(estado.isMestre ? "mestre" : "jogador");
    if (el.mesaIndicador) el.mesaIndicador.innerText = `Mesa: ${estado.sessao.mesaId || "?"}`;

    montarGridsEstaticas();
    montarNavegacaoAbas();
    montarSelectsFixos();

    // Regra de ouro financeira/inventário: só o Mestre pode adicionar
    // item novo direto no inventário. O jogador usa "Usar"/"Mover"/"Dar",
    // e remoção/transferência sempre passam pelo Sistema de Aprovação.
    document.getElementById("btn-add-item").style.display = estado.isMestre ? "inline-block" : "none";

    // "Tratar outro jogador" (aba Saúde): só faz sentido pra quem tem
    // uma ficha própria pra rolar o teste (o Mestre não trata ninguém
    // por aqui — ver plano-sistema-saude-ferimentos.txt, seção 6).
    if (el.btnTratarOutroJogador) {
        // Fase A.2 (plano mestre-tratar-feridas): também visível pro
        // Mestre — com uma ficha de NPC aberta (estado.modoNpc), estado.fichaAtual
        // vira os dados do NPC (perícias incluídas), então esse fluxo
        // já cobre "tratador NPC" sem nenhuma tela nova.
        el.btnTratarOutroJogador.style.display = "inline-block";
        el.btnTratarOutroJogador.addEventListener("click", abrirModalTratarOutroJogador);
    }

    // "Aplicar ferida" (aba Saúde): só o Mestre — cria uma ferida
    // manualmente na ficha atualmente aberta, pra qualquer situação
    // narrativa sem golpe/ataque por trás (queda, explosão, acidente de
    // veículo etc. — ver texto do section-header em ficha.html: "fraturas
    // e queimaduras são lançadas manualmente pelo Mestre", que até agora
    // não tinha nenhum jeito de fazer isso de verdade). Escondido em
    // estado.modoNpc igual o resto da aba Saúde (NPCs não entram no sistema de
    // feridas — ver renderizarSaude).
    if (el.btnMestreAplicarFerida) {
        el.btnMestreAplicarFerida.style.display = estado.isMestre ? "inline-block" : "none";
        if (estado.isMestre) el.btnMestreAplicarFerida.addEventListener("click", abrirModalMestreAplicarFerida);
    }

    el.btnLogout.addEventListener("click", () => {
        localStorage.removeItem("cdn_session");
        window.location.href = "index.html";
    });

    el.btnAbrirMapa.addEventListener("click", () => {
        window.open("mapa.html", "_blank", "noopener");
    });

    el.btnSalvar.addEventListener("click", () => salvarTudo(true));

    el.btnNaoQueroMorrer.addEventListener("click", tentarReanimacao);
    el.btnReviverGodmode.addEventListener("click", reviverGodmode);

    // Easter egg: botão invisível no canto inferior esquerdo. Sem
    // confirmação, sem toast — só mostra o overlay. Não existe handler
    // pra escondê-lo de novo de propósito (ver overlay-easter-egg em
    // ficha.html): a única saída é atualizar a página.
    if (el.btnEasterEgg && el.overlayEasterEgg) {
        el.btnEasterEgg.addEventListener("click", () => {
            el.overlayEasterEgg.style.display = "flex";
        });
    }

    if (estado.isMestre) {
        el.painelMestreSeletor.style.display = "flex";
        el.btnPendentesLateral.style.display = "flex";
        el.btnAbrirCombate.style.display = "inline-block";
        if (el.btnAbrirCenario) el.btnAbrirCenario.style.display = "inline-block";
        el.calendarioEdicaoMestre.style.display = "block";
        ouvirListaDeFichas();
        ouvirListaDeNpcsParaAtuar();
        el.selectFicha.addEventListener("change", (e) => {
            if (e.target.value) {
                estado.modoNpc = false;
                estado.npcAtualId = null;
                if (el.selectNpcAtuar) el.selectNpcAtuar.value = "";
                estado.fichaAtualId = e.target.value;
                ativarSincronizacao();
            }
        });
        if (el.selectNpcAtuar) {
            el.selectNpcAtuar.addEventListener("change", (e) => {
                if (e.target.value) {
                    estado.modoNpc = true;
                    estado.npcAtualId = e.target.value;
                    // estado.fichaAtualId de uma ficha de jogador escolhida antes
                    // (ou nunca escolhida) precisa ser zerado aqui — senão
                    // ele fica "grudado" na memória e o filtro de auto-alvo
                    // do Gerenciador de Combate (abrirModalSelecionarAlvo)
                    // passa a excluir, por engano, o participante que tem
                    // esse id antigo, mesmo sem ter nada a ver com o NPC
                    // que o Mestre está controlando agora.
                    estado.fichaAtualId = "";
                    el.selectFicha.value = "";
                    ativarSincronizacao();
                }
            });
        }
        el.app.style.display = "flex";
        el.carregando.style.display = "none";
        renderTudoVazio();
        configurarPainelMestre();
        configurarDrawerPendentes();
    } else {
        ativarSincronizacao();
    }
    configurarPainelInfoTopo();

    // Cada chamada abaixo é isolada: se uma falhar (ex: permissão negada
    // num nó do banco), as outras continuam configurando seus listeners
    // normalmente, em vez de travar a inicialização inteira da página.
    await tentarOuAvisar("calendário inicial", () => garantirCalendarioInicial(estado.isMestre));
    tentarOuAvisar("calendário (listener)", configurarCalendario);
    tentarOuAvisar("registro de sessões", configurarRegistroSessoes);
    tentarOuAvisar("log de dados", configurarLogDados);
    tentarOuAvisar("aviso de custo de vida", configurarAvisoCustoVida);
    tentarOuAvisar("popup de treinamento", configurarPopupTreinamento);
    tentarOuAvisar("aviso de torniquete", configurarAvisoTorniquete);
    tentarOuAvisar("godmode", configurarGodmode);
    tentarOuAvisar("fator de preço de materiais (veículos)", configurarFatorPrecoMateriaisVeiculo);
    tentarOuAvisar("fator de preço da Dark Net", configurarFatorPrecoDarknet);
    tentarOuAvisar("gerenciador de combate", configurarCombateAtivo);
    tentarOuAvisar("cenários", configurarCenarios);
    tentarOuAvisar("gerenciador de perseguição", configurarPerseguicaoAtiva);
    tentarOuAvisar("modal de alvo", configurarModalSelecionarAlvo);
    tentarOuAvisar("finanças", configurarFinancas);
    tentarOuAvisar("ações pendentes", configurarAcoesPendentes);
    tentarOuAvisar("recuperação de PV", configurarRecuperacaoPV);
    tentarOuAvisar("rolagem de determinações", configurarRolagemDeterminacoes);
    tentarOuAvisar("dar item", configurarDarItem);
    tentarOuAvisar("cache de fichas", () => {
        ouvirTodasAsFichas((todas) => { estado.todasAsFichasCache = todas || {}; });
    });
    // Alimenta só o cache global (autocompletar do modal de item em
    // qualquer ficha, categoriasDistintas etc.) — a "Biblioteca de
    // Itens" do Painel do Mestre, quando aberta, tem seu próprio
    // listener local (ver montarPainelBibliotecaItens) que atualiza a
    // lista em tempo real sem depender deste aqui, pra não perder o que
    // o Mestre digitou na busca/categoria a cada mudança no banco.
    tentarOuAvisar("banco global de itens", () => {
        ouvirItensGlobais((itens) => { estado.itensGlobaisCache = itens || []; });
    });

    // Banco Global de Receitas (receitas-globais.js) — mesma ideia do de
    // itens acima, só que pra receitas de criação. Alimenta a aba
    // "Receitas" da ficha; a "Biblioteca de Receitas" do Mestre tem seu
    // próprio listener local (ver montarPainelBibliotecaReceitas), pelo
    // mesmo motivo.
    tentarOuAvisar("banco global de receitas", () => {
        ouvirReceitasGlobais((receitas) => {
            estado.receitasGlobaisCache = receitas || [];
            if (estado.fichaAtual) renderizarReceitas();
        });
    });

    // Cache dos NPCs da mesa — só pra alimentar a sugestão (datalist) de
    // categoria já usada ao criar/editar um NPC (ver categoriasDistintas
    // acima), tanto de dentro do Painel de NPCs quanto ao reabrir a
    // edição de uma mini-ficha. Não redesenha nenhuma lista sozinho — o
    // Painel de NPCs continua com seu próprio listener local (ouvirNpcs
    // em montarPainelNpcs) pra desenhar a lista de cards em tempo real.
    tentarOuAvisar("cache de npcs", () => {
        ouvirNpcs((npcs) => { estado.npcsCache = npcs || []; });
    });

    tentarOuAvisar("botões de adicionar", configurarBotoesAdicionar);
    tentarOuAvisar("modal genérico", configurarModal);
    tentarOuAvisar("busca de perícia", configurarBuscaPericia);
    tentarOuAvisar("modificações de arma", configurarModificacoesArma);
    tentarOuAvisar("modificadores genéricos", configurarModificadoresGenerico);
    tentarOuAvisar("efeitos de equipamento médico", configurarEfeitosMedicosGenerico);
    tentarOuAvisar("compartimentos de recipiente", configurarCompartimentosGenerico);
    tentarOuAvisar("imagem do item", configurarImagemItemGenerico);
    tentarOuAvisar("campo substância (vício)", configurarCampoSubstanciaVicio);
    tentarOuAvisar("carrossel de status do topo", configurarStatusTopoCarrossel);
}

// Roda uma função de setup isoladamente: se ela lançar erro (síncrono ou
// numa Promise), registra no console e segue pro próximo passo, em vez de
// travar o resto da inicialização da página.
function tentarOuAvisar(nome, fn) {
    try {
        const resultado = fn();
        if (resultado && typeof resultado.catch === "function") {
            resultado.catch(e => console.error(`Falha ao configurar "${nome}":`, e));
        }
    } catch (e) {
        console.error(`Falha ao configurar "${nome}":`, e);
    }
}

function renderTudoVazio() {
    el.nomeFichaAtiva.innerText = "Selecione uma ficha";
}

// ---------------------------------------------------------------------
// Lista de fichas pro Mestre escolher
// ---------------------------------------------------------------------
function ouvirListaDeFichas() {
    onValue(ref(db, caminhoMesa("fichas")), (snapshot) => {
        const valorAntigo = el.selectFicha.value;
        el.selectFicha.innerHTML = '<option value="">-- Escolha uma ficha da rede --</option>';
        if (snapshot.exists()) {
            const todas = snapshot.val();
            Object.keys(todas).forEach(id => {
                const nomeExibicao = (todas[id].config && todas[id].config.nomeExibicao) || id;
                const opt = document.createElement("option");
                opt.value = id;
                opt.innerText = nomeExibicao;
                el.selectFicha.appendChild(opt);
            });
            if (valorAntigo && todas[valorAntigo]) {
                el.selectFicha.value = valorAntigo;
            }
        }
    });
}

// Lista de NPCs "modo detalhado" pro Mestre escolher em "Atuar como NPC".
// NPCs do gerador rápido não entram aqui — eles não têm atributos
// primários estruturados o bastante pra virar uma Ficha completa.
function ouvirListaDeNpcsParaAtuar() {
    if (!el.selectNpcAtuar) {
        console.warn('[Chuva de Neon] #select-npc-atuar não existe no HTML — o ficha.html em uso está desatualizado (não tem o seletor "Atuar como NPC").');
        return;
    }
    ouvirNpcs((lista) => {
        const valorAntigo = el.selectNpcAtuar.value;
        el.selectNpcAtuar.innerHTML = '<option value="">-- Ou atue como um NPC --</option>';
        const detalhados = (lista || []).filter(n => n.modoDetalhado);
        detalhados.forEach(n => {
            const opt = document.createElement("option");
            opt.value = n.id;
            opt.innerText = n.nome || n.id;
            el.selectNpcAtuar.appendChild(opt);
        });
        // Diagnóstico: se existem NPCs mas nenhum é "mini-ficha" (modoDetalhado),
        // deixa isso visível em vez de uma caixa silenciosamente vazia — é a causa
        // mais comum de "não aparece nada nessa caixa".
        if (lista && lista.length && !detalhados.length) {
            const optAviso = document.createElement("option");
            optAviso.value = ""; optAviso.disabled = true;
            optAviso.innerText = `(${lista.length} NPC(s) existem, mas nenhum é mini-ficha completa)`;
            el.selectNpcAtuar.appendChild(optAviso);
        }
        if (valorAntigo && (lista || []).some(n => n.id === valorAntigo)) {
            el.selectNpcAtuar.value = valorAntigo;
        }
    });
}

// Prefixo do caminho no Firebase pra ficha ativa: `fichas/{id}` no modo
// normal, `npcs/{id}` quando o Mestre está "atuando como" um NPC. Toda
// escrita da tela da Ficha passa por aqui, pra funcionar sem duplicar
// lógica pros dois casos.
export function caminhoBase() {
    return caminhoMesa(estado.modoNpc ? `npcs/${estado.npcAtualId}` : `fichas/${estado.fichaAtualId}`);
}

// Id do registro ativo, seja ficha de jogador ou NPC (modo "atuar
// como"). Usado nos vários guards genéricos "!estado.fichaAtualId" que na
// verdade só querem checar "há uma ficha carregada pra editar" — sem
// isso, esses guards ficavam presos ao id da última ficha de JOGADOR
// escolhida (ou vazio, se o Mestre nunca escolheu nenhuma) e bloqueavam
// edições enquanto o Mestre estivesse atuando só como NPC.
export function idAtivo() {
    return estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId;
}

// A lista de perícias do NPC mora em `periciasNpc` (nó também usado pelo
// mini-editor de NPC do Mestre), não em `pericias` como na ficha de
// jogador — todo o resto dos nós (inventario, categoriasInventario,
// vantagens, etc.) tem o mesmo nome nos dois lados.
function caminhoLista(lista) {
    return (estado.modoNpc && lista === "pericias") ? "periciasNpc" : lista;
}

// ---------------------------------------------------------------------
// Sincronização em tempo real com a ficha ativa
// ---------------------------------------------------------------------
export function ativarSincronizacao() {
    if (estado.listenerAtivo) {
        off(ref(db, caminhoMesa(`${estado.listenerAtivoTipo}/${estado.listenerAtivo}`)));
    }
    if (estado.modoNpc) {
        if (!estado.npcAtualId) return;
        estado.listenerAtivo = estado.npcAtualId;
        estado.listenerAtivoTipo = "npcs";
    } else {
        if (!estado.fichaAtualId) return;
        estado.listenerAtivo = estado.fichaAtualId;
        estado.listenerAtivoTipo = "fichas";
    }

    onValue(ref(db, caminhoBase()), (snapshot) => {
        if (estado._pausarListener > 0) return; // operação composta em andamento, ignorar
        el.carregando.style.display = "none";
        el.app.style.display = "flex";

        if (!snapshot.exists()) {
            toast(estado.modoNpc ? "Esse NPC não existe mais na rede." : "Essa ficha não existe mais na rede.", "erro");
            return;
        }

        if (estado.modoNpc) {
            estado.npcRawAtual = snapshot.val();
            estado.fichaAtual = normalizarNpcComoFicha(estado.npcAtualId, estado.npcRawAtual);
        } else {
            estado.fichaAtual = normalizarFicha(snapshot.val());
        }
        el.nomeFichaAtiva.innerText = ((estado.fichaAtual.config.nomeExibicao || estado.fichaAtualId).toUpperCase()) + (estado.modoNpc ? " (NPC)" : "");

        dispararEfeitoDanoSeCaiu();

        aplicarVisibilidadeAbasNpc();
        configurarSaude();
        configurarXpHistorico();

        verificarCriacaoPendente();
        verificarLevelUpPendente();
        avaliarAvisoCustoVida();

        renderizarTudo();

        // Se o wizard de criação estiver aberto (ex: jogador foi pra aba
        // "Vantagens / Desvantagens" cadastrar uma desvantagem, como o
        // hint da Etapa 5 sugere, e voltou), reconstrói a etapa atual pra
        // refletir o novo total de pontos bônus. Sem isso, o wizard ficava
        // "congelado" com o valor de antes até o jogador navegar manualmente
        // entre as etapas — e, pior, os botões +/- desse congelamento
        // mexiam numa cópia antiga de estado.fichaAtual.criacao que não ia mais
        // pro Firebase quando salva (a causa raiz do dessincronismo).
        if (el.modalCriacao && el.modalCriacao.classList.contains("active")) {
            renderEtapaCriacao();
        }

        marcarSincronizado();
    }, (error) => {
        console.error(error);
        el.syncIndicator.classList.add("offline");
        toast("Falha ao sincronizar com a rede.", "erro");
    });
}

function marcarSincronizado() {
    el.syncIndicator.classList.remove("offline");
    el.saveStatus.innerText = "sincronizado em tempo real";
}

// Compara o PV atual desta sincronização com o da anterior (mesma
// ficha/NPC) e, se caiu, dispara o efeito de tela de "acabou de levar
// dano" (flash vermelho + tremor — ver dispararEfeitoDano). Reseta a
// comparação sempre que troca de ficha/NPC (Mestre atuando por
// outro personagem, por exemplo) pra não disparar o efeito à toa na
// primeira carga.
function dispararEfeitoDanoSeCaiu() {
    const idAtual = estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId;
    if (idAtual !== estado.idUltimaSyncEfeitoDano) {
        estado.idUltimaSyncEfeitoDano = idAtual;
        estado.pvAtualUltimaSync = Number(estado.fichaAtual?.dados?.pvAtual);
        return;
    }
    const pvNovo = Number(estado.fichaAtual?.dados?.pvAtual);
    if (Number.isFinite(estado.pvAtualUltimaSync) && Number.isFinite(pvNovo) && pvNovo < estado.pvAtualUltimaSync) {
        dispararEfeitoDano();
    }
    estado.pvAtualUltimaSync = pvNovo;
}

// Efeito de tela rápido (flash vermelho + tremor) quando o personagem
// leva dano — além do texto que já aparece no Log de Dados/toast.
function dispararEfeitoDano() {
    if (el.efeitoDanoOverlay) {
        el.efeitoDanoOverlay.classList.remove("efeito-dano-ativo");
        void el.efeitoDanoOverlay.offsetWidth; // força reflow pra poder re-disparar a animação em dano seguido
        el.efeitoDanoOverlay.classList.add("efeito-dano-ativo");
    }
    if (el.app) {
        el.app.classList.remove("efeito-dano-tremor");
        void el.app.offsetWidth;
        el.app.classList.add("efeito-dano-tremor");
        setTimeout(() => el.app.classList.remove("efeito-dano-tremor"), 420);
    }
}

// Pausa o listener do onValue durante uma sequência de múltiplos updates
// pro Firebase, evitando que cada update intermediário dispare uma
// re-renderização com estado parcial. Sempre usar em par com retornarSync().
export function pausarSync() { estado._pausarListener++; }
export function retornarSync() { if (estado._pausarListener > 0) estado._pausarListener--; }

// =====================================================================
// MONTAGEM ESTÁTICA (uma vez, no load)
// =====================================================================

// =====================================================================
// NAVEGAÇÃO EM 2 CAMADAS (categoria → sub-aba) + MODO TELA DIVIDIDA
// =====================================================================
// Cada metade da tela ("principal", sempre visível, e "secundaria", só
// quando a Tela Dividida está ligada) tem seu próprio bloco de
// categoria+sub-abas (#nav-principal / #nav-secundaria), mas todos os
// <section class="tab-panel"> continuam existindo em UMA ÚNICA cópia no
// DOM (não são duplicados) — abrirAba() apenas MOVE o node do painel
// pro container do slot que pediu (appendChild), o que implica que a
// MESMA aba nunca pode estar aberta nos dois slots ao mesmo tempo (ver
// abaIndisponivelNoOutroSlot). A escolha (categoria/aba ativa em cada
// slot, e se o split está ligado) é salva por aparelho (localStorage),
// igual já era com o sistema antigo de fixar/arrastar abas.

function lerLS(chave) {
    try { return localStorage.getItem(chave); } catch { return null; }
}
function escreverLS(chave, valor) {
    try { localStorage.setItem(chave, valor); } catch { /* localStorage indisponível (modo privado etc.) */ }
}
function lerAbaPorCategoriaSalva() {
    try {
        const bruto = JSON.parse(lerLS(CHAVE_ABA_POR_CATEGORIA) || "{}");
        return {
            principal: bruto.principal || {},
            secundario: bruto.secundario || {}
        };
    } catch { return { principal: {}, secundario: {} }; }
}
let _abaPorCategoriaCache = lerAbaPorCategoriaSalva();
function lembrarAbaDaCategoria(slot, categoria, dataTab) {
    _abaPorCategoriaCache[slot][categoria] = dataTab;
    escreverLS(CHAVE_ABA_POR_CATEGORIA, JSON.stringify(_abaPorCategoriaCache));
}

// Estado de qual aba está ativa em cada slot agora mesmo (fonte da
// verdade em memória — o DOM/localStorage só refletem isso).
const estadoSlots = { principal: null, secundario: null };

function navDoSlot(slot) {
    return slot === "secundario"
        ? { nav: el.navSecundaria, categorias: el.categoriasNavSecundaria, tabs: el.tabsNavSecundaria, painelContainer: el.tabPanelsSecundario }
        : { nav: el.navPrincipal, categorias: el.categoriasNavPrincipal, tabs: el.tabsNavPrincipal, painelContainer: el.tabPanelsPrincipal };
}
function outroSlot(slot) { return slot === "principal" ? "secundario" : "principal"; }

// Abre `dataTab` no `slot` pedido: move o <section class="tab-panel">
// certo pro container daquele slot, marca a categoria/sub-aba certas
// como .active nos botões daquele slot, e lembra a escolha. Recusa se
// a aba já estiver aberta no OUTRO slot (não dá pra abrir a mesma aba
// duas vezes — é o mesmo elemento do DOM).
export function abrirAba(dataTab, slot = "principal") {
    if (slot === "secundario" && !splitAtivo) return; // slot secundário só existe com split ligado
    if (estadoSlots[outroSlot(slot)] === dataTab) {
        toast("Essa aba já está aberta na outra metade da tela.", "erro");
        return;
    }
    const painel = document.querySelector(`.tab-panel[data-tab="${dataTab}"]`);
    if (!painel) return;
    const { tabs, categorias, painelContainer } = navDoSlot(slot);
    const categoria = categoriaDaAba(dataTab);

    // Painel: tira o .active de qualquer painel que estivesse ativo
    // NESTE slot (pode ser um painel diferente, já que só um fica
    // visível por slot de cada vez) e move o novo pra dentro do container.
    if (painelContainer) {
        [...painelContainer.children].forEach(p => p.classList.remove("active"));
        painelContainer.appendChild(painel);
    }
    painel.classList.add("active");

    // Botões de sub-aba e categoria, só dentro do bloco de nav deste slot.
    if (tabs) {
        tabs.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === dataTab));
    }
    if (categorias) {
        categorias.querySelectorAll(".categoria-btn").forEach(b => b.classList.toggle("active", b.dataset.categoria === categoria));
    }
    if (tabs) {
        tabs.querySelectorAll(".tab-btn[data-categoria]").forEach(b => {
            b.classList.toggle("categoria-oculta", b.dataset.categoria !== categoria);
        });
    }

    estadoSlots[slot] = dataTab;
    lembrarAbaDaCategoria(slot, categoria, dataTab);
    atualizarBotoesIndisponiveis();
}

// Marca (visualmente, com opacidade reduzida e sem clique) a sub-aba
// que está aberta num slot dentro do bloco de nav do OUTRO slot — só
// importa enquanto o split está ligado.
function atualizarBotoesIndisponiveis() {
    ["principal", "secundario"].forEach(slot => {
        const { tabs } = navDoSlot(slot);
        if (!tabs) return;
        const abaDoOutro = estadoSlots[outroSlot(slot)];
        tabs.querySelectorAll(".tab-btn").forEach(b => {
            b.classList.toggle("indisponivel-na-outra-metade", splitAtivo && b.dataset.tab === abaDoOutro);
        });
    });
}

// Abre, dentro de um slot, a categoria pedida — e junto a última aba
// lembrada daquela categoria naquele slot (ou a primeira da lista, se
// nunca foi aberta antes, ou se a lembrada não existe mais).
function abrirCategoria(categoriaChave, slot = "principal") {
    const cat = CATEGORIAS_ABAS.find(c => c.chave === categoriaChave);
    if (!cat) return;
    const lembrada = _abaPorCategoriaCache[slot] && _abaPorCategoriaCache[slot][categoriaChave];
    const dataTab = (lembrada && cat.abas.includes(lembrada)) ? lembrada : cat.abas[0];
    abrirAba(dataTab, slot);
}

let splitAtivo = false;

function alternarTelaDividida(ligar) {
    splitAtivo = ligar;
    escreverLS(CHAVE_SPLIT_ATIVO, ligar ? "1" : "0");
    if (el.paineisArea) el.paineisArea.classList.toggle("split-ativo", ligar);
    if (el.slotSecundario) el.slotSecundario.hidden = !ligar;
    if (el.btnTelaDividida) {
        el.btnTelaDividida.classList.toggle("ativo", ligar);
        el.btnTelaDividida.innerHTML = ligar
            ? '<i data-lucide="rows-2"></i> Desligar tela dividida'
            : '<i data-lucide="rows-2"></i> Tela dividida';
        atualizarIcones();
    }
    if (ligar && !estadoSlots.secundario) {
        // Primeira vez ligando: abre uma categoria/aba diferente da que
        // já está no slot principal, senão a checagem de "já aberta no
        // outro slot" bloquearia a abertura inicial.
        const categoriaPrincipal = categoriaDaAba(estadoSlots.principal);
        const categoriaAlternativa = CATEGORIAS_ABAS.find(c => c.chave !== categoriaPrincipal) || CATEGORIAS_ABAS[0];
        abrirCategoria(categoriaAlternativa.chave, "secundario");
    }
    if (!ligar) {
        // Devolve o painel que estava ativo no secundário pro container
        // principal (sem marcar .active — ele já não é mais o painel em
        // foco de ninguém) e limpa o estado do slot, senão ele continua
        // "reservado" (bloqueando reabrir aquela aba em qualquer lugar)
        // mesmo com a Tela Dividida desligada.
        if (estadoSlots.secundario) {
            const painel = document.querySelector(`.tab-panel[data-tab="${estadoSlots.secundario}"]`);
            if (painel && el.tabPanelsPrincipal) {
                painel.classList.remove("active");
                el.tabPanelsPrincipal.appendChild(painel);
            }
        }
        estadoSlots.secundario = null;
        atualizarBotoesIndisponiveis();
    }
    aplicarVisibilidadeAbasNpc();
}

function montarNavegacaoAbas() {
    if (!el.navPrincipal) return;

    ["principal", "secundario"].forEach(slot => {
        const { nav, categorias, tabs } = navDoSlot(slot);
        if (!categorias || !tabs) return;
        categorias.querySelectorAll(".categoria-btn").forEach(btn => {
            btn.addEventListener("click", () => abrirCategoria(btn.dataset.categoria, slot));
        });
        tabs.querySelectorAll(".tab-btn[data-tab]").forEach(btn => {
            btn.addEventListener("click", () => abrirAba(btn.dataset.tab, slot));
        });
    });

    if (el.btnTelaDividida) {
        el.btnTelaDividida.addEventListener("click", () => alternarTelaDividida(!splitAtivo));
    }

    // Estado inicial: abre a categoria/aba já marcada como .active no
    // HTML (perfil, no slot principal) e restaura o modo split salvo.
    abrirAba("perfil", "principal");
    if (lerLS(CHAVE_SPLIT_ATIVO) === "1") alternarTelaDividida(true);
}

// NPCs mostram as mesmas 15 abas que uma ficha de jogador enquanto o
// Mestre estiver "atuando como" ele — nenhuma some. (Antes finanças,
// treinamento/estudo, dark net, veículos e saúde ficavam ocultas; a
// lista abaixo continua existindo, vazia, só pra não precisar reescrever
// aplicarVisibilidadeAbasNpc() caso alguma aba precise voltar a ficar
// oculta no futuro.)
const ABAS_OCULTAS_NPC = [];
function aplicarVisibilidadeAbasNpc() {
    if (!el.navPrincipal) return;
    ["principal", "secundario"].forEach(slot => {
        const { tabs } = navDoSlot(slot);
        if (!tabs) return;
        const abaAtivaOculta = estado.modoNpc && ABAS_OCULTAS_NPC.includes(estadoSlots[slot]);
        ABAS_OCULTAS_NPC.forEach(tab => {
            const btn = tabs.querySelector(`.tab-btn[data-tab="${tab}"]`);
            if (btn) btn.classList.toggle("npc-oculta", estado.modoNpc);
        });
        if (abaAtivaOculta && (slot === "principal" || splitAtivo)) {
            abrirAba("pericias", slot);
        }
    });
}

function montarGridsEstaticas() {
    // ---- Atributos primários ----
    el.gridAtributosPrimarios.innerHTML = "";
    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const card = document.createElement("div");
        card.className = "attr-card";
        card.dataset.attr = attr.key;
        card.innerHTML = `
            <label for="attr-${attr.key}">${attr.label}</label>
            <div class="attr-acoes">
                <button type="button" class="btn-rolar btn-blue" data-rolar-attr="${attr.key}" title="Rolar d20 + ${attr.label}">🎲</button>
                <input type="number" id="attr-${attr.key}" min="0" max="7" data-attr-primario="${attr.key}">
            </div>
        `;
        card.querySelector(`[data-rolar-attr="${attr.key}"]`).addEventListener("click", async () => {
            if (!estado.fichaAtual) { toast("Nenhuma ficha carregada ainda.", "erro"); return; }
            const valor = Number(estado.fichaAtual.dados[attr.key]) || 0;
            await rolarComPossibilidadeDeOcasionais(attr.label, `atributo:${attr.key}`, valor);
        });
        el.gridAtributosPrimarios.appendChild(card);
    });

    // ---- Recursos vitais (PV, Energia...) ----
    el.gridRecursos.innerHTML = "";
    RECURSOS.forEach(rec => {
        const card = document.createElement("div");
        card.className = "attr-card recurso";
        card.dataset.recurso = rec.key;
        card.innerHTML = `
            <label>${rec.label}</label>
            <div class="attr-valor-wrap">
                <input type="number" data-recurso-atual="${rec.key}">
                <span class="max-label">/ <span data-recurso-max="${rec.key}">0</span><input type="number" data-recurso-max-input="${rec.key}" style="display:none;" title="Godmode: sobrescreve o máximo calculado"></span>
            </div>
        `;
        el.gridRecursos.appendChild(card);
    });

    // ---- Atributos secundários (calculados) ----
    el.gridAtributosSecundarios.innerHTML = "";
    ATRIBUTOS_SECUNDARIOS.forEach(attr => {
        const card = document.createElement("div");
        card.className = "attr-card calculado";
        card.dataset.attrSecundario = attr.key;
        card.title = "Clique no valor pra ver o detalhamento";
        card.innerHTML = `
            <label>${attr.label}</label>
            <div class="attr-acoes">
                <button type="button" class="btn-rolar btn-blue" data-rolar-secundario="${attr.key}" title="Rolar d20 + ${attr.label}">🎲</button>
                <span class="attr-valor" data-attr-secundario-valor="${attr.key}">0</span>
            </div>
        `;
        card.querySelector(".attr-valor").addEventListener("click", (e) => { e.stopPropagation(); mostrarDetalheSecundario(attr.key); });
        card.querySelector(`[data-rolar-secundario="${attr.key}"]`).addEventListener("click", async (e) => {
            e.stopPropagation();
            const total = window._ultimosDerivados ? Math.round(window._ultimosDerivados.secundarios[attr.key].total) : 0;
            await rolarComPossibilidadeDeOcasionais(attr.label, `secundario:${attr.key}`, total);
        });
        el.gridAtributosSecundarios.appendChild(card);
    });
}

function montarSelectsFixos() {
    // ---- Padrão de vida (Perfil) ----
    el.fPadraoVida.innerHTML = '<option value="">-- escolha --</option>';
    PADROES_DE_VIDA.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.key;
        opt.innerText = `${p.label} (CN$ ${p.custoSemanal}/semana)`;
        el.fPadraoVida.appendChild(opt);
    });

    // ---- Categoria de perícia (modal) ----
    el.modalCategoriaPericia.innerHTML = '<option value="">-- escolha a categoria --</option>';
    CATEGORIAS_PERICIA.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.innerText = c.label;
        el.modalCategoriaPericia.appendChild(opt);
    });

    // ---- Tags de item (modal) ----
    // "chave" (ver plano-veiculos.txt, adendo "chave") fica sempre na
    // lista — precisa continuar aqui pra uma chave já existente
    // conseguir mostrar/editar sua própria tag corretamente — mas o
    // option some na hora de CRIAR um item novo (ver prepararModalItem
    // abaixo), porque esse item só faz sentido com um veiculoId
    // apontando pra um veículo existente, e o modal genérico não tem
    // campo pra isso. Chave de verdade nasce em salvarVeiculoDoModal
    // (ao criar o veículo) ou em reporChaveVeiculo (Mestre repondo uma
    // perdida).
    el.modalTag.innerHTML = '<option value="">-- escolha a tag --</option>';
    TAGS_ITEM.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        if (ehChaveVeiculo(t.key)) opt.dataset.chaveVeiculo = "1";
        el.modalTag.appendChild(opt);
    });

    // ---- Local protegido (modal — só pra itens de Proteção) ----
    el.modalLocalProtegido.innerHTML = '<option value="">-- escolha o que este item protege --</option>';
    LOCAIS_PROTECAO.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.key;
        opt.innerText = l.label;
        el.modalLocalProtegido.appendChild(opt);
    });

    // ---- Nível de tag (modal) ----
    el.modalNivelTag.innerHTML = "";
    NIVEIS_ARMA.forEach(n => {
        const opt = document.createElement("option");
        opt.value = n;
        opt.innerText = `Nível ${n}`;
        el.modalNivelTag.appendChild(opt);
    });

    // ---- Tipo de dano (modal) ----
    el.modalArmaTipoDano.innerHTML = "";
    TIPOS_DANO.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        el.modalArmaTipoDano.appendChild(opt);
    });

    // ---- Tipo de dano EXTRA (modal — arma branca com dois tipos de
    // dano, ex.: machadinha corte+perfurante): "Nenhum" some o campo de
    // escolha na hora de atacar (ver abrirModalSelecionarAlvo).
    el.modalArmaTipoDanoExtra.innerHTML = '<option value="">-- nenhum --</option>';
    TIPOS_DANO.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        el.modalArmaTipoDanoExtra.appendChild(opt);
    });

    // ---- Escala de arma (modal) ----
    el.modalArmaEscala.innerHTML = '<option value="">-- não se aplica --</option>';
    ESCALAS_ARMA.forEach(e => {
        const opt = document.createElement("option");
        opt.value = e.key;
        opt.innerText = e.label;
        el.modalArmaEscala.appendChild(opt);
    });

    // ---- Alcance de arma de fogo (modal) ----
    el.modalArmaAlcance.innerHTML = "";
    ALCANCES_ARMA_FOGO.forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.key;
        opt.innerText = a.label;
        el.modalArmaAlcance.appendChild(opt);
    });

    // ---- Recuo de arma de fogo (modal) ----
    el.modalArmaRecuo.innerHTML = "";
    PADROES_RECUO.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.key;
        opt.innerText = p.label;
        el.modalArmaRecuo.appendChild(opt);
    });

    // ---- Clima (calendário, edição do Mestre) ----
    el.calEditClima.innerHTML = "";
    climas().forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.innerText = c;
        el.calEditClima.appendChild(opt);
    });

    // ---- Dia da semana (calendário, edição do Mestre) ----
    el.calEditDiaSemana.innerHTML = "";
    diasSemana().forEach(d => {
        const opt = document.createElement("option");
        opt.value = d;
        opt.innerText = d;
        el.calEditDiaSemana.appendChild(opt);
    });
}

// =====================================================================
// RENDERIZAÇÃO — chamada a cada snapshot novo do Firebase
// =====================================================================

export function podeEditarPericiaAtributo() {
    if (!estado.fichaAtual) return false;
    // O Mestre pode sempre editar a ficha de um NPC que ele controla —
    // não é uma trapaça, é o dono legítimo daquele registro.
    if (estado.isMestre && estado.modoNpc) return true;
    // Godmode do mestre ignora tudo
    if (estado.isMestre && estado.godmodeAtivo) return true;
    // "Regra de ouro" — os 2 momentos legítimos de edição livre:
    // 1. Criação de personagem em andamento
    if (!estado.fichaAtual.criacao.concluida) return true;
    // 2. Level Up pendente
    if (estado.fichaAtual.levelUpPendente && estado.fichaAtual.levelUpPendente.ativo) return true;
    // Treinamento NÃO libera edição da ficha. O ganho da perícia/atributo
    // treinado é aplicado automaticamente pelo próprio sistema de
    // Treinamento (ver treinamento.js → aplicarAumentoCaracteristica,
    // chamada quando avancarDiasTreinamento bate o total de dias). Deixar
    // treinamento.ativo liberar esta função era um exploit: enquanto
    // qualquer característica estivesse em treino, o jogador podia editar
    // QUALQUER atributo/perícia da ficha livremente, não só a treinada.
    return false;
}

// Vantagens, Desvantagens e Fatos Universais: características escolhidas
// na criação do personagem (parte do pano de fundo narrativo). O jogador
// só pode cadastrá-las enquanto a criação estiver em andamento; depois
// de "criacaoConcluida", só o Mestre pode adicionar, editar ou remover
// (correção de exploit — regra 2 do pedido de refatoração).
export function podeEditarCaracteristicaNarrativa() {
    if (!estado.fichaAtual) return false;
    if (estado.isMestre) return true;
    return !estado.fichaAtual.criacao.concluida;
}

// ---------------------------------------------------------------------
// Receitas CONHECIDAS pelo personagem (diferente do Banco Global de
// Receitas em si — ver receitas-globais.js): cada perícia de criação de
// item dá direito a exatamente 1 receita GRÁTIS por nível, do nível 1
// até o nível atual da perícia (perícia nível 3 → 1 receita nível 1, 1
// nível 2, 1 nível 3). O jogador escolhe livremente entre as receitas já
// cadastradas no Banco Global pra aquele nível — mas, uma vez escolhida,
// o slot fica travado: nem o próprio jogador pode trocar ou remover essa
// escolha depois (só o Mestre). Qualquer receita ALÉM dessas gratuitas
// só entra na ficha se o Mestre adicionar (representando algo achado,
// comprado ou ensinado durante o jogo) — ver renderizarReceitas.
export function receitaLivreDoSlot(periciaNome, nivel, tipoSlot = "bomba") {
    const entrada = Object.entries(estado.fichaAtual.receitasConhecidas || {})
        .find(([, c]) => c.periciaVinculada === periciaNome && Number(c.nivel) === nivel && c.origem === "livre" && (c.tipoSlot || "bomba") === tipoSlot);
    return entrada ? { id: entrada[0], ...entrada[1] } : null;
}

// Manual pg. 81: "Para cada ponto na perícia Explosivo, escolha uma
// receita de módulo de detonação" — slot GRÁTIS À PARTE do slot normal
// de bomba (mesmo nível 1..nivelPericia), só que a receita escolhida
// não é de Explosivos — é de Ofícios Utilitários ou Eletrônica (quem
// cria módulo de detonação, ver MODULOS_DETONACAO em dados-manual.js),
// filtrada aqui pelo item vinculado (itemGlobalId) ter a tag
// "modulo_detonacao". Ver renderizarReceitas (bloco "Explosivos") e o
// tipoSlot="modulo" em receitaLivreDoSlot/concederReceitaConhecida.
export function receitasModuloDetonacaoDisponiveis(nivel) {
    return estado.receitasGlobaisCache.filter(r => {
        if ((Number(r.nivel) || 1) !== nivel) return false;
        if (!r.itemGlobalId) return false;
        const item = estado.itensGlobaisCache.find(it => it.id === r.itemGlobalId);
        return !!item && item.tag === "modulo_detonacao";
    });
}

export function receitasExtrasDaPericia(periciaNome) {
    return Object.entries(estado.fichaAtual.receitasConhecidas || {})
        .filter(([, c]) => c.periciaVinculada === periciaNome && (c.origem === "mestre" || c.origem === "engenharia"))
        .map(([id, c]) => ({ id, ...c }))
        .sort((a, b) => (Number(a.nivel) || 0) - (Number(b.nivel) || 0));
}

// Concede uma receita já existente no Banco Global ao personagem atual.
// origem "livre" só deve ser chamado quando o slot daquele nível ainda
// estiver vazio (ver renderizarReceitas, que só mostra o controle de
// escolha nesse caso) — mas revalida aqui também, pra não dar pra burlar
// clicando duas vezes rápido ou com duas abas abertas.
export async function concederReceitaConhecida(periciaNome, nivel, receitaGlobalId, origem, tipoSlot = "bomba") {
    if (!estado.fichaAtual.receitasConhecidas) estado.fichaAtual.receitasConhecidas = {};
    if (origem === "livre" && receitaLivreDoSlot(periciaNome, nivel, tipoSlot)) {
        toast(`Esse personagem já tem a receita gratuita de nível ${nivel}${tipoSlot === "modulo" ? " (módulo de detonação)" : ""} dessa perícia.`, "erro");
        return;
    }
    const nomeAutor = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || (estado.isMestre ? "Mestre" : "Jogador");
    const id = gerarIdLocal();
    estado.fichaAtual.receitasConhecidas[id] = {
        receitaGlobalId,
        periciaVinculada: periciaNome,
        nivel,
        origem,
        tipoSlot,
        adicionadoPorNome: nomeAutor,
        adicionadoEm: Date.now()
    };
    await update(ref(db, `${caminhoBase()}/receitasConhecidas`), estado.fichaAtual.receitasConhecidas);
    toast(origem === "livre" ? "Receita gratuita adicionada à ficha." : "Receita adicionada à ficha pelo Mestre.");
}

// Remover uma receita conhecida (gratuita ou extra) — travado pro
// jogador: depois de escolhida, só o Mestre pode desfazer.
export async function removerReceitaConhecida(id) {
    if (!estado.isMestre) { toast("Só o Mestre pode remover uma receita já adquirida.", "erro"); return; }
    if (!confirm("Remover essa receita da ficha do personagem?")) return;
    delete estado.fichaAtual.receitasConhecidas[id];
    await remove(ref(db, `${caminhoBase()}/receitasConhecidas/${id}`));
    toast("Receita removida da ficha.");
}

// Igual coletarModificadores(estado.fichaAtual), mas já injeta o dia atual do
// calendário da mesa — necessário pra calcular o malus de Abstinência
// (ver calcularModificadoresAbstinencia em regras.js) — e, quando em
// combate, os modificadores de "penalidade_temporizada" ativos no
// participante atual (Parte 5.3 do plano de automação dos materiais
// químicos — ver modificadoresPenalidadeTemporizada mais abaixo; fica
// de fora de coletarModificadores porque aquela é uma função pura,
// sem acesso ao Firebase de combate). Único ponto usado por toda a
// ficha do jogador, pra não espalhar `estado.calendarioAtual?.diaIndice` nem
// a leitura de combate em cada chamada.
export function modificadoresAtuais() {
    return [
        ...coletarModificadores(estado.fichaAtual, estado.calendarioAtual ? estado.calendarioAtual.diaIndice : null, estado.calendarioAtual ? estado.calendarioAtual.hora : null),
        ...modificadoresPenalidadeTemporizada()
    ];
}

export function renderizarTudo() {
    if (!estado.fichaAtual) return;
    const modificadoresPlanos = modificadoresAtuais();

    renderizarPerfil();
    renderizarFinancas();
    renderizarAtributos(modificadoresPlanos);
    verificarMorte();
    renderizarPericias(modificadoresPlanos);
    renderizarInventario(modificadoresPlanos);
    renderizarItensEquipadosTopo();
    renderizarImplantes();
    renderizarCombate();
    renderizarVeiculos();
    renderizarCenarios();
    renderizarVantagensDesvantagens();
    renderizarEspecializacoes();
    renderizarTreinamento();
    renderizarReceitas();
    renderizarDarknetENotas();

    // Reavalia o alerta "VOCÊ ESTÁ EM COMBATE!" (e o travamento de ações
    // fora do turno) sempre que a ficha terminar de carregar/atualizar —
    // não só quando o estado de combate muda (ver configurarCombateAtivo).
    // Sem isso, se o snapshot de combateAtivo chegar ANTES da ficha (caso
    // comum: estado.fichaAtualId ainda vazio no primeiro disparo do listener),
    // meuParticipanteIdCombate() não encontra o participante e o alerta
    // nunca é recalculado depois, mesmo com a ficha já carregada.
    if (!estado.isMestre) {
        renderizarAlertaIniciativaCombate();
        travarAcoesForaDoTurno();
    }
}

// ---------------------------------------------------------------------
// PERFIL
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// FINANÇAS — saldos (Mestre edita direto, jogador só vê + solicita
// gasto), padrão de vida/gastos semanais (herdado do Perfil) e ganho
// fixo semanal (jogador declara livremente; creditado automático todo
// Domingo pelo Mestre, sem precisar de aprovação — não mexe em saldo
// alheio, só declara um valor).
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Helper genérico: renderiza uma <ul> de entidades simples (vantagem,
// desvantagem, fato, gasto extra...). `mapeador(id, item)` retorna
// { nome, sub, direita }. `listaChave` identifica de qual campo da
// ficha vieram (pra abrir o modal de edição certo).
// ---------------------------------------------------------------------
export function renderizarListaSimples(container, objeto, mapeador, listaChave) {
    container.innerHTML = "";
    const ids = Object.keys(objeto || {});
    if (!ids.length) {
        container.innerHTML = `<li class="entity-list-empty" style="cursor:default;">Nada cadastrado ainda.</li>`;
        return;
    }
    ids.forEach(id => {
        const item = objeto[id];
        const { nome, sub, direita } = mapeador(id, item);
        // Só entidades com modificadores estruturados ganham o botão de
        // ativo/desativado — o resto (ex: gastos extras) não tem "efeito"
        // pra ligar/desligar.
        const temEfeito = !!(item.modificadores && item.modificadores.length);
        const ativo = item.ativo !== false;
        const li = document.createElement("li");
        li.className = temEfeito && !ativo ? "entidade-desativada" : "";
        li.innerHTML = `
            <div class="entity-main">
                <span class="entity-nome">${escapeHtml(nome)}</span>
                ${sub ? `<span class="entity-sub">${escapeHtml(sub)}</span>` : ""}
            </div>
            <div class="entity-badges">
                ${direita ? `<span class="entity-sub">${escapeHtml(direita)}</span>` : ""}
                ${temEfeito ? `<button type="button" class="btn-toggle-ativo ${ativo ? "ligado" : "desligado"}" title="${ativo ? "Efeito ativo agora — clique pra desativar" : "Efeito desativado agora — clique pra ativar"}">${ativo ? "● Ativo" : "○ Inativo"}</button>` : ""}
            </div>
        `;
        if (temEfeito) {
            li.querySelector(".btn-toggle-ativo").addEventListener("click", (e) => {
                e.stopPropagation();
                alternarAtivoEntidade(listaChave, id, !ativo);
            });
        }
        li.addEventListener("click", () => abrirModalEdicao(listaChave, id));
        container.appendChild(li);
    });
}

// ---------------------------------------------------------------------
// Liga/desliga o efeito (modificadores) de uma entidade qualquer — item,
// vantagem, desvantagem, fato universal ou especialização — sem mexer
// no resto do seu cadastro. `coletarModificadores` (regras.js) ignora
// modificadores de qualquer entidade com `ativo: false`. A sincronização
// em tempo real (ativarSincronizacao) já re-renderiza a ficha inteira
// assim que o Firebase confirma a escrita, então não precisamos chamar
// nenhuma função de render manualmente aqui.
// ---------------------------------------------------------------------
export async function alternarAtivoEntidade(lista, id, novoValor) {
    if (!idAtivo()) return;
    try {
        await update(ref(db, `${caminhoBase()}/${caminhoLista(lista)}/${id}`), { ativo: novoValor });
    } catch (e) {
        toast("Não foi possível atualizar o efeito. Tente de novo.", "erro");
    }
}

// Liga/desliga um único modificador de Ocasião Especial (checkbox que
// aparece direto na linha da perícia — ver renderizarPericias), sem
// precisar abrir o cadastro da especialização/vantagem/item de origem.
// `o` vem de modificadoresOcasionaisDaPericia (regras.js): já traz
// `lista`/`entidadeId`/`modIndex` apontando pro modificador exato dentro
// do array `modificadores` daquela entidade. Mesma lógica de
// alternarAtivoEntidade — grava e deixa a sincronização em tempo real
// re-renderizar sozinha.
export async function alternarModificadorOcasional(o, novoValor) {
    if (!idAtivo() || !o) return;
    try {
        await update(ref(db, `${caminhoBase()}/${caminhoLista(o.lista)}/${o.entidadeId}/modificadores/${o.modIndex}`), { ativoOcasional: novoValor });
    } catch (e) {
        toast("Não foi possível atualizar o modificador de ocasião especial. Tente de novo.", "erro");
    }
}

// Equipar/desequipar um item do inventário — só item equipado pode ser
// usado (ver itemPodeUsar em inventario.js); pra armas, também é o que
// a manobra "Desarmar" de fato retira do alvo (ver resolverDesarmar).
//
// EQUIPAR (não desequipar) durante combate com iniciativa ativo gasta 1
// ação do turno — mesmo Sistema de Aprovação do Mestre usado pro resto
// das ações (ver checarConsumoDeAcao/criarAcaoPendente): jogador manda
// o gasto pro Mestre aprovar, e Mestre (controlando a própria ficha ou
// um NPC em estado.modoNpc) gasta na hora. Fora de combate com iniciativa, ou
// desequipar, continua sendo ação livre.
export async function alternarEquipadaItem(id, novoValor, nomeItem) {
    if (!idAtivo()) return;

    let consumo = { participanteId: null, direto: false, extraCQC: false };
    if (novoValor) {
        consumo = checarConsumoDeAcao(false);
        if (!consumo) return;
    }

    try {
        await update(ref(db, `${caminhoBase()}/inventario/${id}`), { equipada: novoValor });
    } catch (e) {
        toast("Não foi possível atualizar o item. Tente de novo.", "erro");
        return;
    }

    if (!consumo.participanteId) {
        toast(novoValor ? "Item equipado." : "Item desequipado.");
        return;
    }

    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: "gastar_acao_combate",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} equipou ${nomeItem || "um item"} e quer gastar 1 ação do turno.`,
        payload: { participanteId: consumo.participanteId, extraCQC: false, ehArmaFogo: false }
    });
    toast("Item equipado — gasto de ação enviado pro Mestre aprovar.");
}

export function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------------------------------------------------------------------
// Texto de detalhamento (hover) — "como cheguei nesse valor": base +
// cada modificador com a origem (item/vantagem/desvantagem/etc.) + total.
// Usado como `title` (tooltip nativo) em atributos, perícias, PV/Energia
// e qualquer outro valor calculado da ficha. `title` nativo já quebra
// linha em "\n" (mesmo truque já usado no tooltip do carregador).
// ---------------------------------------------------------------------
export function textoDetalhamento(label, baseValor, baseLabel, ajustes, totalValor) {
    const fmt = n => {
        const r = Math.round((Number(n) || 0) * 10) / 10;
        return Number.isInteger(r) ? r : r.toFixed(1);
    };
    let texto = `${label}\n${baseLabel}: ${fmt(baseValor)}`;
    (ajustes || []).forEach(a => {
        texto += `\n${a.valor >= 0 ? "+" : ""}${fmt(a.valor)} — ${a.origem}`;
    });
    if (!ajustes || !ajustes.length) texto += "\nSem modificadores ativos.";
    texto += `\n\nTotal: ${fmt(totalValor)}`;
    return texto;
}

// Lista de itens equipados agora (armas equipadas + qualquer outro item
// marcado como equipável e equipado — ver itemEhEquipavel/inventario.js),
// mostrada como pilulazinhas ao lado das barras de PV/Energia no topo.
function renderizarItensEquipadosTopo() {
    if (!el.vitalEquipados) return;
    const inventario = (estado.fichaAtual && estado.fichaAtual.inventario) ? estado.fichaAtual.inventario : {};
    const equipados = Object.values(inventario).filter(it => it && it.categoria === "levando" && itemEhEquipavel(it) && it.equipada);
    if (!equipados.length) {
        el.vitalEquipados.innerHTML = `<span class="vital-equipado-vazio">Nada equipado</span>`;
        return;
    }
    el.vitalEquipados.innerHTML = equipados
        .map(it => `<span class="vital-equipado-pill">${ehArma(it.tag) ? "🗡️" : (ehExplosivo(it.tag) ? "💣" : "✅")} ${escapeHtml(it.nome)}</span>`)
        .join("");
}

// renderizarEstadoSaude, renderizarComaBadge e renderizarDesmaioBadge
// foram movidas pra abas/saude.js no Passo 24 do plano de
// modularização (parte 1: exibição).

// Penalidade de todos os testes por causa do estado de saúde atual
// (0, -2 ou -4 — ver calcularEstadoSaude). Lida do último cálculo feito
// em renderizarAtributos, que sempre roda antes das demais seções.
export function penalidadeTestesAtual() {
    return (window._estadoSaudeAtual && window._estadoSaudeAtual.penalidadeTestes) || 0;
}

// renderizarEstadoEnergia foi movida pra abas/saude.js no Passo 24 do
// plano de modularização (parte 1: exibição).

// Penalidade extra (além do estado de saúde) que o estado de Energia
// atual aplica sobre uma categoria de teste específica ("fisica" ou
// "mental" — ver CATEGORIAS_PERICIA em dados-manual.js). Testes sociais
// e perícias "legado" sem categoria conhecida não são afetados.
export function penalidadeEnergiaPara(categoria) {
    const estado = window._estadoEnergiaAtual;
    if (!estado || !estado.estado) return 0;
    if (categoria === "fisica") return estado.penalidadeFisica || 0;
    if (categoria === "mental") return estado.penalidadeMental || 0;
    return 0;
}

// Mesma ideia acima, mas resolvendo a categoria a partir do nome da
// perícia (consulta a lista fechada do manual em dados-manual.js).
export function penalidadeEnergiaParaPericia(nomePericia) {
    const info = buscarPericiaPorNome(nomePericia);
    return info ? penalidadeEnergiaPara(info.categoria) : 0;
}

// Badge de "Machucado"/"Muito Machucado"/"Morte" pra uma linha de
// participante do Gerenciador de Combate — mesmo helper compartilhado
// que badgeEstadoEnergiaCombate() logo abaixo.
export function badgeEstadoSaudeCombate(p) {
    if (!p.estadoSaude) return "";
    const titulo = p.estadoSaude === "morte"
        ? "PV chegou a 0"
        : `-${p.estadoSaude === "muito_machucado" ? "4" : "2"} em todos os testes`;
    return ` <span class="mod-pill negativo" title="${titulo}">${escapeHtml(p.estadoSaudeLabel)}</span>`;
}

// Badge de "Energia Baixa"/"Energia Crítica"/"Morte" pra uma linha de
// participante do Gerenciador de Combate (painel do jogador e painel
// do Mestre reaproveitam esta mesma função) — mesmo padrão visual do
// badge de estado de saúde já usado nessas listas.
export function badgeEstadoEnergiaCombate(p) {
    if (!p.estadoEnergia) return "";
    const titulo = p.estadoEnergia === "morte"
        ? "Energia esgotada"
        : (p.estadoEnergia === "energia_critica" ? "-3 em testes físicos, -2 em testes mentais" : "-2 em testes físicos");
    return ` <span class="mod-pill negativo" title="${titulo}">${escapeHtml(p.estadoEnergiaLabel)}</span>`;
}

// Badge de Infecção (Complicações de ferimentos — manual; ver
// aplicarInfeccao/testarInfeccao em mestre.js). Flag persistente, sem
// contagem de turnos (diferente do Sangramento, abaixo): sozinha não
// causa dano, só aumenta em 50% o tempo de repouso necessário até o
// personagem receber tratamento médico de verdade — mesmo helper
// compartilhado entre o painel do jogador e o do Mestre.
export function badgeInfeccaoCombate(p) {
    if (!p.infeccao || !p.infeccao.ativo) return "";
    const titulo = `Tempo de repouso necessário +50% até tratamento médico${p.infeccao.garantida ? " (infecção garantida)" : ""}${p.infeccao.origem ? ` — ${p.infeccao.origem}` : ""}`;
    return ` <span class="mod-pill negativo" title="${escapeHtml(titulo)}">🦠 Infectado</span>`;
}

// Badges de status ativos por turno (Tick System) pra uma linha de
// participante do Gerenciador de Combate. Um badge por efeito ativo,
// mostrando quantos turnos faltam. Antes era hard-coded pro formato de
// Sangramento (ícone 🩸 + "N de dano fixo por turno" pra QUALQUER
// status) — agora despacha por `status.tipo`, porque os efeitos
// químicos novos (Parte 5 do plano-automacao-materiais-quimicos-v3:
// penalidade_temporizada, teste_atrasado, desmaio_temporizado,
// perde_acao_temporizado) não são dano por turno e mostravam ícone/
// texto errados. Ver mestre.js: aplicarSangramento,
// aplicarDanoContinuoQuimico, aplicarPenalidadeTemporizada,
// aplicarDesmaioTemporizado, aplicarPerdaAcaoTemporizada,
// aplicarTesteAtrasado — cada um grava um `tipo` diferente em
// statusAtivos, lido aqui (Parte 7 do plano).
export function badgeStatusAtivosCombate(p) {
    if (!p.statusAtivos) return "";
    return Object.values(p.statusAtivos)
        .filter(s => s && (Number(s.turnosRestantes) || 0) > 0)
        .map(s => badgeUnicoStatusAtivo(s))
        .join("");
}

// Ícone e texto de UM status ativo, por tipo — ver tabela da Parte 7:
//   sangramento / dano_continuo   → 🩸 "N de dano por turno"
//   penalidade_temporizada        → ⚠️ "valor em alvos, por N turnos"
//   teste_atrasado                → ⏳ "teste em N turnos"
//   desmaio_temporizado           → 💤 "acorda em N turnos"
//   perde_acao_temporizado        → 🌀 "perde 1 ação por turno, N turnos restantes"
// Tipo desconhecido (efeito futuro ainda não coberto aqui) cai num
// badge genérico neutro em vez de quebrar a UI.
function badgeUnicoStatusAtivo(s) {
    const turnos = s.turnosRestantes;
    const origemTitulo = s.origem ? escapeHtml(s.origem) : "";
    switch (s.tipo) {
        case "sangramento":
        case "dano_continuo": {
            const dano = s.danoPorTurno ?? `1d${s.faces || 1}`;
            return ` <span class="mod-pill negativo" title="${origemTitulo} — ${dano} de dano fixo por turno">🩸 ${escapeHtml(s.label || s.tipo)} (${turnos})</span>`;
        }
        case "penalidade_temporizada": {
            const alvos = Array.isArray(s.alvos) ? s.alvos.join(", ") : (s.alvos || "");
            return ` <span class="mod-pill negativo" title="${origemTitulo} — ${s.valor} em ${escapeHtml(alvos)}, por ${turnos} turno(s)">⚠️ ${escapeHtml(s.label || s.tipo)} (${turnos})</span>`;
        }
        case "teste_atrasado":
            return ` <span class="mod-pill negativo" title="${origemTitulo} — teste de ${escapeHtml(s.periciaResistencia || "")} vs dif ${s.dificuldade}, em ${turnos} turno(s)">⏳ ${escapeHtml(s.label || s.tipo)} — teste em ${turnos}</span>`;
        case "desmaio_temporizado":
            return ` <span class="mod-pill negativo" title="${origemTitulo} — acorda sozinho, sem precisar de ninguém confirmar">💤 Desmaiado — acorda em ${turnos}</span>`;
        case "perde_acao_temporizado":
            return ` <span class="mod-pill negativo" title="${origemTitulo} — consome 1 ação normal do turno enquanto durar">🌀 Perde 1 ação por turno (${turnos} restante${turnos === 1 ? "" : "s"})</span>`;
        default:
            return ` <span class="mod-pill negativo" title="${origemTitulo}">${escapeHtml(s.label || s.tipo)} (${turnos})</span>`;
    }
}

// ---------------------------------------------------------------------
// Overlay de Morte (0 PV ou 0 Energia — ver calcularEstadoSaude e
// calcularEstadoEnergia em regras.js). Chamada a cada renderizarTudo(),
// depois que renderizarAtributos() já recalculou window._estadoSaudeAtual
// e window._estadoEnergiaAtual pro ciclo atual.
//
// Godmode do Mestre ignora a trava por completo (mesma filosofia usada
// em podeEditarPericiaAtributo() etc.) — é a única forma de mexer numa
// ficha morta depois da falha na reanimação.
// ---------------------------------------------------------------------
function verificarMorte() {
    if (estado.isMestre && estado.godmodeAtivo) {
        el.overlayMorte.style.display = "none";
        // Godmode ignora o overlay cheio (pra não travar a edição), mas
        // se a ficha ainda estiver morta por baixo, deixa um botão
        // pequeno no canto pra reverter sem precisar mexer no Firebase
        // na mão.
        const definitivaGodmode = !!(estado.fichaAtual.dados && estado.fichaAtual.dados.mortoDeVez);
        const morreuAgoraGodmode = !!((window._estadoSaudeAtual && window._estadoSaudeAtual.morte) || (window._estadoEnergiaAtual && window._estadoEnergiaAtual.morte));
        el.btnReviverGodmode.style.display = (definitivaGodmode || morreuAgoraGodmode) ? "block" : "none";
        return;
    }
    el.btnReviverGodmode.style.display = "none";

    const definitiva = !!(estado.fichaAtual.dados && estado.fichaAtual.dados.mortoDeVez);
    const morreuAgora = !!((window._estadoSaudeAtual && window._estadoSaudeAtual.morte) || (window._estadoEnergiaAtual && window._estadoEnergiaAtual.morte));

    if (!definitiva && !morreuAgora) {
        el.overlayMorte.style.display = "none";
        el.overlayMorte.classList.remove("definitiva");
        el.overlayMorteResultado.innerHTML = "";
        el.overlayMorteResultado.className = "overlay-morte-resultado";
        el.btnNaoQueroMorrer.disabled = false;
        return;
    }

    el.overlayMorte.style.display = "flex";
    el.overlayMorte.classList.toggle("definitiva", definitiva);
    if (definitiva) {
        el.overlayMorteTitulo.innerText = "VOCÊ MORREU!";
        el.overlayMorteTexto.innerText = "A reanimação falhou. Não tem mais volta — só o Mestre pode mexer nessa ficha agora.";
    } else {
        el.overlayMorteTitulo.innerText = "VOCÊ MORREU!";
        el.overlayMorteTexto.innerText = "Role 3d20 contra dificuldade 11. Acerte os três pra voltar com 1 PV.";
    }
}

// Rola o teste de reanimação (3d20, dif 11, precisa dos três) ao
// clicar em "AAAAA NÃO QUERO MORRER". Sucesso total: pvAtual volta a 1
// (e energiaAtual também, se estava em 0, pra não reabrir o overlay na
// hora). Qualquer falha: mortoDeVez fica marcado pra sempre — ver
// verificarMorte() acima.
async function tentarReanimacao() {
    if (el.btnNaoQueroMorrer.disabled) return;
    el.btnNaoQueroMorrer.disabled = true;

    const resultado = rolarTesteReanimacao();
    const detalheDados = resultado.dados
        .map((d, i) => `${d}${resultado.sucessos[i] ? " ✓" : " ✗"}`)
        .join(" · ");

    el.overlayMorteResultado.className = `overlay-morte-resultado ${resultado.sucessoTotal ? "sucesso" : "falha"}`;
    el.overlayMorteResultado.innerText = `${detalheDados} — ${resultado.sucessoTotal ? "sobreviveu!" : "não resistiu."}`;

    await registrarRolagem({
        quem: `${estado.fichaAtual.dados.nome || estado.fichaAtualId} (reanimação)`,
        modificador: 0,
        resultado: detalheDados,
        detalhe: `Teste de reanimação (dif ${DIFICULDADE_REANIMACAO}, precisa dos 3): ${resultado.sucessoTotal ? "SUCESSO" : "FALHA"}`,
        critico: resultado.sucessoTotal ? "acerto" : "falha"
    });

    if (resultado.sucessoTotal) {
        const atualizacoes = { pvAtual: 1 };
        // energiaAtual null/undefined = Energia cheia por convenção (ver
        // calcularEstadoEnergia) — só mexe se realmente estava em 0 ou
        // menos, pra não zerar a Energia de quem morreu só por causa do PV.
        const energiaAtual = estado.fichaAtual.dados.energiaAtual;
        if (energiaAtual !== null && energiaAtual !== undefined && Number(energiaAtual) <= 0) {
            atualizacoes.energiaAtual = 1;
        }
        await update(ref(db, `${caminhoBase()}/dados`), atualizacoes);
        toast("Reanimação bem-sucedida — voltou com 1 PV.", "sucesso");
    } else {
        await update(ref(db, `${caminhoBase()}/dados`), { mortoDeVez: true });
        toast("A reanimação falhou. Morte definitiva.", "erro");
    }
}

// "Reviver (Godmode)": botão de emergência só visível pro Mestre com
// Godmode ativo (ver verificarMorte() acima), pra destravar uma ficha
// morta sem precisar editar o Firebase na mão. Zera mortoDeVez e
// devolve 1 PV (e 1 Energia, se estava zerada também).
async function reviverGodmode() {
    if (!(estado.isMestre && estado.godmodeAtivo)) return;
    const atualizacoes = { pvAtual: 1, mortoDeVez: false };
    const energiaAtual = estado.fichaAtual.dados.energiaAtual;
    if (energiaAtual !== null && energiaAtual !== undefined && Number(energiaAtual) <= 0) {
        atualizacoes.energiaAtual = 1;
    }
    await update(ref(db, `${caminhoBase()}/dados`), atualizacoes);
    toast("Ficha revivida via Godmode.", "sucesso");
}

// Máximo "de verdade" de um recurso (PV/Energia): normalmente é só o
// valor calculado pela fórmula do manual (+ bônus de Level Up no caso
// do PV — ver pvBonusExtra), mas em Godmode o Mestre pode sobrescrever
// esse teto na hora — ex: um jogador MUITO acima ou abaixo da curva
// normal do jogo. Guardado em dados.{recursoKey}MaximoOverride; null/
// vazio significa "sem override", volta a usar o valor calculado.
export function maximoComOverride(recursoKey, dados, totalCalculado) {
    const override = dados[recursoKey + "MaximoOverride"];
    return (override !== null && override !== undefined && override !== "") ? (Number(override) || 0) : totalCalculado;
}

function mostrarDetalheSecundario(key) {
    const attr = ATRIBUTOS_SECUNDARIOS.find(a => a.key === key);
    const d = window._ultimosDerivados;
    if (!attr || !d) return;
    const info = d.secundarios[key];
    let texto = `${attr.label}\nBase (fórmula do manual): ${Math.round(info.base * 10) / 10}`;
    if (info.ajustes.length) {
        texto += "\n\nModificadores:";
        info.ajustes.forEach(a => { texto += `\n  ${a.valor >= 0 ? "+" : ""}${a.valor} — ${a.origem}`; });
    } else {
        texto += "\n\nSem modificadores ativos.";
    }
    texto += `\n\nTotal: ${Math.round(info.total * 10) / 10}`;
    alert(texto);
}

// ---------------------------------------------------------------------
// PERÍCIAS
// ---------------------------------------------------------------------
// Engenharia — Parte 10 (continuação de "automação materiais químicos"):
// rolar Engenharia oferece duas ações distintas, ver
// li.querySelector(".btn-rolar") em renderizarPericias logo abaixo:
//   - "Só rolar": comportamento de sempre, d20 + Engenharia no Log.
//   - "Criar receita": abre o mesmo fluxo de sempre de autorar receita
//     (abrirModalCriarReceita) — escolhendo uma já existente no Banco
//     Global pra editar, ou criando uma do zero — sem reinventar nada,
//     só dando um atalho a partir da perícia (ver
//     abrirModalEscolherReceitaParaEngenharia). O requisito de nível
//     (Engenharia + perícia vinculada ≥ nível do item) já é checado
//     dentro de abrirModalCriarReceita na hora de salvar (ver
//     atendeRequisitoCriarReceita, dados-manual.js).
export function abrirModalEscolhaEngenharia(modificadorRolagem) {
    let modal = document.getElementById("modal-escolha-engenharia");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolha-engenharia";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Engenharia (${modificadorRolagem >= 0 ? "+" : ""}${modificadorRolagem})</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <div class="modal-btns" style="flex-direction:column;">
            <button type="button" class="btn-lime" id="btn-engenharia-so-rolar">🎲 Só rolar</button>
            <button type="button" class="btn-blue" id="btn-engenharia-criar-receita">📐 Criar receita</button>
        </div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-engenharia-so-rolar").addEventListener("click", async () => {
        modal.remove();
        await rolarComPossibilidadeDeOcasionais("Engenharia", "pericia:Engenharia", modificadorRolagem, false);
    });
    modal.querySelector("#btn-engenharia-criar-receita").addEventListener("click", () => {
        modal.remove();
        abrirModalEscolherReceitaParaEngenharia(modificadorRolagem);
    });
    document.body.appendChild(modal);
}

// Picker de entrada a partir da perícia Engenharia: autorar uma receita
// nova (vai pro Banco Global) OU aprender uma já existente — nos dois
// casos, o personagem só ganha a receita em receitasConhecidas se
// passar no teste de Engenharia (ver resolverTesteAprenderReceita),
// dificuldade 10 + 2×nível do item. Escolher uma receita da lista aqui
// NÃO edita ela (isso é feito só pelo Mestre, na Biblioteca de
// Receitas, ou pelo autor original clicando "Editar" na aba Receitas
// da própria ficha) — é uma tentativa de aprendê-la.
function abrirModalEscolherReceitaParaEngenharia(modificadorEngenharia) {
    let modal = document.getElementById("modal-escolher-receita-engenharia");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolher-receita-engenharia";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Criar receita — Engenharia</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <div class="modal-field">
            <button type="button" class="btn-lime" id="btn-engenharia-receita-nova" style="width:100%;">+ Nova receita</button>
        </div>
        <div class="modal-field">
            <label for="engenharia-receita-busca">Ou escolha uma já existente no Banco Global pra tentar aprender</label>
            <span class="hint-inline">Rola Engenharia contra dificuldade 10 + 2×nível do item — se passar, a receita entra nas suas Receitas (na aba de ${escapeHtml("Armeiro/Eletrônica/etc.")} conforme a perícia vinculada).</span>
            <input type="text" id="engenharia-receita-busca" placeholder="Buscar por nome..." autocomplete="off">
            <div class="combate-lista" id="engenharia-receita-lista" style="max-height:260px; overflow-y:auto;"></div>
        </div>
    `;
    const lista = modal.querySelector("#engenharia-receita-lista");
    const busca = modal.querySelector("#engenharia-receita-busca");
    function jaConhece(receitaGlobalId) {
        return Object.values(estado.fichaAtual.receitasConhecidas || {}).some(c => c.receitaGlobalId === receitaGlobalId);
    }
    function renderizarLista() {
        const termo = busca.value.trim().toLowerCase();
        const encontradas = estado.receitasGlobaisCache
            .filter(r => !termo || (r.nome || "").toLowerCase().includes(termo))
            .slice(0, 30);
        lista.innerHTML = "";
        if (!encontradas.length) {
            lista.innerHTML = `<p class="hint">Nenhuma receita encontrada${termo ? " pra essa busca" : " no Banco Global ainda"}.</p>`;
            return;
        }
        encontradas.forEach(r => {
            const conhecida = jaConhece(r.id);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-ghost";
            btn.style.width = "100%";
            btn.style.marginBottom = "4px";
            btn.disabled = conhecida;
            btn.innerText = `Nível ${Number(r.nivel) || 1} · ${r.nome || "(sem nome)"} — ${r.periciaVinculada || "?"}${conhecida ? " (já conhecida)" : ""}`;
            btn.addEventListener("click", async () => {
                modal.remove();
                await resolverTesteAprenderReceita(r, modificadorEngenharia);
            });
            lista.appendChild(btn);
        });
    }
    busca.addEventListener("input", renderizarLista);
    renderizarLista();

    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-engenharia-receita-nova").addEventListener("click", () => {
        modal.remove();
        abrirModalCriarReceita(null, null, null, { modificadorEngenharia });
    });
    document.body.appendChild(modal);
}

// Teste de Engenharia pra aprender uma receita já existente no Banco
// Global (dificuldade 10 + 2×nível do item — ver mensagem do usuário
// nesta conversa). Sucesso: entra em receitasConhecidas (origem
// "engenharia"), categorizada pela perícia vinculada da receita
// (Armeiro, Eletrônica, etc. — mesma perícia usada pra CRIAR o item,
// não uma categoria escolhida à parte). Falha: só fica registrado no
// Log, a receita não é aprendida (mas continua disponível no Banco
// Global pra tentar de novo depois).
export async function resolverTesteAprenderReceita(receita, modificadorEngenharia) {
    if (!estado.fichaAtual) return;
    if (Object.values(estado.fichaAtual.receitasConhecidas || {}).some(c => c.receitaGlobalId === receita.id)) {
        toast("Você já conhece essa receita.", "erro");
        return;
    }
    const nivel = Number(receita.nivel) || 1;
    const dificuldade = 10 + 2 * nivel;
    const resultado = await rolarComPossibilidadeDeOcasionais("Engenharia (aprender receita)", "pericia:Engenharia", modificadorEngenharia, false, dificuldade);
    if (!resultado) return; // cancelado no modal de Ocasião Especial
    if (!resultado.sucesso) {
        toast(`Não deu pra decifrar "${receita.nome}" dessa vez (dificuldade ${dificuldade}) — pode tentar de novo depois.`, "erro");
        return;
    }
    await concederReceitaConhecida(receita.periciaVinculada, nivel, receita.id, "engenharia");
    toast(`Receita "${receita.nome}" aprendida! Já aparece em Receitas → ${receita.periciaVinculada}.`);
}

// Rola 1d20 + modificador e registra no Log de Dados, identificando quem
// rolou pelo nome da ficha ativa (jogador) ou "Mestre".
// ehCQC (default false): se esta rolagem usa especificamente a perícia
// CQC — só importa pro CQC nível 5 (ver checarConsumoDeAcao/extraCQC).
// dificuldade (opcional): quando informada, o log e o toast passam a
// mostrar "✅ Sucesso" ou "❌ Falhou" comparando resultado x dificuldade
// (resultado >= dificuldade = sucesso), além do que já existia (crítico
// positivo/negativo). Chamadas antigas que não passam esse parâmetro
// continuam funcionando exatamente como antes (nenhuma sinalização de
// sucesso/falha). Retorna { resultado, bruto, criticoPositivo,
// criticoNegativo, sucesso } pra quem precisar decidir algo com o
// resultado da rolagem (sucesso é null se dificuldade não foi passada).
export async function rolarERegistrar(nomeAlvo, modificador, ehCQC = false, dificuldade = null) {
    // Trava de ações: com combate com iniciativa ativo, uma rolagem só
    // acontece se for o turno de quem está agindo (jogador OU o NPC que
    // o Mestre estiver controlando) E ainda houver ação sobrando nesse
    // turno. A rolagem em si acontece na hora (o dado é rolado e
    // registrado no Log normalmente); o CONSUMO da ação SEMPRE entra na
    // fila do Sistema de Aprovação, mesmo com o Mestre controlando o NPC
    // que rolou — rolarERegistrar cobre perícia solta/atributo (ex.:
    // Percepção, Constituição) e qualquer rolagem de arma de fogo feita
    // fora do fluxo de ataque completo, e nenhuma dessas gasta ação
    // automaticamente (só golpe corpo a corpo/arma branca em
    // resolverAtaque faz isso — ver checarConsumoDeAcao).
    const consumo = checarConsumoDeAcao(ehCQC, false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const bruto = rolarD20();
    const resultado = bruto + Number(modificador || 0);
    // Acerto Crítico: o RESULTADO FINAL (d20 + modificador) precisa
    // bater ou passar de 20 — d20 natural 20 sozinho NÃO garante crítico
    // se o modificador derrubar o resultado abaixo de 20 (ex.: d20=20,
    // modificador -1, resultado final 19 → não é crítico). Falha Crítica
    // (d20 natural 1 ou resultado final <= 1) — aqui é só sinalização
    // pro Log de Dados e resolução manual do Mestre; não há "dano" pra
    // dobrar numa rolagem genérica de perícia/atributo (isso é exclusivo
    // de resolverAtaque, que também aplica a dobra de dano de verdade).
    const criticoPositivo = resultado >= 20;
    // Falha Crítica: d20 natural 1, OU resultado final <= 1 — este
    // segundo caso só é matematicamente possível com modificador
    // negativo (ex: d20=2, modificador -1, resultado final = 1),
    // já que o d20 sozinho nunca é menor que 1.
    const criticoNegativo = bruto === 1 || resultado <= 1;
    const notaCritico = criticoNegativo
        ? " 🔥 FALHA CRÍTICA — Fogo Amigo/Desastre! Resolução rápida pelo Mestre."
        : (criticoPositivo ? " ⚡ ACERTO CRÍTICO!" : "");
    const temDificuldade = dificuldade !== null && dificuldade !== undefined;
    const sucesso = temDificuldade ? resultado >= Number(dificuldade) : null;
    const notaSucesso = temDificuldade ? (sucesso ? " · ✅ Sucesso" : " · ❌ Falhou") : "";
    const quem = estado.isMestre ? `Mestre (${estado.modoNpc ? (estado.fichaAtual?.config?.nomeExibicao || estado.npcAtualId) : (nomeDeFicha(estado.fichaAtualId) || "—")})` : (estado.fichaAtual?.config?.nomeExibicao || estado.sessao.nome || "Jogador");
    await registrarRolagem({
        quem, modificador, resultado,
        detalhe: `${nomeAlvo}: d20 (${bruto}) ${modificador >= 0 ? "+" : ""}${modificador}${notaCritico}${notaSucesso}`,
        critico: criticoNegativo ? "falha" : (criticoPositivo ? "acerto" : null)
    });
    toast(`${nomeAlvo}: ${resultado} (d20: ${bruto} ${modificador >= 0 ? "+" : ""}${modificador})${notaCritico}${notaSucesso}`, criticoNegativo ? "critico-falha" : (criticoPositivo ? "critico-acerto" : (temDificuldade && !sucesso ? "erro" : "ok")));

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: quem,
            detalhe: `${quem} rolou "${nomeAlvo}" (resultado ${resultado}) e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }
    return { resultado, bruto, criticoPositivo, criticoNegativo, sucesso };
}

// Manobra "Esquivar" usada proativamente no PRÓPRIO turno (diferente da
// Esquiva/Bloqueio reativa que já existe pro golpe recebido, guardada
// automaticamente no fim do turno — ver mestre.js). Rola d20 + Agilidade
// (não é perícia treinável) e, se realmente for o turno de quem rolou
// (checarConsumoDeAcao só devolve um participanteId nesse caso), guarda
// mais uma esquiva pro personagem — empilha em cima da guarda
// automática, permitindo anular mais de um golpe recebido na mesma
// rodada. Cada golpe recebido ainda só consome 1 esquiva por vez (ver
// usarEsquivaBloqueio em mestre.js): se a primeira tentativa "falhar"
// (o Mestre/alvo decidir não esquivar daquele golpe específico, ou o
// golpe ser de arma de fogo, que não pode ser esquivado), a esquiva
// guardada não é perdida — ela continua disponível pro próximo golpe.
export async function executarManobraEsquivar(modificadoresPlanos) {
    const consumo = checarConsumoDeAcao();
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const derivados = calcularDerivados(estado.fichaAtual.dados, modificadoresPlanos);
    const modAgilidadeBase = derivados.secundarios.agilidade.total + penalidadeTestesAtual() + penalidadeEnergiaPara("fisica");

    // Ocasião Especial (ver abrirModalDeltaOcasionais acima): Esquivar
    // rola Agilidade (secundario:agilidade) — se algum modificador
    // situacional mirar esse alvo, abre o mesmo passo de confirmação com
    // checkbox antes de rolar; sem nenhum, segue direto (comportamento
    // antigo). Fica ANTES do d20 pra não gastar o dado se o jogador
    // fechar o modal sem confirmar.
    const ocasionaisEsquivar = modificadoresOcasionaisDoAlvo(estado.fichaAtual, "secundario:agilidade");
    const { confirmado, delta } = await abrirModalDeltaOcasionais("Esquivar (Agilidade)", ocasionaisEsquivar);
    if (!confirmado) return;
    const modAgilidade = modAgilidadeBase + delta;

    const bruto = rolarD20();
    const resultado = bruto + modAgilidade;
    const quem = estado.isMestre
        ? `Mestre (${estado.modoNpc ? (estado.fichaAtual?.config?.nomeExibicao || estado.npcAtualId) : (nomeDeFicha(estado.fichaAtualId) || "—")})`
        : (estado.fichaAtual?.config?.nomeExibicao || estado.sessao.nome || "Jogador");

    await registrarRolagem({
        quem, modificador: modAgilidade, resultado,
        detalhe: `Esquivar (Agilidade): d20 (${bruto}) ${modAgilidade >= 0 ? "+" : ""}${modAgilidade}`
    });
    toast(`Esquivar (Agilidade): ${resultado} (d20: ${bruto} ${modAgilidade >= 0 ? "+" : ""}${modAgilidade})`);

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: quem,
            detalhe: `${quem} usou "Esquivar" no próprio turno (resultado ${resultado}) e quer gastar 1 ação do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");

        // Usada no próprio turno (é isso que participanteIdParaGastarAcao
        // != null garante) — guarda uma esquiva extra pro personagem.
        await adicionarEsquivaExtra(participanteIdParaGastarAcao);
        toast("Esquiva extra guardada — dá pra esquivar de mais de um golpe agora.");
    }
}

// Calcula o modificador de perícia a aplicar numa rolagem de uso/ataque,
// já respeitando a regra global: nível 0 (ou perícia inexistente na
// ficha) vira -1 fixo, em vez do total calculado normalmente.
// `limiteNivel` (opcional) repassa pra calcularTotalPericia — ver
// tagPermiteLimiteRolagemPorNivel/nivelTag do item que gerou a rolagem
// (chamado por rolarComPericiaDoItem etc.). Sem treino (-1 fixo) não
// aplica limite — não faz sentido capar algo que já não usa o nível.
export function modificadorDePericiaComPenalidade(nomePericia, dadosPrimarios, pericias, modificadoresPlanos, penalidadeSaude = 0, limiteNivel = null) {
    const entrada = Object.entries(pericias || {}).find(([, p]) => p.nome === nomePericia);
    const penalidadeTotal = (Number(penalidadeSaude) || 0) + penalidadeEnergiaParaPericia(nomePericia);
    if (!entrada || (Number(entrada[1].nivel) || 0) <= 0) {
        // Sem treino: penalidade fixa -1, mas um bônus genérico por
        // categoria (ex.: Vantagem "Instinto Físico Apurado", testes_fisicos)
        // ainda ajuda — só o bônus específico por nome de perícia (que
        // não existe treinada) não entra.
        const infoPericiaDestreinada = buscarPericiaPorNome(nomePericia);
        const alvoCategoriaDestreinada = infoPericiaDestreinada ? ALVO_TESTES_POR_CATEGORIA[infoPericiaDestreinada.categoria] : null;
        const bonusCategoriaDestreinado = alvoCategoriaDestreinada ? somaModificadoresPara(alvoCategoriaDestreinada, modificadoresPlanos) : 0;
        return -1 + penalidadeTotal + bonusCategoriaDestreinado;
    }
    return calcularTotalPericia(entrada[1], dadosPrimarios, modificadoresPlanos, penalidadeTotal, limiteNivel).total;
}

// Só armas de fogo de verdade (não golpe desarmado nem arma branca) tem
// carregador — precisam de um carregador anexado com munição pra disparar.
function ehArmaComCarregador(it) {
    return ehArma(it.tag) && ehArmaDeFogo(it.periciaUso) && !(it.arma && it.arma.desarmado);
}

// Se a arma usa carregador (magazine) removível ou dispara direto do
// estoque de munição no inventário (ex.: revólver, escopeta 12 gauge) —
// escolha explícita feita no modal (checkbox "Usa carregador?"), não mais
// automática só por calibre. Itens salvos antes dessa opção existir não
// têm `usaCarregador` gravado, então caem no fallback de sempre: só
// escopeta (12 gauge) não usava carregador.
export function armaUsaCarregador(it) {
    if (!it || !it.arma) return true;
    if (typeof it.arma.usaCarregador === "boolean") return it.arma.usaCarregador;
    return !ehCalibreEscopeta(it.calibre);
}

// Desconta 1 projétil do carregador (usado a cada disparo bem-sucedido de
// "Usar"). Some primeiro do grupo de projéteis carregados que ainda tiver
// saldo, só pra manter a lista de "o que tá dentro" (tooltip) coerente —
// o valor que manda mesmo é municaoAtual.
function descontarUmProjetil(carregadorCfg) {
    const lista = (carregadorCfg.projeteisCarregados || []).map(p => ({ ...p }));
    for (const grupo of lista) {
        if (grupo.quantidade > 0) { grupo.quantidade -= 1; break; }
    }
    return {
        ...carregadorCfg,
        municaoAtual: Math.max(0, (Number(carregadorCfg.municaoAtual) || 0) - 1),
        projeteisCarregados: lista.filter(g => g.quantidade > 0)
    };
}

// Desconta 1 projétil direto do estoque no inventário (sem carregador) —
// usado por armas marcadas como "não usa carregador" (revólver, escopeta
// 12 gauge...) e pra carregar a câmara de armas com Capacidade +1. Pega
// o primeiro item de projétil compatível com o calibre (ex.: buckshot ou
// slug pra 12 gauge) que estiver em "Levando consigo"; apaga o item se a
// quantidade zerar.
async function descontarProjetilDiretoDoEstoque(calibreArma) {
    const candidatos = listaProjeteisInventario(estado.fichaAtual, calibreArma)
        .filter(p => p.categoria === "levando" && (Number(p.projetil?.quantidade) || 0) > 0);
    if (!candidatos.length) return false;

    const proj = candidatos[0];
    const restante = (Number(proj.projetil.quantidade) || 0) - 1;
    if (restante > 0) {
        const atualizado = { ...proj.projetil, quantidade: restante };
        // volume precisa acompanhar a quantidade que sobrou (mesma fórmula
        // de sempre — Math.floor(volumeUnitario × quantidade), ver Fase 4);
        // senão o item fica com o volume "congelado" no valor de antes do
        // disparo, superestimando o quanto ele ocupa (ex.: num recipiente).
        const volumeAtualizado = Math.floor((Number(proj.volumeUnitario) || 0) * restante);
        estado.fichaAtual.inventario[proj.id] = { ...fichaAtual.inventario[proj.id], projetil: atualizado, volume: volumeAtualizado };
        await update(ref(db, `${caminhoBase()}/inventario/${proj.id}`), { projetil: atualizado, volume: volumeAtualizado });
    } else {
        // update() só apaga uma chave se ela vier explicitamente como null
        // no payload (mesmo motivo documentado em carregarCarregador).
        delete estado.fichaAtual.inventario[proj.id];
        await update(ref(db, `${caminhoBase()}/inventario`), { [proj.id]: null });
    }
    return true;
}

// Antes de disparar: exige carregador anexado e com munição — exceto pra
// arma marcada como "não usa carregador" (revólver, escopeta 12 gauge...),
// que dispara direto do estoque de projéteis no inventário. Se a arma tem
// Capacidade +1 (bala na agulha) e o carregador anexado está vazio, ainda
// dispara consumindo o round que estava só na câmara antes de bloquear.
async function consumirMunicaoSeArmaDeFogo(it) {
    if (!ehArmaComCarregador(it)) return true;

    if (!armaUsaCarregador(it)) {
        // Antes disparava direto do estoque solto no inventário, sem
        // limite de "quanto cabe na arma" — um revólver de tambor 6
        // disparava o 10º projétil do bolso igual ao 1º. Agora a munição
        // mora dentro da própria arma (arma.carregadorInterno, preenchido
        // via "Recarregar" — ver recarregarArmaSemCarregador), do mesmo
        // jeito que um carregador removível: dispara consome daqui, não
        // mais do inventário solto.
        const cfg = it.arma && it.arma.carregadorInterno;
        const municaoAtual = Number(cfg?.municaoAtual) || 0;
        if (municaoAtual <= 0) {
            toast(`${it.nome} está sem munição carregada. Use "Recarregar" pra encher o tambor/câmara com ${rotuloCalibre(it.calibre) || "munição compatível"} do inventário.`, "erro");
            return false;
        }
        const cfgAtualizado = descontarUmProjetil(cfg);
        const armaAtualizada = { ...it, arma: { ...it.arma, carregadorInterno: cfgAtualizado } };
        estado.fichaAtual.inventario[it.id] = armaAtualizada;
        await update(ref(db, `${caminhoBase()}/inventario/${it.id}/arma/carregadorInterno`), cfgAtualizado);
        return true;
    }

    const carregadorId = it.arma && it.arma.carregadorId;
    const carregador = carregadorId ? estado.fichaAtual.inventario?.[carregadorId] : null;
    const municaoCarregador = (carregador && carregador.carregador) ? (Number(carregador.carregador.municaoAtual) || 0) : 0;
    const temCamaraExtra = !!(it.arma && it.arma.temCamaraExtra);
    const camaraCarregada = temCamaraExtra && !!(it.arma && it.arma.camaraCarregada);

    if (municaoCarregador > 0) {
        const carregadorAtualizado = descontarUmProjetil(carregador.carregador);
        estado.fichaAtual.inventario[carregadorId] = { ...carregador, carregador: carregadorAtualizado };
        await update(ref(db, `${caminhoBase()}/inventario/${carregadorId}/carregador`), carregadorAtualizado);
        return true;
    }

    if (camaraCarregada) {
        // Carregador vazio (ou nem anexado), mas ainda tem a bala que
        // tava só na agulha — dispara ela e esvazia a câmara. Persiste
        // no próprio item da arma (não no carregador), então sobrevive
        // à troca de carregador (ver recarregarArma/retirarCarregadorArma).
        const armaAtualizada = { ...it, arma: { ...it.arma, camaraCarregada: false } };
        estado.fichaAtual.inventario[it.id] = armaAtualizada;
        await update(ref(db, `${caminhoBase()}/inventario/${it.id}/arma`), armaAtualizada.arma);
        toast("Disparou a bala que estava na agulha — câmara vazia agora.");
        return true;
    }

    if (!carregadorId || !carregador || !carregador.carregador) {
        toast("Esta arma está sem carregador anexado. Anexe um carregador (editando a arma) antes de atirar.", "erro");
        return false;
    }
    toast(`Carregador vazio. Use "Recarregar" pra trocar por um carregador com munição${temCamaraExtra ? ", ou carregue a câmara" : ""}.`, "erro");
    return false;
}

// ---------------------------------------------------------------------
// "Carregar" um carregador: pega projéteis do mesmo calibre que estiverem
// no inventário (categoria "levando") e enche o carregador até a
// capacidade máxima, descontando (ou apagando) os itens "projétil" que
// forem usados. Uma vez dentro do carregador, o projétil some da lista
// principal do inventário — só aparece na dica (hover) do carregador.
// ---------------------------------------------------------------------
export async function carregarCarregador(carregadorId, carregadorItem) {
    if (!itemPodeUsar(carregadorItem)) { toast("O carregador precisa estar em \"Levando consigo\".", "erro"); return; }
    const cfg = carregadorItem.carregador;
    if (!cfg) return;
    let espacoLivre = Math.max(0, (cfg.capacidadeMax || 0) - (cfg.municaoAtual || 0));
    if (espacoLivre <= 0) { toast("Este carregador já está cheio.", "erro"); return; }

    const candidatos = listaProjeteisInventario(estado.fichaAtual, carregadorItem.calibre)
        .filter(p => p.categoria === "levando");
    if (!candidatos.length) { toast("Não há projéteis desse calibre no inventário.", "erro"); return; }

    const projeteisCarregados = (cfg.projeteisCarregados || []).map(p => ({ ...p }));
    const inventarioAtualizado = { ...fichaAtual.inventario };
    let carregouAlgo = false;

    for (const proj of candidatos) {
        if (espacoLivre <= 0) break;
        const disponivel = Number(proj.projetil?.quantidade) || 0;
        if (disponivel <= 0) continue;
        const movido = Math.min(disponivel, espacoLivre);
        espacoLivre -= movido;
        carregouAlgo = true;

        const restante = disponivel - movido;
        if (restante > 0) {
            // volume precisa acompanhar a quantidade que sobrou no estoque
            // (mesma fórmula de Math.floor(volumeUnitario × quantidade) da
            // Fase 4) — senão o item fica mostrando o volume de antes de
            // carregar o carregador, superestimando o espaço ocupado.
            const volumeAtualizado = Math.floor((Number(proj.volumeUnitario) || 0) * restante);
            inventarioAtualizado[proj.id] = { ...proj, projetil: { ...proj.projetil, quantidade: restante }, volume: volumeAtualizado };
        } else {
            // update() só apaga uma chave se ela vier explicitamente como
            // null no payload — remover a chave do objeto local (delete)
            // não é suficiente, porque update() simplesmente ignora
            // qualquer chave ausente e deixa o valor antigo intacto no
            // Firebase (e o listener em tempo real trazia o item de volta
            // com a quantidade não descontada).
            inventarioAtualizado[proj.id] = null;
        }

        const grupoExistente = projeteisCarregados.find(g => g.nome === proj.nome);
        if (grupoExistente) grupoExistente.quantidade += movido;
        else projeteisCarregados.push({ nome: proj.nome, quantidade: movido });
    }

    if (!carregouAlgo) { toast("Não havia projéteis disponíveis pra carregar.", "erro"); return; }

    const capacidadeMax = cfg.capacidadeMax || 0;
    const carregadorAtualizado = {
        ...cfg,
        municaoAtual: capacidadeMax - espacoLivre,
        projeteisCarregados
    };
    inventarioAtualizado[carregadorId] = { ...carregadorItem, carregador: carregadorAtualizado };

    // O payload que vai pro Firebase mantém os `null` (é o que apaga a
    // chave de fato); o estado local só deve refletir itens que ainda
    // existem, senão qualquer código que iterar o inventário local ia
    // encontrar um item `null` no meio da lista.
    const inventarioLocal = {};
    for (const [itId, itVal] of Object.entries(inventarioAtualizado)) {
        if (itVal !== null) inventarioLocal[itId] = itVal;
    }
    estado.fichaAtual.inventario = inventarioLocal;
    await update(ref(db, `${caminhoBase()}/inventario`), inventarioAtualizado);
    toast(`${carregadorItem.nome} carregado (${carregadorAtualizado.municaoAtual}/${capacidadeMax}).`);
}

// ---------------------------------------------------------------------
// "Recarregar" uma arma SEM carregador removível (revólver, escopeta
// 12 gauge...): pega projéteis do mesmo calibre que estiverem soltos no
// inventário (categoria "levando") e enche o carregadorInterno da própria
// arma até a capacidade máxima (arma.capacidade) — mesma lógica de
// carregarCarregador, só que o "recipiente" é a arma em vez de um item
// separado. Ex.: revólver de tambor 6, 10 projéteis soltos no bolso →
// recarregar move 6 pra dentro da arma, sobram 4 soltos no inventário.
// ---------------------------------------------------------------------
async function recarregarArmaSemCarregador(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    const cfg = armaItem.arma && armaItem.arma.carregadorInterno;
    if (!cfg) {
        toast(`${armaItem.nome} ainda não tem uma Capacidade definida — edite a arma e preencha o campo "Capacidade" (ex: 6 pra um revólver) antes de recarregar.`, "erro");
        return;
    }
    let espacoLivre = Math.max(0, (cfg.capacidadeMax || 0) - (cfg.municaoAtual || 0));
    if (espacoLivre <= 0) { toast(`${armaItem.nome} já está com o tambor/câmara cheio.`, "erro"); return; }

    const candidatos = listaProjeteisInventario(estado.fichaAtual, armaItem.calibre)
        .filter(p => p.categoria === "levando");
    if (!candidatos.length) { toast("Não há projéteis desse calibre soltos no inventário.", "erro"); return; }

    const projeteisCarregados = (cfg.projeteisCarregados || []).map(p => ({ ...p }));
    const inventarioAtualizado = { ...fichaAtual.inventario };
    let carregouAlgo = false;

    for (const proj of candidatos) {
        if (espacoLivre <= 0) break;
        const disponivel = Number(proj.projetil?.quantidade) || 0;
        if (disponivel <= 0) continue;
        const movido = Math.min(disponivel, espacoLivre);
        espacoLivre -= movido;
        carregouAlgo = true;

        const restante = disponivel - movido;
        if (restante > 0) {
            const volumeAtualizado = Math.floor((Number(proj.volumeUnitario) || 0) * restante);
            inventarioAtualizado[proj.id] = { ...proj, projetil: { ...proj.projetil, quantidade: restante }, volume: volumeAtualizado };
        } else {
            inventarioAtualizado[proj.id] = null;
        }

        const grupoExistente = projeteisCarregados.find(g => g.nome === proj.nome);
        if (grupoExistente) grupoExistente.quantidade += movido;
        else projeteisCarregados.push({ nome: proj.nome, quantidade: movido });
    }

    if (!carregouAlgo) { toast("Não havia projéteis disponíveis pra carregar.", "erro"); return; }

    const capacidadeMax = cfg.capacidadeMax || 0;
    const cfgAtualizado = {
        ...cfg,
        municaoAtual: capacidadeMax - espacoLivre,
        projeteisCarregados
    };
    inventarioAtualizado[armaId] = { ...armaItem, arma: { ...armaItem.arma, carregadorInterno: cfgAtualizado } };

    const inventarioLocal = {};
    for (const [itId, itVal] of Object.entries(inventarioAtualizado)) {
        if (itVal !== null) inventarioLocal[itId] = itVal;
    }
    estado.fichaAtual.inventario = inventarioLocal;
    await update(ref(db, `${caminhoBase()}/inventario`), inventarioAtualizado);
    toast(`${armaItem.nome} recarregada (${cfgAtualizado.municaoAtual}/${capacidadeMax}).`);
}

// ---------------------------------------------------------------------
// "Recarregar" uma arma: troca o carregador anexado por outro carregador
// do mesmo calibre, no inventário, que tenha mais munição do que o atual.
// Escolhe o de maior munição entre os candidatos. Pra arma sem carregador
// removível, delega pra recarregarArmaSemCarregador (mesmo botão "Recarregar"
// na UI, comportamento certo pra cada tipo de arma).
// ---------------------------------------------------------------------
export async function recarregarArma(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    if (!armaUsaCarregador(armaItem)) {
        return recarregarArmaSemCarregador(armaId, armaItem);
    }
    const calibre = armaItem.calibre;
    const carregadorAtualId = armaItem.arma && armaItem.arma.carregadorId;
    const municaoAtualAnexada = (carregadorAtualId && estado.fichaAtual.inventario?.[carregadorAtualId]?.carregador?.municaoAtual) || 0;

    const candidatos = listaCarregadoresInventario(estado.fichaAtual, calibre)
        .filter(c => c.categoria === "levando" && c.id !== carregadorAtualId)
        .filter(c => (Number(c.carregador?.municaoAtual) || 0) > municaoAtualAnexada)
        .sort((a, b) => (b.carregador?.municaoAtual || 0) - (a.carregador?.municaoAtual || 0));

    if (!candidatos.length) {
        toast("Não há outro carregador desse calibre com mais munição pra recarregar.", "erro");
        return;
    }

    const novoCarregador = candidatos[0];
    const armaAtualizada = { ...armaItem, arma: { ...armaItem.arma, carregadorId: novoCarregador.id } };
    estado.fichaAtual.inventario[armaId] = armaAtualizada;
    await update(ref(db, `${caminhoBase()}/inventario/${armaId}/arma`), armaAtualizada.arma);
    toast(`${armaItem.nome} recarregada com ${novoCarregador.nome} (${novoCarregador.carregador.municaoAtual}/${novoCarregador.carregador.capacidadeMax}).`);
}

// ---------------------------------------------------------------------
// "Retirar carregador" de uma arma: apenas desanexa o carregador atual
// (arma.carregadorId volta pra null) sem trocar por outro. O carregador
// em si nunca deixou de existir no inventário — ele só ficava escondido
// da lista principal enquanto estava anexado (ver carregadorEstaAnexado
// em inventario.js); ao desanexar, ele volta a aparecer normalmente,
// já com a munição que tinha dentro dele.
// ---------------------------------------------------------------------
export async function retirarCarregadorArma(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    if (!armaUsaCarregador(armaItem)) {
        toast("Esta arma não usa carregador — ela dispara direto do estoque de munição.", "erro");
        return;
    }
    const carregadorId = armaItem.arma && armaItem.arma.carregadorId;
    const carregador = carregadorId ? estado.fichaAtual.inventario?.[carregadorId] : null;
    if (!carregadorId || !carregador) {
        toast("Esta arma já está sem carregador anexado.", "erro");
        return;
    }

    const armaAtualizada = { ...armaItem, arma: { ...armaItem.arma, carregadorId: null } };
    estado.fichaAtual.inventario[armaId] = armaAtualizada;
    await update(ref(db, `${caminhoBase()}/inventario/${armaId}/arma`), armaAtualizada.arma);

    const municao = carregador.carregador?.municaoAtual ?? 0;
    const capacidade = carregador.carregador?.capacidadeMax ?? 0;
    toast(`${carregador.nome} retirado de ${armaItem.nome} e devolvido ao inventário (${municao}/${capacidade}).`);
}

// ---------------------------------------------------------------------
// "Colocar bala na agulha": carrega 1 projétil direto na câmara de uma
// arma com Capacidade +1, gastando 1 unidade do estoque de munição
// compatível em "Levando consigo" (mesma fonte que descontarProjetilDireto-
// DoEstoque usa pra disparar sem carregador). Fica marcado em arma.
// camaraCarregada — persiste trocando de carregador (ver recarregarArma/
// retirarCarregadorArma, que só mexem em carregadorId) e só é gasto
// quando o carregador anexado esvaziar (ver consumirMunicaoSeArmaDeFogo).
// ---------------------------------------------------------------------
export async function carregarCamaraArma(armaId, armaItem) {
    if (!itemPodeUsar(armaItem)) { toast("A arma precisa estar em \"Levando consigo\".", "erro"); return; }
    if (!armaItem.arma || !armaItem.arma.temCamaraExtra) {
        toast("Esta arma não tem Capacidade +1 (bala na agulha).", "erro");
        return;
    }
    if (armaItem.arma.camaraCarregada) {
        toast("A câmara já está carregada.", "erro");
        return;
    }
    const descontou = await descontarProjetilDiretoDoEstoque(armaItem.calibre);
    if (!descontou) {
        toast(`Sem munição ${rotuloCalibre(armaItem.calibre) || "compatível"} em "Levando consigo" pra carregar a câmara.`, "erro");
        return;
    }
    const armaAtualizada = { ...armaItem, arma: { ...armaItem.arma, camaraCarregada: true } };
    estado.fichaAtual.inventario[armaId] = armaAtualizada;
    await update(ref(db, `${caminhoBase()}/inventario/${armaId}/arma`), armaAtualizada.arma);
    toast(`${armaItem.nome}: bala colocada na agulha.`);
}

// ---------------------------------------------------------------------
// Ocasião Especial (ver regras.js/modificadoresOcasionaisDaPericia):
// helpers reaproveitados por QUALQUER fluxo que role uma perícia vinda
// de "Usar" um item — item comum (rolarComPericiaDoItem), Explosivo
// (abrirModalArmarExplosivo) e, por tabela (já que os dois chamam
// rolarComPericiaDoItem por baixo), Kit de Ferramentas de Criação geral,
// Eletrônico multi-perícia e Destrave/Arrombar também ganham o checkbox
// de graça, sem precisar mexer neles.
// ---------------------------------------------------------------------
export function htmlCheckboxesOcasionais(ocasionais, nomePericia) {
    if (!ocasionais.length) return "";
    return `
        <div class="pericia-ocasionais" style="margin-top:10px;">
            ${ocasionais.map((o, idx) => `
                <label class="checkbox-inline" style="margin-top:4px;">
                    <input type="checkbox" class="ocasional-check" data-idx="${idx}" ${o.ativo ? "checked" : ""}>
                    ${escapeHtml(o.origem)} (${o.valor >= 0 ? "+" : ""}${o.valor} em ${escapeHtml(nomePericia)})
                </label>
            `).join("")}
        </div>
    `;
}

// Lê o estado das checkboxes ".ocasional-check" DENTRO de `container`
// (escopado — não usa document.querySelectorAll — porque a aba
// Perícias pode ter suas próprias checkboxes de ocasião especial na
// tela ao mesmo tempo que um modal como este está aberto). Devolve o
// delta a somar na rolagem de agora e já dispara a persistência de
// cada modificador que mudou de estado (mesmo padrão fire-and-forget
// de alternarAtivoEntidade — a sincronização em tempo real cuida do
// resto, inclusive de refletir na aba Perícias depois).
export function lerDeltaOcasionais(container, ocasionais) {
    let delta = 0;
    if (!container) return delta;
    container.querySelectorAll(".ocasional-check").forEach(chk => {
        const o = ocasionais[Number(chk.dataset.idx)];
        if (!o) return;
        if (chk.checked !== o.ativo) {
            delta += (chk.checked ? o.valor : -o.valor);
            alternarModificadorOcasional(o, chk.checked);
        }
    });
    return delta;
}

// Anexa os checkboxes de Ocasião Especial da perícia usada numa manobra
// de combate (Agarrar, Desarmar, Derrubar, Delimitar, Retomar,
// Imobilizar, Imobilizar Jiu Jitsu) dentro de el.alvoCampoExtra — SOMA
// ao conteúdo que a manobra já monte ali (ex.: o checkbox de CQC nível
// 2 em Derrubar), nunca sobrescreve. Devolve a lista de ocasionais
// (pode vir vazia) pra guardar no contexto da manobra e reaproveitar
// depois, em alvoConfirmar, na hora de ler o delta.
function anexarOcasionaisNoCampoExtra(nomePericia) {
    const ocasionais = modificadoresOcasionaisDaPericia(estado.fichaAtual, nomePericia);
    if (ocasionais.length) {
        el.alvoCampoExtra.style.display = "block";
        el.alvoCampoExtra.innerHTML += htmlCheckboxesOcasionais(ocasionais, nomePericia);
    }
    return ocasionais;
}

// "Usar" um item/arma do inventário: rola d20 + o total da perícia
// vinculada a ele (nível + modificadores estruturados que apontam pra
// essa perícia). Regra global: por ser um teste de perícia, se o
// personagem estiver no nível 0 naquela perícia (ou nem tiver o
// registro dela), o modificador aplicado é -1, não o total calculado.
// Rola de fato a perícia vinculada ao uso de um item — extraído de
// rolarUsoItem pra poder ser chamado tanto direto (item com periciaUso
// fixo) quanto depois de escolher qual perícia usar (Kit de Ferramentas
// de Criação geral — ver abrirModalEscolherPericiaItem).
//
// Se a perícia usada tem algum modificador de Ocasião Especial (ver
// bloco acima), abre um passo extra de confirmação com os checkboxes
// antes de rolar — item comum sem nenhuma especialização vinculada
// continua rolando direto, sem esse passo a mais no meio.
// Teto de rolagem de um item (ver tagPermiteLimiteRolagemPorNivel em
// dados-manual.js e checkbox "Limitar rolagem" no modal): devolve o
// nivelTag do item quando o checkbox está marcado e o item tem nível
// válido, ou null (sem teto) caso contrário — repassado como
// `limiteNivel` pra modificadorDePericiaComPenalidade/calcularTotalPericia.
function limiteRolagemDoItem(it) {
    if (!it || !it.limitarRolagemPorNivel) return null;
    const nivel = Number(it.nivelTag);
    return nivel > 0 ? nivel : null;
}

// Mesma ideia de limiteRolagemDoItem acima, só que pra rolagem de
// CRIAR uma receita (aba Receitas) — que rola por perícia, não por um
// item específico escolhido na hora (diferente do "Usar" de inventário,
// que já sabe qual item está sendo usado). Aqui é preciso primeiro
// descobrir qual(is) Ferramenta de Criação da ficha serve(m) pra essa
// perícia:
// - Química -> tag "ferramenta_criacao_quimica"
// - Biomecânica -> tag "ferramenta_criacao_biomecanica"
// - qualquer uma de PERICIAS_FERRAMENTA_CRIACAO (Mecânica Automotiva,
//   Armeiro, Ofícios Utilitários, Explosivos, Eletrônica) -> tag
//   "ferramenta_criacao" (kit geral, serve pras 5 de uma vez)
// Critério (sem adicionar um seletor de ferramenta na UI): se o
// personagem não tem nenhuma ferramenta daquele tipo, ou tem pelo
// menos uma SEM "Limitar rolagem" marcado, a rolagem fica sem teto —
// presume-se que ele usaria essa ferramenta livre. Só capa quando
// TODAS as ferramentas daquele tipo estão marcadas, usando a de maior
// nível entre elas (a melhor que ele tem).
export function limiteRolagemCriacaoParaPericia(nomePericia) {
    let tagAlvo;
    if (nomePericia === "Química") tagAlvo = "ferramenta_criacao_quimica";
    else if (nomePericia === "Biomecânica") tagAlvo = "ferramenta_criacao_biomecanica";
    else if (PERICIAS_FERRAMENTA_CRIACAO.includes(nomePericia)) tagAlvo = "ferramenta_criacao";
    else return null;

    const itensFerramenta = Object.values(estado.fichaAtual.inventario || {}).filter(it => it && it.tag === tagAlvo);
    if (!itensFerramenta.length) return null;
    if (itensFerramenta.some(it => !it.limitarRolagemPorNivel)) return null;
    const niveis = itensFerramenta.map(it => Number(it.nivelTag) || 0).filter(n => n > 0);
    return niveis.length ? Math.max(...niveis) : null;
}

// Item usado direto "Em casa" (kit de bancada, notebook etc. — ver
// itemPodeUsarEmCasa em inventario.js) ganha esse sufixo no nome que
// vai pro Log de Dados, pra ficar claro de onde a ferramenta veio sem
// precisar abrir a ficha e conferir.
function rotuloUsoItem(it) {
    return itemPodeUsarEmCasa(it) ? `${it.nome} (em casa)` : it.nome;
}

async function rolarComPericiaDoItem(it, nomePericia, modificadoresPlanos) {
    const ocasionais = modificadoresOcasionaisDaPericia(estado.fichaAtual, nomePericia);
    if (!ocasionais.length) {
        const modificadorFinal = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual(), limiteRolagemDoItem(it));
        await rolarERegistrar(`${rotuloUsoItem(it)} (${nomePericia})`, modificadorFinal, nomePericia === "CQC");
        return;
    }
    abrirModalConfirmarOcasionaisUso(it, nomePericia, modificadoresPlanos, ocasionais);
}

function abrirModalConfirmarOcasionaisUso(it, nomePericia, modificadoresPlanos, ocasionais) {
    let modal = document.getElementById("modal-ocasionais-uso-item");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-ocasionais-uso-item";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Usar ${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>${escapeHtml(nomePericia)}</h4>
        <p class="hint">Marque as Ocasiões Especiais que se aplicam a este uso antes de rolar.</p>
        <div id="ocasionais-uso-item-lista">${htmlCheckboxesOcasionais(ocasionais, nomePericia)}</div>
        <div class="modal-btns">
            <button type="button" class="btn-lime" id="btn-confirmar-ocasionais-uso">Rolar ${escapeHtml(nomePericia)}</button>
        </div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-ocasionais-uso").addEventListener("click", async () => {
        const delta = lerDeltaOcasionais(modal.querySelector("#ocasionais-uso-item-lista"), ocasionais);
        modal.remove();
        const modificadorFinal = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual(), limiteRolagemDoItem(it)) + delta;
        await rolarERegistrar(`${rotuloUsoItem(it)} (${nomePericia})`, modificadorFinal, nomePericia === "CQC");
    });
    document.body.appendChild(modal);
}

// ---------------------------------------------------------------------
// Helper "base": abre o modal de checkboxes de Ocasião Especial e resolve
// com o delta escolhido (0 se não tiver ocasional nenhum ou se o jogador
// fechar sem confirmar — quem chama decide se cancela ou rola com delta
// 0 nesse caso). Reaproveitado por rolarComPossibilidadeDeOcasionais
// (rolagem simples) e por qualquer rolagem com lógica própria depois do
// resultado (ex.: executarManobraEsquivar, que ainda guarda uma esquiva
// extra) que não pode simplesmente delegar tudo pra rolarERegistrar.
// ---------------------------------------------------------------------
function abrirModalDeltaOcasionais(nomeAlvo, ocasionais) {
    if (!ocasionais.length) return Promise.resolve({ confirmado: true, delta: 0 });
    return new Promise((resolve) => {
        let modal = document.getElementById("modal-ocasionais-rolagem");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "modal-ocasionais-rolagem";
            modal.className = "panel combate-painel-jogador";
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="combate-painel-topo">
                <span class="eyebrow">${escapeHtml(nomeAlvo)}</span>
                <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
            </div>
            <p class="hint">Marque as Ocasiões Especiais que se aplicam a esta rolagem antes de rolar.</p>
            <div id="ocasionais-rolagem-lista">${htmlCheckboxesOcasionais(ocasionais, nomeAlvo)}</div>
            <div class="modal-btns">
                <button type="button" class="btn-lime" id="btn-confirmar-ocasionais-rolagem">Rolar ${escapeHtml(nomeAlvo)}</button>
            </div>
        `;
        const fechar = () => { modal.remove(); resolve({ confirmado: false, delta: 0 }); };
        modal.querySelector(".combate-fechar").addEventListener("click", fechar);
        modal.querySelector("#btn-confirmar-ocasionais-rolagem").addEventListener("click", () => {
            const delta = lerDeltaOcasionais(modal.querySelector("#ocasionais-rolagem-lista"), ocasionais);
            modal.remove();
            resolve({ confirmado: true, delta });
        });
        document.body.appendChild(modal);
    });
}

// ---------------------------------------------------------------------
// Versão "genérica" do passo de confirmação acima (abrirModalConfirmarOcasionaisUso
// é só pro uso de item) — reaproveitada por QUALQUER rolagem solta de
// perícia ou atributo (primário/secundário) feita fora do fluxo de item:
// botão "🎲" da lista de Perícias e dos cards de Atributos. Se o alvo
// rolado (`pericia:X`, `atributo:X`, `secundario:X`...) tiver algum
// modificador de Ocasião Especial cadastrado (especialização/vantagem
// que aumenta ou diminui a dificuldade/modificador só numa situação
// pontual), abre o mesmo modal de "aperte pra rolar" com os checkboxes
// antes de rolar de fato — sem nenhum ocasional pro alvo, rola direto,
// sem esse passo a mais no meio (comportamento antigo preservado).
// `modificadorBase` já deve vir pronto do jeito que já era calculado
// antes (inclui os modificadores permanentes e os ocasionais que já
// estejam ligados) — o delta aqui cobre só o que mudar de estado nesta
// tela antes de confirmar, igual lerDeltaOcasionais já faz pro uso de item.
// ---------------------------------------------------------------------
export async function rolarComPossibilidadeDeOcasionais(nomeAlvo, alvoModificador, modificadorBase, ehCQC = false, dificuldade = null) {
    const ocasionais = modificadoresOcasionaisDoAlvo(estado.fichaAtual, alvoModificador);
    const { confirmado, delta } = await abrirModalDeltaOcasionais(nomeAlvo, ocasionais);
    if (!confirmado) return undefined;
    return rolarERegistrar(nomeAlvo, modificadorBase + delta, ehCQC, dificuldade);
}

async function rolarUsoItem(it, modificadoresPlanos) {
    // Kit de Ferramentas de Criação (geral — manual pg. 71): o mesmo kit
    // serve pra Explosivos, Mecânica Automotiva, Armeiro, Ofícios
    // Utilitários e Eletrônica (ver ehFerramentaCriacaoGeral em
    // dados-manual.js) — por isso não fica travado numa perícia só na
    // criação do item; a escolha é feita aqui, na hora de usar.
    if (ehFerramentaCriacaoGeral(it.tag) && !it.periciaUso) {
        abrirModalEscolherPericiaItem(it, PERICIAS_FERRAMENTA_CRIACAO, modificadoresPlanos, "Kit de Ferramentas de Criação (geral) — serve pra Explosivos, Mecânica Automotiva, Armeiro, Ofícios Utilitários e Eletrônica. Escolha qual perícia rolar agora.");
        return;
    }
    // Eletrônico pode ficar vinculado a mais de uma perícia ao mesmo
    // tempo (Hacking e Programação — ver ehTagMultiPericia em
    // dados-manual.js). Com as duas marcadas, pergunta qual rolar agora,
    // igual ao Kit de Ferramentas de Criação geral acima.
    const periciasItem = periciaUsoComoArray(it.periciaUso);
    if (periciasItem.length > 1) {
        abrirModalEscolherPericiaItem(it, periciasItem, modificadoresPlanos, "Este item está vinculado a mais de uma perícia. Escolha qual rolar agora.");
        return;
    }
    const nomePericia = periciasItem[0];
    if (!nomePericia) { toast("Este item não tem perícia vinculada.", "erro"); return; }
    await rolarComPericiaDoItem(it, nomePericia, modificadoresPlanos);
}

// Escolha de qual perícia rolar quando um item serve pra mais de uma
// ao mesmo tempo — usado tanto pelo Kit de Ferramentas de Criação
// (geral) quanto por itens Eletrônico com Hacking + Programação
// vinculados (ver rolarUsoItem acima).
function abrirModalEscolherPericiaItem(it, opcoes, modificadoresPlanos, textoAjuda) {
    let modal = document.getElementById("modal-escolher-pericia-kit");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolher-pericia-kit";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Usar ${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha a perícia</h4>
        <p class="hint">${escapeHtml(textoAjuda)}</p>
        <div class="combate-lista" id="kit-pericia-opcoes"></div>
    `;
    const opcoesDiv = modal.querySelector("#kit-pericia-opcoes");
    opcoes.forEach(nome => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-lime";
        btn.style.width = "100%";
        btn.style.marginBottom = "6px";
        btn.innerText = nome;
        btn.addEventListener("click", async () => {
            modal.remove();
            await rolarComPericiaDoItem(it, nome, modificadoresPlanos);
        });
        opcoesDiv.appendChild(btn);
    });
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
}

// ---------------------------------------------------------------------
// "Arrombar" veículo de cenário (ver plano-cenario.txt, Fase 5): reusa
// o mesmo mecanismo de "Usar item" acima, restrito a itens tag
// "destrave" — sem chave nunca gerada pra esses veículos (ver
// adicionarVeiculoCenario em mestre.js), trancar/destrancar/ligar
// sempre passam por este teste. A resolução de sucesso/falha fica a
// critério do Mestre, olhando o resultado no Log de Dados e alternando
// o cadeado pelo Gerenciador de Cenário (editarVeiculoCenario) — não
// tem dificuldade automática cadastrada por enquanto.
// ---------------------------------------------------------------------
export async function arrombarVeiculoCenario(veiculoNome) {
    if (!estado.fichaAtual || estado.isMestre) return;
    const itensDestrave = Object.entries(estado.fichaAtual.inventario || {})
        .filter(([, it]) => it && it.tag === "destrave")
        .map(([id, it]) => ({ id, ...it }));
    if (!itensDestrave.length) {
        toast("Você precisa de um item Destrave pra arrombar esse veículo.", "erro");
        return;
    }
    if (itensDestrave.length === 1) {
        await executarArrombamentoVeiculo(itensDestrave[0], veiculoNome);
        return;
    }
    abrirModalEscolherItemDestrave(itensDestrave, veiculoNome);
}

async function executarArrombamentoVeiculo(itemDestrave, veiculoNome) {
    const nomePericia = periciaUsoComoArray(itemDestrave.periciaUso)[0];
    if (!nomePericia) { toast("Esse item Destrave não tem perícia vinculada.", "erro"); return; }
    await rolarComPericiaDoItem(itemDestrave, nomePericia, modificadoresAtuais());
    toast(`Tentativa em "${veiculoNome}" registrada no Log de Dados — o Mestre decide o resultado.`);
}

// Escolha de qual item Destrave usar, quando o jogador tem mais de um
// (cada Destrave já nasce travado numa perícia só — Mão Leve ou
// Arrombamento — escolhida na criação do item, então aqui é só "qual
// item", não "qual perícia").
function abrirModalEscolherItemDestrave(itensDestrave, veiculoNome) {
    let modal = document.getElementById("modal-escolher-destrave");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-escolher-destrave";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Arrombar "${escapeHtml(veiculoNome)}"</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha o Destrave</h4>
        <p class="hint">Você tem mais de um item Destrave. Escolha qual usar.</p>
        <div class="combate-lista" id="destrave-opcoes"></div>
    `;
    const opcoesDiv = modal.querySelector("#destrave-opcoes");
    itensDestrave.forEach(it => {
        const nomePericia = periciaUsoComoArray(it.periciaUso)[0] || "?";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-lime";
        btn.style.width = "100%";
        btn.style.marginBottom = "6px";
        btn.innerText = `${it.nome} (${nomePericia})`;
        btn.addEventListener("click", async () => {
            modal.remove();
            await executarArrombamentoVeiculo(it, veiculoNome);
        });
        opcoesDiv.appendChild(btn);
    });
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
}

// Ponto de entrada único do botão "Usar" em armas: se houver combate
// ativo no Gerenciador do Mestre, abre o seletor de alvo e resolve o
// ataque automaticamente (acerto x defesa, dano x redução de armadura).
// Sem combate ativo (ou fora de uma arma), cai no comportamento simples
// de sempre: só rola a perícia, sem alvo. Arma de fogo de verdade exige
// carregador anexado com munição — puxar o gatilho gasta 1 projétil na
// hora, acerte ou erre.
export async function iniciarUsoItem(it, modificadoresPlanos) {
    if (ehArmaComCarregador(it)) {
        const podeDisparar = await consumirMunicaoSeArmaDeFogo(it);
        if (!podeDisparar) return;
    }
    // Explosivo (manual pg. 81-82): "Usar" = ARMAR — teste de dificuldade
    // FIXA gravada no próprio item (dificuldadeArmar), sem seleção de
    // alvo nem oposição de defesa (bem diferente de arma). Não depende
    // de combate ativo — dá pra armar/plantar uma bomba fora de combate
    // também. Ver abrirModalArmarExplosivo.
    if (ehExplosivo(it.tag)) {
        abrirModalArmarExplosivo(it, modificadoresPlanos);
        return;
    }
    // Produto Químico (ver plano-quimicos-cenario.txt): "Usar" = LIBERAR
    // EM ÁREA — mesma lógica de "Armar" explosivo (teste de dificuldade
    // fixa gravada no item, sem seleção de alvo), mas afeta quem estiver
    // na área quando o Mestre liberar, não quem usou. ehDroga(it.tag) não
    // precisa de tratamento aqui — continua caindo no fluxo normal de
    // sempre (botão "Consumir", ver consumirDroga), sem nenhuma mudança.
    if (ehProdutoQuimico(it.tag)) {
        abrirModalUsarQuimicoArea(it, modificadoresPlanos);
        return;
    }
    // Ferramenta de Criação Biomecânica (ver plano-implantes-biomecanica.txt,
    // Fase 4): "Usar" não é um teste solto de perícia — é o ponto de
    // entrada da cirurgia (Instalar/Remover implante em OUTRO personagem
    // do mesmo cenário). Mesmo padrão de entrada especial já usado por
    // Explosivo (Armar) e Produto Químico (Usar em área) acima.
    if (it.tag === "ferramenta_criacao_biomecanica") {
        abrirModalCirurgiaImplante(it, modificadoresPlanos);
        return;
    }
    if (ehArma(it.tag) && combateTemParticipantes()) {
        // Contra-ataque imediato do Aparar (manual: "pode atacar
        // imediatamente com modificador -1") — se este personagem tem um
        // guardado, o próximo "Usar" de uma arma/manobra já mira
        // automaticamente em quem atacou, sem passar pela seleção manual
        // de alvo, e some sozinho depois de usado (é de 1 uso só).
        const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
        const contraAtaque = meuPid ? await consumirContraAtaquePendente(meuPid) : null;
        if (contraAtaque) {
            const participanteAlvo = (estado.combateAtivoCache.participantes || {})[contraAtaque.contraAlvoPid];
            if (participanteAlvo) {
                toast(`Contra-ataque do Aparar: atacando ${contraAtaque.contraAlvoNome} com modificador ${contraAtaque.modificador}.`);
                await resolverAtaque(it, modificadoresPlanos, { ...participanteAlvo, _pid: contraAtaque.contraAlvoPid }, { modificadorExtra: contraAtaque.modificador, ehContraAtaque: true });
                return;
            }
        }
        abrirModalSelecionarAlvo(it, modificadoresPlanos);
    } else if (ehArma(it.tag) && it.quimico && Array.isArray(it.quimico.efeitos) && it.quimico.efeitos.length) {
        // Seringa/Spray (Parte 9 — Veículo de transporte) fora de
        // combate: sem oposição de defesa, aplicação direta em qualquer
        // alvo escolhido (inclusive em si mesmo) — ver
        // abrirModalUsarQuimicoForaCombate. Só entra aqui quando NÃO há
        // combate ativo (o `if` de cima já cobriu o caso "combate ativo"
        // com seleção de alvo + teste de acerto normal).
        abrirModalUsarQuimicoForaCombate(it, modificadoresPlanos);
    } else {
        await rolarUsoItem(it, modificadoresPlanos);
    }
}

// "Usar" um item Explosivo = ARMAR (manual pg. 81-82): diferente de
// arma, não é um ataque contra um alvo — é um teste de dificuldade FIXA
// (dificuldadeArmar, gravada no item desde a criação — ver
// lerConfigArmaDoModal) contra a perícia vinculada (normalmente
// Explosivos). Sem oposição de defesa, sem seleção de alvo. Ao confirmar,
// rola e registra no Log de Dados (o Mestre compara com a dificuldade
// mostrada aqui e decide o resultado) e narra a ativação do módulo de
// detonação acoplado ao item (se algum foi escolhido na criação — ver
// MODULOS_DETONACAO). Dano e raio ficam só como referência: o sistema
// não simula área/alcance, então aplicar o dano a quem estiver na área
// continua manual (ferramentas de combate normais, uma vítima de cada vez).
function abrirModalArmarExplosivo(it, modificadoresPlanos) {
    // Armar SEM estar em nenhum cenário ativo é bloqueado (ver
    // plano-explosivos-cenario.txt, decisão 3) — não tem onde gravar o
    // explosivo nem quem fica no raio de efeito depois.
    const cenario = cenarioAtualDoPersonagem();
    if (!cenario) {
        toast(`"${it.nome}" só pode ser armado dentro de um cenário — peça ao Mestre pra te colocar em um antes de usar.`, "erro");
        return;
    }
    let modal = document.getElementById("modal-armar-explosivo");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-armar-explosivo";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const cfg = it.arma || {};
    const modulo = MODULOS_DETONACAO.find(m => m.nome === cfg.moduloDetonacao);
    const nomePericia = it.periciaUso || "Explosivos";
    const ocasionaisExplosivo = modificadoresOcasionaisDaPericia(estado.fichaAtual, nomePericia);
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Armar ${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">
            ${cfg.danoBase ? `Dano: <strong>${cfg.danoBase}</strong>${cfg.raio ? ` em raio de <strong>${cfg.raio}m</strong>` : ""} — aplique manualmente a quem estiver na área quando detonar.<br>` : ""}
            Dificuldade de armar: <strong>${cfg.dificuldadeArmar || "não definida"}</strong> (perícia ${escapeHtml(nomePericia)}).<br>
            ${modulo
                ? `Módulo de detonação: <strong>${escapeHtml(modulo.nome)}</strong> — ${escapeHtml(modulo.efeito)}`
                : "Nenhum módulo de detonação cadastrado neste item — o Mestre decide como ele detona."}
        </p>
        <div id="explosivo-ocasionais-lista">${htmlCheckboxesOcasionais(ocasionaisExplosivo, nomePericia)}</div>
        <div class="modal-btns">
            <button type="button" class="btn-lime" id="btn-confirmar-armar-explosivo">Armar (rolar ${escapeHtml(nomePericia)})</button>
        </div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-armar-explosivo").addEventListener("click", async () => {
        const deltaOcasional = lerDeltaOcasionais(modal.querySelector("#explosivo-ocasionais-lista"), ocasionaisExplosivo);
        modal.remove();
        const modificadorFinal = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual()) + deltaOcasional;
        const rotuloDif = cfg.dificuldadeArmar ? ` (dif. armar: ${cfg.dificuldadeArmar})` : "";
        // dificuldadeArmar vai como 4º argumento pra rolarERegistrar
        // sinalizar Sucesso/Falhou no Log de Dados e no toast — não trava
        // nada automaticamente (o explosivo continua sendo gravado no
        // cenário mesmo numa falha, igual antes): quem decide o que
        // acontece numa falha de armar continua sendo o Mestre, só que
        // agora com o resultado já comparado contra a dificuldade em vez
        // de precisar fazer essa conta de cabeça.
        await rolarERegistrar(`${it.nome} — Armar${rotuloDif}`, modificadorFinal, false, cfg.dificuldadeArmar || null);

        // Grava o explosivo no cenário e tira o item do inventário DIRETO
        // — diferente de dar/remover item, "Armar" não passa pela fila de
        // aprovação do Mestre (decisão 4), mesmo sendo o jogador o autor.
        const nomeAtacanteOuNpc = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || (estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId);
        await adicionarExplosivoCenario(cenario.id, {
            nome: it.nome,
            dano: cfg.danoBase || 0,
            raio: cfg.raio || 0,
            // "explosao" é a chave de TIPOS_DANO (dados-manual.js) que o
            // painel "Causar Dano" e aplicarDano esperam — não confundir
            // com a TAG do item "explosivo" (TAGS_ITEM). Bug corrigido:
            // gravar "explosivo" aqui deixava o select de tipo de dano
            // vazio ao pré-preencher o painel na Fase 4, e também não
            // batia com a checagem de Dilaceração por Explosão.
            tipoDano: "explosao",
            moduloDetonacaoNome: modulo ? modulo.nome : null,
            moduloDetonacaoEfeito: modulo ? modulo.efeito : null,
            armadoPorTipo: estado.modoNpc ? "npc" : "ficha",
            armadoPorId: estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId,
            armadoPorNome: nomeAtacanteOuNpc,
            criadoEm: Date.now()
        });
        delete estado.fichaAtual.inventario[it.id];
        await remove(ref(db, `${caminhoBase()}/inventario/${it.id}`));

        toast(modulo
            ? `💣 Módulo de detonação ativado: ${modulo.nome} — ${modulo.efeito}. Armado em "${cenario.titulo}".`
            : `💣 ${it.nome} armado em "${cenario.titulo}".`);
    });
    document.body.appendChild(modal);
}

// "Usar" um item Produto Químico = LIBERAR EM ÁREA (manual pág. 91-93,
// ver plano-quimicos-cenario.txt): cópia quase literal de
// abrirModalArmarExplosivo — teste de dificuldade FIXA gravada no item
// (dificuldadeUsar) contra a perícia vinculada (normalmente Química), sem
// oposição de defesa nem seleção de alvo. Diferente de explosivo, o efeito
// não é dano — são os modificadores automáticos do item (mesmo mecanismo
// de efeitosDrogas que já existe pra autoconsumo), aplicados depois em
// quem estiver na área (o Mestre decide quem via pendência "quimico_area",
// ver liberarQuimicoCenario em mestre.js).
function abrirModalUsarQuimicoArea(it, modificadoresPlanos) {
    // Usar SEM estar em nenhum cenário ativo é bloqueado (mesma decisão
    // de explosivo) — não tem onde gravar o químico nem quem fica na área
    // depois.
    const cenario = cenarioAtualDoPersonagem();
    if (!cenario) {
        toast(`"${it.nome}" só pode ser usado dentro de um cenário — peça ao Mestre pra te colocar em um antes de usar.`, "erro");
        return;
    }
    let modal = document.getElementById("modal-usar-quimico-area");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-usar-quimico-area";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const cfg = it.quimico || {};
    const nomePericia = it.periciaUso || "Química";
    const ocasionaisQuimico = modificadoresOcasionaisDaPericia(estado.fichaAtual, nomePericia);
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Usar em área: ${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">
            ${cfg.tipoEfeito ? `Tipo de efeito: <strong>${escapeHtml(cfg.tipoEfeito)}</strong><br>` : ""}
            ${cfg.raio ? `Raio: <strong>${cfg.raio}m</strong> — aplique manualmente a quem estiver na área quando o Mestre liberar.<br>` : ""}
            Dificuldade de uso: <strong>${cfg.dificuldadeUsar || "não definida"}</strong> (perícia ${escapeHtml(nomePericia)}).
        </p>
        <div id="quimico-ocasionais-lista">${htmlCheckboxesOcasionais(ocasionaisQuimico, nomePericia)}</div>
        <div class="modal-btns">
            <button type="button" class="btn-lime" id="btn-confirmar-usar-quimico">Usar (rolar ${escapeHtml(nomePericia)})</button>
        </div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-usar-quimico").addEventListener("click", async () => {
        const deltaOcasional = lerDeltaOcasionais(modal.querySelector("#quimico-ocasionais-lista"), ocasionaisQuimico);
        modal.remove();
        const modificadorFinal = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual()) + deltaOcasional;
        const rotuloDif = cfg.dificuldadeUsar ? ` (dif. uso: ${cfg.dificuldadeUsar})` : "";
        // dificuldadeUsar vai como 4º argumento pra rolarERegistrar
        // sinalizar Sucesso/Falhou no Log de Dados e no toast — mesmo
        // padrão de "Armar" explosivo: não trava nada automaticamente, o
        // químico continua sendo gravado no cenário mesmo numa falha; quem
        // decide o que acontece na falha continua sendo o Mestre.
        await rolarERegistrar(`${it.nome} — Usar em área${rotuloDif}`, modificadorFinal, false, cfg.dificuldadeUsar || null);

        // Grava o químico no cenário e tira o item do inventário DIRETO —
        // igual "Armar" de explosivo, "Usar" de um item de área não
        // devolve, então não passa pela fila de aprovação do Mestre.
        const nomeAtacanteOuNpc = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || (estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId);
        const modificadoresDoItem = (it.modificadores || []).filter(m => m && m.alvo && Number(m.valor));
        await adicionarQuimicoCenario(cenario.id, {
            nome: it.nome,
            raio: cfg.raio || 0,
            tipoEfeito: cfg.tipoEfeito || "",
            modificadores: modificadoresDoItem,
            // Efeitos mecânicos do item (it.quimico.efeitos), pra viajar
            // junto até o painel "Aplicar Efeito Químico" do Mestre —
            // Parte 8, item 5.2 do plano-automacao-materiais-quimicos-v3.
            efeitos: cfg.efeitos || [],
            duracaoHoras: extrairDuracaoHorasDaDescricao(it.descricao),
            usadoPorTipo: estado.modoNpc ? "npc" : "ficha",
            usadoPorId: estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId,
            usadoPorNome: nomeAtacanteOuNpc,
            criadoEm: Date.now()
        });
        delete estado.fichaAtual.inventario[it.id];
        await remove(ref(db, `${caminhoBase()}/inventario/${it.id}`));

        toast(`💨 ${it.nome} usado em área — aguardando o Mestre liberar em "${cenario.titulo}".`);
    });
    document.body.appendChild(modal);
}

// "Usar" uma Seringa/Spray (arma com carga química, it.quimico.efeitos)
// FORA de combate (Parte 9 — Veículo de transporte): sem oposição de
// defesa nem teste de acerto — é aplicação direta num alvo consciente
// e/ou não-resistente (ou em si mesmo), igual injetar alguém parado.
// Alvo pode ser o próprio personagem/NPC ou qualquer participante do
// cenário atual (mesma lista que liberarQuimicoCenario usa pro fluxo de
// área — reaproveitada aqui só como fonte de "quem está por perto").
// despacharEfeitosQuimicos (já existe) lida sozinho com o caso de o
// alvo não estar em combate ativo: efeitos imediatos aplicam na hora,
// efeitos por turno ficam como nota "aplique manualmente" pro Mestre.
function abrirModalUsarQuimicoForaCombate(it, modificadoresPlanos) {
    const cenario = cenarioAtualDoPersonagem();
    const idAtual = estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId;
    const tipoAtual = estado.modoNpc ? "npc" : "ficha";
    const nomeAtual = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || idAtual;
    const outrosParticipantes = cenario
        ? Object.values(cenario.participantes || {}).filter(p => !(p.tipo === tipoAtual && p.refId === idAtual))
        : [];

    let modal = document.getElementById("modal-usar-quimico-fora-combate");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-usar-quimico-fora-combate";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const rotuloEntrega = it.quimico?.tipoEntregaLabel || "Carga química";
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${escapeHtml(rotuloEntrega)}: ${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Fora de combate — sem teste de acerto. Escolha em quem aplicar.</p>
        <div class="combate-lista" id="quimico-fora-combate-alvos"></div>
    `;
    const listaAlvos = modal.querySelector("#quimico-fora-combate-alvos");

    const criarBotaoAlvo = (label, onClick) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-lime";
        btn.style.width = "100%";
        btn.style.marginBottom = "6px";
        btn.innerText = label;
        btn.addEventListener("click", onClick);
        listaAlvos.appendChild(btn);
    };

    const confirmarAplicacao = async (alvoTipo, alvoId, nomeAlvo) => {
        modal.remove();
        const resultado = await despacharEfeitosQuimicos(alvoTipo, alvoId, it.quimico.efeitos, it.nome);
        // Consome 1 unidade do item, mesmo padrão de consumirDroga.
        const quantidadeAtual = Number(it.quantidade);
        if (Number.isFinite(quantidadeAtual) && quantidadeAtual > 1) {
            estado.fichaAtual.inventario[it.id].quantidade = quantidadeAtual - 1;
            await update(ref(db), { [`${caminhoBase()}/inventario/${it.id}/quantidade`]: quantidadeAtual - 1 });
        } else {
            delete estado.fichaAtual.inventario[it.id];
            await remove(ref(db, `${caminhoBase()}/inventario/${it.id}`));
        }
        toast(`${rotuloEntrega} de ${it.nome} aplicada em ${nomeAlvo}.${resultado.notas.length ? " " + resultado.notas.join(" | ") : ""}`);
    };

    criarBotaoAlvo(`💉 Em mim mesmo (${nomeAtual})`, () => confirmarAplicacao(tipoAtual, idAtual, nomeAtual));
    outrosParticipantes.forEach(p => {
        criarBotaoAlvo(`💉 ${p.nome}`, () => confirmarAplicacao(p.tipo, p.refId, p.nome));
    });
    if (!outrosParticipantes.length) {
        const aviso = document.createElement("p");
        aviso.className = "hint";
        aviso.innerText = cenario
            ? "Nenhum outro participante no cenário atual — só é possível aplicar em si mesmo."
            : "Você não está em nenhum cenário agora — peça ao Mestre pra te colocar em um pra poder aplicar em outra pessoa (em si mesmo continua disponível).";
        listaAlvos.appendChild(aviso);
    }

    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    document.body.appendChild(modal);
}

// =====================================================================
// Cirurgia de Implante/Prótese (Biomecânica) — Fase 4 do plano (ver
// plano-implantes-biomecanica.txt): ponto de entrada é "Usar" na
// Ferramenta de Criação Biomecânica (ver iniciarUsoItem acima).
// Regra-chave: ninguém opera a si mesmo — sempre um segundo
// personagem no MESMO cenário (candidatosCirurgiaImplante/
// implantesDoPacienteParaCirurgia, Fase 3, já existem). "Instalar"
// (Fase 4.2-4.4: rola Biomecânica contra a dificuldadeInstalar do
// item) e "Remover" (Fase 7.1-7.3: rola Biomecânica contra dificuldade
// fixa 8+nível do implante) seguem o mesmo padrão — nenhum dos dois
// aplica nada direto, os dois só entram na fila do Mestre confirmar
// (Fases 5/8, mestre.js).
// =====================================================================
function abrirModalCirurgiaImplante(it, modificadoresPlanos) {
    const cenario = cenarioAtualDoPersonagem();
    if (!cenario) {
        toast(`"${it.nome}" só pode ser usado dentro de um cenário — peça ao Mestre pra te colocar em um antes de operar alguém.`, "erro");
        return;
    }
    const candidatos = candidatosCirurgiaImplante();
    if (!candidatos.length) {
        toast("Nenhum outro personagem no cenário atual — a cirurgia sempre precisa de um segundo personagem (nunca em si mesmo).", "erro");
        return;
    }

    let modal = document.getElementById("modal-cirurgia-implante");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-cirurgia-implante";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${escapeHtml(it.nome)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Cirurgia de Implante</h4>
        <p class="hint">Escolha instalar ou remover um implante em outro personagem do cenário. O resultado só vale depois que o Mestre confirmar na fila de Ações Pendentes.</p>
        <div class="modal-btns" style="flex-direction:column; gap:6px;">
            <button type="button" class="btn-lime" id="btn-cirurgia-instalar" style="width:100%;">🔧 Instalar implante</button>
            <button type="button" class="btn-lime" id="btn-cirurgia-remover" style="width:100%;">🩹 Remover implante</button>
        </div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-cirurgia-instalar").addEventListener("click", () => {
        modal.remove();
        abrirModalInstalarImplanteEscolherPaciente(it, modificadoresPlanos, candidatos);
    });
    modal.querySelector("#btn-cirurgia-remover").addEventListener("click", () => {
        modal.remove();
        abrirModalRemoverImplanteEscolherPaciente(it, modificadoresPlanos, candidatos);
    });
    document.body.appendChild(modal);
}

// Fase 4.2: seleção de paciente (só quem tem ao menos um implante
// instalado:false esperando cirurgia — evita um select que sempre
// termina em "esse personagem não tem nada pra instalar") e, a partir
// dele, seleção de qual implante — mostra a dificuldadeInstalar
// gravada no próprio item. Redesenha o conteúdo quando o paciente
// muda, mesmo padrão de abrirModalMecanicoVeiculoTerceiro.
function abrirModalInstalarImplanteEscolherPaciente(it, modificadoresPlanos, candidatos) {
    const pacientesComImplante = candidatos
        .map(p => ({ ...p, paraInstalar: implantesDoPacienteParaCirurgia(p.refId).paraInstalar }))
        .filter(p => p.paraInstalar.length > 0);

    if (!pacientesComImplante.length) {
        toast("Nenhum personagem no cenário atual tem um implante não instalado esperando cirurgia.", "erro");
        return;
    }

    // Fase 10.1: tira do select quem já bateu o limite de implantes
    // (Fase 9.3) — checagem aqui no modal, antes mesmo de rolar.
    const pacientesDisponiveis = pacientesComImplante.filter(p => !implantesContagemELimite(estado.todasAsFichasCache[p.refId]).semVaga);
    const bloqueadosPorLimite = pacientesComImplante.length - pacientesDisponiveis.length;

    if (!pacientesDisponiveis.length) {
        toast("Todos os personagens candidatos já bateram o limite de implantes (chips não contam).", "erro");
        return;
    }

    let modal = document.getElementById("modal-instalar-implante");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-instalar-implante";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const renderizarConteudo = (fichaAlvoId) => {
        const paciente = pacientesDisponiveis.find(p => p.refId === fichaAlvoId) || pacientesDisponiveis[0];
        const opcoesPaciente = pacientesDisponiveis
            .map(p => `<option value="${p.refId}" ${p.refId === paciente.refId ? "selected" : ""}>${escapeHtml(p.nome)}</option>`)
            .join("");
        const opcoesImplante = paciente.paraInstalar
            .map(imp => `<option value="${imp.id}">${escapeHtml(imp.nome)}${imp.implante?.subtipo ? ` (${escapeHtml(rotuloSubtipoImplante(imp.implante.subtipo))})` : ""}</option>`)
            .join("");

        modal.innerHTML = `
            <div class="combate-painel-topo">
                <span class="eyebrow">Instalar implante — ${escapeHtml(it.nome)}</span>
                <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
            </div>
            <div class="modal-campo">
                <label>Paciente</label>
                <select id="instalar-implante-paciente">${opcoesPaciente}</select>
            </div>
            <div class="modal-campo">
                <label>Implante</label>
                <select id="instalar-implante-item">${opcoesImplante}</select>
            </div>
            <p class="hint" id="instalar-implante-dificuldade"></p>
            <p class="hint">Você (instalador) rola Biomecânica contra essa dificuldade. O paciente não rola nada agora — os testes de adaptação dele acontecem depois, sozinho (aba Saúde).</p>
            ${bloqueadosPorLimite > 0 ? `<p class="hint" style="color: var(--neon-red);">${bloqueadosPorLimite} candidato(s) fora da lista por já estar(em) no limite de implantes.</p>` : ""}
            <div class="modal-btns">
                <button type="button" class="btn-lime" id="btn-confirmar-instalar-implante">🎲 Rolar e instalar</button>
            </div>
        `;

        const hintDificuldade = modal.querySelector("#instalar-implante-dificuldade");
        const selectImplante = modal.querySelector("#instalar-implante-item");
        const atualizarHintDificuldade = () => {
            const imp = paciente.paraInstalar.find(x => x.id === selectImplante.value) || paciente.paraInstalar[0];
            hintDificuldade.innerHTML = `Dificuldade de instalar: <strong>${imp?.implante?.dificuldadeInstalar ?? "não definida"}</strong> (perícia Biomecânica).`;
        };
        atualizarHintDificuldade();

        modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
        modal.querySelector("#instalar-implante-paciente").addEventListener("change", (e) => renderizarConteudo(e.target.value));
        selectImplante.addEventListener("change", atualizarHintDificuldade);
        modal.querySelector("#btn-confirmar-instalar-implante").addEventListener("click", async () => {
            const imp = paciente.paraInstalar.find(x => x.id === selectImplante.value);
            if (!imp) { toast("Escolha um implante.", "erro"); return; }
            modal.remove();
            await resolverInstalarImplante(it, modificadoresPlanos, paciente.refId, paciente.nome, imp);
        });
    };

    renderizarConteudo(pacientesDisponiveis[0].refId);
    document.body.appendChild(modal);
}

// Fase 4.3/4.4: o INSTALADOR (estado.fichaAtual) rola Biomecânica contra a
// dificuldadeInstalar do item (reusa rolarComPossibilidadeDeOcasionais,
// mesmo caminho de qualquer outra rolagem de perícia — cuida sozinho
// de Ocasiões Especiais quando existirem). A rolagem NÃO aplica nada
// na ficha do paciente ainda: monta um payload já classificado
// (sucesso / falha_leve = "falha até 5" / falha_grave = "falha 6+" /
// critica = falha crítica da rolagem) e entra na fila do Mestre — quem
// de fato aplica o resultado é confirmarAcaoPendente (Fase 5, ainda
// não implementada em mestre.js).
async function resolverInstalarImplante(it, modificadoresPlanos, fichaAlvoId, nomePaciente, implanteItem) {
    if (!estado.fichaAtual || !estado.fichaAtualId) return;

    const nomePericia = PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA[0]; // "Biomecânica"
    const dificuldade = Number(implanteItem.implante?.dificuldadeInstalar) || 0;
    const modificador = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual(), limiteRolagemDoItem(it));
    const rotuloAcao = `Instalar implante em ${nomePaciente}: "${implanteItem.nome}"`;

    const resultado = await rolarComPossibilidadeDeOcasionais(`${rotuloAcao} (${nomePericia})`, `pericia:${nomePericia}`, modificador, false, dificuldade);
    if (!resultado) return;

    // Classificação exigida pela Fase 5: "crítica" aqui é a FALHA
    // crítica da rolagem (d20 natural 1, ou resultado final <= 1 — ver
    // criticoNegativo em rolarERegistrar), não o acerto crítico
    // (resultado >= 20), que já está coberto por "sucesso". Falha sem
    // crítico se divide em leve (margem até 5) e grave (6+), conforme
    // o texto do plano ("falha até 5 / falha 6+").
    let classificacao;
    if (resultado.criticoNegativo) {
        classificacao = "critica";
    } else if (resultado.sucesso) {
        classificacao = "sucesso";
    } else {
        const margem = dificuldade - resultado.resultado;
        classificacao = margem <= 5 ? "falha_leve" : "falha_grave";
    }

    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: "instalar_implante",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} tentou instalar "${implanteItem.nome}" em ${nomePaciente} — resultado ${resultado.resultado} (dif. ${dificuldade}) — aguardando confirmação do Mestre.`,
        payload: {
            fichaAlvoId,
            nomePaciente,
            implanteId: implanteItem.id,
            implanteNome: implanteItem.nome,
            nivel: Number(implanteItem.nivelTag) || 0,
            dificuldadeInstalar: dificuldade,
            resultado: resultado.resultado,
            classificacao,
            instaladorNome: nomeJogador
        }
    });
    toast(`Cirurgia registrada — resultado ${resultado.resultado} (dif. ${dificuldade}). Aguardando confirmação do Mestre.`, resultado.sucesso ? "critico-acerto" : "erro");
}

// Fase 7.1: mesmo padrão de abrirModalInstalarImplanteEscolherPaciente
// (Fase 4.2), só troca a fonte da lista (paraRemover em vez de
// paraInstalar — implantesDoPacienteParaCirurgia, Fase 3, já separa os
// dois) e mostra a dificuldade FIXA de remover (8+nível, calculada na
// hora — não é campo do item, diferente de dificuldadeInstalar).
function abrirModalRemoverImplanteEscolherPaciente(it, modificadoresPlanos, candidatos) {
    const pacientesComImplante = candidatos
        .map(p => ({ ...p, paraRemover: implantesDoPacienteParaCirurgia(p.refId).paraRemover }))
        .filter(p => p.paraRemover.length > 0);

    if (!pacientesComImplante.length) {
        toast("Nenhum personagem no cenário atual tem um implante instalado pra remover.", "erro");
        return;
    }

    let modal = document.getElementById("modal-remover-implante");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-remover-implante";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const renderizarConteudo = (fichaAlvoId) => {
        const paciente = pacientesComImplante.find(p => p.refId === fichaAlvoId) || pacientesComImplante[0];
        const opcoesPaciente = pacientesComImplante
            .map(p => `<option value="${p.refId}" ${p.refId === paciente.refId ? "selected" : ""}>${escapeHtml(p.nome)}</option>`)
            .join("");
        const opcoesImplante = paciente.paraRemover
            .map(imp => `<option value="${imp.id}">${escapeHtml(imp.nome)}${imp.implante?.subtipo ? ` (${escapeHtml(rotuloSubtipoImplante(imp.implante.subtipo))})` : ""}</option>`)
            .join("");

        modal.innerHTML = `
            <div class="combate-painel-topo">
                <span class="eyebrow">Remover implante — ${escapeHtml(it.nome)}</span>
                <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
            </div>
            <div class="modal-campo">
                <label>Paciente</label>
                <select id="remover-implante-paciente">${opcoesPaciente}</select>
            </div>
            <div class="modal-campo">
                <label>Implante</label>
                <select id="remover-implante-item">${opcoesImplante}</select>
            </div>
            <p class="hint" id="remover-implante-dificuldade"></p>
            <p class="hint">Você (instalador) rola Biomecânica contra essa dificuldade. O resultado só vale depois que o Mestre confirmar na fila de Ações Pendentes.</p>
            <div class="modal-btns">
                <button type="button" class="btn-lime" id="btn-confirmar-remover-implante">🎲 Rolar e remover</button>
            </div>
        `;

        const hintDificuldade = modal.querySelector("#remover-implante-dificuldade");
        const selectImplante = modal.querySelector("#remover-implante-item");
        const atualizarHintDificuldade = () => {
            const imp = paciente.paraRemover.find(x => x.id === selectImplante.value) || paciente.paraRemover[0];
            const nivel = Number(imp?.nivelTag) || 0;
            hintDificuldade.innerHTML = `Dificuldade de remover: <strong>${8 + nivel}</strong> (8 + nível ${nivel}, perícia Biomecânica).`;
        };
        atualizarHintDificuldade();

        modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
        modal.querySelector("#remover-implante-paciente").addEventListener("change", (e) => renderizarConteudo(e.target.value));
        selectImplante.addEventListener("change", atualizarHintDificuldade);
        modal.querySelector("#btn-confirmar-remover-implante").addEventListener("click", async () => {
            const imp = paciente.paraRemover.find(x => x.id === selectImplante.value);
            if (!imp) { toast("Escolha um implante.", "erro"); return; }
            modal.remove();
            await resolverRemoverImplante(it, modificadoresPlanos, paciente.refId, paciente.nome, imp);
        });
    };

    renderizarConteudo(pacientesComImplante[0].refId);
    document.body.appendChild(modal);
}

// Fase 7.2/7.3: mesmo padrão de resolverInstalarImplante (Fase 4.3/4.4)
// — o INSTALADOR (estado.fichaAtual) rola Biomecânica, classifica o resultado
// e manda pro Mestre confirmar (nunca aplica direto, nem em sucesso —
// ver 7.3 do plano). Única diferença de verdade: a dificuldade não vem
// do item (dificuldadeInstalar), é fixa 8+nível, calculada aqui mesmo.
async function resolverRemoverImplante(it, modificadoresPlanos, fichaAlvoId, nomePaciente, implanteItem) {
    if (!estado.fichaAtual || !estado.fichaAtualId) return;

    const nomePericia = PERICIAS_FERRAMENTA_CRIACAO_BIOMECANICA[0]; // "Biomecânica"
    const nivel = Number(implanteItem.nivelTag) || 0;
    const dificuldade = 8 + nivel;
    const modificador = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual(), limiteRolagemDoItem(it));
    const rotuloAcao = `Remover implante de ${nomePaciente}: "${implanteItem.nome}"`;

    const resultado = await rolarComPossibilidadeDeOcasionais(`${rotuloAcao} (${nomePericia})`, `pericia:${nomePericia}`, modificador, false, dificuldade);
    if (!resultado) return;

    // Classificação de 3 níveis (diferente de resolverInstalarImplante,
    // que usa 4 — sucesso/falha_leve/falha_grave/crítica, exigido pela
    // Fase 4.4). O plano só fala em sucesso/falha/crítica pra Remover
    // (Fase 7.3/8.3: "Falha: remove + dano 20×nível. Crítica: remove +
    // quebra o item + dano.") — sem distinguir margem de falha aqui.
    const classificacao = resultado.criticoNegativo ? "critica" : (resultado.sucesso ? "sucesso" : "falha");

    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: "remover_implante",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} tentou remover "${implanteItem.nome}" de ${nomePaciente} — resultado ${resultado.resultado} (dif. ${dificuldade}) — aguardando confirmação do Mestre.`,
        payload: {
            fichaAlvoId,
            nomePaciente,
            implanteId: implanteItem.id,
            implanteNome: implanteItem.nome,
            nivel,
            dificuldadeRemover: dificuldade,
            resultado: resultado.resultado,
            classificacao,
            instaladorNome: nomeJogador
        }
    });
    toast(`Remoção registrada — resultado ${resultado.resultado} (dif. ${dificuldade}). Aguardando confirmação do Mestre.`, resultado.sucesso ? "critico-acerto" : "erro");
}

// Contexto da ação que está esperando o jogador escolher um alvo no
// modal compartilhado #modal-selecionar-alvo (Atacar, Agarrar,
// Desarmar, Derrubar, Delimitar/Retomar alcance, Imobilizar, Imobilizar
// via Jiu Jitsu, Quebrar Ossos via Jiu Jitsu). Cada abrirModalSelecionarAlvo*
// preenche o campo correspondente antes de abrir o modal; só um fica
// preenchido por vez. Exportado como objeto (em vez de variáveis soltas)
// pra configurarModalSelecionarAlvo poder ser movida pra abas/pericias.js
// (Passo 15) e continuar lendo/zerando esses valores dali.
export const contextoAlvo = {
    ataque: null,
    agarrar: null,
    desarmar: null,
    derrubar: null,
    delimitar: null,
    retomar: null,
    imobilizar: null,
    imobilizarJJ: null,
    quebrarOssosJJ: null,
};

export function abrirModalSelecionarAlvo(it, modificadoresPlanos) {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    // Não deixa o atacante se selecionar como alvo de si mesmo (ficha OU
    // o NPC que o Mestre estiver controlando no momento).
    const opcoes = Object.entries(participantes).filter(([, p]) =>
        !(p.tipo === "ficha" && p.refId === estado.fichaAtualId) &&
        !(estado.modoNpc && p.tipo === "npc" && p.refId === estado.npcAtualId)
    );
    if (!opcoes.length) { toast("Não há outros participantes no combate pra atacar.", "erro"); return; }
    // NPCs primeiro, jogadores (fichas) por último — evita miss-click
    // atacando o colega sem querer, já que jogadores costumam ser o
    // "alvo padrão" mais raro em combate (a maioria dos ataques é
    // contra NPC). Mantém a ordem original dentro de cada grupo.
    opcoes.sort(([, a], [, b]) => (a.tipo === "ficha" ? 1 : 0) - (b.tipo === "ficha" ? 1 : 0));

    contextoAlvo.ataque = { item: it, modificadoresPlanos, ocasionaisPericia: modificadoresOcasionaisDaPericia(estado.fichaAtual, it.periciaUso) };
    el.alvoTitulo.innerText = `Atacar com ${it.nome}`;
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (${p.tipo === "ficha" ? "jogador" : "NPC"})`;
        el.alvoSelect.appendChild(opt);
    });

    // Golpes Mirados (manual): todo golpe pode ser mirado — a Cabeça
    // muda de dificuldade conforme o tipo de golpe (arma de fogo x
    // corpo a corpo/arma branca), mas continua disponível pros dois —
    // ver LOCAIS_MIRA/difModLocalMira em dados-manual.js.
    const ehFogoItem = ehArma(it.tag) && ehArmaDeFogo(it.periciaUso) && !(it.arma && it.arma.desarmado);
    // Dano extra (arma branca — ver campo "Tipo de dano extra" no modal
    // de criação de item): se o item tem os dois tipos cadastrados,
    // oferece a escolha AQUI, junto do resto das opções do golpe — o
    // valor do dano não muda, só o tipo (afeta redução de armadura e
    // regras específicas por tipo).
    const tipoDanoExtraItem = (it.arma && it.arma.tipoDanoExtra) || null;
    const seletorTipoDanoHtml = tipoDanoExtraItem ? `
        <label for="alvo-tipo-dano-select">Tipo de dano</label>
        <select id="alvo-tipo-dano-select">
            <option value="padrao">${escapeHtml(TIPOS_DANO.find(t => t.key === it.arma.tipoDano)?.label || it.arma.tipoDano)} (padrão)</option>
            <option value="extra">${escapeHtml(TIPOS_DANO.find(t => t.key === tipoDanoExtraItem)?.label || tipoDanoExtraItem)}</option>
        </select>
    ` : "";
    // Ocasião Especial da perícia usada neste golpe (ver regras.js —
    // ex.: especialização em Boxe com +1 situacional): oferece o checkbox
    // aqui mesmo, na hora de atacar, em vez de obrigar o jogador a ir na
    // aba Perícias marcar antes. Vem pré-marcado com o estado atual
    // (`o.ativo`) só pra refletir o que já está ligado; o estado final
    // de cada um (ligado ou não nesta rolagem) é lido e aplicado direto
    // no ataque em alvoConfirmar, além de persistido pra ficar
    // consistente com a aba Perícias depois.
    const ocasionaisHtml = contextoAlvo.ataque.ocasionaisPericia.length ? `
        <div class="pericia-ocasionais" style="margin-top:10px;">
            ${contextoAlvo.ataque.ocasionaisPericia.map((o, idx) => `
                <label class="checkbox-inline" style="margin-top:4px;">
                    <input type="checkbox" class="alvo-ocasional-check" data-idx="${idx}" ${o.ativo ? "checked" : ""}>
                    ${escapeHtml(o.origem)} (${o.valor >= 0 ? "+" : ""}${o.valor} em ${escapeHtml(it.periciaUso)})
                </label>
            `).join("")}
        </div>
    ` : "";
    el.alvoCampoExtra.style.display = "block";
    el.alvoCampoExtra.innerHTML = `
        ${seletorTipoDanoHtml}
        <label for="alvo-local-mira-select">Mirar em</label>
        <select id="alvo-local-mira-select">
            ${LOCAIS_MIRA.map(l => {
                const dif = difModLocalMira(l, ehFogoItem);
                return `<option value="${l.key}">${escapeHtml(l.label)}${dif ? ` (dificuldade +${dif})` : ""}</option>`;
            }).join("")}
        </select>
        ${ehFogoItem ? `
        <label for="alvo-movimento-select" style="margin-top:10px;">Movimento (combate à distância)</label>
        <select id="alvo-movimento-select">
            <option value="nenhum">Nenhum</option>
            <option value="alvoMovimento">Alvo em movimento (-2)</option>
            <option value="alvoCarro">Alvo dentro de carro em movimento (-3)</option>
            <option value="ambosMovimento">Ambos em movimento (-4)</option>
        </select>
        <label class="checkbox-inline" style="margin-top:10px;">
            <input type="checkbox" id="alvo-escuro-check"> Escuro / mira às cegas (-5 no ataque)
        </label>
        <label class="checkbox-inline" style="margin-top:6px;">
            <input type="checkbox" id="alvo-queima-roupa-check"> Tiro à queima-roupa em alvo dominado/agarrado (dano quadruplicado)
        </label>
        <label for="alvo-combatentes-input" style="margin-top:10px;">Combatentes adicionais na linha de tiro (+1 dificuldade cada)</label>
        <input type="number" id="alvo-combatentes-input" min="0" step="1" value="0">
        ` : ""}
        ${ocasionaisHtml}
    `;
    el.modalSelecionarAlvo.classList.add("active");
}

// Preenche o <select> de alvos do modal compartilhado — usado por todas
// as variantes (ataque, Agarrar, Delimitar/Retomar alcance).
function preencherOpcoesDeAlvo() {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) =>
        !(p.tipo === "ficha" && p.refId === estado.fichaAtualId) &&
        !(estado.modoNpc && p.tipo === "npc" && p.refId === estado.npcAtualId)
    );
    // NPCs primeiro, jogadores por último — mesma lógica de
    // abrirModalSelecionarAlvo, evita miss-click no colega.
    opcoes.sort(([, a], [, b]) => (a.tipo === "ficha" ? 1 : 0) - (b.tipo === "ficha" ? 1 : 0));
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (${p.tipo === "ficha" ? "jogador" : "NPC"})`;
        el.alvoSelect.appendChild(opt);
    });
    return opcoes.length;
}

// Mesma modal de seleção de alvo, reaproveitada pra manobra "Agarrar"
// (contexto separado de contextoAlvo.ataque, já que não usa item de arma).
export function abrirModalSelecionarAlvoAgarrar(nomePericia, modificador) {
    el.alvoTitulo.innerText = `Agarrar com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    const ocasionais = anexarOcasionaisNoCampoExtra(nomePericia);
    contextoAlvo.agarrar = { nomePericia, modificador, ocasionais };
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra agarrar.", "erro"); contextoAlvo.agarrar = null; return; }
    el.modalSelecionarAlvo.classList.add("active");
}

// Mesma modal de seleção de alvo, reaproveitada pra manobra "Desarmar"
// (contexto separado, igual Agarrar — sem campo extra, só escolhe o alvo).
export function abrirModalSelecionarAlvoDesarmar(nomePericia, modificador) {
    el.alvoTitulo.innerText = `Desarmar com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    const ocasionais = anexarOcasionaisNoCampoExtra(nomePericia);
    contextoAlvo.desarmar = { nomePericia, modificador, ocasionais };
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra desarmar.", "erro"); contextoAlvo.desarmar = null; return; }
    el.modalSelecionarAlvo.classList.add("active");
}

// Mesma modal de seleção de alvo, reaproveitada pra manobra "Derrubar"
// (contexto separado, igual Agarrar/Desarmar). CQC nível 2 ("derrubar
// uma vez. Causa dano contundente Destreza D") é condicional a estar
// avançando contra um oponente armado pra derrubá-lo — não dá pra
// detectar isso automaticamente, então aparece como checkbox no campo
// extra da modal (mesma ideia de abrirModalBonusIniciativaCQC pra
// iniciativa), só quando o personagem TEM o nível.
export function abrirModalSelecionarAlvoDerrubar(nomePericia, modificador, nivelCQC = 0) {
    el.alvoTitulo.innerText = `Derrubar com ${nomePericia}`;
    if (nivelCQC >= 2) {
        el.alvoCampoExtra.style.display = "block";
        el.alvoCampoExtra.innerHTML = `
            <label style="display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="alvo-cqc-derrubar-check">
                <span>Avançando contra oponente armado pra derrubá-lo (CQC nível ${nivelCQC}) — causa dano contundente extra (Destreza escala D) se acertar</span>
            </label>
        `;
    } else {
        el.alvoCampoExtra.style.display = "none";
        el.alvoCampoExtra.innerHTML = "";
    }
    const ocasionais = anexarOcasionaisNoCampoExtra(nomePericia);
    contextoAlvo.derrubar = { nomePericia, modificador, ocasionais };
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra derrubar.", "erro"); contextoAlvo.derrubar = null; return; }
    el.modalSelecionarAlvo.classList.add("active");
}

// "Imobilizar" (CQC nível 4, manual pg. 23 — ver MANOBRA_IMOBILIZAR_CQC
// em dados-manual.js): só faz sentido contra quem JÁ está Derrubado
// ("Após derrubar pode imobilizar o alvo"), então a lista de alvos é
// filtrada aqui em vez de reaproveitar preencherOpcoesDeAlvo() (que
// mostra todo mundo).
export function abrirModalSelecionarAlvoImobilizar(nomePericia, modificador) {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) => p.derrubado && p.derrubado.ativo);
    if (!opcoes.length) { toast("Ninguém no combate está Derrubado agora — Imobilizar só funciona depois de Derrubar o alvo.", "erro"); return; }

    el.alvoTitulo.innerText = `Imobilizar com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    const ocasionais = anexarOcasionaisNoCampoExtra(nomePericia);
    contextoAlvo.imobilizar = { nomePericia, modificador, ocasionais };
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (Derrubado)`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

// "Imobilizar (Jiu Jitsu)" (Jiu Jitsu nível 2, manual pg. 22 — ver
// MANOBRA_IMOBILIZAR_JIUJITSU em dados-manual.js): mesma ideia de
// abrirModalSelecionarAlvoImobilizar acima (só quem está Derrubado),
// mas com um campo extra pra oferecer o checkbox "Desacordar" (Jiu
// Jitsu nível 3) quando o personagem tem o nível.
export function abrirModalSelecionarAlvoImobilizarJJ(nomeBase, modificador, nivelJJ) {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) => p.derrubado && p.derrubado.ativo);
    if (!opcoes.length) { toast("Ninguém no combate está Derrubado agora — Imobilizar só funciona depois de Derrubar o alvo.", "erro"); return; }

    el.alvoTitulo.innerText = `Imobilizar (Jiu Jitsu) com ${nomeBase}`;
    if (Number(nivelJJ) >= 3) {
        el.alvoCampoExtra.style.display = "block";
        el.alvoCampoExtra.innerHTML = `
            <label style="display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="alvo-jj-desacordar-check">
                <span>Desacordar o alvo em vez de só imobilizar (Jiu Jitsu nível 3) — inconsciente, sem teste pra se libertar sozinho</span>
            </label>
        `;
    } else {
        el.alvoCampoExtra.style.display = "none";
        el.alvoCampoExtra.innerHTML = "";
    }
    const ocasionais = anexarOcasionaisNoCampoExtra(nomeBase);
    contextoAlvo.imobilizarJJ = { nomeBase, modificador, nivelJJ, ocasionais };
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (Derrubado)`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

// "Quebrar ossos" (Jiu Jitsu níveis 4/5, manual pg. 22 — ver
// MANOBRA_QUEBRAR_OSSOS_JIUJITSU em dados-manual.js): só faz sentido
// contra quem EU já estou imobilizando agora ("Com o alvo imobilizado
// [...]") — filtra por imobilizado.porPid === meuPid, diferente de
// Imobilizar (CQC/Jiu Jitsu) que filtra por Derrubado.
export function abrirModalQuebrarOssosJJ(modificadorNaoUsado, nivelJJ) {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const opcoes = Object.entries(participantes).filter(([, p]) => p.imobilizado && p.imobilizado.ativo && meuPid && p.imobilizado.porPid === meuPid);
    if (!opcoes.length) { toast("Você precisa estar Imobilizando alguém agora pra Quebrar ossos.", "erro"); return; }

    contextoAlvo.quebrarOssosJJ = { nivelJJ };
    el.alvoTitulo.innerText = "Quebrar ossos (Jiu Jitsu)";
    el.alvoCampoExtra.style.display = "block";
    el.alvoCampoExtra.innerHTML = Number(nivelJJ) >= 5
        ? `
            <label style="display:flex;align-items:flex-start;gap:6px;">
                <input type="checkbox" id="alvo-jj-membro-inferior-check">
                <span>Atingir um membro inferior (Jiu Jitsu nível 5) — impossibilita correr; ambas as pernas quebradas, só dá pra se arrastar (teste de Tolerância, dificuldade 15)</span>
            </label>
        `
        : "";
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (Imobilizado por você)`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

// Infecção — Complicações de ferimentos (manual; ver dificuldadeInfeccao
// em regras.js). Etapa 5 do plano: o modal "Testar Infecção" saiu do
// Gerenciador de Combate e virou parte da aba Saúde, vinculado a uma
// FERIDA específica (abrirModalTestarInfeccaoFerida, junto com o resto
// da aba Saúde, mais abaixo neste arquivo) — em vez de um participante
// de combate solto. O caso "aplicar infecção direto, sem teste" (falha
// em Remover Projétil com complicação) já é automático dentro de
// tratarFerida (saude.js), então não precisa mais de um botão dedicado
// aqui.

// CQC nível 2 e nível 4 (manual): checkbox pré-rolagem de iniciativa —
// nível 2 pergunta quem está avançando contra oponentes armados pra
// derrubá-los (+1 na iniciativa); nível 4 (Disparar e Avançar, filtra
// `elegiveis` pra nivel >= 4) pergunta quem vai reservar 1 ação do
// próprio 1º turno pra disparar 2x fora da ordem de turno (ver
// iniciarIniciativaCombate em mestre.js). Só chamada quando
// participantesElegiveisCQCIniciativa() já achou pelo menos 1
// personagem nivel >= 2 — devolve uma Promise que resolve com
// {bonusMap, dispararMap} (mapas {participanteId: true} dos marcados em
// cada seção), ou `null` se o Mestre fechar/cancelar sem confirmar (o
// botão então não rola a iniciativa de ninguém, pra não perder a chance
// de aplicar os bônus).
export function abrirModalBonusIniciativaCQC(elegiveis) {
    return new Promise((resolve) => {
        let modal = document.getElementById("modal-bonus-cqc-iniciativa");
        if (!modal) {
            modal = document.createElement("div");
            modal.id = "modal-bonus-cqc-iniciativa";
            modal.className = "panel combate-painel-jogador";
            document.body.appendChild(modal);
        }
        const linhas = elegiveis.map(e => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                <input type="checkbox" data-cqc-iniciativa="${e.id}">
                <span>${escapeHtml(e.nome)} — CQC nível ${e.nivel}</span>
            </label>
        `).join("");
        const elegiveisNivel4 = elegiveis.filter(e => e.nivel >= 4);
        const linhasNivel4 = elegiveisNivel4.map(e => `
            <label style="display:flex;align-items:center;gap:8px;padding:4px 0;">
                <input type="checkbox" data-cqc-disparar="${e.id}">
                <span>${escapeHtml(e.nome)} — CQC nível ${e.nivel}</span>
            </label>
        `).join("");
        const blocoNivel4 = elegiveisNivel4.length ? `
            <h4 style="margin-top:14px;">Disparar e Avançar (nível 4)</h4>
            <p class="hint">Marque quem vai reservar 1 ação do 1º turno pra disparar 2x fora da ordem de turno (libera um botão próprio no Gerenciador de Combate).</p>
            <div class="combate-lista">${linhasNivel4}</div>
        ` : "";
        modal.innerHTML = `
            <div class="combate-painel-topo">
                <span class="eyebrow">CQC nível 2 e 4</span>
                <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
            </div>
            <h4>Bônus de iniciativa (+1)</h4>
            <p class="hint">Marque quem está avançando contra oponentes armados pra derrubá-los antes de rolar a iniciativa.</p>
            <div class="combate-lista">${linhas}</div>
            ${blocoNivel4}
            <button type="button" class="btn-lime" id="btn-confirmar-bonus-cqc-iniciativa" style="margin-top:10px;width:100%;">Rolar iniciativa</button>
        `;
        const fechar = (resultado) => { modal.remove(); resolve(resultado); };
        modal.querySelector(".combate-fechar").addEventListener("click", () => fechar(null));
        modal.querySelector("#btn-confirmar-bonus-cqc-iniciativa").addEventListener("click", () => {
            const bonusMap = {};
            modal.querySelectorAll("[data-cqc-iniciativa]").forEach(chk => {
                if (chk.checked) bonusMap[chk.dataset.cqcIniciativa] = true;
            });
            const dispararMap = {};
            modal.querySelectorAll("[data-cqc-disparar]").forEach(chk => {
                if (chk.checked) dispararMap[chk.dataset.cqcDisparar] = true;
            });
            fechar({ bonusMap, dispararMap });
        });
    });
}

// "Disparar e Avançar" (CQC nível 4, manual pg. 23): dispara 2x com uma
// pistola (Armas de Fogo de Pequeno Porte) equipada contra um único
// alvo, fora da ordem de turno — cada disparo reaproveita resolverAtaque
// (mesmas modais/penalidades/dano de um tiro normal), só com
// ehDisparoAvancarCQC:true pra pular o consumo de ação (já foi
// reservada na hora de rolar a iniciativa, ver iniciarIniciativaCombate
// em mestre.js) — igual ao contra-ataque do Aparar, que já faz esse
// mesmo bypass. Só chamada quando dispararAvancarDisponivel &&
// !dispararAvancarUsado (ver badge/botão no Gerenciador de Combate).
export function abrirModalDispararAvancar() {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const meuParticipante = meuPid && estado.combateAtivoCache.participantes && estado.combateAtivoCache.participantes[meuPid];
    if (!meuParticipante || !meuParticipante.dispararAvancarDisponivel || meuParticipante.dispararAvancarUsado) {
        toast("Disparar e Avançar não está disponível agora.", "erro");
        return;
    }
    const itemPistola = listaArmasInventario(estado.fichaAtual).find(a => a.periciaUso === "Armas de Fogo de Pequeno Porte" && a.equipada);
    if (!itemPistola) {
        toast("Equipe uma pistola (Armas de Fogo de Pequeno Porte) pra poder Disparar e Avançar.", "erro");
        return;
    }

    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([pid]) => pid !== meuPid);
    if (!opcoes.length) { toast("Não há outros participantes no combate pra disparar.", "erro"); return; }
    // Mesma lógica de abrirModalSelecionarAlvo: NPCs primeiro, jogadores
    // por último, pra evitar miss-click disparando no colega.
    opcoes.sort(([, a], [, b]) => (a.tipo === "ficha" ? 1 : 0) - (b.tipo === "ficha" ? 1 : 0));

    let modal = document.getElementById("modal-disparar-avancar-cqc");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-disparar-avancar-cqc";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const opts = opcoes.map(([pid, p]) => `<option value="${pid}">${escapeHtml(p.nome)} (${p.tipo === "ficha" ? "jogador" : "NPC"})</option>`).join("");
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Disparar e Avançar — CQC nível 4</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha o alvo</h4>
        <p class="hint">2 disparos com "${escapeHtml(itemPistola.nome)}", fora da ordem de turno, usando a ação já reservada do seu 1º turno.</p>
        <label for="disparar-avancar-alvo-select">Alvo</label>
        <select id="disparar-avancar-alvo-select">${opts}</select>
        <button type="button" class="btn-lime" id="btn-confirmar-disparar-avancar" style="margin-top:10px;width:100%;">Disparar (2x)</button>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-disparar-avancar").addEventListener("click", async () => {
        const alvoId = document.getElementById("disparar-avancar-alvo-select").value;
        modal.remove();
        await resolverDispararAvancar(alvoId, itemPistola);
    });
}

async function resolverDispararAvancar(alvoId, itemPistola) {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const meuParticipante = meuPid && estado.combateAtivoCache.participantes && estado.combateAtivoCache.participantes[meuPid];
    if (!meuParticipante || !meuParticipante.dispararAvancarDisponivel || meuParticipante.dispararAvancarUsado) {
        toast("Disparar e Avançar não está disponível agora.", "erro");
        return;
    }
    const alvo = estado.combateAtivoCache.participantes && estado.combateAtivoCache.participantes[alvoId];
    if (!alvo) { toast("Alvo inválido — pode ter saído do combate.", "erro"); return; }
    if (alvo.tipo === "ficha" && !confirm(`Você está atacando outro jogador (${alvo.nome}). Tem certeza?`)) {
        return;
    }

    const modificadoresPlanos = modificadoresAtuais();
    toast(`CQC nível 4 — Disparar e Avançar: 2 disparos em ${alvo.nome}, fora da ordem de turno.`);
    await resolverAtaque(itemPistola, modificadoresPlanos, { ...alvo, _pid: alvoId }, { ehDisparoAvancarCQC: true });
    await resolverAtaque(itemPistola, modificadoresPlanos, { ...alvo, _pid: alvoId }, { ehDisparoAvancarCQC: true });
    await marcarDispararAvancarUsado(meuPid);
    toast(`Disparar e Avançar concluído — pode avançar com sua movimentação livre (igual à Velocidade) em direção aos inimigos restantes.`);
}

// "Arremessar" (CQC nível 3+): a ação sempre acerta UM único alvo (dano
// + teste de Derrubar só nele) — o que escala com "até 3" é o NÚMERO
// de combatentes envolvidos na cena, não a quantidade de gente
// arremessada ao mesmo tempo. Por isso usa dropdown de alvo único
// (igual ao resto das manobras) + um campo numérico "combatentes
// adicionais" que soma ao modificador, em vez de checkboxes de
// múltiplos alvos.
// Manobra desarmada: arremessa o(s) PRÓPRIO ALVO (manual pg. 23: "...
// modificador +1 para arremessá-los ou derrubá-los"), não uma arma —
// por isso não depende de item de inventário nenhum.
// Devolve void — chama resolverArremessar direto ao confirmar.
export function abrirModalArremessar(nomePericia, modificadorBase) {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) =>
        !(p.tipo === "ficha" && p.refId === estado.fichaAtualId) &&
        !(estado.modoNpc && p.tipo === "npc" && p.refId === estado.npcAtualId)
    );
    if (!opcoes.length) { toast("Não há outros participantes no combate pra arremessar.", "erro"); return; }
    // NPCs primeiro, jogadores por último — evita miss-click arremessando o colega.
    opcoes.sort(([, a], [, b]) => (a.tipo === "ficha" ? 1 : 0) - (b.tipo === "ficha" ? 1 : 0));

    // Ocasião Especial da perícia usada (ver htmlCheckboxesOcasionais/
    // lerDeltaOcasionais acima): mesma checagem que já vale pra
    // Agarrar/Desarmar/Derrubar/Delimitar/Retomar/Imobilizar — Arremessar
    // não passava por isso ainda.
    const ocasionaisArremessar = modificadoresOcasionaisDaPericia(estado.fichaAtual, nomePericia);

    let modal = document.getElementById("modal-arremessar-cqc");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-arremessar-cqc";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }
    const opts = opcoes.map(([pid, p]) => `<option value="${pid}">${escapeHtml(p.nome)} (${p.tipo === "ficha" ? "jogador" : "NPC"})</option>`).join("");
    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Arremessar — CQC nível 3+</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>Escolha o alvo</h4>
        <p class="hint">Arremessa o alvo escolhido (dano Força [escala C], contusão). Cada combatente adicional na cena (além de 1, até 2) dá +1 no modificador do ataque.</p>
        <label for="arremessar-alvo-select">Alvo</label>
        <select id="arremessar-alvo-select">${opts}</select>
        <label for="arremessar-combatentes-input" style="margin-top:8px;">Combatentes adicionais (além de 1, máx. 2)</label>
        <input type="number" id="arremessar-combatentes-input" min="0" max="2" value="0" step="1">
        <div id="arremessar-ocasionais-lista">${htmlCheckboxesOcasionais(ocasionaisArremessar, nomePericia)}</div>
        <button type="button" class="btn-lime" id="btn-confirmar-arremessar" style="margin-top:10px;width:100%;">Arremessar</button>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelector("#btn-confirmar-arremessar").addEventListener("click", async () => {
        const alvoId = document.getElementById("arremessar-alvo-select").value;
        const alvo = estado.combateAtivoCache.participantes && estado.combateAtivoCache.participantes[alvoId];
        if (!alvo) { toast("Alvo inválido — pode ter saído do combate.", "erro"); return; }
        if (alvo.tipo === "ficha" && !confirm(`Você está atacando outro jogador (${alvo.nome}). Tem certeza?`)) {
            return;
        }
        const combatentesInput = document.getElementById("arremessar-combatentes-input");
        const bonusPorAlvoExtra = Math.min(2, Math.max(0, Number(combatentesInput.value) || 0));
        const deltaOcasional = lerDeltaOcasionais(modal.querySelector("#arremessar-ocasionais-lista"), ocasionaisArremessar);
        modal.remove();
        await resolverArremessar(nomePericia, modificadorBase + deltaOcasional, alvoId, bonusPorAlvoExtra);
    });
}

// Delimitar alcance (manual): além do alvo, escolhe QUAL alcance vai
// ficar disponível pra vítima (Curto/Médio/Longo) — usa o campo extra
// do modal compartilhado pra isso.
export function abrirModalSelecionarAlvoDelimitar(nomePericia, modificador) {
    el.alvoTitulo.innerText = `Delimitar alcance com ${nomePericia}`;
    if (!preencherOpcoesDeAlvo()) { toast("Não há outros participantes no combate pra delimitar o alcance.", "erro"); contextoAlvo.delimitar = null; return; }
    el.alvoCampoExtra.style.display = "block";
    el.alvoCampoExtra.innerHTML = `
        <label for="alvo-alcance-select">Alcance a impor no alvo</label>
        <select id="alvo-alcance-select">
            <option value="Curto">Curto</option>
            <option value="Médio">Médio</option>
            <option value="Longo">Longo</option>
        </select>
    `;
    const ocasionais = anexarOcasionaisNoCampoExtra(nomePericia);
    contextoAlvo.delimitar = { nomePericia, modificador, ocasionais };
    el.modalSelecionarAlvo.classList.add("active");
}

// Retomar alcance (manual): só precisa do alvo — a dificuldade já é
// fixa (pontuação da delimitação de alcance que o alvo colocou nele).
// Só faz sentido em quem JÁ está com o alcance limitado agora — inclui
// você mesmo (o caso normal: tirar a própria limitação) e também
// permite "retomar" o alcance de um aliado limitado, se fizer sentido
// na mesa.
export function abrirModalSelecionarAlvoRetomar(nomePericia, modificador) {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const opcoes = Object.entries(participantes).filter(([, p]) => p.alcanceLimitado && p.alcanceLimitado.ativo);
    if (!opcoes.length) { toast("Ninguém no combate está com o alcance limitado agora.", "erro"); return; }

    el.alvoTitulo.innerText = `Retomar alcance com ${nomePericia}`;
    el.alvoCampoExtra.style.display = "none";
    el.alvoCampoExtra.innerHTML = "";
    const ocasionais = anexarOcasionaisNoCampoExtra(nomePericia);
    contextoAlvo.retomar = { nomePericia, modificador, ocasionais };
    el.alvoSelect.innerHTML = "";
    opcoes.forEach(([pid, p]) => {
        const opt = document.createElement("option");
        opt.value = pid;
        opt.innerText = `${p.nome} (limitado a ${p.alcanceLimitado.valor})`;
        el.alvoSelect.appendChild(opt);
    });
    el.modalSelecionarAlvo.classList.add("active");
}

// "Dar Item" — só disponível pro jogador, e só pra itens que estão em
// "Levando consigo". A transferência de verdade só acontece depois que
// o Mestre confirma o pedido (Sistema de Aprovação, regra 4/5).
// Item que está esperando o jogador escolher pra quem dar (modal
// #modal-dar-item). Exportado como objeto (em vez de variável solta)
// pra configurarDarItem poder ser movida pra abas/inventario.js
// (Passo 17) e continuar lendo/zerando esse valor daqui.
export const contextoDarItem = { atual: null };

export function abrirModalDarItem(itemId, item) {
    const outras = Object.entries(estado.todasAsFichasCache || {}).filter(([id]) => id !== estado.fichaAtualId);
    if (!outras.length) { toast("Não há outras fichas ativas na rede pra receber o item.", "erro"); return; }

    contextoDarItem.atual = { itemId, item };
    el.darItemTitulo.innerText = `Dar "${item.nome}"`;
    el.darItemSelect.innerHTML = "";
    outras.forEach(([id, f]) => {
        const opt = document.createElement("option");
        opt.value = id;
        opt.innerText = (f.config && f.config.nomeExibicao) || id;
        el.darItemSelect.appendChild(opt);
    });
    el.modalDarItem.classList.add("active");
}

// "Novo turno" pro Recuo: zera a contagem de disparos de todo mundo.
// O sistema de combate atual (combateAtivo) não tem ordem de turno
// automática, então isso fica como um botão manual do Mestre — chame
// sempre que a rodada avançar pro próximo personagem/turno.
export async function resetarDisparosTurno() {
    pausarSync();
    try {
        await remove(ref(db, caminhoMesa("combateAtivo/disparosPorFicha")));
        toast("Recuo resetado — contagem de disparos zerada pra todo mundo.");
    } finally {
        retornarSync();
    }
}

// Agarrar (manual pg. 49-50): teste de Briga de Rua/Jiu Jitsu/Força
// Bruta/CQC vs. "10 + Força do alvo" — sem dano, sem Esquiva/Bloqueio/
// Aparar contra ela (o manual não prevê reação pra isso, diferente de
// golpe que causa dano). Sucesso deixa o alvo Agarrado (ver
// definirAgarrado em mestre.js): golpes de alcance médio/longo da
// vítima ficam bloqueados e o dano dela sai pela metade, até alguém
// soltar o agarrão (botão "Soltar" na lista de combate).
export async function resolverAgarrar(nomePericia, modificador, participante) {
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            dificuldade = 10 + (Number(fichaAlvo.dados.forca) || 0);
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            // NPC "rápido" (sem mini-ficha detalhada) não tem Força
            // cadastrada — usa Constituição como aproximação (mesma que
            // o resto do sistema já usa pra esses NPCs mais simples).
            const forcaAlvo = npc.modoDetalhado ? (Number(npc.atributosPrimarios?.forca) || 0) : (Number(npc.constituicao) || 0);
            dificuldade = 10 + forcaAlvo;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Agarrar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Agarrar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    if (meuPid) {
        await definirAgarrado(participante._pid, meuPid, nomeAtacante);
    }
    const detalhe = `${nomeAtacante} AGARROU ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} não consegue golpes de alcance médio/longo e causa metade do dano enquanto estiver agarrado.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Desarmar (manual pg. 49-50): teste vs. "10 + perícia da vítima" (usa
// a MELHOR das perícias corpo a corpo/arma branca do alvo, mesma lógica
// de Delimitar alcance — o manual não especifica QUAL perícia). Sucesso
// retira uma arma EQUIPADA do alvo (ver itemPodeEquipar/itemPodeUsar em
// inventario.js — só arma equipada pode ser usada em combate, e é isso
// que Desarmar de fato tira: desequipa o item, não some com ele). Se o
// alvo não tiver nenhuma arma equipada, o teste ainda pode ser vencido,
// mas não tem o que desarmar — o Log deixa isso claro.
export async function resolverDesarmar(nomePericia, modificador, participante) {
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo, caminhoInventarioAlvo;
    try {
        const melhorPericiaAlvo = await calcularMelhorModCorpoACorpoParticipante(participante.tipo, participante.refId);
        dificuldade = 10 + melhorPericiaAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            nomeAlvo = (snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
            caminhoInventarioAlvo = `fichas/${participante.refId}/inventario`;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            nomeAlvo = snap.val().nome || participante.nome;
            caminhoInventarioAlvo = `npcs/${participante.refId}/inventario`;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Desarmar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Desarmar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    // Acerto: procura a PRIMEIRA arma equipada do alvo pra desequipar.
    // Não há critério de "melhor arma" no manual — se o alvo tiver mais
    // de uma equipada (dupla empunhadura, por ex.), pega a primeira
    // encontrada e deixa claro qual foi no Log.
    let nomeArmaDesarmada = null;
    try {
        const snapInv = await get(ref(db, caminhoMesa(caminhoInventarioAlvo)));
        if (snapInv.exists()) {
            const inv = snapInv.val();
            const entradaArma = Object.entries(inv).find(([, it]) => ehArma(it.tag) && it.categoria === "levando" && it.equipada);
            if (entradaArma) {
                const [itemId, item] = entradaArma;
                await update(ref(db, caminhoMesa(`${caminhoInventarioAlvo}/${itemId}`)), { equipada: false });
                nomeArmaDesarmada = item.nome;
            }
        }
    } catch (err) {
        console.error(err);
        toast("Teste de Desarmar venceu, mas falhou ao atualizar o inventário do alvo — resolva manualmente.", "erro");
    }

    const efeitoTexto = nomeArmaDesarmada
        ? ` ${nomeAlvo} ficou desarmado — "${nomeArmaDesarmada}" foi desequipada e precisa ser reequipada (ou pega do chão) antes de voltar a ser usada.`
        : ` ${nomeAlvo} não tinha nenhuma arma equipada pra desarmar — teste vencido sem efeito.`;
    const detalhe = `${nomeAtacante} DESARMOU ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}.${efeitoTexto}\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Derrubar (manual pg. 49-50): teste vs. "10 + Constituição do alvo".
// Sucesso derruba a vítima — ver definirDerrubado em mestre.js: enquanto
// durar, a dificuldade pra acertá-la cai -3 (aplicado em resolverAtaque
// via participante.derrubado) e ela precisa gastar 1 ação do turno pra
// se levantar (ver tentarLevantarDerrubado, chamado pelo botão
// "Levantar" no Gerenciador de Combate).
//
// CQC nível 2 ("Avançar em direção a oponentes armados e derrubá-los
// tem [...] e derrubar uma vez. Causa dano contundente Destreza D"):
// `usarBonusCQCDano` vem do checkbox da modal de alvo (só aparece pra
// quem TEM o nível — ver abrirModalSelecionarAlvoDerrubar), porque é
// condicional a uma escolha narrativa que o sistema não consegue
// detectar sozinho. O +1 de iniciativa do MESMO nível é oferecido em
// outro momento (ao rolar iniciativa — ver participantesElegiveisCQCIniciativa
// em mestre.js), não aqui; o manual não deixa claro se as duas partes
// do bônus têm que ser usadas juntas na mesma ação, então ficam
// desacopladas — cabe ao Mestre decidir quando cada uma se aplica.
export async function resolverDerrubar(nomePericia, modificador, participante, usarBonusCQCDano = false) {
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            dificuldade = 10 + (Number(fichaAlvo.dados.constituicao) || 0);
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            const constituicaoAlvo = npc.modoDetalhado ? (Number(npc.atributosPrimarios?.constituicao) || 0) : (Number(npc.constituicao) || 0);
            dificuldade = 10 + constituicaoAlvo;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Derrubar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Derrubar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    await definirDerrubado(participante._pid, meuPid, nomeAtacante);

    let notaBonusCQC = "";
    if (usarBonusCQCDano) {
        try {
            const destrezaAtacante = Number(estado.fichaAtual.dados.destreza) || 0;
            const danoBonus = calcularDanoTotalArma({ danoBase: 0, escalaMult: 1 }, destrezaAtacante);
            const resultadoDanoBonus = await aplicarDano(participante.tipo, participante.refId, danoBonus, "contusao", null);
            notaBonusCQC = ` CQC nível 2 (avançou pra derrubar): +${danoBonus} de dano contundente extra — ${resultadoDanoBonus.reducao} (redução) = ${resultadoDanoBonus.danoFinal} aplicado, PV restante: ${resultadoDanoBonus.novoPv}.`;
        } catch (err) {
            console.error(err);
            notaBonusCQC = " Bônus de dano do CQC nível 2 marcado, mas falhou ao aplicar — resolva manualmente.";
        }
    }

    // Jiu Jitsu (manual pg. 22): "Ao derrubar alguém que não tenha Jiu
    // Jitsu, cause 1/10 do total de PV da vítima" — bônus automático
    // (não é uma escolha como o de CQC acima), só quando a manobra foi
    // de fato rolada com a perícia Jiu Jitsu e o atacante tem nível >= 1
    // nela. Usa o PV MÁXIMO do participante (já calculado no Gerenciador
    // de Combate, ver p.pvMax) — ver danoQuedaJiuJitsu em dados-manual.js.
    let notaQuedaJJ = "";
    if (nomePericia === "Jiu Jitsu") {
        try {
            const entradaJJ = Object.entries(estado.fichaAtual.pericias || {}).find(([, p]) => p.nome === "Jiu Jitsu");
            const nivelJJAtacante = entradaJJ ? (Number(entradaJJ[1].nivel) || 0) : 0;
            const alvoTemJJ = await alvoTemJiuJitsuTreinado(participante.tipo, participante.refId);
            const danoQueda = danoQuedaJiuJitsu(nivelJJAtacante, alvoTemJJ, participante.pvMax);
            if (danoQueda > 0) {
                const resultadoDanoQueda = await aplicarDano(participante.tipo, participante.refId, danoQueda, null, null);
                notaQuedaJJ = ` Jiu Jitsu (alvo sem a perícia): +${danoQueda} de dano extra (1/10 do PV total do alvo) — ${resultadoDanoQueda.danoFinal} aplicado, PV restante: ${resultadoDanoQueda.novoPv}.`;
            }
        } catch (err) {
            console.error(err);
            notaQuedaJJ = " Bônus de dano do Jiu Jitsu (queda) falhou ao aplicar — resolva manualmente.";
        }
    }

    const detalhe = `${nomeAtacante} DERRUBOU ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} está derrubado: dificuldade pra ser acertado cai -3 e precisa gastar 1 ação pra se levantar.${notaBonusCQC}${notaQuedaJJ}\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// "Levantar" (efeito de Derrubar — manual: "gastar uma ação para se
// levantar"). Igual ao resto do sistema de ações: o efeito (remover o
// status Derrubado) acontece na hora — só o CONSUMO da ação em si segue
// o Sistema de Aprovação do Mestre quando quem levanta é um jogador (ver
// checarConsumoDeAcao/criarAcaoPendente). Só faz sentido no PRÓPRIO
// turno de quem está derrubado (não dá pra "gastar a ação de alguém" —
// por isso não usa checarConsumoDeAcao, que sempre resolve pra "eu" —
// aqui o alvo é um participanteId explícito, vindo do botão "Levantar").
export async function tentarLevantarDerrubado(participanteId) {
    if (!combateComIniciativaAtivo()) {
        // Sem sistema de turnos ativo não há como controlar economia de
        // ações — levanta direto.
        await levantarDerrubado(participanteId);
        toast("Levantou.");
        return;
    }
    if (estado.combateAtivoCache.turnoAtual !== participanteId) {
        toast("Só é possível se levantar no próprio turno.", "erro");
        return;
    }
    const p = estado.combateAtivoCache.participantes[participanteId];
    if (p && Number(p.acoes) <= 0) {
        toast("Sem ações restantes neste turno pra se levantar.", "erro");
        return;
    }
    await levantarDerrubado(participanteId);
    {
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} se levantou e quer gastar 1 ação do turno.`,
            payload: { participanteId, ehArmaFogo: false }
        });
        toast("Levantou — gasto de ação enviado pro Mestre aprovar.");
    }
}

// Imobilizar (CQC nível 4, manual pg. 23 — ver MANOBRA_IMOBILIZAR_CQC em
// dados-manual.js): teste vs. "10 + melhor perícia do alvo entre Jiu
// Jitsu, CQC ou Briga de Rua" (PERICIAS_IMOBILIZAR_CQC), igual em
// espírito ao Desarmar (mesma função calcularMelhorModCorpoACorpoParticipante,
// só que com outra lista de perícias). A modal de alvo já filtra pra só
// mostrar quem está Derrubado (ver abrirModalSelecionarAlvoImobilizar).
// Sucesso trava o alvo (ver definirImobilizado em mestre.js), guardando
// o RESULTADO deste próprio teste como a dificuldade que a vítima vai
// precisar bater num teste de Destreza (no próprio turno dela, ver
// tentarLibertarImobilizado abaixo) pra se libertar — o manual fala em
// "o valor do agente CQC no teste de derrubar", mas como Imobilizar é
// uma ação separada e posterior ao Derrubar, usamos o teste que de fato
// prende o alvo agora.
export async function resolverImobilizar(nomePericia, modificador, participante) {
    const consumo = checarConsumoDeAcao(true); // Imobilizar só rola CQC (MANOBRA_IMOBILIZAR_CQC)
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        const melhorPericiaAlvo = await calcularMelhorModCorpoACorpoParticipante(participante.tipo, participante.refId, PERICIAS_IMOBILIZAR_CQC);
        dificuldade = 10 + melhorPericiaAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            nomeAlvo = (snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            nomeAlvo = snap.val().nome || participante.nome;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Imobilizar ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Imobilizar ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    if (meuPid) {
        await definirImobilizado(participante._pid, meuPid, nomeAtacante, resultadoAtaque);
    }
    const detalhe = `${nomeAtacante} IMOBILIZOU ${nomeAlvo} (${nomePericia}, CQC nível 4) — vs. dificuldade ${dificuldade}. ${nomeAlvo} não consegue atacar nem se mover enquanto durar; pra se libertar, precisa testar Destreza (dificuldade ${resultadoAtaque}) no próprio turno.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Melhor entre a Força (atributo) e a perícia Jiu Jitsu (nível) do
// alvo — usado na dificuldade de "Imobilizar (Jiu Jitsu)" (manual:
// "teste disputado de Força ou Jiu Jitsu", ver MANOBRA_IMOBILIZAR_JIUJITSU
// em dados-manual.js). Mesma convenção do resto do sistema pra "teste
// disputado" (10 + o melhor dos dois valores do alvo). NPC "rápido"
// (sem mini-ficha detalhada) não tem Força cadastrada — usa Constituição
// como aproximação, igual resolverAgarrar já faz, e não tem perícia
// Jiu Jitsu pra comparar.
async function calcularMelhorForcaOuJiuJitsuAlvo(alvoTipo, alvoRefId) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return -1;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const pvMaxCalc = Math.round(calcularDerivados(fichaAlvo.dados, modificadoresPlanos).recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        const forcaAlvo = Number(fichaAlvo.dados.forca) || 0;
        const jjAlvo = modificadorDePericiaComPenalidade("Jiu Jitsu", fichaAlvo.dados, fichaAlvo.pericias, modificadoresPlanos, estadoSaude.penalidadeTestes);
        return Math.max(forcaAlvo, jjAlvo);
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return -1;
    const npc = snap.val();
    const forcaAlvo = npc.modoDetalhado ? (Number(npc.atributosPrimarios?.forca) || 0) : (Number(npc.constituicao) || 0);
    let jjAlvo = -1;
    if (npc.modoDetalhado && npc.periciasNpc) {
        const entrada = Object.values(npc.periciasNpc).find(p => p.nome === "Jiu Jitsu");
        jjAlvo = entrada ? (Number(entrada.nivel) || 0) : -1;
    }
    return Math.max(forcaAlvo, jjAlvo);
}

// Verifica se o alvo já tem a perícia Jiu Jitsu treinada (nível > 0) —
// usado no bônus de dano base da manobra Derrubar (manual: "Ao derrubar
// alguém que NÃO TENHA Jiu Jitsu [...]", ver danoQuedaJiuJitsu em
// dados-manual.js e o hook em resolverDerrubar).
async function alvoTemJiuJitsuTreinado(alvoTipo, alvoRefId) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return false;
        const fichaAlvo = normalizarFicha(snap.val());
        const entrada = Object.values(fichaAlvo.pericias || {}).find(p => p.nome === "Jiu Jitsu");
        return !!(entrada && Number(entrada.nivel) > 0);
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return false;
    const npc = snap.val();
    if (!npc.modoDetalhado || !npc.periciasNpc) return false;
    const entrada = Object.values(npc.periciasNpc).find(p => p.nome === "Jiu Jitsu");
    return !!(entrada && Number(entrada.nivel) > 0);
}

// "Imobilizar (Jiu Jitsu)" (Jiu Jitsu nível 2, manual pg. 22 — ver
// MANOBRA_IMOBILIZAR_JIUJITSU em dados-manual.js): mesmo espírito do
// resolverImobilizar (CQC) logo acima — reaproveita a MESMA mecânica de
// status (definirImobilizado/soltarImobilizado, badges, bloqueio em
// resolverAtaque) — só muda a rolagem/dificuldade (ver
// calcularMelhorForcaOuJiuJitsuAlvo acima) e, com sucesso e Jiu Jitsu
// nível 3+, a opção de Desacordar o alvo em vez de só imobilizar.
export async function resolverImobilizarJiuJitsu(nomeBase, modificador, nivelJJ, participante, desacordar) {
    const consumo = checarConsumoDeAcao(false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        const melhorDoAlvo = await calcularMelhorForcaOuJiuJitsuAlvo(participante.tipo, participante.refId);
        dificuldade = 10 + melhorDoAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast("Ficha do alvo não encontrada (pode ter sido removida).", "erro"); return; }
            nomeAlvo = (snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast("NPC alvo não encontrado (pode ter sido removido).", "erro"); return; }
            nomeAlvo = snap.val().nome || participante.nome;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador (${nomeBase}): ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;
    const desacordarValido = desacordar && Number(nivelJJ) >= 3;

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Imobilizar (Jiu Jitsu) ${nomeAlvo} e quer gastar 1 ação do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Imobilizar (Jiu Jitsu) ${nomeAlvo} (${nomeBase}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    if (meuPid && desacordarValido) {
        await definirDesacordado(participante._pid, meuPid, nomeAtacante);
        const detalhe = `${nomeAtacante} venceu o teste disputado e DESACORDOU ${nomeAlvo} (${nomeBase}, Jiu Jitsu nível ${nivelJJ}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} está inconsciente: não age nem se defende, e não tem teste pra se libertar sozinho — só o Mestre pode acordá-lo.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe);
        return;
    }

    if (meuPid) {
        await definirImobilizado(participante._pid, meuPid, nomeAtacante, resultadoAtaque);
    }
    const detalhe = `${nomeAtacante} IMOBILIZOU ${nomeAlvo} (${nomeBase}, Jiu Jitsu nível ${nivelJJ}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} não consegue atacar nem se mover enquanto durar; pra se libertar, precisa testar Destreza (dificuldade ${resultadoAtaque}) no próprio turno.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// "Quebrar ossos" (Jiu Jitsu níveis 4/5, manual pg. 22 — ver
// MANOBRA_QUEBRAR_OSSOS_JIUJITSU/danoQuebrarOssosJiuJitsu em
// dados-manual.js): sem rolagem — é automático contra quem você já
// está Imobilizando (ver abrirModalQuebrarOssosJJ). Aplica o dano
// (Destreza C/B) direto com aplicarDano (mesmo helper do bônus de dano
// do CQC nível 2 em resolverDerrubar) e registra o status ossosQuebrados
// (ver definirOssosQuebrados em mestre.js) só pra exibir a nota da
// penalidade — o Mestre decide como aplicar "-X em qualquer ação
// física" nos testes seguintes da vítima.
export async function resolverQuebrarOssosJiuJitsu(nivelJJ, participante, membroInferior) {
    const consumo = checarConsumoDeAcao(false);
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const info = danoQuebrarOssosJiuJitsu(nivelJJ);
    if (!info) { toast("Jiu Jitsu nível 4+ é necessário pra Quebrar ossos.", "erro"); return; }

    const destrezaAtacante = Number(estado.fichaAtual.dados.destreza) || 0;
    const dano = calcularDanoTotalArma({ danoBase: 0, escalaMult: info.escalaMult }, destrezaAtacante);

    let resultadoDano, nomeAlvo;
    try {
        resultadoDano = await aplicarDano(participante.tipo, participante.refId, dano, "contusao", null);
        nomeAlvo = resultadoDano.nomeAlvo;
    } catch (err) {
        console.error(err);
        toast("Falha ao aplicar dano no alvo.", "erro");
        return;
    }

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} usou Quebrar ossos em ${nomeAlvo} e quer gastar 1 ação do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    await definirOssosQuebrados(participante._pid, {
        pontosPenalidade: info.pontosPenalidade,
        membroInferior: membroInferior && Number(nivelJJ) >= 5,
        porNome: nomeAtacante
    });

    const notaMembro = (membroInferior && Number(nivelJJ) >= 5)
        ? " Atingiu um membro inferior: impossibilita correr (se ambas as pernas forem quebradas, só dá pra se arrastar, testando Tolerância dificuldade 15)."
        : "";
    const detalhe = `${nomeAtacante} QUEBROU OSSOS de ${nomeAlvo} (Jiu Jitsu nível ${nivelJJ}, ${info.label}): +${dano} de dano contundente — ${resultadoDano.reducao} (redução) = ${resultadoDano.danoFinal} aplicado, PV restante: ${resultadoDano.novoPv}. Reduz em ${info.pontosPenalidade} ponto(s) qualquer ação física da vítima enquanto durar (a critério do Mestre).${notaMembro}`;
    await registrarRolagem({ quem: nomeAtacante, modificador: 0, resultado: dano, detalhe });
    toast(detalhe);
}

// Destreza, dif igual ao valor do agente CQC no teste de [Imobilizar]").
// Mesma lógica de ação do "Levantar" (tentarLevantarDerrubado): só no
// próprio turno de quem está imobilizado, gasta 1 ação. Diferente de
// Levantar, aqui tem uma rolagem de verdade (Destreza, o ATRIBUTO
// puro — o manual não pede uma perícia) contra a dificuldade guardada
// em definirImobilizado.
export async function tentarLibertarImobilizado(participanteId) {
    if (!combateComIniciativaAtivo()) {
        await soltarImobilizado(participanteId);
        toast("Livrou-se do Imobilizado.");
        return;
    }
    if (estado.combateAtivoCache.turnoAtual !== participanteId) {
        toast("Só é possível tentar se libertar no próprio turno.", "erro");
        return;
    }
    const p = estado.combateAtivoCache.participantes[participanteId];
    const statusImobilizado = p && p.imobilizado;
    if (!statusImobilizado || !statusImobilizado.ativo) return;
    if (Number(p.acoes) <= 0) {
        toast("Sem ações restantes neste turno pra tentar se libertar.", "erro");
        return;
    }

    const dificuldade = Number(statusImobilizado.dificuldadeEscape) || 10;
    const modDestreza = Number(estado.fichaAtual?.dados?.destreza) || 0;
    const penalidade = penalidadeTestesAtual();
    // Ocasião Especial (ver abrirModalDeltaOcasionais acima): teste de
    // Destreza (atributo:destreza) pra se libertar — mesma checagem de
    // qualquer outra rolagem, antes de gastar o d20.
    const ocasionaisLibertar = modificadoresOcasionaisDoAlvo(estado.fichaAtual, "atributo:destreza");
    const { confirmado, delta: deltaOcasionalLibertar } = await abrirModalDeltaOcasionais("Destreza — Libertar-se do Imobilizado", ocasionaisLibertar);
    if (!confirmado) return;
    const bruto = rolarD20();
    const modTotal = modDestreza + penalidade + deltaOcasionalLibertar;
    const resultado = bruto + modTotal;
    const detalheRolagem = `rolagem: ${bruto}\nDestreza: ${modDestreza >= 0 ? "+" : ""}${modDestreza}${penalidade ? ` ${penalidade >= 0 ? "+" : ""}${penalidade} (penalidade de saúde/energia)` : ""}\nresultado: ${resultado}`;
    const conseguiu = resultado >= dificuldade;

    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    await criarAcaoPendente({
        tipo: "gastar_acao_combate",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} testou Destreza pra se libertar do Imobilizado e quer gastar 1 ação do turno.\n${detalheRolagem}`,
        payload: { participanteId, ehArmaFogo: false }
    });

    if (conseguiu) {
        await soltarImobilizado(participanteId);
        const detalhe = `${nomeJogador} testou Destreza vs. dificuldade ${dificuldade} e se LIBERTOU do Imobilizado.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeJogador, modificador: modTotal, resultado, detalhe });
        toast(detalhe);
    } else {
        const detalhe = `${nomeJogador} testou Destreza vs. dificuldade ${dificuldade} e continua Imobilizado.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeJogador, modificador: modTotal, resultado, detalhe });
        toast(detalhe, "erro");
    }
}

// Arremessar (CQC nível 3+, manual pg. 23, dentro de "Esfaquear e
// Arremessar"): arremessa o alvo escolhido (não uma arma) — SEMPRE um
// único alvo recebe dano/teste de Derrubar. "Para cada inimigo a mais
// até um máximo de 3, você recebe modificador +1 para arremessá-los ou
// derrubá-los" — interpretado como bônus por combatentes adicionais na
// cena (até +2, pra um total de "até 3" contando o próprio alvo),
// aplicado ao teste contra o único alvo, não como múltiplos alvos
// atingidos simultaneamente. Reaproveita a dificuldade -1 do nível 3
// (já embutida no "9 +" abaixo em vez de "10 +"). Dano escala com
// FORÇA [escala C] (manual: "Arremessar causa Força C") e é tratado
// como contusão, igual qualquer golpe desarmado — não há arma nem tipo
// de dano extra envolvido. O acerto ainda testa Derrubar contra o
// alvo, com dificuldade +2 (mais difícil que o Derrubar corpo a corpo
// comum), usando a mesma infraestrutura de definirDerrubado/
// resolverDerrubar.
async function resolverArremessar(nomePericia, modificadorBase, alvoId, bonusPorAlvoExtra) {
    const consumo = checarConsumoDeAcao(true); // Arremessar só rola CQC (MANOBRA_ARREMESSAR_CQC)
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const modificadorAtaque = modificadorBase + bonusPorAlvoExtra;
    const forcaAtacante = Number(estado.fichaAtual.dados.forca) || 0;
    const danoArremesso = calcularDanoTotalArma({ danoBase: 0, escalaMult: 2 }, forcaAtacante); // escala C = 2x Força
    const tipoDanoKey = "contusao"; // arremessa o alvo, não uma arma — dano de impacto

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} arremessou um alvo e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    const participante = estado.combateAtivoCache.participantes && estado.combateAtivoCache.participantes[alvoId];
    if (!participante) { toast("Alvo inválido — pode ter saído do combate.", "erro"); return; }

    let dificuldade, nomeAlvo, constituicaoAlvo = 0;
    try {
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            if (!snap.exists()) { toast(`${participante.nome}: ficha não encontrada.`, "erro"); return; }
            const fichaAlvo = normalizarFicha(snap.val());
            nomeAlvo = (fichaAlvo.config && fichaAlvo.config.nomeExibicao) || participante.nome;
            const modsAlvo = coletarModificadores(fichaAlvo);
            const agilidadeAlvo = calcularDificuldadeDefesaJogador(fichaAlvo.dados, "agilidade", modsAlvo, 0);
            constituicaoAlvo = calcularDificuldadeDefesaJogador(fichaAlvo.dados, "constituicao", modsAlvo, 0);
            dificuldade = 9 + agilidadeAlvo; // 10 base -1 (CQC nível 3)
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            if (!snap.exists()) { toast(`${participante.nome}: NPC não encontrado.`, "erro"); return; }
            const npc = snap.val();
            nomeAlvo = npc.nome || participante.nome;
            // Mesmo recálculo ao vivo do bloco de resolverAtaque acima —
            // ver comentário lá pra detalhes de por que não usa mais
            // npc.agilidade/npc.constituicao direto.
            if (npc.modoDetalhado && npc.atributosPrimarios) {
                const modsNpcAlvo = coletarModificadores({ vantagens: npc.vantagens });
                const secundariosNpcAlvo = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modsNpcAlvo);
                dificuldade = 9 + secundariosNpcAlvo.secundarios.agilidade.valor;
                constituicaoAlvo = calcularDificuldadeDefesaJogador(npc.atributosPrimarios, "constituicao", modsNpcAlvo, 0);
            } else {
                dificuldade = 9 + (Number(npc.agilidade) || 0);
                constituicaoAlvo = Number(npc.constituicao) || 0;
            }
        }
    } catch (err) {
        console.error(err);
        toast(`${participante.nome}: falha ao buscar dados do alvo.`, "erro");
        return;
    }

    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificadorAtaque;
    const notaBonus = bonusPorAlvoExtra ? ` (base ${modificadorBase >= 0 ? "+" : ""}${modificadorBase} +${bonusPorAlvoExtra} por combatente adicional)` : "";
    if (resultadoAtaque < dificuldade) {
        const detalhe = `${nomeAtacante} ARREMESSOU (CQC nível 3+) ${nomeAlvo} — ERRO (${brutoAtaque}+${modificadorAtaque}=${resultadoAtaque} vs. dificuldade ${dificuldade})${notaBonus}.`;
        await registrarRolagem({ quem: nomeAtacante, modificador: modificadorAtaque, resultado: "erro", detalhe });
        toast(detalhe, "erro");
        return;
    }

    let resultadoDano;
    try {
        resultadoDano = await aplicarDano(participante.tipo, participante.refId, danoArremesso, tipoDanoKey, null);
    } catch (err) {
        console.error(err);
        toast(`${nomeAlvo}: ACERTO (${resultadoAtaque} vs. ${dificuldade}), mas falhou ao aplicar o dano — resolva manualmente.`, "erro");
        return;
    }

    // Teste de Derrubar embutido (dificuldade +2) — só se o arremesso acertou.
    const dificuldadeDerrubar = 10 + constituicaoAlvo + 2;
    const brutoDerrubar = rolarD20();
    const resultadoDerrubar = brutoDerrubar + modificadorAtaque;
    let notaDerrubar;
    if (resultadoDerrubar >= dificuldadeDerrubar) {
        await definirDerrubado(alvoId, meuPid, nomeAtacante);
        notaDerrubar = ` DERRUBADO (${brutoDerrubar}+${modificadorAtaque}=${resultadoDerrubar} vs. ${dificuldadeDerrubar}).`;
    } else {
        notaDerrubar = ` não derrubou (${brutoDerrubar}+${modificadorAtaque}=${resultadoDerrubar} vs. ${dificuldadeDerrubar}).`;
    }

    const detalhe = `${nomeAtacante} ARREMESSOU (CQC nível 3+) ${nomeAlvo} — ACERTO (${resultadoAtaque} vs. ${dificuldade})${notaBonus} — dano ${danoArremesso}, ${resultadoDano.reducao} de redução = ${resultadoDano.danoFinal} aplicado, PV restante ${resultadoDano.novoPv}.${notaDerrubar}`;
    await registrarRolagem({ quem: nomeAtacante, modificador: modificadorAtaque, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Delimitar alcance (manual): teste vs. "11 + perícia corpo a corpo do
// alvo" (usa a MELHOR das perícias corpo a corpo/arma branca do alvo —
// ver calcularMelhorModCorpoACorpoParticipante). Sucesso trava a vítima
// num único alcance (ver verificarAlcanceLimitado em resolverAtaque).
export async function resolverDelimitarAlcance(nomePericia, modificador, alcanceEscolhido, participante) {
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;

    let dificuldade, nomeAlvo;
    try {
        const melhorPericiaAlvo = await calcularMelhorModCorpoACorpoParticipante(participante.tipo, participante.refId);
        dificuldade = 11 + melhorPericiaAlvo;
        if (participante.tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${participante.refId}`)));
            nomeAlvo = (snap.exists() && snap.val().config && snap.val().config.nomeExibicao) || participante.nome;
        } else {
            const snap = await get(ref(db, caminhoMesa(`npcs/${participante.refId}`)));
            nomeAlvo = (snap.exists() && snap.val().nome) || participante.nome;
        }
    } catch (err) {
        console.error(err);
        toast("Falha ao buscar dados do alvo.", "erro");
        return;
    }

    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Delimitar o alcance (${alcanceEscolhido}) de ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Delimitar o alcance de ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    await definirAlcanceLimitado(participante._pid, { valor: alcanceEscolhido, pontuacao: resultadoAtaque, porPid: meuPid, porNome: nomeAtacante });
    const detalhe = `${nomeAtacante} DELIMITOU o alcance de ${nomeAlvo} pra ${alcanceEscolhido} (${nomePericia}) — vs. dificuldade ${dificuldade}. ${nomeAlvo} só consegue usar golpes de alcance ${alcanceEscolhido} (Médio sempre passa, com metade do dano, se não for o escolhido).\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// Retomar alcance (manual): dificuldade fixa = pontuação do teste de
// Delimitar alcance que travou a vítima (já guardada em
// participante.alcanceLimitado.pontuacao — sem precisar buscar nada,
// vem direto do combateAtivo).
export async function resolverRetomarAlcance(nomePericia, modificador, participante) {
    if (!participante.alcanceLimitado || !participante.alcanceLimitado.ativo) {
        toast(`${participante.nome} não está com o alcance limitado.`, "erro");
        return;
    }
    const consumo = checarConsumoDeAcao(nomePericia === "CQC");
    if (!consumo) return;
    const participanteIdParaGastarAcao = consumo.participanteId;

    const nomeAtacante = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || "Jogador";
    const nomeAlvo = participante.nome;
    const brutoAtaque = rolarD20();
    const resultadoAtaque = brutoAtaque + modificador;
    const dificuldade = Number(participante.alcanceLimitado.pontuacao) || 0;
    const detalheRolagem = `rolagem: ${brutoAtaque}\nmodificador de perícia: ${modificador >= 0 ? "+" : ""}${modificador}\nresultado: ${resultadoAtaque}`;
    const conseguiu = resultadoAtaque >= dificuldade;

    if (participanteIdParaGastarAcao) {
        await criarAcaoPendente({
            tipo: "gastar_acao_combate",
            fichaId: estado.fichaAtualId,
            nomeJogador: nomeAtacante,
            detalhe: `${nomeAtacante} tentou Retomar o alcance de ${nomeAlvo} e quer gastar 1 ação${consumo.extraCQC ? " EXTRA de CQC (nível 5)" : ""} do turno.\n${detalheRolagem}`,
            payload: { participanteId: participanteIdParaGastarAcao, extraCQC: consumo.extraCQC, ehArmaFogo: false }
        });
        toast("Gasto de ação enviado pro Mestre aprovar.");
    }

    if (!conseguiu) {
        const detalhe = `${nomeAtacante} tentou Retomar o alcance de ${nomeAlvo} (${nomePericia}). ERRO — vs. dificuldade ${dificuldade}.\n${detalheRolagem}`;
        await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
        toast(detalhe, "erro");
        return;
    }

    await soltarAlcanceLimitado(participante._pid);
    const detalhe = `${nomeAtacante} RETOMOU o alcance de ${nomeAlvo} (${nomePericia}) — vs. dificuldade ${dificuldade}. Limitação de alcance removida.\n${detalheRolagem}`;
    await registrarRolagem({ quem: nomeAtacante, modificador, resultado: resultadoAtaque, detalhe });
    toast(detalhe);
}

// ---------------------------------------------------------------------
// COMBATE
// ---------------------------------------------------------------------
// renderizarCombate e renderizarManobrasCombate (aba "Combate",
// exibição) foram movidos pra abas/combate.js no Passo 22 do plano
// de modularização. Ver docs/estado-compartilhado.md e
// plano-modularizacao-ficha-js.txt.

// Toggle "Aparecer no Cenário" / "Remover do Cenário" (Fase 6 do plano —
// ver plano-veiculos-fase2.txt, seção "FASE 6"): grava/apaga o ponteiro
// em cenarios/{id}/veiculos e o cenarioId/cenarioEntryId espelhado no
// próprio veículo numa transação simples de update duplo (mesmo espírito
// de salvarVeiculoDoModal pra chave) — feito em mestre.js
// (aparecerVeiculoNoCenario/removerVeiculoDoCenario) pra escrever os dois
// nós juntos.
export async function alternarVeiculoNoCenario(veiculoId, acao) {
    if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    if (acao === "remover") {
        if (!v.cenarioId) return;
        await removerVeiculoDoCenario(v.cenarioId, v.cenarioEntryId, estado.fichaAtualId, veiculoId);
        toast(`"${v.nome || "Veículo"}" removido do cenário.`);
        return;
    }
    const cenario = cenarioAtualDoPersonagem();
    if (!cenario) { toast("Você não está em nenhum cenário no momento.", "erro"); return; }
    await aparecerVeiculoNoCenario(cenario.id, estado.fichaAtualId, veiculoId);
    toast(`"${v.nome || "Veículo"}" agora está presente em "${cenario.titulo}".`);
}

// ---------------------------------------------------------------------
// ACESSÓRIOS DE VEÍCULO (manual pg. 37-38) — Fase 5b do plano (ver
// plano-acessorios-veiculo.txt, seção "FASE 5b").
// ---------------------------------------------------------------------

// Modal "+ Instalar Acessório": lista o catálogo inteiro
// (CATALOGO_ACESSORIOS_VEICULO), cinza os que não cabem no slot livre
// atual (podeInstalarAcessorio, regras.js) e os que já estão instalados
// (não dá pra instalar o mesmo acessório duas vezes — cada um do
// catálogo é único no veículo, mesmo espírito de um item físico só
// existir uma vez). Sem custo em CN$ — ver nota da Fase 5a/5b sobre
// preço não publicado no manual; o Mestre cobra manualmente se quiser.
export function abrirModalInstalarAcessorioVeiculo(veiculoId) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;

    let modal = document.getElementById("modal-instalar-acessorio-veiculo");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-instalar-acessorio-veiculo";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    // Fase 5c: armas montadas (item.instaladoEmVeiculoId) também
    // ocupam slot — precisa entrar aqui, senão o modal deixaria
    // instalar um acessório passivo por cima de um slot já tomado por
    // uma Torreta Tática, por exemplo.
    const itensArmaInstalados = itensArmaInstaladosEmVeiculo(estado.fichaAtual.inventario, veiculoId);
    const jaInstaladas = new Set((v.acessoriosInstalados || []).map(a => a.key));
    const linhasHtml = CATALOGO_ACESSORIOS_VEICULO.map(cat => {
        const jaTem = jaInstaladas.has(cat.key);
        const cabe = !jaTem && podeInstalarAcessorio(v, cat, itensArmaInstalados);
        const motivo = jaTem ? "Já instalado neste veículo." : (!cabe ? "Não há slots livres suficientes." : "");
        return `
            <div class="veiculo-acessorio-linha${cabe ? "" : " desabilitada"}" data-acessorio-key="${cat.key}">
                <div class="veiculo-acessorio-linha-topo">
                    <strong>${escapeHtml(cat.nome)}</strong>
                    <span class="hint-inline">${cat.nivel} slot(s)</span>
                </div>
                <p class="hint">${escapeHtml(cat.descricao)}</p>
                <div class="veiculo-acessorio-linha-acoes">
                    <button type="button" class="btn-lime veiculo-acessorio-instalar-confirmar-btn" data-instalar-confirmar ${cabe ? "" : "disabled"} title="${escapeHtml(motivo)}">Instalar</button>
                </div>
            </div>
        `;
    }).join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Instalar Acessório — ${escapeHtml(v.nome || "veículo")}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Slots livres: ${slotsAcessoriosLivres(v, itensArmaInstalados)}. Sem preço publicado no manual pra nenhum destes — combine o custo com o Mestre.</p>
        <div class="veiculo-manobra-lista">${linhasHtml}</div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelectorAll("[data-instalar-confirmar]:not([disabled])").forEach(btn => {
        btn.addEventListener("click", async () => {
            const key = btn.closest("[data-acessorio-key]").dataset.acessorioKey;
            modal.remove();
            await instalarAcessorioVeiculo(veiculoId, key);
        });
    });
    document.body.appendChild(modal);
}

async function instalarAcessorioVeiculo(veiculoId, key) {
    if (!estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const cat = buscarAcessorioVeiculo(key);
    if (!cat) return;
    // Fase 5c: mesma correção acima — considera as armas já montadas
    // antes de confirmar que o slot cabe.
    const itensArmaInstalados = itensArmaInstaladosEmVeiculo(estado.fichaAtual.inventario, veiculoId);
    if (!podeInstalarAcessorio(v, cat, itensArmaInstalados)) { toast("Não há slots livres suficientes.", "erro"); return; }
    const atuais = v.acessoriosInstalados || [];
    if (atuais.some(a => a.key === key)) { toast("Este acessório já está instalado.", "erro"); return; }
    const nova = { key, instaladoEm: Date.now(), usadoNestaCena: false };
    await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { acessoriosInstalados: [...atuais, nova] });
    toast(`"${cat.nome}" instalado em "${v.nome || "veículo"}".`, "ok");
}

// Remove e libera o slot na hora — sem custo/aprovação, mesmo espírito
// livre de Trancar/Destrancar (o item físico só volta a existir "solto"
// narrativamente, não vira item de inventário — mesma régua de upgrade
// de atributo, que também não devolve material ao desfazer).
export async function removerAcessorioVeiculo(veiculoId, key) {
    if (!estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const cat = buscarAcessorioVeiculo(key);
    const atuais = v.acessoriosInstalados || [];
    await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { acessoriosInstalados: atuais.filter(a => a.key !== key) });
    toast(`"${cat ? cat.nome : key}" removido — slot liberado.`, "ok");
}

// "🎲 Testar" (mecanica === "teste_dif_fixa"): rola a perícia do
// próprio acessório (periciaTeste) contra a dificuldade fixa dele
// (dificuldade) — mesmo rolarERegistrar de qualquer outra rolagem de
// perícia solta. Pra Óleo/Cospe Prego, ESTA rolagem representa "você
// mesmo testando" (ex.: fugindo de um perseguidor NPC que o Mestre
// resolve à parte) — quando o alvo é outro personagem jogador, o
// próprio alvo rola Dirigir Veículos na ficha DELE contra esta mesma
// dificuldade (mostrada no botão) e o Mestre aplica
// efeitoOleoVeiculo/efeitoCospePregoVeiculo (regras.js) manualmente
// sobre o veículo de quem perseguiu — ver comentário dessas funções em
// regras.js pro motivo de não automatizar isso daqui.
export async function testarAcessorioVeiculo(veiculoId, key) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const cat = buscarAcessorioVeiculo(key);
    if (!cat || cat.mecanica !== "teste_dif_fixa") return;
    const modificadoresPlanos = modificadoresAtuais();
    const modificador = modificadorDePericiaComPenalidade(cat.periciaTeste, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual() + penalidadeEnergiaParaPericia(cat.periciaTeste));
    const resultado = await rolarComPossibilidadeDeOcasionais(`${cat.nome} (${cat.periciaTeste})`, `pericia:${cat.periciaTeste}`, modificador, false, cat.dificuldade);
    if (!resultado) return;

    if (key === "oleo") {
        const efeito = efeitoOleoVeiculo(resultado.resultado);
        toast(efeito.sucesso ? "Sucesso — o Óleo não pegou desta vez." : "Falhou — -2 Controle por 1 turno pra quem tentou passar (aplique manualmente no veículo do perseguidor).", efeito.sucesso ? "ok" : "erro");
    } else if (key === "cospe-prego") {
        const efeito = efeitoCospePregoVeiculo(resultado.resultado);
        if (efeito.sucesso) {
            toast("Sucesso — passou pelos pregos sem problema.", "ok");
        } else {
            toast(`Falhou — -3 Controle por 1 turno${efeito.perseguidorDeixadoParaTras ? " e pode ser considerado deixado pra trás" : ""} (aplique manualmente no veículo do perseguidor).`, "erro");
        }
    }
}

// "✅ Usar" (mecanica === "uma_vez_por_cena", ex.: IA de Bordo, Lança
// Fumaça): marca usadoNestaCena — sem rolagem, é só um efeito narrativo
// já descrito no texto do acessório. Mestre reseta ao trocar de cena
// (ver resetarUsosAcessoriosVeiculo abaixo).
export async function usarAcessorioVeiculo(veiculoId, key) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const cat = buscarAcessorioVeiculo(key);
    if (!cat) return;
    const atuais = v.acessoriosInstalados || [];
    if (!atuais.some(a => a.key === key)) return;
    const atualizados = atuais.map(a => a.key === key ? { ...a, usadoNestaCena: true } : a);
    await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { acessoriosInstalados: atualizados });
    toast(`"${cat.nome}" usado — ${cat.descricao}`, "ok");
}

// Mestre reseta todos os usos "uma vez por cena" do veículo de uma vez
// (troca de cena) — mesmo espírito de limparBonusTemporariosVeiculo.
export async function resetarUsosAcessoriosVeiculo(veiculoId) {
    if (!estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const atuais = v.acessoriosInstalados || [];
    const atualizados = atuais.map(a => ({ ...a, usadoNestaCena: false }));
    await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { acessoriosInstalados: atualizados });
    toast(`Usos "por cena" de "${v.nome || "veículo"}" resetados.`);
}

// ---------------------------------------------------------------------
// ACESSÓRIOS-ARMA DE VEÍCULO (Truck Pistol, Metralhadora de Teto,
// Torreta Tática — manual pg. 37-38) — Fase 5c do plano (ver
// plano-acessorios-veiculo.txt, seção "FASE 5c"). Nenhuma mecânica nova
// de disparo aqui — só o ponteiro item→veículo e o controle de slot em
// cima dele; disparar é o mesmo "🎯 Disparar" que chama iniciarUsoItem,
// já wired em renderizarVeiculos.
// ---------------------------------------------------------------------

// Modal "+ Instalar Arma do Inventário": lista as armas (tag "arma") da
// PRÓPRIA ficha que ainda não estão montadas em nenhum veículo, cinza as
// que não cabem no slot livre atual deste veículo (instalarArmaNoVeiculo,
// regras.js — mesma régua de podeInstalarAcessorio que os 9 acessórios
// passivos já usam). Sem preço (nenhum dos três tem tabela publicada no
// manual, igual ao resto do catálogo de Fase 5).
export function abrirModalInstalarArmaVeiculo(veiculoId) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;

    const itensArmaInstalados = itensArmaInstaladosEmVeiculo(estado.fichaAtual.inventario, veiculoId);
    const armasDisponiveis = Object.entries(estado.fichaAtual.inventario || {})
        .filter(([, it]) => it && ehArma(it.tag) && !it.instaladoEmVeiculoId);

    let modal = document.getElementById("modal-instalar-arma-veiculo");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-instalar-arma-veiculo";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const linhasHtml = armasDisponiveis.length ? armasDisponiveis.map(([id, it]) => {
        const cabe = instalarArmaNoVeiculo(it, v, itensArmaInstalados);
        const motivo = cabe ? "" : "Não há slots livres suficientes.";
        return `
            <div class="veiculo-acessorio-linha${cabe ? "" : " desabilitada"}" data-item-id="${id}">
                <div class="veiculo-acessorio-linha-topo">
                    <strong>🔫 ${escapeHtml(it.nome)}</strong>
                    <span class="hint-inline">${Number(it.nivelTag) || 0} slot(s)</span>
                </div>
                <div class="veiculo-acessorio-linha-acoes">
                    <button type="button" class="btn-lime veiculo-arma-instalar-confirmar-btn" data-instalar-arma-confirmar ${cabe ? "" : "disabled"} title="${escapeHtml(motivo)}">Instalar</button>
                </div>
            </div>
        `;
    }).join("") : `<p class="hint">Nenhuma arma disponível no inventário (fora de qualquer veículo) pra instalar.</p>`;

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Instalar Arma — ${escapeHtml(v.nome || "veículo")}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Slots livres: ${slotsAcessoriosLivres(v, itensArmaInstalados)}. Só armas do seu próprio inventário que ainda não estão montadas em outro veículo aparecem aqui.</p>
        <div class="veiculo-manobra-lista">${linhasHtml}</div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelectorAll("[data-instalar-arma-confirmar]:not([disabled])").forEach(btn => {
        btn.addEventListener("click", async () => {
            const itemId = btn.closest("[data-item-id]").dataset.itemId;
            modal.remove();
            await instalarArmaEmVeiculo(veiculoId, itemId);
        });
    });
    document.body.appendChild(modal);
}

// Grava o ponteiro no item (item.instaladoEmVeiculoId) — mesmo padrão de
// referência cruzada que a chave de veículo já usa (item.veiculoId), não
// uma cópia do item. Monta a arma já EQUIPADA (item.equipada: true): uma
// arma montada no carro está fisicamente pronta pra disparar, mesmo
// espírito de "equipada" que qualquer arma na mão já usa — sem isso,
// itemPodeUsar (inventario.js) bloquearia o botão "🎯 Disparar" por
// achar que a arma está desequipada/guardada.
async function instalarArmaEmVeiculo(veiculoId, itemId) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    const it = estado.fichaAtual.inventario && estado.fichaAtual.inventario[itemId];
    if (!v || !it || !ehArma(it.tag)) return;
    if (it.instaladoEmVeiculoId) { toast("Esta arma já está montada em outro veículo.", "erro"); return; }
    const itensArmaInstalados = itensArmaInstaladosEmVeiculo(estado.fichaAtual.inventario, veiculoId);
    if (!instalarArmaNoVeiculo(it, v, itensArmaInstalados)) { toast("Não há slots livres suficientes.", "erro"); return; }
    await update(ref(db, `${caminhoBase()}/inventario/${itemId}`), { instaladoEmVeiculoId: veiculoId, equipada: true, categoria: "levando" });
    toast(`"${it.nome}" montada em "${v.nome || "veículo"}".`, "ok");
}

// Remove o ponteiro — a arma continua existindo normalmente no
// inventário (categoria "levando", ainda equipada), só solta do carro e
// devolve o slot na hora. Sem custo/aprovação, mesmo espírito livre de
// removerAcessorioVeiculo (Fase 5b) e de Trancar/Destrancar.
export async function removerArmaDoVeiculo(itemId) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const it = estado.fichaAtual.inventario && estado.fichaAtual.inventario[itemId];
    if (!it || !it.instaladoEmVeiculoId) return;
    await update(ref(db, `${caminhoBase()}/inventario/${itemId}`), { instaladoEmVeiculoId: null, slotVeiculo: null });
    toast(`"${it.nome}" removida do veículo — slot liberado.`, "ok");
}

// ---------------------------------------------------------------------
// CENÁRIO (ver plano-cenario.txt, Fase 4) — mostra os cenários
// compartilhados (estado.cenariosCache, alimentado por configurarCenarios)
// filtrados por ficha: jogador só vê os cenários onde a própria ficha
// está em `participantes`; o Mestre vê todos. Só leitura por enquanto —
// os botões "Pegar" (item) e "Arrombar" (veículo) entram nas próximas
// fases do plano (Fase 3 e Fase 5). A edição do cenário em si (criar,
// adicionar participante/item/veículo) continua só no Gerenciador de
// Cenário (Fase 6), não aqui.
// ---------------------------------------------------------------------

// Em qual cenário o personagem/NPC atualmente carregado na tela está
// participando agora (ficha OU NPC, conforme estado.modoNpc) — usado pelo
// "Armar" de explosivo (ver plano-explosivos-cenario.txt, Fase 2) pra
// bloquear armar fora de cenário, e pra saber em qual nó
// cenarios/{id}/explosivos gravar. Mesmo critério de filtro usado em
// renderizarCenarios logo abaixo, só que sem depender de estado.isMestre —
// funciona tanto pro jogador quanto pro Mestre atuando como NPC.
export function cenarioAtualDoPersonagem() {
    const idAtual = estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId;
    const tipoAtual = estado.modoNpc ? "npc" : "ficha";
    if (!idAtual) return null;
    return estado.cenariosCache.find(c =>
        Object.values(c.participantes || {}).some(p => p.tipo === tipoAtual && p.refId === idAtual)
    ) || null;
}

// ---------------------------------------------------------------------
// Implantes/Próteses (Biomecânica) — Fase 3 do plano (ver
// plano-implantes-biomecanica.txt): achar quem pode ser alvo da
// cirurgia (instalar OU remover). Regra de ouro: ninguém opera a si
// mesmo — sempre precisa de um segundo personagem no MESMO cenário do
// instalador. Reusa cenarioAtualDoPersonagem() (acima) pra achar o
// cenário de quem vai USAR a Ferramenta de Criação Biomecânica; a
// partir daí, filtra os participantes tipo "ficha" (Mecânitos/NPC não
// têm implante — fora de escopo, ver plano) e, pra cada candidato,
// separa os implantes do inventário dele entre "pra instalar"
// (instalado:false) e "pra remover" (instalado:true). Só monta os
// dados — a UI que consome isso (modal Instalar/Remover) é a Fase 4,
// ainda não implementada.
// ---------------------------------------------------------------------

// Lista de candidatos a paciente: participantes tipo "ficha" do
// cenário atual do instalador, excluindo o próprio instalador (nunca
// em si mesmo — regra-chave do plano). Devolve [] se o instalador não
// está em nenhum cenário — a Fase 4 trata esse caso com um aviso,
// mesmo padrão já usado por Armar Explosivo/Usar Químico em área.
function candidatosCirurgiaImplante() {
    const cenario = cenarioAtualDoPersonagem();
    if (!cenario) return [];
    const idAtual = estado.modoNpc ? estado.npcAtualId : estado.fichaAtualId;
    const tipoAtual = estado.modoNpc ? "npc" : "ficha";
    return Object.values(cenario.participantes || {})
        .filter(p => p.tipo === "ficha" && !(tipoAtual === "ficha" && p.refId === idAtual));
}

// Implantes do paciente (fichaAlvoId), lidos via estado.todasAsFichasCache —
// não depende do paciente estar com a própria ficha aberta na tela.
// Separa em "paraInstalar" (instalado:false — candidatos ao gatilho de
// Instalar, Fase 4) e "paraRemover" (instalado:true — candidatos ao
// gatilho de Remover, Fase 7). Cada item sai com o `id` do inventário
// anexado (necessário pra Fase 4/7 gravarem qual implante a cirurgia
// afeta no payload da Ação Pendente).
function implantesDoPacienteParaCirurgia(fichaAlvoId) {
    const fichaAlvo = estado.todasAsFichasCache[fichaAlvoId];
    const inventario = (fichaAlvo && fichaAlvo.inventario) || {};
    const implantes = Object.entries(inventario)
        .filter(([, it]) => it && it.tag === "biomecanica" && it.implante)
        .map(([id, it]) => ({ id, ...it }));
    return {
        paraInstalar: implantes.filter(it => !it.implante.instalado),
        paraRemover: implantes.filter(it => it.implante.instalado)
    };
}

// Fase 10.1: contagem de implantes instalados vs. limite (nível do
// personagem) de UMA ficha qualquer (própria ou de outro personagem,
// lida via estado.todasAsFichasCache) — mesma conta da Fase 9.3
// (subtipoContaComoImplante: chip não ocupa vaga), só que reaproveitável
// pra checar o LIMITE de um paciente antes mesmo de abrir o select de
// implante no modal de Instalar (evita rolar Biomecânica pra descobrir
// só depois que não cabia). acimaDoLimite aqui é "sem vaga sobrando"
// (contam >= nivel), diferente do aviso vermelho da Fase 9.3 no próprio
// painel (que só acende quando já ultrapassou de fato, contam > nivel).
export function implantesContagemELimite(fichaObj) {
    const inventario = (fichaObj && fichaObj.inventario) || {};
    const contam = Object.values(inventario)
        .filter(it => it && it.tag === "biomecanica" && it.implante?.instalado && subtipoContaComoImplante(it.implante.subtipo))
        .length;
    const nivel = Number(fichaObj?.dados?.nivel) || 0;
    return { contam, nivel, semVaga: contam >= nivel };
}

// renderizarCenarios (aba "Cenário", exibição) e o estado de módulo
// dinheiroCenarioAbertoId que a acompanhava foram movidos pra
// abas/cenario.js no Passo 20 do plano de modularização. Ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt.

// Rola Dirigir Veículos (sem dificuldade — o RESULTADO bruto é que
// converte em pontos, ver pontosPorResultadoTesteFuga em regras.js) pro
// "Testar Dirigir Veículos" de uma perseguição ativa (Fase 7b do plano
// — ver plano-veiculos-fase2.txt, seção "FASE 7"). Se o bairro tiver
// penalidade pro perseguidor (manual: periferia/industrial dão -1),
// aplica em cima do modificador normal de Dirigir Veículos só quando
// `lado === "perseguidor"`. registrarPontosPerseguicao (mestre.js) já
// cuida de somar os pontos, marcar que este piloto agiu na volta e
// avançar a volta sozinho quando todo mundo já tiver agido.
export async function testarDirigirVeiculosPerseguicao(participanteId, lado) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    if (!tabelaPontuacaoFugaCadastrada()) {
        toast("Tabela de pontuação da perseguição ainda não cadastrada.", "erro");
        return;
    }

    const modificadoresPlanos = modificadoresAtuais();
    let modificador = modificadorDePericiaComPenalidade("Dirigir Veículos", estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual());

    const bairro = bairroPerseguicao(estado.perseguicaoAtivaCache.bairro);
    if (bairro && lado === "perseguidor") modificador += Number(bairro.penalidadePerseguidor) || 0;

    const resultado = await rolarComPossibilidadeDeOcasionais(`Perseguição — Testar Dirigir Veículos (volta ${estado.perseguicaoAtivaCache.voltaAtual || 1})`, "pericia:Dirigir Veículos", modificador, false, null);
    if (!resultado) return;

    const pontos = pontosPorResultadoTesteFuga(resultado.resultado);
    if (pontos === null) {
        toast(`Resultado ${resultado.resultado}, mas a tabela de pontuação ainda não tem faixas cadastradas — nenhum ponto aplicado.`, "erro");
        return;
    }

    try {
        await registrarPontosPerseguicao(participanteId, pontos, resultado.resultado);
        toast(`+${pontos} ponto(s) na perseguição (resultado ${resultado.resultado}).`, pontos > 0 ? "ok" : "erro");
    } catch (err) {
        console.error(err);
        toast(err && err.message ? err.message : "Falha ao registrar pontos na perseguição.", "erro");
    }
}

// "Tentar Rota de Fuga" (Fase 7c do plano — ver plano-veiculos-fase2.txt,
// seção "FASE 7"): abre mão da pontuação da volta (diferente de
// testarDirigirVeiculosPerseguicao acima) — testa Velocidade (atributo
// secundário do PERSONAGEM, já com o efeito do estado de saúde aplicado
// via aplicarEstadoSaudeVelocidade, igual ao resto da ficha) contra
// dificuldadeRotaFuga do bairro. Sucesso soma 1 em
// perseguicaoAtiva/rotasFuga/{lado} (registrarTentativaRotaFugaPerseguicao,
// mestre.js), que vencedorPerseguicao (regras.js) usa como -2 pontos pro
// lado adversário ao fim da corrida (Fase 7d, ainda não implementada).
// Não soma penalidadeTestesAtual() aqui — o efeito de saúde em Velocidade
// já é próprio (metade ou -2, ver aplicarEstadoSaudeVelocidade), somar os
// dois seria penalizar em dobro; a penalidade de Energia física continua
// se aplicando (teste físico) igual a executarManobraEsquivar.
export async function tentarRotaFugaPerseguicao(participanteId, lado) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const bairro = bairroPerseguicao(estado.perseguicaoAtivaCache.bairro);
    if (!bairroTemDificuldadeRotaFuga(bairro)) {
        toast("Dificuldade de rota de fuga ainda não cadastrada pra esse bairro.", "erro");
        return;
    }

    const modificadoresPlanos = modificadoresAtuais();
    const derivados = calcularDerivados(estado.fichaAtual.dados, modificadoresPlanos);
    const velocidadeAjustada = aplicarEstadoSaudeVelocidade(derivados.secundarios.velocidade, window._estadoSaudeAtual);
    let modificador = velocidadeAjustada.total + penalidadeEnergiaPara("fisica");
    if (lado === "perseguidor") modificador += Number(bairro.penalidadePerseguidor) || 0;

    const resultado = await rolarComPossibilidadeDeOcasionais(`Perseguição — Tentar Rota de Fuga (volta ${estado.perseguicaoAtivaCache.voltaAtual || 1})`, "secundario:velocidade", modificador, false, bairro.dificuldadeRotaFuga);
    if (!resultado) return;

    try {
        await registrarTentativaRotaFugaPerseguicao(participanteId, resultado.sucesso, resultado.resultado);
        toast(resultado.sucesso
            ? "Rota de fuga encontrada! Abriu mão da pontuação da volta — vale -2 pontos pro lado adversário no total final."
            : "Não encontrou uma rota de fuga desta vez — abriu mão da pontuação da volta mesmo assim.", resultado.sucesso ? "ok" : "erro");
    } catch (err) {
        console.error(err);
        toast(err && err.message ? err.message : "Falha ao registrar tentativa de rota de fuga.", "erro");
    }
}

// Pega um item solto de um cenário — passa pela fila de aprovação do
// Mestre (mesmo mecanismo de "dar_item", ver criarAcaoPendente/
// confirmarAcaoPendente em mestre.js e plano-cenario.txt, Fase 3).
export async function pegarItemCenario(cenarioId, itemId, itemNome) {
    if (!estado.fichaAtualId || estado.isMestre) return;
    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: "pegar_item_cenario",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer pegar "${itemNome}" do cenário.`,
        payload: { cenarioId, itemId, itemNome, fichaDestinoId: estado.fichaAtualId }
    });
    toast("Pedido pra pegar o item enviado ao Mestre.");
}

// Pega um valor específico de um saldo de dinheiro solto no cenário —
// mesma fila de aprovação do Mestre de pegarItemCenario acima, só que
// valida também o valor digitado (inteiro, > 0, <= saldo atual) antes
// de criar o pedido. A revalidação final (saldo pode ter mudado
// enquanto o pedido esperava aprovação) acontece de novo no Mestre, em
// confirmarAcaoPendente/"pegar_dinheiro_cenario".
export async function pegarDinheiroCenario(cenarioId, dinheiroId, dinheiroNome, valorMax, valorDigitado) {
    if (!estado.fichaAtualId || estado.isMestre) return;
    const valor = Math.floor(Number(valorDigitado));
    if (!valorDigitado || isNaN(valor) || valor <= 0) { toast("Digite um valor válido.", "erro"); return; }
    if (valor > valorMax) { toast(`Só tem ${valorMax} nesse saldo.`, "erro"); return; }
    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: "pegar_dinheiro_cenario",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer pegar ${valor} de "${dinheiroNome}" no cenário.`,
        payload: { cenarioId, dinheiroId, dinheiroNome, valor, fichaDestinoId: estado.fichaAtualId }
    });
    fecharCaixaPegarDinheiroCenario();
    renderizarCenarios();
    toast("Pedido pra pegar o dinheiro enviado ao Mestre.");
}

// Devolve um valor específico de um item de "Dinheiro" físico (ver
// transformar_dinheiro_item, mestre.js) pra algum saldo — mesma fila de
// aprovação, com a mesma validação client-side de pegarDinheiroCenario
// acima (inteiro, > 0, <= valor do item). Quem escolhe EM QUAL saldo o
// valor cai é o Mestre, na hora de confirmar (ver
// montarPainelAcoesPendentes), não aqui.
export async function depositarDinheiroItem(itemId, it, valorDigitado) {
    if (!estado.fichaAtualId || estado.isMestre) return;
    const valorMax = Number(it.saldoValor) || 0;
    const valor = Math.floor(Number(valorDigitado));
    if (!valorDigitado || isNaN(valor) || valor <= 0) { toast("Digite um valor válido.", "erro"); return; }
    if (valor > valorMax) { toast(`Esse item só tem ${valorMax}.`, "erro"); return; }
    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: "depositar_dinheiro_item",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer depositar ${valor} de "${it.nome}" num saldo.`,
        payload: { itemId, itemNome: it.nome, valor }
    });
    fecharCaixaDepositarDinheiroItem();
    renderizarInventario(modificadoresAtuais());
    toast("Pedido enviado ao Mestre.");
}
// "chave"): ação direta do jogador, sem passar pelo Mestre — destrancar
// exige ter a chave no inventário desta ficha (revalida aqui, não só
// no disabled do botão, porque o HTML pode estar desatualizado se dois
// dispositivos mexerem na ficha ao mesmo tempo).
export async function alternarTrancaVeiculo(veiculoId, trancar) {
    if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    if (!trancar && !veiculoTemChaveDisponivel(estado.fichaAtual, veiculoId)) {
        toast("Você não tem a chave deste veículo.", "erro");
        return;
    }
    await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { trancado: trancar });
    toast(trancar ? "Veículo trancado." : "Veículo destrancado.");
}

// Aplicar dano manual num veículo (Mestre) — Fase 2 do plano (ver
// plano-veiculos-fase2.txt): mesmo padrão da ferramenta de "Causar
// dano" do combate, endereçado por fichaId+veiculoId. causarDanoVeiculo
// (mestre.js) já grava pvAtual e deterioracoes no Firebase — o
// listener em tempo real (ativarSincronizacao) cuida de re-renderizar
// o card sozinho, então aqui só falta limpar o input e avisar no toast.
export async function aplicarDanoManualVeiculo(veiculoId, blocoDano) {
    if (!estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const inputValor = blocoDano.querySelector("[data-veiculo-dano-valor]");
    const selectAtributo = blocoDano.querySelector("[data-veiculo-dano-atributo]");
    const dano = Number(inputValor?.value) || 0;
    if (dano <= 0) { toast("Informe um valor de dano maior que zero.", "erro"); return; }
    try {
        const resultado = await causarDanoVeiculo(estado.fichaAtualId, veiculoId, dano, selectAtributo?.value || null);
        let nota = "";
        if (resultado.novosQuintosCruzados > 0) {
            const rotuloOutro = rotuloAtributoVeiculo(resultado.atributoDeteriorado);
            nota = ` ⚠️ Cruzou ${resultado.novosQuintosCruzados} quinto(s) do PV máximo — -1 Proteção e -1 ${rotuloOutro} aplicados (${resultado.novosQuintosCruzados}x cada).`;
        }
        toast(`${resultado.nomeVeiculo}: ${resultado.danoFinal} de dano (${dano} bruto, ${resultado.reducao} reduzido) — ${resultado.pvAtualDepois}/${resultado.pvMaximo} PV.${nota}`);
        if (inputValor) inputValor.value = "";
    } catch (e) {
        toast(e.message || "Erro ao aplicar dano no veículo.", "erro");
    }
}

// Pedido de pagamento de manutenção — reaproveita a mesma ação
// pendente "gastar_dinheiro" já tratada em confirmarAcaoPendente
// (mestre.js), sem nenhum código novo do lado do Mestre (ver
// plano-veiculos.txt, item 5/6).
export async function solicitarManutencaoVeiculo(veiculoId) {
    if (!estado.fichaAtual || !estado.fichaAtualId || estado.isMestre) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const saldos = todosOsSaldos(estado.fichaAtual);
    if (!saldos.length) { toast("Você não tem nenhum saldo cadastrado pra pagar a manutenção.", "erro"); return; }
    const card = el.veiculosLista.querySelector(`.veiculo-card[data-veiculo-id="${veiculoId}"]`);
    const saldoId = card?.querySelector("[data-veiculo-manutencao-origem]")?.value;
    const saldo = saldos.find(s => s.id === saldoId);
    if (!saldo) { toast("Escolha um saldo válido.", "erro"); return; }
    const valor = valorManutencaoVeiculo(v.atributos || {});
    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: "gastar_dinheiro",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} quer pagar a manutenção de "${v.nome}" (CN$ ${valor}, ${saldo.nome}).`,
        payload: { valor, saldoId }
    });
    toast("Pedido de pagamento de manutenção enviado ao Mestre.");
}

// =====================================================================
// REPARO E UPGRADE DE ATRIBUTO DO VEÍCULO — "ir ao mecânico" (manual
// pg. 38-39) — Fase 3 do plano (ver plano-veiculos-fase2.txt).
//
// Reaproveita o mesmo modelo de material do sistema de Receitas
// (materiaisAgregadosPorQualidade/planejarConsumoMaterial, ambos mais
// abaixo neste arquivo, na seção de Receitas) — o de veículo só não
// deixa o jogador escolher qual tier de qualidade usar (a tabela do
// manual, quando preenchida — ver CUSTOS_UPGRADE_VEICULO em
// dados-manual.js — só pede uma qualidade MÍNIMA opcional por
// material, não uma escolha manual): consome sempre o tier mais baixo
// que já qualifica primeiro, guardando material bom de troco.
// =====================================================================

// Todos os grupos de material (por qualidade) que QUALIFICAM pra um
// requisito de qualidade mínima — `qualidadeMinima` null/undefined
// aceita qualquer tier. Reaproveita materiaisAgregadosPorQualidade e
// qualidadesDoMaterial (ambas na seção de Receitas, mais abaixo neste
// arquivo — funções top-level, então já estão disponíveis aqui).
function gruposMaterialQualificadosVeiculo(materialNome, qualidadeMinima) {
    const grupos = materiaisAgregadosPorQualidade(materialNome);
    const qualidades = qualidadesDoMaterial(materialNome);
    if (!qualidadeMinima || !qualidades) return grupos;
    const idxMin = qualidades.indexOf(qualidadeMinima);
    return grupos.filter(g => {
        const idx = g.qualidade ? qualidades.indexOf(g.qualidade) : 0;
        return idx >= idxMin;
    });
}

function materialDisponivelVeiculo(materialNome, qualidadeMinima) {
    return gruposMaterialQualificadosVeiculo(materialNome, qualidadeMinima).reduce((soma, g) => soma + g.disponivel, 0);
}

// Devolve só os ingredientes de `materiais` (ver formato em
// CUSTOS_UPGRADE_VEICULO, dados-manual.js) que estão em falta no
// inventário da ficha atual, cada um com quanto falta.
function materiaisFaltantesVeiculo(materiais) {
    return (materiais || [])
        .map(m => ({ ...m, disponivel: materialDisponivelVeiculo(m.material, m.qualidade) }))
        .filter(m => m.disponivel < (Number(m.quantidade) || 0));
}

// Desconta de verdade os materiais do inventário (Firebase) — chamado
// só depois de já ter confirmado que nada falta (materiaisFaltantesVeiculo
// vazio). Consome o tier mais baixo que qualifica primeiro (troco de
// tiers melhores fica intacto), mesma mecânica de planejarConsumoMaterial
// já usada pelas Receitas.
async function consumirMateriaisVeiculo(materiais) {
    const atualizacoesInventario = {};
    (materiais || []).forEach(m => {
        // materiaisAgregadosPorQualidade devolve do tier mais alto pro
        // mais baixo — invertido aqui pra gastar o mais baixo primeiro.
        const grupos = [...gruposMaterialQualificadosVeiculo(m.material, m.qualidade)].reverse();
        const { atualizacoes } = planejarConsumoMaterial(grupos, Number(m.quantidade) || 0);
        Object.entries(atualizacoes).forEach(([id, valor]) => {
            atualizacoesInventario[id] = valor === null ? null : { ...fichaAtual.inventario[id], materialQuantidade: valor };
        });
    });
    if (!Object.keys(atualizacoesInventario).length) return;
    const payload = {};
    Object.entries(atualizacoesInventario).forEach(([id, valor]) => {
        estado.fichaAtual.inventario[id] = valor;
        if (valor === null) delete estado.fichaAtual.inventario[id];
        payload[id] = valor;
    });
    await update(ref(db, `${caminhoBase()}/inventario`), payload);
}

// Monta o texto de tooltip explicando por que o botão "Melhorar"/
// "Reparar" está desabilitado num atributo — usado tanto na renderização
// do card (renderizarVeiculos) quanto, defensivamente, dentro do modal
// de confirmação (o estado pode ter mudado entre abrir o card e clicar
// em confirmar).
export function motivoMecanicoVeiculoIndisponivel(custo, nivelKitNecessario, fichaAtualRef) {
    if (!custo) return "Custo ainda não cadastrado na tabela do manual (fale com o Mestre) — ver CUSTOS_UPGRADE_VEICULO em dados-manual.js.";
    if (!veiculoTemKitFerramentasSuficiente(fichaAtualRef, nivelKitNecessario)) {
        return `Precisa de um Kit de Ferramentas de Criação nível ${nivelKitNecessario}+ no inventário.`;
    }
    const faltando = materiaisFaltantesVeiculo(custo.materiais);
    if (faltando.length) {
        return `Faltam materiais: ${faltando.map(f => `${Math.max(0, (Number(f.quantidade) || 0) - f.disponivel)}x ${f.material}${f.qualidade ? ` (${f.qualidade}+)` : ""}`).join(", ")}.`;
    }
    return null;
}

// Modal de confirmação — mostra atributo, nível atual → alvo (upgrade)
// ou "restaura ao normal" (reparo), custo, materiais, dificuldade, e
// deixa escolher qual perícia rolar (Mecânica Automotiva ou Ofícios
// Utilitários — manual permite as duas, a critério do narrador, ver
// PERICIAS_MECANICO_VEICULO em dados-manual.js).
// Monta o texto de "Custo de referência" dos modais de Melhorar/Reparar
// veículo, aplicando o ajuste de preço da mesa (estado.fatorPrecoMateriaisVeiculoAtivo
// — configurarFatorPrecoMateriaisVeiculo) por cima do preço base do
// manual. Com fator 0 (padrão), mostra só o preço normal, igual sempre
// mostrou; com fator != 0, mostra o preço já ajustado e, entre
// parênteses, o base + percentual, pra ficar claro de onde veio o
// número. `textoMateriais` é a frase final que já existia (varia entre
// "SEU inventário" e sem isso, dependendo de quem tá consertando).
function textoCustoReferenciaVeiculo(precoBase, textoMateriais) {
    const fator = estado.fatorPrecoMateriaisVeiculoAtivo || 0;
    const precoFinal = precoVeiculoComFator(precoBase, fator);
    const sufixoAjuste = fator !== 0 ? ` (base CN$ ${precoBase} ${fator > 0 ? "+" : ""}${fator}%)` : "";
    return `Custo de referência: CN$ ${precoFinal}${sufixoAjuste} (narrador decide se cobra à parte — ${textoMateriais}).`;
}

export function abrirModalMecanicoVeiculo(veiculoId, atributoKey, modo) {
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const atributos = v.atributos || {};
    const nivelAtual = Number(atributos[atributoKey]) || 0;
    const nivelAlvo = modo === "upgrade" ? Math.min(5, nivelAtual + 1) : nivelAtual;

    const custo = modo === "upgrade" ? custoUpgradeVeiculo(atributoKey, nivelAlvo) : custoReparoVeiculo(atributoKey, nivelAtual);
    const nivelKitNecessario = Math.max(1, nivelAlvo);
    const dificuldade = dificuldadeUpgradeVeiculo(nivelAlvo);
    const motivoBloqueado = motivoMecanicoVeiculoIndisponivel(custo, nivelKitNecessario, estado.fichaAtual);

    let modal = document.getElementById("modal-mecanico-veiculo");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-mecanico-veiculo";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const materiaisHtml = (custo?.materiais || []).map(m => {
        const disponivel = materialDisponivelVeiculo(m.material, m.qualidade);
        const falta = disponivel < m.quantidade;
        return `<div class="receita-ingrediente-linha${falta ? " material-falta" : ""}">${m.quantidade}x ${escapeHtml(m.material)}${m.qualidade ? ` (${escapeHtml(m.qualidade)}+)` : ""} <span class="hint-inline">(tem ${disponivel})</span></div>`;
    }).join("") || (custo ? `<p class="hint">Essa entrada não pede materiais.</p>` : "");

    const periciasOpcoes = PERICIAS_MECANICO_VEICULO.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">${modo === "upgrade" ? "Melhorar" : "Reparar"} — ${escapeHtml(v.nome || "veículo")}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <h4>${escapeHtml(rotuloAtributoVeiculo(atributoKey))}${modo === "upgrade" ? ` — nível ${nivelAtual} → ${nivelAlvo}` : " — reparo (remove dano acumulado deste atributo)"}</h4>
        <p class="hint">Dificuldade do teste: ${dificuldade}. Kit de Ferramentas de Criação exigido: nível ${nivelKitNecessario}+.</p>
        ${custo ? `<p class="hint">${textoCustoReferenciaVeiculo(custo.preco, "os materiais abaixo são o que de fato é consumido")}</p>` : ""}
        <div id="mecanico-veiculo-materiais">${materiaisHtml}</div>
        ${motivoBloqueado ? `<p class="hint" style="color:var(--vermelho,#e05656);">${escapeHtml(motivoBloqueado)}</p>` : ""}
        <div class="modal-campo" style="margin-top:8px;">
            <label>Perícia a rolar</label>
            <select id="mecanico-veiculo-pericia">${periciasOpcoes}</select>
        </div>
        <div class="modal-btns">
            <button type="button" class="btn-lime" id="btn-confirmar-mecanico-veiculo" ${motivoBloqueado ? "disabled" : ""}>🎲 Rolar e ${modo === "upgrade" ? "Melhorar" : "Reparar"}</button>
        </div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    const btnConfirmar = modal.querySelector("#btn-confirmar-mecanico-veiculo");
    if (btnConfirmar && !motivoBloqueado) {
        btnConfirmar.addEventListener("click", async () => {
            const nomePericia = modal.querySelector("#mecanico-veiculo-pericia")?.value || PERICIAS_MECANICO_VEICULO[0];
            modal.remove();
            await resolverMecanicoVeiculo(veiculoId, atributoKey, modo, custo, dificuldade, nomePericia);
        });
    }
    document.body.appendChild(modal);
}

// Confirma o teste: gasta os materiais (sucesso ou falha — mesma regra
// padrão de craft já usada no resto do sistema, ver resolverCriacaoReceita),
// rola d20 + perícia contra a dificuldade (rolarERegistrar já cuida do
// Log de Dados, toast e trava de turno/ação de combate) e só em caso de
// SUCESSO aplica o efeito mecânico: sobe o nível do atributo (upgrade)
// ou zera as deteriorações daquele atributo + restaura o PV ao máximo
// (reparo — manual pg. 39: "some quando o veículo é consertado").
async function resolverMecanicoVeiculo(veiculoId, atributoKey, modo, custo, dificuldade, nomePericia) {
    if (!estado.fichaAtual || !estado.fichaAtualId || !custo) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;

    // Guarda de turno/ação ANTES de gastar qualquer material — se a
    // ação estiver bloqueada (fora do turno em combate com iniciativa,
    // por exemplo), não faz sentido já ter torrado o material. A mesma
    // checagem roda de novo dentro de rolarERegistrar (nada muda entre
    // as duas chamadas, então o resultado é sempre o mesmo).
    if (!checarConsumoDeAcao(false, false)) return;

    // Reconfere no exato momento de confirmar — o card pode ter mudado
    // desde que o modal abriu (outro consumo em paralelo, por exemplo).
    const faltando = materiaisFaltantesVeiculo(custo.materiais);
    if (faltando.length) {
        toast(`Faltam materiais: ${faltando.map(f => `${Math.max(0, (Number(f.quantidade) || 0) - f.disponivel)}x ${f.material}`).join(", ")}`, "erro");
        return;
    }

    const modificadoresPlanos = modificadoresAtuais();
    const modificador = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual());

    // Materiais são gastos ao confirmar, sucesso ou falha — mesma regra
    // padrão de craft do sistema (ver resolverCriacaoReceita).
    await consumirMateriaisVeiculo(custo.materiais);

    const rotuloAtributo = rotuloAtributoVeiculo(atributoKey);
    const nivelAtualBase = Number((v.atributos || {})[atributoKey]) || 0;
    const rotuloAcao = modo === "upgrade"
        ? `Melhorar veículo: ${rotuloAtributo} (nível ${Math.min(5, nivelAtualBase + 1)})`
        : `Reparar veículo: ${rotuloAtributo}`;

    const resultado = await rolarComPossibilidadeDeOcasionais(`${rotuloAcao} (${nomePericia})`, `pericia:${nomePericia}`, modificador, false, dificuldade);
    if (!resultado) return;

    if (!resultado.sucesso) {
        toast(`Falhou — os materiais já foram gastos, mas ${modo === "upgrade" ? "o atributo não subiu de nível." : "o veículo continua danificado."}`, "erro");
        return;
    }

    if (modo === "upgrade") {
        const novoNivel = Math.min(5, nivelAtualBase + 1);
        await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}/atributos`), { [atributoKey]: novoNivel });
        toast(`✅ ${rotuloAtributo} subiu para o nível ${novoNivel}!`, "critico-acerto");
    } else {
        const deterioracoesRestantes = zerarDeterioracoesDoAtributoVeiculo(v.deterioracoes || [], atributoKey);
        await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), {
            deterioracoes: deterioracoesRestantes,
            pvAtual: null
        });
        toast(`✅ ${rotuloAtributo} reparado — dano acumulado removido.`, "critico-acerto");
    }
}

// ---------------------------------------------------------------------
// Reparo/Melhoria de veículo de OUTRO jogador (Fase 6 do plano — ver
// plano-veiculos-fase2.txt, seção "FASE 6"): variante de
// abrirModalMecanicoVeiculo/resolverMecanicoVeiculo (Fase 3) acima.
// Diferenças:
//   - o veículo de outro dono não aparece com o grid de atributos na
//     aba Cenário, então o próprio modal ganha um seletor de atributo
//     (Reparar: só os deteriorados; Melhorar: os 5, mostrando o nível
//     atual de cada um);
//   - quem gasta material e rola a perícia é sempre a ficha ATUANTE
//     (estado.fichaAtual, "mão de obra") — os helpers reaproveitados
//     (materiaisFaltantesVeiculo, consumirMateriaisVeiculo,
//     motivoMecanicoVeiculoIndisponivel...) já operam sobre estado.fichaAtual
//     por baixo, então funcionam sem alteração nenhuma aqui;
//   - em caso de SUCESSO não grava direto (o veículo não é seu): cria
//     uma acaoPendente ("melhorar_veiculo_terceiro" /
//     "reparar_veiculo_terceiro") pro Mestre confirmar — ver
//     criarAcaoPendente/confirmarAcaoPendente em mestre.js, que já sabe
//     tratar os dois tipos;
//   - falha: mesmo comportamento de sempre (material já foi gasto,
//     nada mais acontece, sem pendência).
// ---------------------------------------------------------------------
export function abrirModalMecanicoVeiculoTerceiro(fichaAlvoId, veiculoId, veiculoNomeFallback, modo) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const fichaAlvo = estado.todasAsFichasCache[fichaAlvoId];
    const vAlvo = fichaAlvo && fichaAlvo.veiculos && fichaAlvo.veiculos[veiculoId];
    if (!vAlvo) { toast("Esse veículo não existe mais.", "erro"); return; }

    const atributosAlvo = vAlvo.atributos || {};
    const deterioracoesAlvo = vAlvo.deterioracoes || [];
    const atributosDeteriorados = new Set((deterioracoesAlvo || []).filter(d => d && d.valor > 0).map(d => d.atributo));
    const nomeVeiculo = vAlvo.nome || veiculoNomeFallback || "veículo";

    // Reparar sem nada deteriorado não faz sentido — nem abre o modal.
    const opcoesAtributo = modo === "upgrade" ? ATRIBUTOS_VEICULO : ATRIBUTOS_VEICULO.filter(chave => atributosDeteriorados.has(chave));
    if (!opcoesAtributo.length) {
        toast(`"${nomeVeiculo}" não tem dano acumulado pra reparar.`, "erro");
        return;
    }

    let modal = document.getElementById("modal-mecanico-veiculo-terceiro");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-mecanico-veiculo-terceiro";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    // Redesenha o conteúdo do modal quando o atributo escolhido no
    // seletor muda (custo/dificuldade/materiais são por atributo).
    const renderizarConteudo = (atributoKey) => {
        const nivelAtual = Number(atributosAlvo[atributoKey]) || 0;
        const nivelAlvo = modo === "upgrade" ? Math.min(5, nivelAtual + 1) : nivelAtual;
        const custo = modo === "upgrade" ? custoUpgradeVeiculo(atributoKey, nivelAlvo) : custoReparoVeiculo(atributoKey, nivelAtual);
        const nivelKitNecessario = Math.max(1, nivelAlvo);
        const dificuldade = dificuldadeUpgradeVeiculo(nivelAlvo);
        const motivoBloqueado = motivoMecanicoVeiculoIndisponivel(custo, nivelKitNecessario, estado.fichaAtual);

        const materiaisHtml = (custo?.materiais || []).map(m => {
            const disponivel = materialDisponivelVeiculo(m.material, m.qualidade);
            const falta = disponivel < m.quantidade;
            return `<div class="receita-ingrediente-linha${falta ? " material-falta" : ""}">${m.quantidade}x ${escapeHtml(m.material)}${m.qualidade ? ` (${escapeHtml(m.qualidade)}+)` : ""} <span class="hint-inline">(tem ${disponivel})</span></div>`;
        }).join("") || (custo ? `<p class="hint">Essa entrada não pede materiais.</p>` : "");

        const periciasOpcoes = PERICIAS_MECANICO_VEICULO.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join("");
        const atributoOpcoes = opcoesAtributo.map(chave => `<option value="${chave}" ${chave === atributoKey ? "selected" : ""}>${escapeHtml(rotuloAtributoVeiculo(chave))}${modo === "upgrade" ? ` (nível ${Number(atributosAlvo[chave]) || 0})` : ""}</option>`).join("");

        modal.innerHTML = `
            <div class="combate-painel-topo">
                <span class="eyebrow">${modo === "upgrade" ? "Melhorar" : "Reparar"} — ${escapeHtml(nomeVeiculo)} <span class="hint-inline">(veículo de terceiro)</span></span>
                <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
            </div>
            <div class="modal-campo">
                <label>Atributo</label>
                <select id="mecanico-veiculo-terceiro-atributo">${atributoOpcoes}</select>
            </div>
            <h4>${escapeHtml(rotuloAtributoVeiculo(atributoKey))}${modo === "upgrade" ? ` — nível ${nivelAtual} → ${nivelAlvo}` : " — reparo (remove dano acumulado deste atributo)"}</h4>
            <p class="hint">Dificuldade do teste: ${dificuldade}. Kit de Ferramentas de Criação exigido: nível ${nivelKitNecessario}+.</p>
            ${custo ? `<p class="hint">${textoCustoReferenciaVeiculo(custo.preco, "os materiais abaixo são o que de fato é consumido do SEU inventário")}</p>` : ""}
            <div id="mecanico-veiculo-terceiro-materiais">${materiaisHtml}</div>
            ${motivoBloqueado ? `<p class="hint" style="color:var(--vermelho,#e05656);">${escapeHtml(motivoBloqueado)}</p>` : ""}
            <div class="modal-campo" style="margin-top:8px;">
                <label>Perícia a rolar</label>
                <select id="mecanico-veiculo-terceiro-pericia">${periciasOpcoes}</select>
            </div>
            <p class="hint">O veículo não é seu — em caso de sucesso, o efeito vira um pedido pro Mestre confirmar antes de valer.</p>
            <div class="modal-btns">
                <button type="button" class="btn-lime" id="btn-confirmar-mecanico-veiculo-terceiro" ${motivoBloqueado ? "disabled" : ""}>🎲 Rolar e ${modo === "upgrade" ? "Melhorar" : "Reparar"}</button>
            </div>
        `;
        modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
        modal.querySelector("#mecanico-veiculo-terceiro-atributo").addEventListener("change", (e) => renderizarConteudo(e.target.value));
        const btnConfirmar = modal.querySelector("#btn-confirmar-mecanico-veiculo-terceiro");
        if (btnConfirmar && !motivoBloqueado) {
            btnConfirmar.addEventListener("click", async () => {
                const nomePericia = modal.querySelector("#mecanico-veiculo-terceiro-pericia")?.value || PERICIAS_MECANICO_VEICULO[0];
                modal.remove();
                await resolverMecanicoVeiculoTerceiro(fichaAlvoId, veiculoId, nomeVeiculo, atributoKey, modo, custo, dificuldade, nomePericia);
            });
        }
    };

    renderizarConteudo(opcoesAtributo[0]);
    document.body.appendChild(modal);
}

// Confirma o teste: mesma regra padrão de craft do sistema (material
// gasto sempre, sucesso ou falha) e mesma rolagem d20 + perícia contra
// a dificuldade de resolverMecanicoVeiculo (Fase 3) — a diferença toda
// está em NÃO aplicar o efeito direto no sucesso, e sim empurrar pra
// fila do Mestre (ver comentário da seção acima).
async function resolverMecanicoVeiculoTerceiro(fichaAlvoId, veiculoId, veiculoNome, atributoKey, modo, custo, dificuldade, nomePericia) {
    if (!estado.fichaAtual || !estado.fichaAtualId || !custo) return;

    if (!checarConsumoDeAcao(false, false)) return;

    const faltando = materiaisFaltantesVeiculo(custo.materiais);
    if (faltando.length) {
        toast(`Faltam materiais: ${faltando.map(f => `${Math.max(0, (Number(f.quantidade) || 0) - f.disponivel)}x ${f.material}`).join(", ")}`, "erro");
        return;
    }

    const modificadoresPlanos = modificadoresAtuais();
    const modificador = modificadorDePericiaComPenalidade(nomePericia, estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual());

    // Materiais são gastos do inventário de quem está atuando
    // (estado.fichaAtual), sucesso ou falha — mesma regra padrão de craft.
    await consumirMateriaisVeiculo(custo.materiais);

    const rotuloAtributo = rotuloAtributoVeiculo(atributoKey);
    const rotuloAcao = modo === "upgrade"
        ? `Melhorar veículo de terceiro: "${veiculoNome}" — ${rotuloAtributo}`
        : `Reparar veículo de terceiro: "${veiculoNome}" — ${rotuloAtributo}`;

    const resultado = await rolarComPossibilidadeDeOcasionais(`${rotuloAcao} (${nomePericia})`, `pericia:${nomePericia}`, modificador, false, dificuldade);
    if (!resultado) return;

    if (!resultado.sucesso) {
        toast(`Falhou — os materiais já foram gastos, mas "${veiculoNome}" continua como estava.`, "erro");
        return;
    }

    const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
    await criarAcaoPendente({
        tipo: modo === "upgrade" ? "melhorar_veiculo_terceiro" : "reparar_veiculo_terceiro",
        fichaId: estado.fichaAtualId,
        nomeJogador,
        detalhe: `${nomeJogador} ${modo === "upgrade" ? "melhorou" : "reparou"} "${veiculoNome}" (${rotuloAtributo}) com sucesso — aguardando confirmação do Mestre.`,
        payload: { fichaAlvoId, veiculoId, atributoKey, veiculoNome }
    });
    toast(`✅ Sucesso! Pedido enviado ao Mestre pra aplicar em "${veiculoNome}".`, "critico-acerto");
}

// =====================================================================
// MANOBRAS DE VEÍCULO (manual pg. 41) — Fase 4 do plano (ver
// plano-veiculos-fase2.txt, seção "FASE 4"). Catálogo em
// MANOBRAS_VEICULO (dados-manual.js); requisitos/efeito automático em
// veiculoAtendeRequisitosManobra/resolverEfeitoManobra (regras.js).
// =====================================================================

// Mestre limpa os bônus temporários de manobra ("por uma cena") do
// veículo — sem cron job, mesmo espírito simples de outros bônus "por
// uma cena" do sistema (ver comentário em bonusBadgeHtml acima).
export async function limparBonusTemporariosVeiculo(veiculoId) {
    if (!estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { bonusTemporarios: [] });
    toast(`Bônus temporários de "${v.nome || "veículo"}" limpos.`);
}

// Abre o modal com o catálogo das 8 manobras (MANOBRAS_VEICULO),
// mostrando pra cada uma requisitos/dificuldade e se o veículo atende
// (cinza + tooltip com o que falta, senão). Manobras com `dificuldade`
// null (Cavalo de Pau, Drift, Retorno — o manual não fixa um valor)
// ganham um campo numérico pra digitar a dificuldade combinada na mesa
// antes de liberar o botão de rolar.
// `perseguicaoContext` ({ participanteId, lado }), quando informado
// (Fase 7d — ver botão "🏁 Manobra" dentro do bloco "Perseguição em
// andamento" em renderizarCenarios), sinaliza que esta rolagem de
// Manobra está substituindo o "Testar Dirigir Veículos" da volta atual
// — o resultado vira pontuação da perseguição (registrarPontosPerseguicao)
// além do efeito mecânico normal da manobra, ver resolverManobraVeiculo.
export function abrirModalManobraVeiculo(veiculoId, perseguicaoContext = null) {
    if (estado.isMestre || !estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const atributos = v.atributos || {};
    const deterioracoes = v.deterioracoes || [];
    const bonusTemporarios = v.bonusTemporarios || [];

    let modal = document.getElementById("modal-manobra-veiculo");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-manobra-veiculo";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const linhasHtml = MANOBRAS_VEICULO.map(m => {
        const check = veiculoAtendeRequisitosManobra(atributos, deterioracoes, bonusTemporarios, m);
        const requisitosTexto = Object.entries(m.requisitos || {})
            .map(([chave, minimo]) => `${rotuloAtributoVeiculo(chave)} ${minimo}`)
            .join(", ");
        const faltandoTexto = check.faltando
            .map(f => `${rotuloAtributoVeiculo(f.atributo)} ${f.atual}/${f.necessario}`)
            .join(", ");
        const dificuldadeCampoHtml = m.dificuldade === null
            ? `<input type="number" class="veiculo-manobra-dificuldade-input" data-manobra-dificuldade min="1" step="1" placeholder="Dificuldade (combine com o Mestre)">`
            : `<span class="hint-inline">Dificuldade ${m.dificuldade}</span>`;
        return `
            <div class="veiculo-manobra-linha${check.atende ? "" : " desabilitada"}" data-manobra-chave="${m.chave}">
                <div class="veiculo-manobra-linha-topo">
                    <strong>${escapeHtml(m.nome)}</strong>
                    <span class="hint-inline">Turnos: ${escapeHtml(m.turnos)}</span>
                </div>
                <p class="hint">${escapeHtml(m.descricao)}</p>
                <p class="hint-inline">Requisitos: ${escapeHtml(requisitosTexto)}${m.requisitoExtra ? ` · ⚠️ ${escapeHtml(m.requisitoExtra)}` : ""}</p>
                ${!check.atende ? `<p class="hint" style="color:var(--vermelho,#e05656);">Faltando: ${escapeHtml(faltandoTexto)}</p>` : ""}
                <div class="veiculo-manobra-linha-acoes">
                    ${dificuldadeCampoHtml}
                    <button type="button" class="btn-lime veiculo-manobra-rolar-btn" data-manobra-rolar ${check.atende ? "" : "disabled"}>🎲 Rolar Dirigir Veículos</button>
                </div>
            </div>
        `;
    }).join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Manobra — ${escapeHtml(v.nome || "veículo")}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">${perseguicaoContext
            ? "Escolha uma manobra e role Dirigir Veículos contra a dificuldade indicada. Esta rolagem está substituindo o \"Testar Dirigir Veículos\" da volta atual — além do efeito mecânico da manobra, o resultado também vira pontuação na Corrida/Perseguição."
            : "Escolha uma manobra e role Dirigir Veículos contra a dificuldade indicada. Sem uma Corrida/Perseguição formal em andamento, é uma rolagem livre — o efeito mecânico ainda se aplica, mas não conta pontuação."}</p>
        <div class="veiculo-manobra-lista">${linhasHtml}</div>
    `;
    modal.querySelector(".combate-fechar").addEventListener("click", () => modal.remove());
    modal.querySelectorAll("[data-manobra-rolar]:not([disabled])").forEach(btn => {
        btn.addEventListener("click", async () => {
            const linha = btn.closest("[data-manobra-chave]");
            const chave = linha.dataset.manobraChave;
            const manobra = buscarManobraVeiculo(chave);
            let dificuldade = manobra.dificuldade;
            if (dificuldade === null) {
                const input = linha.querySelector("[data-manobra-dificuldade]");
                dificuldade = Number(input?.value);
                if (!Number.isFinite(dificuldade) || dificuldade <= 0) {
                    toast("Digite a dificuldade combinada com o Mestre antes de rolar.", "erro");
                    return;
                }
            }
            modal.remove();
            await resolverManobraVeiculo(veiculoId, chave, dificuldade, perseguicaoContext);
        });
    });
    document.body.appendChild(modal);
}

// Rola Dirigir Veículos contra a dificuldade da manobra (rolarERegistrar
// já cuida do Log de Dados, toast de sucesso/falha e trava de turno/
// ação de combate) e aplica o efeito mecânico automático, se a manobra
// tiver um (resolverEfeitoManobra, regras.js — hoje só Cavalo de Pau e
// Drift): dano vai direto pro veículo do PRÓPRIO piloto (mesma regra
// "1/10 ou 1/3 do total de PV", sem redução de Proteção por cima — ver
// comentário de aplicarDanoVeiculo/pularReducao), bônus vira uma nova
// entrada em bonusTemporarios. As demais manobras só mostram o texto
// do efeito (Grau, Corredor, Arranque(Comum), Totozinho, Retorno) —
// ver comentário de MANOBRAS_VEICULO (dados-manual.js) sobre por que
// elas não têm efeito automatizável.
//
// `perseguicaoContext` ({ participanteId, lado }) — Fase 7d: quando
// informado (manobra rolada de dentro do bloco "Perseguição em
// andamento"), soma a penalidadePerseguidor do bairro no modificador
// (mesma regra de testarDirigirVeiculosPerseguicao) e, depois de
// aplicar o efeito mecânico normal, também converte o resultado bruto
// em pontos (pontosPorResultadoTesteFuga, igual ao teste padrão) e
// registra via registrarPontosPerseguicao — a manobra passa a VALER
// como a ação da volta, no lugar de "Testar Dirigir Veículos".
async function resolverManobraVeiculo(veiculoId, manobraChave, dificuldade, perseguicaoContext = null) {
    if (!estado.fichaAtual || !estado.fichaAtualId) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const manobra = buscarManobraVeiculo(manobraChave);
    if (!manobra) return;

    const modificadoresPlanos = modificadoresAtuais();
    let modificador = modificadorDePericiaComPenalidade("Dirigir Veículos", estado.fichaAtual.dados, estado.fichaAtual.pericias, modificadoresPlanos, penalidadeTestesAtual());

    let bairroPerseguicaoAtual = null;
    if (perseguicaoContext) {
        bairroPerseguicaoAtual = bairroPerseguicao(estado.perseguicaoAtivaCache.bairro);
        if (bairroPerseguicaoAtual && perseguicaoContext.lado === "perseguidor") {
            modificador += Number(bairroPerseguicaoAtual.penalidadePerseguidor) || 0;
        }
    }

    const resultado = await rolarComPossibilidadeDeOcasionais(`Manobra: ${manobra.nome} (Dirigir Veículos)${perseguicaoContext ? ` — Perseguição, volta ${estado.perseguicaoAtivaCache.voltaAtual || 1}` : ""}`, "pericia:Dirigir Veículos", modificador, false, dificuldade);
    if (!resultado) return;

    const textoEfeito = resultado.criticoNegativo && manobra.efeitoFalhaCritica
        ? manobra.efeitoFalhaCritica
        : (resultado.sucesso ? manobra.efeitoSucesso : (manobra.efeitoFalha || manobra.efeitoFalhaCritica || ""));

    const efeito = resolverEfeitoManobra(manobra, resultado);
    if (efeito.tipo === "dano") {
        const atributosAtuais = v.atributos || {};
        const deterioracoesAtuais = v.deterioracoes || [];
        const bonusAtuais = v.bonusTemporarios || [];
        const protecaoEfetiva = atributoEfetivoVeiculo("protecao", atributosAtuais, deterioracoesAtuais, bonusAtuais);
        const pvMaximo = pvMaxVeiculo(protecaoEfetiva);
        const danoValor = Math.floor((Number(efeito.fracaoDano) || 0) * pvMaximo);
        const resultadoDano = aplicarDanoVeiculo(v, danoValor, null, true);
        await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), {
            pvAtual: resultadoDano.pvAtualDepois,
            deterioracoes: resultadoDano.deterioracoesResultantes
        });
        let notaDeterioracao = "";
        if (resultadoDano.novosQuintosCruzados > 0) {
            notaDeterioracao = ` ⚠️ Cruzou ${resultadoDano.novosQuintosCruzados} quinto(s) do PV máximo — -1 Proteção e -1 ${rotuloAtributoVeiculo(resultadoDano.atributoDeteriorado)} aplicados.`;
        }
        toast(`${textoEfeito} (${danoValor} de dano — ${resultadoDano.pvAtualDepois}/${resultadoDano.pvMaximo} PV).${notaDeterioracao}`, resultado.sucesso ? "ok" : "erro");
    } else if (efeito.tipo === "bonusTemporario") {
        const novoBonus = { atributo: efeito.atributo, valor: Number(efeito.valor) || 0, motivo: manobra.nome, criadoEm: Date.now() };
        const bonusAtuais = v.bonusTemporarios || [];
        await update(ref(db, `${caminhoBase()}/veiculos/${veiculoId}`), { bonusTemporarios: [...bonusAtuais, novoBonus] });
        toast(`${textoEfeito}`, "critico-acerto");
    } else {
        toast(textoEfeito || `Manobra "${manobra.nome}" resolvida.`, resultado.sucesso ? "ok" : "erro");
    }

    // Fase 7d: além do efeito mecânico acima, converte o resultado em
    // pontuação da volta quando a manobra foi rolada dentro de uma
    // perseguição ativa.
    if (perseguicaoContext) {
        if (!tabelaPontuacaoFugaCadastrada()) {
            toast("Manobra resolvida, mas a tabela de pontuação da perseguição ainda não está cadastrada — nenhum ponto de corrida aplicado.", "erro");
            return;
        }
        const pontos = pontosPorResultadoTesteFuga(resultado.resultado);
        if (pontos === null) {
            toast(`Manobra resolvida (resultado ${resultado.resultado}), mas a tabela de pontuação ainda não tem faixas cadastradas — nenhum ponto de corrida aplicado.`, "erro");
            return;
        }
        try {
            await registrarPontosPerseguicao(perseguicaoContext.participanteId, pontos, resultado.resultado, `Manobra: ${manobra.nome}`);
            toast(`+${pontos} ponto(s) na perseguição (Manobra: ${manobra.nome}, resultado ${resultado.resultado}).`, pontos > 0 ? "ok" : "erro");
        } catch (err) {
            console.error(err);
            toast(err && err.message ? err.message : "Falha ao registrar pontos da manobra na perseguição.", "erro");
        }
    }
}

// ---------------------------------------------------------------------
// VANTAGENS / DESVANTAGENS / FATOS UNIVERSAIS
// ---------------------------------------------------------------------
// Ver abas/vantagens-desvantagens.js.

export function resumoModificadores(entidade) {
    const mods = entidade.modificadores || [];
    if (!mods.length) return "";
    return mods.map(m => `${rotuloAlvo(m.alvo)} ${m.valor >= 0 ? "+" : ""}${m.valor}${m.ocasional ? " (ocasião especial)" : ""}`).join(" · ");
}

// ---------------------------------------------------------------------
// ESPECIALIZAÇÕES
// ---------------------------------------------------------------------
// Ver abas/especializacoes.js.

// ---------------------------------------------------------------------
// VÍCIOS / ABSTINÊNCIA (manual, cap. Drogas)
// ---------------------------------------------------------------------
// Um vício NÃO é mais uma aba própria — é a Desvantagem "Vício" (ver
// campo Substância no modal, mostrado quando o Nome contém "vício";
// configurarCampoSubstanciaVicio mais abaixo) com um campo extra
// `substancia` (qual droga) e `diaIndiceUltimoUso` (contagem de dias do
// calendário da mesa, pra calcular abstinência — ver
// calcularAbstinenciaVicio em regras.js). Achar a desvantagem certa pra
// uma droga usa comparação de texto simples (case-insensitive, ignora
// acento) — é assim que o botão "Consumir" (ver mais abaixo) sabe qual
// vício "curar" quando o personagem usa a droga de novo.
export function normalizarTextoBusca(s) {
    return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function encontrarDesvantagemVicioPara(substancia) {
    const alvo = normalizarTextoBusca(substancia);
    if (!alvo) return null;
    const desvantagens = estado.fichaAtual.desvantagens || {};
    const idEncontrado = Object.keys(desvantagens).find(id => normalizarTextoBusca(desvantagens[id].substancia) === alvo);
    return idEncontrado || null;
}

// Mostra/esconde o campo "Substância" no modal de Desvantagem, conforme
// o Nome digitado contém "vício"/"vicio" — e preenche o datalist com o
// catálogo do manual, pra sugerir só (não trava em texto livre, porque
// mesa pode ter droga homebrew).
// Ver configurarCampoSubstanciaVicio em abas/especializacoes.js.

// ---------------------------------------------------------------------
// DESPACHANTE DE EFEITOS QUÍMICOS (it.quimico.efeitos) — Parte 8, item 5
// do plano-automacao-materiais-quimicos-v3. Percorre o array gerado por
// resolverNivelMaterial (dados-manual.js, um item por material com
// pontos > 0 na receita, cada um já com sua `mecanica` resolvida — nível
// + pontos extra + eficiência aumentada) e dispara os wrappers do motor
// de status por turno (mestre.js) correspondentes, quando possível.
//
// Chamado por consumirDroga (autoconsumo) e pelo painel "Aplicar Efeito
// Químico" (área/cenário) — sempre ALÉM do que esses dois fluxos já
// fazem com efeitosDrogas/modificadores livres, nunca no lugar.
//
// Retorna { modificadoresExtras, notas }:
// - modificadoresExtras: penalidadeTemporizada com turnos:"duracaoGeral"
//   não tem contagem de turno própria — vira modificador comum
//   ({alvo, valor}), pra somar na MESMA lista que efeitosDrogas já grava
//   (hora-a-hora, resolvida por calcularModificadoresDrogasAtivas).
// - notas: avisos pro Mestre sobre tudo que não dá pra automatizar
//   (alvo fora de combate, escolha humana do Bioquímico, exceções
//   narrativas do manual) — pra mostrar como toast/log.
// ---------------------------------------------------------------------

// penalidadeTemporizada isolada — usada tanto direto (mecanica.
// penalidadeTemporizada) quanto dentro de testeImediato.seFalhar.
async function despacharPenalidadeTemporizada(pt, origemLabel, participanteId, modificadoresExtras, notas) {
    const alvos = Array.isArray(pt.alvos) ? pt.alvos : [pt.alvos];
    if (pt.turnos === "duracaoGeral") {
        alvos.forEach(alvo => modificadoresExtras.push({ alvo, valor: pt.valor }));
        notas.push(`${origemLabel}: penalidade de ${pt.valor} em ${alvos.join(", ")} incorporada ao efeito (duração geral, hora-a-hora).`);
    } else if (participanteId) {
        await aplicarPenalidadeTemporizada(participanteId, alvos, pt.valor, pt.turnos, origemLabel);
        notas.push(`${origemLabel}: penalidade de ${pt.valor} em ${alvos.join(", ")} por ${pt.turnos} turno(s) aplicada.`);
    } else {
        notas.push(`${origemLabel}: penalidade de ${pt.valor} em ${alvos.join(", ")} por ${pt.turnos} turno(s) — alvo fora do combate ativo, aplique manualmente.`);
    }
}

// testeImediato — resolvido NA HORA (d20 + perícia do alvo, sem
// depender de combate). Falha aplica a(s) consequência(s) de seFalhar
// direto pelos wrappers certos, quando participanteId existe;
// desmaioIndefinido/flagNarrativa/depoisFlag são sempre nota manual
// (exceções do manual, Parte 5.2 do plano).
async function despacharTesteImediato(ti, origemLabel, alvoTipo, alvoId, participanteId, modificadoresExtras, notas) {
    const bruto = rolarD20();
    const modAlvo = await buscarValorPericiaAlvo(alvoTipo, alvoId, ti.pericia);
    const resultado = bruto + modAlvo;
    const sucesso = resultado >= ti.dificuldade;
    if (sucesso) {
        notas.push(`${origemLabel}: teste de ${ti.pericia} (dif ${ti.dificuldade}): d20 (${bruto}) ${modAlvo >= 0 ? "+" : ""}${modAlvo} = ${resultado} — RESISTIU.`);
        return;
    }
    notas.push(`${origemLabel}: teste de ${ti.pericia} (dif ${ti.dificuldade}): d20 (${bruto}) ${modAlvo >= 0 ? "+" : ""}${modAlvo} = ${resultado} — FALHOU.`);
    const seFalhar = ti.seFalhar || {};
    for (const [chave, valor] of Object.entries(seFalhar)) {
        if (chave === "desmaioTemporizado") {
            if (participanteId) {
                await aplicarDesmaioTemporizado(participanteId, valor.turnos, origemLabel);
                notas.push(`${origemLabel}: desmaiado por ${valor.turnos} turno(s).`);
            } else {
                notas.push(`${origemLabel}: deveria desmaiar por ${valor.turnos} turno(s) — alvo fora do combate ativo, aplique manualmente.`);
            }
        } else if (chave === "perdeAcaoTemporizado") {
            if (participanteId) {
                await aplicarPerdaAcaoTemporizada(participanteId, valor.turnos, origemLabel);
                notas.push(`${origemLabel}: perde 1 ação por turno durante ${valor.turnos} turno(s).`);
            } else {
                notas.push(`${origemLabel}: deveria perder 1 ação por turno durante ${valor.turnos} turno(s) — alvo fora do combate ativo, aplique manualmente.`);
            }
        } else if (chave === "penalidadeTemporizada") {
            await despacharPenalidadeTemporizada(valor, origemLabel, participanteId, modificadoresExtras, notas);
        } else if (chave === "desmaioIndefinido") {
            notas.push(`${origemLabel}: desmaio INDEFINIDO até tratamento médico especializado — sem timer automático, aplique manualmente.`);
        } else if (chave === "flagNarrativa") {
            notas.push(`${origemLabel}: ${valor} — nota narrativa, sem automação.`);
        } else if (chave === "depoisFlag") {
            const alvosFlag = Array.isArray(valor.alvos) ? valor.alvos.join(", ") : "";
            notas.push(`${origemLabel}: efeito posterior — ${valor.valor} em ${alvosFlag}${valor.ateFimDeCena ? " até o fim da cena" : ""} — nota narrativa/manual.`);
        } else {
            notas.push(`${origemLabel}: consequência "${chave}" não reconhecida pelo despachante — revise manualmente.`);
        }
    }
}

// testeAtrasado — precisa de participanteId (agenda via
// aplicarTesteAtrasado). O motor de mestre.js só aceita UMA
// consequência estrutural encadeável automaticamente (ver
// processarStatusInicioTurno); o resto do seFalhar vira nota registrada
// já no momento do disparo, não quando o teste eventualmente resolver.
async function despacharTesteAtrasado(ta, origemLabel, participanteId, notas) {
    if (!participanteId) {
        notas.push(`${origemLabel}: teste de ${ta.pericia} (dif ${ta.dificuldade}) após ${ta.turnos} turno(s) — alvo fora do combate ativo, sem contagem automática possível, acompanhe manualmente.`);
        return;
    }
    const seFalhar = ta.seFalhar || {};
    let statusEncadeavel = null;
    let chaveUsada = null;
    if (seFalhar.desmaioTemporizado) {
        statusEncadeavel = { tipo: "desmaio_temporizado", label: "Desmaiado", turnosRestantes: seFalhar.desmaioTemporizado.turnos, origem: origemLabel };
        chaveUsada = "desmaioTemporizado";
    } else if (seFalhar.perdeAcaoTemporizado) {
        statusEncadeavel = { tipo: "perde_acao_temporizado", label: "Perda de ação (efeito psicotrópico)", turnosRestantes: seFalhar.perdeAcaoTemporizado.turnos, origem: origemLabel };
        chaveUsada = "perdeAcaoTemporizado";
    } else if (seFalhar.penalidadeTemporizada && seFalhar.penalidadeTemporizada.turnos !== "duracaoGeral") {
        const pt = seFalhar.penalidadeTemporizada;
        statusEncadeavel = { tipo: "penalidade_temporizada", label: origemLabel, turnosRestantes: pt.turnos, alvos: Array.isArray(pt.alvos) ? pt.alvos : [pt.alvos], valor: pt.valor, origem: origemLabel };
        chaveUsada = "penalidadeTemporizada";
    }

    await aplicarTesteAtrasado(participanteId, ta.turnos, ta.pericia, ta.dificuldade, origemLabel, statusEncadeavel, false);
    notas.push(`${origemLabel}: teste atrasado agendado — em ${ta.turnos} turno(s), ${ta.pericia} vs dif ${ta.dificuldade}.${statusEncadeavel ? ` Se falhar: ${statusEncadeavel.label}.` : ""}`);

    Object.entries(seFalhar).forEach(([chave, valor]) => {
        if (chave === chaveUsada) return;
        if (chave === "desmaioIndefinido") {
            notas.push(`${origemLabel}: se o teste atrasado falhar, o manual também prevê desmaio INDEFINIDO — não encadeado automaticamente, ajuste manualmente se necessário.`);
        } else if (chave === "flagNarrativa") {
            notas.push(`${origemLabel}: se o teste atrasado falhar, nota narrativa adicional: ${valor}.`);
        } else if (chave === "depoisFlag") {
            notas.push(`${origemLabel}: se o teste atrasado falhar, efeito posterior adicional (${JSON.stringify(valor)}) — não encadeado automaticamente, ajuste manualmente.`);
        } else if (chave === "penalidadeTemporizada") {
            const alvosPt = Array.isArray(valor.alvos) ? valor.alvos.join(", ") : valor.alvos;
            notas.push(`${origemLabel}: se o teste atrasado falhar, também prevê penalidade de duração geral (${valor.valor} em ${alvosPt}) — não encadeada automaticamente (depende do resultado do teste), ajuste manualmente se falhar.`);
        } else {
            notas.push(`${origemLabel}: se o teste atrasado falhar, consequência adicional "${chave}" não encadeada automaticamente — ajuste manualmente.`);
        }
    });
}

export async function despacharEfeitosQuimicos(alvoTipo, alvoId, efeitos, nomeItem) {
    const modificadoresExtras = [];
    const notas = [];
    if (!Array.isArray(efeitos) || !efeitos.length) return { modificadoresExtras, notas };

    const participanteId = participanteIdPorAlvo(alvoTipo, alvoId);

    for (const entrada of efeitos) {
        // Corrosivo, Catalizador níveis 1-3, Oxidante: sem `mecanica`
        // automatizável (ver EFEITOS_MATERIAL_QUIMICO, dados-manual.js).
        if (!entrada || !entrada.mecanica) continue;
        const mecanica = entrada.mecanica;
        const origemLabel = `${nomeItem} (${entrada.material})`;

        if (mecanica.danoImediato) {
            const resultado = await aplicarDano(alvoTipo, alvoId, mecanica.danoImediato.valor, "especial");
            notas.push(`${origemLabel}: ${mecanica.danoImediato.valor} de dano imediato. PV restante de ${resultado.nomeAlvo}: ${resultado.novoPv}.`);
        }
        // efeitoColateral.danoImediato (Bioquímico) — incondicional,
        // adicionado por resolverNivelMaterial fora da tabela estática.
        if (mecanica.efeitoColateral && mecanica.efeitoColateral.danoImediato) {
            const resultado = await aplicarDano(alvoTipo, alvoId, mecanica.efeitoColateral.danoImediato.valor, "especial");
            notas.push(`${origemLabel} (efeito colateral): ${mecanica.efeitoColateral.danoImediato.valor} de dano imediato. PV restante de ${resultado.nomeAlvo}: ${resultado.novoPv}.`);
        }

        if (mecanica.danoContinuo) {
            const dc = mecanica.danoContinuo;
            if (dc.semTimer) {
                notas.push(`${origemLabel}: dano contínuo de ${dc.valor}/turno enquanto durar a cena — sem contagem de turnos automatizável, acompanhe manualmente.`);
            } else if (participanteId) {
                await aplicarDanoContinuoQuimico(participanteId, dc.valor, dc.turnos, origemLabel, dc.tipoDanoKey || null);
                notas.push(`${origemLabel}: dano contínuo aplicado — ${dc.valor}/turno por ${dc.turnos} turno(s).`);
            } else {
                notas.push(`${origemLabel}: dano contínuo de ${dc.valor}/turno por ${dc.turnos} turno(s) — alvo fora do combate ativo, aplique manualmente.`);
            }
        }

        if (mecanica.penalidadeTemporizada) {
            await despacharPenalidadeTemporizada(mecanica.penalidadeTemporizada, origemLabel, participanteId, modificadoresExtras, notas);
        }

        if (mecanica.testeImediato) {
            await despacharTesteImediato(mecanica.testeImediato, origemLabel, alvoTipo, alvoId, participanteId, modificadoresExtras, notas);
        }

        if (mecanica.testeAtrasado) {
            await despacharTesteAtrasado(mecanica.testeAtrasado, origemLabel, participanteId, notas);
        }

        // curaEscolha (Bioquímico) — escolha humana, nunca automático.
        if (mecanica.curaEscolha) {
            const ce = mecanica.curaEscolha;
            const duracao = ce.duracaoCena ? "até o fim da cena" : `${ce.duracaoTurnos} turno(s)`;
            notas.push(`${origemLabel}: alvo escolhe ${ce.quantidadeEscolhas} efeito(s) (${duracao}) entre: ${(ce.opcoes || []).join(" | ")}. Escolha do jogador — aplique manualmente.`);
        }

        // explosivo / modificaOutroMaterial (Catalizador/Explosivo dentro
        // da receita): fora de escopo, já coberto por outro sistema ou
        // por regra de criação — ignorado silenciosamente.
    }

    return { modificadoresExtras, notas };
}

// ---------------------------------------------------------------------
// CONSUMIR DROGA (item de inventário com tag "droga")
// ---------------------------------------------------------------------
// Consumir um item de droga faz duas coisas:
// 1) Se existir uma Desvantagem "Vício" cadastrada pra essa mesma
//    substância, zera a contagem de abstinência dela (diaIndiceUltimoUso
//    = hoje) — "tomou a dose, a abstinência para por hoje".
// 2) Aplica o efeito da droga (bônus/penalidade) pelo tempo (em horas)
//    escrito na própria descrição do item — ex: "...por 4h." (ver
//    extrairDuracaoHorasDaDescricao em regras.js). Sem nenhum "Xh" no
//    texto, cai no comportamento antigo: dura até acabar o dia em jogo
//    atual. O efeito soma diaIndice*24 + hora do calendário da mesa
//    (ver horasTotaisCalendario) pra saber quando expira de verdade, e
//    some sozinho — sem precisar de nenhuma limpeza manual — assim que
//    o calendário passar desse ponto (ver calcularModificadoresDrogasAtivas).
// IMPORTANTE: o efeito aplicado é sempre `item.modificadores` — o mesmo
// campo "Modificadores automáticos" editável no modal do item (ver
// #modal-lista-modificadores em ficha.html). Não existe mais nenhum
// efeito fixo vindo do CATALOGO_DROGAS (dados-manual.js): aquele
// catálogo agora só serve de SUGESTÃO pra preencher esse campo (e a
// descrição, de onde a duração é lida) na hora de cadastrar o item (ver
// configurarAutocompleteItemBanco), continuando 100% editável depois —
// inclusive pra drogas homebrew que nem estão no catálogo.
// Item consumível de verdade: reduz 1 unidade (ou remove, se só tinha 1).
export async function consumirDroga(itemId) {
    if (!idAtivo()) return;
    const item = estado.fichaAtual.inventario && estado.fichaAtual.inventario[itemId];
    if (!item) return;
    if (estado.calendarioAtual === null || estado.calendarioAtual === undefined) {
        toast("Calendário da mesa ainda não carregou — espera um instante e tenta de novo.", "erro");
        return;
    }
    const diaAtual = estado.calendarioAtual.diaIndice;
    let modificadoresDoItem = (item.modificadores || []).filter(m => m && m.alvo && Number(m.valor));

    const atualizacoes = {};

    // 1) Cura a abstinência do vício correspondente, se existir.
    const idDesvantagem = encontrarDesvantagemVicioPara(item.nome);
    if (idDesvantagem) {
        estado.fichaAtual.desvantagens[idDesvantagem].diaIndiceUltimoUso = diaAtual;
        atualizacoes[`${caminhoBase()}/desvantagens/${idDesvantagem}/diaIndiceUltimoUso`] = diaAtual;
    }

    // 1.5) Despacha it.quimico.efeitos (autoconsumo — alvo é quem
    // consumiu), se o item carregar algum (normalmente só itens tag
    // "produto_quimico", mas o campo é preservado em qualquer tag pela
    // normalização — ver normalizacao.js). Penalidades de duração geral
    // viram modificador comum, somado à MESMA lista que efeitosDrogas já
    // grava logo abaixo — Parte 8, item 5.3 do plano-automacao-materiais-
    // quimicos-v3.
    let notasQuimico = [];
    const efeitosQuimicosItem = (item.quimico && Array.isArray(item.quimico.efeitos)) ? item.quimico.efeitos : [];
    if (efeitosQuimicosItem.length) {
        const alvoTipo = estado.modoNpc ? "npc" : "ficha";
        const alvoIdAtual = idAtivo();
        const resultadoQuimico = await despacharEfeitosQuimicos(alvoTipo, alvoIdAtual, efeitosQuimicosItem, item.nome);
        if (resultadoQuimico.modificadoresExtras.length) {
            modificadoresDoItem = [...modificadoresDoItem, ...resultadoQuimico.modificadoresExtras];
        }
        notasQuimico = resultadoQuimico.notas;
    }

    // 2) Registra o efeito ativo — direto dos modificadores editáveis do
    // próprio item; item sem nenhum modificador cadastrado só cura a
    // abstinência, sem bônus/penalidade automática. A duração vem do
    // texto da descrição (ex: "por 4h"); sem padrão reconhecido, dura
    // até o fim do dia em jogo (comportamento antigo).
    let notaDuracao = "";
    if (modificadoresDoItem.length) {
        const horasAgora = horasTotaisCalendario(diaAtual, estado.calendarioAtual.hora);
        const duracaoHoras = extrairDuracaoHorasDaDescricao(item.descricao);
        const horasExpira = (duracaoHoras !== null && horasAgora !== null)
            ? horasAgora + duracaoHoras
            : ((diaAtual + 1) * 24); // fallback: até acabar o dia em jogo (meia-noite)
        notaDuracao = duracaoHoras !== null ? `efeito ativo por ${duracaoHoras}h` : "efeito ativo até o fim do dia";

        if (!estado.fichaAtual.efeitosDrogas) estado.fichaAtual.efeitosDrogas = {};
        const chave = normalizarTextoBusca(item.nome);
        estado.fichaAtual.efeitosDrogas[chave] = {
            nome: item.nome,
            diaIndiceConsumido: diaAtual,
            horasExpira,
            modificadores: modificadoresDoItem
        };
        atualizacoes[`${caminhoBase()}/efeitosDrogas/${chave}`] = estado.fichaAtual.efeitosDrogas[chave];
    }

    // 3) Consome 1 unidade do item.
    const quantidadeAtual = Number(item.quantidade);
    if (Number.isFinite(quantidadeAtual) && quantidadeAtual > 1) {
        item.quantidade = quantidadeAtual - 1;
        atualizacoes[`${caminhoBase()}/inventario/${itemId}/quantidade`] = item.quantidade;
    } else {
        delete estado.fichaAtual.inventario[itemId];
        atualizacoes[`${caminhoBase()}/inventario/${itemId}`] = null;
    }

    try {
        await update(ref(db), atualizacoes);
        const partesAviso = [];
        if (idDesvantagem) partesAviso.push("abstinência zerada");
        if (notaDuracao) partesAviso.push(notaDuracao);
        toast(`${item.nome} consumido${partesAviso.length ? " — " + partesAviso.join(", ") : ""}.`);
        // Avisos do despachante de efeitos químicos (dano imediato já
        // aplicado, testes já resolvidos, o que precisa de ajuste manual
        // etc.) — mesmo padrão de notasStatus do avanço de turno.
        notasQuimico.forEach(nota => toast(nota, "erro"));
    } catch (e) {
        toast("Não foi possível consumir o item. Tente de novo.", "erro");
    }
}

// ---------------------------------------------------------------------
// USAR EQUIPAMENTO MÉDICO (item de inventário com tag "equipamento_
// medico", efeitos de "uso direto" — Fase 6 do plano de efeitos de
// equipamentos médicos, plano-efeitos-equipamentos-medicos.txt).
// Espelha consumirDroga acima (mesmo padrão de "quantidade = usos
// restantes", ver decrementarItemMedico mais abaixo), só que despachando
// os efeitos de USO DIRETO cadastrados no item em vez do efeito único
// de droga:
//   restaura_pv                              → curarAlvo (mestre.js),
//                                                já existente
//   estabiliza_condicao_critica               → reverterComaGodmode /
//                                                acordarDesmaioGodmode
//                                                (mestre.js) — SEMPRE
//                                                documentadas como
//                                                "exclusivo Godmode" nos
//                                                comentários de origem,
//                                                mas aqui o gatilho é o
//                                                uso do item, não o
//                                                Mestre; só dispara se a
//                                                condição realmente
//                                                estiver ativa
//   efeito_temporario_ignora_penalidade_saude → grava prazo em
//                                                dados.ignorarPenalidadeSaudeAte
//                                                (lido em
//                                                renderizarAtributos,
//                                                junto do sub-toggle de
//                                                Godmode equivalente)
//   efeito_temporario_modificador             → grava em efeitosItens
//                                                (campo irmão de
//                                                efeitosDrogas, mesmo
//                                                motor de expiração —
//                                                ver
//                                                calcularModificadoresDrogasAtivas
//                                                em regras.js)
// Os efeitos de tratamento de ferida (bonus/isenção/redução/sucesso
// automático) e de infecção NÃO passam por aqui — são despachados nos
// modais de Tratar Ferida / Testar Infecção (Fases 4 e 5, ver
// abrirModalTratarFerida/abrirModalTestarInfeccaoFerida mais abaixo).
// `estabiliza_condicao_critica` e a penalidade de saúde só existem pra
// ficha de jogador (não NPC) — em modo NPC esses dois efeitos ficam sem
// gatilho (não crasha, só não fazem nada), o resto funciona igual.
export async function usarEquipamentoMedico(itemId) {
    if (!idAtivo()) return;
    const item = estado.fichaAtual.inventario && estado.fichaAtual.inventario[itemId];
    if (!item) return;
    const efeitosDiretos = (Array.isArray(item.efeitosMedicos) ? item.efeitosMedicos : [])
        .filter(ef => ef && ["restaura_pv", "estabiliza_condicao_critica", "efeito_temporario_ignora_penalidade_saude", "efeito_temporario_modificador"].includes(ef.tipo));
    if (!efeitosDiretos.length) return;

    const atualizacoes = {};
    const avisos = [];
    const alvoTipo = estado.modoNpc ? "npc" : "ficha";
    const alvoId = idAtivo();
    const temCalendario = !!(estado.calendarioAtual && estado.calendarioAtual.diaIndice !== undefined && estado.calendarioAtual.diaIndice !== null);
    const horasAgora = temCalendario ? horasTotaisCalendario(estado.calendarioAtual.diaIndice, estado.calendarioAtual.hora) : null;

    for (const ef of efeitosDiretos) {
        if (ef.tipo === "restaura_pv") {
            const valor = Number(ef.valor) || 0;
            if (valor > 0) {
                try {
                    const resultado = await curarAlvo(alvoTipo, alvoId, valor);
                    avisos.push(`+${resultado.curaAplicada} PV`);
                } catch (e) {
                    avisos.push("não foi possível restaurar PV");
                }
            }
        } else if (ef.tipo === "estabiliza_condicao_critica") {
            if (!estado.modoNpc && estado.fichaAtual.dados?.coma?.ativo) {
                await reverterComaGodmode(alvoId);
                estado.fichaAtual.dados.coma = null;
                avisos.push("saiu do coma");
            }
            if (!estado.modoNpc && estado.fichaAtual.dados?.desmaiado) {
                await acordarDesmaioGodmode(alvoId);
                estado.fichaAtual.dados.desmaiado = false;
                avisos.push("acordou do desmaio");
            }
        } else if (ef.tipo === "efeito_temporario_ignora_penalidade_saude") {
            const horas = Number(ef.horas) || 0;
            if (!estado.modoNpc && horas > 0 && horasAgora !== null) {
                const horasExpira = horasAgora + horas;
                estado.fichaAtual.dados.ignorarPenalidadeSaudeAte = horasExpira;
                atualizacoes[`${caminhoBase()}/dados/ignorarPenalidadeSaudeAte`] = horasExpira;
                avisos.push(`ignora penalidade de saúde por ${horas}h`);
            }
        } else if (ef.tipo === "efeito_temporario_modificador") {
            const modificadoresDoEfeito = (ef.modificadores || []).filter(m => m && m.alvo && Number(m.valor));
            const horas = Number(ef.horas) || 0;
            if (modificadoresDoEfeito.length && temCalendario) {
                const horasExpira = horas > 0 ? horasAgora + horas : ((estado.calendarioAtual.diaIndice + 1) * 24);
                if (!estado.fichaAtual.efeitosItens) estado.fichaAtual.efeitosItens = {};
                // Chave inclui o id do item (não só o nome normalizado,
                // como em efeitosDrogas) pra permitir usar o mesmo item
                // duas vezes em itens DIFERENTES com o mesmo nome sem um
                // sobrescrever o outro — efeitosDrogas não precisa disso
                // porque, na prática, só existe 1 substância de cada por
                // vez fazendo efeito.
                const chave = `${normalizarTextoBusca(item.nome)}_${itemId}`;
                estado.fichaAtual.efeitosItens[chave] = {
                    nome: item.nome,
                    diaIndiceConsumido: estado.calendarioAtual.diaIndice,
                    horasExpira,
                    modificadores: modificadoresDoEfeito
                };
                atualizacoes[`${caminhoBase()}/efeitosItens/${chave}`] = estado.fichaAtual.efeitosItens[chave];
                avisos.push(`modificador ativo${horas ? ` por ${horas}h` : ""}`);
            }
        }
    }

    try {
        if (Object.keys(atualizacoes).length) await update(ref(db), atualizacoes);
        await decrementarItemMedico(itemId);
        toast(`${item.nome} usado${avisos.length ? " — " + avisos.join(", ") : ""}.`);
    } catch (e) {
        toast("Não foi possível usar o item. Tente de novo.", "erro");
    }
}

// Determinações — renderizarDeterminacoes/configurarRolagemDeterminacoes
// e helpers privados movidos para abas/determinacoes.js (Passo 14 do
// plano de modularização). Ver import no topo do arquivo.

// =====================================================================
// SALVAMENTO (auto-save com debounce + botão manual)
// =====================================================================

// Alguns campos simples ("dados/pvAtual", "dados/nome"...) pensados pra
// `fichas/{id}` não têm exatamente o mesmo endereço em `npcs/{id}` (lá
// PV/Energia atuais moram na raiz, não dentro de "dados"). Os que têm
// um equivalente direto são traduzidos; o resto (campos que só fazem
// sentido pra ficha de jogador, como padrão de vida) é guardado num
// canto isolado — nunca lido de volta por normalizarNpcComoFicha, mas
// também nunca perdido — pra nunca gravar por cima de algo do NPC.
const CAMPOS_NPC_EQUIVALENTES = {
    "dados/pvAtual": "pvAtual",
    "dados/energiaAtual": "energiaAtual",
    "dados/nome": "nome",
    "dados/vulgo": "vulgo",
    "dados/idade": "idade",
    "dados/funcao": "funcaoNarrativa"
};
function caminhoCampoNpc(caminho) {
    return CAMPOS_NPC_EQUIVALENTES[caminho] || `fichaExtras/${caminho}`;
}

// Variante de agendarSalvamento() pra quando o chamador já monta o
// caminho nativo certo (ex: atributosPrimarios/forca no modo NPC) — sem
// passar pela tradução dados/X → equivalente de NPC.
function agendarSalvamentoBruto(caminho, valor) {
    el.saveStatus.innerText = "salvando...";
    clearTimeout(estado.salvandoDebounce);
    estado.salvandoDebounce = setTimeout(async () => {
        try {
            await set(ref(db, `${caminhoBase()}/${caminho}`), valor);
            el.saveStatus.innerText = "sincronizado em tempo real";
        } catch (e) {
            console.error(e);
            el.saveStatus.innerText = "erro ao salvar";
            toast("Não foi possível salvar agora.", "erro");
        }
    }, 500);
}

export function agendarSalvamento(caminho, valor) {
    el.saveStatus.innerText = "salvando...";
    clearTimeout(estado.salvandoDebounce);
    estado.salvandoDebounce = setTimeout(async () => {
        try {
            // `caminho` aponta pro campo exato (ex: "dados/xp"); usamos set()
            // porque o valor é escalar — update() exige um objeto de pares
            // chave/valor relativos à ref, não serve pra sobrescrever uma
            // folha única da árvore.
            const caminhoFinal = estado.modoNpc ? caminhoCampoNpc(caminho) : caminho;
            await set(ref(db, `${caminhoBase()}/${caminhoFinal}`), valor);
            el.saveStatus.innerText = "sincronizado em tempo real";
        } catch (e) {
            console.error(e);
            el.saveStatus.innerText = "erro ao salvar";
            toast("Não foi possível salvar agora.", "erro");
        }
    }, 500);
}

async function salvarTudo(manual) {
    if (!estado.fichaAtual || !idAtivo()) return;
    // No modo NPC cada campo já é salvo individualmente (mesmo padrão da
    // ficha normal) — um "set" da estado.fichaAtual inteira aqui sobrescreveria
    // `npcs/{id}` com o formato de FICHA (dados.forca, pericias...) em
    // vez do formato nativo de NPC (atributosPrimarios, periciasNpc...),
    // apagando o registro. Por segurança, o botão "Salvar" manual só
    // confirma que já está tudo sincronizado nesse modo.
    if (estado.modoNpc) {
        if (manual) toast("Alterações do NPC já são salvas automaticamente.");
        return;
    }
    try {
        // update() em vez de set(): o histórico de XP (xpHistorico) vive
        // como um nó separado dentro de fichas/{id}/, gravado por
        // mestre.js, e NUNCA fica dentro de `estado.fichaAtual` (é carregado à
        // parte, em estado.xpHistoricoCache). Um set() na raiz da ficha
        // substitui a árvore inteira pelo que tem em `estado.fichaAtual` — como
        // xpHistorico não está lá, ele era apagado toda vez que alguém
        // clicava em "Salvar". update() faz o mesmo trabalho (substitui
        // cada campo por inteiro) mas preserva qualquer chave-irmã que
        // não esteja no objeto salvo.
        await update(ref(db, `${caminhoBase()}`), estado.fichaAtual);
        if (manual) toast("Ficha salva.");
    } catch (e) {
        console.error(e);
        toast("Erro ao salvar a ficha.", "erro");
    }
}

// Listeners genéricos de campo simples ([data-field]) — dispara update
// pontual em fichas/{id}/dados/{campo} (ou raiz, pra determinacoes/notas).
document.addEventListener("input", (e) => {
    // Caixas de Determinação: cada uma grava sua posição no array
    // estado.fichaAtual.determinacoes, mas o array inteiro é salvo de uma vez
    // (mesmo padrão de "set na folha inteira" usado pelo resto da ficha).
    const detIndice = e.target.dataset && e.target.dataset.determinacaoIndex;
    if (detIndice !== undefined && idAtivo()) {
        const idx = Number(detIndice);
        // Determinação já validada: travada pro jogador (mesmo padrão de
        // CAMPOS_SO_MESTRE) — só edita de novo depois que o Mestre clicar
        // em "Liberar" (ver liberarDeterminacao). O `disabled` do campo já
        // barra isso na prática, mas revalida aqui também.
        const validadas = Array.isArray(estado.fichaAtual.determinacoesValidadas) ? estado.fichaAtual.determinacoesValidadas : [];
        if (validadas[idx] && !estado.isMestre) { e.target.value = estado.fichaAtual.determinacoes?.[idx] || ""; return; }
        if (!Array.isArray(estado.fichaAtual.determinacoes)) estado.fichaAtual.determinacoes = [];
        estado.fichaAtual.determinacoes[idx] = e.target.value;
        agendarSalvamento("determinacoes", estado.fichaAtual.determinacoes);
        return;
    }

    const campo = e.target.dataset && e.target.dataset.field;
    if (!campo || !idAtivo()) return;
    if (CAMPOS_SO_MESTRE.includes(campo) && !estado.isMestre) return;

    if (campo === "notas") {
        estado.fichaAtual[campo] = e.target.value;
        agendarSalvamento(campo, e.target.value);
        return;
    }

    let valor = e.target.value;
    if (e.target.type === "number") valor = valor === "" ? 0 : Number(valor);
    estado.fichaAtual.dados[campo] = valor;
    agendarSalvamento(`dados/${campo}`, valor);

    if (campo === "xp" || campo === "nivel") {
        setTimeout(() => verificarLevelUpPendente(), 600);
    }
});

document.addEventListener("change", (e) => {
    const campo = e.target.dataset && e.target.dataset.field;
    if (!campo || !idAtivo() || e.target.tagName !== "SELECT") return;
    estado.fichaAtual.dados[campo] = e.target.value;
    agendarSalvamento(`dados/${campo}`, e.target.value);
});

// Atributos primários — só funcionam se podeEditarPericiaAtributo() (Mestre+godmode,
// ou Mestre atuando como NPC). No modo NPC grava direto em
// `atributosPrimarios/{attrKey}` (o campo real usado pros cálculos),
// não no equivalente "dados/X" da ficha de jogador.
document.addEventListener("input", (e) => {
    const attrKey = e.target.dataset && e.target.dataset.attrPrimario;
    if (!attrKey || !idAtivo() || !podeEditarPericiaAtributo()) return;
    const valor = Number(e.target.value) || 0;
    estado.fichaAtual.dados[attrKey] = valor;
    if (estado.modoNpc) {
        agendarSalvamentoBruto(`atributosPrimarios/${attrKey}`, valor);
    } else {
        agendarSalvamento(`dados/${attrKey}`, valor);
    }
});

// Recursos atuais (PV/Energia atual): o Mestre pode editar livremente
// (ajuste manual, godmode). Jogadores só podem REGISTRAR DANO (baixar o
// valor) por aqui — nunca aumentar. Cura/recuperação de PV é sempre via
// sistema (Tratar Feridas, Timeskip, ação do Mestre), nunca digitando um
// número maior direto no campo — sem essa trava, dava pra "curar" o
// personagem só digitando um valor mais alto no campo. Nunca pode passar
// do máximo calculado (Constituição/fórmula do manual, ou do override de
// Godmode — ver maximoComOverride) nem ficar negativo. Sem essa trava, o
// campo aceitava qualquer número digitado (inclusive durante a Criação,
// antes de a ficha estar fechada), inflando o PV permanentemente.
//
// Campo vazio (ex: selecionou o valor antigo pra apagar e digitar um novo)
// NÃO grava nada — só quando há um número de verdade no campo. Isso corrige
// um bug sério: antes, apagar o campo salvava `pvAtual: null` (o campo
// virava "" → Number("") tratado como null), e por convenção usada no
// resto do app (calcularEstadoSaude, o próprio render deste input, o
// painel de Recuperação de PVs) `pvAtual === null` significa "PV no
// máximo" — pensado só pra ficha nova/NPC recém-criado, que ainda não tem
// ferimento registrado. Como esse input salva sozinho a cada tecla (ver
// agendarSalvamento, debounce de 500ms), bastava o autosave disparar
// durante o instante em que o campo ficava vazio (ex: a pessoa se
// distraiu logo depois de apagar, antes de digitar o número novo) pra o
// personagem aparecer com PV cheio do nada pra todo mundo em tempo real
// — sem nenhum Timeskip, sem recuperação, sem nada. Se o campo for
// deixado vazio (blur), o handler de "blur" mais abaixo restaura o
// último valor válido.
document.addEventListener("input", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoKey;
    if (!recursoKey || !idAtivo()) return;
    if (e.target.value === "") return; // ainda digitando — não grava nada
    let valor = Number(e.target.value);
    if (Number.isNaN(valor)) return;

    const modificadoresPlanos = modificadoresAtuais();
    const derivados = calcularDerivados(estado.fichaAtual.dados, modificadoresPlanos);
    const bonusExtra = recursoKey === "pv" ? (Number(estado.fichaAtual.dados.pvBonusExtra) || 0) : 0;
    const totalCalculado = Math.round(derivados.recursos[recursoKey].total) + bonusExtra;
    const max = maximoComOverride(recursoKey, estado.fichaAtual.dados, totalCalculado);
    if (valor > max) valor = max;
    if (valor < 0) valor = 0;

    const campo = recursoKey + "Atual";
    // Jogador (não-Mestre): só pode digitar um valor MENOR ou IGUAL ao
    // atual — nunca se "curar" digitando um número maior aqui.
    if (!estado.isMestre) {
        const atualSalvo = (estado.fichaAtual.dados[campo] === null || estado.fichaAtual.dados[campo] === undefined) ? max : Number(estado.fichaAtual.dados[campo]);
        if (valor > atualSalvo) {
            e.target.value = atualSalvo;
            toast("Você não pode aumentar seu PV/Energia digitando aqui — isso é feito por cura, Tratar Feridas ou pelo Mestre.", "erro");
            return;
        }
    }
    if (Number(e.target.value) !== valor) e.target.value = valor; // reflete o clamp na tela

    estado.fichaAtual.dados[campo] = valor;
    agendarSalvamento(`dados/${campo}`, valor);
});

// Campo de PV/Energia atual deixado vazio ao sair dele (usuário apagou
// tudo e não chegou a digitar um número novo) — restaura o valor válido
// mais recente em vez de deixar "" (que nunca deveria significar "sem PV
// perdido", ver comentário acima). "blur" não faz bubble, por isso o
// listener precisa ser registrado em modo captura (terceiro argumento).
document.addEventListener("blur", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoKey;
    if (!recursoKey || e.target.value !== "") return;
    renderizarAtributos(modificadoresAtuais());
}, true);

// PV/Energia máximo — só aparece editável em Godmode (ver renderizarAtributos).
// Sobrescreve o valor calculado pela fórmula, guardado em
// dados.{recursoKey}MaximoOverride. Campo vazio remove o override e volta a
// usar o cálculo normal (Constituição/nível). Não reclampa o "Atual" aqui —
// se o novo máximo for menor que o PV atual, o próprio input do "Atual" se
// ajusta sozinho na próxima interação (mesmo comportamento de sempre).
document.addEventListener("input", (e) => {
    const recursoKey = e.target.dataset && e.target.dataset.recursoMaxInput;
    if (!recursoKey || !idAtivo() || !(estado.isMestre && estado.godmodeAtivo)) return;
    const valor = e.target.value === "" ? null : (Number(e.target.value) || 0);
    const campo = recursoKey + "MaximoOverride";
    estado.fichaAtual.dados[campo] = valor;
    agendarSalvamento(`dados/${campo}`, valor);
});

// =====================================================================
// BOTÕES "+ ADICIONAR" — abrem o modal genérico em modo criação
// =====================================================================

function configurarBotoesAdicionar() {
    document.getElementById("btn-add-pericia").addEventListener("click", () => abrirModalNovo("pericias"));
    document.getElementById("btn-add-item").addEventListener("click", () => abrirModalNovo("inventario"));
    document.getElementById("btn-add-vantagem").addEventListener("click", () => abrirModalNovo("vantagens"));
    document.getElementById("btn-add-desvantagem").addEventListener("click", () => abrirModalNovo("desvantagens"));
    document.getElementById("btn-add-fato").addEventListener("click", () => abrirModalNovo("fatosUniversais"));
    document.getElementById("btn-add-especializacao").addEventListener("click", () => abrirModalNovo("especializacoes"));
    document.getElementById("btn-add-gasto").addEventListener("click", () => abrirModalNovo("gastosExtras"));
    document.getElementById("btn-add-veiculo").addEventListener("click", () => abrirModalNovo("veiculos"));
    document.getElementById("btn-add-categoria").addEventListener("click", async () => {
        const nome = prompt("Nome da nova categoria de inventário:");
        if (!nome) return;
        const id = criarCategoriaCustom(estado.fichaAtual, nome);
        await update(ref(db, `${caminhoBase()}/categoriasInventario`), estado.fichaAtual.categoriasInventario);
        estado.categoriaInventarioAtiva = id;
        toast(`Categoria "${nome}" criada.`);
    });
}

// =====================================================================
// MODAL GENÉRICO DE ENTIDADE
// =====================================================================
// Cobre: pericias, inventario, vantagens, desvantagens, fatosUniversais,
// especializacoes, gastosExtras. `estado.modalContexto` guarda { lista, id } —
// id null/undefined = criando um registro novo.

export function abrirModalNovo(lista) {
    if (lista !== "itensGlobais" && !estado.fichaAtual) {
        toast("Selecione uma ficha (aba \"Fichas ativas\", se você for o Mestre) antes de adicionar isso.", "erro");
        return;
    }
    if (lista === "itensGlobais" && !estado.isMestre) {
        toast("Só o Mestre gerencia a Biblioteca de Itens.", "erro");
        return;
    }
    if (LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa()) {
        toast("Só o Mestre pode adicionar isso depois da criação do personagem.", "erro");
        return;
    }
    // Trava de limite de Desvantagens (regra: no máximo 3, mesmo pro
    // Mestre editando durante a criação — a exceção de "sem limite" do
    // Mestre vale só pra edição narrativa fora da criação, não pra
    // burlar o teto de pontos bônus).
    if (lista === "desvantagens" && !podeAdicionarDesvantagem(estado.fichaAtual)) {
        toast(`Limite de ${MAX_DESVANTAGENS} desvantagens atingido — não é possível adicionar mais.`, "erro");
        return;
    }
    if (lista === "veiculos" && !estado.isMestre) {
        toast("Só o Mestre pode adicionar veículos.", "erro");
        return;
    }
    estado.modalContexto = { lista, id: null };
    estado.criarItemApenasNoBanco = false;
    estado.cenarioIdParaCriarItem = null;
    prepararModalParaLista(lista, null);
    el.modal.classList.add("active");
}

// Abre o modal de item completo (mesmos campos do Banco Global: tag,
// peso, perícia, dano etc.) mas com o resultado indo direto pro
// cenário informado em vez da Biblioteca de Itens — ver
// estado.cenarioIdParaCriarItem e o branch correspondente em
// salvarItemBancoDoModal. Só o Mestre chega até aqui (o próprio
// Gerenciador de Cenário já é uma tela exclusiva dele).
export function abrirModalNovoItemParaCenario(cenarioId) {
    if (!estado.isMestre) { toast("Só o Mestre pode criar itens no cenário.", "erro"); return; }
    estado.modalContexto = { lista: "itensGlobais", id: null };
    estado.criarItemApenasNoBanco = false;
    estado.cenarioIdParaCriarItem = cenarioId;
    prepararModalParaLista("itensGlobais", null);
    el.modalTitulo.innerText = "Novo item no cenário";
    el.modal.classList.add("active");
}

export function abrirModalEdicao(lista, id) {
    estado.modalContexto = { lista, id };
    estado.criarItemApenasNoBanco = false;
    estado.cenarioIdParaCriarItem = null;
    const objeto = lista === "itensGlobais"
        ? estado.itensGlobaisCache.find(it => it.id === id)
        : estado.fichaAtual[lista] && estado.fichaAtual[lista][id];
    prepararModalParaLista(lista, objeto);
    el.modal.classList.add("active");
}

export function fecharModal() {
    el.modal.classList.remove("active");
    estado.modalContexto = null;
    estado.cenarioIdParaCriarItem = null;
    // Retoma o modal de receita que ficou pendente (ver comentário na
    // declaração de estado.receitaAguardandoVinculo) — dispara em QUALQUER
    // fechamento do modal de item enquanto há uma receita esperando
    // (salvo com sucesso, cancelado, ou fechado clicando fora).
    if (estado.receitaAguardandoVinculo) {
        const pendente = estado.receitaAguardandoVinculo;
        const idBanco = estado.idBancoParaRetomarReceita;
        estado.receitaAguardandoVinculo = null;
        estado.idBancoParaRetomarReceita = null;
        toast(idBanco
            ? `Item "${pendente.rascunho.nome}" criado no Banco Global — voltando pra receita já vinculada.`
            : `Voltando pra receita (nenhum item novo foi salvo no Banco Global, então ela continua sem vínculo).`);
        abrirModalCriarReceita(pendente.receitaExistente, pendente.opcoesSlot, {
            ...pendente.rascunho,
            itemGlobalId: idBanco || pendente.rascunho.itemGlobalId || null
        });
    }
}

function esconderTodosCamposEspeciais() {
    el.modalItemBancoOpcoes.style.display = "none";
    el.modalCampoSalvarBanco.style.display = "none";
    // Reset do estado especial deixado pelo fluxo "+ Criar item no Banco
    // Global" da receita (ver estado.criarItemApenasNoBanco) — sem isso, o
    // checkbox travado/o aviso ficavam grudados pra qualquer próximo
    // "+ Adicionar item" comum que reusasse este mesmo modal.
    el.modalSalvarBanco.disabled = false;
    const avisoSoBancoAntigo = el.modalCampoSalvarBanco.querySelector(".hint-item-so-banco");
    if (avisoSoBancoAntigo) avisoSoBancoAntigo.remove();
    el.modalCampoCategoriaPericia.style.display = "none";
    el.modalCampoPericiaBusca.style.display = "none";
    el.modalCampoNivel.style.display = "none";
    el.modalCampoTag.style.display = "none";
    el.modalCampoImagem.style.display = "none";
    limparImagemModal();
    el.modalCampoNivelTag.style.display = "none";
    el.modalCampoInstalarVeiculo.style.display = "none";
    el.modalCampoPericiaUso.style.display = "none";
    el.modalCampoEspecializacaoPericia.style.display = "none";
    const hintEspecializacoesPericiaExistente = document.getElementById("hint-especializacoes-pericia");
    if (hintEspecializacoesPericiaExistente) hintEspecializacoesPericiaExistente.style.display = "none";
    el.hintFerramentaCriacaoGeral.style.display = "none";
    el.modalCampoClasseProtecao.style.display = "none";
    el.modalCampoLocalProtegido.style.display = "none";
    el.modalCampoPeso.style.display = "none";
    el.modalCampoVolume.style.display = "none";
    el.modalCampoTamanho.style.display = "none";
    el.modalCampoSubtipoPorte.style.display = "none";
    el.modalCampoCompartimentos.style.display = "none";
    el.modalCampoQuantidade.style.display = "none";
    el.modalCampoCategoriaItem.style.display = "none";
    el.modalCampoCategoriaBanco.style.display = "none";
    el.modalCampoGuardarDentro.style.display = "none";
    el.modalCampoMaterialTipo.style.display = "none";
    el.modalCampoMaterialQualidade.style.display = "none";
    el.modalCampoMaterialQuantidade.style.display = "none";
    el.modalConfigArma.style.display = "none";
    el.modalConfigExplosivo.style.display = "none";
    el.modalConfigImplante.style.display = "none";
    el.modalConfigReducaoDano.style.display = "none";
    el.modalCampoEfeitosMedicos.style.display = "none";
    el.modalCampoSubstanciaVicio.style.display = "none";
    el.modalCampoTipoVeiculo.style.display = "none";
    el.modalConfigVeiculo.style.display = "none";
    el.modalCampoCalibre.style.display = "none";
    el.modalCampoMaosNecessarias.style.display = "none";
    el.modalCampoLimitarRolagem.style.display = "none";
    el.modalCampoEquipavel.style.display = "none";
    el.modalCampoItemSaldo.style.display = "none";
    el.modalCampoJaEquipar.style.display = "none";
    el.modalCampoCarregadorCapacidade.style.display = "none";
    el.modalCampoProjetilQuantidade.style.display = "none";
    el.modalSecaoNarrativa.style.display = "";
    el.modalNome.parentElement.style.display = "flex";
    document.querySelector('label[for="modal-nivel"]').innerText = "Nível (0–5)";
    el.modalNivel.min = 0; el.modalNivel.max = 5;
}

function prepararModalParaLista(lista, objetoExistente) {
    esconderTodosCamposEspeciais();
    el.modalExcluir.style.display = objetoExistente ? "inline-block" : "none";
    el.modalTitulo.innerText = (objetoExistente ? "Editar " : "Novo: ") + TITULOS_MODAL[lista];
    el.modalDescricao.value = objetoExistente ? (objetoExistente.descricao || "") : "";
    montarListaModificadores(objetoExistente ? (objetoExistente.modificadores || []) : []);

    if (lista === "pericias") {
        prepararModalPericia(objetoExistente);
    } else if (lista === "inventario" || lista === "itensGlobais") {
        prepararModalItem(objetoExistente, lista === "itensGlobais");
    } else if (lista === "gastosExtras") {
        prepararModalGasto(objetoExistente);
    } else if (lista === "veiculos") {
        prepararModalVeiculo(objetoExistente);
    } else {
        // vantagens, desvantagens, fatosUniversais, especializacoes: nome + descrição + modificadores
        el.modalNome.value = objetoExistente ? (objetoExistente.nome || "") : "";
        if (lista === "desvantagens" && el.modalCampoSubstanciaVicio) {
            const nomeAtual = el.modalNome.value;
            const ehVicio = /vic[ií]o/i.test(nomeAtual);
            el.modalCampoSubstanciaVicio.style.display = ehVicio ? "flex" : "none";
            el.modalSubstanciaVicio.value = objetoExistente ? (objetoExistente.substancia || "") : "";
        } else if (el.modalCampoSubstanciaVicio) {
            el.modalCampoSubstanciaVicio.style.display = "none";
            el.modalSubstanciaVicio.value = "";
        }
        if (lista === "especializacoes") {
            el.modalCampoEspecializacaoPericia.style.display = "flex";
            const periciaVinculadaAtual = (objetoExistente && objetoExistente.periciaVinculada) || "";
            const idsPericias = Object.keys(estado.fichaAtual.pericias || {})
                .filter(id => (Number(estado.fichaAtual.pericias[id].nivel) || 0) >= 3 || estado.fichaAtual.pericias[id].nome === periciaVinculadaAtual)
                .sort((a, b) => estado.fichaAtual.pericias[a].nome.localeCompare(estado.fichaAtual.pericias[b].nome));
            el.modalEspecializacaoPericia.innerHTML = `<option value="">-- nenhuma --</option>` +
                idsPericias.map(id => {
                    const p = estado.fichaAtual.pericias[id];
                    const abaixoDoMinimo = p.nome === periciaVinculadaAtual && (Number(p.nivel) || 0) < 3;
                    return `<option value="${escapeHtml(p.nome)}">${escapeHtml(p.nome)} (nível ${p.nivel})${abaixoDoMinimo ? " — abaixo do nível 3" : ""}</option>`;
                }).join("");
            el.modalEspecializacaoPericia.value = periciaVinculadaAtual;
        }
    }

    // Trava de edição de item (regra 3): jogador só pode VER um item que
    // já está no inventário — características, mods e status ficam
    // travados. Ele ainda pode pedir a remoção (vira um pedido pendente
    // pro Mestre aprovar, regra 4), mas não pode editar/salvar direto.
    const somenteLeituraItem = lista === "inventario" && !!objetoExistente && !estado.isMestre;
    // Trava de edição de Vantagem/Desvantagem/Fato Universal (correção de
    // exploit): fora da Criação, só o Mestre edita ou remove — o jogador
    // só visualiza, sem nem a opção de pedir remoção.
    const somenteLeituraCaracteristica = LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa();
    const somenteLeitura = somenteLeituraItem || somenteLeituraCaracteristica;
    aplicarSomenteLeituraModal(somenteLeitura);
    if (somenteLeituraCaracteristica) {
        el.modalTitulo.innerText += " (somente leitura)";
        el.modalExcluir.style.display = "none";
    } else if (somenteLeituraItem) {
        el.modalTitulo.innerText += " (somente leitura)";
        el.modalExcluir.innerText = "Solicitar remoção";
    } else {
        el.modalExcluir.innerText = "Excluir";
    }
}

// Desabilita todos os campos do modal (exceto os botões de rodapé) —
// usado quando um jogador abre um item que já está no inventário, já
// que ele só pode visualizar, não editar.
function aplicarSomenteLeituraModal(somenteLeitura) {
    const modalContent = el.modal.querySelector(".modal-content");
    if (!modalContent) return;
    modalContent.querySelectorAll("input, select, textarea").forEach(campo => { campo.disabled = somenteLeitura; });
    modalContent.querySelectorAll("button").forEach(btn => {
        if (["modal-cancelar", "modal-excluir", "modal-salvar"].includes(btn.id)) return;
        btn.disabled = somenteLeitura;
    });
    el.modalSalvar.style.display = somenteLeitura ? "none" : "inline-block";
}

function configurarModal() {
    document.getElementById("modal-cancelar").addEventListener("click", fecharModal);
    document.getElementById("modal-excluir").addEventListener("click", excluirEntidadeAtual);
    document.getElementById("modal-salvar").addEventListener("click", salvarEntidadeAtual);
    el.modal.addEventListener("click", (e) => { if (e.target === el.modal) fecharModal(); });
}

// ---------------------------------------------------------------------
// Modal: ITEM DE INVENTÁRIO — tag, nível de tag, peso, categoria, arma
// ---------------------------------------------------------------------
// Preenche o select "Guardar dentro de" com TODOS os itens-recipiente
// (tag "recipiente") da ficha — idItemAtual (o próprio item sendo
// editado, null se for novo) fica de fora das opções, e também
// qualquer recipiente que já esteja guardado dentro dele (pra não
// formar um ciclo). valorSelecionado é o dentroDe atual do item
// (string vazia = nenhum, item solto/fora de qualquer recipiente).
// Guardar dentro de um recipiente move o item pra categoria dele
// automaticamente (ver o listener abaixo e salvarItemDoModal) — por
// isso a lista não é filtrada por categoria.
function popularSelectGuardarDentro(idItemAtual, valorSelecionado) {
    el.modalGuardarDentro.innerHTML = "";
    const optNenhum = document.createElement("option");
    optNenhum.value = "";
    optNenhum.innerText = "Nenhum (item solto)";
    el.modalGuardarDentro.appendChild(optNenhum);
    // Lista achatada por COMPARTIMENTO (não por container inteiro — ver
    // listaContainersDisponiveis/seção 5.1 do projeto-slots-porte.txt).
    // O value do <option> carrega os dois ids ("containerId::compartimentoId")
    // porque um mesmo container pode ter vários compartimentos.
    const compartimentosDisponiveis = listaContainersDisponiveis(estado.fichaAtual, idItemAtual);
    compartimentosDisponiveis.forEach(comp => {
        const containerItem = estado.fichaAtual.inventario[comp.containerId];
        const opt = document.createElement("option");
        opt.value = `${comp.containerId}::${comp.compartimentoId}`;
        opt.innerText = `${comp.containerNome} → ${comp.compartimentoNome} (${nomeCategoria(estado.fichaAtual, containerItem?.categoria)})`;
        el.modalGuardarDentro.appendChild(opt);
    });
    // Se o compartimento salvo não está mais entre as opções (ex: o
    // container ou o compartimento foi excluído), volta pra "Nenhum".
    el.modalGuardarDentro.value = [...el.modalGuardarDentro.options].some(o => o.value === valorSelecionado)
        ? valorSelecionado
        : "";
    // Escolher um recipiente sincroniza a categoria do item com a dele
    // na hora (só visual — quem garante de verdade é salvarItemDoModal).
    el.modalGuardarDentro.onchange = () => {
        const [contId] = el.modalGuardarDentro.value ? el.modalGuardarDentro.value.split("::") : [""];
        const cont = contId ? estado.fichaAtual.inventario[contId] : null;
        if (cont) el.modalCategoriaItem.value = cont.categoria || "levando";
    };
}

// Popula um <select> de tamanho (usado tanto pro tamanho do próprio
// item quanto pro "maior tamanho aceito" de um recipiente) com as
// categorias de TAMANHOS_ITEM. valorAtual cai pro primeiro da lista
// ("pequeno") se vier vazio/inválido — mantém o select sempre com uma
// opção válida selecionada, sem exigir escolha explícita pra itens
// sem tamanho definido (dado antigo, ver Fase 7).
function popularSelectTamanho(selectEl, valorAtual) {
    selectEl.innerHTML = "";
    TAMANHOS_ITEM.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.innerText = t.label;
        selectEl.appendChild(opt);
    });
    selectEl.value = (valorAtual && TAMANHOS_ITEM.some(t => t.key === valorAtual)) ? valorAtual : TAMANHOS_ITEM[0].key;
}

// Popula o <select> "Tipo de porte" (ver SUBTIPOS_PORTE em dados-manual.js
// e seção 5.1 do projeto-slots-porte.txt) — só aparece pra tag
// "recipiente". valorAtual cai pro primeiro da lista ("mochila") se vier
// vazio/inválido, mesmo default seguro usado por normalizarCompartimentos.
export function popularSelectSubtipoPorte(selectEl, valorAtual) {
    selectEl.innerHTML = "";
    SUBTIPOS_PORTE.forEach(s => {
        const opt = document.createElement("option");
        opt.value = s.key;
        opt.innerText = s.label;
        selectEl.appendChild(opt);
    });
    selectEl.value = (valorAtual && SUBTIPOS_PORTE.some(s => s.key === valorAtual)) ? valorAtual : SUBTIPOS_PORTE[0].key;
}

// ---------------------------------------------------------------------
// Compartimentos de recipiente (linhas dinâmicas: nome + capacidade +
// tamanho máximo aceito — ver seção 5.1 do projeto-slots-porte.txt).
// Mesmo padrão das linhas de modificador (template clonado via JS).
// ---------------------------------------------------------------------
export function montarListaCompartimentos(compartimentos) {
    el.modalListaCompartimentos.innerHTML = "";
    (compartimentos || []).forEach(c => adicionarLinhaCompartimento(c.id, c.nome, c.capacidadeVolume, c.tamanhoMaximoAceito));
}

function adicionarLinhaCompartimento(idExistente, nomeAtual, capacidadeAtual, tamanhoAtual) {
    const fragmento = el.templateCompartimento.content.cloneNode(true);
    const row = fragmento.querySelector(".compartimento-row");
    const nomeInput = row.querySelector(".compartimento-nome");
    const capacidadeInput = row.querySelector(".compartimento-capacidade");
    const tamanhoSelect = row.querySelector(".compartimento-tamanho");
    const btnRemover = row.querySelector(".compartimento-remover");

    // Guarda o id original num dataset — compartimento já existente
    // mantém o mesmo id ao editar (pra não invalidar item.compartimentoId
    // de itens já guardados nele); linha nova só ganha id no momento de
    // salvar (ver lerCompartimentosDoModal/gerarIdLocal).
    row.dataset.compartimentoId = idExistente || "";
    nomeInput.value = nomeAtual || "";
    capacidadeInput.value = capacidadeAtual ?? 0;
    popularSelectTamanho(tamanhoSelect, tamanhoAtual);

    btnRemover.addEventListener("click", () => {
        // Sempre deixa pelo menos 1 linha na lista — remover a última
        // restante seria salvar um container sem nenhum compartimento
        // (proibido, ver lerCompartimentosDoModal). O jogador pode
        // limpar o nome/zerar a capacidade se realmente não quiser
        // aquele compartimento, mas precisa ter algo.
        if (el.modalListaCompartimentos.querySelectorAll(".compartimento-row").length <= 1) {
            toast("O recipiente precisa de pelo menos 1 compartimento.", "erro");
            return;
        }
        // Passo 18 (seção 5.4 do projeto-slots-porte.txt) — bloqueia
        // remover um compartimento que ainda tem item guardado dentro
        // (ficaria com item.compartimentoId apontando pra um compartimento
        // que não existe mais). Só se aplica a compartimento JÁ EXISTENTE
        // (idExistente, guardado no dataset) de um item de INVENTÁRIO já
        // salvo (estado.modalContexto.id) — linha recém-criada no editor (ainda
        // sem id persistido) nunca tem item guardado dentro dela, e item
        // do Banco Global não guarda item de ficha nenhum dentro.
        const idCompartimento = row.dataset.compartimentoId;
        if (idCompartimento && estado.modalContexto && estado.modalContexto.lista === "inventario" && estado.modalContexto.id) {
            const itensDentro = Object.values(estado.fichaAtual.inventario || {})
                .filter(it2 => it2.dentroDe === estado.modalContexto.id && it2.compartimentoId === idCompartimento);
            if (itensDentro.length) {
                const nomes = itensDentro.map(it2 => it2.nome).join(", ");
                toast(`Não dá pra remover esse compartimento com item guardado dentro (${nomes}). Guarde ${itensDentro.length > 1 ? "os itens" : "o item"} em outro lugar primeiro.`, "erro");
                return;
            }
        }
        row.remove();
    });

    el.modalListaCompartimentos.appendChild(row);
}

function configurarCompartimentosGenerico() {
    document.getElementById("modal-add-compartimento").addEventListener("click", () => adicionarLinhaCompartimento(null, "", 0, null));
}

// Lê as linhas do editor e monta o array pra salvar no item. Retorna
// null (e mostra um toast) se a validação mínima falhar — quem chama
// deve tratar null como "não salvar". Compartimento sem nome preenchido
// ganha "Compartimento N" como nome padrão, pra nunca salvar em branco.
export function lerCompartimentosDoModal() {
    const linhas = [...el.modalListaCompartimentos.querySelectorAll(".compartimento-row")];
    if (linhas.length === 0) {
        toast("Adicione pelo menos 1 compartimento a esse recipiente.", "erro");
        return null;
    }
    return linhas.map((row, i) => {
        const nomeDigitado = row.querySelector(".compartimento-nome").value.trim();
        return {
            id: row.dataset.compartimentoId || gerarIdLocal(),
            nome: nomeDigitado || `Compartimento ${i + 1}`,
            capacidadeVolume: Math.max(0, Number(row.querySelector(".compartimento-capacidade").value) || 0),
            tamanhoMaximoAceito: row.querySelector(".compartimento-tamanho").value || null
        };
    });
}

// ---------------------------------------------------------------------
// Imagem do item (miniatura opcional mostrada no inventário — ver
// .entity-thumb no CSS e o campo `imagem` gravado junto do item em
// salvarItemDoModal/salvarItemBancoDoModal). Tudo acontece no
// navegador: a foto escolhida é redesenhada num <canvas> já reduzida
// (máx. 96px no lado maior) e reexportada como JPEG comprimido, então
// o que efetivamente vai pro Firebase é só uma string pequena (alguns
// KB) — não precisa de Firebase Storage nem de regra de acesso nova
// pra isso funcionar.
const IMAGEM_ITEM_LADO_MAXIMO = 96;
const IMAGEM_ITEM_QUALIDADE_JPEG = 0.72;

function limparImagemModal() {
    estado.imagemItemModalAtual = null;
    el.modalImagemArquivo.value = "";
    el.modalImagemPreview.src = "";
    el.modalImagemPreview.style.display = "none";
    el.btnRemoverImagemItem.style.display = "none";
}

function definirImagemModal(dataUrl) {
    estado.imagemItemModalAtual = dataUrl || null;
    if (estado.imagemItemModalAtual) {
        el.modalImagemPreview.src = estado.imagemItemModalAtual;
        el.modalImagemPreview.style.display = "";
        el.btnRemoverImagemItem.style.display = "";
    } else {
        el.modalImagemPreview.src = "";
        el.modalImagemPreview.style.display = "none";
        el.btnRemoverImagemItem.style.display = "none";
    }
}

// Lê o arquivo escolhido, desenha num canvas já reduzido (mantendo a
// proporção) e devolve o data URL comprimido via callback — feito com
// Image/canvas em vez de alguma lib externa pra não precisar adicionar
// dependência nova só por causa disso.
function redimensionarImagemParaThumbnail(arquivo, aoTerminar) {
    const leitor = new FileReader();
    leitor.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const escala = Math.min(1, IMAGEM_ITEM_LADO_MAXIMO / Math.max(img.width, img.height));
            const largura = Math.max(1, Math.round(img.width * escala));
            const altura = Math.max(1, Math.round(img.height * escala));
            const canvas = document.createElement("canvas");
            canvas.width = largura;
            canvas.height = altura;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, largura, altura);
            aoTerminar(canvas.toDataURL("image/jpeg", IMAGEM_ITEM_QUALIDADE_JPEG));
        };
        img.onerror = () => toast("Não consegui ler essa imagem — tente outro arquivo.", "erro");
        img.src = e.target.result;
    };
    leitor.onerror = () => toast("Falha ao carregar o arquivo de imagem.", "erro");
    leitor.readAsDataURL(arquivo);
}

function configurarImagemItemGenerico() {
    el.btnEscolherImagemItem.addEventListener("click", () => el.modalImagemArquivo.click());
    el.modalImagemArquivo.addEventListener("change", () => {
        const arquivo = el.modalImagemArquivo.files && el.modalImagemArquivo.files[0];
        if (!arquivo) return;
        if (!arquivo.type.startsWith("image/")) {
            toast("Escolha um arquivo de imagem.", "erro");
            el.modalImagemArquivo.value = "";
            return;
        }
        redimensionarImagemParaThumbnail(arquivo, (dataUrl) => definirImagemModal(dataUrl));
    });
    el.btnRemoverImagemItem.addEventListener("click", () => limparImagemModal());
}

// ---------------------------------------------------------------------
// Prévia flutuante da imagem do item ao passar o mouse (ver uso em
// criarLiItem e nos cards da Biblioteca de Itens do Mestre). Um único
// elemento é criado e reaproveitado pra qualquer item da tela, em vez
// de criar um novo a cada renderização da lista — a lista inteira é
// redesenhada com frequência (equipar, mover item, abrir/fechar
// recipiente etc.), então isso evita ficar acumulando elementos soltos
// no <body>.
let previewFlutuanteImagemEl = null;
function obterPreviewFlutuanteImagem() {
    if (!previewFlutuanteImagemEl) {
        previewFlutuanteImagemEl = document.createElement("img");
        previewFlutuanteImagemEl.className = "preview-flutuante-imagem-item";
        document.body.appendChild(previewFlutuanteImagemEl);
    }
    return previewFlutuanteImagemEl;
}

// Só ativa em dispositivos com mouse de verdade (`hover: hover`) — em
// touch, tocar no item já abre o modal de edição antes de qualquer
// "hover" fazer sentido, e a prévia ficaria grudada na tela depois do
// toque sem jeito fácil de "tirar o mouse de cima".
const TEM_MOUSE_DE_VERDADE = window.matchMedia && window.matchMedia("(hover: hover)").matches;

export function ativarPreviewFlutuanteImagem(elemento, src) {
    if (!TEM_MOUSE_DE_VERDADE || !src) return;
    elemento.addEventListener("mouseenter", () => {
        const preview = obterPreviewFlutuanteImagem();
        preview.src = src;
        preview.style.display = "block";
    });
    elemento.addEventListener("mousemove", (e) => {
        const preview = obterPreviewFlutuanteImagem();
        // Desloca um pouco da ponta do cursor e evita vazar pra fora da
        // tela nas bordas direita/inferior.
        const margem = 18;
        const largura = preview.offsetWidth || 220;
        const altura = preview.offsetHeight || 220;
        let x = e.clientX + margem;
        let y = e.clientY + margem;
        if (x + largura > window.innerWidth) x = e.clientX - largura - margem;
        if (y + altura > window.innerHeight) y = e.clientY - altura - margem;
        preview.style.left = `${x}px`;
        preview.style.top = `${y}px`;
    });
    elemento.addEventListener("mouseleave", () => {
        obterPreviewFlutuanteImagem().style.display = "none";
    });
}

function prepararModalItem(existente, ehBanco) {
    // "chave" (ver plano-veiculos.txt, adendo "chave") só aparece no
    // dropdown se o item que está sendo editado JÁ é uma chave — assim
    // dá pra abrir e editar (nome, descrição) uma chave existente sem
    // perder a tag, mas ninguém consegue escolher "chave" do zero pra
    // um item novo ou pra trocar a tag de outro item já existente.
    const opcaoChave = el.modalTag.querySelector('option[data-chave-veiculo="1"]');
    if (opcaoChave) opcaoChave.style.display = (existente && existente.tag === "chave") ? "" : "none";

    el.modalCampoTag.style.display = "flex";
    el.modalCampoImagem.style.display = "flex";
    el.modalCampoPeso.style.display = "flex";
    el.modalCampoVolume.style.display = "flex";
    el.modalCampoTamanho.style.display = "flex";
    // Item do Banco Global não tem "categoria" (levando/casa) nem
    // "guardar dentro de" — isso só existe quando o item está de fato
    // dentro de uma ficha.
    el.modalCampoCategoriaItem.style.display = ehBanco ? "none" : "flex";
    el.modalCampoGuardarDentro.style.display = ehBanco ? "none" : "flex";
    // Categoria do Banco Global (Capangas, Armas de fogo...) — sem
    // relação nenhuma com a categoria de inventário acima (levando/casa);
    // só existe pro item-molde do Banco, então só aparece com ehBanco.
    el.modalCampoCategoriaBanco.style.display = ehBanco ? "flex" : "none";

    if (!ehBanco) {
        el.modalCategoriaItem.innerHTML = "";
        listaCategorias(estado.fichaAtual).forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat.id;
            opt.innerText = cat.nome;
            el.modalCategoriaItem.appendChild(opt);
        });
    } else {
        el.modalCategoriaBancoDatalist.innerHTML = "";
        categoriasDistintas(estado.itensGlobaisCache, "categoriaBanco").forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            el.modalCategoriaBancoDatalist.appendChild(opt);
        });
    }

    // Checkbox "Salvar no Banco Global": só faz sentido ao adicionar/editar
    // um item DENTRO de uma ficha (o item do Banco em si já É o registro
    // salvo, marcar a caixa ali seria redundante).
    el.modalCampoSalvarBanco.style.display = (!ehBanco) ? "flex" : "none";
    el.modalSalvarBanco.checked = false;

    // Toda vez que o modal reabre (item novo ou outro item existente), a
    // checkbox de "carga química" volta a refletir o que está salvo no
    // item em vez do que sobrou de uma edição anterior na mesma sessão
    // do modal (ver dataset.tocado em atualizarCamposPorTag).
    delete el.modalArmaCargaQuimica.dataset.tocado;

    if (existente) {
        el.modalNome.value = existente.nome || "";
        el.modalTag.value = existente.tag || "";
        definirImagemModal(existente.imagem || null);
        el.modalPeso.value = existente.pesoUnitario ?? existente.peso ?? 0;
        el.modalVolume.value = existente.volumeUnitario ?? existente.volume ?? 0;
        popularSelectTamanho(el.modalTamanho, existente.tamanho);
        if (!ehBanco) {
            el.modalCategoriaItem.value = existente.categoria || "levando";
            popularSelectGuardarDentro(estado.modalContexto ? estado.modalContexto.id : null, existente.dentroDe ? `${existente.dentroDe}::${existente.compartimentoId || "principal"}` : "");
        } else {
            el.modalCategoriaBanco.value = existente.categoriaBanco || "";
        }
        atualizarCamposPorTag(existente.tag, existente.nivelTag, existente.arma, existente.periciaUso, existente.classeProtecao, existente.calibre, existente.reducoesDano, existente.carregador, existente.projetil, existente.localProtegido, { tipo: existente.materialTipo, qualidade: existente.materialQualidade, quantidade: existente.materialQuantidade }, !!existente.ehSaldo, existente.saldoValor, existente.quantidade, { subtipoPorte: existente.subtipoPorte, compartimentos: existente.compartimentos }, existente.maosNecessarias, existente.saldoNotas, existente.saldoMoedas, existente.quimico, existente.limitarRolagemPorNivel, existente.implante, existente.efeitosMedicos);
        el.modalEquipavel.checked = !!existente.equipavel;
        // Reavalia com o checkbox "equipável" já no valor certo (a
        // chamada acima roda antes dessa linha, então via com o valor
        // antigo/resetado) e reflete se o item já estava equipado.
        atualizarCampoJaEquipar();
        el.modalJaEquipar.checked = el.modalCampoJaEquipar.style.display !== "none" && !existente.dentroDe && !!existente.equipada;
    } else {
        el.modalNome.value = "";
        el.modalTag.value = "";
        limparImagemModal();
        el.modalPeso.value = 0;
        el.modalVolume.value = 0;
        popularSelectTamanho(el.modalTamanho, null);
        if (!ehBanco) {
            el.modalCategoriaItem.value = estado.categoriaInventarioAtiva || "levando";
            popularSelectGuardarDentro(null, "");
        } else {
            el.modalCategoriaBanco.value = "";
        }
        atualizarCamposPorTag("", null, null, null, null, null, null, null, null, null, null, false, 0, null, null, null);
        el.modalEquipavel.checked = false;
        el.modalJaEquipar.checked = false;
    }

    // Autocompletar pelo Banco Global — só ao CRIAR um item novo dentro
    // de uma ficha (não faz sentido nem no Banco em si, nem ao editar um
    // item que já existe: nesse caso o jogador está editando o que já
    // tem, não escolhendo um molde pra copiar).
    configurarAutocompleteItemBanco(!ehBanco && !existente);
}

// Liga/desliga o autocompletar de itens do Banco Global no campo Nome.
// Quando ligado, digitar no campo Nome mostra sugestões do banco; ao
// clicar numa sugestão, todos os outros campos do modal são preenchidos
// automaticamente a partir do molde salvo (tag, peso, perícia, arma...).
//
// Também mistura sugestões do Catálogo de Drogas (dados-manual.js,
// referência do manual) quando o texto digitado bate com o nome de uma
// substância conhecida — mas SÓ como ponto de partida: ao clicar, o
// efeito (buffs/debuffs) cai dentro da mesma caixa "Modificadores
// automáticos" (editável) que qualquer outro item usa, e o jogador/Mestre
// pode alterar, remover ou adicionar linhas livremente depois — nada
// fica travado/hardcoded no catálogo. Drogas homebrew que não existem
// no catálogo funcionam do mesmo jeito, só cadastrando os modificadores
// na mão.
function configurarAutocompleteItemBanco(ativo) {
    el.modalItemBancoOpcoes.style.display = "none";
    el.modalItemBancoOpcoes.innerHTML = "";
    el.modalNome.oninput = null;
    el.modalNome.onfocus = null;
    if (!ativo) return;

    const buscarDrogasCatalogo = (texto) => {
        const alvo = normalizarTextoBusca(texto);
        if (!alvo) return [];
        return CATALOGO_DROGAS.filter(d => normalizarTextoBusca(d.nome).includes(alvo)).slice(0, 8);
    };

    const renderSugestoes = () => {
        const encontrados = buscarItensGlobaisPorNome(estado.itensGlobaisCache, el.modalNome.value);
        const drogas = buscarDrogasCatalogo(el.modalNome.value);
        el.modalItemBancoOpcoes.innerHTML = "";
        if (!encontrados.length && !drogas.length) { el.modalItemBancoOpcoes.style.display = "none"; return; }
        encontrados.forEach(it => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${it.nome} — ${rotuloTag(it.tag)}`;
            div.addEventListener("click", () => {
                el.modalNome.value = it.nome;
                el.modalTag.value = it.tag || "";
                el.modalPeso.value = it.pesoUnitario ?? it.peso ?? 0;
                el.modalVolume.value = it.volumeUnitario ?? it.volume ?? 0;
                popularSelectTamanho(el.modalTamanho, it.tamanho);
                el.modalDescricao.value = it.descricao || "";
                montarListaModificadores(it.modificadores || []);
                atualizarCamposPorTag(it.tag, it.nivelTag, it.arma, it.periciaUso, it.classeProtecao, it.calibre, it.reducoesDano, it.carregador, it.projetil, it.localProtegido, { tipo: it.materialTipo, qualidade: it.materialQualidade, quantidade: it.materialQuantidade }, !!it.ehSaldo, it.saldoValor, it.quantidade, { subtipoPorte: it.subtipoPorte, compartimentos: it.compartimentos }, it.maosNecessarias, it.saldoNotas, it.saldoMoedas, it.quimico, it.limitarRolagemPorNivel, it.implante, it.efeitosMedicos);
                el.modalEquipavel.checked = !!it.equipavel;
                atualizarCampoJaEquipar();
                el.modalItemBancoOpcoes.style.display = "none";
                toast(`Preenchido a partir do Banco Global: "${it.nome}".`);
            });
            el.modalItemBancoOpcoes.appendChild(div);
        });
        drogas.forEach(d => {
            const div = document.createElement("div");
            div.className = "opcao";
            div.innerText = `${d.nome} — Catálogo de Drogas (sugestão, editável)`;
            div.addEventListener("click", () => {
                el.modalNome.value = d.nome;
                el.modalTag.value = "droga";
                atualizarCamposPorTag("droga", null, null, null, null, null, null, null, null, null, null, false, 0, null, null, null);
                const notas = [d.efeito, d.testeVicio ? `Vício: ${d.testeVicio}` : "", d.testeOverdose ? `Overdose: ${d.testeOverdose}` : ""].filter(Boolean).join("\n");
                el.modalDescricao.value = notas;
                montarListaModificadores(d.modificadores || []);
                el.modalItemBancoOpcoes.style.display = "none";
                toast(`Sugestão preenchida a partir do Catálogo de Drogas: "${d.nome}" — os modificadores abaixo continuam editáveis.`);
            });
            el.modalItemBancoOpcoes.appendChild(div);
        });
        el.modalItemBancoOpcoes.style.display = "block";
    };

    el.modalNome.oninput = renderSugestoes;
    el.modalNome.onfocus = () => { if (el.modalNome.value.trim()) renderSugestoes(); };
    document.addEventListener("click", (e) => {
        if (!el.modalNome.contains(e.target) && !el.modalItemBancoOpcoes.contains(e.target)) {
            el.modalItemBancoOpcoes.style.display = "none";
        }
    });
}

function popularClassesProtecao(classeAtual) {
    el.modalClasseProtecao.innerHTML = "";
    CLASSES_PROTECAO.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.innerText = c.label;
        el.modalClasseProtecao.appendChild(opt);
    });
    el.modalClasseProtecao.value = (classeAtual && CLASSES_PROTECAO.some(c => c.key === classeAtual)) ? classeAtual : CLASSES_PROTECAO[0].key;
}

// Popula o select de Calibre com só os calibres da Classe de Proteção
// atualmente selecionada no campo acima.
function popularCalibres(classeKey, calibreAtual) {
    el.modalCalibre.innerHTML = "";
    const opcoes = calibresPorClasse(classeKey);
    opcoes.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.key;
        opt.innerText = c.label;
        el.modalCalibre.appendChild(opt);
    });
    el.modalCalibre.value = (calibreAtual && opcoes.some(c => c.key === calibreAtual)) ? calibreAtual : (opcoes[0]?.key || "");
}

// Reavalia se o campo "Classe de Proteção" deve aparecer, olhando o
// estado atual dos outros campos do modal (tag + perícia vinculada
// selecionada). Chamada tanto ao abrir o modal quanto sempre que a tag
// ou a perícia da arma mudam. Colete sempre exige; arma de fogo também
// exige (é o que determina contra qual colete ela é eficaz — dano x
// colete).
export function atualizarVisibilidadeClasseProtecao(classeAtual) {
    const tagKey = el.modalTag.value;
    const periciaAtual = el.modalCampoPericiaUso.style.display !== "none" ? el.modalPericiaUso.value : null;
    const exige = tagExigeClasseProtecao(tagKey, periciaAtual);
    el.modalCampoClasseProtecao.style.display = exige ? "flex" : "none";
    if (exige) popularClassesProtecao(classeAtual);
}

// Reavalia se o campo "Calibre" (abaixo da Classe de Proteção) deve
// aparecer — só pra carregador, projétil e arma de fogo (colete usa só
// a Classe). As opções vêm filtradas pela Classe de Proteção escolhida
// no campo acima; ao trocar a classe, o calibre é repopulado do zero.
export function atualizarVisibilidadeCalibre(calibreAtual) {
    const tagKey = el.modalTag.value;
    const periciaAtual = el.modalCampoPericiaUso.style.display !== "none" ? el.modalPericiaUso.value : null;
    const exige = tagUsaCalibreEspecifico(tagKey, periciaAtual);
    el.modalCampoCalibre.style.display = exige ? "flex" : "none";
    if (exige) popularCalibres(el.modalClasseProtecao.value, calibreAtual);
}

// Reavalia se o bloco "Características de Arma de Fogo" deve aparecer:
// só quando a tag é Arma E a perícia vinculada selecionada é uma das
// perícias de Arma de Fogo (pequeno/médio/grande porte). Chamada ao
// abrir o modal e sempre que a perícia vinculada mudar.
export function atualizarVisibilidadeArmaFogo(armaConfig) {
    const tagKey = el.modalTag.value;
    const periciaAtual = el.modalCampoPericiaUso.style.display !== "none" ? el.modalPericiaUso.value : null;
    const ehFogo = ehArma(tagKey) && ehArmaDeFogo(periciaAtual);
    el.modalConfigArmaFogo.style.display = ehFogo ? "block" : "none";
    // Escala de arma é conceito de combate corpo a corpo — não faz
    // sentido pra arma de fogo, então some quando o bloco de fogo aparece.
    if (ehFogo) el.modalCampoEscala.style.display = "none";
    else if (ehArma(tagKey)) el.modalCampoEscala.style.display = "flex";

    if (ehFogo) {
        const cfg = armaConfig || {};
        el.modalArmaCapacidade.value = cfg.capacidade ?? 0;
        el.modalArmaDisparosTurno.value = cfg.disparosPorTurno ?? 1;
        el.modalArmaPrecisao.value = cfg.precisao ?? 0;
        el.modalArmaDificuldadeAcerto.value = cfg.dificuldadeAcerto ?? 14;
        el.modalArmaAlcance.value = (cfg.alcance && ALCANCES_ARMA_FOGO.some(a => a.key === cfg.alcance)) ? cfg.alcance : ALCANCES_ARMA_FOGO[0].key;
        el.modalArmaRecuo.value = (cfg.recuo && PADROES_RECUO.some(p => p.key === cfg.recuo)) ? cfg.recuo : PADROES_RECUO[0].key;
        el.modalArmaEfeitoExtra.value = cfg.efeitoExtra || "";

        // "Usa carregador?" agora é escolha explícita (checkbox), não mais
        // automática por calibre — ver armaUsaCarregador em ficha.js. Item
        // sem esse campo ainda gravado (criado antes dele existir) cai no
        // fallback de sempre: só escopeta (12 gauge) não usava carregador.
        const calibreArmaAtual = (el.modalCampoCalibre.style.display !== "none") ? el.modalCalibre.value : null;
        if (el.modalArmaUsaCarregador) {
            el.modalArmaUsaCarregador.checked = (typeof cfg.usaCarregador === "boolean") ? cfg.usaCarregador : !ehCalibreEscopeta(calibreArmaAtual);
        }
        if (el.modalArmaTemCamaraExtra) el.modalArmaTemCamaraExtra.checked = !!cfg.temCamaraExtra;
        atualizarVisibilidadeCamposCarregador(cfg.carregadorId);
    }
}

// Mostra/esconde "Capacidade +1" e "Carregador anexado" conforme o
// checkbox "Usa carregador?" — e, se o carregador anexado ficar visível,
// repopula o select com os carregadores compatíveis do calibre atual.
function atualizarVisibilidadeCamposCarregador(carregadorIdAtual) {
    const usaCarregador = el.modalArmaUsaCarregador ? el.modalArmaUsaCarregador.checked : true;
    if (el.modalCampoArmaCamaraExtra) el.modalCampoArmaCamaraExtra.style.display = usaCarregador ? "flex" : "none";
    if (!usaCarregador && el.modalArmaTemCamaraExtra) el.modalArmaTemCamaraExtra.checked = false;
    if (el.modalCampoArmaCarregador) el.modalCampoArmaCarregador.style.display = usaCarregador ? "flex" : "none";
    if (usaCarregador) popularCarregadorAnexado(carregadorIdAtual);
}
document.getElementById("modal-arma-usa-carregador")?.addEventListener("change", () => {
    if (el.modalConfigArmaFogo.style.display === "none") return;
    atualizarVisibilidadeCamposCarregador(null);
});

// Popula o select "Carregador anexado" só com carregadores do inventário
// que casam com o Calibre específico selecionado na arma (campo próprio,
// abaixo da Classe de Proteção). Se o calibre ainda não tiver sido
// escolhido, mostra todos os carregadores do inventário.
function popularCarregadorAnexado(carregadorIdAtual) {
    if (!el.modalArmaCarregador) return;
    const calibreArma = (el.modalCampoCalibre.style.display !== "none") ? el.modalCalibre.value : null;
    const carregadores = listaCarregadoresInventario(estado.fichaAtual, calibreArma);
    el.modalArmaCarregador.innerHTML = "";
    const optNenhum = document.createElement("option");
    optNenhum.value = "";
    optNenhum.innerText = "Nenhum (arma descarregada)";
    el.modalArmaCarregador.appendChild(optNenhum);
    carregadores.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.id;
        const municao = c.carregador?.municaoAtual ?? 0;
        const capacidade = c.carregador?.capacidadeMax ?? 0;
        opt.innerText = `${c.nome} (${municao}/${capacidade})`;
        el.modalArmaCarregador.appendChild(opt);
    });
    el.modalArmaCarregador.value = (carregadorIdAtual && carregadores.some(c => c.id === carregadorIdAtual)) ? carregadorIdAtual : "";
}

// Trocar a Classe de Proteção repopula as opções de Calibre (o calibre
// escolhido antes pode não pertencer mais à nova classe).
document.getElementById("modal-classe-protecao")?.addEventListener("change", () => {
    atualizarVisibilidadeCalibre(null);
});

// Trocar o Calibre da arma reavalia quais carregadores aparecem como
// compatíveis no select "Carregador anexado" (só repopula se o campo
// estiver visível — depende do checkbox "Usa carregador?").
document.getElementById("modal-calibre")?.addEventListener("change", () => {
    if (el.modalConfigArmaFogo.style.display === "none") return;
    if (el.modalCampoArmaCarregador && el.modalCampoArmaCarregador.style.display !== "none") popularCarregadorAnexado(null);
    // Sugestão de default do checkbox "Dilacera" (item 7 do plano de
    // saúde/complicações) — só reaplica a sugestão quando o calibre
    // muda DE VERDADE nesta sessão do modal; a checkbox continua
    // 100% editável na sequência.
    if (el.modalArmaDilacera && el.modalCampoDilacera.style.display !== "none") {
        el.modalArmaDilacera.checked = calibreSugereDilacera(el.modalCalibre.value);
    }
});

// Monta a lista de checkboxes "Tipos de dano reduzidos" + valor de
// redução por tipo, pré-marcando os que já estavam salvos no item.
export function montarReducaoDanoChecklist(reducoesAtuais) {
    const mapaAtual = {};
    (reducoesAtuais || []).forEach(r => { mapaAtual[r.tipo] = r.valor; });

    el.modalReducaoDanoLista.innerHTML = "";
    TIPOS_DANO.forEach(t => {
        const linha = document.createElement("div");
        linha.className = "reducao-dano-linha";
        const marcado = Object.prototype.hasOwnProperty.call(mapaAtual, t.key);
        linha.innerHTML = `
            <label>
                <input type="checkbox" class="reducao-dano-check" data-tipo="${t.key}" ${marcado ? "checked" : ""}>
                ${escapeHtml(t.label)}
            </label>
            <input type="number" class="reducao-dano-valor" data-tipo="${t.key}" min="0" step="1" value="${marcado ? mapaAtual[t.key] : 0}" ${marcado ? "" : "disabled"}>
        `;
        const chk = linha.querySelector(".reducao-dano-check");
        const valorInput = linha.querySelector(".reducao-dano-valor");
        chk.addEventListener("change", () => { valorInput.disabled = !chk.checked; });
        el.modalReducaoDanoLista.appendChild(linha);
    });
}

// Lê o checklist de redução de dano e monta o array pra salvar no item.
export function lerReducaoDanoDoModal() {
    const linhas = el.modalReducaoDanoLista.querySelectorAll(".reducao-dano-linha");
    const resultado = [];
    linhas.forEach(linha => {
        const chk = linha.querySelector(".reducao-dano-check");
        const valorInput = linha.querySelector(".reducao-dano-valor");
        if (chk.checked) {
            const valor = Number(valorInput.value) || 0;
            if (valor > 0) resultado.push({ tipo: chk.dataset.tipo, valor });
        }
    });
    return resultado;
}

// "Instalar em veículo" (Fase 5c do plano — ver plano-acessorios-veiculo.txt,
// seção "FASE 5c"): campo opcional no modal de item, só pra tag "arma".
// Só faz sentido pra um item que JÁ EXISTE de verdade dentro de uma
// ficha (não no Banco Global — item de banco não pertence a nenhuma
// ficha/veículo ainda; não pra item sendo CRIADO agora — ainda não tem
// id gravado pra virar o ponteiro item.instaladoEmVeiculoId). Um item
// novo continua podendo ser montado depois, tanto reabrindo este modal
// de edição quanto pelo botão "+ Instalar Arma do Inventário" no card
// do veículo (mesmo fluxo, caminho alternativo).
//
// Lista só os veículos que TÊM slot livre suficiente pro nível atual do
// select "Nível da tag" acima (mesma régua de instalarArmaNoVeiculo,
// regras.js) — ou o veículo onde a arma já está montada agora (sempre
// aparece, mesmo sem folga, pra não "sumir" a opção de deixar como
// está). Trocar o Nível da tag reavalia a lista (ver listener em
// modal-nivel-tag, mais abaixo).
export function atualizarCampoInstalarVeiculo() {
    const tagKey = el.modalTag.value;
    const ehBancoAtual = !!(estado.modalContexto && estado.modalContexto.lista === "itensGlobais");
    const itemId = estado.modalContexto ? estado.modalContexto.id : null;
    const mostrar = tagKey === "arma" && !ehBancoAtual && !!itemId && !!estado.fichaAtual;
    el.modalCampoInstalarVeiculo.style.display = mostrar ? "flex" : "none";
    if (!mostrar) {
        el.modalInstalarVeiculo.innerHTML = '<option value="">-- não montada em nenhum veículo --</option>';
        return;
    }

    const itemAtual = estado.fichaAtual.inventario && estado.fichaAtual.inventario[itemId];
    const instaladoAtualId = itemAtual ? itemAtual.instaladoEmVeiculoId : null;
    const nivelSelecionado = Number(el.modalNivelTag.value) || 1;
    const veiculos = estado.fichaAtual.veiculos || {};

    const opcoes = ['<option value="">-- não montada em nenhum veículo --</option>'];
    Object.entries(veiculos).forEach(([veiculoId, v]) => {
        const ehVeiculoAtual = veiculoId === instaladoAtualId;
        // Não conta o próprio item contra si mesmo — senão ele nunca
        // "caberia de volta" no veículo onde já está montado.
        const itensArmaInstalados = itensArmaInstaladosEmVeiculo(estado.fichaAtual.inventario, veiculoId)
            .filter(a => a.id !== itemId);
        const cabe = ehVeiculoAtual || instalarArmaNoVeiculo({ nivelTag: nivelSelecionado }, v, itensArmaInstalados);
        if (!cabe) return;
        const livres = slotsAcessoriosLivres(v, itensArmaInstalados);
        opcoes.push(`<option value="${veiculoId}">${escapeHtml(v.nome || "(sem nome)")} — ${livres} slot(s) livre(s)</option>`);
    });
    el.modalInstalarVeiculo.innerHTML = opcoes.join("");
    el.modalInstalarVeiculo.value = instaladoAtualId || "";
}

// Mostra o campo "Já entra equipado" quando o item sendo montado no
// modal tem algum lugar físico válido pra existir solto em "levando":
// arma/explosivo (sempre equipável), recipiente cujo subtipo de porte
// é vestido/carregado (roupa, cinto, mochila, bolsa de mão — mesma
// lista aceita por itemPodeSerLevadoSolto em inventario.js), ou
// QUALQUER outro item comum — a mão aceita qualquer item solto, marcado
// "equipável" ou não (ver itemPodeEquipar/itemPodeSerLevadoSolto em
// inventario.js: "equipável" hoje só trava se o item PRECISA estar
// equipado pra poder ser usado, não se ele PODE ir pra mão). Desmarca o
// checkbox sempre que o campo some, pra não guardar uma escolha
// "fantasma" de quando ele ainda estava visível.
export function atualizarCampoJaEquipar() {
    const tagKey = el.modalTag.value;
    const elegivel = !tagKey ? false
        : ehContainer(tagKey) ? ["roupa", "cinto", "mochila", "bolsa_mao"].includes(el.modalSubtipoPorte.value)
        : true; // arma/explosivo ou qualquer item comum — todos podem ir pra mão
    el.modalCampoJaEquipar.style.display = elegivel ? "flex" : "none";
    if (!elegivel) el.modalJaEquipar.checked = false;
}

document.getElementById("modal-tag")?.addEventListener("change", (e) => {
    atualizarCamposPorTag(e.target.value, null, null, null, null, null, null, null, null, null, null, false, 0, null, null, null);
});

// "Instalar em veículo" (Fase 5c do plano) reavalia quando o Nível da
// tag muda — o nível é o que decide quantos slots a arma ocupa.
document.getElementById("modal-nivel-tag")?.addEventListener("change", () => {
    if (el.modalTag.value === "arma") atualizarCampoInstalarVeiculo();
    // Tomada/Chip (manual pg. 84): slots da Tomada e efeito do Chip
    // dependem diretamente do Nível — recalcula o sub-bloco (ver
    // atualizarBlocoSubtipoImplante) toda vez que ele muda.
    if (el.modalTag.value === "biomecanica") atualizarBlocoSubtipoImplante(null);
});

document.getElementById("modal-equipavel")?.addEventListener("change", atualizarCampoJaEquipar);
document.getElementById("modal-subtipo-porte")?.addEventListener("change", atualizarCampoJaEquipar);

document.getElementById("modal-item-eh-saldo")?.addEventListener("change", (e) => {
    const saldoEhEletronico = el.modalTag.value === "eletronico";
    document.getElementById("modal-item-saldo-valor-bloco").style.display = (e.target.checked && !saldoEhEletronico) ? "block" : "none";
    document.getElementById("modal-item-saldo-eletronico-bloco").style.display = (e.target.checked && saldoEhEletronico) ? "block" : "none";
});

// Recalcula e mostra o "Peso total" (Peso unitário × Quantidade) ao
// vivo, enquanto o jogador digita — ver tagTemQuantidadeGeral em
// dados-manual.js. Só é chamada quando o campo de quantidade está
// visível (item de uma tag que aceita quantidade genérica).
export function atualizarPesoTotalModal() {
    const unitario = Math.max(0, Number(el.modalPeso.value) || 0);
    const volumeUnitario = Math.max(0, Number(el.modalVolume.value) || 0);
    const quantidade = Math.max(1, Number(el.modalQuantidade.value) || 1);
    el.modalQuantidadePesoTotal.textContent = `Peso total: ${(unitario * quantidade).toFixed(2).replace(/\.?0+$/, "") || "0"} kg`;
    el.modalQuantidadeVolumeTotal.textContent = `Volume total: ${(volumeUnitario * quantidade).toFixed(2).replace(/\.?0+$/, "") || "0"}`;
}
document.getElementById("modal-peso")?.addEventListener("input", () => {
    if (el.modalCampoQuantidade.style.display !== "none") atualizarPesoTotalModal();
});
document.getElementById("modal-volume")?.addEventListener("input", () => {
    if (el.modalCampoQuantidade.style.display !== "none") atualizarPesoTotalModal();
    if (el.modalCampoProjetilQuantidade.style.display !== "none") atualizarVolumeTotalProjetilModal();
});
document.getElementById("modal-quantidade")?.addEventListener("input", () => {
    if (Number(el.modalQuantidade.value) < 1) el.modalQuantidade.value = 1;
    atualizarPesoTotalModal();
});

// Volume total de munição (Fase 4) — mesma fórmula de "unitário ×
// quantidade" de sempre, mas puxando a quantidade do campo aninhado
// próprio de projétil (modal-projetil-quantidade), não do campo de
// quantidade genérico (que fica escondido pra essa tag — ver
// tagTemQuantidadeGeral em dados-manual.js). Math.floor é o que faz o
// "estoque pequeno não ocupa espaço" acontecer sozinho: volumeUnitario
// baixo (ex.: 0.1) vezes poucas balas arredonda pra 0, sem precisar de
// nenhum if especial pra "abaixo de N não conta".
export function atualizarVolumeTotalProjetilModal() {
    const volumeUnitario = Math.max(0, Number(el.modalVolume.value) || 0);
    const quantidadeProjetil = Math.max(0, Number(el.modalProjetilQuantidade.value) || 0);
    el.modalProjetilVolumeTotal.textContent = `Volume total: ${Math.floor(volumeUnitario * quantidadeProjetil)}`;
}
document.getElementById("modal-projetil-quantidade")?.addEventListener("input", () => {
    if (Number(el.modalProjetilQuantidade.value) < 0) el.modalProjetilQuantidade.value = 0;
    atualizarVolumeTotalProjetilModal();
});

// Repopula o select de Qualidade conforme o Tipo de material escolhido
// (alguns materiais não têm variação de qualidade — ver MATERIAIS_CRIACAO
// em dados-manual.js — nesse caso o campo some).
export function atualizarCampoQualidadeMaterial(tipoMaterial, qualidadeAtual) {
    const qualidades = qualidadesDoMaterial(tipoMaterial);
    el.modalCampoMaterialQualidade.style.display = qualidades ? "flex" : "none";
    if (!qualidades) { el.modalMaterialQualidade.innerHTML = ""; return; }
    el.modalMaterialQualidade.innerHTML = "";
    qualidades.forEach(q => {
        const opt = document.createElement("option");
        opt.value = q;
        opt.innerText = q;
        el.modalMaterialQualidade.appendChild(opt);
    });
    el.modalMaterialQualidade.value = qualidades.includes(qualidadeAtual) ? qualidadeAtual : qualidades[0];
}

document.getElementById("modal-material-tipo")?.addEventListener("change", (e) => {
    atualizarCampoQualidadeMaterial(e.target.value, null);
});

// Trocar a perícia vinculada de uma arma (ex: de "CQC" pra "Armas de
// Fogo de Pequeno Porte") pode ligar/desligar a exigência de Classe de
// Proteção, Calibre e o bloco de Arma de Fogo sem precisar trocar a tag
// — reavalia os três na hora.
document.getElementById("modal-pericia-uso")?.addEventListener("change", (e) => {
    atualizarVisibilidadeClasseProtecao(null);
    atualizarVisibilidadeCalibre(null);
    atualizarVisibilidadeArmaFogo(null);
    // Tipo de dano extra só aparece pra arma branca (ver atualizarCamposPorTag).
    const ehArmaBrancaAgora = ehArma(el.modalTag.value) && !ehArmaDeFogo(e.target.value);
    el.modalCampoTipoDanoExtra.style.display = ehArmaBrancaAgora ? "flex" : "none";
    if (!ehArmaBrancaAgora) el.modalArmaTipoDanoExtra.value = "";
    // "Dilacera em golpe normal" segue a mesma regra (só arma branca) —
    // ver atualizarCamposPorTag.
    if (el.modalCampoDilaceraGolpeNormal) {
        el.modalCampoDilaceraGolpeNormal.style.display = ehArmaBrancaAgora ? "flex" : "none";
        if (!ehArmaBrancaAgora) el.modalArmaDilaceraGolpeNormal.checked = false;
    }
});

// ---------------------------------------------------------------------
// Modal: GASTO EXTRA — nome, descrição, valor (reaproveita "nível" como valor)
// ---------------------------------------------------------------------
function prepararModalGasto(existente) {
    el.modalCampoNivel.style.display = "flex";
    document.querySelector('label[for="modal-nivel"]').innerText = "Valor (CN$)";
    el.modalNivel.min = 0; el.modalNivel.max = 99999;
    if (existente) {
        el.modalNome.value = existente.nome || "";
        el.modalNivel.value = existente.valor ?? 0;
    } else {
        el.modalNome.value = "";
        el.modalNivel.value = 0;
    }
}

// ---------------------------------------------------------------------
// Modal: VEÍCULO — nome livre + tipo (periodicidade) + os 5 atributos
// com escala fixa (ver plano-veiculos.txt, fase 5). Sem descrição nem
// modificadores estruturados: esses dois campos ficam escondidos (ver
// esconderTodosCamposEspeciais) porque não fazem parte do modelo de
// dados de Veículo — os efeitos derivados vêm de calcularModificadoresVeiculo
// (regras.js), não do sistema genérico de modificadores.
// ---------------------------------------------------------------------
function prepararModalVeiculo(existente) {
    el.modalCampoTipoVeiculo.style.display = "flex";
    el.modalConfigVeiculo.style.display = "block";
    el.modalSecaoNarrativa.style.display = "none";

    el.modalNome.value = existente ? (existente.nome || "") : "";

    if (!el.modalTipoVeiculo.options.length) {
        el.modalTipoVeiculo.innerHTML = TIPOS_VEICULO.map(t => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join("");
    }
    el.modalTipoVeiculo.value = existente ? (existente.tipo || "pessoal") : "pessoal";

    const atributosExistentes = existente ? (existente.atributos || {}) : {};
    el.modalVeiculoAtributos.innerHTML = ATRIBUTOS_VEICULO.map(chave => {
        const escala = escalaVeiculo(chave);
        const nivelAtual = Number(atributosExistentes[chave]) || 0;
        const opcoes = escala.niveis.map(n => `<option value="${n.nivel}" ${n.nivel === nivelAtual ? "selected" : ""}>${n.nivel} — ${escapeHtml(n.efeito)}</option>`).join("");
        return `
            <div class="modal-field">
                <label for="modal-veiculo-attr-${chave}">${escapeHtml(escala.label)}</label>
                <select id="modal-veiculo-attr-${chave}" data-veiculo-atributo="${chave}">${opcoes}</select>
            </div>
        `;
    }).join("");

    // Trava (ver plano-veiculos.txt, adendo "chave"): só faz sentido
    // mexer nisso editando um veículo que já existe — veículo novo
    // sempre nasce trancado, com chave nova criada junto (ver
    // salvarVeiculoDoModal), então não tem o que escolher aqui ainda.
    // "Repor chave" cobre o caso de a chave original ter sido perdida
    // (destruída, dada pro NPC errado, etc.) sem precisar apagar e
    // recriar o veículo inteiro.
    // Remove um campo de trava deixado por uma edição anterior (senão
    // abrir o modal pra um segundo veículo empilha um segundo checkbox
    // com o mesmo id, e getElementById só acha o primeiro — bug clássico
    // de innerHTML acumulando em vez de substituir).
    const campoTrancaAnterior = el.modalConfigVeiculo.querySelector("[data-veiculo-campo-tranca]");
    if (campoTrancaAnterior) campoTrancaAnterior.remove();

    if (existente) {
        el.modalConfigVeiculo.insertAdjacentHTML("beforeend", `
            <div class="modal-field" data-veiculo-campo-tranca>
                <label><input type="checkbox" id="modal-veiculo-trancado" ${existente.trancado ? "checked" : ""}> Veículo trancado</label>
                <button type="button" class="btn-ghost" id="btn-repor-chave-veiculo">Repor chave perdida</button>
            </div>
        `);
        document.getElementById("btn-repor-chave-veiculo").addEventListener("click", () => reporChaveVeiculo(estado.modalContexto?.id));
    }
}

// Repor chave perdida (Mestre) — cria um NOVO item "chave" no
// inventário desta ficha apontando pro mesmo veículo. Não mexe no
// item antigo (se ele ainda existir em algum canto, continua também
// funcionando — veiculoTemChaveDisponivel em regras.js não se importa
// com QUANTAS chaves existem, só se existe pelo menos uma).
async function reporChaveVeiculo(veiculoId) {
    if (!estado.isMestre || !veiculoId || !estado.fichaAtual) return;
    const v = estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[veiculoId];
    if (!v) return;
    const novaChaveId = gerarIdLocal();
    const novaChave = {
        nome: `Chave: ${v.nome}`, descricao: "", modificadores: [], ativo: true,
        tag: "chave", nivelTag: null, peso: 0.05, pesoUnitario: null, volume: 0, volumeUnitario: null,
        tamanho: "pequeno", capacidadeVolume: null, tamanhoMaximoAceito: null, quantidade: null,
        categoria: "levando", dentroDe: null, periciaUso: null, ehSaldo: false, saldoValor: 0,
        classeProtecao: null, calibre: null, reducoesDano: [], localProtegido: null, arma: null,
        carregador: null, projetil: null, equipavel: false, equipada: false,
        materialTipo: null, materialQualidade: null, materialQuantidade: null,
        veiculoId
    };
    if (!estado.fichaAtual.inventario) estado.fichaAtual.inventario = {};
    estado.fichaAtual.inventario[novaChaveId] = novaChave;
    await update(ref(db, `${caminhoBase()}/inventario/${novaChaveId}`), novaChave);
    toast("Nova chave criada no inventário.");
}

// ---------------------------------------------------------------------
// Modificadores automáticos (linhas dinâmicas: alvo + valor)
// ---------------------------------------------------------------------
function montarListaModificadores(mods) {
    el.modalListaModificadores.innerHTML = "";
    mods.forEach(m => adicionarLinhaModificador(m.alvo, m.valor, !!m.ocasional, !!m.ativoOcasional));
}

function adicionarLinhaModificador(alvoSelecionado, valorAtual, ocasionalAtual = false, ativoOcasionalAtual = false) {
    const fragmento = el.templateModificador.content.cloneNode(true);
    const row = fragmento.querySelector(".modificador-row");
    const select = row.querySelector(".mod-alvo");
    const input = row.querySelector(".mod-valor");
    const checkboxOcasional = row.querySelector(".mod-ocasional");
    const btnRemover = row.querySelector(".mod-remover");
    // Guardado só pra devolver sem perda em lerModificadoresDoModal caso
    // o jogador reabra o modal (ex.: pra editar a descrição) e salve de
    // novo sem mexer no checkbox "Ocasião especial" — o estado ligado/
    // desligado do toggle na perícia não deveria resetar por isso.
    row.dataset.ativoOcasional = ativoOcasionalAtual ? "1" : "";

    // estado.fichaAtual pode ser null aqui (Mestre criando item direto no Banco
    // Global sem nenhuma ficha aberta) — sem essa proteção, o acesso a
    // .pericias quebrava a função inteira. Também não é mais a fonte
    // principal das perícias oferecidas no seletor: listaAlvosModificador
    // (regras.js) já usa o catálogo fechado do manual por padrão, isso
    // aqui só cobre o caso raro de a ficha ter algum nome fora do catálogo.
    const pericias = Object.values((estado.fichaAtual && estado.fichaAtual.pericias) || {});
    listaAlvosModificador(pericias).forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.value;
        opt.innerText = a.label;
        select.appendChild(opt);
    });
    if (alvoSelecionado) select.value = alvoSelecionado;
    input.value = valorAtual ?? 0;
    checkboxOcasional.checked = !!ocasionalAtual;
    btnRemover.addEventListener("click", () => row.remove());

    el.modalListaModificadores.appendChild(row);
}

function configurarModificadoresGenerico() {
    document.getElementById("modal-add-modificador").addEventListener("click", () => adicionarLinhaModificador("", 0));
}

export function lerModificadoresDoModal() {
    const linhas = el.modalListaModificadores.querySelectorAll(".modificador-row");
    const lista = [];
    linhas.forEach(row => {
        const alvo = row.querySelector(".mod-alvo").value;
        const valor = Number(row.querySelector(".mod-valor").value) || 0;
        const ocasional = row.querySelector(".mod-ocasional").checked;
        if (!alvo || valor === 0) return;
        // `ativoOcasional` (se o checkbox da perícia já estava ligado) só
        // é preservado quando o modificador continua marcado como
        // ocasional — largar a marcação "Ocasião especial" no modal deve
        // voltar o bônus a valer sempre, sem sobra de estado escondido.
        lista.push(ocasional ? { alvo, valor, ocasional: true, ativoOcasional: !!row.dataset.ativoOcasional } : { alvo, valor });
    });
    return lista;
}

// ---------------------------------------------------------------------
// Modificações de arma (linhas de texto livre, com sugestões do manual)
// ---------------------------------------------------------------------
export function montarModificacoesArma(lista) {
    el.modalArmaModificacoesLista.innerHTML = "";
    lista.forEach(texto => adicionarLinhaModificacaoArma(texto));
}

function adicionarLinhaModificacaoArma(textoAtual) {
    const fragmento = el.templateModificacaoArma.content.cloneNode(true);
    const row = fragmento.querySelector(".modificacao-arma-row");
    const input = row.querySelector(".modarma-texto");
    const btnRemover = row.querySelector(".modarma-remover");
    input.value = textoAtual || "";
    input.setAttribute("list", "lista-sugestoes-modificacao-arma");
    btnRemover.addEventListener("click", () => row.remove());
    el.modalArmaModificacoesLista.appendChild(row);
}

function configurarModificacoesArma() {
    // datalist de sugestões (HTML5 nativo, leve)
    if (!document.getElementById("lista-sugestoes-modificacao-arma")) {
        const datalist = document.createElement("datalist");
        datalist.id = "lista-sugestoes-modificacao-arma";
        MODIFICACOES_ARMA_SUGERIDAS.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s;
            datalist.appendChild(opt);
        });
        document.body.appendChild(datalist);
    }
    el.modalArmaAddModificacao.addEventListener("click", () => adicionarLinhaModificacaoArma(""));
}

// ---------------------------------------------------------------------
// Efeitos de Equipamento Médico (Fase 3 — ver plano-efeitos-
// equipamentos-medicos.txt). Cada linha guarda `{ tipo, ...parâmetros }`
// — `tipo` é uma key de CATALOGO_EFEITOS_MEDICOS (dados-manual.js) e os
// parâmetros seguem o schema `campos` daquela entrada do catálogo. Igual
// a "Modificadores automáticos", só que aqui os CAMPOS de cada linha
// mudam dinamicamente conforme o tipo escolhido no select.
// ---------------------------------------------------------------------

// Desenha os campos de uma linha de efeito médico dentro de `container`
// (o .efmed-campos daquela linha), a partir do `campos` do catálogo
// (efeitoDef.campos) e dos valores já salvos (valoresAtuais — objeto
// plano, ex: {tratamentos: [...], valor: 2}). Chamada tanto ao montar
// uma linha existente (valores do item salvo) quanto ao trocar o tipo
// no select (valores em branco, efeito novo).
function renderizarCamposEfeitoMedico(container, efeitoDef, valoresAtuais) {
    container.innerHTML = "";
    if (!efeitoDef) return;
    const valores = valoresAtuais || {};
    efeitoDef.campos.forEach(campo => {
        const wrapper = document.createElement("div");
        wrapper.className = "efmed-campo";
        wrapper.dataset.chave = campo.chave;
        const label = document.createElement("label");
        label.innerText = campo.label;
        wrapper.appendChild(label);

        if (campo.tipo === "multiselect_tratamento" || campo.tipo === "multiselect_tipo_ferida") {
            // Checklist de checkboxes — chaves de TRATAMENTOS_FERIDA_MEDICO
            // ou TIPOS_FERIDA_MEDICO (dados-manual.js), conforme o tipo do
            // campo pedido pelo catálogo.
            const opcoes = campo.tipo === "multiselect_tratamento" ? TRATAMENTOS_FERIDA_MEDICO : TIPOS_FERIDA_MEDICO;
            const marcadas = Array.isArray(valores[campo.chave]) ? valores[campo.chave] : [];
            const checklist = document.createElement("div");
            checklist.className = "efmed-checklist";
            opcoes.forEach(op => {
                const lbl = document.createElement("label");
                const input = document.createElement("input");
                input.type = "checkbox";
                input.className = "efmed-check";
                input.value = op.key;
                input.checked = marcadas.includes(op.key);
                lbl.appendChild(input);
                lbl.appendChild(document.createTextNode(` ${op.label}`));
                checklist.appendChild(lbl);
            });
            wrapper.appendChild(checklist);
        } else if (campo.tipo === "numero") {
            const input = document.createElement("input");
            input.type = "number";
            input.step = "any";
            input.className = "efmed-numero";
            input.value = valores[campo.chave] ?? 0;
            wrapper.appendChild(input);
        } else if (campo.tipo === "lista_modificadores") {
            // Sub-editor de modificadores (mesmo formato {alvo, valor} de
            // item.modificadores) — usado pelo efeito "Modificador
            // temporário". Lista própria, independente da lista de
            // "Modificadores automáticos" do item.
            const lista = document.createElement("div");
            lista.className = "efmed-lista-modificadores";
            const mods = Array.isArray(valores[campo.chave]) ? valores[campo.chave] : [];
            mods.forEach(m => adicionarLinhaEfmedModificador(lista, m.alvo, m.valor));
            const btnAdd = document.createElement("button");
            btnAdd.type = "button";
            btnAdd.className = "btn-blue";
            btnAdd.innerText = "+ Adicionar modificador";
            btnAdd.addEventListener("click", () => adicionarLinhaEfmedModificador(lista, "", 0));
            wrapper.appendChild(lista);
            wrapper.appendChild(btnAdd);
        }
        container.appendChild(wrapper);
    });
}

// Uma linha do sub-editor "modificadores" (campo lista_modificadores) —
// igual a adicionarLinhaModificador, mas sem o checkbox "Ocasião
// especial" (não faz sentido pra um efeito já temporário/condicionado
// ao uso do item) e presa dentro do container da própria linha de
// efeito, não em el.modalListaModificadores.
function adicionarLinhaEfmedModificador(container, alvoSelecionado, valorAtual) {
    const fragmento = el.templateEfmedModificador.content.cloneNode(true);
    const row = fragmento.querySelector(".efmed-mod-row");
    const select = row.querySelector(".efmed-mod-alvo");
    const input = row.querySelector(".efmed-mod-valor");
    const btnRemover = row.querySelector(".efmed-mod-remover");
    const pericias = Object.values((estado.fichaAtual && estado.fichaAtual.pericias) || {});
    listaAlvosModificador(pericias).forEach(a => {
        const opt = document.createElement("option");
        opt.value = a.value;
        opt.innerText = a.label;
        select.appendChild(opt);
    });
    if (alvoSelecionado) select.value = alvoSelecionado;
    input.value = valorAtual ?? 0;
    btnRemover.addEventListener("click", () => row.remove());
    container.appendChild(row);
}

// Uma linha completa de efeito médico: select do tipo + campos
// dinâmicos + botão remover. `efeitoAtual` é o objeto já salvo (ou null
// pra linha nova, que nasce no primeiro tipo do catálogo).
function adicionarLinhaEfeitoMedico(efeitoAtual) {
    const fragmento = el.templateEfeitoMedico.content.cloneNode(true);
    const row = fragmento.querySelector(".efeito-medico-row");
    const select = row.querySelector(".efmed-tipo");
    const descricao = row.querySelector(".efmed-descricao");
    const camposContainer = row.querySelector(".efmed-campos");
    const btnRemover = row.querySelector(".efmed-remover");

    CATALOGO_EFEITOS_MEDICOS.forEach(ef => {
        const opt = document.createElement("option");
        opt.value = ef.key;
        opt.innerText = ef.label;
        select.appendChild(opt);
    });

    const tipoSalvo = efeitoAtual && efeitoAtual.tipo && efeitoMedicoPorKey(efeitoAtual.tipo) ? efeitoAtual.tipo : null;
    select.value = tipoSalvo || CATALOGO_EFEITOS_MEDICOS[0].key;

    const atualizarDescricaoECampos = (valoresAtuais) => {
        const def = efeitoMedicoPorKey(select.value);
        descricao.textContent = def ? def.descricao : "";
        renderizarCamposEfeitoMedico(camposContainer, def, valoresAtuais || {});
    };
    // Primeira montagem: se a linha já veio de um efeito salvo e o tipo
    // não mudou, mantém os parâmetros salvos; senão nasce em branco
    // (troca de tipo no select, ou linha nova).
    atualizarDescricaoECampos(tipoSalvo ? efeitoAtual : {});

    // Trocar o tipo sempre reseta os parâmetros — misturar campos de um
    // tipo com o de outro (ex: "fator" de fator_tempo_recuperacao
    // sobrando depois de trocar pra restaura_pv) não faz sentido.
    select.addEventListener("change", () => atualizarDescricaoECampos({}));
    btnRemover.addEventListener("click", () => row.remove());

    el.modalListaEfeitosMedicos.appendChild(row);
}

export function montarListaEfeitosMedicos(lista) {
    el.modalListaEfeitosMedicos.innerHTML = "";
    (lista || []).forEach(efeito => adicionarLinhaEfeitoMedico(efeito));
}

// Lê todas as linhas do bloco de efeitos médicos e monta o array final
// pra gravar em item.efeitosMedicos — cada entrada `{ tipo, ...campos }`
// conforme o schema de CATALOGO_EFEITOS_MEDICOS daquele tipo.
export function lerEfeitosMedicosDoModal() {
    const linhas = el.modalListaEfeitosMedicos.querySelectorAll(".efeito-medico-row");
    const lista = [];
    linhas.forEach(row => {
        const tipo = row.querySelector(".efmed-tipo").value;
        const def = efeitoMedicoPorKey(tipo);
        if (!def) return;
        const efeito = { tipo };
        def.campos.forEach(campo => {
            const wrapper = row.querySelector(`.efmed-campo[data-chave="${CSS.escape(campo.chave)}"]`);
            if (!wrapper) return;
            if (campo.tipo === "multiselect_tratamento" || campo.tipo === "multiselect_tipo_ferida") {
                efeito[campo.chave] = Array.from(wrapper.querySelectorAll(".efmed-check:checked")).map(cb => cb.value);
            } else if (campo.tipo === "numero") {
                efeito[campo.chave] = Number(wrapper.querySelector(".efmed-numero").value) || 0;
            } else if (campo.tipo === "lista_modificadores") {
                const mods = [];
                wrapper.querySelectorAll(".efmed-mod-row").forEach(modRow => {
                    const alvo = modRow.querySelector(".efmed-mod-alvo").value;
                    const valor = Number(modRow.querySelector(".efmed-mod-valor").value) || 0;
                    if (alvo && valor !== 0) mods.push({ alvo, valor });
                });
                efeito[campo.chave] = mods;
            }
        });
        lista.push(efeito);
    });
    return lista;
}

function configurarEfeitosMedicosGenerico() {
    el.modalAddEfeitoMedico.addEventListener("click", () => adicionarLinhaEfeitoMedico(null));
}

function lerModificacoesArmaDoModal() {
    const linhas = el.modalArmaModificacoesLista.querySelectorAll(".modarma-texto");
    return Array.from(linhas).map(i => i.value.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------
// Salvar / Excluir entidade do modal
// ---------------------------------------------------------------------
export function gerarIdLocal() {
    return "id_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

async function salvarEntidadeAtual() {
    if (!estado.modalContexto) return;
    const { lista, id } = estado.modalContexto;

    // Item do Banco Global: não depende de nenhuma ficha estar aberta.
    if (lista === "itensGlobais") {
        await salvarItemBancoDoModal(id);
        return;
    }

    if (!estado.fichaAtual || !idAtivo()) { toast("Nenhuma ficha selecionada.", "erro"); return; }

    if (lista === "pericias") {
        await salvarPericiaDoModal(id);
        return;
    }
    if (lista === "inventario") {
        await salvarItemDoModal(id);
        return;
    }
    if (lista === "gastosExtras") {
        await salvarGastoDoModal(id);
        return;
    }
    if (lista === "veiculos") {
        await salvarVeiculoDoModal(id);
        return;
    }

    // vantagens, desvantagens, fatosUniversais, especializacoes
    if (LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa()) {
        toast("Só o Mestre pode editar isso depois da criação do personagem.", "erro");
        return;
    }
    // Revalidação no momento de salvar (não só ao abrir o modal): cobre
    // o caso de duas abas abertas ao mesmo tempo tentando cadastrar a
    // 4ª desvantagem em paralelo.
    if (lista === "desvantagens" && !id && !podeAdicionarDesvantagem(estado.fichaAtual)) {
        toast(`Limite de ${MAX_DESVANTAGENS} desvantagens atingido — não é possível adicionar mais.`, "erro");
        fecharModal();
        return;
    }
    const nome = el.modalNome.value.trim();
    if (!nome) { toast("Dê um nome antes de salvar.", "erro"); return; }
    // Preserva o estado do botão ativo/desativado ao editar um registro
    // já existente (senão salvar a descrição, por exemplo, reativaria
    // sem querer um efeito que o jogador tinha desligado).
    const existente = (id && estado.fichaAtual[lista] && estado.fichaAtual[lista][id]) || {};
    const modificadoresRegistro = lerModificadoresDoModal();
    // Registro NOVO com modificador estruturado nasce DESLIGADO — precisa
    // do clique no botão "Ativar" pra valer (ver btn-toggle-ativo em
    // renderizarListaSimples). Sem efeito nenhum cadastrado, o campo
    // `ativo` não é usado em lugar nenhum, então mantém true por padrão.
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: modificadoresRegistro,
        ativo: existente.ativo ?? (modificadoresRegistro.length ? false : true)
    };
    // Desvantagem "Vício": guarda qual substância é o objeto do vício.
    // `diaIndiceUltimoUso` só é setado na primeira vez que uma substância
    // é informada (criação, ou edição que preenche o campo pela primeira
    // vez) — depois disso, quem zera a contagem é o botão "Consumir" do
    // item de droga correspondente (ver consumirDroga), não o modal.
    if (lista === "desvantagens" && el.modalCampoSubstanciaVicio && el.modalCampoSubstanciaVicio.style.display !== "none") {
        const substancia = el.modalSubstanciaVicio.value.trim();
        if (substancia) {
            registro.substancia = substancia;
            registro.diaIndiceUltimoUso = existente.substancia
                ? existente.diaIndiceUltimoUso
                : (estado.calendarioAtual ? estado.calendarioAtual.diaIndice : 0);
        }
    }
    // Especializações: vínculo opcional com uma perícia da ficha (só
    // organizacional/exibição — ver modal-campo-especializacao-pericia).
    if (lista === "especializacoes") {
        registro.periciaVinculada = el.modalEspecializacaoPericia.value || null;
    }
    const idFinal = id || gerarIdLocal();
    if (!estado.fichaAtual[lista]) estado.fichaAtual[lista] = {};
    estado.fichaAtual[lista][idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/${lista}`), estado.fichaAtual[lista]);
    toast(`${TITULOS_MODAL[lista]} salvo${id ? "" : " (novo)"}.`);
    fecharModal();
}

async function salvarPericiaDoModal(id) {
    const podeEditar = podeEditarPericiaAtributo();
    if (!podeEditar) {
        toast("Edição de perícias só na Criação ou em Level Up pendente.", "erro");
        return;
    }
    const nome = el.modalPericiaValor.value;
    if (!nome) { toast("Escolha uma perícia da lista (categoria → busca).", "erro"); return; }
    // Impede duplicar a mesma perícia em dois registros.
    const duplicada = Object.entries(estado.fichaAtual.pericias || {}).find(([pid, p]) => p.nome === nome && pid !== id);
    if (duplicada) { toast("Essa perícia já está cadastrada.", "erro"); return; }

    // Requisito de acesso (ex.: Força Bruta — manual pg. 22): só se aplica
    // a quem ainda não tem essa perícia cadastrada (id novo). Godmode do
    // Mestre ignora isso, igual ao resto das travas de edição.
    if (!id && !(estado.isMestre && estado.godmodeAtivo)) {
        const requisito = atendeRequisitoPericia(nome, estado.fichaAtual.dados, estado.fichaAtual.pericias);
        if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
    }

    const nivel = Math.max(0, Math.min(5, Number(el.modalNivel.value) || 0));
    const registro = {
        nome,
        nivel,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        legado: !buscarPericiaPorNome(nome)
    };
    const idFinal = id || gerarIdLocal();
    estado.fichaAtual.pericias[idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/${caminhoLista("pericias")}`), estado.fichaAtual.pericias);
    toast("Perícia salva.");
    fecharModal();
}

// Monta o objeto `arma` a partir do modal — compartilhado entre item de
// inventário e item do Banco Global. Sempre grava danoBase (número) e
// tipoDano; escala só se não for arma de fogo; e as características de
// Arma de Fogo (capacidade, disparos por turno, precisão, dificuldade
// de acerto, alcance, recuo, efeito extra) só quando a perícia vinculada
// for uma perícia de Arma de Fogo. `armaExistente` é o `arma` do item
// antes de editar (ou null pra item novo/Banco Global) — só serve pra
// preservar `camaraCarregada` e `carregadorInterno.municaoAtual`, que são
// estado de jogo (bala já carregada), não campos que o modal deixa o
// jogador escolher direto.
export function lerConfigArmaDoModal(periciaUso, calibre, armaExistente, tag) {
    const ehFogo = ehArmaDeFogo(periciaUso);
    const armaTag = ehArma(tag);
    // "Usa carregador?" é escolha explícita (checkbox) desde que deixou
    // de ser automática por calibre — ver armaUsaCarregador. Sem
    // carregador, nunca grava carregadorId, mesmo que o select escondido
    // ainda tenha um valor antigo.
    const usaCarregador = ehFogo && !!(el.modalArmaUsaCarregador ? el.modalArmaUsaCarregador.checked : true);
    const temCamaraExtra = ehFogo && usaCarregador && !!(el.modalArmaTemCamaraExtra && el.modalArmaTemCamaraExtra.checked);
    // Sem carregador removível (revólver, escopeta...), a "Capacidade"
    // vira a capacidade real do tambor/câmara — a munição mora dentro da
    // própria arma (arma.carregadorInterno), igual ao carregador de uma
    // arma normal, só que sem ser um item separado. Preserva a munição já
    // carregada ao editar (clampada pra nova capacidade, pra não sobrar
    // munição "fantasma" se o jogador reduzir a capacidade depois).
    const capacidadeInterna = ehFogo ? (Number(el.modalArmaCapacidade.value) || 0) : 0;
    const carregadorInternoExistente = (armaExistente && !usaCarregador) ? armaExistente.carregadorInterno : null;
    return {
        danoBase: Number(el.modalArmaDanoBase.value) || 0,
        tipoDano: el.modalArmaTipoDano.value,
        // Tipo de dano extra — só se salva em arma branca (não-fogo) e só
        // se algo de fato foi escolhido (select vazio = "-- nenhum --").
        // Ver escolha na hora de atacar em abrirModalSelecionarAlvo/
        // resolverAtaque e em abrirModalArremessar/resolverArremessar.
        tipoDanoExtra: (!ehFogo && el.modalArmaTipoDanoExtra.value) ? el.modalArmaTipoDanoExtra.value : null,
        escala: ehFogo ? null : (el.modalArmaEscala.value || null),
        // Dilaceração (item 7 do plano de saúde/complicações) — só se
        // aplica a arma de verdade (fogo ou branca), nunca a explosivo
        // (que dilacera automaticamente por dano, sem checkbox).
        dilacera: armaTag ? !!el.modalArmaDilacera.checked : false,
        dilaceraEmGolpeNormal: (armaTag && !ehFogo) ? !!el.modalArmaDilaceraGolpeNormal.checked : false,
        modificacoesArma: lerModificacoesArmaDoModal(),
        capacidade: capacidadeInterna,
        carregadorInterno: (ehFogo && !usaCarregador) ? {
            capacidadeMax: capacidadeInterna,
            municaoAtual: Math.min(capacidadeInterna, (carregadorInternoExistente && Number(carregadorInternoExistente.municaoAtual)) || 0),
            projeteisCarregados: carregadorInternoExistente ? (carregadorInternoExistente.projeteisCarregados || []) : []
        } : null,
        disparosPorTurno: ehFogo ? (Number(el.modalArmaDisparosTurno.value) || 1) : null,
        precisao: ehFogo ? (Number(el.modalArmaPrecisao.value) || 0) : null,
        dificuldadeAcerto: ehFogo ? (Number(el.modalArmaDificuldadeAcerto.value) || 0) : null,
        alcance: ehFogo ? (el.modalArmaAlcance.value || null) : null,
        recuo: ehFogo ? (el.modalArmaRecuo.value || null) : null,
        efeitoExtra: ehFogo ? el.modalArmaEfeitoExtra.value.trim() : "",
        usaCarregador,
        carregadorId: usaCarregador ? (el.modalArmaCarregador.value || null) : null,
        temCamaraExtra,
        camaraCarregada: temCamaraExtra ? !!(armaExistente && armaExistente.camaraCarregada) : false,
        // Explosivo (manual pg. 81-82): dificuldadeArmar é a que fica
        // gravada no ITEM pronto e é rolada de novo toda vez que ele é
        // armado/usado (diferente da dificuldade de CRIAR, que já foi
        // testada uma vez lá na receita). raio e módulo são referência
        // pro Mestre/jogador na hora de narrar o uso — ver
        // abrirModalArmarExplosivo.
        modeloPadrao: tag === "explosivo" ? (el.modalExplosivoModelo.value || null) : null,
        dificuldadeArmar: tag === "explosivo" ? (Number(el.modalExplosivoDificuldadeArmar.value) || 0) : null,
        raio: tag === "explosivo" ? (Number(el.modalExplosivoRaio.value) || 0) : null,
        moduloDetonacao: tag === "explosivo" ? (el.modalExplosivoModulo.value || null) : null
    };
}

// Produto Químico (Parte 4 do plano de automação dos materiais
// químicos) — as 9 linhas de material da receita, na mesma ordem de
// EFEITOS_MATERIAL_QUIMICO (dados-manual.js, Parte 3). Cada linha:
// nome fixo do material + pontos investidos (0 = fora da receita) e,
// só quando aquele material tem uma "Eficiência aumentada" de verdade
// automatizável (tabela.eficienciaAumentada.aplicar existe), um
// checkbox "Qualidade Alta"; se o bônus for uma ESCOLHA entre dois
// efeitos (Sedativo/Inflamável — ver dados-manual.js), some junto um
// select com as duas opções, escondido até o checkbox ser marcado.
const NOMES_MATERIAIS_QUIMICO = Object.keys(EFEITOS_MATERIAL_QUIMICO);

// Rótulos das opções de "Eficiência aumentada" por escolha — só existe
// pros materiais com tabela.eficienciaAumentada.tipo === "escolha" e
// aplicar() que de fato usa o parâmetro de escolha (Sedativo e
// Inflamável — Bioquímico tem tipo "automatico" porque aplicar() não
// depende de escolha nenhuma, ver dados-manual.js).
function opcoesEscolhaQuimico(nomeMaterial) {
    if (nomeMaterial === "Sedativo") {
        return [
            { valor: "dificuldade", label: "+2 na dificuldade dos testes" },
            { valor: "turnos", label: "Reduz os turnos do efeito" }
        ];
    }
    if (nomeMaterial === "Inflamável") {
        return [
            { valor: "valor", label: "Dano extra" },
            { valor: "turnos", label: "Duração extra" }
        ];
    }
    return [];
}

// pontosVeiculoSalvo (Parte 9 — Veículo de transporte, automação da
// entrega): "Veículo de transporte" não é um material de efeito — não
// entra em EFEITOS_MATERIAL_QUIMICO/resolverNivelMaterial, então não
// aparece em `efeitosSalvos` (it.quimico.efeitos). Os pontos investidos
// nele são persistidos à parte, em it.quimico.pontosVeiculoTransporte
// (ver lerConfigQuimicoDoModal), e passados aqui só pra restaurar o
// valor do campo ao reabrir um item já salvo pra edição.
export function renderizarLinhasMateriaisQuimico(efeitosSalvos, pontosVeiculoSalvo) {
    const porMaterial = {};
    (efeitosSalvos || []).forEach(e => { if (e && e.material) porMaterial[e.material] = e; });
    if (Number(pontosVeiculoSalvo) > 0) porMaterial[NOME_MATERIAL_VEICULO_TRANSPORTE] = { pontos: Number(pontosVeiculoSalvo) };

    el.modalQuimicoMateriaisLista.innerHTML = "";
    // Veículo de transporte primeiro — é a decisão "estrutural" da
    // receita (seringa/spray/área, ver resolverTipoEntregaQuimico em
    // dados-manual.js), então fica no topo da lista, antes dos materiais
    // de efeito propriamente ditos.
    [NOME_MATERIAL_VEICULO_TRANSPORTE, ...NOMES_MATERIAIS_QUIMICO].forEach(nome => {
        const tabela = EFEITOS_MATERIAL_QUIMICO[nome];
        const salvo = porMaterial[nome];
        const temEficiencia = !!(tabela && tabela.eficienciaAumentada && typeof tabela.eficienciaAumentada.aplicar === "function");
        const opcoesEscolha = temEficiencia && tabela.eficienciaAumentada.tipo === "escolha" ? opcoesEscolhaQuimico(nome) : [];
        const ehEscolha = opcoesEscolha.length > 0;
        const qualidadeAltaSalva = !!(salvo && salvo.qualidadeAlta);

        const linha = document.createElement("div");
        linha.className = "receita-ingrediente-linha quimico-material-linha";
        linha.dataset.material = nome;
        const ehVeiculo = nome === NOME_MATERIAL_VEICULO_TRANSPORTE;
        linha.innerHTML = `
            <span class="quimico-material-nome" style="flex:1;${ehVeiculo ? " font-weight:600;" : ""}">${escapeHtml(nome)}</span>
            <input type="number" class="quimico-material-pontos" min="0" step="1" style="width:64px;" value="${salvo ? Number(salvo.pontos) || 0 : 0}" title="Pontos de ${escapeHtml(nome)}">
            ${temEficiencia ? `
                <label class="quimico-material-qualidade" style="display:flex; align-items:center; gap:4px; white-space:nowrap;">
                    <input type="checkbox" class="quimico-material-qualidade-alta" ${qualidadeAltaSalva ? "checked" : ""}>
                    Qualidade Alta
                </label>
            ` : ""}
            ${ehEscolha ? `
                <select class="quimico-material-escolha" style="${qualidadeAltaSalva ? "" : "display:none;"}">
                    ${opcoesEscolha.map(op => `<option value="${op.valor}" ${salvo && salvo.escolhaEficiencia === op.valor ? "selected" : ""}>${escapeHtml(op.label)}</option>`).join("")}
                </select>
            ` : ""}
        `;
        el.modalQuimicoMateriaisLista.appendChild(linha);

        linha.querySelector(".quimico-material-pontos").addEventListener("input", recalcularQuimicoAutoPreenchido);
        const checkboxQualidade = linha.querySelector(".quimico-material-qualidade-alta");
        if (checkboxQualidade) {
            checkboxQualidade.addEventListener("change", () => {
                const selectEscolha = linha.querySelector(".quimico-material-escolha");
                if (selectEscolha) selectEscolha.style.display = checkboxQualidade.checked ? "" : "none";
                recalcularQuimicoAutoPreenchido();
            });
        }
        const selectEscolha = linha.querySelector(".quimico-material-escolha");
        if (selectEscolha) selectEscolha.addEventListener("change", recalcularQuimicoAutoPreenchido);
    });

    // Dica de entrega (Parte 9 — Veículo de transporte): só informativa,
    // nunca trava a tag escolhida lá em cima no modal (decisão do
    // Mestre: sugestão pré-marcada, criador pode sobrescrever). Vive
    // fora do loop porque não é uma linha de material, é o resultado
    // calculado a partir da linha de Veículo de transporte.
    let hintEntrega = el.modalQuimicoMateriaisLista.parentElement.querySelector("#quimico-hint-entrega");
    if (!hintEntrega) {
        hintEntrega = document.createElement("p");
        hintEntrega.id = "quimico-hint-entrega";
        hintEntrega.className = "hint";
        el.modalQuimicoMateriaisLista.insertAdjacentElement("afterend", hintEntrega);
    }
    atualizarHintEntregaQuimico();
}

// Recalcula e escreve o texto de "Dica de entrega" a partir dos pontos
// atuais na linha de Veículo de transporte — chamado toda vez que os
// materiais mudam (ver recalcularQuimicoAutoPreenchido), pra ficar
// sempre em dia com o que está no formulário.
function atualizarHintEntregaQuimico() {
    const hintEntrega = document.getElementById("quimico-hint-entrega");
    if (!hintEntrega) return;
    const pontosVeiculo = lerPontosVeiculoTransporteDoModal();
    const entrega = resolverTipoEntregaQuimico(pontosVeiculo);
    // Sugestão informativa só — nunca troca a tag/checkbox sozinha
    // (decisão do Mestre: automático só como sugestão pré-marcada, o
    // criador continua podendo sobrescrever). Nota: o pré-marcado real
    // do checkbox "carga química" pra itens já salvos já existe desde
    // antes (ver linha que faz `checked = !!(efeitos && efeitos.length)`
    // ao reabrir o item) — não dava pra fazer o mesmo aqui em tempo real
    // porque o bloco de materiais só fica visível DEPOIS do checkbox
    // marcado (a receita e o checkbox se retroalimentariam).
    const tagAtualSugere = entrega.tipo === "area" ? "produto_quimico" : "arma (com a caixa \"carga química\" marcada)";
    hintEntrega.innerHTML = `💉 Com ${pontosVeiculo} ponto(s) em "${escapeHtml(NOME_MATERIAL_VEICULO_TRANSPORTE)}", esta receita é um(a) <strong>${escapeHtml(entrega.label)}</strong>: ${escapeHtml(entrega.descricao)} <em>(sugestão de tag: ${escapeHtml(tagAtualSugere)} — continua editável à mão.)</em>`;
}

// { pontos investidos SÓ na linha de "Veículo de transporte" } — usada
// tanto pra montar it.quimico.pontosVeiculoTransporte/tipoEntrega
// (lerConfigQuimicoDoModal) quanto pra atualizar a dica em tempo real.
function lerPontosVeiculoTransporteDoModal() {
    const linha = el.modalQuimicoMateriaisLista.querySelector(`.quimico-material-linha[data-material="${CSS.escape(NOME_MATERIAL_VEICULO_TRANSPORTE)}"]`);
    if (!linha) return 0;
    return Number(linha.querySelector(".quimico-material-pontos").value) || 0;
}

// { "Sedativo": 3, "Oxidante": 1, ... } — só materiais com pontos > 0,
// direto das linhas do modal (mesmo formato que calcularDificuldade
// Quimico/resolverNivelMaterial esperam, ver dados-manual.js).
function lerPontosPorMaterialQuimicoDoModal() {
    const pontosPorMaterial = {};
    el.modalQuimicoMateriaisLista.querySelectorAll(".quimico-material-linha").forEach(linha => {
        const pontos = Number(linha.querySelector(".quimico-material-pontos").value) || 0;
        if (pontos > 0) pontosPorMaterial[linha.dataset.material] = pontos;
    });
    return pontosPorMaterial;
}

// Recalcula Dificuldade de uso e Tipo de efeito a partir das linhas de
// material — só SOBRESCREVE cada campo se ele ainda não tiver sido
// editado à mão desde a última vez que os materiais mudaram (ver
// dataset.autoGerado, zerado pelos listeners de "input" desses dois
// campos em atualizarCamposPorTag).
export function recalcularQuimicoAutoPreenchido() {
    const pontosPorMaterial = lerPontosPorMaterialQuimicoDoModal();
    const nomes = Object.keys(pontosPorMaterial);

    if (el.modalQuimicoDificuldadeUsar.dataset.autoGerado !== "0") {
        const dif = calcularDificuldadeQuimico(pontosPorMaterial);
        el.modalQuimicoDificuldadeUsar.value = dif === null ? 0 : dif;
    }
    if (el.modalQuimicoTipoEfeito.dataset.autoGerado !== "0") {
        // Veículo de transporte não é um efeito — some do resumo textual
        // (fica só no rótulo de entrega, ver atualizarHintEntregaQuimico);
        // sem isso, "Sedativo 3 + Tóxico 1" virava "Veículo de transporte
        // 1 + Sedativo 3 + Tóxico 1", confuso pra quem lê o Tipo de Efeito.
        const nomesEfeito = nomes.filter(n => n !== NOME_MATERIAL_VEICULO_TRANSPORTE);
        const entregaResumo = resolverTipoEntregaQuimico(pontosPorMaterial[NOME_MATERIAL_VEICULO_TRANSPORTE] || 0);
        const baseTexto = nomesEfeito.length
            ? nomesEfeito.map(nome => `${nome} ${pontosPorMaterial[nome]}`).join(" + ")
            : "";
        el.modalQuimicoTipoEfeito.value = baseTexto ? `${baseTexto} (${entregaResumo.label})` : "";
    }
    atualizarHintEntregaQuimico();
}

// Produto Químico (ver plano-quimicos-cenario.txt) — monta it.quimico a
// partir dos campos do bloco "Configuração do produto químico", mesmo
// padrão de lerConfigArmaDoModal pra it.arma. `efeitos` (Parte 4) é o
// array de resolverNivelMaterial(...) pra cada material com pontos > 0
// na receita — é isso que os pontos de disparo (Parte 6, ainda não
// fiada) vão ler pra aplicar o efeito de verdade num alvo.
// Sub-bloco de Tomada/Chip (manual pg. 84) dentro da Configuração do
// implante. Só Tomada e Chip têm efeito mecânico 100% determinístico
// no manual (slots por nível / +1,+2,especialização por nível) — os
// outros cinco subtipos (membro, extremidade, olho, endoesqueleto,
// órgão) têm bônus "a critério do narrador" (manual pg. 83) e por isso
// continuam só no editor genérico de Modificadores automáticos, sem
// bloco próprio. `implanteConfigAtual` só é usado pra SEMEAR os campos
// a primeira vez que o modal abre pra um item existente — chamadas de
// re-render vindas dos listeners (troca de subtipo/nível) passam `null`
// e preservam o que já estiver selecionado nos próprios campos.
export function atualizarBlocoSubtipoImplante(implanteConfigAtual) {
    const subtipo = el.modalImplanteSubtipo.value;
    const nivel = Number(el.modalNivelTag.value) || 0;
    const ehTomada = subtipo === "tomada";
    const ehChip = subtipo === "chip";
    // "Membro" (braço/perna) e "Extremidade" (mão/pé) são os dois
    // únicos subtipos com lado esquerdo/direito de verdade no manual —
    // os outros 5 (tomada, chip, olho, endoesqueleto, órgão) não têm
    // essa distinção, então o select de local nem aparece pra eles.
    // Usa as MESMAS 8 chaves de Golpes Mirados (LOCAIS_MIRA), filtradas
    // por localArmadura batendo com o subtipo escolhido.
    const localArmaduraDoSubtipo = (subtipo === "membro" || subtipo === "extremidade") ? subtipo : null;
    el.modalImplanteLocalBloco.style.display = localArmaduraDoSubtipo ? "flex" : "none";
    if (localArmaduraDoSubtipo) {
        const localSelecionadoAntes = el.modalImplanteLocal.value;
        const opcoesLocal = LOCAIS_MIRA.filter(l => l.localArmadura === localArmaduraDoSubtipo);
        el.modalImplanteLocal.innerHTML = `<option value="">Escolha…</option>` +
            opcoesLocal.map(l => `<option value="${l.key}">${escapeHtml(l.label)}</option>`).join("");
        // Prioriza o que já estava selecionado nesta mesma abertura do
        // modal (troca de Nível, por exemplo, não deve apagar o local
        // já escolhido); só cai pro valor salvo no item quando o modal
        // acabou de abrir. Se o subtipo mudou de "membro" pra
        // "extremidade" (ou vice-versa), nenhum dos dois bate mais com
        // as opções novas — fica em branco de propósito, não tenta
        // adivinhar (evita salvar "Braço esquerdo" numa prótese de pé).
        const candidato = opcoesLocal.some(l => l.key === localSelecionadoAntes) ? localSelecionadoAntes
            : (implanteConfigAtual && implanteConfigAtual.local) || "";
        el.modalImplanteLocal.value = opcoesLocal.some(l => l.key === candidato) ? candidato : "";
    }

    // Dificuldade de instalar automática (mesmo padrão de "autoGerado"
    // do bloco Químico): só sobrescreve enquanto a mesa não tiver
    // digitado um valor à mão nesse campo.
    if ((ehTomada || ehChip) && nivel >= 1 && nivel <= 5 && el.modalImplanteDificuldadeInstalar.dataset.autoGerado !== "0") {
        const tabela = ehTomada ? TOMADA_NIVEIS : CHIP_NIVEIS;
        const linha = tabela.find(t => t.nivel === nivel);
        if (linha) el.modalImplanteDificuldadeInstalar.value = linha.dificuldadeInstalar;
    }

    el.modalImplanteTomadaInfo.style.display = ehTomada ? "block" : "none";
    if (ehTomada) {
        const linha = TOMADA_NIVEIS.find(t => t.nivel === nivel);
        el.modalImplanteTomadaInfo.innerText = linha
            ? `Suporta até ${linha.slots} chip(s) encaixado(s) simultaneamente (slots = nível da tomada). Receita: ${linha.receita}. Preço: CN$ ${linha.preco.toLocaleString("pt-BR")}. Dificuldade de criar: ${linha.dificuldadeCriar}.`
            : "Defina o Nível (1 a 5) pra calcular quantos chips essa tomada suporta.";
    }

    el.modalImplanteChipBloco.style.display = ehChip ? "block" : "none";
    if (ehChip) {
        // Select de Tomada de destino: reconstrói toda vez (lista de
        // tomadas do inventário pode mudar entre uma abertura e outra do
        // modal), listando quanto de slot já está ocupado em cada uma
        // (tomadaSlotsOcupados/slotsTomada, regras.js/dados-manual.js).
        const inventarioAtual = (estado.fichaAtual && estado.fichaAtual.inventario) || {};
        const tomadaSelecionadaAntes = el.modalImplanteChipTomada.value;
        const tomadas = Object.entries(inventarioAtual)
            .filter(([, tit]) => tit && tit.tag === "biomecanica" && tit.implante?.subtipo === "tomada")
            .map(([tid, tit]) => ({ id: tid, ...tit }));
        el.modalImplanteChipTomada.innerHTML = `<option value="">Nenhuma (fora do corpo — sem efeito)</option>` +
            tomadas.map(t => {
                const ocupados = tomadaSlotsOcupados(inventarioAtual, t.id);
                const slots = slotsTomada(t.nivelTag);
                const statusInstalacao = t.implante?.instalado ? "" : " — NÃO instalada ainda";
                return `<option value="${t.id}">${escapeHtml(t.nome || "(sem nome)")} — nível ${t.nivelTag || "?"} (${ocupados}/${slots} slots)${statusInstalacao}</option>`;
            }).join("");
        el.modalImplanteChipTomada.value = (implanteConfigAtual && implanteConfigAtual.tomadaId) || tomadaSelecionadaAntes || "";

        const efeito = efeitoChip(nivel);
        const ehModificador = efeito?.tipo === "modificador";
        const ehEspecializacao = efeito?.tipo === "especializacao";

        el.modalImplanteChipBlocoModificador.style.display = ehModificador ? "flex" : "none";
        if (ehModificador) {
            if (!el.modalImplanteChipAlvo.dataset.montado) {
                const pericias = Object.values((estado.fichaAtual && estado.fichaAtual.pericias) || {});
                listaAlvosModificador(pericias).forEach(a => {
                    const opt = document.createElement("option");
                    opt.value = a.value;
                    opt.innerText = a.label;
                    el.modalImplanteChipAlvo.appendChild(opt);
                });
                el.modalImplanteChipAlvo.dataset.montado = "1";
            }
            el.modalImplanteChipAlvo.value = (implanteConfigAtual && implanteConfigAtual.chipAlvo) || el.modalImplanteChipAlvo.value || "";
        }

        el.modalImplanteChipBlocoEspecializacao.style.display = ehEspecializacao ? "flex" : "none";
        if (ehEspecializacao) {
            if (!el.modalImplanteChipEspecializacaoPericia.dataset.montado) {
                PERICIAS_MANUAL.forEach(p => {
                    const opt = document.createElement("option");
                    opt.value = p.nome;
                    opt.innerText = p.nome;
                    el.modalImplanteChipEspecializacaoPericia.appendChild(opt);
                });
                el.modalImplanteChipEspecializacaoPericia.dataset.montado = "1";
            }
            el.modalImplanteChipEspecializacaoPericia.value = (implanteConfigAtual && implanteConfigAtual.especializacaoPericia) || el.modalImplanteChipEspecializacaoPericia.value || "";
        }

        const linhaChip = CHIP_NIVEIS.find(c => c.nivel === nivel);
        if (ehModificador) {
            el.modalImplanteChipEfeitoHint.innerText = `Nível ${nivel}: modificador automático +${efeito.valor} na rolagem escolhida acima, enquanto o chip estiver encaixado numa Tomada instalada com vaga.${linhaChip ? ` Receita: ${linhaChip.receita}. Preço: CN$ ${linhaChip.preco.toLocaleString("pt-BR")}. Dificuldade de criar: ${linhaChip.dificuldadeCriar}.` : ""}`;
        } else if (ehEspecializacao) {
            el.modalImplanteChipEfeitoHint.innerText = `Nível ${nivel}: concede uma Especialização de nível ${efeito.valor} na perícia escolhida acima, enquanto o chip estiver encaixado numa Tomada instalada com vaga (o efeito exato da especialização é escolhido com o Mestre, no catálogo da perícia — cadastre-o em Especializações).${linhaChip ? ` Receita: ${linhaChip.receita}. Preço: CN$ ${linhaChip.preco.toLocaleString("pt-BR")}. Dificuldade de criar: ${linhaChip.dificuldadeCriar}.` : ""}`;
        } else {
            el.modalImplanteChipEfeitoHint.innerText = "Defina o Nível do chip (1 a 5) pra ver o efeito (manual pg. 84).";
        }
    }
}

// Lê a Configuração do implante (tag "biomecanica" — ver
// plano-implantes-biomecanica.txt). `existenteImplante` preserva os
// campos que este modal não edita (instalado, testesAdaptacaoFeitos,
// rejeicaoParcial, historico, quebrado — todos só mudam pela cirurgia,
// nunca por aqui, mesmo padrão de "carregador" preservando
// municaoAtual ao editar só a capacidadeMax). `quebrado` é gravado só
// pela Fase 5 (confirmarAcaoPendente "instalar_implante", mestre.js)
// numa falha crítica de instalação — ver Fase 9 do plano pra exibição.
// tomadaId/chipAlvo/especializacaoPericia (manual pg. 84) só existem de
// verdade pra subtipo "chip" — lidos do sub-bloco Tomada/Chip
// (atualizarBlocoSubtipoImplante); pros demais subtipos, preservam o
// que já estava salvo (mesma régua defensiva do resto da função).
export function lerConfigImplanteDoModal(existenteImplante) {
    const subtipo = el.modalImplanteSubtipo.value || null;
    const ehChip = subtipo === "chip";
    const temLocal = subtipo === "membro" || subtipo === "extremidade";
    return {
        subtipo,
        local: temLocal ? (el.modalImplanteLocal.value || null) : (existenteImplante?.local ?? null),
        dificuldadeInstalar: Number(el.modalImplanteDificuldadeInstalar.value) || 0,
        funcoesEspeciais: el.modalImplanteFuncoesEspeciais.value.trim(),
        instalado: existenteImplante?.instalado ?? false,
        testesAdaptacaoFeitos: existenteImplante?.testesAdaptacaoFeitos ?? 0,
        rejeicaoParcial: existenteImplante?.rejeicaoParcial ?? 0,
        historico: existenteImplante?.historico || [],
        quebrado: existenteImplante?.quebrado ?? false,
        tomadaId: ehChip ? (el.modalImplanteChipTomada.value || null) : (existenteImplante?.tomadaId ?? null),
        chipAlvo: ehChip ? (el.modalImplanteChipAlvo.value || null) : (existenteImplante?.chipAlvo ?? null),
        especializacaoPericia: ehChip ? (el.modalImplanteChipEspecializacaoPericia.value || null) : (existenteImplante?.especializacaoPericia ?? null)
    };
}

export function lerConfigQuimicoDoModal() {
    const efeitos = [];
    el.modalQuimicoMateriaisLista.querySelectorAll(".quimico-material-linha").forEach(linha => {
        const nome = linha.dataset.material;
        const pontos = Number(linha.querySelector(".quimico-material-pontos").value) || 0;
        if (pontos <= 0) return;
        const checkboxQualidade = linha.querySelector(".quimico-material-qualidade-alta");
        const qualidadeAlta = !!(checkboxQualidade && checkboxQualidade.checked);
        const selectEscolha = linha.querySelector(".quimico-material-escolha");
        const escolha = (selectEscolha && qualidadeAlta) ? selectEscolha.value : null;
        const resolvido = resolverNivelMaterial(nome, pontos, qualidadeAlta, escolha);
        if (resolvido) efeitos.push(resolvido);
    });
    // Veículo de transporte (Parte 9): não vira uma entrada de `efeitos`
    // (resolverNivelMaterial retorna null pra ele, sem tabela de efeito),
    // então precisa ser persistido à parte pra: (a) restaurar o campo ao
    // reabrir o item pra edição (ver renderizarLinhasMateriaisQuimico) e
    // (b) decidir o tipo de entrega toda vez que o item for usado (ver
    // resolverAtaque — modificador de dificuldade do spray).
    const pontosVeiculoTransporte = lerPontosVeiculoTransporteDoModal();
    const tipoEntrega = resolverTipoEntregaQuimico(pontosVeiculoTransporte);
    return {
        raio: Number(el.modalQuimicoRaio.value) || 0,
        dificuldadeUsar: Number(el.modalQuimicoDificuldadeUsar.value) || 0,
        tipoEfeito: el.modalQuimicoTipoEfeito.value.trim(),
        efeitos,
        pontosVeiculoTransporte,
        tipoEntrega: tipoEntrega.tipo,
        tipoEntregaLabel: tipoEntrega.label
    };
}

// Lê o(s) valor(es) de perícia vinculada do modal do item — array (só
// as marcadas) pra tags multi-perícia (eletrônico, ver ehTagMultiPericia
// em dados-manual.js), string única (ou null) pras demais. Usada tanto
// na criação/edição de item de ficha quanto no Banco Global de Itens.
export function lerPericiaUsoDoModal(tag) {
    if (!tagTemPericiaUso(tag)) return null;
    if (ehTagMultiPericia(tag)) {
        const marcadas = Array.from(el.modalPericiaUsoCheckboxes.querySelectorAll("input[type=checkbox]:checked")).map(cb => cb.value);
        return marcadas.length ? marcadas : null;
    }
    return el.modalPericiaUso.value || null;
}

// Lê se o item foi marcado como carteira digital e, se sim, o(s)
// saldo(s) atuais — só se aplica a tags que podem ser saldo (eletrônico
// e dinheiro, ver ehTagQuePodeSerSaldo em dados-manual.js). Eletrônico
// grava DOIS campos (saldoNotas/saldoMoedas — saldos separados do mesmo
// item, ver todosOsSaldos); dinheiro físico continua com um só
// (saldoValor). Retorna tudo já pronto pra gravar no item (ehSaldo
// false/undefined não deve deixar nenhum dos campos com lixo de uma
// marcação anterior).
export function lerSaldoDoItemDoModal(tag) {
    if (!ehTagQuePodeSerSaldo(tag) || !el.modalItemEhSaldo.checked) {
        return { ehSaldo: false, saldoValor: null, saldoNotas: null, saldoMoedas: null };
    }
    if (tag === "eletronico") {
        return {
            ehSaldo: true, saldoValor: null,
            saldoNotas: Number(el.modalItemSaldoNotas.value) || 0,
            saldoMoedas: Number(el.modalItemSaldoMoedas.value) || 0
        };
    }
    return { ehSaldo: true, saldoValor: Number(el.modalItemSaldoValor.value) || 0, saldoNotas: null, saldoMoedas: null };
}

// Lê peso, volume e quantidade do modal e devolve tudo pronto pra
// gravar no item: `peso`/`volume` continuam sendo os totais do
// registro (é o que pesoTotalPorCategoria, volumeTotalDentroDe e o
// resto do código já somam/leem direto, sem precisar saber de
// quantidade) — pra tags sem quantidade genérica (projétil/material/
// carregador, ver tagTemQuantidadeGeral em dados-manual.js) eles são
// só os valores digitados, igual sempre foi. Volume usa exatamente a
// mesma quantidade que peso, pra não duplicar o campo no modal.
export function lerPesoVolumeEQuantidadeDoModal(tag) {
    const pesoDigitado = Math.max(0, Number(el.modalPeso.value) || 0);
    const volumeDigitado = Math.max(0, Number(el.modalVolume.value) || 0);

    // Projétil (Fase 4) — caso especial: usa a PRÓPRIA quantidade de
    // projéteis (it.projetil.quantidade, campo aninhado — não o
    // "quantidade" genérico, que fica escondido pra essa tag) pra
    // multiplicar o volume, arredondando pra baixo. O Math.floor
    // reaproveita a mesma fórmula de unitário × quantidade de sempre,
    // sem nenhum if especial: um estoque pequeno de munição (poucas
    // balas × volume unitário baixo) simplesmente arredonda pra 0.
    if (ehProjetil(tag)) {
        const quantidadeProjetil = Math.max(0, Number(el.modalProjetilQuantidade.value) || 0);
        return {
            peso: pesoDigitado,
            pesoUnitario: null,
            volume: Math.floor(volumeDigitado * quantidadeProjetil),
            volumeUnitario: volumeDigitado,
            quantidade: null
        };
    }

    if (!tagTemQuantidadeGeral(tag)) {
        return { peso: pesoDigitado, pesoUnitario: null, volume: volumeDigitado, volumeUnitario: null, quantidade: null };
    }
    const quantidade = Math.max(1, Math.round(Number(el.modalQuantidade.value)) || 1);
    return {
        peso: +(pesoDigitado * quantidade).toFixed(2),
        pesoUnitario: pesoDigitado,
        volume: +(volumeDigitado * quantidade).toFixed(2),
        volumeUnitario: volumeDigitado,
        quantidade
    };
}

// ---------------------------------------------------------------------
// Item do Banco Global — mesmo formulário do item de inventário
// (prepararModalItem com ehBanco=true), mas persiste direto em
// itensGlobais/{id} em vez de fichas/{id}/inventario. Usado pela aba
// "Biblioteca de Itens Salvos" do Painel do Mestre, tanto pra criar um
// item do zero quanto pra editar um já existente.
// ---------------------------------------------------------------------
async function salvarItemBancoDoModal(id) {
    if (!estado.isMestre) { toast("Só o Mestre gerencia a Biblioteca de Itens.", "erro"); return; }
    const nome = el.modalNome.value.trim();
    const tag = el.modalTag.value;
    if (!nome) { toast("Dê um nome ao item.", "erro"); return; }
    if (!tag) { toast("Todo item precisa de uma tag do sistema.", "erro"); return; }

    const exigePericia = tagExigePericiaUso(tag);
    const periciaUso = lerPericiaUsoDoModal(tag);
    const { ehSaldo, saldoValor, saldoNotas, saldoMoedas } = lerSaldoDoItemDoModal(tag);
    const { peso, pesoUnitario, volume, volumeUnitario, quantidade } = lerPesoVolumeEQuantidadeDoModal(tag);
    const tamanho = el.modalTamanho.value || null;
    const maosNecessarias = (el.modalCampoMaosNecessarias.style.display !== "none")
        ? (Number(el.modalMaosNecessarias.value) === 2 ? 2 : 1)
        : 1;
    const subtipoPorte = ehContainer(tag) ? (el.modalSubtipoPorte.value || null) : null;
    if (ehContainer(tag) && !subtipoPorte) { toast("Escolha o tipo de porte deste recipiente.", "erro"); return; }
    let compartimentos = null;
    if (ehContainer(tag)) {
        compartimentos = lerCompartimentosDoModal();
        if (!compartimentos) return; // toast de erro já disparado dentro da função
    }
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

    // Molde do Banco Global: carregador/carregadorId nunca guardam estado
    // de munição de uma ficha específica — só a capacidade máxima serve
    // de template; o resto começa zerado/vazio.
    let carregador = null;
    if (tagExigeCapacidadeCarregador(tag)) {
        const capacidadeMax = Number(el.modalCarregadorCapacidade.value) || 0;
        if (capacidadeMax <= 0) { toast("Informe a capacidade do carregador.", "erro"); return; }
        carregador = { capacidadeMax, municaoAtual: 0, projeteisCarregados: [] };
    }
    // Molde do Banco Global — a quantidade agora é editável no mesmo
    // campo do item de ficha; item novo usa o que estiver lá (padrão 1).
    let projetil = null;
    if (tagExigeQuantidadeProjetil(tag)) {
        projetil = { quantidade: Math.max(0, Number(el.modalProjetilQuantidade.value) || 0) };
    }
    const armaConfig = ehArmaOuExplosivo(tag) ? lerConfigArmaDoModal(periciaUso, calibre, null, tag) : null;
    if (armaConfig) { armaConfig.carregadorId = null; armaConfig.camaraCarregada = false; }

    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        modificadores: lerModificadoresDoModal(),
        // Efeitos de Equipamento Médico (Fase 3 do plano-efeitos-
        // equipamentos-medicos.txt) — molde do Banco Global; item
        // copiado dele pra uma ficha já nasce com os efeitos prontos
        // (ver autopreencherItemDoBanco/configurarAutocompleteItemBanco).
        efeitosMedicos: tag === "equipamento_medico" ? lerEfeitosMedicosDoModal() : [],
        // Miniatura opcional (ver configurarImagemItemGenerico) — copiada
        // automaticamente pra qualquer ficha que puxar este molde do
        // Banco Global (autopreencherItemDoBanco, em itens-globais.js).
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
        compartimentos,
        quantidade,
        periciaUso,
        ehSaldo,
        saldoValor,
        saldoNotas,
        saldoMoedas,
        classeProtecao,
        calibre,
        reducoesDano: tagPodeReduzirDano(tag) ? lerReducaoDanoDoModal() : [],
        localProtegido,
        arma: armaConfig,
        quimico: (ehProdutoQuimico(tag) || (tag === "arma" && el.modalArmaCargaQuimica.checked)) ? lerConfigQuimicoDoModal() : null,
        // Molde do Banco Global de implante: nunca carrega estado de
        // cirurgia de uma ficha específica (item copiado do banco pra
        // uma ficha nasce sempre instalado:false, sem histórico) — por
        // isso não passa nenhum existenteImplante aqui, diferente de
        // salvarItemDoModal.
        implante: tag === "biomecanica" ? lerConfigImplanteDoModal(null) : null,
        carregador,
        projetil,
        // Equipável — molde do Banco Global; item criado a partir dele
        // já nasce com essa marcação (ver salvarItemDoModal).
        equipavel: (tag !== "arma" && tag !== "explosivo") ? !!el.modalEquipavel.checked : false,
        // Molde do Banco Global de material: guarda tipo/qualidade como
        // referência, mas a quantidade em estoque é zerada — ela é
        // específica de cada ficha, não faz sentido "herdar estoque"
        // de um molde compartilhado entre todas as mesas.
        materialTipo: tag === "material" ? el.modalMaterialTipo.value : null,
        materialQualidade: tag === "material" ? (qualidadesDoMaterial(el.modalMaterialTipo.value) ? el.modalMaterialQualidade.value : null) : null,
        materialQuantidade: null,
        // Categoria do Banco Global (ex.: "Capangas", "Armas de fogo") —
        // texto livre opcional, usada só pra busca/filtro na Biblioteca
        // de Itens. Sem relação com `categoria` (levando/casa), que é
        // exclusivo de item de ficha e nunca existe no molde do Banco.
        categoriaBanco: el.modalCategoriaBanco.value.trim()
    };

    try {
        if (estado.cenarioIdParaCriarItem) {
            // Item novo pro cenário (ver abrirModalNovoItemParaCenario):
            // não passa pela Biblioteca de Itens — grava direto como item
            // solto no cenário. categoriaBanco não faz sentido fora do
            // Banco Global, não é gravada aqui.
            const cenarioAlvo = estado.cenarioIdParaCriarItem;
            estado.cenarioIdParaCriarItem = null;
            const { categoriaBanco, ...registroCenario } = registro;
            await adicionarItemCenario(cenarioAlvo, registroCenario);
            toast(`"${nome}" criado e colocado no cenário.`);
            fecharModal();
            return;
        }
        if (id) {
            await atualizarItemBanco(id, registro);
            toast("Item do Banco Global atualizado.");
            estado.idBancoParaRetomarReceita = id;
        } else {
            estado.idBancoParaRetomarReceita = await salvarItemNoBanco(registro, null);
            toast("Item criado no Banco Global.");
        }
        fecharModal();
    } catch (erro) {
        console.error("Falha ao salvar item no Banco Global:", erro);
        toast(`Falha ao salvar no Banco Global (${erro.message || "erro desconhecido"}).`, "erro");
    }
}

async function salvarGastoDoModal(id) {
    const nome = el.modalNome.value.trim();
    if (!nome) { toast("Dê um nome ao gasto.", "erro"); return; }
    const registro = {
        nome,
        descricao: el.modalDescricao.value.trim(),
        valor: Number(el.modalNivel.value) || 0
    };
    const idFinal = id || gerarIdLocal();
    if (!estado.fichaAtual.gastosExtras) estado.fichaAtual.gastosExtras = {};
    estado.fichaAtual.gastosExtras[idFinal] = registro;
    await update(ref(db, `${caminhoBase()}/gastosExtras`), estado.fichaAtual.gastosExtras);
    toast("Gasto salvo.");
    fecharModal();
}

// Criar/editar veículo — só o Mestre (ver plano-veiculos.txt, fase 5).
// Cada atributo é lido do select correspondente (data-veiculo-atributo,
// montado em prepararModalVeiculo) e travado em 0-5 por segurança, caso
// o dado salvo no Firebase esteja fora da escala.
//
// Chave (adendo ao plano): todo veículo NOVO nasce trancado e ganha
// junto, no mesmo save, um item tag "chave" no inventário desta mesma
// ficha, apontando pra ele (veiculoId). Só acontece na criação (sem
// `id`) — editar os atributos de um veículo já existente não mexe no
// estado de trancado nem cria chave duplicada.
async function salvarVeiculoDoModal(id) {
    if (!estado.isMestre) { toast("Só o Mestre pode criar ou editar veículos.", "erro"); return; }
    const nome = el.modalNome.value.trim();
    if (!nome) { toast("Dê um nome ao veículo antes de salvar.", "erro"); return; }
    const tipo = el.modalTipoVeiculo.value || "pessoal";
    const atributos = {};
    ATRIBUTOS_VEICULO.forEach(chave => {
        const select = el.modalVeiculoAtributos.querySelector(`[data-veiculo-atributo="${chave}"]`);
        atributos[chave] = Math.max(0, Math.min(5, Number(select?.value) || 0));
    });
    const existente = (id && estado.fichaAtual.veiculos && estado.fichaAtual.veiculos[id]) || {};
    const ehVeiculoNovo = !id;
    const idFinal = id || gerarIdLocal();

    let chaveItemId = existente.chaveItemId || null;
    if (!estado.fichaAtual.inventario) estado.fichaAtual.inventario = {};
    if (ehVeiculoNovo) {
        chaveItemId = gerarIdLocal();
        estado.fichaAtual.inventario[chaveItemId] = {
            nome: `Chave: ${nome}`,
            descricao: "",
            modificadores: [],
            ativo: true,
            tag: "chave",
            nivelTag: null,
            peso: 0.05,
            pesoUnitario: null,
            volume: 0,
            volumeUnitario: null,
            tamanho: "pequeno",
            capacidadeVolume: null,
            tamanhoMaximoAceito: null,
            quantidade: null,
            categoria: "levando",
            dentroDe: null,
            periciaUso: null,
            ehSaldo: false,
            saldoValor: 0,
            classeProtecao: null,
            calibre: null,
            reducoesDano: [],
            localProtegido: null,
            arma: null,
            carregador: null,
            projetil: null,
            equipavel: false,
            equipada: false,
            materialTipo: null,
            materialQualidade: null,
            materialQuantidade: null,
            veiculoId: idFinal
        };
    }

    const checkboxTrancado = document.getElementById("modal-veiculo-trancado");
    const registro = {
        nome,
        tipo,
        atributos,
        // Vida do veículo (Fase 2 — ver plano-veiculos-fase2.txt): salvar
        // via este modal (nome/tipo/atributos/trava) usa `update()` com o
        // caminho inteiro do veículo, que SUBSTITUI o nó — sem preservar
        // esses dois campos aqui, editar qualquer atributo apagaria o
        // dano/deterioração já acumulados. Veículo novo nasce "cheio"
        // (pvAtual null) e sem deteriorações, igual antes da Fase 2.
        pvAtual: ehVeiculoNovo ? null : (existente.pvAtual ?? null),
        deterioracoes: ehVeiculoNovo ? [] : (existente.deterioracoes || []),
        criadoEm: existente.criadoEm || Date.now(),
        trancado: ehVeiculoNovo ? true : (checkboxTrancado ? checkboxTrancado.checked : (existente.trancado ?? false)),
        chaveItemId
    };
    if (!estado.fichaAtual.veiculos) estado.fichaAtual.veiculos = {};
    estado.fichaAtual.veiculos[idFinal] = registro;

    // Grava os dois nós juntos — se a chave for criada mas o veículo
    // falhar (ou vice-versa), pelo menos não fica um órfão referenciando
    // o outro que nunca chegou a existir no Firebase.
    const atualizacoes = {};
    atualizacoes[`${caminhoBase()}/veiculos/${idFinal}`] = registro;
    if (ehVeiculoNovo) atualizacoes[`${caminhoBase()}/inventario/${chaveItemId}`] = estado.fichaAtual.inventario[chaveItemId];
    await update(ref(db), atualizacoes);

    toast(ehVeiculoNovo ? "Veículo criado, com chave no inventário." : "Veículo salvo.");
    fecharModal();
}

async function excluirEntidadeAtual() {
    if (!estado.modalContexto || !estado.modalContexto.id) return;
    const { lista, id } = estado.modalContexto;

    if (lista === "itensGlobais") {
        if (!estado.isMestre) { toast("Só o Mestre gerencia a Biblioteca de Itens.", "erro"); return; }
        if (!confirm("Excluir este item do Banco Global? Isso não afeta itens já copiados pra fichas.")) return;
        await excluirItemBanco(id);
        toast("Item removido do Banco Global.");
        fecharModal();
        return;
    }

    if (!estado.fichaAtual || !idAtivo()) { toast("Nenhuma ficha selecionada.", "erro"); return; }

    if (lista === "pericias" && !podeEditarPericiaAtributo()) {
        toast("Edição de perícias só na Criação ou em Level Up pendente.", "erro");
        return;
    }

    if (LISTAS_CARACTERISTICA_NARRATIVA.includes(lista) && !podeEditarCaracteristicaNarrativa()) {
        toast("Só o Mestre pode remover isso depois da criação do personagem.", "erro");
        return;
    }

    if (lista === "veiculos" && !estado.isMestre) {
        toast("Só o Mestre pode remover veículos.", "erro");
        return;
    }

    // Item de inventário, pedido por um jogador: não apaga na hora — vira
    // um pedido pendente pro Mestre aprovar (regra 4).
    if (lista === "inventario" && !estado.isMestre) {
        const item = estado.fichaAtual.inventario[id];
        if (!item) return;
        if (!confirm(`Pedir ao Mestre pra remover "${item.nome}" do seu inventário?`)) return;
        const nomeJogador = estado.fichaAtual?.config?.nomeExibicao || estado.sessao?.nome || estado.fichaAtualId;
        await criarAcaoPendente({
            tipo: "remover_item",
            fichaId: estado.fichaAtualId,
            nomeJogador,
            detalhe: `${nomeJogador} quer deletar "${item.nome}".`,
            payload: { itemId: id, itemNome: item.nome }
        });
        toast("Pedido de remoção enviado ao Mestre.");
        fecharModal();
        return;
    }

    if (!confirm("Excluir este registro? Essa ação não pode ser desfeita.")) return;

    // Excluir um item-recipiente não pode levar junto (nem "sumir" com)
    // o que estava guardado dentro dele — os itens filhos voltam a
    // aparecer soltos na lista (dentroDe some).
    if (lista === "inventario") {
        await destravarItensDeDentro(id);
    }

    // Excluir um veículo não pode deixar a(s) chave(s) dele órfãs no
    // inventário — apontando pra um veiculoId que não existe mais (ver
    // plano-veiculos.txt, adendo "chave"). Remove TODAS as chaves que
    // apontam pra esse veículo, não só a "oficial" (chaveItemId) — pode
    // ter cópia extra feita por reporChaveVeiculo.
    if (lista === "veiculos" && estado.fichaAtual.inventario) {
        const chavesOrfas = Object.entries(estado.fichaAtual.inventario)
            .filter(([, it]) => it && it.tag === "chave" && it.veiculoId === id)
            .map(([itemId]) => itemId);
        for (const itemId of chavesOrfas) {
            delete estado.fichaAtual.inventario[itemId];
            await remove(ref(db, `${caminhoBase()}/inventario/${itemId}`));
        }

        // Mesmo motivo, pros acessórios-arma montados nele (Fase 5c do
        // plano — ver plano-acessorios-veiculo.txt, seção "FASE 5c"):
        // sem isso, a arma ficava com item.instaladoEmVeiculoId apontando
        // pra um veículo que não existe mais e sem nenhum botão na UI
        // pra desmontar (o "Remover do veículo" só existe dentro do
        // card do próprio veículo, que acabou de sumir). A arma em si
        // NÃO é apagada — só solta de volta pro inventário normal,
        // mesmo comportamento de removerArmaDoVeiculo.
        const armasOrfas = itensArmaInstaladosEmVeiculo(estado.fichaAtual.inventario, id);
        for (const arma of armasOrfas) {
            estado.fichaAtual.inventario[arma.id] = { ...fichaAtual.inventario[arma.id], instaladoEmVeiculoId: null, slotVeiculo: null };
            await update(ref(db, `${caminhoBase()}/inventario/${arma.id}`), { instaladoEmVeiculoId: null, slotVeiculo: null });
        }
    }

    delete estado.fichaAtual[lista][id];
    await remove(ref(db, `${caminhoBase()}/${caminhoLista(lista)}/${id}`));
    toast("Excluído.");
    fecharModal();
}

// Solta (dentroDe = null) todos os itens que estavam guardados dentro
// do recipiente containerId — usado antes de excluir um recipiente
// (direto pelo Mestre) ou ao processar um "remover_item" pendente que
// aponta pra um recipiente (ver mestre.js/confirmarAcaoPendente).
async function destravarItensDeDentro(containerId) {
    const filhos = itensDentroDe(estado.fichaAtual, containerId);
    if (!filhos.length) return;
    const atualizacoes = {};
    filhos.forEach(f => { atualizacoes[f.id] = { ...fichaAtual.inventario[f.id], dentroDe: null }; });
    Object.assign(estado.fichaAtual.inventario, atualizacoes);
    const payload = {};
    filhos.forEach(f => { payload[`${f.id}/dentroDe`] = null; });
    await update(ref(db, `${caminhoBase()}/inventario`), payload);
}

// configurarCalendario, configurarTimeskip, mostrarResumoRecuperacaoPV,
// configurarRegistroSessoes, renderizarSessoes, abrirFormSessao,
// fecharFormSessao, configurarLogDados e destacarPalavrasChave foram
// movidos pra mestre/calendario.js no Passo 30 do plano de
// modularização de ficha.js — ver import no topo deste arquivo.

// =====================================================================
// GODMODE
// =====================================================================

// configurarGodmode foi movida pra mestre/painel-mestre.js no Passo
// 27 do plano de modularização de ficha.js — ver import no topo
// deste arquivo.

// configurarCombateAtivo foi movido pra abas/combate.js no Passo
// 22 do plano de modularização (junto com renderizarCombate/
// renderizarManobrasCombate, ver comentário acima). Ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt.

// configurarCenarios e configurarPerseguicaoAtiva foram movidos pra
// abas/cenario.js no Passo 20 do plano de modularização (junto com
// renderizarCenarios, ver comentário acima). Ver docs/estado-compartilhado.md
// e plano-modularizacao-ficha-js.txt.

// =====================================================================
// HISTÓRICO DE XP (plano-registro-xp.txt): registros de cada "Dar XP"
// feito pelo Mestre (título + valor + data) da ficha atualmente aberta.
// Mesmo padrão de configurarSaude acima — listener próprio por ficha,
// re-registrado só quando a ficha ativa muda de verdade. Visível pro
// Mestre e pro jogador dono da ficha (renderizarXpHistorico não checa
// estado.isMestre em nenhum momento — é só leitura, sem ação nenhuma pro
// jogador fazer ali). Escopo: só ficha de jogador, igual Saúde — XP de
// NPC não existe hoje (ver darXp, mestre.js).
// =====================================================================
function configurarXpHistorico() {
    const alvo = !estado.modoNpc && estado.fichaAtualId ? estado.fichaAtualId : null;
    if (alvo === estado.xpHistoricoFichaIdOuvida) return;
    estado.xpHistoricoFichaIdOuvida = alvo;
    if (estado.unsubXpHistorico) { estado.unsubXpHistorico(); estado.unsubXpHistorico = null; }
    if (!alvo) {
        estado.xpHistoricoCache = [];
        renderizarXpHistorico();
        return;
    }
    estado.unsubXpHistorico = ouvirXpHistorico(alvo, (lista) => {
        estado.xpHistoricoCache = lista || [];
        renderizarXpHistorico();
    });
}

function renderizarXpHistorico() {
    if (!el.xpHistoricoLista || !el.xpHistoricoContador) return;
    el.xpHistoricoContador.innerText = estado.xpHistoricoCache.length;
    if (!estado.xpHistoricoCache.length) {
        el.xpHistoricoLista.innerHTML = `<li class="xp-historico-vazio">Nenhum XP registrado ainda.</li>`;
        return;
    }
    el.xpHistoricoLista.innerHTML = estado.xpHistoricoCache.map(r => {
        const data = r.data ? new Date(r.data).toLocaleDateString("pt-BR") : "—";
        const sinal = Number(r.valor) >= 0 ? "+" : "";
        const tituloHtml = r.titulo
            ? `<span class="xp-historico-titulo">${escapeHtml(r.titulo)}</span> — `
            : "";
        return `<li>${tituloHtml}${sinal}${r.valor ?? 0} XP <span class="hint-inline">(${data})</span></li>`;
    }).join("");
}

export function tituloTipoFerida(tipo) {
    return {
        sangramento: "Sangramento", corte: "Corte", projetil: "Projétil alojado",
        fratura: "Fratura", queimadura: "Queimadura"
    }[tipo] || tipo;
}
export function tituloLocalFerida(local) {
    return labelLocalFerida(local);
}
export function tituloEstadoFerida(estado) {
    return {
        aberta: "Aberta", estancada: "Estancada", sem_sangramento: "Projétil removido", tratada: "Tratada"
    }[estado] || estado;
}

// Deriva as ações de tratamento disponíveis pra uma ferida a partir de
// TRATAMENTOS_FERIDA + feridaAceitaSutura (regras.js) — em vez de
// hardcodar a máquina de estados de novo aqui, reaproveita a mesma
// fonte de verdade que tratarFerida() usa pra validar/aplicar. Uma
// ferida "tratada" nunca tem ação disponível.
export function acoesDeTratamentoParaFerida(ferida) {
    if (!ferida || ferida.estado === "tratada") return [];
    return Object.entries(TRATAMENTOS_FERIDA)
        .filter(([acao, config]) => {
            if (!config.tiposFerida.includes(ferida.tipo)) return false;
            if (acao === "suturar_ferimento") return feridaAceitaSutura(ferida);
            return ferida.estado === "aberta";
        })
        .map(([acao]) => acao);
}

// renderizarSaude, renderizarSilhuetaSaude, configurarSilhuetaSaude,
// renderizarPopoverSilhueta e os helpers privados da silhueta (SVG)
// foram movidos pra abas/saude.js no Passo 24 do plano de
// modularização (plano-modularizacao-ficha-js.txt) — parte 1: exibição.
// Os implantes e o tratamento de feridas (renderizarImplantes,
// renderizarImplantesPendentesMestre, abrirModalTratarFerida,
// abrirModalTestarInfeccaoFerida, configurarSaude, configurarAvisoCustoVida)
// foram movidos pra abas/saude.js no Passo 25 — parte 2. O que ficou
// aqui (mestreInstalarImplanteSemTeste, testarAdaptacaoImplante,
// aplicarDanoUsoImplanteGodmode, decrementarItemMedico,
// implantesContagemELimite, avaliarAvisoCustoVida, normalizarTextoBusca)
// só ganhou `export` pra abas/saude.js poder importar — continuam
// usados também por outras partes deste arquivo.

// Aplica 1 tick de sangramento fora do turno automático de combate —
// ver aplicarTickSangramento (saude.js). Só a ficha atualmente aberta
// na tela (estado.fichaAtualId), mesma convenção dos outros botões exclusivos
// do Mestre nesta aba. estado.feridasCache atualiza sozinho via ouvirFeridas
// quando o tick zera e a ferida some.
export async function aplicarTickSangramentoManual(feridaId) {
    if (!estado.isMestre || estado.modoNpc || !estado.fichaAtualId) return;
    try {
        const resultado = await aplicarTickSangramento(estado.fichaAtualId, feridaId, "Mestre");
        toast(resultado.encerrado
            ? `Sangramento encerrado — ${resultado.dano} de dano aplicado no último tick.`
            : `Tick de sangramento aplicado: ${resultado.dano} de dano. Faltam ${resultado.turnosRestantes} tick(s).`);
    } catch (err) {
        console.error(err);
        toast(err.message || "Falha ao aplicar o tick de sangramento.", "erro");
    }
}

// Fase B (plano mestre-tratar-feridas): apaga a ferida por completo
// (removerFerida, saude.js — já existia, nunca era chamada de lugar
// nenhum) — "como se nunca tivesse acontecido", sem passar por
// "tratada" e sem deixar linha de histórico. Só a ficha atualmente
// aberta na tela (estado.fichaAtualId) — mesma convenção dos outros botões
// Godmode desta aba. estado.feridasCache atualiza sozinho via ouvirFeridas.
export async function excluirFeridaGodmode(feridaId) {
    if (!estado.isMestre || !estado.godmodeAtivo || estado.modoNpc || !estado.fichaAtualId) return;
    if (!confirm("Excluir esta ferida por completo? Isso apaga o registro e o histórico dela, sem volta.")) return;
    try {
        await removerFerida(estado.fichaAtualId, feridaId);
        toast("Ferida excluída (Godmode).");
    } catch (err) {
        console.error(err);
        toast("Falha ao excluir a ferida.", "erro");
    }
}

// "Aplicar ferida" (Mestre): cria uma ferida manualmente na ficha
// atualmente aberta na tela, pra qualquer situação narrativa sem golpe/
// ataque automatizado por trás (queda, explosão, acidente de veículo,
// arma branca fora de combate etc.) — reaproveita criarFerida (saude.js),
// a mesma função usada pelos gatilhos automáticos de combate. Não exige
// Godmode (mesmo nível de acesso de "Testar Infecção" — é uma ferramenta
// normal do Mestre, não uma correção de emergência). estado.feridasCache
// atualiza sozinho via ouvirFeridas assim que a ferida é criada.
function abrirModalMestreAplicarFerida() {
    if (!estado.isMestre || estado.modoNpc || !estado.fichaAtualId) return;

    let modal = document.getElementById("modal-mestre-aplicar-ferida");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-mestre-aplicar-ferida";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const nomeFicha = estado.fichaAtual?.config?.nomeExibicao || estado.fichaAtualId;
    const opcoesTipo = TIPOS_FERIDA.map(t => `<option value="${t}">${tituloTipoFerida(t)}</option>`).join("");
    const opcoesLocal = ZONAS_SILHUETA.map(z => `<option value="${z}">${labelLocalFerida(z)}</option>`).join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Aplicar ferida — ${escapeHtml(nomeFicha)}</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <p class="hint">Cria a ferida direto na aba Saúde desse personagem, no estado "Aberta" — pra qualquer ferimento narrativo sem golpe/ataque automatizado por trás.</p>
        <label style="display:block;margin-top:10px;">Tipo
            <select id="mestre-ferida-tipo" style="width:100%;">${opcoesTipo}</select>
        </label>
        <label style="display:block;margin-top:10px;">Local (opcional)
            <select id="mestre-ferida-local" style="width:100%;">
                <option value="">Sem local específico</option>
                ${opcoesLocal}
            </select>
        </label>
        <label style="display:block;margin-top:10px;">Origem
            <input type="text" id="mestre-ferida-origem" style="width:100%;" placeholder="Ex.: queda de 3 andares, explosão, faca enferrujada...">
        </label>
        <div id="mestre-ferida-campos-sangramento" style="display:none;">
            <label style="display:block;margin-top:10px;">Dano por turno
                <input type="number" id="mestre-ferida-dano-turno" style="width:100%;" value="2" min="0">
            </label>
            <label style="display:block;margin-top:10px;">Nº de turnos (ticks)
                <input type="number" id="mestre-ferida-turnos" style="width:100%;" value="3" min="0">
            </label>
        </div>
        <button type="button" class="btn-lime" id="btn-mestre-confirmar-aplicar-ferida" style="margin-top:14px;width:100%;">Aplicar ferida</button>
    `;
    const fechar = () => modal.remove();
    modal.querySelector(".combate-fechar").addEventListener("click", fechar);

    const selectTipo = modal.querySelector("#mestre-ferida-tipo");
    const camposSangramento = modal.querySelector("#mestre-ferida-campos-sangramento");
    selectTipo.addEventListener("change", () => {
        camposSangramento.style.display = selectTipo.value === "sangramento" ? "" : "none";
    });

    modal.querySelector("#btn-mestre-confirmar-aplicar-ferida").addEventListener("click", async () => {
        const tipo = selectTipo.value;
        const local = modal.querySelector("#mestre-ferida-local").value || null;
        const origem = modal.querySelector("#mestre-ferida-origem").value.trim() || "Aplicada manualmente pelo Mestre";
        const dadosFerida = { tipo, local, origem, estadoInicial: "aberta" };
        if (tipo === "sangramento") {
            const dano = Number(modal.querySelector("#mestre-ferida-dano-turno").value) || 0;
            const turnos = Number(modal.querySelector("#mestre-ferida-turnos").value) || 0;
            if (dano <= 0 || turnos <= 0) { toast("Informe o dano por turno e o número de turnos.", "erro"); return; }
            dadosFerida.danoPorTurno = dano;
            dadosFerida.turnosRestantes = turnos;
        }
        try {
            await criarFerida(estado.fichaAtualId, dadosFerida);
            const detalhe = `Mestre aplicou uma ferida (${tituloTipoFerida(tipo)}${local ? ` — ${labelLocalFerida(local)}` : ""}) em ${nomeFicha}: ${origem}`;
            await registrarRolagem({ quem: "Mestre", modificador: 0, resultado: 0, detalhe });
            toast(`Ferida aplicada em ${nomeFicha}.`);
            fechar();
        } catch (err) {
            console.error(err);
            toast(err.message || "Falha ao aplicar a ferida.", "erro");
        }
    });
}

export async function mestreInstalarImplanteSemTeste(itemId) {
    if (!estado.isMestre || !estado.fichaAtualId || !estado.fichaAtual) return;
    const item = estado.fichaAtual.inventario?.[itemId];
    if (!item || !item.implante || item.implante.instalado) {
        toast("Esse implante não está mais disponível pra instalar.", "erro");
        return;
    }

    const nivel = Number(item.nivelTag) || 0;
    const contaPraLimite = subtipoContaComoImplante(item.implante.subtipo);
    if (contaPraLimite) {
        const { semVaga } = implantesContagemELimite(estado.fichaAtual);
        if (semVaga && !confirm(`${estado.fichaAtual?.config?.nomeExibicao || estado.fichaAtualId} já está no limite de implantes (chips não contam). Instalar "${item.nome}" mesmo assim?`)) {
            return;
        }
    }

    const historicoAtual = Array.isArray(item.implante.historico) ? item.implante.historico : [];
    const linha = { tipo: "instalar", resultado: "instalado_sem_teste_pelo_mestre", por: "Mestre", em: Date.now() };

    // testesAdaptacaoFeitos já sai igual ao nível — feitos >= nivel
    // faz o botão "Testar adaptação" nem aparecer mais pro jogador
    // (ver renderizarImplantes/testarAdaptacaoImplante acima), exatamente
    // como "livrar dos testes de Constituição" pede.
    await update(ref(db, caminhoMesa(`fichas/${estado.fichaAtualId}/inventario/${itemId}/implante`)), {
        instalado: true,
        testesAdaptacaoFeitos: nivel,
        historico: [...historicoAtual, linha]
    });

    toast(`"${item.nome}" instalado direto em ${estado.fichaAtual?.config?.nomeExibicao || estado.fichaAtualId} — sem rolagens, sem testes de adaptação.`, "ok");
}

// Fase 6.2: cada clique rola Constituição (mesmo cálculo estruturado —
// atributo + modificadores — usado em qualquer outro teste de
// Constituição do sistema, via buscarConstituicaoAlvo) contra
// dif 10 + nível (manual, pg. 86 — não 2×nível, esse multiplicador é só
// pro dano de uso com rejeição parcial mais abaixo). NÃO passa por Ação
// Pendente (sem terceiro envolvido — ver cabeçalho da seção acima) —
// grava direto, igual tratarFerida em si mesmo. Cada falha soma +1 em
// rejeicaoParcial; sucesso ou falha, sempre consome uma tentativa
// (testesAdaptacaoFeitos).
export async function testarAdaptacaoImplante(itemId) {
    if (estado.isMestre || estado.modoNpc || !estado.fichaAtualId || !estado.fichaAtual) return;

    const item = estado.fichaAtual.inventario?.[itemId];
    if (!item || !item.implante || !item.implante.instalado) {
        toast("Esse implante não está mais instalado nessa ficha.", "erro");
        return;
    }
    const imp = item.implante;
    if (imp.quebrado) { toast("Este implante está quebrado — não há o que adaptar.", "erro"); return; }

    const nivel = Number(item.nivelTag) || 0;
    const feitos = Number(imp.testesAdaptacaoFeitos) || 0;
    if (feitos >= nivel) { toast("Os testes de adaptação desse implante já acabaram.", "erro"); return; }

    // Mesma correção de fórmula da exibição em renderizarImplantes acima
    // — manual pede dif 10 + nível, não 10 + 2×nível.
    const dificuldade = 10 + nivel;
    const constituicaoMod = await buscarConstituicaoAlvo("ficha", estado.fichaAtualId);
    const bruto = rolarD20();
    const resultado = bruto + constituicaoMod;
    const sucesso = resultado >= dificuldade;
    const rejeicaoAtual = Number(imp.rejeicaoParcial) || 0;
    const novaRejeicao = sucesso ? rejeicaoAtual : rejeicaoAtual + 1;

    const detalhe = `Adaptação — ${item.nome} (dif ${dificuldade}): d20 (${bruto}) ${constituicaoMod >= 0 ? "+" : ""}${constituicaoMod} = ${resultado}`
        + (sucesso ? " — o corpo está aceitando o implante." : " — o corpo rejeitou este teste (+1 rejeição parcial).");

    const historicoAtual = Array.isArray(imp.historico) ? imp.historico : [];
    const quem = estado.fichaAtual?.config?.nomeExibicao || estado.sessao.nome || "Jogador";
    const linha = { tipo: "adaptacao", resultado: sucesso ? "sucesso" : "falha", por: quem, em: Date.now() };

    await update(ref(db, caminhoMesa(`fichas/${estado.fichaAtualId}/inventario/${itemId}/implante`)), {
        testesAdaptacaoFeitos: feitos + 1,
        rejeicaoParcial: novaRejeicao,
        historico: [...historicoAtual, linha]
    });

    await registrarRolagem({ quem, modificador: constituicaoMod, resultado, detalhe, critico: null });
    toast(detalhe, sucesso ? "ok" : "erro");
}

// Fase 6.3: botão manual do Mestre (nunca automático) pra aplicar o
// dano de "toda vez que usar a prótese" enquanto houver rejeição
// parcial (manual: 2×nível). Sem Ação Pendente — o Mestre clicando JÁ É
// a confirmação, mesmo padrão de outros botões Godmode desta aba
// (reverterComaGodmode/acordarDesmaioGodmode, acima). `refId` é sempre
// a ficha que o Mestre está com a tela aberta (estado.fichaAtualId) — este
// botão só aparece dentro do card de implante daquela ficha.
export async function aplicarDanoUsoImplanteGodmode(itemId, nomeImplante, dano) {
    if (!estado.isMestre || estado.modoNpc || !estado.fichaAtualId || !dano) return;
    try {
        await aplicarDano("ficha", estado.fichaAtualId, dano, null);
        toast(`${dano} de dano aplicado por uso de "${nomeImplante}" com rejeição parcial.`);
    } catch (err) {
        console.error(err);
        toast("Falha ao aplicar o dano de uso.", "erro");
    }
}

// ---------------------------------------------------------------------
// Efeitos de equipamento médico aplicados ao tratamento de ferida
// (Fases 4 e 7 do plano de efeitos de equipamentos médicos —
// plano-efeitos-equipamentos-medicos.txt). Olha pros 4 tipos que miram
// um teste de tratamento específico (bonus_teste_tratamento /
// isenta_penalidade_item / reduz_dificuldade_tratamento /
// sucesso_automatico_tratamento) E, se `tipoFerida` for passado, pelo
// `fator_tempo_recuperacao` aplicável ao TIPO daquela ferida (Fase 7 —
// esse aqui não tem `tratamentos[]`, tem `tiposFerida[]`, por isso é
// checado à parte dos outros 4) — os tipos de infecção e de uso direto
// são despachados em outros pontos do código (Fase 5 / abrirModalTestar
// InfeccaoFerida e Fase 6 / usarEquipamentoMedico).
// ---------------------------------------------------------------------

// Decrementa 1 unidade de "usos restantes" (o próprio campo
// `quantidade` já usado por drogas/consumíveis — ver consumirDroga
// acima) do item de equipamento médico usado num tratamento/teste
// (Fase 4.4 / 6.3 do plano). Item com `quantidade: null` é permanente/
// reutilizável (ex.: Tala de Imobilização, Pinça Cirúrgica) e não
// decrementa nada.
export async function decrementarItemMedico(itemId) {
    if (!itemId) return;
    const item = estado.fichaAtual.inventario && estado.fichaAtual.inventario[itemId];
    if (!item) return;
    const quantidadeAtual = Number(item.quantidade);
    if (!Number.isFinite(quantidadeAtual)) return;
    const atualizacoes = {};
    if (quantidadeAtual > 1) {
        item.quantidade = quantidadeAtual - 1;
        atualizacoes[`${caminhoBase()}/inventario/${itemId}/quantidade`] = item.quantidade;
    } else {
        delete estado.fichaAtual.inventario[itemId];
        atualizacoes[`${caminhoBase()}/inventario/${itemId}`] = null;
    }
    try {
        await update(ref(db), atualizacoes);
    } catch (e) {
        toast("O item foi usado, mas não deu pra descontar a quantidade no inventário. Ajuste à mão.", "erro");
    }
}

// Modal "Tratar outro jogador" (Etapa 4 do plano): paciente -> ferida ->
// ação, em cascata. A rolagem em si (item usado, dificuldade, bônus
// extra) reaproveita abrirModalTratarFerida passando `alvo`, pra não
// duplicar aquele formulário — só muda quem é o dono da ferida.
function abrirModalTratarOutroJogador() {
    const outras = Object.entries(estado.todasAsFichasCache || {}).filter(([id]) => id !== estado.fichaAtualId);
    if (!outras.length) { toast("Não há outras fichas ativas na rede pra tratar.", "erro"); return; }

    let modal = document.getElementById("modal-tratar-outro");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-tratar-outro";
        modal.className = "panel combate-painel-jogador";
        document.body.appendChild(modal);
    }

    const opcoesPaciente = outras
        .sort(([, a], [, b]) => ((a.config && a.config.nomeExibicao) || "").localeCompare((b.config && b.config.nomeExibicao) || ""))
        .map(([id, f]) => `<option value="${id}">${escapeHtml((f.config && f.config.nomeExibicao) || id)}</option>`)
        .join("");

    modal.innerHTML = `
        <div class="combate-painel-topo">
            <span class="eyebrow">Tratar outro jogador</span>
            <button type="button" class="combate-fechar" aria-label="Fechar">×</button>
        </div>
        <label style="display:block;margin-top:10px;">Paciente
            <select id="tratar-outro-paciente" style="width:100%;">
                <option value="">Escolha…</option>
                ${opcoesPaciente}
            </select>
        </label>
        <div id="tratar-outro-corpo"></div>
    `;
    const fechar = () => modal.remove();
    modal.querySelector(".combate-fechar").addEventListener("click", fechar);

    const corpo = modal.querySelector("#tratar-outro-corpo");

    function renderFerida() {
        const pacienteId = modal.querySelector("#tratar-outro-paciente").value;
        if (!pacienteId) { corpo.innerHTML = ""; return; }

        const feridasPaciente = Object.entries((estado.todasAsFichasCache[pacienteId] || {}).feridas || {})
            .map(([id, v]) => ({ id, ...v }))
            .filter(f => acoesDeTratamentoParaFerida(f).length); // só as que têm alguma ação disponível agora

        if (!feridasPaciente.length) {
            corpo.innerHTML = `<p class="hint" style="margin-top:10px;">Esse personagem não tem nenhuma ferida pendente de tratamento no momento.</p>`;
            return;
        }

        const opcoesFerida = feridasPaciente.map(f =>
            `<option value="${f.id}">${tituloTipoFerida(f.tipo)}${f.local ? ` — ${tituloLocalFerida(f.local)}` : ""} (${tituloEstadoFerida(f.estado)})</option>`
        ).join("");

        corpo.innerHTML = `
            <label style="display:block;margin-top:10px;">Ferida
                <select id="tratar-outro-ferida" style="width:100%;">${opcoesFerida}</select>
            </label>
            <div id="tratar-outro-acao"></div>
        `;
        const selectFerida = corpo.querySelector("#tratar-outro-ferida");
        const areaAcao = corpo.querySelector("#tratar-outro-acao");

        function renderAcao() {
            const feridaId = selectFerida.value;
            const ferida = feridasPaciente.find(f => f.id === feridaId);
            const acoes = ferida ? acoesDeTratamentoParaFerida(ferida) : [];
            if (!acoes.length) { areaAcao.innerHTML = ""; return; }

            const opcoesAcao = acoes.map(a => `<option value="${a}">${escapeHtml(TRATAMENTOS_FERIDA[a].label)}</option>`).join("");
            areaAcao.innerHTML = acoes.length > 1
                ? `<label style="display:block;margin-top:10px;">Tratamento
                       <select id="tratar-outro-acao-select" style="width:100%;">${opcoesAcao}</select>
                   </label>
                   <button type="button" class="btn-lime" id="btn-tratar-outro-continuar" style="margin-top:14px;width:100%;">Continuar</button>`
                : `<button type="button" class="btn-lime" id="btn-tratar-outro-continuar" style="margin-top:14px;width:100%;">Continuar — ${escapeHtml(TRATAMENTOS_FERIDA[acoes[0]].label)}</button>`;

            areaAcao.querySelector("#btn-tratar-outro-continuar").addEventListener("click", () => {
                const acaoEscolhida = acoes.length > 1 ? areaAcao.querySelector("#tratar-outro-acao-select").value : acoes[0];
                const nomePaciente = (estado.todasAsFichasCache[pacienteId].config && estado.todasAsFichasCache[pacienteId].config.nomeExibicao) || pacienteId;
                fechar();
                abrirModalTratarFerida(feridaId, acaoEscolhida, { fichaId: pacienteId, nome: nomePaciente });
            });
        }
        selectFerida.addEventListener("change", renderAcao);
        renderAcao();
    }
    modal.querySelector("#tratar-outro-paciente").addEventListener("change", renderFerida);
}

// Mostra o modal de Esquiva/Bloqueio pra quem RECEBEU o golpe (não pra
// quem atacou) — é o mesmo estado de combate sincronizado em tempo real
// pra todo mundo, então cada cliente decide localmente se essa reação
// pendente é "sua" (participanteId bate com a própria ficha) ou se é de
// um NPC (nesse caso, o Mestre resolve). O Mestre também vê/responde
// como reforço, caso o jogador-alvo não esteja com a aba aberta.
export function avaliarReacaoPendente() {
    const r = estado.combateAtivoCache && estado.combateAtivoCache.reacaoPendente;
    if (!r) {
        el.modalReacaoDefesa.classList.remove("active");
        return;
    }
    const souOAlvo = !estado.isMestre && meuParticipanteIdCombate() === r.participanteId;
    if (!souOAlvo && !estado.isMestre) {
        el.modalReacaoDefesa.classList.remove("active");
        return;
    }
    renderizarReacaoPendente(r);
}

// renderizarReacaoPendente foi movida pra mestre/acoes-pendentes.js
// no Passo 26 do plano de modularização de ficha.js — ver import no
// topo deste arquivo.

// Modificador (d20 + isso) do teste de Esquivar de quem RECEBEU o golpe
// (manual: Agilidade vs. dificuldade = pontuação do ataque sofrido).
// Mesma fórmula de Agilidade de combate usada em
// calcularStatsCombateParticipante (mestre.js) — penalidade de Machucado/
// Muito Machucado (estadoSaude) E de Exausto/Crítico (estadoEnergia), já
// que Agilidade é um teste físico igual iniciativa. Soma o bônus passivo
// de Boxe (manual pg. 22: +2 esquivando de golpe desarmado, +1 de arma
// branca — ver bonusEsquivaBoxe em dados-manual.js) quando o alvo tem a
// perícia, escolhendo o valor certo conforme `ataqueArmaBranca`. NPC
// "rápido" usa a Agilidade solta cadastrada nele (sem perícias, então
// nunca tem Boxe).
export async function calcularModEsquivarParticipante(alvoTipo, alvoRefId, ataqueArmaBranca) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return 0;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const derivados = calcularDerivados(fichaAlvo.dados, modificadoresPlanos);
        const pvMaxCalc = Math.round(derivados.recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        const energiaMax = Math.round(derivados.recursos.energia.total);
        const energiaAtual = (fichaAlvo.dados.energiaAtual !== null && fichaAlvo.dados.energiaAtual !== undefined) ? Number(fichaAlvo.dados.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, false);
        const modAgilidade = Math.round(derivados.secundarios.agilidade.total) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica;
        const entradaBoxe = Object.entries(fichaAlvo.pericias || {}).find(([, p]) => p.nome === "Boxe");
        const bonusBoxe = entradaBoxe ? bonusEsquivaBoxe(entradaBoxe[1].nivel) : null;
        const extraBoxe = bonusBoxe ? (ataqueArmaBranca ? bonusBoxe.armaBranca : bonusBoxe.desarmado) : 0;
        return modAgilidade + extraBoxe;
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return 0;
    const npc = snap.val();
    if (npc.modoDetalhado && npc.atributosPrimarios) {
        const modificadoresVantagensNpc = coletarModificadores({ vantagens: npc.vantagens });
        const secundarios = calcularSecundariosNpc(npc.atributosPrimarios, npc.secundariosOverride, modificadoresVantagensNpc);
        const pvMax = secundarios.recursos.pv.valor;
        const pvAtual = (npc.pvAtual !== null && npc.pvAtual !== undefined) ? Number(npc.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(npc.periciasNpc, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        const energiaMax = secundarios.recursos.energia.valor;
        const energiaAtual = (npc.energiaAtual !== null && npc.energiaAtual !== undefined) ? Number(npc.energiaAtual) : energiaMax;
        const estadoEnergia = calcularEstadoEnergia(energiaAtual, energiaMax, false);
        const modAgilidade = Math.round(secundarios.secundarios.agilidade.valor) + estadoSaude.penalidadeTestes + estadoEnergia.penalidadeFisica;
        const entradaBoxe = npc.periciasNpc ? Object.entries(npc.periciasNpc).find(([, p]) => p.nome === "Boxe") : null;
        const bonusBoxe = entradaBoxe ? bonusEsquivaBoxe(entradaBoxe[1].nivel) : null;
        const extraBoxe = bonusBoxe ? (ataqueArmaBranca ? bonusBoxe.armaBranca : bonusBoxe.desarmado) : 0;
        return modAgilidade + extraBoxe;
    }
    return Number(npc.agilidade) || 0;
}

// Modificador (d20 + isso) do teste de Aparar de quem RECEBEU o golpe —
// busca os dados de perícia mais atuais direto do banco (funciona tanto
// pra um jogador quanto pra um NPC, detalhado ou "rápido"). Segue a
// MESMA regra de qualquer outro teste de perícia: nível 0/perícia
// ausente vira -1 fixo (destreinado), já com a penalidade de estado de
// saúde embutida (Machucado/Muito Machucado). NPC "rápido" (sem
// perícias estruturadas cadastradas) não tem como saber se está
// treinado — sempre conta como destreinado (-1).
export async function calcularModApararParticipante(alvoTipo, alvoRefId, nomePericia) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return -1;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const pvMaxCalc = Math.round(calcularDerivados(fichaAlvo.dados, modificadoresPlanos).recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        return modificadorDePericiaComPenalidade(nomePericia, fichaAlvo.dados, fichaAlvo.pericias, modificadoresPlanos, estadoSaude.penalidadeTestes);
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return -1;
    const npc = snap.val();
    if (npc.modoDetalhado && npc.periciasNpc) {
        const entrada = Object.values(npc.periciasNpc).find(p => p.nome === nomePericia);
        const nivel = entrada ? (Number(entrada.nivel) || 0) : 0;
        return nivel > 0 ? nivel : -1;
    }
    return -1;
}

// Melhor perícia do alvo dentro de uma lista fechada — usado pra
// dificuldade de Delimitar alcance ("11 + perícia corpo a corpo do
// alvo", lista padrão PERICIAS_APARAR, já que o manual não especifica
// QUAL perícia) e reaproveitado pra Imobilizar (CQC nível 4, lista
// PERICIAS_IMOBILIZAR_CQC — aí o manual É específico: "Jiu Jitsu, CQC
// ou Briga de Rua do alvo"). Busca tudo de uma vez (não chama
// calcularModApararParticipante em loop) pra economizar leituras.
async function calcularMelhorModCorpoACorpoParticipante(alvoTipo, alvoRefId, listaPericias = PERICIAS_APARAR) {
    if (alvoTipo === "ficha") {
        const snap = await get(ref(db, caminhoMesa(`fichas/${alvoRefId}`)));
        if (!snap.exists()) return -1;
        const fichaAlvo = normalizarFicha(snap.val());
        const modificadoresPlanos = coletarModificadores(fichaAlvo);
        const pvMaxCalc = Math.round(calcularDerivados(fichaAlvo.dados, modificadoresPlanos).recursos.pv.total) + (Number(fichaAlvo.dados.pvBonusExtra) || 0);
        const overridePv = fichaAlvo.dados.pvMaximoOverride;
        const pvMax = (overridePv !== null && overridePv !== undefined && overridePv !== "") ? (Number(overridePv) || 0) : pvMaxCalc;
        const pvAtual = (fichaAlvo.dados.pvAtual !== null && fichaAlvo.dados.pvAtual !== undefined) ? Number(fichaAlvo.dados.pvAtual) : pvMax;
        const temTolerancia = temPericiaTreinada(fichaAlvo.pericias, "Tolerância");
        const estadoSaude = calcularEstadoSaude(pvAtual, pvMax, temTolerancia, false);
        let melhor = -1;
        for (const nome of listaPericias) {
            const mod = modificadorDePericiaComPenalidade(nome, fichaAlvo.dados, fichaAlvo.pericias, modificadoresPlanos, estadoSaude.penalidadeTestes);
            if (mod > melhor) melhor = mod;
        }
        return melhor;
    }
    const snap = await get(ref(db, caminhoMesa(`npcs/${alvoRefId}`)));
    if (!snap.exists()) return -1;
    const npc = snap.val();
    if (npc.modoDetalhado && npc.periciasNpc) {
        let melhor = -1;
        Object.values(npc.periciasNpc).forEach(p => {
            if (listaPericias.includes(p.nome)) {
                const nivel = Number(p.nivel) || 0;
                if (nivel > melhor) melhor = nivel;
            }
        });
        return melhor;
    }
    return -1;
}

export function combateTemParticipantes() {
    return !!(estado.combateAtivoCache && estado.combateAtivoCache.ativo && estado.combateAtivoCache.participantes && Object.keys(estado.combateAtivoCache.participantes).length);
}

// Combate "com iniciativa" (ordem de turnos) ativo = tem ordemTurnos
// gravada, diferente de combateTemParticipantes() (que só checa se há
// alvos cadastrados pro botão "Usar").
export function combateComIniciativaAtivo() {
    return !!(estado.combateAtivoCache && estado.combateAtivoCache.ativo && Array.isArray(estado.combateAtivoCache.ordemTurnos) && estado.combateAtivoCache.ordemTurnos.length);
}

// Acha o id do participante (chave dentro de combateAtivo/participantes)
// que corresponde à ficha atualmente logada, se ela estiver no combate.
export function meuParticipanteIdCombate() {
    if (estado.isMestre || !estado.fichaAtualId) return null;
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const entrada = Object.entries(participantes).find(([, p]) => p.tipo === "ficha" && p.refId === estado.fichaAtualId);
    return entrada ? entrada[0] : null;
}

// Equivalente a meuParticipanteIdCombate(), pro NPC que o Mestre está
// "atuando como" no momento (ver caminhoBase()/estado.modoNpc).
export function npcParticipanteIdCombate() {
    if (!estado.modoNpc || !estado.npcAtualId) return null;
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const entrada = Object.entries(participantes).find(([, p]) => p.tipo === "npc" && p.refId === estado.npcAtualId);
    return entrada ? entrada[0] : null;
}

// Acha o participantId de combate de QUALQUER ficha/npc pelo (tipo,
// refId) — diferente de meuParticipanteIdCombate/npcParticipanteIdCombate
// (que só acham "a própria tela"), usado pela ferramenta genérica
// "Causar dano" do Mestre (que deixa escolher qualquer alvo, dentro ou
// fora do combate) pra saber se dá pra testar Sangramento (Profundo ou
// comum), que depende de status por turno — ver Dilaceração (item 7 do
// plano de saúde/complicações) logo abaixo.
export function participanteIdPorAlvo(tipo, refId) {
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const entrada = Object.entries(participantes).find(([, p]) => p.tipo === tipo && p.refId === refId);
    return entrada ? entrada[0] : null;
}

// Busca ao vivo só a Constituição (defesa) de uma ficha/npc pelo
// (tipo, refId) — mesmo cálculo já usado em resolverArremessar acima,
// extraído aqui pra reaproveitar na ferramenta genérica "Causar dano"
// do Mestre (Dilaceração por explosão, item 7 do plano).
export async function buscarConstituicaoAlvo(tipo, refId) {
    try {
        if (tipo === "ficha") {
            const snap = await get(ref(db, caminhoMesa(`fichas/${refId}`)));
            if (!snap.exists()) return 0;
            const fichaAlvo = normalizarFicha(snap.val());
            const modsAlvo = coletarModificadores(fichaAlvo);
            return calcularDificuldadeDefesaJogador(fichaAlvo.dados, "constituicao", modsAlvo, 0);
        }
        const snap = await get(ref(db, caminhoMesa(`npcs/${refId}`)));
        if (!snap.exists()) return 0;
        const npc = snap.val();
        if (npc.modoDetalhado && npc.atributosPrimarios) {
            const modsNpcAlvo = coletarModificadores({ vantagens: npc.vantagens });
            return calcularDificuldadeDefesaJogador(npc.atributosPrimarios, "constituicao", modsNpcAlvo, 0);
        }
        return Number(npc.constituicao) || 0;
    } catch (err) {
        console.error(err);
        return 0;
    }
}

// Busca ao vivo o modificador total de UMA perícia de resistência
// (ex.: "Resistência Imunológica", "Resistência Mental") de qualquer
// ficha/npc pelo (tipo, refId) — Parte 5.3 do plano de automação dos
// materiais químicos, pra resolver o "d20 + perícia do alvo" ANTES de
// chamar aplicarTesteAtrasado (mestre.js), do mesmo jeito que
// buscarConstituicaoAlvo acima resolve Constituição antes de
// aplicarSangramento/testarSangramentoProfundo.
//
// Não duplica lógica nova: calcularModApararParticipante (abaixo,
// ~15434) já é 100% genérica por nomePericia — mesma regra de "nível 0
// ou perícia ausente vira -1 fixo" já usada em qualquer outro teste do
// sistema — só o nome dela é específico de Aparar por causa de onde
// foi extraída originalmente. Este wrapper só dá um nome que não
// confunde quem estiver lendo o código dos efeitos químicos com
// "aparar".
async function buscarValorPericiaAlvo(tipo, refId, nomePericia) {
    return calcularModApararParticipante(tipo, refId, nomePericia);
}

// Modificadores de "penalidade_temporizada" (Parte 5.3 do plano de
// automação dos materiais químicos — Sedativo 1/3, Psicotrópico 1)
// ativos em quem está sendo controlado nesta tela agora. Mesmo
// princípio de calcularModificadoresAbstinencia (regras.js) — um
// modificador com prazo de validade —, só que a fonte é
// combateAtivo/participantes/{meuPid}/statusAtivos em vez de
// ficha.desvantagens, então fica do lado da FICHA (aqui) e não em
// coletarModificadores (que é uma função pura, sem acesso ao Firebase
// de combate). Cada `alvo` do array `status.alvos` vira uma entrada
// própria, todas com o mesmo `valor` — mesmo formato plano usado em
// toda parte (coletarModificadores/somaModificadoresPara).
function modificadoresPenalidadeTemporizada() {
    const meuPid = estado.modoNpc ? npcParticipanteIdCombate() : meuParticipanteIdCombate();
    if (!meuPid) return [];
    const participantes = (estado.combateAtivoCache && estado.combateAtivoCache.participantes) || {};
    const statusAtivos = (participantes[meuPid] && participantes[meuPid].statusAtivos) || {};
    const todos = [];
    for (const status of Object.values(statusAtivos)) {
        if (!status || status.tipo !== "penalidade_temporizada") continue;
        if ((Number(status.turnosRestantes) || 0) <= 0) continue;
        const origem = `Efeito temporário: ${status.origem || status.label || "?"}`;
        const alvos = Array.isArray(status.alvos) ? status.alvos : [status.alvos];
        for (const alvo of alvos) {
            if (!alvo) continue;
            todos.push({ alvo, valor: Number(status.valor) || 0, origem });
        }
    }
    return todos;
}

// ---------------------------------------------------------------------
// Trava de ações do turno, compartilhada entre toda rolagem em combate
// (perícia solta, manobra de combate, ataque com arma/item):
//   - Jogador: precisa ser o turno dele E ter ação sobrando.
//   - Mestre atuando como NPC: mesma checagem de turno/ações.
//   - Fora de combate com iniciativa, ou personagem fora da lista de
//     participantes: ação livre, sem gasto de turno.
// Em QUALQUER caso, o gasto em si nunca é consumido aqui — só entra na
// fila de Ações Pendentes do Mestre (ver criarAcaoPendente/
// resolverAcaoPendente em mestre.js). Regra da mesa: nenhuma ação ou
// dado rolado em combate gasta ação do turno sozinho, mesmo sendo o
// próprio Mestre controlando o NPC — ele sempre aprova ou recusa na
// fila, igual faria com um jogador.
// Retorna null se a ação não pode prosseguir (toast já disparado), ou
// um objeto { participanteId } — participanteId é null quando não há
// economia de ação a aplicar.
//
// ehCQC (default false): identifica se a rolagem em questão usa
// especificamente a perícia CQC — só importa pro CQC nível 5 ("Agente
// Impossível", manual: "recebe uma ação extra em seu turno para
// rolagens de CQC"). Quando o `acoes` normal já zerou, MAS ehCQC e
// ainda sobra `acoesExtraCQC`, a ação prossegue mesmo assim, usando
// esse contador separado (ver consumirAcaoExtraCQC em mestre.js) — o
// resultado devolve `extraCQC: true` pra quem chamou saber qual contador
// gastar. Cada chamador que já sabe qual perícia está rolando (ver
// resolverAtaque/resolverAgarrar/resolverDesarmar/resolverDerrubar/
// resolverImobilizar/resolverArremessar/resolverDelimitarAlcance/
// resolverRetomarAlcance/rolarERegistrar) passa isso adiante.
// direcionado (default true): se esta ação/rolagem tem um alvo dentro
// do combate (ataque, manobra, uso de arma). Rolagens "soltas" —
// perícia/atributo avulsos, uso de item sem alvo, criação de receita —
// chamam com direcionado=false, pra deixar quem está FORA do combate
// rolar normalmente (não estão fazendo nada contra quem está lutando,
// só não entram na fila de turno/ação daquele combate).
export function checarConsumoDeAcao(ehCQC = false, direcionado = true) {
    if (!combateComIniciativaAtivo()) return { participanteId: null, extraCQC: false };

    if (!estado.isMestre) {
        const meuId = meuParticipanteIdCombate();
        if (!meuId) {
            if (!direcionado) {
                // Fora do combate, mas é uma rolagem solta (não mira
                // ninguém em combate): deixa passar, sem gastar ação de
                // ninguém — quem está de fora não participa da ordem de
                // turnos daquele combate.
                return { participanteId: null, extraCQC: false };
            }
            // Combate com iniciativa ativo, mas esta ficha não é uma das
            // participantes: ela está fora do combate e não pode fazer
            // nada DIRECIONADO a quem está nele (ataque, manobra, usar
            // arma) — evita personagens de fora "agindo contra" um
            // combate do qual não fazem parte.
            toast("Você não está participando deste combate — só dá pra rolar coisas que não mirem em quem está lutando.", "erro");
            return null;
        }
        const p = estado.combateAtivoCache.participantes[meuId];
        const guardadas = p ? (Number(p.acoesGuardadas) || 0) : 0;

        if (estado.combateAtivoCache.turnoAtual !== meuId) {
            // Fora do próprio turno só é permitido gastar uma ação
            // GUARDADA (ver "guardar_acao_combate" em avancarTurnoCombate/
            // confirmarAcaoPendente, em mestre.js) — o Mestre precisa ter
            // aprovado isso antes. consumirAcaoCombate já sabe descontar
            // de acoesGuardadas quando `acoes` normal está zerado.
            if (guardadas > 0) {
                return { participanteId: meuId, extraCQC: false, usouAcaoGuardada: true };
            }
            toast("Não é o seu turno.", "erro");
            return null;
        }
        if (p && Number(p.acoes) <= 0) {
            if (ehCQC && Number(p.acoesExtraCQC) > 0) {
                return { participanteId: meuId, extraCQC: true };
            }
            if (guardadas > 0) {
                return { participanteId: meuId, extraCQC: false, usouAcaoGuardada: true };
            }
            toast(p.iniciativaTravada ? "Tirou 1 na iniciativa — perdeu esse turno, sem ações." : "Sem ações restantes neste turno.", "erro");
            return null;
        }
        return { participanteId: meuId, extraCQC: false };
    }

    if (estado.modoNpc) {
        const npcPid = npcParticipanteIdCombate();
        if (!npcPid) return { participanteId: null, extraCQC: false };
        const p = estado.combateAtivoCache.participantes[npcPid];
        const guardadas = p ? (Number(p.acoesGuardadas) || 0) : 0;

        if (estado.combateAtivoCache.turnoAtual !== npcPid) {
            if (guardadas > 0) {
                return { participanteId: npcPid, extraCQC: false, usouAcaoGuardada: true };
            }
            toast("Não é o turno desse NPC.", "erro");
            return null;
        }
        if (p && Number(p.acoes) <= 0) {
            if (ehCQC && Number(p.acoesExtraCQC) > 0) {
                return { participanteId: npcPid, extraCQC: true };
            }
            if (guardadas > 0) {
                return { participanteId: npcPid, extraCQC: false, usouAcaoGuardada: true };
            }
            toast(p.iniciativaTravada ? "Esse NPC tirou 1 na iniciativa — perdeu esse turno, sem ações." : "Esse NPC não tem ações restantes neste turno.", "erro");
            return null;
        }
        return { participanteId: npcPid, extraCQC: false };
    }

    return { participanteId: null, extraCQC: false };
}

// renderizarAlertaIniciativaCombate foi movida pra abas/combate.js
// no Passo 23 do plano de modularização. Ver docs/estado-compartilhado.md
// e plano-modularizacao-ficha-js.txt.

// Bloqueia rolagens/ações da ficha (perícias, atributos, armas, manobras)
// sempre que houver combate com iniciativa ativo e não for o turno do
// jogador. O Mestre nunca é travado.
//
// Quem está DENTRO do combate mas fora do seu turno (e sem ação
// guardada) fica com tudo travado — perícias, atributos, manobras e
// itens/armas (classe .combate-bloqueio-ativo).
//
// Quem está FORA do combate (meuId null) pode continuar rolando
// perícias/atributos normalmente (não é uma ação "contra" ninguém), mas
// não pode fazer nada direcionado a quem está em combate — manobras de
// combate e uso de armas/itens continuam travados (classe
// .combate-bloqueio-alvo, que trava só .btn-pericia-golpe/.btn-usar-item).
export function travarAcoesForaDoTurno() {
    if (estado.isMestre) return;
    const meuId = meuParticipanteIdCombate();
    const emCombate = combateComIniciativaAtivo();
    const meuTurno = emCombate && !!meuId && estado.combateAtivoCache.turnoAtual === meuId;
    // Ação guardada (ver checarConsumoDeAcao/guardar_acao_combate): se o
    // Mestre já aprovou guardar uma ação, o personagem pode usá-la fora
    // do próprio turno — então a trava geral de botões não se aplica
    // nesse caso (a validação de verdade continua em checarConsumoDeAcao,
    // isso aqui só libera os botões pra chegar até lá).
    const p = meuId ? estado.combateAtivoCache.participantes[meuId] : null;
    const temAcaoGuardada = p && Number(p.acoesGuardadas) > 0;
    const bloquearTudo = emCombate && !!meuId && !meuTurno && !temAcaoGuardada;
    // Fora do combate: só trava o que mira alguém (manobra/arma), não
    // as rolagens simples de perícia/atributo.
    const bloquearAlvo = emCombate && !meuId;
    document.body.classList.toggle("combate-bloqueio-ativo", bloquearTudo);
    document.body.classList.toggle("combate-bloqueio-alvo", bloquearAlvo);
}

// montarPainelIniciativaJogador foi movida pra abas/combate.js no
// Passo 23 do plano de modularização. Ver docs/estado-compartilhado.md
// e plano-modularizacao-ficha-js.txt.

// =====================================================================
// SISTEMA DE APROVAÇÃO DO MESTRE (fila de Ações Pendentes)
// =====================================================================

// configurarAcoesPendentes e montarPainelAcoesPendentes foram
// movidas pra mestre/acoes-pendentes.js no Passo 26 do plano de
// modularização de ficha.js — ver import no topo deste arquivo.

// Acha, na fila de pendentes de custo de vida (`avisoCustoVida/pendentes`
// no Firebase), o mais antigo que ESTA ficha ainda não pagou. Um
// Timeskip que atravessa vários Domingos de uma vez gera vários
// pendentes; cada ficha paga um de cada vez, do mais antigo pro mais
// novo — nunca vê mais de um aviso simultâneo.
function proximoPendenteCustoVida() {
    if (!estado.fichaAtual) return null;
    const pagos = (estado.fichaAtual.dados && estado.fichaAtual.dados.custoVidaPagos) || {};
    const pendentesOrdenados = Object.entries(estado.ultimoAvisoCustoVida || {})
        .sort((a, b) => a[1] - b[1]) // mais antigo (Domingo mais atrás) primeiro
        .filter(([id]) => !pagos[id]);
    if (!pendentesOrdenados.length) return null;
    const [id] = pendentesOrdenados[0];
    return { id, restantes: pendentesOrdenados.length };
}

export function avaliarAvisoCustoVida() {
    if (estado.isMestre || !estado.fichaAtual) return;
    const pendente = proximoPendenteCustoVida();
    if (!pendente) {
        if (el.modalCustoVida.classList.contains("active")) el.modalCustoVida.classList.remove("active");
        return;
    }
    // Já está mostrando esse mesmo pendente? Não reabre/repisca à toa.
    if (el.modalCustoVida.classList.contains("active") && el.modalCustoVida.dataset.pendenteId === pendente.id) return;
    abrirModalCustoVida(pendente);
}

function abrirModalCustoVida(pendente) {
    const total = custoSemanalTotal(estado.fichaAtual);
    const notaFila = pendente.restantes > 1 ? ` (${pendente.restantes} pagamentos semanais pendentes — este é o mais antigo)` : "";
    el.custoVidaResumo.innerText = (estado.fichaAtual.dados.padraoDeVida
        ? `Gasto semanal total: CN$ ${total}.`
        : `Defina um padrão de vida no Perfil antes de pagar (gasto atual considera só extras: CN$ ${total}).`) + notaFila;

    const saldos = todosOsSaldos(estado.fichaAtual);
    el.custoVidaOrigem.innerHTML = "";
    saldos.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.innerText = s.nome;
        el.custoVidaOrigem.appendChild(opt);
    });

    el.modalCustoVida.dataset.pendenteId = pendente.id;
    el.modalCustoVida.classList.add("active");
}

// configurarAvisoTorniquete foi movido pra abas/combate.js no
// Passo 22 do plano de modularização. Ver docs/estado-compartilhado.md
// e plano-modularizacao-ficha-js.txt.

// =====================================================================
// PAINEL DO MESTRE
// =====================================================================

// configurarPainelMestre foi movida pra mestre/painel-mestre.js no
// Passo 27 do plano de modularização de ficha.js — ver import no
// topo deste arquivo.

// A topbar agora é fixa no topo (pra barra de vida/energia ficar sempre
// visível), mas sua altura varia (quebra linha em telas menores, muda
// conforme itens equipados etc.). Essa função mede a altura real e guarda
// numa CSS var (--topbar-h) que o resto do CSS usa pra empurrar o
// conteúdo abaixo dela e posicionar o painel de info do topo. Roda no
// carregamento, no resize da janela e sempre que a topbar mudar de
// tamanho sozinha (ResizeObserver cobre a quebra de linha dos itens
// equipados sem precisar recalcular manualmente em cada render).
function ajustarEspacoTopbar() {
    if (!el.topbar) return;
    const altura = el.topbar.offsetHeight;
    if (altura > 0) {
        document.documentElement.style.setProperty("--topbar-h", altura + "px");
    }
}

// Botão de menu (☰) na topbar fixa: abre uma janela deslizante encostada
// no topo direito com tudo que não precisa ficar sempre visível — cargo,
// mesa, godmode, seletor de ficha/NPC do Mestre, indicador de sincronia
// e os botões de Painel do Mestre / Gerenciador de Combate. Mesmo padrão
// de "clicar fora fecha" da gaveta de Ações Pendentes.
function configurarPainelInfoTopo() {
    if (!el.btnAbrirInfoTopo || !el.painelInfoTopo) return;

    const abrir = () => el.painelInfoTopo.classList.add("aberto");
    const fechar = () => el.painelInfoTopo.classList.remove("aberto");

    el.btnAbrirInfoTopo.addEventListener("click", (e) => {
        e.stopPropagation();
        if (el.painelInfoTopo.classList.contains("aberto")) fechar(); else abrir();
    });

    document.addEventListener("click", (e) => {
        if (!el.painelInfoTopo.classList.contains("aberto")) return;
        if (el.painelInfoTopo.contains(e.target) || el.btnAbrirInfoTopo.contains(e.target)) return;
        fechar();
    });

    if (el.topbar && typeof ResizeObserver !== "undefined") {
        new ResizeObserver(() => ajustarEspacoTopbar()).observe(el.topbar);
    }
    window.addEventListener("resize", ajustarEspacoTopbar);
    ajustarEspacoTopbar();
}

// Ícone fixo na lateral esquerda + gaveta flutuante (não é uma tela que
// sobrepõe tudo, como o Painel do Mestre — fica encostada na borda,
// desliza pra dentro/fora, e o resto da tela continua visível e usável
// por trás). Reaproveita montarPainelAcoesPendentes (mesma renderização
// usada na caixa lateral embutida do Gerenciador de Combate).
function configurarDrawerPendentes() {
    const abrir = () => {
        el.btnPendentesLateral.classList.add("aberto");
        el.drawerPendentes.classList.add("aberto");
        montarPainelAcoesPendentes(el.drawerPendentesCorpo);
    };
    const fechar = () => {
        el.btnPendentesLateral.classList.remove("aberto");
        el.drawerPendentes.classList.remove("aberto");
    };

    el.btnPendentesLateral.addEventListener("click", () => {
        if (el.drawerPendentes.classList.contains("aberto")) fechar(); else abrir();
    });
    el.drawerPendentesFechar.addEventListener("click", fechar);

    // Clicar fora da gaveta (e fora do próprio ícone, que já tem seu
    // próprio handler acima) fecha — sem precisar de um overlay escuro
    // bloqueando o resto da tela.
    document.addEventListener("click", (e) => {
        if (!el.drawerPendentes.classList.contains("aberto")) return;
        if (el.drawerPendentes.contains(e.target) || el.btnPendentesLateral.contains(e.target)) return;
        fechar();
    });
}

export function nomeDeFicha(fichaId) {
    const f = estado.todasAsFichasCache[fichaId];
    return f && f.config && f.config.nomeExibicao ? f.config.nomeExibicao : fichaId;
}

// Rótulos amigáveis pro cabeçalho de #mestre-corpo (ver
// mestre-corpo-titulo) — mesmo texto dos botões .mestre-acao em
// ficha.html, só que num lugar só pra não desalinhar se um dia mudar.
export const ROTULOS_ACAO_MESTRE = {
    xp: "Dar XP",
    dado: "Rolar Dado",
    dano: "Causar Dano",
    condicao: "Causar Condição",
    "efeito-quimico": "Aplicar Efeito Químico",
    npcs: "NPCs",
    dashboard: "Fichas ativas",
    biblioteca: "Biblioteca de Itens",
    "biblioteca-receitas": "Biblioteca de Receitas"
};

// Limpa e esconde o conteúdo aberto em #mestre-corpo (ver "×" ligado em
// configurarPainelMestre). Some com dataset.acaoAberta também, senão o
// listener em tempo real da Biblioteca (ver linha ~754/767 acima)
// reabriria o painel sozinho na próxima atualização do Banco Global.
// fecharAcaoMestre foi movida pra mestre/painel-mestre.js no Passo
// 27 do plano de modularização de ficha.js — usada só ali dentro
// (configurarPainelMestre), por isso não precisou de export.

// abrirAcaoMestre foi movida pra mestre/acoes-pendentes.js no Passo
// 26 do plano de modularização de ficha.js — ver import no topo
// deste arquivo. Continua chamando montarPainelXpMultiplo,
// montarPainelCondicaoMestre, montarPainelNpcs,
// montarPainelBibliotecaItens, montarPainelBibliotecaReceitas e
// montarDashboardFichas, cada uma já movida pro seu próprio módulo
// (mestre/painel-mestre.js, mestre/npcs.js e mestre/bibliotecas.js —
// ver imports no topo de mestre/acoes-pendentes.js).

// Painel de "Dar XP" com seleção múltipla: cada ficha ativa vira uma
// linha com checkbox; o XP digitado é enviado pra todas as marcadas de
// uma vez (em paralelo), com feedback de quantas fichas foram atualizadas.
// montarPainelXpMultiplo foi movida pra mestre/painel-mestre.js no
// Passo 27 do plano de modularização de ficha.js — ver import no
// topo deste arquivo.

// prefillValue (opcional): pré-seleciona um valor (formato "ficha::{id}"
// ou "npc::{id}", igual às options) assim que ele existir na lista.
// Necessário pro atalho da pendência "explosao_raio" (Fase 4) — como os
// NPCs chegam de forma assíncrona via ouvirNpcs, tentar `select.value =`
// synchronously logo após criar o select podia falhar se o alvo for um
// NPC ainda não carregado; aqui a seleção é reaplicada de novo assim que
// a lista de NPCs preencher.
export function criarSelectFichas(incluirNpcs, prefillValue = null) {
    const select = document.createElement("select");
    select.innerHTML = '<option value="">-- escolha --</option>';
    Object.keys(estado.todasAsFichasCache).forEach(id => {
        const opt = document.createElement("option");
        opt.value = incluirNpcs ? `ficha::${id}` : id;
        opt.innerText = nomeDeFicha(id);
        select.appendChild(opt);
    });
    if (prefillValue) select.value = prefillValue;
    if (incluirNpcs) {
        // NPCs carregados de forma assíncrona — popula via listener separado.
        ouvirNpcs((npcs) => {
            npcs.forEach(npc => {
                if (select.querySelector(`option[value="npc::${npc.id}"]`)) return;
                const opt = document.createElement("option");
                opt.value = `npc::${npc.id}`;
                opt.innerText = `[NPC] ${npc.nome}`;
                select.appendChild(opt);
            });
            if (prefillValue) select.value = prefillValue;
        });
    }
    return select;
}

// Igual a criarSelectFichas, mas SÓ de um lado (só fichas de jogador OU
// só NPCs) — usado pelo painel "Causar Condição" (ver
// montarPainelCondicaoMestre logo abaixo), que pede duas caixas
// separadas em vez de uma única lista misturada: uma pra escolher um
// jogador, outra pra escolher um NPC. O valor sempre sai no formato
// "ficha::{id}" / "npc::{id}", igual ao select combinado, pra poder
// reaproveitar o mesmo split(\"::\") no resto do código.
// criarSelectPersonagemPorTipo, obterOuCriarParticipanteMestre,
// CONDICOES_MESTRE e montarPainelCondicaoMestre foram movidos pra
// mestre/painel-mestre.js no Passo 27 do plano de modularização de
// ficha.js — ver import no topo deste arquivo.

// montarPainelNpcs, abrirEdicaoNpcDetalhado, montarFormularioNpcDetalhado
// e montarChecklistReducaoNpc foram movidos pra mestre/npcs.js no
// Passo 28 do plano de modularização de ficha.js — ver import no
// topo deste arquivo.

// montarPainelBibliotecaItens, montarPainelBibliotecaReceitas e
// montarDashboardFichas foram movidos pra mestre/bibliotecas.js no
// Passo 29 do plano de modularização de ficha.js (ficha.js não
// precisou de import próprio: só mestre/acoes-pendentes.js os chama).
// montarBarraFiltro, itemPassaFiltroCategoria e
// montarListaComScrollInfinito continuam aqui embaixo (são usados
// também por mestre/npcs.js, mestre/bibliotecas.js e outros painéis).

export function criarInput(tipo, placeholder) {
    const input = document.createElement("input");
    input.type = tipo;
    input.placeholder = placeholder;
    return input;
}

// ---------------------------------------------------------------------
// Categoria como texto livre com sugestão (plano-busca-categorias.txt,
// Fase A) — usada pelos 3 bancos (NPCs, Itens Globais, Receitas
// Globais). Calcula, na hora, os valores distintos de `campo` já em uso
// num cache (sem vazio, sem duplicata, ordenado alfabético) — não
// existe lista de categorias sincronizada à parte no Firebase, é sempre
// derivada do que já está salvo nos registros.
// ---------------------------------------------------------------------
export function categoriasDistintas(cache, campo = "categoria") {
    const vistas = new Set();
    (cache || []).forEach(registro => {
        const valor = (registro && registro[campo] || "").trim();
        if (valor) vistas.add(valor);
    });
    return [...vistas].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

// ---------------------------------------------------------------------
// Scroll infinito genérico: em vez de jogar a lista inteira no DOM de
// uma vez (o Banco Global de Itens/Receitas só cresce com o tempo),
// renderiza só a primeira leva (tamanhoPagina) e vai completando o
// resto conforme o usuário rola pra perto do fim — mesma ideia do feed
// do Instagram. Usa um IntersectionObserver numa "sentinela" invisível
// no fim da lista: quando ela entra na área visível do container que
// rola de verdade (scrollRoot), carrega mais um lote.
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
// Barra de busca por nome + filtro de categoria (plano-busca-categorias.txt,
// Fase B) — reaproveitada pelos 3 painéis de listagem do Banco Global
// (NPCs, Itens, Receitas). O filtro de categoria funciona em AND com o
// texto digitado, e a lista de categorias do <select> é recalculada na
// hora a partir do cache atual (mesmo espírito de categoriasDistintas,
// Fase A — só que aqui cada opção já vem com a contagem entre
// parênteses). `campo` é o nome do campo de categoria no objeto: varia
// entre os 3 bancos ("categoria" pra NPCs/Receitas, "categoriaBanco"
// pra Itens — ver nota sobre a colisão de nome em prepararModalItem).
// ---------------------------------------------------------------------
const SEM_CATEGORIA = "__sem_categoria__";

export function montarBarraFiltro(corpo, { placeholderBusca = "Buscar por nome..." } = {}) {
    const linha = document.createElement("div");
    linha.style.display = "flex";
    linha.style.gap = "8px";
    linha.style.flexWrap = "wrap";
    linha.style.marginBottom = "10px";

    const busca = criarInput("text", placeholderBusca);
    busca.style.flex = "1 1 200px";

    const selectCategoria = document.createElement("select");
    selectCategoria.style.flex = "1 1 160px";

    linha.append(busca, selectCategoria);
    corpo.appendChild(linha);

    // Recalcula as <option> do select a partir do cache atual, mantendo
    // a categoria selecionada se ela ainda existir entre as opções
    // (senão volta pra "Todas as categorias" — ex.: categoria escolhida
    // que não tem mais nenhum registro).
    function popularSelectCategoria(cache, campo = "categoria") {
        const valorAtual = selectCategoria.value;
        const contagem = new Map();
        let semCategoria = 0;
        (cache || []).forEach(registro => {
            const valor = (registro && registro[campo] || "").trim();
            if (!valor) { semCategoria++; return; }
            contagem.set(valor, (contagem.get(valor) || 0) + 1);
        });
        selectCategoria.innerHTML = "";
        const optTodas = document.createElement("option");
        optTodas.value = "";
        optTodas.innerText = "Todas as categorias";
        selectCategoria.appendChild(optTodas);
        [...contagem.keys()].sort((a, b) => a.localeCompare(b, "pt-BR")).forEach(cat => {
            const opt = document.createElement("option");
            opt.value = cat;
            opt.innerText = `${cat} (${contagem.get(cat)})`;
            selectCategoria.appendChild(opt);
        });
        if (semCategoria > 0) {
            const opt = document.createElement("option");
            opt.value = SEM_CATEGORIA;
            opt.innerText = `Sem categoria (${semCategoria})`;
            selectCategoria.appendChild(opt);
        }
        selectCategoria.value = [...selectCategoria.options].some(o => o.value === valorAtual) ? valorAtual : "";
    }

    return { busca, selectCategoria, popularSelectCategoria };
}

// Testa um registro (npc / item / receita) contra o <select> de
// categoria montado acima. Select em "" (Todas) sempre passa.
export function itemPassaFiltroCategoria(registro, selectCategoria, campo = "categoria") {
    const filtro = selectCategoria.value;
    if (!filtro) return true;
    const valor = (registro && registro[campo] || "").trim();
    if (filtro === SEM_CATEGORIA) return !valor;
    return valor === filtro;
}

export function montarListaComScrollInfinito({ container, scrollRoot, itens, renderItem, tamanhoPagina = 20, mensagemVazia = "Nada encontrado.", contadorEl = null }) {
    container.innerHTML = "";
    if (contadorEl) contadorEl.innerText = "";
    if (!itens.length) {
        container.innerHTML = `<p class="hint">${mensagemVazia}</p>`;
        return;
    }

    let carregados = 0;
    const sentinela = document.createElement("div");
    sentinela.className = "scroll-infinito-sentinela";
    container.appendChild(sentinela);

    const observer = new IntersectionObserver((entradas) => {
        if (entradas.some(e => e.isIntersecting)) carregarMais();
    }, { root: scrollRoot || null, rootMargin: "300px" });

    function carregarMais() {
        const proximos = itens.slice(carregados, carregados + tamanhoPagina);
        proximos.forEach(it => container.insertBefore(renderItem(it), sentinela));
        carregados += proximos.length;
        if (contadorEl) {
            contadorEl.innerText = carregados < itens.length
                ? `Mostrando ${carregados} de ${itens.length} — role pra ver mais`
                : `${itens.length} no total`;
        }
        if (carregados >= itens.length) observer.disconnect();
    }

    carregarMais();
    if (carregados < itens.length) observer.observe(sentinela);
}

// montarGerenciadorCombate foi movida pra abas/combate.js no Passo
// 23 do plano de modularização (junto com renderizarAlertaIniciativaCombate
// e montarPainelIniciativaJogador, ver comentários acima). Ver
// docs/estado-compartilhado.md e plano-modularizacao-ficha-js.txt.

// GERENCIADOR DE CENÁRIO (Mestre) — montarGerenciadorCenario,
// montarDetalheCenario, montarSecaoPerseguicaoCenario,
// montarFormularioIniciarPerseguicao e montarFormularioVeiculoCenario
// foram movidos pra abas/cenario.js no Passo 21 do plano de
// modularização (junto com o estado de módulo
// cenarioAbertoIdNoGerenciador). Ver docs/estado-compartilhado.md e
// plano-modularizacao-ficha-js.txt.

// =====================================================================
// CRIAÇÃO DE PERSONAGEM (wizard obrigatório)
// =====================================================================

function verificarCriacaoPendente() {
    if (estado.isMestre) { el.avisoCriacaoPendente.style.display = "none"; return; }
    if (estado.fichaAtual.criacao.concluida || estado.fichaAtual.dados.criacaoConcluida) {
        el.avisoCriacaoPendente.style.display = "none";
        return;
    }
    el.avisoCriacaoPendente.style.display = "flex";
}

document.getElementById("btn-continuar-criacao").addEventListener("click", abrirWizardCriacao);

// Fecha o wizard sem perder progresso (tudo já foi salvo incrementalmente
// a cada "Avançar"/mudança de bônus). O aviso "Continuar Criação" na tela
// principal continua visível pra reabrir de onde parou. Isso corrige o
// bug de não conseguir cadastrar Desvantagem durante a criação: o modal
// cobria a tela inteira e não tinha nenhuma forma de saída além de
// terminar todo o wizard, então a aba "Vantagens / Desvantagens" (onde
// se cadastra a Desvantagem) ficava inacessível.
document.getElementById("btn-fechar-criacao-temporariamente").addEventListener("click", () => {
    el.modalCriacao.classList.remove("active");
    verificarCriacaoPendente();
});

function abrirWizardCriacao() {
    el.modalCriacao.classList.add("active");
    renderEtapaCriacao();
}

async function salvarEstadoCriacao() {
    pausarSync();
    try {
        await update(ref(db, `${caminhoBase()}/criacao`), estado.fichaAtual.criacao);
    } finally {
        retornarSync();
    }
}

// Salva dados + perícias + criação em um único update atômico, disparando
// o listener do Firebase apenas uma vez (com o estado final completo).
// Usar sempre que o wizard precisar persistir múltiplos campos de uma vez.
async function salvarWizardStep() {
    pausarSync();
    try {
        await update(ref(db, `${caminhoBase()}`), {
            dados: estado.fichaAtual.dados,
            pericias: estado.fichaAtual.pericias,
            criacao: estado.fichaAtual.criacao
        });
    } finally {
        retornarSync();
    }
}

function renderEtapaCriacao() {
    el.criacaoCorpo.innerHTML = "";
    el.criacaoBotoes.innerHTML = "";

    const c = estado.fichaAtual.criacao;
    if (c.etapa === 1) renderEtapaFuncao();
    else if (c.etapa === 2) renderEtapaAtributos();
    else if (c.etapa === 3) renderEtapaPericiasLivres();
    else if (c.etapa === 4) renderEtapaPericiasFuncao();
    else if (c.etapa === 5) renderEtapaDesvantagensBonus();
    else if (c.etapa === 6) renderEtapaRevisao();
}

function botaoCriacao(texto, classe, onClick, desabilitado) {
    const btn = document.createElement("button");
    btn.className = classe; btn.type = "button"; btn.innerText = texto;
    btn.disabled = !!desabilitado;
    btn.addEventListener("click", onClick);
    el.criacaoBotoes.appendChild(btn);
    return btn;
}

// ---- Etapa 1: Função ----
function renderEtapaFuncao() {
    const c = estado.fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 1 de 6 — Função</div>`;
    const grid = document.createElement("div");
    grid.className = "funcao-grid";
    listaFuncoes().forEach(f => {
        const card = document.createElement("div");
        card.className = "funcao-card" + (c.funcaoEscolhida === f.key ? " selecionada" : "");
        card.innerHTML = `<span class="funcao-nome">${f.label}</span><span class="funcao-desc">${f.descricao}</span><span class="funcao-desc">Item inicial: ${f.itemInicial}</span>`;
        card.addEventListener("click", () => { c.funcaoEscolhida = f.key; renderEtapaCriacao(); });
        grid.appendChild(card);
    });
    el.criacaoCorpo.appendChild(grid);

    const f = funcaoDe(c.funcaoEscolhida);
    if (f && f.atributosEscolha) {
        const wrap = document.createElement("div");
        wrap.className = "modal-field";
        wrap.innerHTML = `<label>Escolha o atributo extra (${f.atributosEscolha.grupo.map(a => a === "carisma" ? "Carisma" : "Manipulação").join(" ou ")})</label>`;
        const select = document.createElement("select");
        select.innerHTML = '<option value="">-- escolha --</option>' + f.atributosEscolha.grupo.map(a => `<option value="${a}">${a === "carisma" ? "Carisma" : "Manipulação"}</option>`).join("");
        select.value = c.escolhaAtributoFuncao || "";
        select.addEventListener("change", () => { c.escolhaAtributoFuncao = select.value; });
        wrap.appendChild(select);
        el.criacaoCorpo.appendChild(wrap);
    }

    const podeAvancar = !!c.funcaoEscolhida && (!f || !f.atributosEscolha || !!c.escolhaAtributoFuncao);
    botaoCriacao("Avançar →", "btn-lime", async () => {
        const totalAtributosJaDistribuidos = ATRIBUTOS_PRIMARIOS.reduce((acc, a) => acc + (estado.fichaAtual.dados[a.key] || 0), 0);
        if (c.etapa1JaConfirmadaAntes && totalAtributosJaDistribuidos > 0) {
            if (!confirm("Trocar a função agora reinicia a distribuição de atributos e perícias já feita. Continuar?")) return;
        }
        c.etapa1JaConfirmadaAntes = true;
        aplicarAtributosFixosFuncao(estado.fichaAtual, c.funcaoEscolhida, c.escolhaAtributoFuncao);
        aplicarItemPericiaInicialFuncao(estado.fichaAtual, c.funcaoEscolhida);
        c.pontosAtributosRestantes = calcularPontosAtributoTotais(c.funcaoEscolhida);
        c.pontosFuncaoRestantes = pontosFuncaoDe(c.funcaoEscolhida);
        c.etapa = 2;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, !podeAvancar);
}

// ---- Etapa 2: Atributos livres ----
function renderEtapaAtributos() {
    const c = estado.fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 2 de 6 — Atributos</div>`;
    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos de atributo restantes</span><strong>${c.pontosAtributosRestantes}</strong>`;
    el.criacaoCorpo.appendChild(banner);

    const grid = document.createElement("div");
    grid.className = "distribuicao-grid";
    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const linha = document.createElement("div");
        linha.className = "distribuicao-linha";
        const valorAtual = estado.fichaAtual.dados[attr.key] || 0;
        linha.innerHTML = `
            <span>${attr.label}</span>
            <div class="stepper">
                <button type="button" class="btn-ghost btn-menos">−</button>
                <span class="stepper-valor">${valorAtual}</span>
                <button type="button" class="btn-ghost btn-mais">+</button>
            </div>
        `;
        linha.querySelector(".btn-menos").addEventListener("click", () => {
            if (estado.fichaAtual.dados[attr.key] > 0) {
                estado.fichaAtual.dados[attr.key]--;
                c.pontosAtributosRestantes++;
                renderEtapaCriacao();
            }
        });
        linha.querySelector(".btn-mais").addEventListener("click", () => {
            if (c.pontosAtributosRestantes > 0 && estado.fichaAtual.dados[attr.key] < LIMITES_CRIACAO.maxAtributo) {
                estado.fichaAtual.dados[attr.key]++;
                c.pontosAtributosRestantes--;
                renderEtapaCriacao();
            }
        });
        grid.appendChild(linha);
    });
    el.criacaoCorpo.appendChild(grid);
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.innerText = `Limite por atributo na criação: ${LIMITES_CRIACAO.maxAtributo}.`;
    el.criacaoCorpo.appendChild(hint);

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 1; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 3;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, c.pontosAtributosRestantes > 0);
}

// ---- Etapa 3: Perícias livres (5 pontos) ----
function renderEtapaPericiasLivres() {
    const c = estado.fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 3 de 6 — Perícias livres</div>`;
    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos de perícia restantes</span><strong>${c.pontosPericiasRestantes}</strong>`;
    el.criacaoCorpo.appendChild(banner);
    montarSeletorPericiasGenerico(c, "pontosPericiasRestantes", null);

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 2; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 4;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, c.pontosPericiasRestantes > 0);
}

// ---- Etapa 4: Perícias exclusivas da função ----
function renderEtapaPericiasFuncao() {
    const c = estado.fichaAtual.criacao;
    const f = funcaoDe(c.funcaoEscolhida);
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 4 de 6 — Perícias da função (${f ? f.label : ""})</div>`;

    if (!f || !f.periciasEscolha || c.pontosFuncaoRestantes === 0) {
        el.criacaoCorpo.innerHTML += `<p class="hint">Sua função não tem pontos extras de perícia pra distribuir aqui.</p>`;
        botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 3; salvarEstadoCriacao(); renderEtapaCriacao(); });
        botaoCriacao("Avançar →", "btn-lime", async () => { c.etapa = 5; await salvarEstadoCriacao(); renderEtapaCriacao(); });
        return;
    }

    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos exclusivos de função restantes</span><strong>${c.pontosFuncaoRestantes}</strong>`;
    el.criacaoCorpo.appendChild(banner);

    const opcoes = opcoesPericiaFuncao(c.funcaoEscolhida);
    montarSeletorPericiasGenerico(c, "pontosFuncaoRestantes", opcoes.map(o => o.nome));

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 3; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 5;
        await salvarWizardStep();
        renderEtapaCriacao();
    }, c.pontosFuncaoRestantes > 0);
}

// Monta um seletor de perícias com stepper, gastando de `campoPontos` em
// `c[campoPontos]`. Se `restricaoNomes` for um array, só essas perícias
// aparecem (pontos exclusivos de função); se null, mostra a lista toda.
// `onMudou`, se fornecido, é chamado após cada alteração em vez do
// comportamento padrão (re-renderizar a etapa atual do wizard) — usado
// pelo distribuidor de pontos bônus, que tem sua própria função de render.
function montarSeletorPericiasGenerico(c, campoPontos, restricaoNomes, onMudou, limitePericia, destinoContainer) {
    const rerender = onMudou || (() => renderEtapaCriacao());
    const limite = limitePericia || LIMITES_CRIACAO.maxPericia;
    const destino = destinoContainer || el.criacaoCorpo;
    const todasPericias = restricaoNomes
        ? PERICIAS_MANUAL.filter(p => restricaoNomes.includes(p.nome))
        : PERICIAS_MANUAL;

    const grid = document.createElement("div");
    grid.className = "distribuicao-grid";

    todasPericias.forEach(p => {
        const existente = Object.entries(estado.fichaAtual.pericias).find(([, pr]) => pr.nome === p.nome);
        const nivelAtual = existente ? existente[1].nivel : 0;
        // Requisito de acesso (ex.: Força Bruta exige Força 9 e Briga de
        // Rua/Contundentes 5 — manual pg. 22): só entra em jogo pra quem
        // ainda não tem a perícia (nível 0). Quem já tem nível ≥ 1 nunca
        // é bloqueado por isso.
        const requisito = (nivelAtual === 0 && !(estado.isMestre && estado.godmodeAtivo))
            ? atendeRequisitoPericia(p.nome, estado.fichaAtual.dados, estado.fichaAtual.pericias)
            : { ok: true };
        const linha = document.createElement("div");
        linha.className = "distribuicao-linha";
        linha.innerHTML = `
            <span>${p.nome}</span>
            <div class="stepper">
                <button type="button" class="btn-ghost btn-menos">−</button>
                <span class="stepper-valor">${nivelAtual}</span>
                <button type="button" class="btn-ghost btn-mais"${requisito.ok ? "" : " disabled"} title="${requisito.ok ? "" : escapeHtml(requisito.motivo)}">+</button>
            </div>
        `;
        linha.querySelector(".btn-menos").addEventListener("click", () => {
            // Sempre lê/escreve em estado.fichaAtual.criacao "ao vivo" (nunca no `c`
            // capturado no momento da renderização): como cada snapshot novo
            // do Firebase substitui estado.fichaAtual inteiro por um objeto novo
            // (normalizarFicha), um `c` antigo guardado no closure do botão
            // fica "órfão" — mexer nele não afeta mais a ficha real, e o
            // gasto some silenciosamente ao salvar. Isso é o que causava o
            // desincronismo dos pontos bônus ao trocar de aba.
            const criacaoAtual = estado.fichaAtual.criacao;
            if (nivelAtual > 0 && existente) {
                estado.fichaAtual.pericias[existente[0]].nivel--;
                if (estado.fichaAtual.pericias[existente[0]].nivel === 0) delete estado.fichaAtual.pericias[existente[0]];
                criacaoAtual[campoPontos]++;
                rerender();
            }
        });
        linha.querySelector(".btn-mais").addEventListener("click", () => {
            const criacaoAtual = estado.fichaAtual.criacao;
            if (criacaoAtual[campoPontos] <= 0) return;
            if (nivelAtual >= limite) return;
            if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
            if (existente) {
                estado.fichaAtual.pericias[existente[0]].nivel++;
            } else {
                const id = gerarIdLocal();
                estado.fichaAtual.pericias[id] = { nome: p.nome, nivel: 1, descricao: "", modificadores: [], especializacoes: [], legado: false };
            }
            criacaoAtual[campoPontos]--;
            rerender();
        });
        grid.appendChild(linha);
    });
    destino.appendChild(grid);
    const hint = document.createElement("p");
    hint.className = "hint";
    hint.innerText = `Limite por perícia aqui: ${limite}.`;
    destino.appendChild(hint);
}

// ---- Etapa 5: Desvantagens + pontos bônus ----
function renderEtapaDesvantagensBonus() {
    const c = estado.fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 5 de 6 — Desvantagens e pontos bônus</div>`;
    el.criacaoCorpo.innerHTML += `<p class="hint">Cadastre suas desvantagens na aba "Vantagens / Desvantagens" antes de avançar (3 pontos bônus por desvantagem, no máximo ${MAX_DESVANTAGENS} desvantagens, até ${MAX_DESVANTAGENS * 3} pontos bônus no total). Use o botão "Fechar temporariamente ✕" no topo desta janela pra acessar aquela aba — seu progresso na criação fica salvo.</p>`;

    // O pool de pontos bônus é recalculado a partir do nº de desvantagens
    // cadastradas, mas o que já foi GASTO fica guardado e persistido em
    // criacao.bonusGasto — assim o saldo nunca se perde num refresh, e o
    // jogador pode gastar tanto agora quanto depois (fora do wizard).
    const bonusTotal = pontosBonusPorDesvantagens(estado.fichaAtual);
    const bonusJaGasto = c.bonusGasto || 0;
    c.pontosBonusDesvantagens = Math.max(0, bonusTotal - bonusJaGasto);

    const banner = document.createElement("div");
    banner.className = "pontos-restantes-banner";
    banner.innerHTML = `<span>Pontos bônus disponíveis (de desvantagens)</span><strong>${c.pontosBonusDesvantagens}</strong>`;
    el.criacaoCorpo.appendChild(banner);

    if (bonusTotal > 0) {
        montarDistribuidorBonus(c, () => { salvarEstadoCriacao(); renderEtapaCriacao(); });
        el.criacaoCorpo.innerHTML += `<p class="hint">Pontos bônus não gastos agora continuam disponíveis depois — dá pra gastar em Atributos ou Perícias a qualquer momento, mesmo fora da criação.</p>`;
    }

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 4; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Avançar →", "btn-lime", async () => {
        c.etapa = 6;
        await salvarWizardStep();
        renderEtapaCriacao();
    });
}

// Distribuidor de pontos bônus (atributo OU perícia), usado tanto no
// wizard (etapa 5) quanto na aba de Vantagens/Desvantagens fora da
// criação. `onMudou` é chamado depois de cada gasto/devolução, pra
// re-renderizar. `container`, se fornecido, é onde o distribuidor é
// desenhado (padrão: o corpo do wizard de criação).
export function montarDistribuidorBonus(c, onMudou, container) {
    const destino = container || el.criacaoCorpo;
    const wrap = document.createElement("div");
    wrap.className = "distribuicao-grid";

    ATRIBUTOS_PRIMARIOS.forEach(attr => {
        const linha = document.createElement("div");
        linha.className = "distribuicao-linha";
        const valorAtual = estado.fichaAtual.dados[attr.key] || 0;
        linha.innerHTML = `
            <span>${attr.label}</span>
            <div class="stepper">
                <button type="button" class="btn-ghost btn-menos">−</button>
                <span class="stepper-valor">${valorAtual}</span>
                <button type="button" class="btn-ghost btn-mais">+</button>
            </div>
        `;
        // Assim como no seletor de perícias, sempre lê/escreve em
        // estado.fichaAtual.criacao "ao vivo" — nunca no `c` capturado no momento
        // da renderização — pra não perder o gasto quando um snapshot novo
        // do Firebase chega enquanto o wizard está aberto (ex: o jogador
        // cadastrou a desvantagem em outra aba, como o hint desta etapa pede).
        linha.querySelector(".btn-menos").addEventListener("click", async () => {
            const criacaoAtual = estado.fichaAtual.criacao;
            const gastoNisso = (criacaoAtual.bonusGastoDetalhe && criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`]) || 0;
            if (valorAtual <= 0 || gastoNisso <= 0) return;
            estado.fichaAtual.dados[attr.key]--;
            criacaoAtual.bonusGasto = (criacaoAtual.bonusGasto || 0) - 1;
            criacaoAtual.pontosBonusDesvantagens = (criacaoAtual.pontosBonusDesvantagens || 0) + 1;
            if (!criacaoAtual.bonusGastoDetalhe) criacaoAtual.bonusGastoDetalhe = {};
            criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`] = gastoNisso - 1;
            // Grava dados + criacao num update atômico só (salvarWizardStep),
            // com o sync pausado do início ao fim. Antes eram duas escritas
            // separadas (update(dados) e depois salvarEstadoCriacao()), e o
            // listener em tempo real podia disparar entre as duas, recarregar
            // estado.fichaAtual.criacao com o bonusGasto ainda ANTIGO (o gasto não
            // tinha sido salvo ainda) e essa cópia velha acabava sendo o que
            // ia pro Firebase — desfazendo o débito silenciosamente e
            // deixando o jogador gastar o mesmo ponto bônus de novo.
            await salvarWizardStep();
            onMudou();
        });
        linha.querySelector(".btn-mais").addEventListener("click", async () => {
            const criacaoAtual = estado.fichaAtual.criacao;
            if (criacaoAtual.pontosBonusDesvantagens <= 0) return;
            if (valorAtual >= LIMITES_CRIACAO.maxAtributo) return;
            estado.fichaAtual.dados[attr.key]++;
            criacaoAtual.bonusGasto = (criacaoAtual.bonusGasto || 0) + 1;
            criacaoAtual.pontosBonusDesvantagens = (criacaoAtual.pontosBonusDesvantagens || 0) - 1;
            if (!criacaoAtual.bonusGastoDetalhe) criacaoAtual.bonusGastoDetalhe = {};
            criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`] = ((criacaoAtual.bonusGastoDetalhe[`attr:${attr.key}`]) || 0) + 1;
            await salvarWizardStep();
            onMudou();
        });
        wrap.appendChild(linha);
    });
    destino.appendChild(wrap);

    // Perícias — reaproveita o seletor genérico, mas descontando do pool
    // de bônus em vez do pool de criação normal. Limite por perícia na
    // criação é 3 (LIMITES_CRIACAO.maxPericia), igual ao resto do wizard —
    // não 5 (esse valor era o limite de NÍVEL geral pós-criação, não o
    // limite de criação, e tinha ficado grudado aqui por engano).
    const tituloPericias = document.createElement("p");
    tituloPericias.className = "hint";
    tituloPericias.innerText = "Ou gaste em perícias:";
    destino.appendChild(tituloPericias);

    montarSeletorPericiasGenerico(estado.fichaAtual.criacao, "pontosBonusDesvantagens", null, async () => {
        const criacaoAtual = estado.fichaAtual.criacao;
        criacaoAtual.bonusGasto = bonusTotalMenosRestante(criacaoAtual);
        // Mesmo problema do stepper de atributo acima: usar salvarWizardStep()
        // pra gravar pericias + dados + criacao numa escrita atômica só, em
        // vez de três updates separados. Com escritas separadas, o listener
        // em tempo real podia recarregar estado.fichaAtual.criacao (com o bonusGasto
        // ainda antigo) entre uma escrita e outra, e esse valor velho acabava
        // sendo persistido por cima do débito real — permitindo gastar o
        // mesmo ponto bônus repetidas vezes.
        await salvarWizardStep();
        onMudou();
    }, LIMITES_CRIACAO.maxPericia, destino);
}

function bonusTotalMenosRestante(c) {
    const bonusTotal = pontosBonusPorDesvantagens(estado.fichaAtual);
    return bonusTotal - c.pontosBonusDesvantagens;
}

// ---- Etapa 6: Revisão final ----
function renderEtapaRevisao() {
    const c = estado.fichaAtual.criacao;
    el.criacaoCorpo.innerHTML = `<div class="criacao-etapa-label">Etapa 6 de 6 — Revisão</div>`;
    const resumo = document.createElement("div");
    resumo.innerHTML = `
        <p class="hint">Função: <strong>${funcaoDe(c.funcaoEscolhida)?.label || "—"}</strong></p>
        <p class="hint">Atributos: ${ATRIBUTOS_PRIMARIOS.map(a => `${a.label} ${estado.fichaAtual.dados[a.key] || 0}`).join(" · ")}</p>
        <p class="hint">Perícias: ${Object.values(estado.fichaAtual.pericias).map(p => `${p.nome} ${p.nivel}`).join(" · ") || "nenhuma"}</p>
        <p class="hint">Confira tudo. Depois de confirmar, a edição de atributos e perícias fica travada até o próximo Level Up (o Treinamento aplica o ganho automaticamente, sem destravar a ficha).</p>
    `;
    el.criacaoCorpo.appendChild(resumo);

    botaoCriacao("← Voltar", "btn-ghost", () => { c.etapa = 5; salvarEstadoCriacao(); renderEtapaCriacao(); });
    botaoCriacao("Confirmar e começar a jogar", "btn-lime", async () => {
        c.concluida = true;
        estado.fichaAtual.dados.criacaoConcluida = true;
        estado.fichaAtual.dados.funcao = c.funcaoEscolhida; // persiste a função nos dados da ficha
        // PV/Energia atual começam no máximo calculado.
        const modificadoresPlanos = modificadoresAtuais();
        const derivados = calcularDerivados(estado.fichaAtual.dados, modificadoresPlanos);
        estado.fichaAtual.dados.pvAtual = Math.round(derivados.recursos.pv.total);
        estado.fichaAtual.dados.energiaAtual = Math.round(derivados.recursos.energia.total);
        // Mesma classe de bug do distribuidor de bônus: usar salvarWizardStep()
        // pra gravar dados + pericias + criacao numa escrita atômica só, com o
        // sync pausado do início ao fim. Antes eram duas escritas separadas
        // (update(dados) e depois salvarEstadoCriacao()), sem nunca regravar
        // pericias — e o listener em tempo real podia disparar bem nesse
        // intervalo, recarregando a ficha inteira com uma versão do banco
        // ainda sem o último ponto bônus de perícia (se aquela gravação
        // anterior, do passo 5, ainda não tivesse concluído por completo),
        // fazendo a perícia desaparecer na hora de confirmar.
        await salvarWizardStep();
        el.modalCriacao.classList.remove("active");
        toast("Personagem criado! Boa sorte na Chuva de Neon.");
        // Atualiza a UI imediatamente, sem esperar o próximo snapshot do
        // Firebase — o listener real eventualmente confirma o mesmo
        // estado, mas a resposta visual não deve depender desse roundtrip.
        verificarCriacaoPendente();
        renderizarTudo();
    });
}

// =====================================================================
// LEVEL UP (modal inadiável de 3 passos)
// =====================================================================

function verificarLevelUpPendente() {
    if (estado.isMestre) return;
    // Aceita os dois campos que marcam "criação concluída" (podem estar
    // dessincronizados em fichas antigas): não interfere com a criação
    // em andamento, mas também não trava o level up se um dos dois já
    // foi marcado como concluído.
    if (!estado.fichaAtual.criacao.concluida && !estado.fichaAtual.dados.criacaoConcluida) return;
    const precisava = iniciarLevelUpSeNecessario(estado.fichaAtual);
    if (precisava) {
        set(ref(db, `${caminhoBase()}/levelUpPendente`), estado.fichaAtual.levelUpPendente);
    }
    if (estado.fichaAtual.levelUpPendente && estado.fichaAtual.levelUpPendente.ativo) {
        abrirModalLevelUp();
    } else {
        el.modalLevelup.classList.remove("active");
    }
}

function abrirModalLevelUp() {
    el.modalLevelup.classList.add("active");
    modoDistribuicaoPericiaLevelUp = "aumentar"; // reseta o toggle a cada abertura do modal
    renderPassoLevelUp();
}

// Estado puramente de UI (não é salvo na ficha): qual das duas opções
// do passo 3 está selecionada no momento — "aumentar" nível de perícia
// (comportamento já existente) ou "especializar" (nova opção). Trocar
// isso não gasta ponto nenhum, só decide qual lista o passo 3 mostra.
let modoDistribuicaoPericiaLevelUp = "aumentar";

// Salva dados + perícias + levelUpPendente num único update atômico,
// disparando o listener do Firebase apenas uma vez (mesmo padrão de
// salvarWizardStep). Evita que uma gravação intermediária (ex: dados já
// atualizados mas levelUpPendente ainda com o valor antigo) dispare o
// listener no meio do caminho: isso fazia verificarLevelUpPendente()
// regravar um levelUpPendente desatualizado por cima do que a gente
// tinha acabado de salvar/remover, travando o jogador na tela de level
// up (parecia "não sai da tela" / "pontos infinitos").
async function salvarEstadoLevelUp() {
    await update(ref(db, `${caminhoBase()}`), {
        dados: estado.fichaAtual.dados,
        pericias: estado.fichaAtual.pericias,
        levelUpPendente: estado.fichaAtual.levelUpPendente
    });
}

function renderPassoLevelUp() {
    const lvl = estado.fichaAtual.levelUpPendente;
    el.levelupCorpo.innerHTML = "";
    el.levelupBotoes.innerHTML = "";
    if (!lvl) return;

    if (lvl.passo === 1) {
        el.levelupCorpo.innerHTML = `<p class="hint">Passo 1 de 3 — Escolha 1 atributo para subir +1 ponto.</p>`;
        const grid = document.createElement("div");
        grid.className = "distribuicao-grid";
        ATRIBUTOS_PRIMARIOS.forEach(attr => {
            const btn = document.createElement("button");
            btn.className = "btn-ghost";
            btn.type = "button";
            btn.innerText = `${attr.label} (atual: ${estado.fichaAtual.dados[attr.key] || 0})`;
            btn.disabled = (estado.fichaAtual.dados[attr.key] || 0) >= MAX_ATRIBUTO_JOGO;
            btn.addEventListener("click", async () => {
                confirmarPassoAtributo(estado.fichaAtual, attr.key);
                await salvarEstadoLevelUp();
                renderPassoLevelUp();
            });
            grid.appendChild(btn);
        });
        el.levelupCorpo.appendChild(grid);

    } else if (lvl.passo === 2) {
        el.levelupCorpo.innerHTML = `<p class="hint">Passo 2 de 3 — Role o dado de vida extra, baseado na sua Constituição (${estado.fichaAtual.dados.constituicao || 0}).</p>`;
        if (!lvl.dadoVidaRolado) {
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Rolar dado de vida";
            btn.addEventListener("click", async () => {
                const r = executarPassoDadoVida(estado.fichaAtual);
                await salvarEstadoLevelUp();
                if (r) {
                    const quem = estado.isMestre ? `Mestre (${estado.modoNpc ? (estado.fichaAtual?.config?.nomeExibicao || estado.npcAtualId) : (nomeDeFicha(estado.fichaAtualId) || "—")})` : (estado.fichaAtual?.config?.nomeExibicao || estado.sessao.nome || "Jogador");
                    const resultadoRolado = r.rerolagens.length
                        ? `${r.rerolagens.join(", ")} (abaixo do mínimo de ${r.minimo}, rerolado) → ${r.valorFinal}`
                        : `${r.valorFinal}`;
                    await registrarRolagem({
                        quem,
                        modificador: r.bonus,
                        resultado: r.total,
                        detalhe: `Rolagem de PV: ${resultadoRolado}. Valor mínimo exigido: ${r.minimo}. Bônus de CON: ${r.bonus}. Total aplicado ao HP: ${r.total}`
                    });
                }
                renderPassoLevelUp();
            });
            el.levelupCorpo.appendChild(btn);
        } else {
            const r = lvl.dadoVidaRolado;
            const detalheReroll = r.rerolagens && r.rerolagens.length
                ? ` (rerolado ${r.rerolagens.length}x, abaixo do mínimo de ${r.minimo}: ${r.rerolagens.join(", ")})`
                : "";
            el.levelupCorpo.innerHTML += `<p class="entity-nome">1d${r.faces} (${r.valorFinal}${detalheReroll}) + ${r.bonus} = +${r.total} PV</p>`;
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Continuar →";
            btn.addEventListener("click", () => renderPassoLevelUp());
            el.levelupCorpo.appendChild(btn);
        }

    } else if (lvl.passo === 3) {
        el.levelupCorpo.innerHTML = `<p class="hint">Passo 3 de 3 — Distribua ${lvl.pontosPericia} ponto(s) de perícia (pode ser em perícias novas).</p>`;

        // Toggle entre as duas opções de gasto do ponto de perícia:
        // aumentar o nível (comportamento já existente, intocado) ou
        // comprar uma especialização (nova opção, regras do manual:
        // nível 3+ da perícia, comprando em ordem 3 → 4 → 5).
        const toggle = document.createElement("div");
        toggle.className = "distribuicao-toggle";
        toggle.style.display = "flex";
        toggle.style.gap = "8px";
        toggle.style.marginBottom = "10px";
        const btnAumentar = document.createElement("button");
        btnAumentar.type = "button";
        btnAumentar.innerText = "Aumentar perícia";
        btnAumentar.className = modoDistribuicaoPericiaLevelUp === "aumentar" ? "btn-lime" : "btn-ghost";
        btnAumentar.addEventListener("click", () => {
            modoDistribuicaoPericiaLevelUp = "aumentar";
            renderPassoLevelUp();
        });
        const btnEspecializar = document.createElement("button");
        btnEspecializar.type = "button";
        btnEspecializar.innerText = "Comprar especialização";
        btnEspecializar.className = modoDistribuicaoPericiaLevelUp === "especializacao" ? "btn-lime" : "btn-ghost";
        btnEspecializar.addEventListener("click", () => {
            modoDistribuicaoPericiaLevelUp = "especializacao";
            renderPassoLevelUp();
        });
        toggle.appendChild(btnAumentar);
        toggle.appendChild(btnEspecializar);
        el.levelupCorpo.appendChild(toggle);

        if (lvl.pontosPericia === 0) {
            // Sem pontos restantes, não faz sentido mostrar nenhuma das duas
            // listas (mantém o comportamento de antes: só o botão de finalizar).
        } else if (modoDistribuicaoPericiaLevelUp === "especializacao") {
            const aviso = document.createElement("p");
            aviso.className = "hint";
            aviso.innerText = "Comprar uma especialização consome 1 ponto de perícia, mas não aumenta o nível da perícia. Só perícias com nível 3 ou mais são elegíveis.";
            el.levelupCorpo.appendChild(aviso);

            const grid = document.createElement("div");
            grid.className = "distribuicao-grid";
            const elegiveis = Object.entries(estado.fichaAtual.pericias).filter(([, p]) => (Number(p.nivel) || 0) >= 3);
            if (elegiveis.length === 0) {
                const vazio = document.createElement("p");
                vazio.className = "hint";
                vazio.innerText = "Nenhuma perícia com nível 3 ou mais ainda. Aumente uma perícia até o nível 3 pra poder especializá-la.";
                grid.appendChild(vazio);
            }
            elegiveis
                .sort((a, b) => a[1].nome.localeCompare(b[1].nome))
                .forEach(([id, p]) => {
                    const check = podeComprarEspecializacao(p);
                    const linha = document.createElement("div");
                    linha.className = "distribuicao-linha";
                    const especializacoesTexto = (p.especializacoes && p.especializacoes.length)
                        ? `Especializações: ${p.especializacoes.slice().sort().join(", ")}`
                        : "Sem especializações ainda";
                    if (check.ok) {
                        linha.innerHTML = `
                            <span>${p.nome} (nível ${p.nivel}) — ${especializacoesTexto}</span>
                            <div class="stepper">
                                <button type="button" class="btn-ghost btn-comprar-especializacao">Comprar especialização nível ${check.proximoNivel}</button>
                            </div>
                        `;
                        linha.querySelector(".btn-comprar-especializacao").addEventListener("click", async () => {
                            if (gastarPontoEspecializacaoLevelUp(estado.fichaAtual, p.nome)) {
                                await salvarEstadoLevelUp();
                                renderPassoLevelUp();
                            }
                        });
                    } else {
                        linha.innerHTML = `
                            <span>${p.nome} (nível ${p.nivel}) — ${especializacoesTexto}</span>
                            <div class="stepper">
                                <span class="hint">${check.motivo}</span>
                            </div>
                        `;
                    }
                    grid.appendChild(linha);
                });
            el.levelupCorpo.appendChild(grid);
        } else {
            const grid = document.createElement("div");
            grid.className = "distribuicao-grid";
            PERICIAS_MANUAL.forEach(p => {
                const existente = Object.entries(estado.fichaAtual.pericias).find(([, pr]) => pr.nome === p.nome);
                const nivelAtual = existente ? existente[1].nivel : 0;
                const requisito = nivelAtual === 0 ? atendeRequisitoPericia(p.nome, estado.fichaAtual.dados, estado.fichaAtual.pericias) : { ok: true };
                const linha = document.createElement("div");
                linha.className = "distribuicao-linha";
                linha.innerHTML = `
                    <span>${p.nome}</span>
                    <div class="stepper">
                        <span class="stepper-valor">${nivelAtual}</span>
                        <button type="button" class="btn-ghost btn-mais"${requisito.ok ? "" : " disabled"} title="${requisito.ok ? "" : escapeHtml(requisito.motivo)}">+</button>
                    </div>
                `;
                linha.querySelector(".btn-mais").addEventListener("click", async () => {
                    if (!requisito.ok) { toast(requisito.motivo, "erro"); return; }
                    if (gastarPontoPericiaLevelUp(estado.fichaAtual, p.nome, gerarIdLocal)) {
                        await salvarEstadoLevelUp();
                        renderPassoLevelUp();
                    }
                });
                grid.appendChild(linha);
            });
            el.levelupCorpo.appendChild(grid);
        }

        if (lvl.pontosPericia === 0) {
            const btn = document.createElement("button");
            btn.className = "btn-lime"; btn.type = "button"; btn.innerText = "Finalizar Level Up";
            btn.addEventListener("click", async () => {
                finalizarLevelUp(estado.fichaAtual);
                await salvarEstadoLevelUp(); // levelUpPendente = null aqui apaga a chave no update()
                el.modalLevelup.classList.remove("active");
                toast("Nível aumentado!");
            });
            el.levelupBotoes.appendChild(btn);
        }
    }
}
